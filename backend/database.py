"""MongoDB connection layer.

A single MongoClient is shared process-wide. The four collections mirror the
previous tables (works, mp_allocations, review_logs, sync_logs); get_db yields
the database so FastAPI's Depends(get_db) contract is unchanged.
"""
from pymongo import ASCENDING, DESCENDING, MongoClient, ReturnDocument

from backend.config import settings

_client = MongoClient(
    settings.MONGODB_URI,
    appname="mplads-ai-sentinel",
    # Short server-selection timeout: fail fast if MONGODB_URI is wrong so the
    # startup error is logged immediately (Render dashboard shows it clearly).
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=5000,
    # Live-sync bulk writes and long-running aggregation cursors must not
    # time out mid-flight; the driver default (30s idle) is too tight.
    socketTimeoutMS=600000,
)
db = _client[settings.MONGO_DB_NAME]

works = db["works"]
mp_allocations = db["mp_allocations"]
review_logs = db["review_logs"]
public_reviews = db["public_reviews"]
sync_logs = db["sync_logs"]
users = db["users"]
distributed_locks = db["distributed_locks"]
_counters = db["counters"]


def init_database(uri: str, db_name: str = None):
    """Rebind MongoClient and collections to a new URI (used by scripts and runtime overrides)."""
    global _client, db, works, mp_allocations, review_logs, public_reviews, sync_logs, users, distributed_locks, _counters
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
    sync_logs = db["sync_logs"]
    users = db["users"]
    distributed_locks = db["distributed_locks"]
    _counters = db["counters"]

    # Also update any modules that have already imported collection references
    for mod_name in ("backend.database", "backend.services.ingestion", "backend.seeder", "backend.main", "backend.services.analytics"):
        if mod_name in sys.modules:
            mod = sys.modules[mod_name]
            for attr in ("works", "mp_allocations", "review_logs", "public_reviews", "sync_logs", "users", "distributed_locks", "_counters", "db"):
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
    """Idempotent index creation, called at startup."""
    works.create_index([("work_id", ASCENDING)], unique=True)
    works.create_index([("priority_rank", ASCENDING), ("work_id", ASCENDING)])
    works.create_index([("risk_tier", ASCENDING), ("priority_rank", ASCENDING)])
    works.create_index([("_mp_name_lower", ASCENDING), ("house", ASCENDING)])
    works.create_index([("_state_lower", ASCENDING), ("priority_rank", ASCENDING)])
    works.create_index([("house", ASCENDING)])
    works.create_index([("work_category", ASCENDING)])
    works.create_index([("work_status", ASCENDING)])
    works.create_index([("final_risk_score", ASCENDING)])
    mp_allocations.create_index(
        [("mp_name", ASCENDING), ("house", ASCENDING),
         ("constituency", ASCENDING), ("state", ASCENDING)],
        unique=True,
    )
    mp_allocations.create_index([("_mp_name_lower", ASCENDING)])
    review_logs.create_index([("work_id", ASCENDING), ("created_at", DESCENDING)])
    public_reviews.create_index([("work_id", ASCENDING), ("created_at", DESCENDING)])
    sync_logs.create_index([("run_timestamp", DESCENDING)])
    users.create_index([("username", ASCENDING)], unique=True)
    distributed_locks.create_index([("lock_name", ASCENDING)], unique=True)
    distributed_locks.create_index([("expires_at", ASCENDING)], expireAfterSeconds=0)


def get_db():
    yield db
