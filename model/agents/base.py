"""
Multi-Agent Risk System — agent contract.

Every risk agent is a specialist that inspects the whole work-level dataset
from one angle (money, time, duplication, procurement, compliance) and
returns a per-work opinion:

    <key>_score : float in [0, 1] — how strongly this agent distrusts the work
    <key>_flags : list[str]      — named signals the agent triggered

Agents are stateless and vectorized; they never see model artifacts.
The AgentCoordinator (coordinator.py) runs all agents and blends their
opinions into the final risk score.
"""

from abc import ABC, abstractmethod

import pandas as pd


class BaseAgent(ABC):
    """Base class for all specialist risk agents."""

    key: str = "agent"          # short id, e.g. 'financial'
    title: str = "Risk Agent"   # human-readable name for the UI
    description: str = ""       # one-line scope explanation (shown in dossier)
    weight: float = 0.2         # aggregation weight across agents
    max_severity: float = 1.0   # severity sum that maps to a full 1.0 score

    # severity weight per flag — drives both the score and the explanations
    FLAG_WEIGHTS: dict = {}

    @abstractmethod
    def evaluate(self, df: pd.DataFrame) -> pd.DataFrame:
        """Return a DataFrame indexed like `df` with <key>_score and <key>_flags."""

    def score_from_flags(self, flags_df: pd.DataFrame) -> pd.Series:
        """Convert a boolean flag frame into a 0..1 severity score."""
        if self.FLAG_WEIGHTS:
            denom = sum(self.FLAG_WEIGHTS.values())
        else:  # pragma: no cover - defensive
            denom = 1.0
        total = pd.Series(0.0, index=flags_df.index)
        for name, weight in self.FLAG_WEIGHTS.items():
            col = name if name in flags_df.columns else f'flag_{name}'
            if col in flags_df.columns:
                total = total + flags_df[col].fillna(False).astype(float) * weight
        return (total / denom).clip(0, 1)

    @staticmethod
    def collect_flags(flags_df: pd.DataFrame) -> pd.Series:
        """Collapse a boolean flag frame into one list of triggered names per row."""
        names = [c[5:] if c.startswith('flag_') else c for c in flags_df.columns]
        bools = flags_df.fillna(False).values
        return pd.Series(
            [[n for n, b in zip(names, row) if b] for row in bools],
            index=flags_df.index,
        )

    def evaluate_flags(self, flags_df: pd.DataFrame, index) -> pd.DataFrame:
        """Standard agent output: <key>_score + <key>_flags from a flag frame."""
        out = pd.DataFrame(index=index)
        out[f'{self.key}_flags'] = self.collect_flags(flags_df)
        out[f'{self.key}_score'] = self.score_from_flags(flags_df)
        return out

    @staticmethod
    def flag_frame(index, **columns) -> pd.DataFrame:
        """Build a boolean flag frame aligned to `index`."""
        data = {"flag_" + name: pd.Series(values, index=index)
                for name, values in columns.items()}
        return pd.DataFrame(data, index=index)
