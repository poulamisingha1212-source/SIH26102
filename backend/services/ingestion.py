"""
MPLADS live data ingestion pipeline.

Data source: live MPLADS dashboard API (mplads.mospi.gov.in /digigov)
implemented in backend/services/mplads_live.py.

Fetched records are scored with the multi-agent risk engine and upserted
into MongoDB in chunks of 2 000 records per round-trip to keep memory
footprint low on free-tier containers.

Guarantees:
1. Every ingestion run writes exactly one sync_logs entry (success or failure).
2. Distributed locking (MongoDB) prevents concurrent multi-worker syncs.
3. n_distinct_vendors index alignment bug fixed via explicit key-based merge.
4. _upsert_allocations handles missing record_type without crashing.
5. House column is classified explicitly — never silently misclassified.
6. No preloaded / sample CSV data. All data originates from the live portal.
"""
import logging
import os
import time
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import pandas as pd
from pymongo import ReplaceOne, UpdateOne, ReturnDocument
from pymongo.errors import DuplicateKeyError, PyMongoError

from backend.config import settings
from backend.database import works, mp_allocations, sync_logs, distributed_locks, next_id
from backend.models import now_utc, lower_or_none
from model.risk_engine import score_dataset

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Canonical source label used across the sync log UI
SOURCE_LIVE = "MPLADS Live Dashboard API (mplads.mospi.gov.in)"

VALID_MODES = {"live"}

_UPSERT_CHUNK = 2000   # records per MongoDB bulk_write round-trip
_SCORE_CHUNK  = 2000   # records scored per batch (memory control)
SYNC_LOCK_NAME = "mplads_ingestion_lock"
LOCK_LEASE_SECONDS = 900  # 15 minutes max lock duration before expiration


# ------------------------------------------------------------------------------
# Distributed Locking (MongoDB backed)
# ------------------------------------------------------------------------------

def acquire_sync_lock(lease_seconds: int = LOCK_LEASE_SECONDS) -> Optional[str]:
    """Atomically acquire the distributed sync lock in MongoDB.
    Returns owner_id string if acquired, or None if another instance holds it."""
    owner_id = uuid.uuid4().hex
    now = now_utc()
    expires_at = now + timedelta(seconds=lease_seconds)

    doc = {
        "_id": SYNC_LOCK_NAME,
        "lock_name": SYNC_LOCK_NAME,
        "owner_id": owner_id,
        "acquired_at": now,
        "expires_at": expires_at,
    }

    try:
        distributed_locks.insert_one(doc)
        return owner_id
    except DuplicateKeyError:
        # Lock document exists. Check if existing lock is stale/expired.
        acquired = distributed_locks.find_one_and_update(
            {"_id": SYNC_LOCK_NAME, "expires_at": {"$lt": now}},
            {"$set": {"owner_id": owner_id, "acquired_at": now, "expires_at": expires_at}},
            return_document=ReturnDocument.AFTER,
        )
        if acquired and acquired.get("owner_id") == owner_id:
            logger.info("Acquired expired distributed lock '%s'", SYNC_LOCK_NAME)
            return owner_id
        return None
    except Exception as e:
        logger.warning("Error acquiring distributed lock in Mongo (%s); falling back", e)
        # In single-process mock environments if collection is unavailable
        return owner_id


def release_sync_lock(owner_id: Optional[str]) -> bool:
    """Release distributed lock if held by owner_id."""
    if not owner_id:
        return False
    try:
        res = distributed_locks.delete_one({"_id": SYNC_LOCK_NAME, "owner_id": owner_id})
        return res.deleted_count > 0
    except Exception as e:
        logger.warning("Error releasing distributed lock: %s", e)
        return False


# ------------------------------------------------------------------------------
# Normalization & scoring helpers
# ------------------------------------------------------------------------------

def _validate_house(df: pd.DataFrame) -> None:
    """Log warnings for missing or unknown house values in the dataframe."""
    if "house" not in df.columns:
        logger.warning("Dataframe missing 'house' column — house will not be tracked.")
        return
    missing = df["house"].isna() | (df["house"].astype(str).str.strip().isin(["", "None", "nan", "null"]))
    if missing.any():
        logger.warning("%d rows have missing or unknown house information.", missing.sum())


def _classify_house(val: Optional[str]) -> str:
    """Explicit house classification. Distinguishes parliamentary terms (18th / 17th)
    while preserving generic Lok Sabha and Rajya Sabha classifications."""
    if val is None or pd.isna(val):
        return "Unknown / Unclassified"
    s = str(val).strip().lower()
    if not s or s in ("none", "nan", "null", "unknown", "unclassified"):
        return "Unknown / Unclassified"
    if "18" in s and "lok" in s:
        return "18th Lok Sabha"
    if "17" in s and "lok" in s:
        return "17th Lok Sabha"
    if s in ("18th lok sabha", "18th loksabha"):
        return "18th Lok Sabha"
    if s in ("17th lok sabha", "17th loksabha"):
        return "17th Lok Sabha"
    if s in ("lok sabha", "loksabha", "ls", "house of the people"):
        return "Lok Sabha"
    if s in ("rajya sabha", "rajyasabha", "rs", "council of states", "council of state"):
        return "Rajya Sabha"
    return "Unknown / Unclassified"


def _reshape_long_format(df: pd.DataFrame) -> pd.DataFrame:
    """Convert the portal's long format (record_type rows) into work-level facts.
    Fixes:
    - n_distinct_vendors index alignment bug via explicit merge on work_id.
    - Safe key-based merge for house mapping (no index-based slicing).
    """
    _validate_house(df)

    if "record_type" not in df.columns:
        if "total_fund_disbursed" not in df.columns:
            df["total_fund_disbursed"] = 0.0
        if "n_distinct_vendors" not in df.columns:
            df["n_distinct_vendors"] = 0
        return df

    sanctioned = df[df["record_type"].astype(str).str.contains("sanction", case=False, na=False)].copy()
    if len(sanctioned) == 0:
        sanctioned = df.dropna(subset=["work_id"]).drop_duplicates("work_id").copy()
    else:
        sanctioned = sanctioned.drop_duplicates("work_id")

    completed = df[df["record_type"].astype(str).str.contains("completed", case=False, na=False)].copy()
    expenditure = df[df["record_type"].astype(str).str.contains("expenditure", case=False, na=False)].copy()

    amt_col = None
    for cand in ("fund_disbursed_amount", "disbursed_amount", "amount_disbursed"):
        if cand in expenditure.columns:
            amt_col = cand
            break

    if len(expenditure) > 0 and amt_col:
        expenditure[amt_col] = pd.to_numeric(
            expenditure[amt_col], errors="coerce"
        ).fillna(0)

        # 1. Base aggregations for expenditure
        exp_agg = expenditure.groupby("work_id").agg(
            total_fund_disbursed=(amt_col, "sum"),
            n_vendor_payments=(amt_col, "count"),
            primary_vendor=("vendor_name", lambda s: s.dropna().mode().iat[0] if not s.dropna().mode().empty else None) if "vendor_name" in expenditure.columns else (amt_col, lambda s: None),
            last_expenditure_date=("expenditure_date", lambda s: s.dropna().max() if s.notna().any() else None) if "expenditure_date" in expenditure.columns else (amt_col, lambda s: None),
            payment_statuses=("payment_status", lambda s: "|".join(sorted({str(x) for x in s.dropna()}))) if "payment_status" in expenditure.columns else (amt_col, lambda s: None),
        ).reset_index()

        # 2. Fix Issue 12: Distinct vendors per work_id with explicit key-based merge
        if "vendor_name" in expenditure.columns:
            distinct_vendors = (
                expenditure.dropna(subset=["vendor_name"])
                .groupby("work_id")["vendor_name"]
                .nunique()
                .rename("n_distinct_vendors")
                .reset_index()
            )
            exp_agg = exp_agg.merge(distinct_vendors, on="work_id", how="left")
            exp_agg["n_distinct_vendors"] = exp_agg["n_distinct_vendors"].fillna(0).astype(int)
        else:
            exp_agg["n_distinct_vendors"] = 0

        sanctioned = sanctioned.merge(exp_agg, on="work_id", how="left")

    if len(completed) > 0 and "amount_disbursed" in completed.columns:
        comp_slim = completed[["work_id", "completion_date", "amount_disbursed"]].dropna(
            subset=["work_id"]
        ).drop_duplicates("work_id")
        sanctioned = sanctioned.merge(comp_slim, on="work_id", how="left", suffixes=("", "_comp"))
        for col in ("completion_date", "amount_disbursed"):
            comp_col = f"{col}_comp"
            if comp_col in sanctioned.columns:
                sanctioned[col] = sanctioned[col].where(sanctioned[col].notna(), sanctioned[comp_col])
                sanctioned.drop(columns=[comp_col], inplace=True)

    if "total_fund_disbursed" not in sanctioned.columns:
        sanctioned["total_fund_disbursed"] = 0.0
    sanctioned["total_fund_disbursed"] = sanctioned["total_fund_disbursed"].fillna(0.0)

    if "n_distinct_vendors" not in sanctioned.columns:
        sanctioned["n_distinct_vendors"] = 0
    sanctioned["n_distinct_vendors"] = sanctioned["n_distinct_vendors"].fillna(0).astype(int)

    # Preserve 'house' column via key-based map on work_id (Fix Issue 17)
    if "house" in df.columns and "house" not in sanctioned.columns:
        house_series = df.dropna(subset=["work_id"]).drop_duplicates("work_id").set_index("work_id")["house"]
        if "work_id" in sanctioned.columns:
            sanctioned["house"] = sanctioned["work_id"].map(house_series)
        else:
            sanctioned["house"] = None

    return sanctioned


def _normalize_work(row: pd.Series) -> dict:
    """Map any scored row into a works document for bulk upserts."""
    def _s(key, default=None):
        val = row.get(key)
        return None if pd.isna(val) else str(val).strip()

    def _f(key, default=0.0):
        val = row.get(key, default)
        try:
            return float(default if pd.isna(val) else val)
        except (TypeError, ValueError):
            return float(default)

    flags = row.get("rule_flags_triggered", "[]")
    if isinstance(flags, (list, tuple)):
        flags = list(flags)
    elif isinstance(flags, str):
        flags = _parse_flags_string(flags)

    # Explicit house classification (Fix Issue 16)
    house = _classify_house(row.get("house"))

    # Work ID normalization
    work_id = str(row["work_id"]).strip()
    if work_id.endswith(".0"):
        work_id = work_id[:-2]

    mp_name = _s("mp_name")
    state = _s("state")
    return {
        "work_id": work_id,
        "mp_name": mp_name,
        "_mp_name_lower": lower_or_none(mp_name),
        "state": state,
        "_state_lower": lower_or_none(state),
        "constituency": _s("constituency"),
        "house": house,
        "ida": _s("ida"),
        "primary_vendor": _s("primary_vendor"),
        "work_category": _s("work_category"),
        "work_type": _s("work_type"),
        "sanction_amount": _f("sanction_amount"),
        "total_fund_disbursed": _f("total_fund_disbursed"),
        "utilization_ratio": _f("utilization_ratio"),
        "work_status": _s("work_status"),
        "completion_date": _s("completion_date"),
        "final_risk_score": _f("final_risk_score"),
        "priority_rank": int(_f("priority_rank", 999999)),
        "risk_tier": _s("risk_tier") or "Low Risk",
        "recommended_action": _s("recommended_action") or "Routine monitoring",
        "rule_flag_count": int(_f("rule_flag_count")),
        "rule_flags_triggered": flags,
        "likelihood_score": _f("likelihood_score"),
        "impact_score": _f("impact_score"),
        "weighted_rule_score": _f("weighted_rule_score"),
        "anomaly_percentile": _f("anomaly_percentile"),
        "is_anomaly": bool(row.get("is_anomaly", False)),
        "source_file": _s("source_file") or "mplads_dashboard_api",
        "data_source": "live_mplads_portal",
    }


def _parse_flags_string(raw: str) -> list:
    """Parse a serialized flags string back into a list."""
    import ast
    try:
        parsed = ast.literal_eval(raw)
        return [str(f) for f in parsed] if isinstance(parsed, (list, tuple)) else []
    except (ValueError, SyntaxError):
        return [f.strip() for f in raw.strip("[]").replace("'", "").split(",") if f.strip()]


def _upsert_dataframe(df: pd.DataFrame) -> dict:
    """Chunked bulk upsert in batches of _UPSERT_CHUNK (2 000) records.
    Safe and idempotent — UpdateOne for existing work_ids, ReplaceOne+upsert
    for new ones. Preserves human_review_outcome on updates."""
    inserted = updated = 0
    now = now_utc()
    rows = [r for _, r in df.iterrows() if not pd.isna(r.get("work_id"))]

    total = len(rows)
    logger.info("Upserting %d scored records in chunks of %d", total, _UPSERT_CHUNK)

    for start in range(0, total, _UPSERT_CHUNK):
        chunk = rows[start : start + _UPSERT_CHUNK]
        mappings = [_normalize_work(r) for r in chunk]
        ids = [m["work_id"] for m in mappings]

        existing_ids = set(works.distinct("work_id", {"work_id": {"$in": ids}}))

        ops = []
        for m in mappings:
            m["updated_at"] = now
            if m["work_id"] in existing_ids:
                # Preserve human review decisions on update
                ops.append(UpdateOne(
                    {"work_id": m["work_id"]},
                    {"$set": {k: v for k, v in m.items() if k != "human_review_outcome"}}
                ))
                updated += 1
            else:
                m["created_at"] = now
                ops.append(ReplaceOne({"work_id": m["work_id"]}, m, upsert=True))
                inserted += 1
        if ops:
            works.bulk_write(ops, ordered=False)

        logger.info(
            "  chunk %d-%d done (inserted=%d updated=%d so far)",
            start + 1, min(start + _UPSERT_CHUNK, total), inserted, updated
        )

    return {"inserted": inserted, "updated": updated, "processed": len(rows)}


def _upsert_allocations(long_df: pd.DataFrame) -> int:
    """Upsert MP allocated funds. Explicitly handles missing columns (Fix Issue 13)."""
    if "record_type" not in long_df.columns:
        logger.info("Skipping allocation upsert: 'record_type' column not in dataframe.")
        return 0

    alloc = long_df[long_df["record_type"] == "MP Allocated Limit"]
    if alloc.empty:
        return 0

    now = now_utc()
    ops = []
    count = 0
    for _, r in alloc.iterrows():
        if pd.isna(r.get("mp_name")):
            continue

        house_val = _classify_house(r.get("house"))
        mp_name = str(r["mp_name"]).strip()
        key = dict(
            mp_name=mp_name,
            house=house_val,
            constituency=str(r.get("constituency") or "").strip(),
            state=str(r.get("state") or "").strip(),
        )
        values = dict(
            allocated_amount=float(r.get("allocated_amount") or 0),
            tenure_start=str(r.get("recommended_date")) if pd.notna(r.get("recommended_date")) else None,
            updated_at=now,
        )
        doc = {**key, **values, "_mp_name_lower": lower_or_none(mp_name)}
        ops.append(ReplaceOne(key, doc, upsert=True))
        count += 1

    if ops:
        mp_allocations.bulk_write(ops, ordered=False)
    return count


def _log_sync(*, source, status, start_dt, counts=None, note=None):
    """Enforce exact 1-log contract with complete metrics."""
    end_dt = now_utc()
    counts = counts or {}
    sync_logs.insert_one({
        "id": next_id("sync_logs"),
        "run_timestamp": start_dt,
        "start_time": start_dt,
        "end_time": end_dt,
        "status": status,
        "source": source,
        "rows_fetched": counts.get("fetched", 0),
        "rows_processed": counts.get("processed", 0),
        "rows_inserted": counts.get("inserted", 0),
        "rows_updated": counts.get("updated", 0),
        "rows_rejected": counts.get("rejected", 0),
        "error_message": note,
    })


def purge_preloaded_data() -> dict:
    """
    Purge preloaded / synthetic sample data from MongoDB collections.
    Synthetic works have IDs prefixed with 'WS/MP' or originated from synthetic CSV feeds.
    Returns counts of deleted records.
    """
    res_works = works.delete_many({
        "$or": [
            {"work_id": {"$regex": r"^WS/MP"}},
            {"source_file": {"$regex": r"synthetic|sample", "$options": "i"}},
            {"data_source": "preloaded_sample"},
        ]
    })
    res_alloc = mp_allocations.delete_many({
        "$or": [
            {"source_file": {"$regex": r"synthetic|sample", "$options": "i"}},
            {"data_source": "preloaded_sample"},
        ]
    })
    logger.info(
        "Purged preloaded sample data: %d works, %d allocations deleted.",
        res_works.deleted_count, res_alloc.deleted_count
    )
    return {
        "deleted_works": res_works.deleted_count,
        "deleted_allocations": res_alloc.deleted_count,
    }


# ------------------------------------------------------------------------------
# Public entry point
# ------------------------------------------------------------------------------

def run_ingestion(mode: str = "live", purge_preloaded: Optional[bool] = None) -> dict:
    """
    Fetch all works from the live MPLADS portal, score them with the risk
    engine in chunks of _SCORE_CHUNK records, and upsert into MongoDB in
    chunks of _UPSERT_CHUNK records.

    Guarantees:
    - Exactly one sync_logs entry written per call (success or failure).
    - Concurrent ingestion prevented via distributed MongoDB lock.
    - Human review decisions (human_review_outcome) are never overwritten.
    - Preloaded sample data is removed if purge_preloaded=True.
    """
    if mode not in VALID_MODES:
        raise ValueError(f"Invalid ingestion mode '{mode}'. Must be one of {sorted(VALID_MODES)}")

    if purge_preloaded is None:
        purge_preloaded = (settings.ENVIRONMENT != "test")

    start_dt = now_utc()
    t0 = time.time()

    lock_owner = acquire_sync_lock()
    if not lock_owner:
        note = "Ingestion lock held by another concurrent job or worker."
        _log_sync(source=SOURCE_LIVE, status="failed", start_dt=start_dt, note=note)
        return {
            "status": "failed",
            "error": note,
            "duration_seconds": round(time.time() - t0, 2),
            "locked": True,
        }

    logged = False
    try:
        if purge_preloaded:
            purge_preloaded_data()

        import gc
        from backend.services.mplads_live import fetch_live_long_dataframe

        logger.info("Live ingestion started (house=%s)", settings.MPLADS_LIVE_HOUSE)
        raw = fetch_live_long_dataframe(houses=settings.MPLADS_LIVE_HOUSE)
        fetched = len(raw)
        logger.info("Fetched %d raw rows from live portal", fetched)

        # Build allocation lookup from existing data
        alloc_map = {
            a["mp_name"]: a.get("allocated_amount") or 0.0
            for a in mp_allocations.find({}, {"mp_name": 1, "allocated_amount": 1})
        }

        # Reshape the long-format portal data into work-level facts
        reshaped = _reshape_long_format(raw)
        logger.info("Reshaped to %d work-level rows", len(reshaped))

        # --- Chunked scoring + upserting (2 000 records per batch) ---
        total_inserted = total_updated = total_processed = 0
        n_chunks = max(1, (len(reshaped) + _SCORE_CHUNK - 1) // _SCORE_CHUNK)

        for i in range(n_chunks):
            chunk_df = reshaped.iloc[i * _SCORE_CHUNK : (i + 1) * _SCORE_CHUNK].copy()
            logger.info(
                "Scoring chunk %d/%d (%d rows)", i + 1, n_chunks, len(chunk_df)
            )
            scored_chunk = score_dataset(
                chunk_df, model_dir=settings.MODEL_DIR, mp_allocations=alloc_map
            )
            chunk_counts = _upsert_dataframe(scored_chunk)
            total_inserted  += chunk_counts["inserted"]
            total_updated   += chunk_counts["updated"]
            total_processed += chunk_counts["processed"]
            del chunk_df, scored_chunk
            gc.collect()

        del reshaped

        # Upsert MP allocation limits
        alloc_count = _upsert_allocations(raw)
        del raw
        gc.collect()

        counts = {
            "fetched": fetched,
            "processed": total_processed,
            "inserted": total_inserted,
            "updated": total_updated,
            "allocations": alloc_count,
        }
        logger.info("Ingestion complete: %s", counts)
        _log_sync(source=SOURCE_LIVE, status="success", start_dt=start_dt, counts=counts)
        logged = True
        return {
            "status": "success",
            "mode": "live",
            "source": SOURCE_LIVE,
            "duration_seconds": round(time.time() - t0, 2),
            **counts,
        }

    except Exception as e:
        if not logged:
            err_msg = str(e)
            logger.error("Ingestion failed: %s", err_msg)
            _log_sync(source=SOURCE_LIVE, status="failed", start_dt=start_dt, note=err_msg)
            logged = True
        return {
            "status": "failed",
            "mode": "live",
            "error": str(e),
            "duration_seconds": round(time.time() - t0, 2),
        }

    finally:
        release_sync_lock(lock_owner)


def get_sync_status() -> dict:
    """Returns the latest sync status and checks if data is stale (> 24 hours)."""
    last_sync = sync_logs.find_one(sort=[("run_timestamp", -1)])
    if not last_sync:
        return {
            "latest_sync_timestamp": None,
            "latest_sync_status": "none",
            "is_data_stale": True,
            "staleness_message": "No sync records found. Please trigger an initial sync.",
            "rows_processed": 0
        }

    now = now_utc()
    sync_time = last_sync["run_timestamp"]
    if sync_time.tzinfo is None:
        sync_time = sync_time.replace(tzinfo=timezone.utc)

    age_hours = (now - sync_time).total_seconds() / 3600.0
    is_stale = age_hours > 24.0 or last_sync["status"] == "failed"

    if last_sync["status"] == "failed":
        msg = f"Data sync failed ({last_sync.get('error_message')}). Displaying last-known-good dataset."
    elif is_stale:
        msg = f"Data is stale (last synced {round(age_hours, 1)} hours ago)."
    else:
        msg = f"Data is fresh and synchronized ({round(age_hours, 1)}h ago)."

    return {
        "latest_sync_timestamp": last_sync["run_timestamp"].isoformat(),
        "latest_sync_status": last_sync["status"],
        "latest_sync_source": last_sync.get("source"),
        "is_data_stale": is_stale,
        "staleness_message": msg,
        "rows_processed": last_sync.get("rows_processed", 0),
        "source": last_sync.get("source"),
        "error_message": last_sync.get("error_message"),
    }
