"""
Database bootstrap.

On first boot with an empty database the system automatically kicks off a
live MPLADS portal sync in a background thread so the API comes up
immediately while data streams in.  No preloaded / sample CSV is used.
All data originates from the live MPLADS dashboard API.
"""
import threading
from typing import Optional

from backend.config import settings
from backend.database import works, mp_allocations, users
from backend.models import now_utc


def _initial_live_sync():
    from backend.services.ingestion import run_ingestion
    try:
        result = run_ingestion(mode="live")
        print(
            f"Initial live sync finished: {result.get('status')} — "
            f"{result.get('processed', 0)} records processed."
        )
    except Exception as e:
        print(f"Initial live sync failed: {e}. Use POST /api/sync/run to retry.")


def seed_users():
    """
    Ensure administrative and auditor accounts exist in MongoDB `users` collection.
    Uses environment variables for credentials, stores only bcrypt password hashes.
    Never stores or returns plaintext passwords.
    """
    import os
    from backend.auth import get_password_hash, ROLE_MOSPI_REVIEWER, ROLE_DISTRICT_AUDITOR

    # In production, never auto-seed demo accounts without explicit configuration
    if settings.ENVIRONMENT not in ("development", "test") and not os.getenv("SEED_DEMO_USERS"):
        return

    admin_uname = settings.DEMO_ADMIN_USER
    admin_pwd   = settings.DEMO_ADMIN_PASSWORD

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

    # Seed District Auditor account
    auditor_uname = os.getenv("DEMO_AUDITOR_USER", "auditor")
    auditor_pwd   = os.getenv("DEMO_AUDITOR_PASSWORD", "Auditor@MPLADS2026!")
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


def seed_database(force: bool = False, purge_preloaded: Optional[bool] = None):
    """
    Ensure user accounts exist and trigger an initial live sync if the database
    is empty.  Safe to call repeatedly; idempotent for users.

    Data strategy:
    - Purges synthetic/preloaded sample data so only live portal data is kept (in non-test environments).
    - If works collection has >= 100 live records: already seeded, skip live sync.
    - Otherwise: kick off a background live sync from the MPLADS portal in chunks of 2000.
    """
    seed_users()

    if purge_preloaded is None:
        purge_preloaded = (settings.ENVIRONMENT != "test")

    if purge_preloaded:
        from backend.services.ingestion import purge_preloaded_data
        purge_preloaded_data()

    existing_count = works.count_documents({})

    if settings.ENVIRONMENT not in ("development", "test") and not force and not settings.AUTO_SEED:
        print(
            f"Production environment detected: automated background live sync skipped. "
            f"Current live works in database: {existing_count}. Use POST /api/sync/run or feed_live_data script."
        )
        return existing_count

    if existing_count >= 100 and not force:
        print(
            f"Database already contains {existing_count} live works. "
            "Bootstrap skipped — nightly scheduler will keep data fresh."
        )
        return existing_count

    print(
        f"Database has {existing_count} live works. "
        "Starting initial live sync from MPLADS portal in background (2000 records/chunk)..."
    )
    threading.Thread(target=_initial_live_sync, daemon=True).start()
    return 0


if __name__ == "__main__":
    seed_database()
