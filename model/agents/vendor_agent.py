"""Vendor & Procurement Agent — is procurement concentrated or opaque?"""

import pandas as pd

from model.agents.base import BaseAgent
from model.agents.features import CONFIG


class VendorAgent(BaseAgent):
    key = 'vendor'
    title = 'Vendor & Procurement Agent'
    description = (
        'Watches the contractor landscape: single vendors dominating a state or an '
        'MP, the same vendor billing many MPs, and paid works with no vendor '
        'recorded at all.'
    )
    weight = 0.15
    max_severity = 3.0

    FLAG_WEIGHTS = {
        'vendor_concentration': 2,
        'vendor_dominates_mp': 2,
        'vendor_multi_mp': 2,
        'missing_vendor': 1,
    }

    def evaluate(self, df: pd.DataFrame) -> pd.DataFrame:
        disbursed = df.get('total_fund_disbursed', 0.0)
        vendor_missing = (
            df['primary_vendor'].isna() |
            (df['primary_vendor'].astype(str).str.strip().isin(['', 'None', 'nan']))
        )

        flags = self.flag_frame(
            df.index,
            vendor_concentration=(
                df.get('vendor_share_in_state', 0.0).fillna(0) > CONFIG['vendor_share_threshold']
            ),
            vendor_dominates_mp=(
                df.get('vendor_share_per_mp', 0.0).fillna(0) >= CONFIG['vendor_mp_share_threshold']
            ),
            vendor_multi_mp=(
                (disbursed > 0) &
                (df.get('vendor_mp_count', 0).fillna(0) >= CONFIG['vendor_multi_mp_threshold'])
            ),
            missing_vendor=(disbursed > 0) & vendor_missing,
        )
        return self.evaluate_flags(flags, df.index)
