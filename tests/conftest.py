import os
import pymongo
import pytest
from pymongo.errors import ServerSelectionTimeoutError

# Patch mongomock BulkOperationBuilder.add_replace to handle PyMongo's 'sort' argument
# and add missing $setDifference aggregation set operator support for mongomock
try:
    import mongomock
    from mongomock.collection import BulkOperationBuilder
    from mongomock.aggregate import _Parser

    _orig_add_replace = BulkOperationBuilder.add_replace
    _orig_add_update = BulkOperationBuilder.add_update

    def _patched_add_replace(self, selector, replacement, upsert=False, collation=None, hint=None, sort=None):
        return _orig_add_replace(self, selector, replacement, upsert=upsert, collation=collation, hint=hint)

    def _patched_add_update(self, selector, update, upsert=False, multi=False, collation=None, array_filters=None, hint=None, sort=None):
        return _orig_add_update(self, selector, update, upsert=upsert, multi=multi, collation=collation, array_filters=array_filters, hint=hint)

    BulkOperationBuilder.add_replace = _patched_add_replace
    BulkOperationBuilder.add_update = _patched_add_update

    _orig_handle_set = _Parser._handle_set_operator

    def _patched_handle_set(self, operator, values):
        if operator == "$setDifference":
            set1, set2 = values
            s1 = self.parse(set1) or []
            s2 = self.parse(set2) or []
            return [x for x in s1 if x not in s2]
        return _orig_handle_set(self, operator, values)

    _Parser._handle_set_operator = _patched_handle_set

except ImportError:
    mongomock = None

import backend.database as db
from backend.config import settings

# PHASE 10: Database test isolation
# By default, use isolated mongomock so tests never touch developer's live or production databases.
settings.ENVIRONMENT = "test"
os.environ["ENVIRONMENT"] = "test"
os.environ["SEED_DEMO_USERS"] = "1"
use_real_mongo = os.getenv("TEST_USE_REAL_MONGO", "0") == "1"

if not use_real_mongo and mongomock is not None:
    mock_client = mongomock.MongoClient()
    mock_db = mock_client["test_mplads_isolated"]

    db._client = mock_client
    db.db = mock_db
    
    COLLECTIONS = [
        "works", "mp_allocations", "review_logs", "public_reviews",
        "users", "sync_logs", "distributed_locks", "_counters"
    ]
    for col in COLLECTIONS:
        setattr(db, col, mock_db[col])

    # Propagate mock collections across all modules that imported them at module level
    import backend.services.analytics as analytics
    import backend.services.ingestion as ingestion
    import backend.auth as auth
    import backend.main as main
    import backend.seeder as seeder

    for mod in (analytics, ingestion, auth, main, seeder):
        for col in COLLECTIONS:
            if hasattr(mod, col):
                setattr(mod, col, mock_db[col])

    # Seed users and sample works into isolated mock DB using the bundled
    # sample CSV directly (avoids run_ingestion which is now live-only).
    seeder.seed_users()
    if mock_db["works"].count_documents({}) == 0:
        import pandas as pd
        from backend.services.ingestion import _reshape_long_format, _upsert_dataframe
        from model.risk_engine import score_dataset
        sample_path = settings.RAW_SAMPLE_PATH
        if sample_path.exists():
            raw = pd.read_csv(sample_path)
            reshaped = _reshape_long_format(raw)
            scored = score_dataset(reshaped, model_dir=settings.MODEL_DIR)
            _upsert_dataframe(scored)


@pytest.fixture(autouse=True)
def reset_rate_limiters():
    """Reset sliding-window rate limiters before each test."""
    try:
        from backend.auth import login_limiter, public_review_limiter, export_limiter
        login_limiter._records.clear()
        public_review_limiter._records.clear()
        export_limiter._records.clear()
    except Exception:
        pass


@pytest.fixture
def admin_token():
    """Returns a valid JWT Bearer token for the MoSPI Admin."""
    from backend.auth import create_access_token
    return create_access_token(
        data={"sub": "admin", "role": "MoSPI Reviewer", "district": "All Districts", "state": "All States"}
    )


@pytest.fixture
def auditor_token():
    """Returns a valid JWT Bearer token for the District Auditor."""
    from backend.auth import create_access_token
    return create_access_token(
        data={"sub": "auditor", "role": "District Auditor", "district": "Varanasi", "state": "Uttar Pradesh"}
    )
