"""
Shared feature engineering for the multi-agent risk system.

The coordinator runs build_features() ONCE over the work-level dataset;
every agent then reads the columns it needs. Keeping this in one place
guarantees all agents reason over identical evidence.
"""

import logging
import re

import numpy as np
import pandas as pd

from model._config import get_config

logger = logging.getLogger(__name__)

_cfg = get_config()
_feat = _cfg.get('features', {})

CONFIG = {
    'cost_mad_threshold':              _feat.get('cost_mad_threshold', 4.0),
    'min_cost_peer_count':             _feat.get('min_cost_peer_count', 8),
    'vendor_share_threshold':          _feat.get('vendor_share_threshold', 0.30),
    'vendor_mp_share_threshold':       _feat.get('vendor_mp_share_threshold', 0.60),
    'vendor_multi_mp_threshold':       _feat.get('vendor_multi_mp_threshold', 3),
    'disbursement_mismatch_pct':       _feat.get('disbursement_mismatch_pct', 0.10),
    'overdue_grace_days':              _feat.get('overdue_grace_days', 180),
    'stuck_payment_days':              _feat.get('stuck_payment_days', 90),
    'rapid_completion_days':           _feat.get('rapid_completion_days', 15),
    'post_completion_payment_days':    _feat.get('post_completion_payment_days', 30),
    'duplicate_similarity_threshold':  _feat.get('duplicate_similarity_threshold', 0.72),
    'duplicate_date_window_days':      _feat.get('duplicate_date_window_days', 90),
    'duplicate_cross_mp_window_days':  _feat.get('duplicate_cross_mp_window_days', 365),
    'duplicate_ngram_size':            _feat.get('duplicate_ngram_size', 2),
    'over_allocation_tolerance':       _feat.get('over_allocation_tolerance', 1.05),
    'ida_budget_share_threshold':      _feat.get('ida_budget_share_threshold', 0.40),
    'ida_vendor_concentration_threshold': _feat.get('ida_vendor_concentration_threshold', 0.80),
    'ida_mp_cluster_threshold':        _feat.get('ida_mp_cluster_threshold', 4),
    # reference_date is always computed at runtime — never hard-coded
    'reference_date': pd.Timestamp.now().normalize(),
}

TRUST_SOCIETY_CATEGORIES = ['Trust and Society', 'Bar and Associations']
STUCK_STATUSES = ['Physical Inspection', 'Vendor Identification', 'Time Estimation']


# ─────────────────────────────────────────────────────────────────────────────
# Text utilities
# ─────────────────────────────────────────────────────────────────────────────

def normalize_description(text) -> str:
    text = '' if pd.isna(text) else str(text).lower()
    text = re.sub(r'[^a-z0-9]+', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()


def _token_set(text: str) -> frozenset:
    return frozenset(text.split())


def _bigrams(text: str) -> frozenset:
    """Character-level bigrams for supplemental similarity."""
    tokens = text.split()
    if len(tokens) < 2:
        return frozenset()
    return frozenset(f"{a} {b}" for a, b in zip(tokens, tokens[1:]))


def _similarity(toks_i: frozenset, toks_j: frozenset,
                bi_i: frozenset, bi_j: frozenset) -> float:
    """Combined Jaccard over tokens + bigrams, equal-weighted."""
    tok_union = len(toks_i | toks_j)
    tok_score = len(toks_i & toks_j) / tok_union if tok_union else 0.0

    bi_union = len(bi_i | bi_j)
    bi_score = len(bi_i & bi_j) / bi_union if bi_union else 0.0

    return 0.6 * tok_score + 0.4 * bi_score


# ─────────────────────────────────────────────────────────────────────────────
# Duplicate detection (token Jaccard + bigram, blocked by state)
# ─────────────────────────────────────────────────────────────────────────────

def _detect_description_duplicates(df: pd.DataFrame) -> pd.DataFrame:
    """Near-duplicate detection (token Jaccard + bigram blend, blocked by state).

    - flag_duplicate_description: near-identical description, same state,
      sanction dates within the look-back window.
    - flag_duplicate_across_mp:   near-identical description submitted by a
      DIFFERENT MP in the same state (ghost-work signal).
    """
    df['flag_duplicate_description'] = False
    df['flag_duplicate_across_mp'] = False
    df['duplicate_match_count'] = 0

    if 'work_description' not in df.columns:
        return df

    df['normalized_description'] = df['work_description'].map(normalize_description)
    threshold = CONFIG['duplicate_similarity_threshold']

    for _, group in df[df['normalized_description'].str.len() > 0].groupby('state'):
        rows = {}
        for idx, desc, mp, date in zip(
            group.index,
            group['normalized_description'],
            group.get('mp_name', pd.Series('', index=group.index)),
            pd.to_datetime(group.get('sanction_date'), errors='coerce'),
        ):
            toks = _token_set(desc)
            bis  = _bigrams(desc)
            rows[idx] = (toks, bis, mp, date)

        # Inverted index on unigrams for pruning
        postings: dict = {}
        for idx, (toks, _, _, _) in rows.items():
            for tok in toks:
                postings.setdefault(tok, []).append(idx)

        def _rarest_tokens(toks, k=3):
            ranked = sorted(
                (tok for tok in toks if len(postings.get(tok, [])) >= 2),
                key=lambda tok: len(postings[tok]),
            )
            return ranked[:k]

        seen_pairs: set = set()
        for idx_i, (toks_i, bi_i, mp_i, date_i) in rows.items():
            for block_tok in _rarest_tokens(toks_i):
                for idx_j in postings.get(block_tok, []):
                    if idx_j <= idx_i or (idx_i, idx_j) in seen_pairs:
                        continue
                    seen_pairs.add((idx_i, idx_j))
                    toks_j, bi_j, mp_j, date_j = rows[idx_j]

                    sim = _similarity(toks_i, toks_j, bi_i, bi_j)
                    if sim < threshold:
                        continue

                    cross_mp = str(mp_i) != str(mp_j)
                    if pd.notna(date_i) and pd.notna(date_j):
                        gap = abs((date_i - date_j).days)
                        window = (CONFIG['duplicate_cross_mp_window_days'] if cross_mp
                                  else CONFIG['duplicate_date_window_days'])
                        if gap > window:
                            continue

                    if cross_mp:
                        df.loc[idx_i, 'flag_duplicate_across_mp'] = True
                        df.loc[idx_j, 'flag_duplicate_across_mp'] = True
                    else:
                        df.loc[idx_i, 'flag_duplicate_description'] = True
                        df.loc[idx_j, 'flag_duplicate_description'] = True
                        df.loc[idx_i, 'duplicate_match_count'] += 1
                        df.loc[idx_j, 'duplicate_match_count'] += 1
    return df


# ─────────────────────────────────────────────────────────────────────────────
# IDA / geographic feature computation
# ─────────────────────────────────────────────────────────────────────────────

def _build_ida_features(work: pd.DataFrame) -> pd.DataFrame:
    """Compute IDA-level concentration features for the Geographic Agent."""
    work['ida_budget_share_in_state'] = 0.0
    work['ida_vendor_concentration'] = 0.0
    work['ida_mp_count'] = 0

    if 'ida' not in work.columns:
        work['ida'] = None
        return work

    paid = work[work['total_fund_disbursed'] > 0]

    # IDA budget share: fraction of state's MPLADS sanctioned budget going to this IDA
    if not paid.empty and 'state' in work.columns:
        state_totals = work.groupby('state')['sanction_amount'].sum()
        ida_state_totals = work.groupby(['state', 'ida'])['sanction_amount'].sum()
        for (state, ida), ida_total in ida_state_totals.items():
            st_total = state_totals.get(state, 0)
            if st_total > 0:
                share = ida_total / st_total
                mask = (work['state'] == state) & (work['ida'] == ida)
                work.loc[mask, 'ida_budget_share_in_state'] = share

    # IDA vendor concentration: single vendor dominance within IDA's paid works
    if not paid.empty and 'primary_vendor' in paid.columns:
        paid_valid = paid.dropna(subset=['ida', 'primary_vendor'])
        paid_valid = paid_valid[paid_valid['primary_vendor'].astype(str).str.strip() != '']
        if not paid_valid.empty:
            ida_totals = paid_valid.groupby('ida').size()
            ida_vendor_counts = paid_valid.groupby(['ida', 'primary_vendor']).size()
            for (ida, vendor), cnt in ida_vendor_counts.items():
                total = ida_totals.get(ida, 0)
                if total > 0:
                    share = cnt / total
                    mask = (work['ida'] == ida) & (work['primary_vendor'] == vendor)
                    work.loc[mask, 'ida_vendor_concentration'] = share

    # IDA MP count: how many distinct MPs route works through this IDA
    if 'mp_name' in work.columns:
        ida_mp_count = work.groupby('ida')['mp_name'].nunique()
        work['ida_mp_count'] = work['ida'].map(ida_mp_count).fillna(0).astype(int)

    return work


# ─────────────────────────────────────────────────────────────────────────────
# Main feature builder
# ─────────────────────────────────────────────────────────────────────────────

def build_features(df: pd.DataFrame, mp_allocations: dict = None) -> pd.DataFrame:
    """Compute every derived column the agents rely on.

    mp_allocations: optional {mp_name: allocated_amount} map enabling the
    MP over-allocation ceiling check.
    """
    work = df.copy()

    # --- numeric backbone -------------------------------------------------
    for col in ['sanction_amount', 'amount_disbursed', 'total_fund_disbursed',
                'fund_disbursed_amount', 'recommended_amount', 'allocated_amount']:
        if col in work.columns:
            work[col] = pd.to_numeric(work[col], errors='coerce').fillna(0)
    if 'sanction_amount' not in work.columns:
        work['sanction_amount'] = 0.0
    if 'total_fund_disbursed' not in work.columns:
        work['total_fund_disbursed'] = 0.0

    # --- ratios & timelines ------------------------------------------------
    work['utilization_ratio'] = (
        work['total_fund_disbursed'] / work['sanction_amount'].replace(0, np.nan)
    ).fillna(0)

    if 'disbursement_mismatch_ratio' not in work.columns:
        if 'amount_disbursed' in work.columns:
            work['disbursement_mismatch_ratio'] = (
                (work['amount_disbursed'] - work['total_fund_disbursed']).abs() /
                work['sanction_amount'].replace(0, np.nan)
            ).fillna(0)
        else:
            work['disbursement_mismatch_ratio'] = 0.0

    ref_date = CONFIG['reference_date']

    sanction_date = pd.to_datetime(
        work['sanction_date'] if 'sanction_date' in work.columns
        else pd.Series(pd.NaT, index=work.index), errors='coerce')
    completion_date = pd.to_datetime(
        work['completion_date'] if 'completion_date' in work.columns
        else pd.Series(pd.NaT, index=work.index), errors='coerce')

    # last_expenditure_date: guard against missing column
    has_exp_date = 'last_expenditure_date' in work.columns
    if not has_exp_date:
        logger.warning(
            "build_features: 'last_expenditure_date' column not found in dataset. "
            "stuck_payment and payment_after_completion flags will be suppressed. "
            "Ensure the ingestion pipeline joins expenditure records correctly."
        )
    last_exp_date = pd.to_datetime(
        work['last_expenditure_date'] if has_exp_date
        else pd.Series(pd.NaT, index=work.index), errors='coerce')

    work['days_since_sanction'] = (
        (ref_date - sanction_date).dt.days.clip(lower=0).fillna(0)
    )
    work['completion_speed_days'] = (
        (completion_date - sanction_date).dt.days.clip(lower=0).fillna(0)
    )
    work['days_since_last_expenditure'] = (
        (ref_date - last_exp_date).dt.days.fillna(0)
    )
    work['days_payment_after_completion'] = (
        (last_exp_date - completion_date).dt.days.fillna(0)
    )
    # Store whether exp date is actually available (for use in timeline agent)
    work['_has_expenditure_date'] = has_exp_date and last_exp_date.notna().any()

    work['_sanction_date'] = sanction_date
    work['_completion_date'] = completion_date
    work['_last_expenditure_date'] = last_exp_date

    # --- statistical cost outliers (robust MAD vs state+category peers) ----
    work['cost_mad_score'] = 0.0
    work['peer_count'] = 0
    work['peer_median'] = np.nan
    for required in ('state', 'work_category'):
        if required not in work.columns:
            work[required] = None
    amount = work['sanction_amount']
    keyed = amount.notna() & work[['state', 'work_category']].notna().all(axis=1)
    for _, group in work[keyed].groupby(['state', 'work_category']):
        if len(group) < CONFIG['min_cost_peer_count']:
            continue
        med = amount.loc[group.index].median()
        mad = (amount.loc[group.index] - med).abs().median()
        if not mad or mad == 0:
            continue
        work.loc[group.index, 'cost_mad_score'] = 0.6745 * (amount.loc[group.index] - med) / mad
        work.loc[group.index, 'peer_count'] = len(group)
        work.loc[group.index, 'peer_median'] = med

    # --- vendor concentration ----------------------------------------------
    work['vendor_share_in_state'] = 0.0
    work['vendor_share_per_mp'] = 0.0
    work['vendor_mp_count'] = 0
    if 'primary_vendor' not in work.columns:
        work['primary_vendor'] = None
    paid = work[work['total_fund_disbursed'] > 0]
    vendors = paid['primary_vendor'].dropna()
    vendors = vendors[vendors.astype(str).str.strip() != '']
    paid = paid.loc[vendors.index]
    if not paid.empty:
        state_counts = paid.groupby(['state', 'primary_vendor']).size()
        state_totals = paid.groupby('state').size()
        share = (state_counts / state_totals).rename('share').reset_index()
        joined = paid[['state', 'primary_vendor']].merge(
            share, on=['state', 'primary_vendor'], how='left')
        work.loc[paid.index, 'vendor_share_in_state'] = joined['share'].fillna(0).values

        mp_counts = paid.groupby(['mp_name', 'primary_vendor']).size()
        mp_totals = paid.groupby('mp_name').size()
        share_mp = (mp_counts / mp_totals).rename('share').reset_index()
        joined_mp = paid[['mp_name', 'primary_vendor']].merge(
            share_mp, on=['mp_name', 'primary_vendor'], how='left')
        work.loc[paid.index, 'vendor_share_per_mp'] = joined_mp['share'].fillna(0).values

        vendor_mp = paid.groupby('primary_vendor')['mp_name'].nunique()
        work.loc[paid.index, 'vendor_mp_count'] = (
            paid['primary_vendor'].map(vendor_mp).fillna(0).values)

    # --- IDA / geographic features -----------------------------------------
    work = _build_ida_features(work)

    # --- duplicates (Jaccard + bigram, no ML) --------------------------------
    work = _detect_description_duplicates(work)

    # --- MP allocation ceiling (supports composite tenure join (mp_name, house)) ---
    work['flag_over_allocation'] = False
    if mp_allocations and 'mp_name' in work.columns:
        has_composite = any(isinstance(k, tuple) for k in mp_allocations.keys())
        if has_composite and 'house' in work.columns:
            sanctioned_grouped = work.groupby(['mp_name', 'house'])['sanction_amount'].sum()
            over_pairs = set()
            for (mp, house), total in sanctioned_grouped.items():
                alloc = mp_allocations.get((mp, house)) or mp_allocations.get(mp)
                if alloc and total > float(alloc) * CONFIG['over_allocation_tolerance']:
                    over_pairs.add((mp, house))
            if over_pairs:
                work['flag_over_allocation'] = [
                    (r['mp_name'], r.get('house')) in over_pairs
                    for _, r in work[['mp_name', 'house']].iterrows()
                ]
        else:
            sanctioned_per_mp = work.groupby('mp_name')['sanction_amount'].sum()
            over = {
                mp for mp, total in sanctioned_per_mp.items()
                if mp in mp_allocations
                and total > float(mp_allocations[mp]) * CONFIG['over_allocation_tolerance']
            }
            work['flag_over_allocation'] = work['mp_name'].isin(over)

    # --- Financial overrun with mandatory INR 100 epsilon tolerance ---
    disbursed = work.get('total_fund_disbursed', 0.0).fillna(0.0)
    sanction = work.get('sanction_amount', 0.0).fillna(0.0)
    work['flag_real_overrun'] = (disbursed > (sanction + 100.0)) & (sanction > 0)

    # --- Disbursement without administrative sanction (FIN-001) ---
    status_str = work.get('work_status', '').astype(str).str.strip().str.lower()
    work['flag_pending_with_disbursement'] = (status_str == 'pending for sanction') & (disbursed > 0)

    return work

