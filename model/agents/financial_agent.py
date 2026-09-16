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
        'disbursement_without_sanction': 3,
        'disbursement_mismatch': 3,
        'negative_sanction': 3,
        'zero_sanction_with_payments': 3,
        'cost_outlier': 2,
        'over_utilization': 2,
    }

    def evaluate(self, df: pd.DataFrame) -> pd.DataFrame:
        disbursed = df.get('total_fund_disbursed', 0.0).fillna(0.0)
        sanction = df.get('sanction_amount', 0.0).fillna(0.0)
        status = df.get('work_status', '').astype(str).str.strip().str.lower()

        # Enforce mandatory INR 100 epsilon to eliminate IEEE-754 precision artifacts
        real_overrun = (disbursed > (sanction + 100.0)) & (sanction > 0)

        flags = self.flag_frame(
            df.index,
            disbursement_without_sanction=(status == 'pending for sanction') & (disbursed > 0),
            cost_outlier=(
                (df.get('peer_count', 0) >= CONFIG['min_cost_peer_count']) &
                (df.get('cost_mad_score', 0.0).abs() > CONFIG['cost_mad_threshold'])
            ),
            over_utilization=real_overrun,
            disbursement_mismatch=(
                df.get('disbursement_mismatch_ratio', 0.0) > CONFIG['disbursement_mismatch_pct']
            ),
            negative_sanction=sanction < 0,
            zero_sanction_with_payments=(sanction <= 0) & (disbursed > 0),
        )
        return self.evaluate_flags(flags, df.index)
