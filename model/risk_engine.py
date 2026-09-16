"""
MPLADS AI Sentinel — Risk Engine facade.

The engine is a MULTI-AGENT system: six specialist agents each audit
the portfolio from one angle, and the AgentCoordinator blends their
opinions into the unified risk score. This module is the single source of
truth for scoring and case-packet generation; the agent implementations
live in model/agents/.

Legacy pretrained artifacts (XGBoost / Isolation Forest) are no longer
used — the agent system is deterministic, explainable, and dependency-free.
"""

import ast
import json
from datetime import date

import pandas as pd

from model.agents import AGENTS, AGENT_DESCRIPTIONS, get_coordinator
from model.agents.features import CONFIG  # re-exported for backward compatibility

# ==============================================================================
# Flag explanations (static fallback — used only when row data is unavailable)
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
    'ida_budget_capture': 'Implementing agency holds a disproportionately large share of the state MPLADS budget.',
    'ida_vendor_monopoly': 'A single vendor accounts for nearly all paid works in this implementing agency.',
    'ida_mp_cluster': 'An unusually high number of different MPs route their works through the same implementing agency.',
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
# Currency formatter
# ==============================================================================

def _fmt_inr(amount) -> str:
    """Format an amount in Indian Rupees with Cr/L/K suffixes."""
    try:
        v = float(amount)
    except (TypeError, ValueError):
        return '₹—'
    if v >= 1e7:
        return f'₹{v / 1e7:.2f} Cr'
    if v >= 1e5:
        return f'₹{v / 1e5:.2f} L'
    if v >= 1e3:
        return f'₹{v / 1e3:.1f}K'
    return f'₹{v:,.0f}'


def _pct(numerator, denominator, decimals=1) -> str:
    try:
        n, d = float(numerator), float(denominator)
        if d == 0:
            return '—%'
        return f'{n / d * 100:.{decimals}f}%'
    except (TypeError, ValueError):
        return '—%'


def _days_label(days) -> str:
    try:
        d = int(days)
    except (TypeError, ValueError):
        return '— days'
    if d >= 365:
        return f'{d // 365}y {d % 365}d'
    return f'{d} day{"s" if d != 1 else ""}'


def _date_str(val) -> str:
    if val is None:
        return '—'
    try:
        if pd.isna(val):
            return '—'
    except Exception:
        pass
    try:
        return pd.Timestamp(val).strftime('%d %b %Y')
    except Exception:
        return str(val)


# ==============================================================================
# Quantitative Narrative Reason Generator
# ==============================================================================

def generate_narrative_reason(flag: str, row: dict) -> str:
    """Return a rich, data-grounded narrative for a single triggered flag.

    Every narrative includes actual numbers from `row` so auditors can
    immediately understand *why* this specific work was flagged, not just
    *that* it was flagged.
    """
    sanction    = float(row.get('sanction_amount') or 0)
    disbursed   = float(row.get('total_fund_disbursed') or 0)
    peer_median = row.get('peer_median')
    peer_count  = int(row.get('peer_count') or 0)
    mad_score   = float(row.get('cost_mad_score') or 0)
    state       = row.get('state') or '—'
    category    = row.get('work_category') or '—'
    vendor      = row.get('primary_vendor') or 'unknown vendor'
    ida         = row.get('ida') or '—'
    status      = row.get('work_status') or '—'
    mp          = row.get('mp_name') or '—'
    days_sanction = int(row.get('days_since_sanction') or 0)
    days_exp      = int(row.get('days_since_last_expenditure') or 0)
    comp_speed    = int(row.get('completion_speed_days') or 0)
    dup_count     = int(row.get('duplicate_match_count') or 1)
    sanction_date = _date_str(row.get('sanction_date'))
    completion_date = _date_str(row.get('completion_date'))
    vendor_state_pct  = float(row.get('vendor_share_in_state') or 0) * 100
    vendor_mp_pct     = float(row.get('vendor_share_per_mp') or 0) * 100
    vendor_mp_count   = int(row.get('vendor_mp_count') or 0)
    mismatch_ratio    = float(row.get('disbursement_mismatch_ratio') or 0) * 100
    utilization_ratio = float(row.get('utilization_ratio') or 0) * 100
    ida_budget_share  = float(row.get('ida_budget_share_in_state') or 0) * 100
    ida_vendor_conc   = float(row.get('ida_vendor_concentration') or 0) * 100
    ida_mp_count      = int(row.get('ida_mp_count') or 0)

    if flag == 'cost_outlier':
        if peer_median and float(peer_median) > 0 and peer_count > 0:
            multiple = sanction / float(peer_median)
            return (
                f"Sanctioned cost {_fmt_inr(sanction)} is {multiple:.1f}× the peer median "
                f"({_fmt_inr(peer_median)}) for '{category}' works in {state} "
                f"(based on {peer_count} comparable works). "
                f"Robust deviation score: {abs(mad_score):.1f}σ — "
                f"threshold is {CONFIG['cost_mad_threshold']:.1f}σ."
            )
        else:
            dev_str = f" (deviation score: {abs(mad_score):.1f}σ)" if mad_score else ""
            return (
                f"Sanctioned cost {_fmt_inr(sanction)} is a high-cost statistical outlier "
                f"for '{category}' works in {state}{dev_str}. "
                f"Threshold is {CONFIG['cost_mad_threshold']:.1f}σ."
            )

    if flag == 'disbursement_mismatch':
        amount_dis = float(row.get('amount_disbursed') or 0)
        diff = abs(amount_dis - disbursed)
        # Recompute ratio from raw amounts if stored ratio is zero but diff is real
        stored_ratio = float(row.get('disbursement_mismatch_ratio') or 0)
        pct = stored_ratio * 100 if stored_ratio > 0 else (diff / sanction * 100 if sanction > 0 else 0)
        return (
            f"Disbursement mismatch of {_fmt_inr(diff)} ({pct:.1f}%) "
            f"between recorded vendor payments ({_fmt_inr(amount_dis)}) "
            f"and total fund disbursed ({_fmt_inr(disbursed)}). "
            f"Tolerance is {CONFIG['disbursement_mismatch_pct'] * 100:.0f}%."
        )

    if flag == 'over_utilization':
        # Recompute excess directly from sanction/disbursed if stored ratio is 0
        excess = disbursed - sanction
        stored_ratio = float(row.get('utilization_ratio') or 0)
        pct = (stored_ratio - 1) * 100 if stored_ratio > 1 else (excess / sanction * 100 if sanction > 0 else 0)
        return (
            f"Expenditure {_fmt_inr(disbursed)} is "
            f"{_pct(excess, sanction)} ({_fmt_inr(excess)}) over "
            f"the sanctioned amount {_fmt_inr(sanction)}. "
            f"Permitted tolerance is 5%."
        )

    if flag == 'negative_sanction':
        return (
            f"Sanction amount recorded as {_fmt_inr(sanction)} (negative value). "
            f"This is a data integrity error requiring immediate portal correction."
        )

    if flag == 'zero_sanction_with_payments':
        return (
            f"Vendor payment of {_fmt_inr(disbursed)} exists against this work, "
            f"but the sanctioned amount is {_fmt_inr(sanction)} (zero / not set). "
            f"Payments without a valid sanction violate MPLADS guidelines."
        )

    if flag == 'impossible_timeline':
        gap = int(row.get('completion_speed_days') or 0)
        date_info = f" ({completion_date}) is recorded BEFORE the sanction date ({sanction_date})" if completion_date != '—' and sanction_date != '—' else ""
        gap_info = f" Temporal gap: {abs(gap)} days." if gap else ""
        return (
            f"Completion date{date_info} precedes the sanction date — a chronological impossibility.{gap_info}"
        )

    if flag == 'rapid_completion':
        speed_str = f"in {_days_label(comp_speed)}" if comp_speed > 0 else "within days"
        date_clause = f" (sanctioned {sanction_date})" if sanction_date != '—' else ""
        return (
            f"Work was marked completed {speed_str} of sanction{date_clause}. "
            f"Minimum plausible delivery window is {CONFIG['rapid_completion_days']} days."
        )

    if flag == 'stuck_status':
        if days_sanction > 0:
            date_clause = f" since sanction ({sanction_date})" if sanction_date != '—' else ""
            return (
                f"Work status '{status}' has remained unchanged for "
                f"{_days_label(days_sanction)}{date_clause}. "
                f"Overdue grace period is {CONFIG['overdue_grace_days']} days."
            )
        else:
            date_clause = f" (sanctioned {sanction_date})" if sanction_date != '—' else ""
            return (
                f"Work status '{status}' has remained stalled{date_clause} beyond "
                f"the allowable grace period of {CONFIG['overdue_grace_days']} days."
            )

    if flag == 'stuck_payment':
        exp_clause = f" for {_days_label(days_exp)}" if days_exp > 0 else ""
        return (
            f"Disbursed work ({_fmt_inr(disbursed)}) has had no payment activity{exp_clause}. "
            f"Stuck-payment threshold is {CONFIG['stuck_payment_days']} days."
        )

    if flag == 'payment_after_completion':
        days_after = int(row.get('days_payment_after_completion') or 0)
        return (
            f"Vendor payments continued {_days_label(days_after)} AFTER the work completion "
            f"date ({completion_date}). "
            f"Post-completion payment window is {CONFIG['post_completion_payment_days']} days."
        )

    if flag == 'duplicate_description':
        return (
            f"Work description matches {dup_count} other work(s) in {state} "
            f"submitted by the same MP within {CONFIG['duplicate_date_window_days']} days of sanction. "
            f"Similarity threshold: {CONFIG['duplicate_similarity_threshold']:.0%}."
        )

    if flag == 'duplicate_across_mp':
        return (
            f"Work description is nearly identical to works submitted by DIFFERENT MPs "
            f"in {state} within a {CONFIG['duplicate_cross_mp_window_days']}-day window — "
            f"a classic ghost-work or template-submission signal. "
            f"Similarity threshold: {CONFIG['duplicate_similarity_threshold']:.0%}."
        )

    if flag == 'vendor_concentration':
        pct_str = f" accounts for {vendor_state_pct:.1f}% of all paid works in {state}" if vendor_state_pct > 0 else f" accounts for an unusually high share of paid works in {state}"
        return (
            f"'{vendor}'{pct_str}. "
            f"Concentration threshold is {CONFIG['vendor_share_threshold'] * 100:.0f}%."
        )

    if flag == 'vendor_dominates_mp':
        pct_str = f" handles {vendor_mp_pct:.1f}% of this MP's ({mp}) paid works" if vendor_mp_pct > 0 else f" handles a dominant share of this MP's ({mp}) paid works"
        return (
            f"'{vendor}'{pct_str}. "
            f"Single-vendor dominance threshold per MP is {CONFIG['vendor_mp_share_threshold'] * 100:.0f}%."
        )

    if flag == 'vendor_multi_mp':
        cnt_str = f"across {vendor_mp_count} different MPs" if vendor_mp_count > 0 else "across multiple different MPs"
        return (
            f"'{vendor}' bills paid works {cnt_str} — "
            f"threshold for organised-capture risk is {CONFIG['vendor_multi_mp_threshold']} MPs."
        )

    if flag == 'missing_vendor':
        return (
            f"Vendor information is missing from expenditure records despite "
            f"{_fmt_inr(disbursed)} having been disbursed. "
            f"MPLADS mandates contractor attribution for all payments."
        )

    if flag == 'over_allocation':
        return (
            f"MP {mp}'s total sanctioned works in this portfolio exceed their allocated "
            f"MPLADS fund ceiling. Tolerance allowed: "
            f"{(CONFIG['over_allocation_tolerance'] - 1) * 100:.0f}%."
        )

    if flag == 'trust_society_routing':
        return (
            f"Work category '{category}' (Trust & Society / Bar Associations) requires "
            f"enhanced compliance documentation and MoSPI approval before disbursement."
        )

    if flag == 'completed_without_image':
        date_str = f" ({completion_date})" if completion_date != '—' else ""
        return (
            f"Work marked as completed{date_str} but no photographic "
            f"evidence attachment is recorded on the MPLADS portal. "
            f"Image upload is mandatory for work completion certification."
        )

    if flag == 'ida_budget_capture':
        share_str = f" holds {ida_budget_share:.1f}% of the state's total MPLADS sanctioned budget" if ida_budget_share > 0 else " holds a disproportionately high share of the state's total MPLADS sanctioned budget"
        return (
            f"Implementing agency '{ida}' in {state}{share_str}. "
            f"Capture threshold: {CONFIG['ida_budget_share_threshold'] * 100:.0f}%."
        )

    if flag == 'ida_vendor_monopoly':
        conc_str = f" accounts for {ida_vendor_conc:.1f}% of all paid works" if ida_vendor_conc > 0 else " accounts for the vast majority of paid works"
        return (
            f"'{vendor}'{conc_str} under implementing agency '{ida}'. "
            f"Monopoly threshold: {CONFIG['ida_vendor_concentration_threshold'] * 100:.0f}%."
        )

    if flag == 'ida_mp_cluster':
        cnt_str = f"is used by {ida_mp_count} different MPs" if ida_mp_count > 0 else "is used by multiple different MPs in a tight cluster"
        return (
            f"Implementing agency '{ida}' {cnt_str} — "
            f"an implausibly high clustering indicative of pre-arranged procurement. "
            f"Threshold: {CONFIG['ida_mp_cluster_threshold']} MPs."
        )

    # Fallback for any unknown future flag
    return RULE_DESCRIPTIONS.get(flag, f"Anomaly signal triggered: '{flag}'.")


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


def _agent_findings(row, work_row: dict) -> list:
    """Per-agent findings for the case packet, ordered by score then weight.

    Each finding includes quantitative narrative reasons built from the actual
    row data. When agent_breakdown is missing or stale (all scores = 0 but
    flags ARE present), scores are reconstructed from FLAG_WEIGHTS so the
    UI always shows correct per-agent attribution.
    """
    breakdown = row.get('agent_breakdown')
    agents_payload = None
    if breakdown:
        try:
            parsed = json.loads(breakdown) if isinstance(breakdown, str) else breakdown
            agents_payload = parsed.get('agents') if isinstance(parsed, dict) else None
        except (TypeError, ValueError):
            agents_payload = None

    all_flags = set(_parse_flags(row.get('rule_flags_triggered', [])))

    # If breakdown is missing, stale (all 0 scores), or missing new agents,
    # rebuild per-agent attribution from the stored rule_flags_triggered.
    breakdown_is_stale = (
        agents_payload is None
        or len(agents_payload) != len(AGENTS)
        or (all(float(a.get('score', 0)) == 0 for a in agents_payload) and len(all_flags) > 0)
    )

    if breakdown_is_stale:
        agents_payload = []
        for a in AGENTS:
            agent_flags = sorted(f for f in all_flags if f in a.FLAG_WEIGHTS)
            # Reconstruct score from flag weights
            if agent_flags and a.FLAG_WEIGHTS:
                denom = sum(a.FLAG_WEIGHTS.values()) or 1.0
                raw = sum(a.FLAG_WEIGHTS.get(f, 0) for f in agent_flags)
                score = min(raw / denom, 1.0)
            else:
                score = 0.0
            agents_payload.append({
                'key': a.key,
                'title': a.title,
                'weight': a.weight,
                'score': round(score, 3),
                'flags': agent_flags,
            })

    findings = []
    for entry in agents_payload:
        meta = AGENT_DESCRIPTIONS.get(entry.get('key'), {})
        flags = entry.get('flags', [])
        # Generate quantitative narratives for each triggered flag
        flag_narratives = [generate_narrative_reason(f, work_row) for f in flags]
        findings.append({
            'key': entry.get('key'),
            'title': entry.get('title') or meta.get('title', entry.get('key')),
            'description': meta.get('description', ''),
            'weight': float(entry.get('weight', 0.0)),
            'score': round(float(entry.get('score', 0.0)), 3),
            'flags': flags,
            'flag_notes': flag_narratives,   # quantitative narratives
        })
    findings.sort(key=lambda f: (-f['score'], -f['weight']))
    return findings


def _parse_agent_count(row) -> int:
    """How many specialist agents raised at least one signal."""
    findings = _agent_findings(row, row)
    return sum(1 for f in findings if f.get('score', 0) > 0 or len(f.get('flags', [])) > 0)


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

    # Build quantitative narrative causes from actual row data
    causes = [generate_narrative_reason(f, row) for f in raw_flags]

    agents_flagged = _parse_agent_count(row)
    if agents_flagged:
        causes.append(
            f"Multi-agent consensus: {agents_flagged} of {len(AGENTS)} specialist agents "
            f"independently raised signals on this work."
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
        'causes': causes if causes else ['No agent raised a signal; record prioritized for routine statistical monitoring.'],
        'agent_findings': _agent_findings(row, row),
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
