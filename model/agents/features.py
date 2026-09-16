"""
Shared feature engineering for the multi-agent risk system.

The coordinator runs build_features() ONCE over the work-level dataset;
every agent then reads the columns it needs. Keeping this in one place
guarantees all agents reason over identical evidence.
"""

import re

import numpy as np
import pandas as pd

CONFIG = {
    'cost_mad_threshold': 4.0,
    'min_cost_peer_count': 8,
    'vendor_share_threshold': 0.30,
    'vendor_mp_share_threshold': 0.60,
    'vendor_multi_mp_threshold': 3,
    'disbursement_mismatch_pct': 0.10,
    'overdue_grace_days': 180,
    'stuck_payment_days': 90,
    'rapid_completion_days': 15,
    'post_completion_payment_days': 30,
    'duplicate_similarity_threshold': 0.82,
    'duplicate_date_window_days': 90,
    'duplicate_cross_mp_window_days': 365,
    'over_allocation_tolerance': 1.05,
    'reference_date': pd.Timestamp('2026-09-06'),
}

TRUST_SOCIETY_CATEGORIES = ['Trust and Society', 'Bar and Associations']
STUCK_STATUSES = ['Physical Inspection', 'Vendor Identification', 'Time Estimation']


def normalize_description(text) -> str:
    text = '' if pd.isna(text) else str(text).lower()
    text = re.sub(r'[^a-z0-9]+', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()


def _token_set(text: str) -> frozenset:
    return frozenset(text.split())


def _detect_description_duplicates(df: pd.DataFrame) -> pd.DataFrame:
    """Pure-pandas near-duplicate detection (token Jaccard, blocked by state).

    Candidate pairs are pruned with rarest-token blocking: two descriptions
    with Jaccard >= threshold must share their rarest content token, so each
    row is only compared against the posting list of its rarest token. That
    keeps the pass near-linear on full-portal datasets.

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
        rows = {
            idx: (_token_set(desc), mp, date)
            for idx, desc, mp, date in zip(
                group.index,
                group['normalized_description'],
                group.get('mp_name', pd.Series('', index=group.index)),
                pd.to_datetime(group.get('sanction_date'), errors='coerce'),
            )
        }
        # Inverted index: token -> row ids, used to pick each row's rarest token.
        postings = {}
        for idx, (toks, _, _) in rows.items():
            for tok in toks:
                postings.setdefault(tok, []).append(idx)

        def _rarest_tokens(toks, k=3):
            """The k rarest tokens that actually have candidate partners."""
            ranked = sorted(
                (tok for tok in toks if len(postings[tok]) >= 2),
                key=lambda tok: len(postings[tok]),
            )
            return ranked[:k]

        seen_pairs = set()
        for idx_i, (toks_i, mp_i, date_i) in rows.items():
            for block_tok in _rarest_tokens(toks_i):
                for idx_j in postings[block_tok]:
                    if idx_j <= idx_i or (idx_i, idx_j) in seen_pairs:
                        continue
                    seen_pairs.add((idx_i, idx_j))
                    toks_j, mp_j, date_j = rows[idx_j]

                    union = len(toks_i | toks_j)
                    if not union:
                        continue
                    similarity = len(toks_i & toks_j) / union
                    if similarity < threshold:
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

    sanction_date = pd.to_datetime(
        work['sanction_date'] if 'sanction_date' in work.columns
        else pd.Series(pd.NaT, index=work.index), errors='coerce')
    completion_date = pd.to_datetime(
        work['completion_date'] if 'completion_date' in work.columns
        else pd.Series(pd.NaT, index=work.index), errors='coerce')
    last_exp_date = pd.to_datetime(
        work['last_expenditure_date'] if 'last_expenditure_date' in work.columns
        else pd.Series(pd.NaT, index=work.index), errors='coerce')

    work['days_since_sanction'] = (
        (CONFIG['reference_date'] - sanction_date).dt.days.clip(lower=0).fillna(0)
    )
    work['completion_speed_days'] = (
        (completion_date - sanction_date).dt.days.clip(lower=0).fillna(0)
    )
    work['days_since_last_expenditure'] = (
        (CONFIG['reference_date'] - last_exp_date).dt.days.fillna(0)
    )
    work['days_payment_after_completion'] = (
        (last_exp_date - completion_date).dt.days.fillna(0)
    )
    work['_sanction_date'] = sanction_date
    work['_completion_date'] = completion_date
    work['_last_expenditure_date'] = last_exp_date

    # --- statistical cost outliers (robust MAD vs state+category peers) ----
    work['cost_mad_score'] = 0.0
    work['peer_count'] = 0
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

    # --- duplicates (pure pandas, no ML) ------------------------------------
    work = _detect_description_duplicates(work)

    # --- MP allocation ceiling ----------------------------------------------
    work['flag_over_allocation'] = False
    if mp_allocations and 'mp_name' in work.columns:
        sanctioned_per_mp = work.groupby('mp_name')['sanction_amount'].sum()
        over = {
            mp for mp, total in sanctioned_per_mp.items()
            if mp in mp_allocations
            and total > float(mp_allocations[mp]) * CONFIG['over_allocation_tolerance']
        }
        work['flag_over_allocation'] = work['mp_name'].isin(over)

    return work
