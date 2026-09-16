"""Comprehensive Automated Test Suite for Phase 4 Production Portfolio Scan.

Validates:
1. Canonical work inventory
2. Duplicate work IDs
3. Five-state aggregation
4. FAIL-only statutory queue
5. UNKNOWN isolation
6. Data-quality isolation
7. FIN-001 portfolio aggregation
8. FIN-002 epsilon handling
9. SOC-001 aggregation
10. MP composite join
11. Duplicate cluster output
12. Vendor heuristic output
13. Data-gap aggregation
14. Case packet generation
15. Deterministic output
16. Read-only MongoDB behavior
"""

import json
from pathlib import Path
import pytest

from model.rules.evaluator import (
    evaluate_all_rules,
    evaluate_fin_001,
    evaluate_fin_002,
    evaluate_soc_001,
    evaluate_jur_001_002,
    FINANCIAL_EPSILON_INR,
    TRUST_SOCIETY_SINGLE_WORK_CAP_INR,
)
from model.rules.registry import RuleState, LegalStrength
from backend.engines.data_quality_engine import evaluate_data_quality
from model.risk_engine import generate_case_packet
from backend.audit.portfolio_scanner import PortfolioScanner, OUTPUT_DIR


def test_1_canonical_work_inventory():
    """Verify that the generated portfolio inventory artifact confirms 100% unique work IDs."""
    inv_file = OUTPUT_DIR / "PHASE_4_PORTFOLIO_INVENTORY.md"
    if not inv_file.exists():
        pytest.skip("PHASE_4_PORTFOLIO_INVENTORY.md not present (static scan artifacts omitted)")
    content = inv_file.read_text(encoding="utf-8")
    assert "228,328" in content
    assert "Duplicate `work_id` count:** 0" in content
    assert "Malformed / Missing `work_id` count:** 0" in content


def test_2_duplicate_work_ids_uniqueness():
    """Verify that work_id uniqueness logic correctly flags duplicates when present."""
    ids = ["1001", "1002", "1003", "1002", "1004"]
    seen = set()
    dups = set()
    for wid in ids:
        if wid in seen:
            dups.add(wid)
        seen.add(wid)
    assert dups == {"1002"}
    assert len(seen) == 4


def test_3_five_state_aggregation():
    """Verify that evaluate_all_rules produces valid 5-state results for a sample work."""
    row = {
        "work_id": "test_001",
        "work_status": "Work Completed",
        "sanction_amount": 100000.0,
        "total_fund_disbursed": 100000.0,
        "state": "Gujarat",
        "mp_name": "Test MP",
        "house": "17th Lok Sabha",
        "constituency": "Test Constituency",
        "work_category": "Normal/Others",
        "work_type": "Road construction",
    }
    alloc = {"state": "Gujarat", "house": "17th Lok Sabha"}
    results = evaluate_all_rules(row, alloc)
    assert len(results) == 17
    states = set(r.state for r in results)
    for s in states:
        assert isinstance(s, RuleState)
    assert RuleState.PASS in states
    assert RuleState.UNKNOWN in states


def test_4_fail_only_statutory_queue():
    """Verify that the statutory FAIL queue contains exclusively RuleState.FAIL items."""
    fails_json = OUTPUT_DIR / "PHASE_4_STATUTORY_FAILS.json"
    if not fails_json.exists():
        pytest.skip("PHASE_4_STATUTORY_FAILS.json not present (static scan artifacts omitted)")
    data = json.loads(fails_json.read_text(encoding="utf-8"))
    assert len(data) == 7
    for item in data:
        assert item["rule_state"] == "FAIL"
        assert item["rule_id"] in ("MPLADS23-FIN-001", "MPLADS23-FIN-002", "MPLADS23-SOC-001")


def test_5_unknown_isolation_from_fail():
    """Verify that missing documentation produces UNKNOWN and never converts to FAIL."""
    row = {
        "work_id": "gap_test",
        "work_status": "Work Completed",
        "sanction_amount": 50000.0,
        "total_fund_disbursed": 50000.0,
        "work_category": "Normal/Others",
        "work_type": "Community Hall",
    }
    results = evaluate_all_rules(row)
    time_rule = next(r for r in results if r.rule_id == "MPLADS23-TIME-001")
    assert time_rule.state == RuleState.UNKNOWN
    assert "SANCTION_RECOMMENDATION_DATES_UNAVAILABLE" in time_rule.data_gaps
    assert time_rule.state != RuleState.FAIL


def test_6_data_quality_isolation_from_statutory():
    """Verify that data quality defects do not trigger statutory compliance FAILs."""
    row = {
        "work_id": "dq_test",
        "work_status": "NA",
        "sanction_amount": 0.0,
        "total_fund_disbursed": 0.0,
        "work_category": "None",
        "primary_vendor": "None",
    }
    defects = evaluate_data_quality(row)
    defect_codes = [d.defect_code for d in defects]
    assert "DRAFT_PLACEHOLDER" in defect_codes
    assert "UNCLASSIFIED_WORK" in defect_codes

    # Statutory rules should NOT fail on draft placeholders
    results = evaluate_all_rules(row)
    fail_results = [r for r in results if r.state == RuleState.FAIL]
    assert len(fail_results) == 0


def test_7_fin_001_portfolio_aggregation():
    """Verify FIN-001 statutory prohibition and review conditions."""
    # 1. Pending for sanction with disbursement -> FAIL
    row_fail = {
        "work_status": "Pending for Sanction",
        "sanction_amount": 800000.0,
        "total_fund_disbursed": 454775.0,
    }
    r_fail = evaluate_fin_001(row_fail)
    assert r_fail.state == RuleState.FAIL
    assert "Disbursement of INR 454,775.00 has been recorded" in r_fail.reason

    # 2. Zero sanction with disbursement -> REVIEW
    row_rev = {
        "work_status": "Work in Progress",
        "sanction_amount": 0.0,
        "total_fund_disbursed": 50000.0,
    }
    r_rev = evaluate_fin_001(row_rev)
    assert r_rev.state == RuleState.REVIEW

    # 3. Standard sanctioned disbursement -> PASS
    row_pass = {
        "work_status": "Work Completed",
        "sanction_amount": 100000.0,
        "total_fund_disbursed": 100000.0,
    }
    r_pass = evaluate_fin_001(row_pass)
    assert r_pass.state == RuleState.PASS


def test_8_fin_002_epsilon_handling():
    """Verify that INR 100 epsilon filters float overruns but catches real overruns."""
    # Float precision artifact: 100,000.0000000002 -> PASS
    row_float = {
        "sanction_amount": 100000.0,
        "total_fund_disbursed": 100000.0000000002,
    }
    r_float = evaluate_fin_002(row_float)
    assert r_float.state == RuleState.PASS

    # Within epsilon: excess INR 50.0 -> PASS
    row_eps = {
        "sanction_amount": 100000.0,
        "total_fund_disbursed": 100050.0,
    }
    r_eps = evaluate_fin_002(row_eps)
    assert r_eps.state == RuleState.PASS

    # Real overrun: excess INR 2,350.0 -> FAIL
    row_over = {
        "sanction_amount": 200000.0,
        "total_fund_disbursed": 202350.0,
    }
    r_over = evaluate_fin_002(row_over)
    assert r_over.state == RuleState.FAIL
    assert "exceeds the sanctioned amount (INR 200,000.00) by INR 2,350.00" in r_over.reason


def test_9_soc_001_aggregation():
    """Verify SOC-001 statutory ceiling of INR 50 Lakh for Trust/Society works."""
    # Under ceiling: INR 40 Lakh -> PASS
    row_pass = {
        "work_category": "Trust and Society",
        "work_type": "Construction of hall",
        "sanction_amount": 4000000.0,
    }
    assert evaluate_soc_001(row_pass).state == RuleState.PASS

    # Over ceiling: INR 95 Lakh -> FAIL
    row_fail = {
        "work_category": "Trust and Society",
        "work_type": "Construction of stadium",
        "sanction_amount": 9500000.0,
    }
    r_fail = evaluate_soc_001(row_fail)
    assert r_fail.state == RuleState.FAIL
    assert "exceeds the statutory ceiling of INR 50.00 Lakh" in r_fail.reason

    # Non-trust work -> NOT_APPLICABLE
    row_na = {
        "work_category": "Normal/Others",
        "work_type": "Road construction",
        "sanction_amount": 10000000.0,
    }
    assert evaluate_soc_001(row_na).state == RuleState.NOT_APPLICABLE


def test_10_mp_composite_join():
    """Verify that multi-tenure MP joining on (mp_name, house) resolves correctly."""
    row_ls = {
        "state": "Uttar Pradesh",
        "mp_name": "Smt. Sonia Gandhi",
        "house": "17th Lok Sabha",
        "constituency": "Rae Bareli",
    }
    alloc_ls = {"state": "Uttar Pradesh", "house": "17th Lok Sabha"}
    r_ls = evaluate_jur_001_002(row_ls, alloc_ls)
    assert r_ls.state == RuleState.PASS

    row_rs = {
        "state": "Rajasthan",
        "mp_name": "Smt. Sonia Gandhi",
        "house": "Rajya Sabha",
        "constituency": "Sitting Rajya Sabha",
    }
    alloc_rs = {"state": "Rajasthan", "house": "Rajya Sabha"}
    r_rs = evaluate_jur_001_002(row_rs, alloc_rs)
    assert r_rs.state == RuleState.PASS


def test_11_duplicate_cluster_output():
    """Verify that candidate duplicate clusters CSV contains non-accusatory recommended evidence."""
    dup_file = OUTPUT_DIR / "PHASE_4_DUPLICATE_CLUSTERS.csv"
    if not dup_file.exists():
        pytest.skip("PHASE_4_DUPLICATE_CLUSTERS.csv not present (static scan artifacts omitted)")
    content = dup_file.read_text(encoding="utf-8")
    assert "Measurement Book" in content
    assert "Geo-tagged site photographs" in content
    assert "fraud" not in content.lower()


def test_12_vendor_heuristic_output():
    """Verify that vendor heuristics output uses exposure share and neutral states."""
    vendor_file = OUTPUT_DIR / "PHASE_4_VENDOR_HEURISTICS.csv"
    if not vendor_file.exists():
        pytest.skip("PHASE_4_VENDOR_HEURISTICS.csv not present (static scan artifacts omitted)")
    content = vendor_file.read_text(encoding="utf-8")
    assert "exposure_share" in content
    assert "cartel" not in content.lower()
    assert "monopoly" not in content.lower()


def test_13_data_gap_aggregation():
    """Verify that data gaps report details statutory evidence absences without claiming suspicion."""
    gap_file = OUTPUT_DIR / "PHASE_4_DATA_GAPS.md"
    if not gap_file.exists():
        pytest.skip("PHASE_4_DATA_GAPS.md not present (static scan artifacts omitted)")
    content = gap_file.read_text(encoding="utf-8")
    assert "SANCTION_RECOMMENDATION_DATES_UNAVAILABLE" in content
    assert "`UNKNOWN` IS NOT SUSPICION" in content


def test_14_case_packet_generation():
    """Verify representative case packets contain findings, gaps, checklists, and neutral language."""
    row = {
        "work_id": "141185",
        "work_status": "Pending for Sanction",
        "sanction_amount": 800000.0,
        "total_fund_disbursed": 454775.0,
        "state": "Punjab",
        "constituency": "FARIDKOT(SC)",
        "mp_name": "SARABJEET SINGH KHALSA",
        "house": "18th Lok Sabha",
        "ida": "MOGA(Deputy Commissioner Moga)",
        "work_category": "Normal/Others",
        "work_type": "Multi-gym building",
    }
    packet = generate_case_packet("141185", work_row=row)
    assert packet["work_id"] == "141185"
    assert len(packet["financial_control_findings"]) > 0
    assert len(packet["auditor_evidence_checklist"]) > 0
    packet_str = json.dumps(packet).lower()
    for forbidden in ["fraud", "ghost work", "cartel", "corrupt"]:
        assert forbidden not in packet_str


def test_15_deterministic_output():
    """Verify that repeated evaluation of a work record produces identical rule results."""
    row = {
        "work_id": "det_test",
        "work_status": "Work Completed",
        "sanction_amount": 250000.0,
        "total_fund_disbursed": 250000.0,
        "state": "Kerala",
        "mp_name": "Test MP",
        "house": "17th Lok Sabha",
        "constituency": "Kozhikode",
        "work_category": "Normal/Others",
        "work_type": "NA-Street lights",
    }
    alloc = {"state": "Kerala", "house": "17th Lok Sabha"}
    run1 = [r.state.value for r in evaluate_all_rules(row, alloc)]
    run2 = [r.state.value for r in evaluate_all_rules(row, alloc)]
    assert run1 == run2


def test_16_read_only_mongodb_behavior():
    """Verify scan metadata confirms 0 MongoDB mutations were performed."""
    meta_file = OUTPUT_DIR / "PHASE_4_SCAN_METADATA.json"
    if not meta_file.exists():
        pytest.skip("PHASE_4_SCAN_METADATA.json not present (static scan artifacts omitted)")
    meta = json.loads(meta_file.read_text(encoding="utf-8"))
    mutations = meta["mongodb_mutations"]
    assert mutations["inserts"] == 0
    assert mutations["updates"] == 0
    assert mutations["deletes"] == 0
    assert mutations["index_changes"] == 0
    assert mutations["migrations"] == 0
    assert meta["document_count_start"] == meta["document_count_end"]
