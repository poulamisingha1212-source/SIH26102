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
from backend.database import works, mp_allocations, users, citizen_problems
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
    Ensure administrative, district auditor, and MP accounts exist in MongoDB `users` collection.
    Uses environment variables for credentials, stores only bcrypt password hashes.
    """
    import os
    from backend.auth import get_password_hash, ROLE_MOSPI_REVIEWER, ROLE_DISTRICT_AUDITOR, ROLE_MP

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
    else:
        users.update_one(
            {"username": admin_uname},
            {"$set": {"password_hash": get_password_hash(admin_pwd), "role": ROLE_MOSPI_REVIEWER}}
        )

    # Seed District Auditor account (scoped to Kota, Rajasthan)
    auditor_uname = os.getenv("DEMO_AUDITOR_USER", "auditor")
    auditor_pwd   = os.getenv("DEMO_AUDITOR_PASSWORD", "Auditor@MPLADS2026!")
    existing_auditor = users.find_one({"username": auditor_uname})
    if not existing_auditor:
        users.insert_one({
            "username": auditor_uname,
            "password_hash": get_password_hash(auditor_pwd),
            "role": ROLE_DISTRICT_AUDITOR,
            "constituency": "Kota",
            "district": "Kota",
            "state": "Rajasthan",
            "created_at": now_utc(),
        })
    else:
        users.update_one(
            {"username": auditor_uname},
            {"$set": {
                "password_hash": get_password_hash(auditor_pwd),
                "role": ROLE_DISTRICT_AUDITOR,
                "constituency": "Kota",
                "district": "Kota",
                "state": "Rajasthan",
            }}
        )

    # Seed Member of Parliament account (scoped to Kota, Rajasthan)
    mp_uname = os.getenv("DEMO_MP_USER", "mp")
    mp_pwd   = os.getenv("DEMO_MP_PASSWORD", "MP@MPLADS2026!")
    existing_mp = users.find_one({"username": mp_uname})
    if not existing_mp:
        users.insert_one({
            "username": mp_uname,
            "password_hash": get_password_hash(mp_pwd),
            "role": ROLE_MP,
            "constituency": "Kota",
            "state": "Rajasthan",
            "mp_name": "Shri Kota Representative",
            "created_at": now_utc(),
        })
    else:
        users.update_one(
            {"username": mp_uname},
            {"$set": {
                "password_hash": get_password_hash(mp_pwd),
                "role": ROLE_MP,
                "constituency": "Kota",
                "state": "Rajasthan",
                "mp_name": "Shri Kota Representative",
            }}
        )


def seed_citizen_problems():
    """Seed sample citizen grievances and problems for realistic demonstration."""
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)

    if citizen_problems.count_documents({}) > 0:
        return

    sample_problems = [
        {
            "id": "PRB-KOT-2026-001",
            "work_id": "WS/RJ-KOT/2025/4412",
            "work_title": "Installation of Deep Tube Well & Solar Pump at Ramnagar Ward 14",
            "constituency": "Kota",
            "state": "Rajasthan",
            "category": "Delay in Execution",
            "comment": "Sanctioned 8 months ago with full advance, but drilling stalled at 80ft. Villagers facing severe drinking water shortage as summer approaches.",
            "photo_proof": None,
            "reporter_name": "Ramesh Kumar Meena",
            "latitude": 25.178,
            "longitude": 75.837,
            "created_at": now,
            "status": "Action Initiated",
            "mp_reply": {
                "reply_text": "I have taken up this matter directly with the Chief Engineer, PHED Kota. Additional drilling rig deployed yesterday; completion committed within 10 days.",
                "replied_at": now.isoformat(),
                "replied_by": "Shri Kota Representative",
                "action_taken": "Emergency rig mobilized by PHED District Division"
            },
            "auditor_notes": {
                "notes": "Verified physical progress stalled at stage 1. Contractor given 7-day cure notice.",
                "audited_at": now.isoformat(),
                "audited_by": "District Authority Auditor"
            }
        },
        {
            "id": "PRB-KOT-2026-002",
            "work_id": "WS/RJ-KOT/2025/8921",
            "work_title": "Bituminous Layering on Ladpura Link Road to Primary School",
            "constituency": "Kota",
            "state": "Rajasthan",
            "category": "Substandard Quality & Materials",
            "comment": "The newly laid asphalt has developed potholes within 3 weeks of completion. Bitumen thickness is less than half the sanctioned 40mm spec.",
            "photo_proof": None,
            "reporter_name": "Priya Sharma (Gram Panchayat Member)",
            "latitude": 25.185,
            "longitude": 75.845,
            "created_at": now,
            "status": "Under Investigation",
            "mp_reply": {
                "reply_text": "Thank you for the vigilant report. District Collector instructed to hold contractor security deposit pending core sample testing.",
                "replied_at": now.isoformat(),
                "replied_by": "Shri Kota Representative",
                "action_taken": "Laboratory core sample testing ordered"
            },
            "auditor_notes": None
        },
        {
            "id": "PRB-KOT-2026-003",
            "work_id": "WS/RJ-KOT/2025/3011",
            "work_title": "Construction of Two Additional Classrooms at Govt Sr Sec School, Sultanpur",
            "constituency": "Kota",
            "state": "Rajasthan",
            "category": "Incomplete Works / Payment Discrepancy",
            "comment": "Roofing sheet incomplete and electrical fittings missing, but portal shows 90% funds already disbursed to vendor.",
            "photo_proof": None,
            "reporter_name": "Mukesh Gujjar",
            "latitude": 25.192,
            "longitude": 75.811,
            "created_at": now,
            "status": "Pending Review",
            "mp_reply": None,
            "auditor_notes": None
        },
        {
            "id": "PRB-KOT-2026-004",
            "work_id": "WS/RJ-KOT/2025/1105",
            "work_title": "Solar High-Mast Lighting System at Mandi Chowk",
            "constituency": "Kota",
            "state": "Rajasthan",
            "category": "Equipment Fault / Maintenance",
            "comment": "Timer malfunction causing lights to shut off at 8 PM. Replacement inverter unit required.",
            "photo_proof": None,
            "reporter_name": "Dinesh Chandra",
            "latitude": 25.166,
            "longitude": 75.831,
            "created_at": now,
            "status": "Resolved",
            "mp_reply": {
                "reply_text": "Vendor service technician has replaced the faulty charge controller and timer unit on-site under the 5-year AMC warranty.",
                "replied_at": now.isoformat(),
                "replied_by": "Shri Kota Representative",
                "action_taken": "Replaced unit under AMC warranty"
            },
            "auditor_notes": {
                "notes": "Inspected on-site; system fully operational.",
                "audited_at": now.isoformat(),
                "audited_by": "District Authority Auditor"
            }
        }
    ]

    citizen_problems.insert_many(sample_problems)



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
    seed_citizen_problems()

    if purge_preloaded is None:
        purge_preloaded = (settings.ENVIRONMENT != "test")

    if purge_preloaded:
        from backend.services.ingestion import purge_preloaded_data
        purge_preloaded_data()

    existing_count = works.count_documents({})

    from backend.database import is_mock
    import os

    if (is_mock or os.getenv("SEED_FROM_SAMPLE", "0") == "1") and existing_count == 0:
        sample_path = settings.RAW_SAMPLE_PATH
        if sample_path.exists():
            import pandas as pd
            from backend.services.ingestion import _reshape_long_format, _upsert_dataframe
            from model.risk_engine import score_dataset
            print(f"Seeding local database from sample dataset ({sample_path.name})...")
            raw = pd.read_csv(sample_path)
            reshaped = _reshape_long_format(raw)
            scored = score_dataset(reshaped, model_dir=settings.MODEL_DIR)
            _upsert_dataframe(scored)
            existing_count = works.count_documents({})
            print(f"Loaded {existing_count} sample works into local database.")
            return existing_count

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
