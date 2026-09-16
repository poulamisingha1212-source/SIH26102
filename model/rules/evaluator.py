"""Five-State Rule Evaluator for MPLADS 2023 Guidelines.

Evaluates work records deterministically against the official policy rules
and empirical MongoDB evidence, producing structured RuleResult instances.
"""

from typing import Dict, Any, List, Optional
import math
from model.rules.registry import RuleState, RuleResult, registry, LegalStrength

# Configurable numerical epsilon for financial floating-point tolerance
FINANCIAL_EPSILON_INR = 100.0

# Trust & Society single-work ceiling under Para 3.23
TRUST_SOCIETY_SINGLE_WORK_CAP_INR = 5000000.0  # ₹50 Lakh

# Prohibited keywords per Annexure-II
PROHIBITED_KEYWORDS = [
    "statue", "memorial", "monument", "religious", "temple", "church", "mosque",
    "gurudwara", "ashram", "muth", "samadhi", "club", "commercial", "private property"
]

def evaluate_fin_001(row: Dict[str, Any]) -> RuleResult:
    """MPLADS23-FIN-001: Disbursement Without Administrative Sanction."""
    rule = registry.get_rule("MPLADS23-FIN-001")
    status = str(row.get("work_status") or "").strip()
    disbursed = float(row.get("total_fund_disbursed") or 0.0)
    sanction = float(row.get("sanction_amount") or 0.0)

    evidence = {
        "work_status": status,
        "sanction_amount": sanction,
        "total_fund_disbursed": disbursed
    }

    if status.lower() == "pending for sanction" and disbursed > 0:
        return RuleResult(
            rule_id="MPLADS23-FIN-001",
            version=rule.version,
            state=RuleState.FAIL,
            title=rule.title,
            category=rule.category,
            rule_type=rule.legal_strength.value,
            evidence=evidence,
            reason=(
                f"Disbursement of INR {disbursed:,.2f} has been recorded while the work status "
                f"remains '{status}'. MoSPI Guidelines Para 3.11 prohibit fund release prior to "
                f"formal Administrative Sanction."
            ),
            data_gaps=[],
            auditor_evidence_checklist=[
                "Signed Administrative Sanction Order",
                "Sanction approval date and sanction number",
                "District Authority disbursement release register",
                "Payment voucher authorization docket"
            ]
        )
    elif sanction == 0 and disbursed > 0:
        return RuleResult(
            rule_id="MPLADS23-FIN-001",
            version=rule.version,
            state=RuleState.REVIEW,
            title=rule.title,
            category=rule.category,
            rule_type=rule.legal_strength.value,
            evidence=evidence,
            reason=(
                f"Funds of INR {disbursed:,.2f} disbursed against zero recorded sanction amount. "
                f"Requires verification of administrative sanction order."
            ),
            data_gaps=[],
            auditor_evidence_checklist=[
                "Signed Administrative Sanction Order",
                "District Authority payment approval register"
            ]
        )
    else:
        return RuleResult(
            rule_id="MPLADS23-FIN-001",
            version=rule.version,
            state=RuleState.PASS,
            title=rule.title,
            category=rule.category,
            rule_type=rule.legal_strength.value,
            evidence=evidence,
            reason="No disbursement recorded prior to administrative sanction stage.",
            data_gaps=[],
            auditor_evidence_checklist=[]
        )

def evaluate_fin_002(row: Dict[str, Any]) -> RuleResult:
    """MPLADS23-FIN-002: Cumulative Disbursement Exceeding Sanction."""
    rule = registry.get_rule("MPLADS23-FIN-002")
    disbursed = float(row.get("total_fund_disbursed") or 0.0)
    sanction = float(row.get("sanction_amount") or 0.0)
    excess = disbursed - sanction

    evidence = {
        "sanction_amount": sanction,
        "total_fund_disbursed": disbursed,
        "excess_inr": excess,
        "epsilon_inr": FINANCIAL_EPSILON_INR
    }

    if excess > FINANCIAL_EPSILON_INR:
        return RuleResult(
            rule_id="MPLADS23-FIN-002",
            version=rule.version,
            state=RuleState.FAIL,
            title=rule.title,
            category=rule.category,
            rule_type=rule.legal_strength.value,
            evidence=evidence,
            reason=(
                f"Total fund disbursed (INR {disbursed:,.2f}) exceeds the sanctioned amount "
                f"(INR {sanction:,.2f}) by INR {excess:,.2f}, exceeding the numerical tolerance "
                f"of INR {FINANCIAL_EPSILON_INR:.0f}. MoSPI Para 3.11 requires revised sanction approval "
                f"for cost escalations."
            ),
            data_gaps=[],
            auditor_evidence_checklist=[
                "Revised Administrative Sanction Order (if cost escalated)",
                "Technical Sanction and Variation Order",
                "Contractor final bill and Measurement Book (MB) sign-off"
            ]
        )
    elif excess > 0:
        # Floating point artifact within epsilon
        return RuleResult(
            rule_id="MPLADS23-FIN-002",
            version=rule.version,
            state=RuleState.PASS,
            title=rule.title,
            category=rule.category,
            rule_type=rule.legal_strength.value,
            evidence=evidence,
            reason=(
                f"Disbursement is within sanction amount after applying the configured "
                f"INR {FINANCIAL_EPSILON_INR:.0f} numerical tolerance (apparent excess of INR {excess:.4f} "
                f"is an IEEE-754 precision artifact)."
            ),
            data_gaps=[],
            auditor_evidence_checklist=[]
        )
    else:
        return RuleResult(
            rule_id="MPLADS23-FIN-002",
            version=rule.version,
            state=RuleState.PASS,
            title=rule.title,
            category=rule.category,
            rule_type=rule.legal_strength.value,
            evidence=evidence,
            reason="Cumulative disbursement is strictly within sanctioned budget limit.",
            data_gaps=[],
            auditor_evidence_checklist=[]
        )

def evaluate_fin_003(row: Dict[str, Any]) -> RuleResult:
    """MPLADS23-FIN-003: Annual Entitlement Cap Compliance."""
    rule = registry.get_rule("MPLADS23-FIN-003")
    return RuleResult(
        rule_id="MPLADS23-FIN-003",
        version=rule.version,
        state=RuleState.UNKNOWN,
        title=rule.title,
        category=rule.category,
        rule_type=rule.legal_strength.value,
        evidence={"sanction_amount": float(row.get("sanction_amount") or 0.0)},
        reason=(
            "Annual MP entitlement cap (INR 5.00 Crore/year per Para 2.1) cannot be evaluated "
            "because sanction_date, financial_year, and cumulative carry-forward balance ledgers "
            "are unavailable in the portal dataset."
        ),
        data_gaps=["CARRY_FORWARD_LEDGER_UNAVAILABLE", "SANCTION_RECOMMENDATION_DATES_UNAVAILABLE"],
        auditor_evidence_checklist=[
            "State Nodal Department Annual MPLADS Allocation Ledger",
            "District Authority multi-year uncommitted balance register"
        ]
    )

def evaluate_fin_004(row: Dict[str, Any]) -> RuleResult:
    """MPLADS23-FIN-004: Financial Voucher & Payment Reconciliation."""
    rule = registry.get_rule("MPLADS23-FIN-004")
    return RuleResult(
        rule_id="MPLADS23-FIN-004",
        version=rule.version,
        state=RuleState.UNKNOWN,
        title=rule.title,
        category=rule.category,
        rule_type=rule.legal_strength.value,
        evidence={"total_fund_disbursed": float(row.get("total_fund_disbursed") or 0.0)},
        reason="Granular payment vouchers and treasury line-item receipts are unavailable in the portal feed.",
        data_gaps=["FINANCIAL_VOUCHER_RECONCILIATION_UNAVAILABLE"],
        auditor_evidence_checklist=[
            "Treasury / Bank payment vouchers",
            "Contractor running account (RA) bills",
            "Measurement Book (MB) verification certificates"
        ]
    )

def evaluate_soc_001(row: Dict[str, Any]) -> RuleResult:
    """MPLADS23-SOC-001: Trust/Society Single Financial Ceiling (₹50 Lakh)."""
    rule = registry.get_rule("MPLADS23-SOC-001")
    cat = str(row.get("work_category") or "").strip()
    sanction = float(row.get("sanction_amount") or 0.0)

    is_trust = "trust" in cat.lower() or "society" in cat.lower()

    if not is_trust:
        return RuleResult(
            rule_id="MPLADS23-SOC-001",
            version=rule.version,
            state=RuleState.NOT_APPLICABLE,
            title=rule.title,
            category=rule.category,
            rule_type=rule.legal_strength.value,
            evidence={"work_category": cat},
            reason="Rule applies exclusively to works categorized under Trust and Society.",
            data_gaps=[],
            auditor_evidence_checklist=[]
        )

    evidence = {
        "work_category": cat,
        "sanction_amount": sanction,
        "threshold_inr": TRUST_SOCIETY_SINGLE_WORK_CAP_INR
    }

    if sanction > TRUST_SOCIETY_SINGLE_WORK_CAP_INR:
        return RuleResult(
            rule_id="MPLADS23-SOC-001",
            version=rule.version,
            state=RuleState.FAIL,
            title=rule.title,
            category=rule.category,
            rule_type=rule.legal_strength.value,
            evidence=evidence,
            reason=(
                f"Sanctioned amount of INR {sanction:,.2f} exceeds the statutory ceiling of "
                f"INR 50.00 Lakh for a single Trust/Society work under MPLADS Guidelines 2023 Para 3.23."
            ),
            data_gaps=[],
            auditor_evidence_checklist=[
                "NITI Aayog NGO Darpan Registration Certificate",
                "Society Registration Certificate / Trust Deed",
                "3-year audited financial statements of the beneficiary Trust/Society",
                "District Authority sanction approval minutes"
            ]
        )
    else:
        return RuleResult(
            rule_id="MPLADS23-SOC-001",
            version=rule.version,
            state=RuleState.PASS,
            title=rule.title,
            category=rule.category,
            rule_type=rule.legal_strength.value,
            evidence=evidence,
            reason="Sanctioned amount is within the statutory INR 50.00 Lakh single Trust/Society limit.",
            data_gaps=[],
            auditor_evidence_checklist=[]
        )

def evaluate_soc_untestable(rule_id: str, row: Dict[str, Any]) -> RuleResult:
    """SOC-002..005 helper for missing NGO/Trust evidence."""
    rule = registry.get_rule(rule_id)
    cat = str(row.get("work_category") or "").strip()
    is_trust = "trust" in cat.lower() or "society" in cat.lower()

    if not is_trust:
        return RuleResult(
            rule_id=rule_id,
            version=rule.version,
            state=RuleState.NOT_APPLICABLE,
            title=rule.title,
            category=rule.category,
            rule_type=rule.legal_strength.value,
            evidence={"work_category": cat},
            reason="Rule applies exclusively to works categorized under Trust and Society.",
            data_gaps=[],
            auditor_evidence_checklist=[]
        )

    return RuleResult(
        rule_id=rule_id,
        version=rule.version,
        state=RuleState.UNKNOWN,
        title=rule.title,
        category=rule.category,
        rule_type=rule.legal_strength.value,
        evidence={"work_category": cat},
        reason=(
            f"Evidence required for {rule.title} ({rule.clause}) is unavailable in MongoDB: "
            f"Darpan ID, audited balance sheets, and trustee lists are not captured in portal feed."
        ),
        data_gaps=[rule.primary_data_gap] if rule.primary_data_gap else [],
        auditor_evidence_checklist=[
            "NITI Aayog NGO Darpan Unique ID Verification Docket",
            "Certified Copy of Registered Trust Deed / Bylaws",
            "Audited Balance Sheets for preceding 3 consecutive financial years",
            "Hon'ble MP Non-Involvement Declaration / Affidavit (Para 3.23)"
        ]
    )

def evaluate_jur_003(row: Dict[str, Any]) -> RuleResult:
    """MPLADS23-JUR-003: Nominated MP Nationwide Scope Verification."""
    rule = registry.get_rule("MPLADS23-JUR-003")
    constituency = str(row.get("constituency") or "").strip()
    is_nominated = "nominate" in constituency.lower()

    if not is_nominated:
        return RuleResult(
            rule_id="MPLADS23-JUR-003",
            version=rule.version,
            state=RuleState.NOT_APPLICABLE,
            title=rule.title,
            category=rule.category,
            rule_type=rule.legal_strength.value,
            evidence={"constituency": constituency},
            reason="Rule applies exclusively to Nominated Members of Parliament.",
            data_gaps=[],
            auditor_evidence_checklist=[]
        )

    return RuleResult(
        rule_id="MPLADS23-JUR-003",
        version=rule.version,
        state=RuleState.PASS,
        title=rule.title,
        category=rule.category,
        rule_type=rule.legal_strength.value,
        evidence={
            "mp_name": row.get("mp_name"),
            "constituency": constituency,
            "work_state": row.get("state")
        },
        reason="Nominated MPs possess pan-India recommendation scope under MPLADS Guidelines 2023 Para 2.6.",
        data_gaps=[],
        auditor_evidence_checklist=[]
    )

def evaluate_jur_001_002(row: Dict[str, Any], mp_allocation: Optional[Dict[str, Any]] = None) -> RuleResult:
    """MPLADS23-JUR-001 & JUR-002: Lok Sabha & Rajya Sabha Jurisdiction Scope."""
    house = str(row.get("house") or "").strip()
    constituency = str(row.get("constituency") or "").strip()
    work_state = str(row.get("state") or "").strip()

    if "nominate" in constituency.lower():
        return RuleResult(
            rule_id="MPLADS23-JUR-001",
            version="2.2.0",
            state=RuleState.NOT_APPLICABLE,
            title="Lok Sabha / Elected RS Jurisdiction Scope",
            category="JURISDICTION",
            rule_type=LegalStrength.MANDATORY_REQUIREMENT.value,
            evidence={"constituency": constituency},
            reason="Nominated MPs have nationwide jurisdiction under Para 2.6.",
            data_gaps=[],
            auditor_evidence_checklist=[]
        )

    is_lok_sabha = "lok sabha" in house.lower()
    rule_id = "MPLADS23-JUR-001" if is_lok_sabha else "MPLADS23-JUR-002"
    rule = registry.get_rule(rule_id)

    if not mp_allocation:
        return RuleResult(
            rule_id=rule_id,
            version=rule.version,
            state=RuleState.UNKNOWN,
            title=rule.title,
            category=rule.category,
            rule_type=rule.legal_strength.value,
            evidence={"house": house, "work_state": work_state},
            reason="MP allocation reference record unavailable for jurisdiction cross-check.",
            data_gaps=["MP_ALLOCATION_UNAVAILABLE"],
            auditor_evidence_checklist=["MP Election Certificate / Home State Allocation Docket"]
        )

    mp_state = str(mp_allocation.get("state") or "").strip()
    evidence = {
        "house": house,
        "work_state": work_state,
        "mp_state": mp_state,
        "constituency": constituency
    }

    # State equality check (normalized)
    if work_state.lower() != mp_state.lower():
        return RuleResult(
            rule_id=rule_id,
            version=rule.version,
            state=RuleState.REVIEW,
            title=rule.title,
            category=rule.category,
            rule_type=rule.legal_strength.value,
            evidence=evidence,
            reason=(
                f"Work state '{work_state}' differs from Hon'ble MP election/represented state "
                f"'{mp_state}'. Requires review to determine if recommended under Para 2.8 "
                f"natural calamity exception."
            ),
            data_gaps=["CALAMITY_DECLARATION_UNAVAILABLE"],
            auditor_evidence_checklist=[
                "Official Gazette Disaster Notification (Para 2.8)",
                "MoSPI / State Nodal Department Calamity Recommendation Approval",
                "District Authority Inter-State Work Concurrence"
            ]
        )

    return RuleResult(
        rule_id=rule_id,
        version=rule.version,
        state=RuleState.PASS,
        title=rule.title,
        category=rule.category,
        rule_type=rule.legal_strength.value,
        evidence=evidence,
        reason=f"Work location state matches MP's elected state '{work_state}'.",
        data_gaps=[],
        auditor_evidence_checklist=[]
    )

def evaluate_proh_001(row: Dict[str, Any]) -> RuleResult:
    """MPLADS23-PROH-001: Statutory Prohibited Works List Screening."""
    rule = registry.get_rule("MPLADS23-PROH-001")
    work_type = str(row.get("work_type") or "").lower()
    category = str(row.get("work_category") or "").lower()

    matched_keywords = [kw for kw in PROHIBITED_KEYWORDS if kw in work_type or kw in category]

    evidence = {
        "work_type": row.get("work_type"),
        "work_category": row.get("work_category"),
        "matched_keywords": matched_keywords
    }

    if matched_keywords:
        return RuleResult(
            rule_id="MPLADS23-PROH-001",
            version=rule.version,
            state=RuleState.REVIEW,
            title=rule.title,
            category=rule.category,
            rule_type=rule.legal_strength.value,
            evidence=evidence,
            reason=(
                f"Work description matches screening keywords ({', '.join(matched_keywords)}) "
                f"associated with Annexure-II prohibited categories (e.g. religious structures, statues, commercial assets). "
                f"Requires physical DPR verification to confirm whether permissible community exemption applies."
            ),
            data_gaps=["GRANULAR_GEOGRAPHIC_LOCATION_UNAVAILABLE"],
            auditor_evidence_checklist=[
                "Approved Detailed Project Report (DPR)",
                "District Authority Technical Feasibility and Land Use Certificate",
                "Site layout plan and beneficiary ownership verification"
            ]
        )
    else:
        return RuleResult(
            rule_id="MPLADS23-PROH-001",
            version=rule.version,
            state=RuleState.PASS,
            title=rule.title,
            category=rule.category,
            rule_type=rule.legal_strength.value,
            evidence=evidence,
            reason="Standard permissible work description; no Annexure-II screening keywords matched.",
            data_gaps=[],
            auditor_evidence_checklist=[]
        )

def evaluate_all_rules(row: Dict[str, Any], mp_allocation: Optional[Dict[str, Any]] = None) -> List[RuleResult]:
    """Evaluates all authoritative MPLADS 2023 rules against a work record."""
    results = [
        evaluate_jur_001_002(row, mp_allocation),
        evaluate_jur_003(row),
        evaluate_fin_001(row),
        evaluate_fin_002(row),
        evaluate_fin_003(row),
        evaluate_fin_004(row),
        evaluate_soc_001(row),
        evaluate_soc_untestable("MPLADS23-SOC-002", row),
        evaluate_soc_untestable("MPLADS23-SOC-003", row),
        evaluate_soc_untestable("MPLADS23-SOC-004", row),
        evaluate_soc_untestable("MPLADS23-SOC-005", row),
        evaluate_proh_001(row),
        # Untestable placeholders with explicit data gaps
        RuleResult(
            rule_id="MPLADS23-PROH-002",
            version="2.2.0",
            state=RuleState.UNKNOWN,
            title="Prohibition of Works on Private / Commercial Property",
            category="PROHIBITED_WORKS",
            rule_type=LegalStrength.MANDATORY_PROHIBITION.value,
            evidence={},
            reason="Land title and ownership certificates (NOC) are unavailable in database.",
            data_gaps=["LAND_OWNERSHIP_EVIDENCE_UNAVAILABLE"],
            auditor_evidence_checklist=["Land Title Deed / Revenue Record", "District Revenue Authority Land NOC"]
        ),
        RuleResult(
            rule_id="MPLADS23-TIME-001",
            version="2.2.0",
            state=RuleState.UNKNOWN,
            title="Administrative Sanction Decision Window (45 Days)",
            category="TIMELINES",
            rule_type=LegalStrength.MANDATORY_PROCEDURAL_REQUIREMENT.value,
            evidence={},
            reason="recommendation_date and sanction_date are unavailable in the portal dataset.",
            data_gaps=["SANCTION_RECOMMENDATION_DATES_UNAVAILABLE"],
            auditor_evidence_checklist=["MP Recommendation Letter with receipt date", "Signed Administrative Sanction Order"]
        ),
        RuleResult(
            rule_id="MPLADS23-MON-001",
            version="2.2.0",
            state=RuleState.REVIEW if str(row.get("work_status")).strip() == "Physical Inspection" else RuleState.UNKNOWN,
            title="District Authority 10% Physical Inspection Quota",
            category="MONITORING",
            rule_type=LegalStrength.MANDATORY_PROCEDURAL_REQUIREMENT.value,
            evidence={"work_status": row.get("work_status")},
            reason="Work marked under Physical Inspection stage; formal inspection logs and sample quotas require review.",
            data_gaps=["INSPECTION_LOG_UNAVAILABLE"],
            auditor_evidence_checklist=["District Planning Officer Physical Inspection Register", "Inspecting Officer Sign-off Sheet"]
        ),
        RuleResult(
            rule_id="MPLADS23-MON-003",
            version="2.2.0",
            state=RuleState.UNKNOWN,
            title="Mandatory Web Portal Photo Upload Verification",
            category="MONITORING",
            rule_type=LegalStrength.MANDATORY_PROCEDURAL_REQUIREMENT.value,
            evidence={},
            reason="Uploaded photographs and geo-tagged images are not stored in database.",
            data_gaps=["PHOTO_PLAQUE_EVIDENCE_UNAVAILABLE"],
            auditor_evidence_checklist=["MoSPI Mobile App Geo-tagged Photo Archive", "Physical Site Verification Photo"]
        ),
        RuleResult(
            rule_id="MPLADS23-ADV-001",
            version="2.2.0",
            state=RuleState.UNKNOWN,
            title="SC Inhabited Area Advisory Allocation (15%)",
            category="ADVISORY_TARGETS",
            rule_type=LegalStrength.ADVISORY.value,
            evidence={},
            reason="Village demographic census data is unavailable in database.",
            data_gaps=["SC_ST_CENSUS_MAPPING_UNAVAILABLE"],
            auditor_evidence_checklist=["Census Population Registry / District Planning SC Sub-Plan Dossier"]
        )
    ]
    return results
