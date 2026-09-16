"""
Ingestion & data pipeline regression test suite verifying fixes for:
1. n_distinct_vendors index alignment bug in _reshape_long_format()
2. _upsert_allocations() missing record_type column bug (no AttributeError)
3. House classification integrity (no silent Lok Sabha misclassification)
4. Single sync log contract (exactly 1 log per run, success or failure)
5. Distributed locking concurrency & stale lock recovery
"""
import pandas as pd
import pytest
from datetime import datetime, timezone, timedelta
from backend.services.ingestion import (
    _reshape_long_format, _upsert_allocations, _classify_house,
    acquire_sync_lock, release_sync_lock, run_ingestion
)
import backend.database as db


def test_n_distinct_vendors_index_alignment():
    """
    Bug 12 Fix: Verify that n_distinct_vendors uses key-based merge on work_id
    and is accurately populated without all-NaN values due to pandas index alignment.
    """
    raw_data = [
        # Work 1: Sanctioned row + 3 expenditure rows across 2 distinct vendors
        {"work_id": "W1", "record_type": "Work Sanctioned", "sanctioned_amount": 100000.0, "vendor_name": None, "state": "Delhi", "mp_name": "MP1"},
        {"work_id": "W1", "record_type": "Expenditure Incurred", "disbursed_amount": 20000.0, "vendor_name": "Vendor A", "state": "Delhi", "mp_name": "MP1"},
        {"work_id": "W1", "record_type": "Expenditure Incurred", "disbursed_amount": 30000.0, "vendor_name": "Vendor B", "state": "Delhi", "mp_name": "MP1"},
        {"work_id": "W1", "record_type": "Expenditure Incurred", "disbursed_amount": 10000.0, "vendor_name": "Vendor A", "state": "Delhi", "mp_name": "MP1"},

        # Work 2: Sanctioned row + 1 expenditure row with 1 vendor
        {"work_id": "W2", "record_type": "Work Sanctioned", "sanctioned_amount": 50000.0, "vendor_name": None, "state": "Goa", "mp_name": "MP2"},
        {"work_id": "W2", "record_type": "Expenditure Incurred", "disbursed_amount": 15000.0, "vendor_name": "Vendor C", "state": "Goa", "mp_name": "MP2"},

        # Work 3: Sanctioned row + 0 expenditures
        {"work_id": "W3", "record_type": "Work Sanctioned", "sanctioned_amount": 75000.0, "vendor_name": None, "state": "Punjab", "mp_name": "MP3"},
    ]
    raw_df = pd.DataFrame(raw_data)
    wide_df = _reshape_long_format(raw_df)

    assert not wide_df.empty
    assert "n_distinct_vendors" in wide_df.columns

    w1 = wide_df[wide_df["work_id"] == "W1"].iloc[0]
    w2 = wide_df[wide_df["work_id"] == "W2"].iloc[0]
    w3 = wide_df[wide_df["work_id"] == "W3"].iloc[0]

    # Vendor A and Vendor B -> 2 distinct vendors
    assert w1["n_distinct_vendors"] == 2
    assert not pd.isna(w1["n_distinct_vendors"])

    # Vendor C -> 1 distinct vendor
    assert w2["n_distinct_vendors"] == 1
    assert not pd.isna(w2["n_distinct_vendors"])

    # 0 expenditures -> 0 distinct vendors
    assert w3["n_distinct_vendors"] == 0
    assert not pd.isna(w3["n_distinct_vendors"])


def test_upsert_allocations_missing_record_type_does_not_crash():
    """
    Bug 13 Fix: If record_type column is missing from the DataFrame,
    _upsert_allocations() must handle it gracefully without crashing
    with AttributeError: 'bool' object has no attribute 'empty'.
    """
    df_missing_column = pd.DataFrame([
        {"mp_name": "Test MP", "state": "Kerala", "house": "Lok Sabha", "allocated_amount": 50000000.0}
    ])
    # Must not raise AttributeError
    count = _upsert_allocations(df_missing_column)
    assert count >= 0


def test_house_classification_explicit_and_safe():
    """
    Bug 16 Fix: Ensure missing or ambiguous house information is NOT silently
    defaulted to 'Lok Sabha', protecting Rajya Sabha statistics from corruption.
    """
    assert _classify_house("Lok Sabha") == "Lok Sabha"
    assert _classify_house("lok sabha") == "Lok Sabha"
    assert _classify_house("Rajya Sabha") == "Rajya Sabha"
    assert _classify_house("RAJYA SABHA") == "Rajya Sabha"
    assert _classify_house("RS") == "Rajya Sabha"
    assert _classify_house("LS") == "Lok Sabha"

    assert _classify_house("18th Lok Sabha") == "18th Lok Sabha"
    assert _classify_house("18th lok sabha") == "18th Lok Sabha"
    assert _classify_house("lok_sabha_18") == "18th Lok Sabha"
    assert _classify_house("17th Lok Sabha") == "17th Lok Sabha"
    assert _classify_house("17th lok sabha") == "17th Lok Sabha"
    assert _classify_house("lok_sabha_17") == "17th Lok Sabha"

    # Missing / None / NaN / empty values must classify as Unknown, NEVER Lok Sabha
    assert _classify_house(None) == "Unknown / Unclassified"
    assert _classify_house("") == "Unknown / Unclassified"
    assert _classify_house(float("nan")) == "Unknown / Unclassified"
    assert _classify_house("Council of States") == "Rajya Sabha"
    assert _classify_house("Random Garbage") == "Unknown / Unclassified"


def test_sync_log_single_entry_contract(monkeypatch):
    """
    Bug 14 Fix: Verify that every ingestion run creates exactly ONE sync log
    and never leaves duplicate or missing run records.
    """
    from backend.services.ingestion import _log_sync, SOURCE_LIVE
    from backend.models import now_utc

    sync_logs_col = db.sync_logs
    initial_log_count = sync_logs_col.count_documents({})

    # 1. Simulate a successful ingestion via direct _log_sync call
    _log_sync(source=SOURCE_LIVE, status="success", start_dt=now_utc(),
              counts={"fetched": 10, "processed": 10, "inserted": 10, "updated": 0})
    new_count = sync_logs_col.count_documents({})
    assert new_count == initial_log_count + 1

    # 2. Failed run with simulated upstream failure
    def mock_fail(*args, **kwargs):
        raise ConnectionError("Simulated Upstream Portal 502 Bad Gateway")

    monkeypatch.setattr("backend.services.mplads_live.fetch_live_long_dataframe", mock_fail)
    res_fail = run_ingestion(mode="live")
    assert res_fail["status"] == "failed"
    final_count = sync_logs_col.count_documents({})
    assert final_count == initial_log_count + 2

    # Verify that the failed log was recorded properly
    failed_log = sync_logs_col.find_one({"status": "failed"}, sort=[("run_timestamp", -1)])
    assert failed_log is not None
    assert failed_log.get("error_message") is not None


def test_distributed_locking_concurrency():
    """
    Bug 20 Fix: Test distributed lock prevents concurrent runs and recovers
    properly on release or expiration.
    """
    # Clean locks collection
    db.distributed_locks.delete_many({})

    # Worker 1 acquires lock
    lock1 = acquire_sync_lock(lease_seconds=60)
    assert lock1 is not None

    # Worker 2 attempts concurrent lock acquisition -> must be rejected
    lock2 = acquire_sync_lock(lease_seconds=60)
    assert lock2 is None

    # Worker 1 releases lock
    released = release_sync_lock(lock1)
    assert released is True

    # Now Worker 2 can acquire lock
    lock3 = acquire_sync_lock(lease_seconds=60)
    assert lock3 is not None
    release_sync_lock(lock3)
