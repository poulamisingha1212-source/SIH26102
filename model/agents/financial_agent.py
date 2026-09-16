"""Financial Anomaly Agent — is the money arithmetic itself suspicious?"""

import pandas as pd

from model.agents.base import BaseAgent
from model.agents.features import CONFIG


class FinancialAgent(BaseAgent):
    key = 'financial'
    title = 'Financial Anomaly Agent'
    description = (
        'Looks for money arithmetic that does not add up: costs far outside the '
        'state+category peer band, expenditure exceeding sanctions, disbursements '
        'that do not reconcile, and payments made without a sanctioned cost.'
    )
    weight = 0.25
    max_severity = 6.0  # sum of FLAG_WEIGHTS below

    FLAG_WEIGHTS = {
        'disbursement_mismatch': 3,
        'negative_sanction': 3,
        'zero_sanction_with_payments': 3,
        'cost_outlier': 2,
        'over_utilization': 2,
    }

    def evaluate(self, df: pd.DataFrame) -> pd.DataFrame:
        flags = self.flag_frame(
            df.index,
            cost_outlier=(
                (df.get('peer_count', 0) >= CONFIG['min_cost_peer_count']) &
                (df.get('cost_mad_score', 0.0).abs() > CONFIG['cost_mad_threshold'])
            ),
            over_utilization=df.get('utilization_ratio', 0.0) > 1.05,
            disbursement_mismatch=(
                df.get('disbursement_mismatch_ratio', 0.0) > CONFIG['disbursement_mismatch_pct']
            ),
            negative_sanction=df['sanction_amount'] < 0,
            zero_sanction_with_payments=(
                (df['sanction_amount'] <= 0) & (df['total_fund_disbursed'] > 0)
            ),
        )
        return self.evaluate_flags(flags, df.index)
