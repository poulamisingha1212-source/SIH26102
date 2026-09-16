"""Comprehensive Phase 3 Test Suite for MPLADS Audit-Risk Engine.

Validates the five-state rule model, financial epsilon, statutory Trust ceilings,
composite MP tenure joins, data quality defect isolation, and evidence checklists.
"""

import pytest
import pandas as pd
from model.rules.evaluator import (
    evaluate_all_rules,
    evaluate_fin_001,
    evaluate_fin_002,
    evaluate_fin_003,
    evaluate_fin_004,
    evaluate_soc_001,
    evaluate_jur_001_002,
    evaluate_jur_003,
    evaluate_proh_001,
    FINANCIAL_EPSILON_INR,
    TRUST_SOCIETY_SINGLE_WORK_CAP_INR
)
from model.rules.registry import RuleState
from backend.engines.data_quality_engine import evaluate_data_quality
from model.risk_engine import generate_case_packet, score_dataset

# ==============================================================================
# 1. Financial Rules Validation (FIN-001 & FIN-002)
# ==============================================================================

def test_fin_001_pending_sanction_with_disbursement_fails():
    """Live Fixture work_id 141185: Pending for Sanction with disbursed funds must FAIL."""
    work = {
        "work_id": "141185",
        "work_status": "Pending for Sanction",
        "sanction_amount": 800000.0,
        "total_fund_disbursed": 454775.0,
        "mp_name": "SARABJEET SINGH KHALSA"
    }
    res = evaluate_fin_001(work)
    assert res.state == RuleState.FAIL
    assert "prohibit fund release prior to formal Administrative Sanction" in res.reason
    assert "Signed Administrative Sanction Order" in res.auditor_evidence_checklist

def test_fin_001_pending_sanction_without_disbursement_passes():
    """Normal pending work without funds released must PASS."""
    work = {
        "work_id": "99901",
        "work_status": "Pending for Sanction",
        "sanction_amount": 500000.0,
        "total_fund_disbursed": 0.0
    }
    res = evaluate_fin_001(work)
    assert res.state == RuleState.PASS

def test_fin_002_exact_equal_disbursement_passes():
    """Disbursement exactly matching sanction passes."""
    work = {
        "work_id": "99902",
        "sanction_amount": 1000000.0,
        "total_fund_disbursed": 1000000.0
    }
    res = evaluate_fin_002(work)
    assert res.state == RuleState.PASS

def test_fin_002_floating_point_epsilon_tolerance():
    """Small excesses <= INR 100 must be treated as numerical precision artifacts (PASS)."""
    # Exceeds by 1 paisa (0.01)
    work_1 = {"sanction_amount": 993123.35, "total_fund_disbursed": 993123.36}
    res_1 = evaluate_fin_002(work_1)
    assert res_1.state == RuleState.PASS
    assert "IEEE-754 precision artifact" in res_1.reason

    # Exceeds by exactly INR 100
    work_2 = {"sanction_amount": 1000000.0, "total_fund_disbursed": 1000100.0}
    res_2 = evaluate_fin_002(work_2)
    assert res_2.state == RuleState.PASS

def test_fin_002_real_overrun_fails():
    """Live Fixture work_id 114399: Disbursed exceeds sanction by INR 2,350 (FAIL)."""
    work = {
        "work_id": "114399",
        "sanction_amount": 200000.0,
        "total_fund_disbursed": 202350.0
    }
    res = evaluate_fin_002(work)
    assert res.state == RuleState.FAIL
    assert res.evidence["excess_inr"] == 2350.0
    assert any("Revised Administrative Sanction Order" in item for item in res.auditor_evidence_checklist)

def test_fin_003_and_004_return_unknown_with_data_gaps():
    """Annual cap and voucher reconciliation must return UNKNOWN with explicit gap IDs."""
    work = {"work_id": "99903", "sanction_amount": 60000000.0, "total_fund_disbursed": 50000000.0}
    r3 = evaluate_fin_003(work)
    assert r3.state == RuleState.UNKNOWN
    assert "CARRY_FORWARD_LEDGER_UNAVAILABLE" in r3.data_gaps

    r4 = evaluate_fin_004(work)
    assert r4.state == RuleState.UNKNOWN
    assert "FINANCIAL_VOUCHER_RECONCILIATION_UNAVAILABLE" in r4.data_gaps

# ==============================================================================
# 2. Trust & Society Statutory Ceilings (SOC-001)
# ==============================================================================

def test_soc_001_below_or_at_50_lakh_ceiling_passes():
    """Trust work at or below INR 50 Lakh passes."""
    work_pass = {
        "work_id": "99904",
        "work_category": "Trust and Society",
        "sanction_amount": 5000000.0
    }
    res = evaluate_soc_001(work_pass)
    assert res.state == RuleState.PASS

def test_soc_001_breach_fails_with_live_fixtures():
    """Live Fixtures: work_id 262075 (INR 95L) and 290981 (INR 75L) must FAIL."""
    w1 = {"work_id": "262075", "work_category": "Trust and Society", "sanction_amount": 9500000.0}
    r1 = evaluate_soc_001(w1)
    assert r1.state == RuleState.FAIL
    assert "exceeds the statutory ceiling of INR 50.00 Lakh" in r1.reason
    assert "NITI Aayog NGO Darpan Registration Certificate" in r1.auditor_evidence_checklist

    w2 = {"work_id": "290981", "work_category": "Trust and Society", "sanction_amount": 7500000.0}
    r2 = evaluate_soc_001(w2)
    assert r2.state == RuleState.FAIL

def test_soc_001_non_trust_is_not_applicable():
    """Non-trust works must return NOT_APPLICABLE even if sanction exceeds 50L."""
    work = {"work_id": "99905", "work_category": "Normal/Others", "sanction_amount": 8000000.0}
    res = evaluate_soc_001(work)
    assert res.state == RuleState.NOT_APPLICABLE

# ==============================================================================
# 3. Multi-Tenure MP Join & Jurisdiction (JUR-001, 002, 003)
# ==============================================================================

def test_multi_tenure_mp_composite_join():
    """Ensure MP with different houses and states does not get false jurisdiction flag."""
    mp_allocations = {
        ("Smt. Sonia Gandhi", "17th Lok Sabha"): 250000000.0,
        ("Smt. Sonia Gandhi", "Rajya Sabha"): 250000000.0,
    }
    df = pd.DataFrame([
        {
            "work_id": "w1",
            "mp_name": "Smt. Sonia Gandhi",
            "house": "17th Lok Sabha",
            "state": "Uttar Pradesh",
            "sanction_amount": 1000000.0,
            "total_fund_disbursed": 500000.0,
            "work_status": "Work Completed"
        },
        {
            "work_id": "w2",
            "mp_name": "Smt. Sonia Gandhi",
            "house": "Rajya Sabha",
            "state": "Rajasthan",
            "sanction_amount": 2000000.0,
            "total_fund_disbursed": 1000000.0,
            "work_status": "Work Completed"
        }
    ])
    scored = score_dataset(df, mp_allocations=mp_allocations)
    # Neither row should trigger over_allocation flag
    assert not scored["flag_over_allocation"].any()

def test_jur_003_nominated_mp_passes_pan_india():
    """Nominated MPs possess pan-India recommendation scope under Para 2.6."""
    work = {
        "work_id": "99906",
        "mp_name": "Smt. P. T. Usha",
        "house": "Rajya Sabha",
        "constituency": "Nominated Rajya Sabha",
        "state": "Kerala"
    }
    res = evaluate_jur_003(work)
    assert res.state == RuleState.PASS
    assert "pan-India recommendation scope" in res.reason

def test_jurisdiction_state_mismatch_generates_review_with_calamity_gap():
    """Cross-border recommendation generates REVIEW with calamity data gap."""
    work = {
        "work_id": "99907",
        "mp_name": "Shri Test MP",
        "house": "18th Lok Sabha",
        "constituency": "Constituency X",
        "state": "Bihar"
    }
    alloc = {"mp_name": "Shri Test MP", "state": "Maharashtra", "house": "18th Lok Sabha"}
    res = evaluate_jur_001_002(work, mp_allocation=alloc)
    assert res.state == RuleState.REVIEW
    assert "CALAMITY_DECLARATION_UNAVAILABLE" in res.data_gaps

# ==============================================================================
# 4. Prohibited Works Screening (PROH-001)
# ==============================================================================

def test_proh_001_screening_generates_review_not_fail():
    """Keywords associated with prohibited categories produce REVIEW, not automatic FAIL."""
    work = {
        "work_id": "99908",
        "work_type": "Construction of memorial statue near public park",
        "work_category": "Normal/Others"
    }
    res = evaluate_proh_001(work)
    assert res.state == RuleState.REVIEW
    assert "Approved Detailed Project Report (DPR)" in res.auditor_evidence_checklist

def test_proh_001_standard_work_passes():
    """Standard infrastructure work passes screening."""
    work = {
        "work_id": "99909",
        "work_type": "Construction of road with drainage system",
        "work_category": "Normal/Others"
    }
    res = evaluate_proh_001(work)
    assert res.state == RuleState.PASS

# ==============================================================================
# 5. Data Quality Engine Isolation
# ==============================================================================

def test_data_quality_isolation():
    """Data quality defects are identified cleanly without affecting statutory rule evaluation."""
    work = {
        "work_id": "99910",
        "sanction_amount": 0.0,
        "total_fund_disbursed": 0.0,
        "work_status": "NA",
        "work_category": "",
        "primary_vendor": ""
    }
    defects = evaluate_data_quality(work)
    defect_codes = [d.defect_code for d in defects]
    assert "DRAFT_PLACEHOLDER" in defect_codes
    assert "UNCLASSIFIED_WORK" in defect_codes

# ==============================================================================
# 6. Case Packet Comprehensive Integration
# ==============================================================================

def test_generate_case_packet_phase_3_structure():
    """Verify generate_case_packet returns all Phase 3 categorized findings and checklists."""
    work = {
        "work_id": "141185",
        "mp_name": "SARABJEET SINGH KHALSA",
        "state": "Punjab",
        "constituency": "Faridkot",
        "house": "18th Lok Sabha",
        "ida": "FARIDKOT_IDA",
        "primary_vendor": "XYZ Builders",
        "work_category": "Normal/Others",
        "work_type": "Construction of buildings for multi-gym",
        "sanction_amount": 800000.0,
        "total_fund_disbursed": 454775.0,
        "utilization_ratio": 0.568,
        "work_status": "Pending for Sanction",
        "completion_date": None,
        "final_risk_score": 75.0,
        "priority_rank": 10,
        "risk_tier": "High Risk - Review",
        "rule_flags_triggered": ["disbursement_without_sanction"]
    }
    packet = generate_case_packet("141185", work_row=work)

    # Core backward compatibility
    assert packet["work_id"] == "141185"
    assert packet["risk_tier"] == "High Risk - Review"
    assert len(packet["agent_findings"]) > 0

    # Phase 3 additions
    assert "compliance_findings" in packet
    assert "financial_control_findings" in packet
    assert "execution_anomalies" in packet
    assert "audit_heuristics" in packet
    assert "data_quality_findings" in packet
    assert "data_gaps" in packet
    assert "auditor_evidence_checklist" in packet
    assert "rule_results" in packet

    # Specific rule verification in case packet
    fin_rules = [r for r in packet["financial_control_findings"] if r["rule_id"] == "MPLADS23-FIN-001"]
    assert len(fin_rules) == 1
    assert fin_rules[0]["state"] == "FAIL"
    assert "Signed Administrative Sanction Order" in packet["auditor_evidence_checklist"]
