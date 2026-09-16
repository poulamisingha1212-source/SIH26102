"""Authoritative MPLADS 2023 Rule Registry.

Defines the official machine-testable rules grounded in the MPLADS Guidelines 2023
and verified empirically against MongoDB in Phase 2.2.
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
import json

class RuleState(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    REVIEW = "REVIEW"
    UNKNOWN = "UNKNOWN"
    NOT_APPLICABLE = "NOT_APPLICABLE"

class LegalStrength(str, Enum):
    MANDATORY_PROHIBITION = "MANDATORY_PROHIBITION"
    MANDATORY_REQUIREMENT = "MANDATORY_REQUIREMENT"
    MANDATORY_FINANCIAL_LIMIT = "MANDATORY_FINANCIAL_LIMIT"
    MANDATORY_PROCEDURAL_REQUIREMENT = "MANDATORY_PROCEDURAL_REQUIREMENT"
    ADVISORY = "ADVISORY"
    INTERNAL_CONTROL = "INTERNAL_CONTROL"
    AUDIT_HEURISTIC = "AUDIT_HEURISTIC"
    DATA_QUALITY = "DATA_QUALITY"

@dataclass
class RuleDefinition:
    rule_id: str
    title: str
    clause: str
    legal_strength: LegalStrength
    category: str
    mongodb_evidence: List[str]
    coverage_pct: float
    automatable_status: str
    state_capability: Dict[str, bool]
    primary_data_gap: Optional[str] = None
    notes: Optional[str] = None
    version: str = "2.2.0"
    effective_from: str = "2023-04-01"

@dataclass
class RuleResult:
    rule_id: str
    version: str
    state: RuleState
    title: str
    category: str
    rule_type: str
    evidence: Dict[str, Any] = field(default_factory=dict)
    reason: str = ""
    data_gaps: List[str] = field(default_factory=list)
    auditor_evidence_checklist: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "rule_id": self.rule_id,
            "version": self.version,
            "state": self.state.value if isinstance(self.state, RuleState) else str(self.state),
            "title": self.title,
            "category": self.category,
            "rule_type": self.rule_type,
            "evidence": self.evidence,
            "reason": self.reason,
            "data_gaps": self.data_gaps,
            "auditor_evidence_checklist": self.auditor_evidence_checklist,
        }

# Built-in verified registry specifications (matches phase_2_2_rule_registry.json)
BUILTIN_RULES: Dict[str, RuleDefinition] = {
    "MPLADS23-JUR-001": RuleDefinition(
        rule_id="MPLADS23-JUR-001",
        title="Lok Sabha Constituency Scope Compliance",
        clause="Para 2.3",
        legal_strength=LegalStrength.MANDATORY_REQUIREMENT,
        category="JURISDICTION",
        mongodb_evidence=["works.house", "works.constituency", "works.state", "mp_allocations.constituency", "mp_allocations.state"],
        coverage_pct=100.0,
        automatable_status="PARTIALLY_AUTOMATABLE",
        state_capability={"PASS": True, "FAIL": False, "REVIEW": True, "UNKNOWN": False, "NOT_APPLICABLE": True},
        primary_data_gap="CALAMITY_DECLARATION_UNAVAILABLE",
        notes="State mismatch detectable, but intra-state constituency boundary verification requires external GIS or calamity exception verification."
    ),
    "MPLADS23-JUR-002": RuleDefinition(
        rule_id="MPLADS23-JUR-002",
        title="Rajya Sabha State/UT Scope Compliance",
        clause="Para 2.5",
        legal_strength=LegalStrength.MANDATORY_REQUIREMENT,
        category="JURISDICTION",
        mongodb_evidence=["works.house", "works.state", "mp_allocations.state"],
        coverage_pct=100.0,
        automatable_status="PARTIALLY_AUTOMATABLE",
        state_capability={"PASS": True, "FAIL": False, "REVIEW": True, "UNKNOWN": False, "NOT_APPLICABLE": True},
        primary_data_gap="CALAMITY_DECLARATION_UNAVAILABLE",
        notes="Elected RS MPs cannot execute works outside their election state unless covered by national calamity exception (Para 2.8)."
    ),
    "MPLADS23-JUR-003": RuleDefinition(
        rule_id="MPLADS23-JUR-003",
        title="Nominated MP Nationwide Scope Verification",
        clause="Para 2.6",
        legal_strength=LegalStrength.MANDATORY_REQUIREMENT,
        category="JURISDICTION",
        mongodb_evidence=["works.constituency", "works.house"],
        coverage_pct=100.0,
        automatable_status="FULLY_AUTOMATABLE",
        state_capability={"PASS": True, "FAIL": False, "REVIEW": False, "UNKNOWN": False, "NOT_APPLICABLE": True},
        primary_data_gap=None,
        notes="Nominated MPs have pan-India jurisdiction. Rule evaluates to PASS for all valid nominated MP works."
    ),
    "MPLADS23-FIN-001": RuleDefinition(
        rule_id="MPLADS23-FIN-001",
        title="Disbursement Without Administrative Sanction",
        clause="Para 3.11, Para 4.1",
        legal_strength=LegalStrength.MANDATORY_PROHIBITION,
        category="FINANCIAL",
        mongodb_evidence=["works.work_status", "works.sanction_amount", "works.total_fund_disbursed"],
        coverage_pct=100.0,
        automatable_status="FULLY_AUTOMATABLE",
        state_capability={"PASS": True, "FAIL": True, "REVIEW": True, "UNKNOWN": False, "NOT_APPLICABLE": False},
        primary_data_gap=None,
        notes="Empirically detected in 4 live works (e.g. work_id 141185, 220383, 239748)."
    ),
    "MPLADS23-FIN-002": RuleDefinition(
        rule_id="MPLADS23-FIN-002",
        title="Cumulative Disbursement Exceeding Sanction",
        clause="Para 3.11, Para 4.2",
        legal_strength=LegalStrength.MANDATORY_FINANCIAL_LIMIT,
        category="FINANCIAL",
        mongodb_evidence=["works.sanction_amount", "works.total_fund_disbursed"],
        coverage_pct=100.0,
        automatable_status="FULLY_AUTOMATABLE",
        state_capability={"PASS": True, "FAIL": True, "REVIEW": True, "UNKNOWN": False, "NOT_APPLICABLE": False},
        primary_data_gap=None,
        notes="Must use epsilon tolerance of INR 100 to prevent IEEE 754 floating point imprecision flags."
    ),
    "MPLADS23-FIN-003": RuleDefinition(
        rule_id="MPLADS23-FIN-003",
        title="Annual Entitlement Cap Compliance",
        clause="Para 2.1, Para 4.1",
        legal_strength=LegalStrength.MANDATORY_FINANCIAL_LIMIT,
        category="FINANCIAL",
        mongodb_evidence=["works.sanction_amount", "mp_allocations.allocated_amount"],
        coverage_pct=100.0,
        automatable_status="NOT_AUTOMATABLE_WITH_CURRENT_DATA",
        state_capability={"PASS": False, "FAIL": False, "REVIEW": False, "UNKNOWN": True, "NOT_APPLICABLE": False},
        primary_data_gap="CARRY_FORWARD_LEDGER_UNAVAILABLE",
        notes="Cannot evaluate annual cap because sanction_date, financial_year, and carry-forward ledgers are absent in MongoDB."
    ),
    "MPLADS23-FIN-004": RuleDefinition(
        rule_id="MPLADS23-FIN-004",
        title="Financial Voucher & Payment Reconciliation",
        clause="Para 4.3, Para 4.4",
        legal_strength=LegalStrength.INTERNAL_CONTROL,
        category="FINANCIAL",
        mongodb_evidence=["works.total_fund_disbursed"],
        coverage_pct=100.0,
        automatable_status="NOT_AUTOMATABLE_WITH_CURRENT_DATA",
        state_capability={"PASS": False, "FAIL": False, "REVIEW": False, "UNKNOWN": True, "NOT_APPLICABLE": False},
        primary_data_gap="FINANCIAL_VOUCHER_RECONCILIATION_UNAVAILABLE",
        notes="Line item vouchers are absent. Tolerance thresholds (such as 10%) are internal audit heuristics."
    ),
    "MPLADS23-SOC-001": RuleDefinition(
        rule_id="MPLADS23-SOC-001",
        title="Trust/Society Work Single Financial Ceiling (₹50 Lakh)",
        clause="Para 3.23",
        legal_strength=LegalStrength.MANDATORY_FINANCIAL_LIMIT,
        category="TRUST_SOCIETY",
        mongodb_evidence=["works.work_category", "works.sanction_amount"],
        coverage_pct=100.0,
        automatable_status="FULLY_AUTOMATABLE",
        state_capability={"PASS": True, "FAIL": True, "REVIEW": True, "UNKNOWN": False, "NOT_APPLICABLE": True},
        primary_data_gap=None,
        notes="Empirically detected in 2 live works: work_id 262075 (₹95L) and 290981 (₹75L)."
    ),
    "MPLADS23-SOC-002": RuleDefinition(
        rule_id="MPLADS23-SOC-002",
        title="Trust/Society Cumulative Lifetime Ceiling (₹1 Crore)",
        clause="Para 3.23",
        legal_strength=LegalStrength.MANDATORY_FINANCIAL_LIMIT,
        category="TRUST_SOCIETY",
        mongodb_evidence=["works.work_category", "works.sanction_amount"],
        coverage_pct=100.0,
        automatable_status="PARTIALLY_AUTOMATABLE",
        state_capability={"PASS": False, "FAIL": False, "REVIEW": True, "UNKNOWN": True, "NOT_APPLICABLE": True},
        primary_data_gap="DARPAN_REGISTRATION_UNAVAILABLE",
        notes="Entity names are not parsed into canonical IDs; can only group by MP trust totals."
    ),
    "MPLADS23-SOC-003": RuleDefinition(
        rule_id="MPLADS23-SOC-003",
        title="Trust/Society Mandatory NGO Darpan Registration",
        clause="Para 3.23",
        legal_strength=LegalStrength.MANDATORY_REQUIREMENT,
        category="TRUST_SOCIETY",
        mongodb_evidence=[],
        coverage_pct=0.0,
        automatable_status="NOT_AUTOMATABLE_WITH_CURRENT_DATA",
        state_capability={"PASS": False, "FAIL": False, "REVIEW": False, "UNKNOWN": True, "NOT_APPLICABLE": True},
        primary_data_gap="DARPAN_REGISTRATION_UNAVAILABLE",
        notes="Darpan ID field is not captured in MongoDB works collection."
    ),
    "MPLADS23-SOC-004": RuleDefinition(
        rule_id="MPLADS23-SOC-004",
        title="Trust/Society Minimum 3-Year Existence Mandate",
        clause="Para 3.23",
        legal_strength=LegalStrength.MANDATORY_REQUIREMENT,
        category="TRUST_SOCIETY",
        mongodb_evidence=[],
        coverage_pct=0.0,
        automatable_status="NOT_AUTOMATABLE_WITH_CURRENT_DATA",
        state_capability={"PASS": False, "FAIL": False, "REVIEW": False, "UNKNOWN": True, "NOT_APPLICABLE": True},
        primary_data_gap="DARPAN_REGISTRATION_UNAVAILABLE",
        notes="Trust registration date and 3-year audit evidence are absent from MongoDB."
    ),
    "MPLADS23-SOC-005": RuleDefinition(
        rule_id="MPLADS23-SOC-005",
        title="Trust/Society MP & Family Non-Involvement Mandate",
        clause="Para 3.23",
        legal_strength=LegalStrength.MANDATORY_PROHIBITION,
        category="TRUST_SOCIETY",
        mongodb_evidence=[],
        coverage_pct=0.0,
        automatable_status="NOT_AUTOMATABLE_WITH_CURRENT_DATA",
        state_capability={"PASS": False, "FAIL": False, "REVIEW": False, "UNKNOWN": True, "NOT_APPLICABLE": True},
        primary_data_gap="TRUSTEE_RELATION_UNAVAILABLE",
        notes="Trustee lists and family relationships are absent from MongoDB."
    ),
    "MPLADS23-PROH-001": RuleDefinition(
        rule_id="MPLADS23-PROH-001",
        title="Statutory Prohibited Works List Screening",
        clause="Annexure-II",
        legal_strength=LegalStrength.MANDATORY_PROHIBITION,
        category="PROHIBITED_WORKS",
        mongodb_evidence=["works.work_type", "works.work_category"],
        coverage_pct=100.0,
        automatable_status="PARTIALLY_AUTOMATABLE",
        state_capability={"PASS": True, "FAIL": False, "REVIEW": True, "UNKNOWN": False, "NOT_APPLICABLE": False},
        primary_data_gap="GRANULAR_GEOGRAPHIC_LOCATION_UNAVAILABLE",
        notes="Free-text keywords can only trigger REVIEW; never definitive FAIL without physical DPR."
    ),
    "MPLADS23-PROH-002": RuleDefinition(
        rule_id="MPLADS23-PROH-002",
        title="Prohibition of Works on Private / Commercial Property",
        clause="Para 3.22, Annexure-II",
        legal_strength=LegalStrength.MANDATORY_PROHIBITION,
        category="PROHIBITED_WORKS",
        mongodb_evidence=[],
        coverage_pct=0.0,
        automatable_status="NOT_AUTOMATABLE_WITH_CURRENT_DATA",
        state_capability={"PASS": False, "FAIL": False, "REVIEW": False, "UNKNOWN": True, "NOT_APPLICABLE": False},
        primary_data_gap="LAND_OWNERSHIP_EVIDENCE_UNAVAILABLE",
        notes="Land ownership / NOC records are completely absent from MongoDB."
    ),
    "MPLADS23-TIME-001": RuleDefinition(
        rule_id="MPLADS23-TIME-001",
        title="Administrative Sanction Decision Window (45 Days)",
        clause="Para 3.12",
        legal_strength=LegalStrength.MANDATORY_PROCEDURAL_REQUIREMENT,
        category="TIMELINES",
        mongodb_evidence=[],
        coverage_pct=0.0,
        automatable_status="NOT_AUTOMATABLE_WITH_CURRENT_DATA",
        state_capability={"PASS": False, "FAIL": False, "REVIEW": False, "UNKNOWN": True, "NOT_APPLICABLE": False},
        primary_data_gap="SANCTION_RECOMMENDATION_DATES_UNAVAILABLE",
        notes="recommendation_date and sanction_date are absent from MongoDB."
    ),
    "MPLADS23-TIME-002": RuleDefinition(
        rule_id="MPLADS23-TIME-002",
        title="Work Execution Duration Monitoring",
        clause="Para 3.14",
        legal_strength=LegalStrength.INTERNAL_CONTROL,
        category="TIMELINES",
        mongodb_evidence=["works.completion_date"],
        coverage_pct=51.25,
        automatable_status="PARTIALLY_AUTOMATABLE",
        state_capability={"PASS": False, "FAIL": False, "REVIEW": True, "UNKNOWN": True, "NOT_APPLICABLE": False},
        primary_data_gap="SANCTION_RECOMMENDATION_DATES_UNAVAILABLE",
        notes="Cannot measure sanction-to-completion duration because sanction_date is absent."
    ),
    "MPLADS23-MON-001": RuleDefinition(
        rule_id="MPLADS23-MON-001",
        title="District Authority 10% Physical Inspection Quota",
        clause="Para 6.4",
        legal_strength=LegalStrength.MANDATORY_PROCEDURAL_REQUIREMENT,
        category="MONITORING",
        mongodb_evidence=["works.work_status"],
        coverage_pct=99.82,
        automatable_status="PARTIALLY_AUTOMATABLE",
        state_capability={"PASS": False, "FAIL": False, "REVIEW": True, "UNKNOWN": True, "NOT_APPLICABLE": False},
        primary_data_gap="INSPECTION_LOG_UNAVAILABLE",
        notes="work_status indicates stage, but inspection logs, officer reports, and pass/fail sign-offs are absent."
    ),
    "MPLADS23-MON-003": RuleDefinition(
        rule_id="MPLADS23-MON-003",
        title="Mandatory Web Portal Photo Upload Verification",
        clause="Para 6.5, Para 7.2",
        legal_strength=LegalStrength.MANDATORY_PROCEDURAL_REQUIREMENT,
        category="MONITORING",
        mongodb_evidence=[],
        coverage_pct=0.0,
        automatable_status="NOT_AUTOMATABLE_WITH_CURRENT_DATA",
        state_capability={"PASS": False, "FAIL": False, "REVIEW": True, "UNKNOWN": True, "NOT_APPLICABLE": False},
        primary_data_gap="PHOTO_PLAQUE_EVIDENCE_UNAVAILABLE",
        notes="Image URLs and binary photos are not stored in MongoDB."
    ),
    "MPLADS23-ADV-001": RuleDefinition(
        rule_id="MPLADS23-ADV-001",
        title="SC Inhabited Area Advisory Allocation (15%)",
        clause="Para 2.4",
        legal_strength=LegalStrength.ADVISORY,
        category="ADVISORY_TARGETS",
        mongodb_evidence=[],
        coverage_pct=0.0,
        automatable_status="NOT_AUTOMATABLE_WITH_CURRENT_DATA",
        state_capability={"PASS": False, "FAIL": False, "REVIEW": False, "UNKNOWN": True, "NOT_APPLICABLE": False},
        primary_data_gap="SC_ST_CENSUS_MAPPING_UNAVAILABLE",
        notes="Advisory portfolio target; not a per-work rule; census data absent from MongoDB."
    ),
    "MPLADS23-ADV-002": RuleDefinition(
        rule_id="MPLADS23-ADV-002",
        title="ST Inhabited Area Advisory Allocation (7.5%)",
        clause="Para 2.4",
        legal_strength=LegalStrength.ADVISORY,
        category="ADVISORY_TARGETS",
        mongodb_evidence=[],
        coverage_pct=0.0,
        automatable_status="NOT_AUTOMATABLE_WITH_CURRENT_DATA",
        state_capability={"PASS": False, "FAIL": False, "REVIEW": False, "UNKNOWN": True, "NOT_APPLICABLE": False},
        primary_data_gap="SC_ST_CENSUS_MAPPING_UNAVAILABLE",
        notes="Advisory portfolio target; not a per-work rule; census data absent from MongoDB."
    ),
    "MPLADS23-VEN-001": RuleDefinition(
        rule_id="MPLADS23-VEN-001",
        title="Vendor Monetary Exposure & Concentration Analysis",
        clause="Audit Heuristic",
        legal_strength=LegalStrength.AUDIT_HEURISTIC,
        category="VENDOR_PROCUREMENT",
        mongodb_evidence=["works.primary_vendor", "works.sanction_amount", "works.total_fund_disbursed"],
        coverage_pct=68.89,
        automatable_status="FULLY_AUTOMATABLE",
        state_capability={"PASS": True, "FAIL": False, "REVIEW": True, "UNKNOWN": True, "NOT_APPLICABLE": False},
        primary_data_gap="PROCUREMENT_RECORD_UNAVAILABLE",
        notes="Monetary exposure concentration is an explainable audit heuristic, not a statutory violation."
    ),
    "MPLADS23-DUP-001": RuleDefinition(
        rule_id="MPLADS23-DUP-001",
        title="Composite Work Duplication Candidate Screening",
        clause="Audit Heuristic",
        legal_strength=LegalStrength.AUDIT_HEURISTIC,
        category="DUPLICATION",
        mongodb_evidence=["works.mp_name", "works.primary_vendor", "works.sanction_amount", "works.work_type"],
        coverage_pct=68.89,
        automatable_status="FULLY_AUTOMATABLE",
        state_capability={"PASS": True, "FAIL": False, "REVIEW": True, "UNKNOWN": False, "NOT_APPLICABLE": False},
        primary_data_gap="GRANULAR_GEOGRAPHIC_LOCATION_UNAVAILABLE",
        notes="Generates REVIEW candidates only. High repetition of standardized equipment is common in developmental procurement."
    )
}

class RuleRegistry:
    """Manages access to verified rule definitions."""

    def __init__(self, json_path: Optional[Path] = None):
        self._rules: Dict[str, RuleDefinition] = dict(BUILTIN_RULES)
        if json_path and json_path.exists():
            self._load_from_json(json_path)

    def _load_from_json(self, path: Path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            rules_list = data.get("rules", [])
            for r in rules_list:
                rid = r.get("rule_id")
                if rid and rid in self._rules:
                    # Update or enrich
                    existing = self._rules[rid]
                    if "title" in r:
                        existing.title = r["title"]
                    if "clause" in r:
                        existing.clause = r["clause"]
        except Exception:
            pass  # Fallback to builtin rules cleanly

    def get_rule(self, rule_id: str) -> Optional[RuleDefinition]:
        return self._rules.get(rule_id)

    def list_rules(self) -> List[RuleDefinition]:
        return list(self._rules.values())

    def get_category_rules(self, category: str) -> List[RuleDefinition]:
        return [r for r in self._rules.values() if r.category == category]

registry = RuleRegistry()
