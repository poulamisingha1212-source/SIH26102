"""Duplicate & Ghost-Work Agent — is this the same work paid for twice?"""

import pandas as pd

from model.agents.base import BaseAgent


class DuplicateAgent(BaseAgent):
    key = 'duplicate'
    title = 'Duplicate & Multiple Allocation Agent'
    description = (
        'Identifies candidate work clusters sharing near-identical descriptions, '
        'standardized amounts, or multiple allocations across constituencies for field verification.'
    )
    weight = 0.25
    max_severity = 3.0

    FLAG_WEIGHTS = {
        'duplicate_across_mp': 3,
        'duplicate_description': 2,
    }

    def evaluate(self, df: pd.DataFrame) -> pd.DataFrame:
        flags = pd.DataFrame(index=df.index)
        flags['flag_duplicate_description'] = (
            df.get('flag_duplicate_description', pd.Series(False, index=df.index)).fillna(False)
        )
        flags['flag_duplicate_across_mp'] = (
            df.get('flag_duplicate_across_mp', pd.Series(False, index=df.index)).fillna(False)
        )
        return self.evaluate_flags(flags, df.index)
