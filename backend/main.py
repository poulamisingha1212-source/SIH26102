from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional, List
import secrets
import threading
import logging

from fastapi import FastAPI, Depends, Query, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pymongo import ASCENDING, DESCENDING
from pymongo.errors import PyMongoError

from backend.config import settings
from backend.database import get_db, works, review_logs, public_reviews, sync_logs, mp_allocations, users, ensure_indexes
from backend.schemas import (
    WorkListItem, WorkPaginationResponse, CasePacketResponse,
    ReviewCreateRequest, ReviewResponse, StatsOverviewResponse,
    EntityRiskStat, SyncLogResponse, MPDirectoryItem,
    EntityDirectoryResponse, MPProfileResponse, StateProfileResponse,
    CategoryStat, StatusStat, HealthResponse,
    LoginRequest, LoginResponse, PublicReviewCreateRequest, PublicReviewResponse
)
from backend.auth import (
    get_current_user, get_current_user_optional, get_current_role,
    require_reviewer_role, require_mospi_admin_role,
    verify_password, get_password_hash, create_access_token,
    login_limiter, public_review_limiter, export_limiter, get_client_ip,
    ROLE_MOSPI_REVIEWER, ROLE_DISTRICT_AUDITOR, ROLE_PUBLIC_TIER
)
from backend.seeder import seed_database
from backend.services.ingestion import (
    run_ingestion, get_sync_status, acquire_sync_lock, release_sync_lock,
    VALID_MODES
)
from backend.services import analytics
from model.risk_engine import generate_case_packet, RULE_DESCRIPTIONS
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure indexes and bootstrap database.
    # Failures here are logged but never crash the process so that Render's
    # health-check endpoint (/api/health) can return a "degraded" response
    # and the operator can diagnose connection problems without a restart loop.
    try:
        ensure_indexes()
        logger.info("MongoDB indexes verified.")
    except Exception as e:
        logger.error(
            "MongoDB index creation failed — check MONGODB_URI. "
            "Configured URI prefix: %s... Error: %s",
            settings.MONGODB_URI[:30],
            e,
        )

    if not settings.IS_SERVERLESS:
        try:
            seed_database()
        except Exception as e:
            logger.error(
                "Database seeding failed — check MONGODB_URI. "
                "The API will start in degraded mode. Error: %s",
                e,
            )
        # Daily live sync between 3:00 AM and 6:00 AM Indian Standard Time (3:00 AM IST + 4:30 AM fallback)
        scheduler.add_job(
            run_ingestion,
            CronTrigger(hour=3, minute=0, timezone="Asia/Kolkata"),
            kwargs={"mode": "live"},
            id="daily_mplads_sync_primary",
            replace_existing=True,
        )
        scheduler.add_job(
            run_ingestion,
            CronTrigger(hour=4, minute=30, timezone="Asia/Kolkata"),
            kwargs={"mode": "live"},
            id="daily_mplads_sync_fallback",
            replace_existing=True,
        )
        scheduler.start()
        logger.info("APScheduler started: daily MPLADS sync at 03:00 IST and 04:30 IST.")
    else:
        logger.info("Serverless environment detected: in-process scheduler and auto-seeding disabled.")

    yield

    if not settings.IS_SERVERLESS:
        scheduler.shutdown()
        logger.info("APScheduler shut down.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="MoSPI (SIH26102) MPLADS AI Sentinel — Audit & Anomaly Prioritization Platform",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1024)


# ==============================================================================
# 1. GET /api/works — Priority Queue & Filtered List
# ==============================================================================
@app.get("/works", response_model=WorkPaginationResponse)
@app.get("/api/works", response_model=WorkPaginationResponse)
def get_works(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(25, ge=1, le=100, description="Items per page"),
    state: Optional[str] = Query(None, description="Filter by State"),
    mp_name: Optional[str] = Query(None, description="Filter by MP Name"),
    house: Optional[str] = Query(None, description="Filter by House: 'Lok Sabha' or 'Rajya Sabha'"),
    ida: Optional[str] = Query(None, description="Filter by Implementing Agency"),
    risk_tier: Optional[str] = Query(None, description="Filter by Risk Tier"),
    work_category: Optional[str] = Query(None, description="Filter by Work Category"),
    work_status: Optional[str] = Query(None, description="Filter by Execution Status"),
    search: Optional[str] = Query(None, description="Search by Work ID, vendor or description"),
    sort_by: str = Query("priority_rank", description="Sort field"),
    order: str = Query("asc", description="Sort direction: 'asc' or 'desc'"),
    db=Depends(get_db),
    user_role: str = Depends(get_current_role)
):
    """
    Returns a paginated list of works ordered by priority_rank (default ascending = highest priority first).
    Supports database-level filtering and sorting.
    """
    if sort_by not in analytics.WORK_SORTABLE_FIELDS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid sort field '{sort_by}'. Allowed: {sorted(analytics.WORK_SORTABLE_FIELDS)}"
        )
    if order.lower() not in {"asc", "desc"}:
        raise HTTPException(status_code=400, detail="order must be 'asc' or 'desc'.")

    filt = analytics.apply_work_filters(
        state=state, mp_name=mp_name, house=house, ida=ida, risk_tier=risk_tier,
        work_category=work_category, work_status=work_status, search=search,
    )

    total = works.count_documents(filt)

    direction = DESCENDING if order.lower() == "desc" else ASCENDING
    cursor = works.find(filt).sort([(sort_by, direction), ("work_id", ASCENDING)])

    offset = (page - 1) * page_size
    items_raw = cursor.skip(offset).limit(page_size)

    items = []
    for w in items_raw:
        item = analytics.work_to_list_item(w)
        flags = item["rule_flags_triggered"]
        causes = [RULE_DESCRIPTIONS.get(f, f"Flag triggered: {f}") for f in flags]
        if w.get("is_anomaly"):
            causes.append("Consensus anomaly detected across specialist audit agents.")
        item["causes"] = causes
        items.append(WorkListItem(**item))

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return WorkPaginationResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=items
    )


# ==============================================================================
# 1b. GET /api/export/works — Open-data CSV export
# ==============================================================================
@app.get("/api/export/works")
def export_works_csv(
    request: Request,
    state: Optional[str] = Query(None),
    mp_name: Optional[str] = Query(None),
    house: Optional[str] = Query(None),
    ida: Optional[str] = Query(None),
    risk_tier: Optional[str] = Query(None),
    work_category: Optional[str] = Query(None),
    work_status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    row_limit: int = Query(settings.MAX_EXPORT_ROWS, ge=1, le=settings.MAX_EXPORT_ROWS),
    db=Depends(get_db),
    user_role: str = Depends(get_current_role)
):
    """
    Streams the filtered works list as a downloadable CSV.
    Protected by per-client rate limiting and maximum export row ceilings.
    """
    client_ip = get_client_ip(request)
    allowed, wait_sec = export_limiter.is_allowed(client_ip)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Export rate limit reached. Please wait {wait_sec} seconds before exporting again."
        )

    filt = analytics.apply_work_filters(
        state=state, mp_name=mp_name, house=house, ida=ida, risk_tier=risk_tier,
        work_category=work_category, work_status=work_status, search=search,
    )
    filename = f"mplads_works_export_{datetime.now(timezone.utc):%Y%m%d}.csv"
    return StreamingResponse(
        analytics.stream_works_csv(filt, row_limit=row_limit),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Row-Limit": str(row_limit),
        }
    )


# ==============================================================================
# 2. GET /api/works/{work_id} — Case Packet Detail View
# ==============================================================================
@app.get("/works/{work_id:path}", response_model=CasePacketResponse)
@app.get("/api/works/{work_id:path}", response_model=CasePacketResponse)
def get_work_case_packet(
    work_id: str,
    db=Depends(get_db),
    user_role: str = Depends(get_current_role)
):
    """
    Returns the complete case packet for the requested Work ID.
    """
    work = works.find_one({"work_id": work_id.strip()}, {"_id": 0})
    if not work:
        raise HTTPException(status_code=404, detail=f"Work ID '{work_id}' not found.")

    work_dict = {k: v for k, v in work.items() if not k.startswith("_")}
    packet = generate_case_packet(work_id, work_row=work_dict)

    # Fetch prior reviews for this work
    prior_reviews = review_logs.find({"work_id": work_id}).sort([("created_at", DESCENDING)])
    packet['prior_reviews'] = [
        {
            'id': r.get("id"),
            'reviewer_name': r.get("reviewer_name"),
            'reviewer_role': r.get("reviewer_role"),
            'outcome': r.get("outcome"),
            'notes': r.get("notes") if user_role != ROLE_PUBLIC_TIER else None,
            'created_at': r["created_at"].isoformat() if r.get("created_at") else None
        }
        for r in prior_reviews
    ]

    # Fetch public feedback reviews
    pub_reviews = public_reviews.find({"work_id": work_id}).sort([("created_at", DESCENDING)])
    packet['public_reviews'] = [
        {
            'id': pr.get("id"),
            'is_completed': pr.get("is_completed", False),
            'comment': pr.get("comment"),
            'photo_proof': pr.get("photo_proof"),
            'reporter_name': pr.get("reporter_name", "Anonymous Citizen"),
            'created_at': pr["created_at"].isoformat() if pr.get("created_at") else None
        }
        for pr in pub_reviews
    ]

    return CasePacketResponse(**packet)


# ==============================================================================
# 3. MP & State Transparency Directories
# ==============================================================================
@app.get("/api/mps", response_model=EntityDirectoryResponse)
def get_mp_directory(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    state: Optional[str] = Query(None, description="Filter MPs by State"),
    house: Optional[str] = Query(None, description="Filter by House: 'Lok Sabha' or 'Rajya Sabha'"),
    search: Optional[str] = Query(None, description="Search by MP or constituency name"),
    sort_by: str = Query("total_sanctioned", description="Aggregate sort key"),
    order: str = Query("desc"),
    db=Depends(get_db),
    user_role: str = Depends(get_current_role)
):
    """MP-wise directory: sanctioned/disbursed totals, utilization, risk profile."""
    if sort_by not in analytics.DIRECTORY_SORTABLE_FIELDS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid sort field '{sort_by}'. Allowed: {sorted(analytics.DIRECTORY_SORTABLE_FIELDS)}"
        )
    if order.lower() not in {"asc", "desc"}:
        raise HTTPException(status_code=400, detail="order must be 'asc' or 'desc'.")
    return analytics.get_mp_directory(
        db, page=page, page_size=page_size, search=search, state=state,
        house=house, sort_by=sort_by, order=order,
    )


@app.get("/api/mps/{mp_name}", response_model=MPProfileResponse)
def get_mp_profile(
    mp_name: str,
    house: Optional[str] = Query(None, description="Filter by House: 'Lok Sabha' or 'Rajya Sabha'"),
    db=Depends(get_db),
    user_role: str = Depends(get_current_role)
):
    """Full public dossier for one MP: funds, risk tiers, categories, vendors, top works."""
    profile = analytics.get_mp_profile(db, mp_name, house=house)
    if not profile:
        raise HTTPException(status_code=404, detail=f"No works found for MP '{mp_name}'.")
    return profile


@app.get("/api/states", response_model=EntityDirectoryResponse)
def get_state_directory(
    page: int = Query(1, ge=1),
    page_size: int = Query(40, ge=1, le=100),
    house: Optional[str] = Query(None, description="Filter by House"),
    sort_by: str = Query("total_sanctioned"),
    order: str = Query("desc"),
    db=Depends(get_db),
    user_role: str = Depends(get_current_role)
):
    """State-wise directory: funds, MP coverage and risk concentration."""
    if sort_by not in analytics.DIRECTORY_SORTABLE_FIELDS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid sort field '{sort_by}'. Allowed: {sorted(analytics.DIRECTORY_SORTABLE_FIELDS)}"
        )
    if order.lower() not in {"asc", "desc"}:
        raise HTTPException(status_code=400, detail="order must be 'asc' or 'desc'.")
    return analytics.get_state_directory(db, page=page, page_size=page_size, house=house, sort_by=sort_by, order=order)


@app.get("/api/states/{state}", response_model=StateProfileResponse)
def get_state_profile(
    state: str,
    house: Optional[str] = Query(None, description="Filter by House"),
    db=Depends(get_db),
    user_role: str = Depends(get_current_role)
):
    """State dossier: tier spread, top MPs, agencies and category splits."""
    profile = analytics.get_state_profile(db, state, house=house)
    if not profile:
        raise HTTPException(status_code=404, detail=f"No works found for state '{state}'.")
    return profile


# ==============================================================================
# 3b. Chart analytics — category & execution-status aggregations
# ==============================================================================
@app.get("/api/analytics/categories", response_model=List[CategoryStat])
def get_category_analytics(
    house: Optional[str] = Query(None, description="Filter by House"),
    db=Depends(get_db),
    user_role: str = Depends(get_current_role)
):
    """Fund share, disbursed value and risk per work category."""
    return analytics.get_category_analytics(db, house=house)


@app.get("/api/analytics/status", response_model=List[StatusStat])
def get_status_analytics(
    house: Optional[str] = Query(None, description="Filter by House"),
    db=Depends(get_db),
    user_role: str = Depends(get_current_role)
):
    """Execution status distribution with average risk per status."""
    return analytics.get_status_analytics(db, house=house)


# ==============================================================================
# 4. GET /api/stats/overview — Portfolio Statistics & Sync Health
# ==============================================================================
@app.get("/stats/overview", response_model=StatsOverviewResponse)
@app.get("/api/stats/overview", response_model=StatsOverviewResponse)
def get_stats_overview(
    house: Optional[str] = Query(None, description="Filter by House: 'Lok Sabha' or 'Rajya Sabha'"),
    db=Depends(get_db)
):
    """
    Returns portfolio-level statistics including risk tier counts, top-risk MPs,
    top-risk states, top-risk vendors, and sync health / staleness status.
    """
    def scoped(filt: dict) -> dict:
        return analytics.apply_house(filt, house) if house else filt

    total_works = works.count_documents(scoped({}))
    high_risk_count = works.count_documents(scoped({"risk_tier": 'High Risk - Review'}))
    medium_risk_count = works.count_documents(scoped({"risk_tier": 'Medium Risk - Monitor'}))
    low_risk_count = works.count_documents(scoped({"risk_tier": 'Low Risk'}))

    def _scalar(stage_op: str, field: str, extra_match: Optional[dict] = None) -> float:
        match = scoped(extra_match or {})
        rows = works.aggregate([
            {"$match": match},
            {"$group": {"_id": None, "v": {stage_op: {"$ifNull": [f"${field}", 0.0]}}}},
        ])
        row = next(rows, None)
        return float(row["v"]) if row and row["v"] is not None else 0.0

    total_sanctioned = _scalar("$sum", "sanction_amount")
    total_disbursed = _scalar("$sum", "total_fund_disbursed")
    avg_utilization = _scalar("$avg", "utilization_ratio")
    avg_risk = _scalar("$avg", "final_risk_score")
    reviewed_count = works.count_documents(scoped({"human_review_outcome": {"$ne": None}}))

    alloc_match: dict = {}
    if house:
        alloc_match["house"] = house.strip()
    alloc_rows = mp_allocations.aggregate([
        {"$match": alloc_match},
        {"$group": {"_id": None, "total": {"$sum": {"$ifNull": ["$allocated_amount", 0.0]}}}},
    ])
    alloc_row = next(alloc_rows, None)
    total_allocated = float(alloc_row["total"]) if alloc_row and alloc_row["total"] is not None else 0.0

    works_completed = works.count_documents(
        scoped({"completion_date": {"$nin": [None, ""]}})
    )
    works_pending = max(0, total_works - works_completed)

    ongoing_payments = _scalar("$sum", "total_fund_disbursed", extra_match={
        "$or": [{"completion_date": None}, {"completion_date": ""}],
        "total_fund_disbursed": {"$gt": 0},
    })

    tier_dist = {
        'High Risk - Review': high_risk_count,
        'Medium Risk - Monitor': medium_risk_count,
        'Low Risk': low_risk_count,
    }

    top_states = [EntityRiskStat(**s) for s in analytics.top_entity_stats("state", house)]
    top_mps = [EntityRiskStat(**m) for m in analytics.top_entity_stats("mp_name", house)]
    top_vendors = [EntityRiskStat(**v) for v in analytics.top_entity_stats("primary_vendor", house)]

    sync_info = get_sync_status()

    return StatsOverviewResponse(
        total_works=total_works,
        high_risk_count=high_risk_count,
        medium_risk_count=medium_risk_count,
        low_risk_count=low_risk_count,
        tier_distribution=tier_dist,
        total_sanctioned_amount=round(float(total_sanctioned), 2),
        total_disbursed_amount=round(float(total_disbursed), 2),
        total_allocated_amount=round(float(total_allocated), 2),
        fund_utilization_pct=round(float(total_sanctioned) / float(total_allocated) * 100, 1) if total_allocated else 0.0,
        expenditure_rate_pct=round(float(total_disbursed) / float(total_allocated) * 100, 1) if total_allocated else 0.0,
        works_completed=int(works_completed),
        works_pending=int(works_pending),
        ongoing_work_payments=round(float(ongoing_payments), 2),
        avg_utilization_pct=round(float(avg_utilization) * 100, 1),
        avg_risk_score=round(float(avg_risk), 1),
        reviewed_works=int(reviewed_count),
        top_risk_mps=top_mps,
        top_risk_states=top_states,
        top_risk_vendors=top_vendors,
        latest_sync_timestamp=sync_info["latest_sync_timestamp"],
        latest_sync_status=sync_info["latest_sync_status"],
        is_data_stale=sync_info["is_data_stale"],
        staleness_message=sync_info["staleness_message"]
    )


# ==============================================================================
# 5. POST /api/works/{work_id}/review — Human Review Feedback Loop
# ==============================================================================
@app.post("/works/{work_id:path}/review", response_model=ReviewResponse)
@app.post("/api/works/{work_id:path}/review", response_model=ReviewResponse)
def record_human_review(
    work_id: str,
    payload: ReviewCreateRequest,
    db=Depends(get_db),
    user: dict = Depends(get_current_user),
    user_role: str = Depends(require_reviewer_role)
):
    """
    Formal human review outcome recording.
    Protected by server-side JWT authentication; only MoSPI Reviewers and District Auditors can review.
    """
    valid_outcomes = {'legitimate', 'data-quality issue', 'irregularity', 'confirmed fraud'}
    norm_outcome = payload.outcome.strip().lower()
    if norm_outcome not in valid_outcomes:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid review outcome '{payload.outcome}'. Must be one of: {sorted(valid_outcomes)}"
        )

    work_id = work_id.strip()
    if not works.find_one({"work_id": work_id}):
        raise HTTPException(status_code=404, detail=f"Work ID '{work_id}' not found.")

    reviewer_name = user.get("username") or payload.reviewer_name or user_role
    reviewer_role = user_role  # Strictly enforced from authenticated server role
    now = datetime.now(timezone.utc)

    from backend.database import next_id
    review_log = {
        "id": next_id("review_logs"),
        "work_id": work_id,
        "reviewer_name": reviewer_name,
        "reviewer_role": reviewer_role,
        "outcome": norm_outcome,
        "notes": payload.notes,
        "created_at": now,
    }
    review_logs.insert_one(review_log)

    works.update_one(
        {"work_id": work_id},
        {"$set": {"human_review_outcome": norm_outcome, "updated_at": now}}
    )

    return ReviewResponse(
        success=True,
        work_id=work_id,
        outcome=norm_outcome,
        reviewer_name=reviewer_name,
        reviewer_role=reviewer_role,
        notes=payload.notes,
        created_at=now
    )


# ==============================================================================
# 5a. POST /api/works/{work_id}/public-review — Citizen Verification Feedback
# ==============================================================================
@app.post("/works/{work_id:path}/public-review", response_model=PublicReviewResponse)
@app.post("/api/works/{work_id:path}/public-review", response_model=PublicReviewResponse)
def record_public_review(
    request: Request,
    work_id: str,
    payload: PublicReviewCreateRequest,
    db=Depends(get_db)
):
    """
    Citizen public ground feedback endpoint. Protected by rate limiting,
    payload size caps, and format verification for images.
    """
    client_ip = get_client_ip(request)
    allowed, wait_sec = public_review_limiter.is_allowed(client_ip)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Public verification submission limit reached. Please wait {wait_sec} seconds before submitting again."
        )

    work_id = work_id.strip()
    if not works.find_one({"work_id": work_id}):
        raise HTTPException(status_code=404, detail=f"Work ID '{work_id}' not found.")

    photo = payload.photo_proof
    if photo:
        photo = photo.strip()
        if len(photo) > 2_000_000:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Photo payload exceeds the 1.5MB size limit."
            )
        valid_prefix = any(
            photo.startswith(p) for p in (
                "data:image/jpeg;base64,",
                "data:image/jpg;base64,",
                "data:image/png;base64,",
                "data:image/webp;base64,",
                "http://",
                "https://",
            )
        )
        if not valid_prefix:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid image format. Allowed formats: JPEG, PNG, WEBP base64 data URLs or HTTPS URLs."
            )

    now = datetime.now(timezone.utc)
    from backend.database import next_id

    doc = {
        "id": next_id("public_reviews"),
        "work_id": work_id,
        "is_completed": bool(payload.is_completed),
        "comment": payload.comment.strip() if payload.comment else None,
        "photo_proof": photo,
        "reporter_name": payload.reporter_name.strip() if payload.reporter_name else "Anonymous Citizen",
        "created_at": now
    }
    public_reviews.insert_one(doc)

    return PublicReviewResponse(
        success=True,
        work_id=work_id,
        is_completed=doc["is_completed"],
        comment=doc["comment"],
        photo_proof=doc["photo_proof"],
        reporter_name=doc["reporter_name"],
        created_at=now
    )


# ==============================================================================
# 5b. POST /api/auth/login — MongoDB Authentication with Bcrypt & JWT
# ==============================================================================
@app.post("/auth/login", response_model=LoginResponse)
@app.post("/api/auth/login", response_model=LoginResponse)
def login_user(request: Request, payload: LoginRequest, db=Depends(get_db)):
    """
    Authenticates District Auditor and MoSPI Reviewer users against MongoDB `users` collection.
    Verifies bcrypt password hash and returns signed JWT access token.
    Enforces brute-force rate limiting. Client-controlled target_role is ignored.
    """
    client_ip = get_client_ip(request)
    allowed, wait_sec = login_limiter.is_allowed(client_ip)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many login attempts. Please wait {wait_sec} seconds before trying again."
        )

    uname = payload.username.strip()
    pwd = payload.password.strip()

    user = users.find_one({"username": uname})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    authenticated = False
    if "password_hash" in user:
        authenticated = verify_password(pwd, user["password_hash"])
    elif "password" in user:
        # Legacy migration: upgrade plaintext password to bcrypt hash on successful login
        authenticated = (user["password"] == pwd)
        if authenticated:
            users.update_one(
                {"_id": user["_id"]},
                {"$set": {"password_hash": get_password_hash(pwd)}, "$unset": {"password": ""}}
            )

    if not authenticated:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    server_role = user.get("role", ROLE_PUBLIC_TIER)
    if server_role not in {ROLE_MOSPI_REVIEWER, ROLE_DISTRICT_AUDITOR}:
        server_role = ROLE_PUBLIC_TIER

    token = create_access_token(data={"sub": user["username"], "role": server_role})

    return LoginResponse(
        success=True,
        access_token=token,
        token_type="bearer",
        username=user["username"],
        role=server_role,
        message="Authentication successful"
    )


# ==============================================================================
# 6. Filter options, Sync Health, Manual Trigger & Health
# ==============================================================================
@app.get("/api/filter-options")
def get_filter_options(
    house: Optional[str] = Query(None, description="Filter options by House"),
    db=Depends(get_db)
):
    """Returns unique filter values for the frontend dropdowns."""
    house_filter = {"house": house.strip()} if house else {}

    def _sorted_distinct(field: str) -> list:
        values = works.distinct(field, house_filter)
        return sorted(v for v in values if v)

    return {
        "states": _sorted_distinct("state"),
        "categories": _sorted_distinct("work_category"),
        "statuses": _sorted_distinct("work_status"),
        "mps": _sorted_distinct("mp_name"),
        "risk_tiers": ["High Risk - Review", "Medium Risk - Monitor", "Low Risk"]
    }


@app.get("/sync/status")
@app.get("/api/sync/status")
def sync_status():
    return get_sync_status()


@app.get("/sync/logs", response_model=List[SyncLogResponse])
@app.get("/api/sync/logs", response_model=List[SyncLogResponse])
def get_sync_logs(
    limit: int = 20,
    db=Depends(get_db)
):
    logs = sync_logs.find({}, {"_id": 0}).sort([("run_timestamp", DESCENDING)]).limit(limit)
    return [SyncLogResponse(**doc) for doc in logs]


def _cron_authorized(request: Request) -> bool:
    """Platform-cron authentication via CRON_SECRET."""
    if not settings.CRON_SECRET:
        return False
    auth_header = request.headers.get("authorization", "")
    cron_header = request.headers.get("x-cron-secret", "")
    return (
        secrets.compare_digest(auth_header, f"Bearer {settings.CRON_SECRET}")
        or secrets.compare_digest(cron_header, settings.CRON_SECRET)
    )


def _start_background_sync(mode: str) -> dict:
    if mode not in VALID_MODES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid ingestion mode '{mode}'. Must be one of {sorted(VALID_MODES)}"
        )

    # Test-acquire lock to verify availability before spawning background job
    test_lock = acquire_sync_lock(lease_seconds=30)
    if not test_lock:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A sync is already running or the distributed lock is held by another instance."
        )
    release_sync_lock(test_lock)

    def _run():
        try:
            result = run_ingestion(mode=mode)
            logger.info("Background sync finished: %s", result)
        except Exception as e:
            logger.error("Background sync failed: %s", e)

    threading.Thread(target=_run, daemon=True).start()
    return {
        "status": "started",
        "mode": mode,
        "message": "Live sync started in the background. Progress appears in the audit log when it finishes."
    }


@app.post("/sync/run")
@app.post("/api/sync/run")
def trigger_manual_sync(
    request: Request,
    mode: str = Query("live", description="Ingestion mode: live"),
    user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    Manually trigger ingestion. Restricted to authenticated MoSPI Reviewers
    or platform cron authorization via CRON_SECRET.
    """
    is_cron = _cron_authorized(request)
    if is_cron:
        return _start_background_sync(mode)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Missing or invalid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.get("role") != ROLE_MOSPI_REVIEWER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Only MoSPI Reviewers can trigger sync operations."
        )
    return _start_background_sync(mode)


@app.get("/cron/sync")
@app.get("/api/cron/sync")
def cron_sync(
    request: Request,
    mode: str = Query("live", description="Ingestion mode: live"),
):
    """
    Platform-cron entry point. Requires valid CRON_SECRET.
    Returns HTTP 502 or 500 on failure, or HTTP 409 if locked.
    """
    if not _cron_authorized(request):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: invalid cron credentials."
        )
    if mode not in VALID_MODES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid ingestion mode '{mode}'. Must be one of {sorted(VALID_MODES)}"
        )
    result = run_ingestion(mode=mode)
    if result.get("status") == "failed":
        if result.get("locked"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=result.get("error", "Sync already in progress.")
            )
        err = result.get("error", "Ingestion failed")
        status_code = (
            status.HTTP_502_BAD_GATEWAY
            if ("api" in err.lower() or "portal" in err.lower() or "live" in err.lower())
            else status.HTTP_500_INTERNAL_SERVER_ERROR
        )
        raise HTTPException(status_code=status_code, detail=err)
    return result


@app.get("/health")
@app.get("/api/health", response_model=HealthResponse)
def health_check(db=Depends(get_db)):
    """Liveness probe: verifies API + database connectivity."""
    try:
        works_count = works.count_documents({})
        db_status = "connected"
    except PyMongoError:
        works_count = 0
        db_status = "unavailable"
    return HealthResponse(
        status="ok" if db_status == "connected" else "degraded",
        version=settings.VERSION,
        database=db_status,
        works_count=int(works_count),
        timestamp=datetime.now(timezone.utc).isoformat()
    )


# Static files mount for production React bundle
_frontend_dist = settings.DATA_DIR.parent / "frontend" / "dist"
if _frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=_frontend_dist, html=True), name="frontend")
