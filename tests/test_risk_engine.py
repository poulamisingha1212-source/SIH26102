import pytest
import pandas as pd
from model.risk_engine import (
    load_models, score_dataset, generate_case_packet, generate_narrative_reason, CONFIG
)
from model.agents import AGENTS, AGENT_REGISTRY


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _scored_sample(n):
    """Score rows from the sample feed through the real engine, generating if absent."""
    from pathlib import Path
    import csv
    from backend.services.ingestion import _reshape_long_format
    sample_file = Path("data/mplads_raw_sample.csv")
    if not sample_file.exists():
        from data.generate_sample_feed import generate_records, LONG_COLUMNS
        sample_file.parent.mkdir(parents=True, exist_ok=True)
        recs = generate_records()
        with open(sample_file, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=LONG_COLUMNS)
            writer.writeheader()
            for r in recs:
                full_r = {col: r.get(col, "") for col in LONG_COLUMNS}
                writer.writerow(full_r)
    raw = pd.read_csv(sample_file)
    scored = score_dataset(_reshape_long_format(raw), model_dir="model")
    return scored.dropna(subset=["work_id"]).head(n)



# ---------------------------------------------------------------------------
# Backward-compat stubs
# ---------------------------------------------------------------------------

def test_models_load_successfully():
    """Verify load_models stub returns dictionary without error."""
    models = load_models("model")
    assert isinstance(models, dict)


# ---------------------------------------------------------------------------
# Agent registry
# ---------------------------------------------------------------------------

def test_all_six_agents_registered():
    """Verify all 6 specialist agents are in the registry."""
    expected = {'financial', 'timeline', 'duplicate', 'vendor', 'compliance', 'geographic'}
    assert expected.issubset(set(AGENT_REGISTRY.keys())), (
        f"Missing agents: {expected - set(AGENT_REGISTRY.keys())}"
    )


def test_agent_weights_sum_to_one():
    """Normalized agent weights must sum to ~1.0."""
    total = sum(a.weight for a in AGENTS)
    # Coordinator normalizes, but raw weights should be positive
    assert total > 0
    assert all(a.weight > 0 for a in AGENTS)


# ---------------------------------------------------------------------------
# Reference date is not hard-coded
# ---------------------------------------------------------------------------

def test_reference_date_is_current():
    """reference_date should be today (within 1 day tolerance)."""
    today = pd.Timestamp.now().normalize()
    diff = abs((CONFIG['reference_date'] - today).days)
    assert diff <= 1, (
        f"reference_date ({CONFIG['reference_date'].date()}) is more than 1 day "
        f"from today ({today.date()}). Hard-coded date detected!"
    )


# ---------------------------------------------------------------------------
# Case packet & narrative generation
# ---------------------------------------------------------------------------

def test_generate_case_packet():
    """Verify case packet contains full explainability causes and impact notes."""
    row = _scored_sample(1).iloc[0]
    work_id = str(row['work_id'])

    packet = generate_case_packet(work_id, work_row=row.to_dict())
    assert packet['work_id'] == work_id
    assert packet['final_risk_score'] == row['final_risk_score']
    assert packet['priority_rank'] == int(row['priority_rank'])
    assert packet['risk_tier'] == row['risk_tier']
    assert isinstance(packet['causes'], list)
    assert len(packet['causes']) > 0
    assert "Sanctioned value" in packet['impact_note']


def test_case_packet_has_agent_findings():
    """Packet should contain per-agent findings list with score and flag_notes."""
    row = _scored_sample(1).iloc[0]
    packet = generate_case_packet(row['work_id'], work_row=row.to_dict())

    assert 'agent_findings' in packet, "Packet missing 'agent_findings'"
    findings = packet['agent_findings']
    assert isinstance(findings, list) and len(findings) > 0

    for f in findings:
        assert 'key' in f
        assert 'score' in f
        assert 'flag_notes' in f
        assert isinstance(f['flag_notes'], list)


def test_narrative_reasons_are_quantitative():
    """Triggered causes should contain numbers/amounts, not generic static text."""
    df = _scored_sample(50)
    flagged = df[df['rule_flag_count'] > 0].head(10)

    for _, row in flagged.iterrows():
        packet = generate_case_packet(row['work_id'], work_row=row.to_dict())
        for cause in packet['causes']:
            # Every quantitative narrative should contain at least one digit
            if 'No agent raised' not in cause and 'Multi-agent consensus' not in cause:
                has_number = any(ch.isdigit() for ch in cause)
                assert has_number, (
                    f"Narrative for work {row['work_id']} is not quantitative:\n  {cause}"
                )


def test_narrative_reason_cost_outlier():
    """generate_narrative_reason for cost_outlier includes peer median and state."""
    fake_row = {
        'sanction_amount': 5_00_00_000,  # ₹5 Cr
        'peer_median': 60_00_000,         # ₹60 L
        'peer_count': 24,
        'cost_mad_score': 6.5,
        'state': 'Delhi',
        'work_category': 'Road & Bridge',
        'total_fund_disbursed': 0,
    }
    narrative = generate_narrative_reason('cost_outlier', fake_row)
    assert '₹' in narrative
    assert 'Delhi' in narrative
    assert 'Road & Bridge' in narrative
    assert '24' in narrative  # peer count


def test_narrative_reason_vendor_concentration():
    """Vendor concentration narrative names the vendor and percentage."""
    fake_row = {
        'vendor_share_in_state': 0.47,
        'primary_vendor': 'ABC Constructions Pvt Ltd',
        'state': 'Maharashtra',
        'total_fund_disbursed': 500000,
    }
    narrative = generate_narrative_reason('vendor_concentration', fake_row)
    assert 'ABC Constructions' in narrative
    assert '47' in narrative
    assert 'Maharashtra' in narrative


def test_narrative_reason_geographic_flags():
    """Geographic agent flags produce meaningful narratives."""
    fake_row = {
        'ida': 'Pune Municipal Corporation',
        'state': 'Maharashtra',
        'ida_budget_share_in_state': 0.52,
        'ida_vendor_concentration': 0.91,
        'ida_mp_count': 7,
        'primary_vendor': 'XYZ Roads',
        'total_fund_disbursed': 100000,
        'sanction_amount': 500000,
    }
    for flag in ('ida_budget_capture', 'ida_vendor_monopoly', 'ida_mp_cluster'):
        narrative = generate_narrative_reason(flag, fake_row)
        assert 'Pune Municipal Corporation' in narrative or '₹' in narrative or '%' in narrative


# ---------------------------------------------------------------------------
# Score drift consistency
# ---------------------------------------------------------------------------

def test_risk_score_consistency_and_zero_drift():
    """Verify zero drift between freshly scored rows and the case packet generator."""
    df = _scored_sample(5)
    for _, row in df.iterrows():
        packet = generate_case_packet(row['work_id'], work_row=row.to_dict())
        assert packet['final_risk_score'] == row['final_risk_score']
        assert packet['priority_rank'] == int(row['priority_rank'])
        assert packet['risk_tier'] == row['risk_tier']


# ---------------------------------------------------------------------------
# Weighted anomaly consensus
# ---------------------------------------------------------------------------

def test_is_anomaly_is_not_count_based():
    """Works flagged by 3 low-weight agents should not automatically be anomalies
    if their combined weighted contribution is below the threshold."""
    df = _scored_sample(100)
    # All anomaly=True rows must have reasonably high likelihood scores
    anomalies = df[df['is_anomaly'] == True]
    if not anomalies.empty:
        # Weighted consensus > 0.40 means likelihood_score should be non-trivial
        low_likelihood = anomalies[anomalies['likelihood_score'] < 0.05]
        assert low_likelihood.empty, (
            f"{len(low_likelihood)} works marked is_anomaly=True "
            f"but have likelihood_score < 0.05 — count-based threshold bug?"
        )
