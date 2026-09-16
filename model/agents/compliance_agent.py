"""Allocation & Compliance Agent — does the work respect scheme rules?"""

import pandas as pd

from model.agents.base import BaseAgent
from model.agents.features import TRUST_SOCIETY_CATEGORIES


class ComplianceAgent(BaseAgent):
    key = 'compliance'
    title = 'Statutory & Policy Compliance Agent'
    description = (
        'Audits alignment with official MPLADS Guidelines 2023: parliamentary '
        'scope, single Trust/Society ceilings (INR 50 Lakh), and statutory allocation pre-conditions.'
    )
    weight = 0.15
    max_severity = 4.0

    FLAG_WEIGHTS = {
        'trust_single_cap_breach': 3,
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
        cat = df.get('work_category', pd.Series('', index=df.index)).astype(str)
        sanction = df.get('sanction_amount', pd.Series(0.0, index=df.index)).fillna(0.0)

        is_trust = cat.str.lower().str.contains('trust|society')
        single_cap_breach = is_trust & (sanction > 5000000.0)

        flags = self.flag_frame(
            df.index,
            trust_single_cap_breach=single_cap_breach,
            over_allocation=df.get('flag_over_allocation', pd.Series(False, index=df.index)),
            trust_society_routing=cat.isin(TRUST_SOCIETY_CATEGORIES),
            completed_without_image=completion.notna() & ~has_image,
        )
        return self.evaluate_flags(flags, df.index)

