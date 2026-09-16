"""Timeline & Stagnation Agent — does the work's life-cycle make sense?"""

import pandas as pd

from model.agents.base import BaseAgent
from model.agents.features import CONFIG, STUCK_STATUSES


class TimelineAgent(BaseAgent):
    key = 'timeline'
    title = 'Timeline & Stagnation Agent'
    description = (
        'Scrutinizes the work life-cycle: completion recorded before sanction, '
        'implausibly fast delivery, works stuck in early workflow stages, payments '
        'that stall, and vendor billing that continues after completion.'
    )
    weight = 0.20
    max_severity = 4.0

    FLAG_WEIGHTS = {
        'impossible_timeline': 3,
        'rapid_completion': 2,
        'payment_after_completion': 2,
        'stuck_status': 1,
        'stuck_payment': 1,
    }

    def evaluate(self, df: pd.DataFrame) -> pd.DataFrame:
        completion = df.get('_completion_date', pd.Series(pd.NaT, index=df.index))
        sanction = df.get('_sanction_date', pd.Series(pd.NaT, index=df.index))
        last_exp = df.get('_last_expenditure_date', pd.Series(pd.NaT, index=df.index))
        disbursed = df.get('total_fund_disbursed', 0.0)

        flags = self.flag_frame(
            df.index,
            impossible_timeline=(
                completion.notna() & sanction.notna() & (completion < sanction)
            ),
            rapid_completion=(
                completion.notna() & sanction.notna() &
                ((completion - sanction).dt.days >= 0) &
                ((completion - sanction).dt.days < CONFIG['rapid_completion_days'])
            ),
            stuck_status=(
                df.get('work_status', pd.Series('', index=df.index)).isin(STUCK_STATUSES) &
                (df.get('days_since_sanction', 0.0) > CONFIG['overdue_grace_days'])
            ),
            stuck_payment=(
                (disbursed > 0) &
                df.get('_completion_date', pd.Series(pd.NaT, index=df.index)).isna() &
                (df.get('days_since_last_expenditure', 0.0) > CONFIG['stuck_payment_days'])
            ),
            payment_after_completion=(
                (disbursed > 0) & completion.notna() & last_exp.notna() &
                ((last_exp - completion).dt.days > CONFIG['post_completion_payment_days'])
            ),
        )
        return self.evaluate_flags(flags, df.index)
