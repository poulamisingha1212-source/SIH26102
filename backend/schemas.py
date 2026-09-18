from typing import Optional, List, Any, Union
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime

class WorkListItem(BaseModel):
    work_id: str
    mp_name: Optional[str] = None
    state: Optional[str] = None
    constituency: Optional[str] = None
    ida: Optional[str] = None
    primary_vendor: Optional[str] = None
    work_category: Optional[str] = None
    work_type: Optional[str] = None
    sanction_amount: float = 0.0
    total_fund_disbursed: float = 0.0
    utilization_ratio: float = 0.0
    work_status: Optional[str] = None
    completion_date: Optional[str] = None
    final_risk_score: float = 0.0
    priority_rank: int = 0
    risk_tier: str = "Low Risk"
    recommended_action: Optional[str] = None
    rule_flag_count: int = 0
    rule_flags_triggered: List[str] = []
    causes: List[str] = []
    human_review_outcome: Optional[str] = None
    statutory_fail_count: int = 0
    statutory_review_count: int = 0
    statutory_fails: List[str] = []
    statutory_reviews: List[str] = []
    data_quality_defects: List[str] = []
    auditor_action_directive: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class WorkPaginationResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[WorkListItem]


class CasePacketResponse(BaseModel):
    work_id: str
    mp_name: Optional[str] = None
    state: Optional[str] = None
    constituency: Optional[str] = None
    ida: Optional[str] = None
    primary_vendor: Optional[str] = None
    work_category: Optional[str] = None
    work_type: Optional[str] = None
    sanction_amount: float = 0.0
    total_fund_disbursed: float = 0.0
    utilization_ratio: float = 0.0
    work_status: Optional[str] = None
    completion_date: Optional[str] = None
    final_risk_score: float = 0.0
    priority_rank: int = 0
    risk_tier: str = "Low Risk"
    recommended_action: Optional[str] = None
    rule_flag_count: int = 0
    rule_flags_triggered: List[str] = []
    causes: List[str] = []
    impact_note: Optional[str] = None
    likelihood_score: float = 0.0
    impact_score: float = 0.0
    weighted_rule_score: float = 0.0
    anomaly_percentile: float = 0.0
    is_anomaly: bool = False
    # Per-agent breakdown (powers the UI explainability cards)
    agent_findings: List[Any] = []
    agents_flagged: int = 0
    agents_total: int = 0
    # Legacy / supplementary numeric fields
    cost_mad_score: Optional[float] = 0.0
    vendor_share_in_state: Optional[float] = 0.0
    disbursement_mismatch_ratio: Optional[float] = 0.0
    days_since_sanction: Optional[float] = 0.0
    n_distinct_vendors: Optional[float] = 0.0
    n_vendor_payments: Optional[float] = 0.0
    human_review_outcome: Optional[str] = None
    prior_reviews: List[dict] = []
    public_reviews: List[dict] = []
    # Phase 3: Explainable Audit Engine Findings & Checklists
    compliance_findings: List[Any] = []
    financial_control_findings: List[Any] = []
    execution_anomalies: List[Any] = []
    audit_heuristics: List[Any] = []
    data_quality_findings: List[Any] = []
    data_gaps: List[str] = []
    auditor_evidence_checklist: List[str] = []
    rule_results: List[Any] = []



class PublicReviewCreateRequest(BaseModel):
    is_completed: bool = Field(..., description="True if work is completed, False if not done")
    comment: Optional[str] = Field(None, max_length=1000, description="Verification comment from citizen")
    photo_proof: Optional[str] = Field(None, max_length=2000000, description="Base64 encoded image or image URL")
    reporter_name: Optional[str] = Field("Anonymous Citizen", max_length=100, description="Citizen reporter name")
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0, description="Citizen GPS latitude")
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0, description="Citizen GPS longitude")
    location_accuracy: Optional[float] = Field(None, ge=0.0, description="GPS accuracy in meters")


class PublicReviewResponse(BaseModel):
    success: bool
    work_id: str
    is_completed: bool
    comment: Optional[str] = None
    photo_proof: Optional[str] = None
    reporter_name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_accuracy: Optional[float] = None
    created_at: datetime


class ReviewCreateRequest(BaseModel):
    outcome: str = Field(
        ..., 
        description="One of: legitimate, data-quality issue, irregularity, confirmed fraud"
    )
    notes: Optional[str] = None
    reviewer_name: Optional[str] = "Authorized Reviewer"
    reviewer_role: Optional[str] = "MoSPI Reviewer"


class ReviewResponse(BaseModel):
    success: bool
    work_id: str
    outcome: str
    reviewer_name: str
    reviewer_role: str
    notes: Optional[str] = None
    created_at: datetime


class EntityRiskStat(BaseModel):
    name: str
    count: int
    avg_risk_score: float
    high_risk_count: int
    total_sanctioned: float


class StatsOverviewResponse(BaseModel):
    total_works: int
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int = 0
    tier_distribution: dict
    total_sanctioned_amount: float
    total_disbursed_amount: float
    total_allocated_amount: float = 0.0
    fund_utilization_pct: float = 0.0      # sanctioned vs allocated (MoSPI definition)
    expenditure_rate_pct: float = 0.0      # disbursed vs allocated
    works_completed: int = 0
    works_pending: int = 0
    ongoing_work_payments: float = 0.0     # vendor payments on not-yet-completed works
    avg_utilization_pct: float = 0.0
    avg_risk_score: float = 0.0
    reviewed_works: int = 0
    top_risk_mps: List[EntityRiskStat]
    top_risk_states: List[EntityRiskStat]
    top_risk_vendors: List[EntityRiskStat]
    latest_sync_timestamp: Optional[str] = None
    latest_sync_status: Optional[str] = "success"
    is_data_stale: bool = False
    staleness_message: str = "Data is fresh and synchronized."


class MPDirectoryItem(BaseModel):
    rank: int = 0
    mp_name: Optional[str] = None
    constituency: Optional[str] = None
    state: Optional[str] = None
    mp_count: int = 0
    works_count: int = 0
    total_allocated: float = 0.0
    total_sanctioned: float = 0.0
    total_disbursed: float = 0.0
    allocated_amount: float = 0.0
    avg_utilization: float = 0.0
    avg_risk_score: float = 0.0
    max_risk_score: float = 0.0
    high_risk_count: int = 0
    medium_risk_count: int = 0
    reviewed_count: int = 0


class EntityDirectoryResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[MPDirectoryItem]


class BreakdownStat(BaseModel):
    name: str
    count: int
    total_sanctioned: float
    total_disbursed: float = 0.0
    avg_risk_score: float
    high_risk_count: int


class StatusStat(BaseModel):
    name: str
    count: int
    share: float
    total_sanctioned: float
    avg_risk_score: float


class CategoryStat(BreakdownStat):
    sanctioned_share: float = 0.0


class MPProfileResponse(BaseModel):
    mp_name: str
    constituency: Optional[str] = None
    state: Optional[str] = None
    works_count: int
    total_allocated: float = 0.0
    allocated_amount: float = 0.0
    total_sanctioned: float
    sanction_amount: float = 0.0
    total_disbursed: float
    fund_disbursed_amount: float = 0.0
    avg_utilization: float
    avg_risk_score: float
    max_risk_score: float
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int
    reviewed_count: int
    vendor_count: int = 0
    tier_distribution: dict
    category_breakdown: List[BreakdownStat] = []
    status_breakdown: List[BreakdownStat] = []
    agency_breakdown: List[BreakdownStat] = []
    top_vendors: List[BreakdownStat] = []
    top_risk_works: List[WorkListItem] = []
    recent_reviews: List[dict] = []


class StateProfileResponse(BaseModel):
    state: str
    works_count: int
    mp_count: int
    total_allocated: float = 0.0
    allocated_amount: float = 0.0
    total_sanctioned: float
    total_disbursed: float
    avg_utilization: float
    avg_risk_score: float
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int = 0
    reviewed_count: int
    tier_distribution: dict
    top_mps: List[MPDirectoryItem] = []
    category_breakdown: List[BreakdownStat] = []
    agency_breakdown: List[BreakdownStat] = []


class HealthResponse(BaseModel):
    status: str
    version: str
    database: str
    works_count: int
    timestamp: str


class LoginRequest(BaseModel):
    username: str
    password: str
    target_role: Optional[str] = None  # Deprecated: Server-side RBAC overrides this


class LoginResponse(BaseModel):
    success: bool
    access_token: str
    token_type: str = "bearer"
    username: str
    role: str
    message: str
    constituency: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    mp_name: Optional[str] = None


class UserProfileResponse(BaseModel):
    username: str
    role: str
    constituency: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    mp_name: Optional[str] = None


class ProblemCreateRequest(BaseModel):
    work_id: Optional[str] = None
    work_title: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    constituency: str
    district: Optional[str] = None
    state: Optional[str] = None
    category: str = "Quality & Specification Concern"
    comment: Optional[str] = None
    photo_proof: Optional[str] = None
    reporter_name: Optional[str] = None
    citizen_name: Optional[str] = None
    contact: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class MPReplyRequest(BaseModel):
    reply_text: Optional[str] = None
    mp_reply: Optional[str] = None
    action_taken: Optional[str] = "Official enquiry instituted with implementing agency"
    status: str = "Action Initiated"  # "Action Initiated", "Under Investigation", "Resolved"


class AuditorReviewRequest(BaseModel):
    auditor_notes: str
    status: str = "Under Investigation"  # "Under Investigation", "Action Initiated", "Resolved"


class ProblemResponse(BaseModel):
    id: str
    work_id: Optional[str] = None
    work_title: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    constituency: str
    district: Optional[str] = None
    state: Optional[str] = None
    category: str
    comment: Optional[str] = None
    photo_proof: Optional[str] = None
    reporter_name: Optional[str] = None
    citizen_name: Optional[str] = None
    contact_masked: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: datetime
    status: str
    mp_reply: Optional[Any] = None
    mp_replied_at: Optional[Union[str, datetime]] = None
    auditor_notes: Optional[Any] = None
    auditor_reviewed_at: Optional[Union[str, datetime]] = None


class ProblemListResponse(BaseModel):
    total: int
    items: List[ProblemResponse]



class SyncLogResponse(BaseModel):
    id: int
    run_timestamp: datetime
    start_time: datetime
    end_time: datetime
    status: str
    source: str
    rows_fetched: int
    rows_processed: int
    rows_inserted: int
    rows_updated: int
    rows_rejected: int
    error_message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
