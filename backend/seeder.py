"""
Database bootstrap. The system's primary source is the live MPLADS dashboard
API. When the database is empty (first run):

- Serverless (SEED_FROM_SAMPLE=1): the bundled sample CSV is ingested
  synchronously so a fresh deployment shows data immediately; the scheduled
  live sync then replaces it with real portal data.
- Otherwise: an initial live sync is kicked off in a background thread so the
  API comes up immediately and data streams in.
"""
import os
import threading

from backend.config import settings
from backend.database import works, mp_allocations, users, ensure_indexes
from backend.models import now_utc, lower_or_none


def _initial_live_sync():
    from backend.services.ingestion import run_ingestion
    try:
        result = run_ingestion(mode="live")
        print(f"Initial live sync finished: {result.get('status')} — "
              f"{result.get('processed', 0)} records processed.")
    except Exception as e:
        print(f"Initial live sync failed: {e}. Use POST /api/sync/run?mode=live to retry.")


def _ensure_default_allocations() -> int:
    """
    Fallback seeder: if mp_allocations is empty or missing entries for MPs in works,
    upsert default statutory allocation entries (₹5 Cr per MP per term).
    """
    from pymongo import ReplaceOne

    now = now_utc()
    pipeline = [
        {"$match": {"mp_name": {"$ne": None, "$exists": True}}},
        {"$group": {
            "_id": "$mp_name",
            "house": {"$first": "$house"},
            "constituency": {"$first": "$constituency"},
            "state": {"$first": "$state"},
        }}
    ]

    distinct_mps = list(works.aggregate(pipeline))
    if not distinct_mps:
        return 0

    ops = []
    for mp in distinct_mps:
        mp_name = mp["_id"]
        house_val = mp.get("house") or "Lok Sabha"
        constituency_val = mp.get("constituency") or ""
        state_val = mp.get("state") or ""

        key = dict(
            mp_name=mp_name,
            house=house_val,
            constituency=constituency_val,
            state=state_val,
        )
        doc = {
            **key,
            "allocated_amount": 50000000.0,
            "tenure_start": None,
            "updated_at": now,
            "_mp_name_lower": lower_or_none(mp_name),
        }
        ops.append(ReplaceOne(key, doc, upsert=True))

    if ops:
        mp_allocations.bulk_write(ops, ordered=False)
        print(f"Ensured {len(ops)} MP allocation records in mp_allocations.")
    return len(ops)


def _seed_from_sample() -> int:
    from backend.services.ingestion import run_ingestion
    if not settings.RAW_SAMPLE_PATH.exists():
        print(f"Sample feed not found at {settings.RAW_SAMPLE_PATH}; skipping sample seed.")
        _ensure_default_allocations()
        return 0
    try:
        result = run_ingestion(mode="auto", source_file_path=settings.RAW_SAMPLE_PATH)
        print(f"Sample seed finished: {result.get('processed', 0)} records processed.")
        _ensure_default_allocations()
        return int(result.get("processed", 0))
    except Exception as e:
        print(f"Sample seed failed: {e}. Live sync will retry via the scheduler/cron.")
        _ensure_default_allocations()
        return 0


def seed_users():
    """
    Ensure administrative and auditor accounts exist in MongoDB `users` collection.
    Uses environment variables for credentials and stores only bcrypt password hashes.
    Never stores or returns plaintext passwords.
    """
    from backend.auth import get_password_hash, ROLE_MOSPI_REVIEWER, ROLE_DISTRICT_AUDITOR

    # In production, never auto-seed demo accounts without explicit configuration
    if settings.ENVIRONMENT not in ("development", "test") and not os.getenv("SEED_DEMO_USERS"):
        return

    admin_uname = settings.DEMO_ADMIN_USER
    admin_pwd = settings.DEMO_ADMIN_PASSWORD

    # Seed or upgrade MoSPI Reviewer / Admin account
    existing_admin = users.find_one({"username": admin_uname})
    if not existing_admin:
        users.insert_one({
            "username": admin_uname,
            "password_hash": get_password_hash(admin_pwd),
            "role": ROLE_MOSPI_REVIEWER,
            "created_at": now_utc(),
        })
    elif "password" in existing_admin:
        # Upgrade legacy plaintext account to bcrypt hash
        plain = existing_admin.pop("password")
        users.update_one(
            {"username": admin_uname},
            {"$set": {"password_hash": get_password_hash(plain)}, "$unset": {"password": ""}}
        )

    # Seed District Auditor account for dual-role testing
    auditor_uname = os.getenv("DEMO_AUDITOR_USER", "auditor")
    auditor_pwd = os.getenv("DEMO_AUDITOR_PASSWORD", "Auditor@MPLADS2026!")
    existing_auditor = users.find_one({"username": auditor_uname})
    if not existing_auditor:
        users.insert_one({
            "username": auditor_uname,
            "password_hash": get_password_hash(auditor_pwd),
            "role": ROLE_DISTRICT_AUDITOR,
            "created_at": now_utc(),
        })
    elif "password" in existing_auditor:
        plain = existing_auditor.pop("password")
        users.update_one(
            {"username": auditor_uname},
            {"$set": {"password_hash": get_password_hash(plain)}, "$unset": {"password": ""}}
        )


def seed_database(force: bool = False):
    """
    Ensure indexes exist and populate/update works, mp_allocations and users collections —
    synchronously from the bundled sample feed on startup so all features and
    charts render full data. Safe to run repeatedly; idempotent.
    """
    ensure_indexes()
    seed_users()

    existing_count = works.count_documents({})
    alloc_count = mp_allocations.count_documents({})

    # If both works (>= 1000) and mp_allocations (> 0) contain data and force is False, skip
    if existing_count >= 1000 and alloc_count > 0 and not force:
        print(f"Database already contains {existing_count} works and {alloc_count} allocations. Bootstrap skipped.")
        return existing_count

    if settings.SEED_FROM_SAMPLE or existing_count < 1000 or alloc_count == 0 or force:
        print(f"Seeding database (works: {existing_count}, allocations: {alloc_count})...")
        return _seed_from_sample()

    print("Starting initial live sync in the background...")
    threading.Thread(target=_initial_live_sync, daemon=True).start()
    return 0

if __name__ == "__main__":
    seed_database()
