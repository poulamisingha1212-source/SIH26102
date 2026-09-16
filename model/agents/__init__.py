"""Multi-agent risk system — the specialist agent pool and its registry."""

from model.agents.base import BaseAgent
from model.agents.coordinator import AgentCoordinator
from model.agents.financial_agent import FinancialAgent
from model.agents.timeline_agent import TimelineAgent
from model.agents.duplicate_agent import DuplicateAgent
from model.agents.vendor_agent import VendorAgent
from model.agents.compliance_agent import ComplianceAgent

AGENTS = [
    FinancialAgent(),
    TimelineAgent(),
    DuplicateAgent(),
    VendorAgent(),
    ComplianceAgent(),
]

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
    'ComplianceAgent',
]
