"""
Aggregate analytics queries shared by the REST endpoints.

Every transparency-facing aggregation (MP directory, MP profile, state
directory/profile, category & status analytics, CSV export) lives here so the
route handlers in backend/main.py stay thin and the query logic is testable.

All queries target MongoDB: filters are plain dicts, aggregations are
pipelines. Output shapes match the previous SQL implementation exactly.
"""
import ast
import csv
import io
import re
from typing import Optional, Generator

from pymongo import ASCENDING, DESCENDING

from backend.database import works, mp_allocations, review_logs

HIGH_RISK_TIER = "High Risk - Review"
MEDIUM_RISK_TIER = "Medium Risk - Monitor"
LOW_RISK_TIER = "Low Risk"

# Fields a client may sort the works list by. Anything else is rejected.
WORK_SORTABLE_FIELDS = {
    "priority_rank", "final_risk_score", "sanction_amount",
    "total_fund_disbursed", "utilization_ratio", "mp_name", "state",
    "work_category", "work_status", "rule_flag_count", "updated_at",
    "created_at",
}

# Aggregate sort keys accepted by the MP / state directories.
DIRECTORY_SORTABLE_FIELDS = {
    "name", "works_count", "total_sanctioned", "total_disbursed",
    "avg_utilization", "avg_risk_score", "high_risk_count", "mp_count",
    "total_allocated", "allocated_amount",
}

# Directory sort key -> grouped-document field produced by _group_works()
_DIRECTORY_SORT_KEY = {
    "name": "_id",
    "works_count": "count",
    "total_sanctioned": "total_sanctioned",
    "total_disbursed": "total_disbursed",
    "total_allocated": "total_sanctioned",
    "allocated_amount": "total_sanctioned",
    "avg_utilization": "avg_utilization",
    "avg_risk_score": "avg_risk_score",
    "high_risk_count": "high_risk_count",
}


# ------------------------------------------------------------------------------
# Shared expressions & helpers
# ------------------------------------------------------------------------------

def _ci(value: str) -> dict:
    """Case-insensitive 'contains' matcher mirroring SQL ilike '%value%'."""
    return {"$regex": re.escape(value.strip()), "$options": "i"}


def _group_works(group_key: Optional[str], with_extremes: bool = False,
                 include_house: bool = False) -> dict:
    """$group stage computing the standard per-entity aggregates."""
    stage: dict = {
        "_id": None if group_key is None else f"${group_key}",
        "count": {"$sum": 1},
        "total_sanctioned": {"$sum": {"$ifNull": ["$sanction_amount", 0.0]}},
        "total_disbursed": {"$sum": {"$ifNull": ["$total_fund_disbursed", 0.0]}},
        "avg_utilization": {"$avg": {"$ifNull": ["$utilization_ratio", 0.0]}},
        "avg_risk_score": {"$avg": {"$ifNull": ["$final_risk_score", 0.0]}},
        "max_risk_score": {"$max": {"$ifNull": ["$final_risk_score", 0.0]}},
        "high_risk_count": {"$sum": {"$cond": [{"$eq": ["$risk_tier", HIGH_RISK_TIER]}, 1, 0]}},
        "medium_risk_count": {"$sum": {"$cond": [{"$eq": ["$risk_tier", MEDIUM_RISK_TIER]}, 1, 0]}},
        # $gt None matches present, non-null values (missing fields compare as null)
        "reviewed_count": {"$sum": {"$cond": [{"$gt": ["$human_review_outcome", None]}, 1, 0]}},
    }
    if with_extremes:
        stage["constituency"] = {"$max": "$constituency"}
        stage["state"] = {"$max": "$state"}
    if include_house:
        stage["house"] = {"$max": "$house"}
    return stage


def _count_groups(group_key: str, match: dict) -> int:
    """Number of distinct groups for a match, without materializing them."""
    res = list(works.aggregate([
        {"$match": match},
        {"$group": {"_id": f"${group_key}"}},
        {"$count": "n"},
    ]))
    return int(res[0]["n"]) if res else 0


def house_match(house: Optional[str]):
    """Returns the MongoDB match value for a house filter.
    'Lok Sabha' matches both 17th and 18th terms via regex.
    '18th Lok Sabha' matches specifically '18th Lok Sabha'.
    '17th Lok Sabha' matches specifically '17th Lok Sabha'.
    'Rajya Sabha' matches 'Rajya Sabha'.
    """
    if not house:
        return None
    h = str(house).strip()
    if h.lower() in ("lok sabha", "loksabha"):
        return {"$regex": "Lok Sabha", "$options": "i"}
    return h


def _allocations_by_mp(house: Optional[str] = None) -> dict:
    """Per-MP allocated totals from the mp_allocations ledger."""
    hm = house_match(house)
    match = {"house": hm} if hm is not None else {}
    rows = mp_allocations.aggregate([
        {"$match": match},
        {"$group": {"_id": "$mp_name",
                    "allocated": {"$sum": {"$ifNull": ["$allocated_amount", 0.0]}}}},
    ])
    return {r["_id"]: float(r["allocated"] or 0) for r in rows}


def _allocations_by_state(house: Optional[str] = None) -> dict:
    """Per-state allocated totals from the mp_allocations ledger."""
    hm = house_match(house)
    match = {"house": hm} if hm is not None else {}
    rows = mp_allocations.aggregate([
        {"$match": match},
        {"$group": {"_id": "$state",
                    "allocated": {"$sum": {"$ifNull": ["$allocated_amount", 0.0]}}}},
    ])
    return {r["_id"]: float(r["allocated"] or 0) for r in rows if r.get("_id")}


def parse_rule_flags(raw) -> list:
    """Deserialize rule_flags_triggered into a clean list (stored as a list in
    Mongo; the string path keeps legacy CSV round-trips working)."""
    if not raw:
        return []
    if isinstance(raw, (list, tuple)):
        return [str(f) for f in raw]
    try:
        parsed = ast.literal_eval(raw)
        return [str(f) for f in parsed] if isinstance(parsed, (list, tuple)) else []
    except (ValueError, SyntaxError):
        return [f.strip() for f in raw.strip("[]").replace("'", "").split(",") if f.strip()]


def work_to_list_item(w: dict) -> dict:
    """Serialize a works document into the WorkListItem payload shape."""
    return {
        "work_id": w.get("work_id"),
        "mp_name": w.get("mp_name"),
        "state": w.get("state"),
        "constituency": w.get("constituency"),
        "ida": w.get("ida"),
        "primary_vendor": w.get("primary_vendor"),
        "work_category": w.get("work_category"),
        "work_type": w.get("work_type"),
        "sanction_amount": w.get("sanction_amount") or 0.0,
        "total_fund_disbursed": w.get("total_fund_disbursed") or 0.0,
        "utilization_ratio": w.get("utilization_ratio") or 0.0,
        "work_status": w.get("work_status"),
        "completion_date": w.get("completion_date"),
        "final_risk_score": w.get("final_risk_score") or 0.0,
        "priority_rank": int(w.get("priority_rank") or 0),
        "risk_tier": w.get("risk_tier") or LOW_RISK_TIER,
        "recommended_action": w.get("recommended_action"),
        "rule_flag_count": int(w.get("rule_flag_count") or 0),
        "rule_flags_triggered": parse_rule_flags(w.get("rule_flags_triggered")),
        "human_review_outcome": w.get("human_review_outcome"),
        "statutory_fail_count": int(w.get("statutory_fail_count") or 0),
        "statutory_review_count": int(w.get("statutory_review_count") or 0),
        "statutory_fails": w.get("statutory_fails") or [],
        "statutory_reviews": w.get("statutory_reviews") or [],
        "data_quality_defects": w.get("data_quality_defects") or [],
        "auditor_action_directive": w.get("auditor_action_directive"),
    }


def apply_house(filt: dict, house: Optional[str]) -> dict:
    """Constrain a filter dict to a single house when one is selected."""
    hm = house_match(house)
    if hm is not None:
        filt["house"] = hm
    return filt


def apply_work_filters(
    state: Optional[str] = None,
    mp_name: Optional[str] = None,
    house: Optional[str] = None,
    ida: Optional[str] = None,
    risk_tier: Optional[str] = None,
    work_category: Optional[str] = None,
    work_status: Optional[str] = None,
    search: Optional[str] = None,
) -> dict:
    """Build the standard works-list filter dict, shared by list & export."""
    filt: dict = {}
    if state:
        filt["state"] = _ci(state)
    if mp_name:
        filt["mp_name"] = _ci(mp_name)
    if house:
        hm = house_match(house)
        if hm is not None:
            filt["house"] = hm
    if ida:
        filt["ida"] = _ci(ida)
    if risk_tier:
        filt["risk_tier"] = risk_tier.strip()
    if work_category:
        filt["work_category"] = work_category.strip()
    if work_status:
        filt["work_status"] = work_status.strip()
    if search:
        s = _ci(search)
        filt["$or"] = [{"work_id": s}, {"primary_vendor": s}, {"work_type": s}]
    return filt


# ------------------------------------------------------------------------------
# MP directory & profile
# ------------------------------------------------------------------------------

def get_mp_directory(
    db,
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    state: Optional[str] = None,
    house: Optional[str] = None,
    sort_by: str = "total_sanctioned",
    order: str = "desc",
) -> dict:
    """Paginated MP-wise fund & risk aggregation for the public MP directory."""
    match: dict = {"mp_name": {"$nin": [None, ""]}}
    if state:
        match["state"] = _ci(state)
    if house:
        hm = house_match(house)
        if hm is not None:
            match["house"] = hm
    if search:
        match["$or"] = [{"mp_name": _ci(search)}, {"constituency": _ci(search)}]

    total = _count_groups("mp_name", match)
    sort_field = _DIRECTORY_SORT_KEY.get(sort_by, "total_sanctioned")
    direction = DESCENDING if order.lower() == "desc" else ASCENDING

    rows = list(works.aggregate([
        {"$match": match},
        {"$group": _group_works("mp_name", with_extremes=True)},
        {"$sort": {sort_field: direction, "_id": ASCENDING}},
        {"$skip": (page - 1) * page_size},
        {"$limit": page_size},
    ]))

    alloc_map = _allocations_by_mp(house)
    items = []
    for rank, r in enumerate(rows, start=(page - 1) * page_size + 1):
        allocated = alloc_map.get(r["_id"], 0.0)
        items.append({
            "rank": rank,
            "mp_name": r["_id"],
            "constituency": r.get("constituency"),
            "state": r.get("state"),
            "works_count": int(r["count"] or 0),
            "total_sanctioned": round(float(r["total_sanctioned"] or 0), 2),
            "total_disbursed": round(float(r["total_disbursed"] or 0), 2),
            "avg_utilization": round(float(r["avg_utilization"] or 0), 4),
            "avg_risk_score": round(float(r["avg_risk_score"] or 0), 1),
            "max_risk_score": round(float(r["max_risk_score"] or 0), 1),
            "high_risk_count": int(r["high_risk_count"] or 0),
            "medium_risk_count": int(r["medium_risk_count"] or 0),
            "reviewed_count": int(r["reviewed_count"] or 0),
            "allocated_amount": round(allocated, 2),
            "total_allocated": round(allocated, 2),
        })

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    return {
        "total": total, "page": page, "page_size": page_size,
        "total_pages": total_pages, "items": items,
    }


def get_mp_profile(db, mp_name: str, house: Optional[str] = None) -> Optional[dict]:
    """Full transparency dossier for one MP: funds, risk tiers, breakdowns, works."""
    match: dict = {"_mp_name_lower": mp_name.strip().lower()}
    if house:
        hm = house_match(house)
        if hm is not None:
            match["house"] = hm

    agg_rows = list(works.aggregate([
        {"$match": match},
        {"$group": _group_works(None, with_extremes=True, include_house=True)},
    ]))
    if not agg_rows or int(agg_rows[0]["count"] or 0) == 0:
        return None
    agg = agg_rows[0]

    # The portal's allocated limit is an MP-level ledger value. It must never
    # fall back to the sum of work sanctions, which is a different source field.
    alloc_match = {"_mp_name_lower": mp_name.strip().lower()}
    if house:
        hm = house_match(house)
        if hm is not None:
            alloc_match["house"] = hm
    alloc_rows = list(mp_allocations.aggregate([
        {"$match": alloc_match},
        {"$group": {"_id": None,
                    "total_allocated": {"$sum": {"$ifNull": ["$allocated_amount", 0.0]}}}},
    ]))
    total_allocated = round(float(alloc_rows[0]["total_allocated"] or 0), 2) if alloc_rows else 0.0

    tier_distribution = {HIGH_RISK_TIER: 0, MEDIUM_RISK_TIER: 0, LOW_RISK_TIER: 0}
    for row in works.aggregate([
        {"$match": match},
        {"$group": {"_id": "$risk_tier", "count": {"$sum": 1}}},
    ]):
        if row["_id"] in tier_distribution:
            tier_distribution[row["_id"]] = int(row["count"])

    def _breakdown(column: str, limit: int) -> list:
        bmatch = {**match, column: {"$nin": [None, ""]}}
        rows = works.aggregate([
            {"$match": bmatch},
            {"$group": {
                "_id": f"${column}",
                "count": {"$sum": 1},
                "total_sanctioned": {"$sum": {"$ifNull": ["$sanction_amount", 0.0]}},
                "total_disbursed": {"$sum": {"$ifNull": ["$total_fund_disbursed", 0.0]}},
                "avg_risk_score": {"$avg": {"$ifNull": ["$final_risk_score", 0.0]}},
                "high_risk_count": {"$sum": {"$cond": [{"$eq": ["$risk_tier", HIGH_RISK_TIER]}, 1, 0]}},
            }},
            {"$sort": {"total_sanctioned": DESCENDING}},
            {"$limit": limit},
        ])
        return [
            {
                "name": r["_id"],
                "count": int(r["count"]),
                "total_sanctioned": round(float(r["total_sanctioned"]), 2),
                "total_disbursed": round(float(r["total_disbursed"]), 2),
                "avg_risk_score": round(float(r["avg_risk_score"]), 1),
                "high_risk_count": int(r["high_risk_count"]),
            }
            for r in rows
        ]

    top_works = works.find(match).sort(
        [("final_risk_score", DESCENDING), ("work_id", ASCENDING)]
    ).limit(10)

    work_ids = works.distinct("work_id", match)
    recent_reviews = review_logs.find({"work_id": {"$in": work_ids}}) \
        .sort([("created_at", DESCENDING)]).limit(10)

    vendor_match = {**match, "primary_vendor": {"$nin": [None, ""]}}
    vendor_count = len(works.distinct("primary_vendor", vendor_match))

    return {
        "mp_name": mp_name.strip(),
        "constituency": agg.get("constituency"),
        "state": agg.get("state"),
        "works_count": int(agg["count"]),
        "total_allocated": total_allocated,
        "allocated_amount": total_allocated,
        "total_sanctioned": round(float(agg["total_sanctioned"]), 2),
        "sanction_amount": round(float(agg["total_sanctioned"]), 2),
        "total_disbursed": round(float(agg["total_disbursed"]), 2),
        "fund_disbursed_amount": round(float(agg["total_disbursed"]), 2),
        "avg_utilization": round(float(agg["avg_utilization"]), 4),
        "avg_risk_score": round(float(agg["avg_risk_score"]), 1),
        "max_risk_score": round(float(agg["max_risk_score"]), 1),
        "high_risk_count": int(agg["high_risk_count"]),
        "medium_risk_count": int(agg["medium_risk_count"]),
        "low_risk_count": tier_distribution[LOW_RISK_TIER],
        "reviewed_count": int(agg["reviewed_count"]),
        "vendor_count": int(vendor_count),
        "tier_distribution": tier_distribution,
        "category_breakdown": _breakdown("work_category", 12),
        "status_breakdown": _breakdown("work_status", 12),
        "agency_breakdown": _breakdown("ida", 8),
        "top_vendors": _breakdown("primary_vendor", 8),
        "top_risk_works": [work_to_list_item(w) for w in top_works],
        "recent_reviews": [
            {
                "id": r.get("id"),
                "work_id": r.get("work_id"),
                "reviewer_name": r.get("reviewer_name"),
                "reviewer_role": r.get("reviewer_role"),
                "outcome": r.get("outcome"),
                "created_at": r["created_at"].isoformat() if r.get("created_at") else None,
            }
            for r in recent_reviews
        ],
    }


# ------------------------------------------------------------------------------
# State directory & profile
# ------------------------------------------------------------------------------

def get_state_directory(
    db,
    house: Optional[str] = None,
    page: int = 1,
    page_size: int = 40,
    sort_by: str = "total_sanctioned",
    order: str = "desc",
) -> dict:
    """State-wise aggregation: funds, MPs covered, risk concentration."""
    match: dict = {"state": {"$nin": [None, ""]}}
    if house:
        hm = house_match(house)
        if hm is not None:
            match["house"] = hm

    total = _count_groups("state", match)
    sort_field = _DIRECTORY_SORT_KEY.get(sort_by, "total_sanctioned")
    direction = DESCENDING if order.lower() == "desc" else ASCENDING

    rows = works.aggregate([
        {"$match": match},
        {"$group": {**_group_works("state"), "mp_set": {"$addToSet": "$mp_name"}}},
        {"$set": {"mp_count": {"$size": {"$setDifference": ["$mp_set", [None, ""]]}}}},
        {"$sort": {sort_field: direction, "_id": ASCENDING}},
        {"$skip": (page - 1) * page_size},
        {"$limit": page_size},
    ])

    alloc_map = _allocations_by_state(house)

    items = [
        {
            "rank": (page - 1) * page_size + idx,
            "state": r["_id"],
            "mp_count": int(r.get("mp_count") or 0),
            "works_count": int(r["count"] or 0),
            "total_sanctioned": round(float(r["total_sanctioned"] or 0), 2),
            "total_disbursed": round(float(r["total_disbursed"] or 0), 2),
            "allocated_amount": round(float(alloc_map.get(r["_id"], 0.0)), 2),
            "total_allocated": round(float(alloc_map.get(r["_id"], 0.0)), 2),
            "avg_utilization": round(float(r["avg_utilization"] or 0), 4),
            "avg_risk_score": round(float(r["avg_risk_score"] or 0), 1),
            "high_risk_count": int(r["high_risk_count"] or 0),
            "medium_risk_count": int(r["medium_risk_count"] or 0),
            "reviewed_count": int(r["reviewed_count"] or 0),
        }
        for idx, r in enumerate(rows, start=1)
    ]

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    return {
        "total": total, "page": page, "page_size": page_size,
        "total_pages": total_pages, "items": items,
    }


def get_state_profile(db, state: str, house: Optional[str] = None) -> Optional[dict]:
    """State dossier: funds, tier spread, top MPs, agencies and categories."""
    match: dict = {"_state_lower": state.strip().lower()}
    if house:
        hm = house_match(house)
        if hm is not None:
            match["house"] = hm

    agg_rows = list(works.aggregate([
        {"$match": match},
        {"$group": {**_group_works(None), "mp_set": {"$addToSet": "$mp_name"}}},
        {"$set": {"mp_count": {"$size": {"$setDifference": ["$mp_set", [None, ""]]}}}},
    ]))
    if not agg_rows or int(agg_rows[0]["count"] or 0) == 0:
        return None
    agg = agg_rows[0]

    tier_distribution = {HIGH_RISK_TIER: 0, MEDIUM_RISK_TIER: 0, LOW_RISK_TIER: 0}
    for row in works.aggregate([
        {"$match": match},
        {"$group": {"_id": "$risk_tier", "count": {"$sum": 1}}},
    ]):
        if row["_id"] in tier_distribution:
            tier_distribution[row["_id"]] = int(row["count"])

    mp_match = {**match, "mp_name": {"$nin": [None, ""]}}
    mp_rows = works.aggregate([
        {"$match": mp_match},
        {"$group": _group_works("mp_name", with_extremes=True)},
        {"$sort": {"high_risk_count": DESCENDING, "total_sanctioned": DESCENDING}},
        {"$limit": 12},
    ])

    def _breakdown(column: str, limit: int) -> list:
        bmatch = {**match, column: {"$nin": [None, ""]}}
        rows = works.aggregate([
            {"$match": bmatch},
            {"$group": {
                "_id": f"${column}",
                "count": {"$sum": 1},
                "total_sanctioned": {"$sum": {"$ifNull": ["$sanction_amount", 0.0]}},
                "total_disbursed": {"$sum": {"$ifNull": ["$total_fund_disbursed", 0.0]}},
                "avg_risk_score": {"$avg": {"$ifNull": ["$final_risk_score", 0.0]}},
                "high_risk_count": {"$sum": {"$cond": [{"$eq": ["$risk_tier", HIGH_RISK_TIER]}, 1, 0]}},
            }},
            {"$sort": {"total_sanctioned": DESCENDING}},
            {"$limit": limit},
        ])
        return [
            {
                "name": r["_id"],
                "count": int(r["count"]),
                "total_sanctioned": round(float(r["total_sanctioned"]), 2),
                "total_disbursed": round(float(r["total_disbursed"]), 2),
                "avg_risk_score": round(float(r["avg_risk_score"]), 1),
                "high_risk_count": int(r["high_risk_count"]),
            }
            for r in rows
        ]

    alloc_match = {"state": _ci(state)}
    if house:
        hm = house_match(house)
        if hm is not None:
            alloc_match["house"] = hm
    alloc_rows = list(mp_allocations.aggregate([
        {"$match": alloc_match},
        {"$group": {"_id": None, "total_allocated": {"$sum": {"$ifNull": ["$allocated_amount", 0.0]}}}},
    ]))
    total_allocated = round(float(alloc_rows[0]["total_allocated"] or 0), 2) if alloc_rows else 0.0

    return {
        "state": state.strip(),
        "works_count": int(agg["count"]),
        "mp_count": int(agg.get("mp_count") or 0),
        "total_allocated": total_allocated,
        "allocated_amount": total_allocated,
        "total_sanctioned": round(float(agg["total_sanctioned"]), 2),
        "total_disbursed": round(float(agg["total_disbursed"]), 2),
        "avg_utilization": round(float(agg["avg_utilization"]), 4),
        "avg_risk_score": round(float(agg["avg_risk_score"]), 1),
        "high_risk_count": int(agg["high_risk_count"]),
        "medium_risk_count": int(agg["medium_risk_count"]),
        "low_risk_count": tier_distribution[LOW_RISK_TIER],
        "reviewed_count": int(agg["reviewed_count"]),
        "tier_distribution": tier_distribution,
        "top_mps": [
            {
                "mp_name": r["_id"],
                "constituency": r.get("constituency"),
                "state": state.strip(),
                "works_count": int(r["count"]),
                "total_sanctioned": round(float(r["total_sanctioned"]), 2),
                "total_disbursed": round(float(r["total_disbursed"]), 2),
                "avg_utilization": round(float(r["avg_utilization"]), 4),
                "avg_risk_score": round(float(r["avg_risk_score"]), 1),
                "max_risk_score": round(float(r["max_risk_score"]), 1),
                "high_risk_count": int(r["high_risk_count"]),
                "medium_risk_count": int(r["medium_risk_count"]),
                "reviewed_count": int(r["reviewed_count"]),
            }
            for r in mp_rows
        ],
        "category_breakdown": _breakdown("work_category", 12),
        "agency_breakdown": _breakdown("ida", 8),
    }


# ------------------------------------------------------------------------------
# Portfolio-wide analytics for chart widgets
# ------------------------------------------------------------------------------

def get_category_analytics(db, house: Optional[str] = None) -> list:
    """Fund share & risk per work category (for the overview charts)."""
    match: dict = {"work_category": {"$nin": [None, ""]}}
    if house:
        hm = house_match(house)
        if hm is not None:
            match["house"] = hm
    rows = works.aggregate([
        {"$match": match},
        {"$group": {
            "_id": "$work_category",
            "count": {"$sum": 1},
            "total_sanctioned": {"$sum": {"$ifNull": ["$sanction_amount", 0.0]}},
            "total_disbursed": {"$sum": {"$ifNull": ["$total_fund_disbursed", 0.0]}},
            "avg_risk_score": {"$avg": {"$ifNull": ["$final_risk_score", 0.0]}},
            "high_risk_count": {"$sum": {"$cond": [{"$eq": ["$risk_tier", HIGH_RISK_TIER]}, 1, 0]}},
        }},
        {"$sort": {"total_sanctioned": DESCENDING}},
    ])
    rows = list(rows)
    total_sanctioned = sum(float(r["total_sanctioned"]) for r in rows) or 1.0
    return [
        {
            "name": r["_id"],
            "count": int(r["count"]),
            "total_sanctioned": round(float(r["total_sanctioned"]), 2),
            "total_disbursed": round(float(r["total_disbursed"]), 2),
            "avg_risk_score": round(float(r["avg_risk_score"]), 1),
            "high_risk_count": int(r["high_risk_count"]),
            "sanctioned_share": round(float(r["total_sanctioned"]) / total_sanctioned, 4),
        }
        for r in rows
    ]


def get_status_analytics(db, house: Optional[str] = None) -> list:
    """Execution status distribution (completed / ongoing / etc.)."""
    match: dict = {"work_status": {"$nin": [None, ""]}}
    if house:
        hm = house_match(house)
        if hm is not None:
            match["house"] = hm
    rows = works.aggregate([
        {"$match": match},
        {"$group": {
            "_id": "$work_status",
            "count": {"$sum": 1},
            "total_sanctioned": {"$sum": {"$ifNull": ["$sanction_amount", 0.0]}},
            "avg_risk_score": {"$avg": {"$ifNull": ["$final_risk_score", 0.0]}},
        }},
        {"$sort": {"count": DESCENDING}},
    ])
    rows = list(rows)
    total = sum(int(r["count"]) for r in rows) or 1
    return [
        {
            "name": r["_id"],
            "count": int(r["count"]),
            "share": round(int(r["count"]) / total, 4),
            "total_sanctioned": round(float(r["total_sanctioned"]), 2),
            "avg_risk_score": round(float(r["avg_risk_score"]), 1),
        }
        for r in rows
    ]


def top_entity_stats(group_field: str, house: Optional[str] = None,
                     limit: int = 8) -> list:
    """Top-risk entities (states / MPs / vendors) for the overview dashboard."""
    match: dict = {group_field: {"$nin": [None, ""]}}
    if house:
        hm = house_match(house)
        if hm is not None:
            match["house"] = hm
    rows = works.aggregate([
        {"$match": match},
        {"$group": {
            "_id": f"${group_field}",
            "count": {"$sum": 1},
            "avg_score": {"$avg": {"$ifNull": ["$final_risk_score", 0.0]}},
            "high_count": {"$sum": {"$cond": [{"$eq": ["$risk_tier", HIGH_RISK_TIER]}, 1, 0]}},
            "total_sanctioned": {"$sum": {"$ifNull": ["$sanction_amount", 0.0]}},
        }},
        {"$sort": {"high_count": DESCENDING, "avg_score": DESCENDING}},
        {"$limit": limit},
    ])
    return [
        {
            "name": r["_id"],
            "count": int(r["count"]),
            "avg_risk_score": round(float(r["avg_score"] or 0), 1),
            "high_risk_count": int(r["high_count"] or 0),
            "total_sanctioned": round(float(r["total_sanctioned"] or 0), 2),
        }
        for r in rows
    ]


# ------------------------------------------------------------------------------
# Open-data CSV export
# ------------------------------------------------------------------------------

EXPORT_COLUMNS = [
    "work_id", "mp_name", "state", "constituency", "ida", "primary_vendor",
    "work_category", "work_type", "sanction_amount", "total_fund_disbursed",
    "utilization_ratio", "work_status", "completion_date", "final_risk_score",
    "priority_rank", "risk_tier", "recommended_action", "rule_flag_count",
    "human_review_outcome",
]


def stream_works_csv(filt: dict, row_limit: int = 50000) -> Generator[str, None, None]:
    """Stream filtered works as CSV rows; never materializes the full dataset."""
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(EXPORT_COLUMNS)
    yield buf.getvalue()

    projection = {col: 1 for col in EXPORT_COLUMNS}
    projection["_id"] = 0
    yielded = 0
    for w in works.find(filt, projection).batch_size(500):
        buf.seek(0)
        buf.truncate(0)
        writer.writerow([
            w.get(col) if w.get(col) is not None else ""
            for col in EXPORT_COLUMNS
        ])
        yield buf.getvalue()
        yielded += 1
        if yielded >= row_limit:
            break
