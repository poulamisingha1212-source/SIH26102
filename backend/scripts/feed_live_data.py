"""
MPLADS Live Data Feeder & Ingestion Runner.

Feeds all live government portal datasets into MongoDB in memory-efficient
chunks of 2,000 records.

Usage:
    python -m backend.scripts.feed_live_data
    python -m backend.scripts.feed_live_data --houses rajya_sabha,lok_sabha_18
    python -m backend.scripts.feed_live_data --chunk-size 2000 --mongodb-uri "mongodb+srv://..."
"""
import argparse
import gc
import logging
import os
import sys
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional

import pandas as pd
from pymongo import ReplaceOne, UpdateOne

# Ensure SIH root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.config import settings
import backend.database as db
from backend.models import now_utc, lower_or_none
from backend.services.mplads_live import (
    MPLADSLiveClient,
    DATASET_KEYS,
    HOUSE_COMBOS,
    HOUSE_LABELS,
    datasets_to_long_frame,
    resolve_house_selection,
)
from backend.services.ingestion import (
    _classify_house,
    _normalize_work,
    _reshape_long_format,
    _upsert_allocations,
    purge_preloaded_data,
    acquire_sync_lock,
    release_sync_lock,
    SOURCE_LIVE,
)
from model.risk_engine import score_dataset

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("feed_live_data")


def format_duration(seconds: float) -> str:
    m, s = divmod(int(seconds), 60)
    h, m = divmod(m, 60)
    if h > 0:
        return f"{h}h {m:02d}m {s:02d}s"
    return f"{m:02d}m {s:02d}s"


def feed_house_data(
    client: MPLADSLiveClient,
    combo_key: str,
    chunk_size: int = 2000,
    alloc_map: Optional[dict] = None,
) -> Dict[str, int]:
    """
    Fetch, reshape, score, and upsert all datasets for a single house in chunks of 2,000.
    """
    house_label = HOUSE_LABELS[combo_key]
    logger.info("=" * 70)
    logger.info("STARTING FETCH: %s (combo: %s)", house_label, HOUSE_COMBOS[combo_key])
    logger.info("=" * 70)

    house_start = time.time()
    collected: Dict[str, List[dict]] = {name: [] for name in DATASET_KEYS}

    for name in DATASET_KEYS:
        t_ds = time.time()
        logger.info("--> Fetching dataset '%s' for %s...", name, house_label)
        try:
            records = client.fetch_dataset(combo_key, name)
            collected[name].extend(records)
            logger.info(
                "    Fetched %d records for '%s' in %.1fs",
                len(records), name, time.time() - t_ds
            )
        except Exception as e:
            logger.error("    Failed to fetch '%s': %s", name, e)
        time.sleep(client.inter_request_delay)

    logger.info("Transforming %s datasets into unified long dataframe...", house_label)
    long_df = datasets_to_long_frame(collected, house=house_label)
    del collected
    gc.collect()

    raw_total = len(long_df)
    logger.info("Raw long records for %s: %d", house_label, raw_total)
    if raw_total == 0:
        logger.warning("No records extracted for %s. Skipping to next house.", house_label)
        return {"fetched": 0, "processed": 0, "inserted": 0, "updated": 0, "allocations": 0}

    # Upsert allocations
    logger.info("Upserting MP allocations for %s...", house_label)
    alloc_count = _upsert_allocations(long_df)
    logger.info("Upserted %d MP allocations.", alloc_count)

    # Reshape long format to work-level facts
    logger.info("Reshaping long format into work-level entities...")
    reshaped = _reshape_long_format(long_df)
    del long_df
    gc.collect()

    total_works = len(reshaped)
    logger.info("Unique works to score and upsert: %d", total_works)

    inserted_total = 0
    updated_total = 0
    n_chunks = max(1, (total_works + chunk_size - 1) // chunk_size)

    for idx in range(n_chunks):
        c_start = time.time()
        c_from = idx * chunk_size
        c_to = min((idx + 1) * chunk_size, total_works)
        chunk_df = reshaped.iloc[c_from:c_to].copy()

        logger.info(
            "[%s] Scoring chunk %d/%d (works %d to %d)...",
            house_label, idx + 1, n_chunks, c_from + 1, c_to
        )
        scored_chunk = score_dataset(
            chunk_df, model_dir=settings.MODEL_DIR, mp_allocations=alloc_map
        )
        del chunk_df

        # Bulk upsert to MongoDB
        now = now_utc()
        rows = [r for _, r in scored_chunk.iterrows() if not pd.isna(r.get("work_id"))]
        del scored_chunk

        mappings = [_normalize_work(r) for r in rows]
        work_ids = [m["work_id"] for m in mappings]

        existing_ids = set(db.works.distinct("work_id", {"work_id": {"$in": work_ids}}))

        ops = []
        chunk_ins = chunk_upd = 0
        for m in mappings:
            m["updated_at"] = now
            if m["work_id"] in existing_ids:
                # Update existing work, preserving any human reviewer decisions
                ops.append(UpdateOne(
                    {"work_id": m["work_id"]},
                    {"$set": {k: v for k, v in m.items() if k != "human_review_outcome"}}
                ))
                chunk_upd += 1
            else:
                m["created_at"] = now
                ops.append(ReplaceOne({"work_id": m["work_id"]}, m, upsert=True))
                chunk_ins += 1

        if ops:
            db.works.bulk_write(ops, ordered=False)

        inserted_total += chunk_ins
        updated_total += chunk_upd

        elapsed = time.time() - house_start
        pct = (c_to / total_works) * 100.0
        rate = c_to / max(elapsed, 1.0)
        remaining_sec = (total_works - c_to) / max(rate, 0.1)

        logger.info(
            "  -> Chunk %d/%d done in %.1fs | Progress: %d/%d (%.1f%%) | "
            "+%d inserted, +%d updated | Elapsed: %s | ETA: %s",
            idx + 1, n_chunks, time.time() - c_start,
            c_to, total_works, pct,
            chunk_ins, chunk_upd,
            format_duration(elapsed), format_duration(remaining_sec)
        )

        del ops, mappings, work_ids, existing_ids
        gc.collect()

    del reshaped
    gc.collect()

    logger.info(
        "COMPLETED %s in %s: %d processed (%d inserted, %d updated)",
        house_label, format_duration(time.time() - house_start),
        total_works, inserted_total, updated_total
    )

    return {
        "fetched": raw_total,
        "processed": total_works,
        "inserted": inserted_total,
        "updated": updated_total,
        "allocations": alloc_count,
    }


def run_full_feed(
    houses: List[str],
    chunk_size: int = 2000,
    purge_preloaded: bool = True,
    mongo_uri: Optional[str] = None,
    force: bool = False,
) -> Dict[str, any]:
    """
    Main feed orchestrator. Acquires distributed lock, cleans synthetic data,
    and feeds each house sequentially.
    """
    if mongo_uri:
        db.init_database(mongo_uri)
    elif settings.MONGODB_URI:
        db.init_database(settings.MONGODB_URI)

    if force:
        logger.info("Force flag passed: releasing any existing distributed lock...")
        db.distributed_locks.delete_many({"_id": "mplads_ingestion_lock"})

    start_time = now_utc()
    t0 = time.time()

    logger.info("Connecting to MongoDB at: %s (db: %s)", settings.MONGODB_URI[:35] + "...", settings.MONGO_DB_NAME)

    lock_owner = acquire_sync_lock(lease_seconds=7200)  # 2 hour lock
    if not lock_owner:
        logger.error("Could not acquire distributed sync lock. Another sync is already running (use --force to override).")
        return {"status": "failed", "error": "Distributed lock held by another process"}

    try:
        if purge_preloaded:
            logger.info("Purging any preloaded / synthetic sample data before feed...")
            purged = purge_preloaded_data()
            logger.info("Purge result: %s", purged)

        # Build initial allocation map
        alloc_map = {
            a["mp_name"]: a.get("allocated_amount") or 0.0
            for a in db.mp_allocations.find({}, {"mp_name": 1, "allocated_amount": 1})
        }

        live_client = MPLADSLiveClient(
            timeout=settings.MPLADS_LIVE_TIMEOUT,
            max_retries=3,
            inter_request_delay=1.5,
            retry_delay=3.0,
        )

        grand_totals = {"fetched": 0, "processed": 0, "inserted": 0, "updated": 0, "allocations": 0}

        # Sequence: Rajya Sabha -> Lok Sabha 18 -> Lok Sabha 17
        house_order = []
        for h in ["rajya_sabha", "lok_sabha_18", "lok_sabha_17"]:
            if h in houses:
                house_order.append(h)
        for h in houses:
            if h not in house_order:
                house_order.append(h)

        logger.info("Feed sequence: %s", [HOUSE_LABELS.get(h, h) for h in house_order])

        for h_key in house_order:
            h_metrics = feed_house_data(
                client=live_client,
                combo_key=h_key,
                chunk_size=chunk_size,
                alloc_map=alloc_map,
            )
            for k in grand_totals:
                grand_totals[k] += h_metrics.get(k, 0)

            # Refresh allocation map for next house
            alloc_map = {
                a["mp_name"]: a.get("allocated_amount") or 0.0
                for a in db.mp_allocations.find({}, {"mp_name": 1, "allocated_amount": 1})
            }

        duration = round(time.time() - t0, 2)
        logger.info("=" * 70)
        logger.info(
            "ALL HOUSES PROCESSED in %s! Total Processed: %d (%d inserted, %d updated)",
            format_duration(duration), grand_totals["processed"],
            grand_totals["inserted"], grand_totals["updated"]
        )
        logger.info("=" * 70)

        # Write final sync log
        db.sync_logs.insert_one({
            "id": db.next_id("sync_logs"),
            "run_timestamp": start_time,
            "start_time": start_time,
            "end_time": now_utc(),
            "status": "success",
            "source": SOURCE_LIVE,
            "rows_fetched": grand_totals["fetched"],
            "rows_processed": grand_totals["processed"],
            "rows_inserted": grand_totals["inserted"],
            "rows_updated": grand_totals["updated"],
            "rows_rejected": 0,
            "duration_seconds": duration,
        })

        return {"status": "success", "duration_seconds": duration, **grand_totals}

    except Exception as e:
        logger.exception("Feed failed with error: %s", e)
        db.sync_logs.insert_one({
            "id": db.next_id("sync_logs"),
            "run_timestamp": start_time,
            "start_time": start_time,
            "end_time": now_utc(),
            "status": "failed",
            "source": SOURCE_LIVE,
            "error_message": str(e),
            "duration_seconds": round(time.time() - t0, 2),
        })
        return {"status": "failed", "error": str(e)}

    finally:
        release_sync_lock(lock_owner)


def main():
    parser = argparse.ArgumentParser(description="Feed live MPLADS portal data into MongoDB in chunks.")
    parser.add_argument(
        "--houses",
        default="rajya_sabha,lok_sabha_18,lok_sabha_17",
        help="Comma-separated houses to feed: rajya_sabha,lok_sabha_18,lok_sabha_17 (or 'all'/'both')",
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=2000,
        help="Number of records per scoring batch & MongoDB bulk upsert (default: 2000)",
    )
    parser.add_argument(
        "--skip-purge",
        action="store_true",
        help="Skip purging legacy preloaded synthetic data before feed",
    )
    parser.add_argument(
        "--mongodb-uri",
        default=None,
        help="MongoDB connection URI (overrides MONGODB_URI env var)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force acquisition by clearing any existing distributed lock",
    )

    args = parser.parse_args()

    if args.houses.strip().lower() in ("all", "both"):
        target_houses = ["rajya_sabha", "lok_sabha_18", "lok_sabha_17"]
    else:
        target_houses = [h.strip().lower() for h in args.houses.split(",") if h.strip()]

    print(f"MPLADS Live Feeder starting...")
    print(f"Houses: {target_houses}")
    print(f"Chunk Size: {args.chunk_size}")
    print(f"Purge Preloaded: {not args.skip_purge}")

    res = run_full_feed(
        houses=target_houses,
        chunk_size=args.chunk_size,
        purge_preloaded=not args.skip_purge,
        mongo_uri=args.mongodb_uri,
        force=args.force,
    )
    sys.exit(0 if res.get("status") == "success" else 1)


if __name__ == "__main__":
    main()
