"""Mongo document shape for the `works` collection.

Field names match the previous SQLAlchemy schema one-for-one so API contracts,
the CSV export and the risk engine inputs are unchanged. Documents additionally
carry two denormalized lowercase helpers (`_mp_name_lower`, `_state_lower`)
used for case-insensitive lookups, matching how the old code queried
func.lower(column).
"""
from datetime import datetime, timezone


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def lower_or_none(value) -> str | None:
    return value.strip().lower() if isinstance(value, str) and value.strip() else None
