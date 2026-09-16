"""Multi-agent risk system — the specialist agent pool and its registry."""

from model.agents.base import BaseAgent
from model.agents.coordinator import AgentCoordinator
from model.agents.financial_agent import FinancialAgent
from model.agents.timeline_agent import TimelineAgent
from model.agents.duplicate_agent import DuplicateAgent
from model.agents.vendor_agent import VendorAgent
from model.agents.compliance_agent import ComplianceAgent
from model.agents.geographic_agent import GeographicAgent
from model._config import get_config

# Load agent weights from config.yaml (falls back to class defaults if missing)
_weight_cfg = get_config().get('agent_weights', {})


def _w(agent_cls, default: float) -> float:
    return _weight_cfg.get(agent_cls.key, default)


AGENTS = [
    FinancialAgent(),
    TimelineAgent(),
    DuplicateAgent(),
    VendorAgent(),
    ComplianceAgent(),
    GeographicAgent(),
]

# Apply config-driven weights
for _a in AGENTS:
    _key = _a.key
    if _key in _weight_cfg:
        _a.weight = float(_weight_cfg[_key])

AGENT_REGISTRY = {a.key: a for a in AGENTS}

AGENT_DESCRIPTIONS = {
    a.key: {'title': a.title, 'description': a.description, 'weight': a.weight}
    for a in AGENTS
}


def get_coordinator() -> AgentCoordinator:
    return AgentCoordinator(AGENTS)


__all__ = [
    'BaseAgent', 'AgentCoordinator', 'AGENTS', 'AGENT_REGISTRY',
    'AGENT_DESCRIPTIONS', 'get_coordinator',
    'FinancialAgent', 'TimelineAgent', 'DuplicateAgent', 'VendorAgent',
    'ComplianceAgent', 'GeographicAgent',
]
