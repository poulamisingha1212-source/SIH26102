import pytest
import pandas as pd
from pathlib import Path
from model.risk_engine import load_models, score_dataset, generate_case_packet, CONFIG

def test_models_load_successfully():
    """Verify load_models stub returns dictionary without error."""
    models = load_models("model")
    assert isinstance(models, dict)

def _scored_sample(n):
    """Score rows from the bundled sample feed through the real engine — the
    baseline export was removed; the live portal pipeline is the only source."""
    from backend.services.ingestion import _reshape_long_format
    raw = pd.read_csv("data/mplads_raw_sample.csv")
    scored = score_dataset(_reshape_long_format(raw), model_dir="model")
    return scored.dropna(subset=["work_id"]).head(n)


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

def test_risk_score_consistency_and_zero_drift():
    """Verify zero drift between freshly scored rows and the case packet generator."""
    df = _scored_sample(5)
    for _, row in df.iterrows():
        packet = generate_case_packet(row['work_id'], work_row=row.to_dict())
        assert packet['final_risk_score'] == row['final_risk_score']
        assert packet['priority_rank'] == int(row['priority_rank'])
        assert packet['risk_tier'] == row['risk_tier']
