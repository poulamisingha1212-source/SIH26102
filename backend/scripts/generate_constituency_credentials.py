"""
Generate and register credentials for every parliamentary constituency across
Lok Sabha (543 Constituencies: District Auditor + MP) and Rajya Sabha (232 MPs).

Exports credential files:
- data/constituency_credentials.json
- data/constituency_credentials.csv

Upserts user profiles directly into MongoDB `users` collection.
"""
import os
import re
import csv
import json
import logging
from concurrent.futures import ProcessPoolExecutor
from datetime import datetime, timezone
from pymongo import UpdateOne

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def clean_slug(s: str) -> str:
    s = re.sub(r"\(.*?\)", "", s or "")
    s = re.sub(r"[^a-zA-Z0-9]+", "_", s.strip().lower()).strip("_")
    return s or "unknown"


def clean_code(s: str) -> str:
    s = re.sub(r"\(.*?\)", "", s or "").strip().title()
    alphanumeric = "".join(c for c in s if c.isalnum())
    return alphanumeric[:12] or "MPLADS"


def _hash_worker(pwd: str) -> str:
    import bcrypt
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pwd.encode("utf-8"), salt).decode("utf-8")


def generate_and_seed_credentials():
    from backend.database import mp_allocations, users
    from backend.auth import ROLE_DISTRICT_AUDITOR, ROLE_MP

    os.makedirs("data", exist_ok=True)
    now = datetime.now(timezone.utc)

    # 1. Lok Sabha Constituencies (18th Lok Sabha primary, fallback 17th Lok Sabha)
    ls_constituencies = {}
    for r in mp_allocations.find({"house": "18th Lok Sabha"}):
        c_name = r.get("constituency")
        if c_name and c_name not in ls_constituencies:
            ls_constituencies[c_name] = r

    for r in mp_allocations.find({"house": "17th Lok Sabha"}):
        c_name = r.get("constituency")
        if c_name and c_name not in ls_constituencies:
            ls_constituencies[c_name] = r

    # 2. Rajya Sabha MPs
    rs_records = list(mp_allocations.find({"house": "Rajya Sabha"}))

    logger.info(
        "Loaded %d Lok Sabha constituencies and %d Rajya Sabha MPs from database.",
        len(ls_constituencies),
        len(rs_records),
    )

    credentials_list = []
    users_data = []

    # --- LOK SABHA ---
    for c_name, doc in sorted(ls_constituencies.items(), key=lambda x: x[0]):
        state = doc.get("state", "")
        mp_name = doc.get("mp_name", "")
        c_slug = clean_slug(c_name)
        c_code = clean_code(c_name)

        # District Authority Auditor
        auditor_username = f"auditor_{c_slug}"
        auditor_password = f"Auditor@{c_code}2026!"
        credentials_list.append({
            "house": "Lok Sabha",
            "category": "District Authority Auditor",
            "constituency": c_name,
            "district": c_name,
            "state": state,
            "representative": mp_name,
            "role": ROLE_DISTRICT_AUDITOR,
            "username": auditor_username,
            "password": auditor_password,
        })
        users_data.append({
            "username": auditor_username,
            "password": auditor_password,
            "role": ROLE_DISTRICT_AUDITOR,
            "constituency": c_name,
            "district": c_name,
            "state": state,
        })

        # Member of Parliament (Lok Sabha)
        mp_username = f"mp_{c_slug}"
        mp_password = f"MP@{c_code}2026!"
        credentials_list.append({
            "house": "Lok Sabha",
            "category": "Member of Parliament (Lok Sabha)",
            "constituency": c_name,
            "district": c_name,
            "state": state,
            "representative": mp_name,
            "role": ROLE_MP,
            "username": mp_username,
            "password": mp_password,
        })
        users_data.append({
            "username": mp_username,
            "password": mp_password,
            "role": ROLE_MP,
            "constituency": c_name,
            "state": state,
            "mp_name": mp_name,
        })

    # --- RAJYA SABHA ---
    for doc in sorted(rs_records, key=lambda x: (x.get("state", ""), x.get("mp_name", ""))):
        state = doc.get("state", "")
        mp_name = doc.get("mp_name", "")
        constituency = doc.get("constituency", "Sitting Rajya Sabha")
        mp_slug = clean_slug(mp_name)
        mp_code = clean_code(mp_name)

        rs_username = f"rs_{mp_slug}"
        rs_password = f"RS@{mp_code}2026!"
        credentials_list.append({
            "house": "Rajya Sabha",
            "category": "Member of Parliament (Rajya Sabha)",
            "constituency": constituency,
            "district": state,
            "state": state,
            "representative": mp_name,
            "role": ROLE_MP,
            "username": rs_username,
            "password": rs_password,
        })
        users_data.append({
            "username": rs_username,
            "password": rs_password,
            "role": ROLE_MP,
            "constituency": constituency,
            "state": state,
            "mp_name": mp_name,
        })

    # Export to data/constituency_credentials.json
    json_path = os.path.join("data", "constituency_credentials.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(credentials_list, f, indent=2, ensure_ascii=False)
    logger.info("Saved JSON credentials to: %s (%d accounts)", json_path, len(credentials_list))

    # Export to data/constituency_credentials.csv
    csv_path = os.path.join("data", "constituency_credentials.csv")
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "house",
                "category",
                "constituency",
                "district",
                "state",
                "representative",
                "role",
                "username",
                "password",
            ],
        )
        writer.writeheader()
        writer.writerows(credentials_list)
    logger.info("Saved CSV credentials to: %s", csv_path)

    # Parallel Bcrypt Password Hashing for MongoDB seeding
    logger.info("Generating secure bcrypt password hashes in parallel (8 workers)...")
    passwords = [u["password"] for u in users_data]
    max_workers = min(os.cpu_count() or 4, 8)
    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        hashes = list(executor.map(_hash_worker, passwords))

    logger.info("Computed %d password hashes. Preparing MongoDB bulk upsert...", len(hashes))
    bulk_ops = []
    for user_entry, pwd_hash in zip(users_data, hashes):
        doc = {
            "username": user_entry["username"],
            "password_hash": pwd_hash,
            "role": user_entry["role"],
            "constituency": user_entry.get("constituency"),
            "state": user_entry.get("state"),
            "district": user_entry.get("district"),
            "mp_name": user_entry.get("mp_name"),
            "is_active": True,
            "updated_at": now,
        }
        bulk_ops.append(
            UpdateOne(
                {"username": doc["username"]},
                {"$set": doc, "$setOnInsert": {"created_at": now}},
                upsert=True,
            )
        )

    result = users.bulk_write(bulk_ops, ordered=False)
    logger.info(
        "MongoDB users upsert complete: %d matched, %d modified, %d upserted. Total users now in DB: %d",
        result.matched_count,
        result.modified_count,
        result.upserted_count,
        users.count_documents({}),
    )


if __name__ == "__main__":
    generate_and_seed_credentials()
