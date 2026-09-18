"""MongoDB connection layer.

A single MongoClient is shared process-wide. The four collections mirror the
previous tables (works, mp_allocations, review_logs, sync_logs); get_db yields
the database so FastAPI's Depends(get_db) contract is unchanged.
"""
from pymongo import ASCENDING, DESCENDING, MongoClient, ReturnDocument

from backend.config import settings

import logging

_logger = logging.getLogger("backend.database")
is_mock = False

try:
    _client = MongoClient(
        settings.MONGODB_URI,
        appname="mplads-ai-sentinel",
        serverSelectionTimeoutMS=10000,
        connectTimeoutMS=10000,
        socketTimeoutMS=600000,
    )
    # Probe to check if MongoDB is alive
    _client.admin.command("ping")
    db = _client[settings.MONGO_DB_NAME]
except Exception as e:
    if settings.ENVIRONMENT in ("development", "test"):
        _logger.warning(
            "Local MongoDB not reachable at %s. Falling back to in-memory mongomock for local development.",
            settings.MONGODB_URI,
        )
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

            _client = mongomock.MongoClient()
            db = _client[settings.MONGO_DB_NAME]
            is_mock = True
        except ImportError:
            raise e
    else:
        raise e

works = db["works"]
mp_allocations = db["mp_allocations"]
review_logs = db["review_logs"]
public_reviews = db["public_reviews"]
citizen_problems = db["citizen_problems"]
sync_logs = db["sync_logs"]
users = db["users"]
distributed_locks = db["distributed_locks"]
rate_limits = db["rate_limits"]
_counters = db["counters"]



def init_database(uri: str, db_name: str = None):
    """Rebind MongoClient and collections to a new URI (used by scripts and runtime overrides)."""
    global _client, db, works, mp_allocations, review_logs, public_reviews, citizen_problems, sync_logs, users, distributed_locks, rate_limits, _counters
    import sys
    settings.MONGODB_URI = uri
    if db_name:
        settings.MONGO_DB_NAME = db_name
    _client = MongoClient(
        uri,
        appname="mplads-ai-sentinel",
        serverSelectionTimeoutMS=10000,
        connectTimeoutMS=10000,
        socketTimeoutMS=600000,
    )
    db = _client[settings.MONGO_DB_NAME]
    works = db["works"]
    mp_allocations = db["mp_allocations"]
    review_logs = db["review_logs"]
    public_reviews = db["public_reviews"]
    citizen_problems = db["citizen_problems"]
    sync_logs = db["sync_logs"]
    users = db["users"]
    distributed_locks = db["distributed_locks"]
    rate_limits = db["rate_limits"]
    _counters = db["counters"]

    # Also update any modules that have already imported collection references
    for mod_name in ("backend.database", "backend.services.ingestion", "backend.seeder", "backend.main", "backend.services.analytics", "backend.auth"):
        if mod_name in sys.modules:
            mod = sys.modules[mod_name]
            for attr in ("works", "mp_allocations", "review_logs", "public_reviews", "citizen_problems", "sync_logs", "users", "distributed_locks", "rate_limits", "_counters", "db"):
                if hasattr(mod, attr):
                    setattr(mod, attr, locals().get(attr, getattr(sys.modules["backend.database"], attr, None)))


def next_id(sequence: str) -> int:
    """Sequential integer ids for documents surfaced with int ids (sync logs,
    review logs), matching the previous autoincrement columns."""
    doc = _counters.find_one_and_update(
        {"_id": sequence},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return int(doc["seq"])


def ensure_indexes() -> None:
    """Idempotent and resilient index creation, called at startup.
    Catches and logs index conflicts, already-existing configurations,
    or dirty duplicate data without crashing service boot."""
    if is_mock:
        return
    import logging
    _log = logging.getLogger(__name__)

    index_specs = [
        (works, [("work_id", ASCENDING)], {"unique": True}),
        (works, [("priority_rank", ASCENDING), ("work_id", ASCENDING)], {}),
        (works, [("risk_tier", ASCENDING), ("priority_rank", ASCENDING)], {}),
        (works, [("_mp_name_lower", ASCENDING), ("house", ASCENDING)], {}),
        (works, [("_state_lower", ASCENDING), ("priority_rank", ASCENDING)], {}),
        (works, [("house", ASCENDING)], {}),
        (works, [("work_category", ASCENDING)], {}),
        (works, [("work_status", ASCENDING)], {}),
        (works, [("final_risk_score", ASCENDING)], {}),
        (works, [("final_risk_score", DESCENDING), ("sanction_amount", DESCENDING),
                 ("rule_flag_count", DESCENDING), ("work_id", ASCENDING)], {"name": "rank_order_idx"}),
        (mp_allocations, [("mp_name", ASCENDING), ("house", ASCENDING),
                          ("constituency", ASCENDING), ("state", ASCENDING)], {"unique": True}),
        (mp_allocations, [("_mp_name_lower", ASCENDING)], {}),
        (review_logs, [("work_id", ASCENDING), ("created_at", DESCENDING)], {}),
        (public_reviews, [("work_id", ASCENDING), ("created_at", DESCENDING)], {}),
        (sync_logs, [("run_timestamp", DESCENDING)], {}),
        (users, [("username", ASCENDING)], {"unique": True}),
        (distributed_locks, [("lock_name", ASCENDING)], {"unique": True}),
        (distributed_locks, [("expires_at", ASCENDING)], {"expireAfterSeconds": 0}),
        (rate_limits, [("expires_at", ASCENDING)], {"expireAfterSeconds": 0}),
        (rate_limits, [("key", ASCENDING), ("window_start", ASCENDING)], {"unique": True}),
    ]

    for col, keys, opts in index_specs:
        try:
            col.create_index(keys, **opts)
        except Exception as e:
            _log.warning(
                "Skipping or failed to create index %s on %s: %s",
                keys, col.name, e
            )


def get_db():
    yield db
