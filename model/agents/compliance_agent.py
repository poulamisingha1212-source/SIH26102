"""Allocation & Compliance Agent — does the work respect scheme rules?"""

import pandas as pd

from model.agents.base import BaseAgent
from model.agents.features import TRUST_SOCIETY_CATEGORIES


class ComplianceAgent(BaseAgent):
    key = 'compliance'
    title = 'Allocation & Compliance Agent'
    description = (
        'Checks scheme-level compliance: MPs whose sanctioned works exceed their '
        'allocated fund ceiling, trust/society categories that need enhanced '
        'review, and completed works without evidence attachments.'
    )
    weight = 0.15
    max_severity = 3.0

    FLAG_WEIGHTS = {
        'over_allocation': 3,
        'trust_society_routing': 2,
        'completed_without_image': 1,
    }

    def evaluate(self, df: pd.DataFrame) -> pd.DataFrame:
        completion = df.get('_completion_date', pd.Series(pd.NaT, index=df.index))
        has_image = (
            df.get('image_marker', pd.Series('', index=df.index))
            .astype(str).str.lower().isin(['true', 'yes', '1'])
        )

        flags = self.flag_frame(
            df.index,
            over_allocation=df.get('flag_over_allocation', pd.Series(False, index=df.index)),
            trust_society_routing=(
                df.get('work_category', pd.Series('', index=df.index)).isin(TRUST_SOCIETY_CATEGORIES)
            ),
            completed_without_image=completion.notna() & ~has_image,
        )
        return self.evaluate_flags(flags, df.index)
