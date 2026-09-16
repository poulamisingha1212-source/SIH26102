"""
MPLADS AI Sentinel — Risk Engine facade (prototype edition).

The engine is now a MULTI-AGENT system: five specialist agents each audit
the portfolio from one angle, and the AgentCoordinator blends their
opinions into the unified risk score. This module is the single source of
truth for scoring and case-packet generation; the agent implementations
live in model/agents/.

Legacy pretrained artifacts (XGBoost / Isolation Forest) are no longer
used — the agent system is deterministic, explainable, and dependency-free.
"""

import ast
import json

import pandas as pd

from model.agents import AGENTS, AGENT_DESCRIPTIONS, get_coordinator
from model.agents.features import CONFIG  # re-exported for backward compatibility

# ==============================================================================
# Flag explanations (shared by the priority queue and the case packet)
# ==============================================================================

RULE_DESCRIPTIONS = {
    'vendor_concentration': 'One vendor accounts for an unusually large share of paid works in the state.',
    'vendor_dominates_mp': "A single vendor handles most of this MP's paid works — favouritism risk.",
    'vendor_multi_mp': 'The same vendor bills works for several different MPs — organised capture risk.',
    'trust_society_routing': 'Work category (Trust & Society / Bar associations) requires enhanced compliance review.',
    'disbursement_mismatch': 'Completed amount and summed vendor payments do not reconcile within tolerance.',
    'cost_outlier': 'Sanctioned cost is a statistical outlier vs similar works in the same state and category.',
    'stuck_status': 'Work remains in an early workflow status well beyond the expected period.',
    'stuck_payment': 'In-progress payments have shown no movement for over 90 days.',
    'impossible_timeline': 'Completion date is recorded before the sanction date.',
    'rapid_completion': 'Work was marked completed within days of sanction — implausible delivery speed.',
    'payment_after_completion': 'Vendor payments continued well after the work was marked complete.',
    'duplicate_description': 'A near-identical work description appears in the same state and time window.',
    'duplicate_across_mp': 'Near-identical description submitted by a DIFFERENT MP — classic ghost-work signal.',
    'over_allocation': "MP's total sanctioned works exceed their allocated fund ceiling.",
    'missing_vendor': 'Vendor information is missing from expenditure records.',
    'over_utilization': 'Summed expenditure exceeds the sanctioned amount beyond tolerance.',
    'negative_sanction': 'Sanction amount is negative and requires immediate data verification.',
    'zero_sanction_with_payments': 'Vendor payments exist against a work with no/zero sanctioned cost.',
    'completed_without_image': 'Work marked complete but the portal shows no evidence attachment.',
}

RENAME_MAP = {
    'Record Type': 'record_type',
    'Source File': 'source_file',
    'Sr. No. (Source)': 'source_sr_no',
    'State': 'state',
    'Constituency': 'constituency',
    "Hon'ble Member of Parliament": 'mp_name',
    'IDA (Implementing Agency)': 'ida',
    'Work ID': 'work_id',
    'Work Category': 'work_category',
    'Work Type': 'work_type',
    'Work Description': 'work_description',
    'Recommended Date': 'recommended_date',
    'Sanction Date': 'sanction_date',
    'Completion Date': 'completion_date',
    'Expenditure Date': 'expenditure_date',
    'Consent Date': 'consent_date',
    'Recommended Amount (₹)': 'recommended_amount',
    'Sanction Amount (₹)': 'sanction_amount',
    'Amount Disbursed (₹)': 'amount_disbursed',
    'Fund Disbursed Amount (₹)': 'fund_disbursed_amount',
    'Consent Amount (₹)': 'consent_amount',
    'Allocated Amount (₹)': 'allocated_amount',
    'Work Status': 'work_status',
    'Payment Status': 'payment_status',
    'Vendor Name': 'vendor_name',
    'Calamity Type': 'calamity_type',
    'Calamity Name': 'calamity_name',
    'Image': 'image_marker',
}


# ==============================================================================
# Scoring pipeline
# ==============================================================================

def load_models(model_dir=None):
    """Stub function returning an empty dictionary for backward compatibility."""
    return {}


def score_dataset(df, model_dir=None, mp_allocations=None):
    """Score work-level records through the multi-agent risk system.

    `model_dir` is accepted for backward compatibility and ignored — the
    agent system needs no model artifacts.
    """
    work = df.copy()

    if 'Record Type' in work.columns:
        work = work.rename(columns=RENAME_MAP)
    if 'work_id' not in work.columns:
        raise ValueError("Dataset must contain 'work_id' column.")

    coordinator = get_coordinator()
    return coordinator.coordinate(work, mp_allocations=mp_allocations)


# ==============================================================================
# Case packet & API summaries
# ==============================================================================

def _flag_to_agent(flag: str):
    """Map a flag name to the specialist agent that owns it."""
    for agent in AGENTS:
        if flag in agent.FLAG_WEIGHTS:
            return agent.key
    return None


def _parse_flags(raw):
    if isinstance(raw, list):
        return list(raw)
    if isinstance(raw, str):
        try:
            parsed = ast.literal_eval(raw)
            if isinstance(parsed, list):
                return parsed
        except (ValueError, SyntaxError):
            pass
        return [f.strip() for f in raw.strip('[]').replace("'", "").split(',') if f.strip()]
    return []


def _agent_findings(row) -> list:
    """Per-agent findings for the case packet, ordered by weight then score."""
    breakdown = row.get('agent_breakdown')
    agents_payload = None
    if breakdown:
        try:
            parsed = json.loads(breakdown) if isinstance(breakdown, str) else breakdown
            agents_payload = parsed.get('agents') if isinstance(parsed, dict) else None
        except (TypeError, ValueError):
            agents_payload = None

    if agents_payload is None:
        # Legacy rows without a stored breakdown — rebuild from flags.
        flags = _parse_flags(row.get('rule_flags_triggered', []))
        agents_payload = [
            {
                'key': a.key,
                'title': a.title,
                'weight': a.weight,
                'score': 0.0,
                'flags': sorted(f for f in flags if _flag_to_agent(f) == a.key),
            }
            for a in AGENTS
        ]

    findings = []
    for entry in agents_payload:
        meta = AGENT_DESCRIPTIONS.get(entry.get('key'), {})
        flags = entry.get('flags', [])
        findings.append({
            'key': entry.get('key'),
            'title': entry.get('title') or meta.get('title', entry.get('key')),
            'description': meta.get('description', ''),
            'weight': float(entry.get('weight', 0.0)),
            'score': round(float(entry.get('score', 0.0)), 3),
            'flags': flags,
            'flag_notes': [RULE_DESCRIPTIONS.get(f, f"Flag triggered: {f}") for f in flags],
        })
    findings.sort(key=lambda f: (-f['score'], -f['weight']))
    return findings


def _parse_agent_count(row) -> int:
    """How many specialist agents raised at least one signal."""
    breakdown = row.get('agent_breakdown')
    if breakdown:
        try:
            parsed = json.loads(breakdown) if isinstance(breakdown, str) else breakdown
            agents = parsed.get('agents', []) if isinstance(parsed, dict) else []
            return sum(1 for a in agents if float(a.get('score', 0)) > 0)
        except (TypeError, ValueError):
            pass
    score_cols = [c for c in row.keys() if isinstance(c, str) and c.endswith('_score')
                  and c[:-6] in AGENT_DESCRIPTIONS]
    if score_cols:
        return sum(1 for c in score_cols if float(row.get(c) or 0) > 0)
    return 0


def generate_case_packet(work_id, work_row=None, df=None):
    """Generate the case packet dictionary for /works/{work_id}."""
    if work_row is None:
        if df is None:
            raise ValueError("Must provide either work_row or dataframe.")
        matches = df[df['work_id'].astype(str) == str(work_id)]
        if matches.empty:
            raise KeyError(f"Work ID not found: {work_id}")
        row = matches.iloc[0].to_dict()
    else:
        row = work_row if isinstance(work_row, dict) else work_row.to_dict()

    raw_flags = _parse_flags(row.get('rule_flags_triggered', []))
    causes = [RULE_DESCRIPTIONS.get(r, f"Flag triggered: {r}") for r in raw_flags]

    agents_flagged = _parse_agent_count(row)
    if agents_flagged:
        causes.append(
            f"Consensus anomaly: flagged by {agents_flagged} of {len(AGENTS)} specialist agents."
        )

    impact_pct = round(float(row.get('impact_score', 0.5)) * 100)

    return {
        'work_id': str(row.get('work_id')),
        'mp_name': row.get('mp_name'),
        'state': row.get('state'),
        'constituency': row.get('constituency'),
        'ida': row.get('ida'),
        'primary_vendor': row.get('primary_vendor'),
        'work_category': row.get('work_category'),
        'work_type': row.get('work_type'),
        'sanction_amount': float(row.get('sanction_amount', 0)),
        'total_fund_disbursed': float(row.get('total_fund_disbursed', 0)),
        'utilization_ratio': float(row.get('utilization_ratio', 0)),
        'work_status': row.get('work_status'),
        'completion_date': str(row.get('completion_date')) if pd.notna(row.get('completion_date')) else None,
        'final_risk_score': float(row.get('final_risk_score', 0)),
        'priority_rank': int(row.get('priority_rank', 0)),
        'risk_tier': row.get('risk_tier'),
        'recommended_action': row.get('recommended_action'),
        'rule_flag_count': int(row.get('rule_flag_count', len(raw_flags))),
        'rule_flags_triggered': raw_flags,
        'causes': causes if causes else ['No agent raised a signal; record prioritized for routine monitoring.'],
        'agent_findings': _agent_findings(row),
        'agents_flagged': agents_flagged,
        'agents_total': len(AGENTS),
        'impact_note': f"Sanctioned value is around the {impact_pct}th percentile of this portfolio.",
        'likelihood_score': float(row.get('likelihood_score', 0)),
        'impact_score': float(row.get('impact_score', 0)),
        'weighted_rule_score': float(row.get('weighted_rule_score', 0)),
        'anomaly_percentile': float(row.get('anomaly_percentile', 0)),
        'is_anomaly': bool(row.get('is_anomaly', False)),
        'human_review_outcome': row.get('human_review_outcome'),
    }


def get_work_risk_summary(work_id, df=None):
    packet = generate_case_packet(work_id, df=df)
    return {
        'work_id': packet['work_id'],
        'risk_score': packet['final_risk_score'],
        'tier': packet['risk_tier'],
        'priority_rank': packet['priority_rank'],
        'action': packet['recommended_action'],
        'flags': packet['rule_flags_triggered'],
        'causes': packet['causes'],
    }
