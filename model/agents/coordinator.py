"""
AgentCoordinator — runs every specialist agent over the dataset and blends
their opinions into the unified risk score.

Scoring model (no pretrained ML artifacts, fully deterministic):

    likelihood     = Σ (agent_weight_i × agent_score_i)          ∈ [0, 1]
    impact         = percentile_rank(sanction_amount)            ∈ [0, 1]
    priority       = likelihood × (0.5 + 0.5 × impact)
    final_risk     = percentile_rank(priority) × 100

Risk tiers are portfolio-relative (the engine is a PRIORITIZATION tool):
top 10% of priority → 'High Risk - Review', next 20% → 'Medium Risk - Monitor',
rest → 'Low Risk'.
"""

import json

import numpy as np
import pandas as pd

from model.agents.features import build_features


# Ordered fallback for the recommended action directive — the first matching
# flag family wins, mirroring audit triage urgency.
ACTION_PRIORITY = [
    ({'impossible_timeline', 'negative_sanction', 'zero_sanction_with_payments'},
     'Immediate data/document verification'),
    ({'duplicate_across_mp'}, 'Ghost-work field verification'),
    ({'disbursement_mismatch', 'over_allocation', 'over_utilization', 'payment_after_completion'},
     'Financial reconciliation'),
    ({'duplicate_description'}, 'Duplicate-work verification'),
    ({'vendor_concentration', 'vendor_dominates_mp', 'vendor_multi_mp', 'missing_vendor'},
     'Vendor/procurement verification'),
    ({'cost_outlier'}, 'Cost estimate verification'),
    ({'stuck_status', 'stuck_payment'}, 'Status/payment follow-up'),
    ({'trust_society_routing'}, 'Compliance/document review'),
]


class AgentCoordinator:
    """Executes the agent pool and produces the unified scored dataset."""

    def __init__(self, agents):
        self.agents = list(agents)
        total_weight = sum(a.weight for a in self.agents) or 1.0
        self.weights = {a.key: a.weight / total_weight for a in self.agents}

    # ------------------------------------------------------------------ #
    def coordinate(self, df: pd.DataFrame, mp_allocations: dict = None) -> pd.DataFrame:
        work = build_features(df, mp_allocations=mp_allocations)

        # ---- run every specialist agent --------------------------------
        for agent in self.agents:
            opinion = agent.evaluate(work)
            work[opinion.columns] = opinion

        score_cols = [f'{a.key}_score' for a in self.agents if f'{a.key}_score' in work.columns]
        flag_cols = [f'{a.key}_flags' for a in self.agents if f'{a.key}_flags' in work.columns]

        # ---- consensus likelihood ---------------------------------------
        work['likelihood_score'] = sum(
            self.weights[a.key] * work[f'{a.key}_score']
            for a in self.agents if f'{a.key}_score' in work.columns
        ).clip(0, 1)

        # Combined evidence (backward-compatible with the old rule-flag API)
        work['rule_flags_triggered'] = [
            sorted(set().union(*row)) if len(row) else []
            for row in work[flag_cols].values
        ]
        work['rule_flag_count'] = work['rule_flags_triggered'].apply(len)
        work['weighted_rule_score'] = work['likelihood_score']

        # Agents that raised at least one signal → consensus anomaly marker
        work['agents_flagged'] = work[score_cols].gt(0).sum(axis=1)
        work['is_anomaly'] = work['agents_flagged'] >= 3
        work['anomaly_percentile'] = work[score_cols].max(axis=1).rank(pct=True, method='average')

        # ---- impact & priority ------------------------------------------
        work['impact_score'] = work['sanction_amount'].rank(pct=True, method='average').clip(0, 1)
        raw_priority = work['likelihood_score'] * (0.5 + 0.5 * work['impact_score'])

        work['final_risk_score'] = (raw_priority.rank(pct=True, method='average') * 100).round(1)
        work['priority_rank'] = raw_priority.rank(ascending=False, method='min').astype(int)

        # ---- portfolio-relative tiers ------------------------------------
        if len(work) > 10:
            high_threshold = work['likelihood_score'].quantile(0.90)
            medium_threshold = work['likelihood_score'].quantile(0.70)
        else:
            high_threshold, medium_threshold = 0.45, 0.25
        work['risk_tier'] = work['likelihood_score'].apply(
            lambda s: self._tier(s, high_threshold, medium_threshold))

        work['recommended_action'] = work['rule_flags_triggered'].apply(self._action)
        work['agent_breakdown'] = work.apply(self._breakdown_json, axis=1)

        # Drop internal helper columns so only scored, serializable data flows on
        return work.drop(columns=[c for c in work.columns if c.startswith('_')], errors='ignore')

    # ------------------------------------------------------------------ #
    @staticmethod
    def _tier(score, high, medium):
        if score >= high:
            return 'High Risk - Review'
        if score >= medium:
            return 'Medium Risk - Monitor'
        return 'Low Risk'

    @staticmethod
    def _action(flags):
        flag_set = set(flags or [])
        for family, action in ACTION_PRIORITY:
            if flag_set & family:
                return action
        return 'Routine monitoring'

    def _breakdown_json(self, row) -> str:
        breakdown = {
            'agents': [
                {
                    'key': a.key,
                    'title': a.title,
                    'weight': round(self.weights[a.key], 3),
                    'score': round(float(row.get(f'{a.key}_score', 0.0)), 3),
                    'flags': sorted(row.get(f'{a.key}_flags') or []),
                }
                for a in self.agents
            ],
        }
        return json.dumps(breakdown, ensure_ascii=False)
