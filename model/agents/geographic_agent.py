"""
Geographic & IDA Concentration Agent — are the implementing agencies suspicious?

Detects district-level procurement clustering that often precedes phantom
spending: one IDA capturing a disproportionate share of the state budget,
a single vendor monopolising an IDA's paid works, or an unusually high
number of different MPs routing works through the same agency.
"""

import pandas as pd

from model.agents.base import BaseAgent
from model.agents.features import CONFIG


class GeographicAgent(BaseAgent):
    key = 'geographic'
    title = 'Geographic & IDA Concentration Agent'
    description = (
        'Detects district-level anomalies: implementing agencies (IDAs) capturing '
        'an outsized share of state MPLADS funds, a single vendor monopolising '
        'an IDA\'s paid works, and IDAs used by an implausibly large number of '
        'different MPs — classic signals of pre-arranged procurement capture.'
    )
    weight = 0.05
    max_severity = 3.0

    FLAG_WEIGHTS = {
        'ida_budget_capture':       3,   # IDA holds >threshold% of state budget
        'ida_vendor_monopoly':      2,   # single vendor >threshold% of IDA's works
        'ida_mp_cluster':           1,   # >=threshold distinct MPs through same IDA
    }

    def evaluate(self, df: pd.DataFrame) -> pd.DataFrame:
        flags = self.flag_frame(
            df.index,
            ida_budget_capture=(
                df.get('ida_budget_share_in_state', 0.0).fillna(0)
                > CONFIG['ida_budget_share_threshold']
            ),
            ida_vendor_monopoly=(
                df.get('ida_vendor_concentration', 0.0).fillna(0)
                >= CONFIG['ida_vendor_concentration_threshold']
            ),
            ida_mp_cluster=(
                df.get('ida_mp_count', 0).fillna(0)
                >= CONFIG['ida_mp_cluster_threshold']
            ),
        )
        return self.evaluate_flags(flags, df.index)
