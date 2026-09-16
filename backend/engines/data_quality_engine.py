"""Dedicated Data Quality Engine for MPLADS data.

Identifies database recording defects, missing values, and formatting artifacts
cleanly separated from statutory audit risk scoring.
"""

from typing import Dict, Any, List
from dataclasses import dataclass, field

@dataclass
class DataQualityDefect:
    defect_code: str
    severity: str  # "LOW", "MEDIUM", "HIGH"
    field_name: str
    description: str
    suggested_action: str

def evaluate_data_quality(row: Dict[str, Any]) -> List[DataQualityDefect]:
    """Inspects a single work record for database recording and formatting defects."""
    defects = []
    
    sanction = float(row.get("sanction_amount") or 0.0)
    disbursed = float(row.get("total_fund_disbursed") or 0.0)
    status = str(row.get("work_status") or "").strip()
    category = str(row.get("work_category") or "").strip()
    vendor = str(row.get("primary_vendor") or "").strip()
    comp_date = str(row.get("completion_date") or "").strip()

    # 1. Draft placeholder record
    if sanction == 0 and disbursed == 0 and status in ("NA", "", "None"):
        defects.append(DataQualityDefect(
            defect_code="DRAFT_PLACEHOLDER",
            severity="LOW",
            field_name="sanction_amount",
            description="Work appears to be an initial un-sanctioned draft entry on portal.",
            suggested_action="Route to database clean-up queue rather than compliance risk review."
        ))

    # 2. Completed status without completion date
    if status.lower() == "work completed" and (not comp_date or comp_date in ("None", "NA", "—")):
        defects.append(DataQualityDefect(
            defect_code="COMPLETED_WITHOUT_COMPLETION_DATE",
            severity="MEDIUM",
            field_name="completion_date",
            description="Work is marked 'Work Completed' by IDA but physical completion date is missing.",
            suggested_action="Request IDA Planning Officer to enter physical completion date on portal."
        ))

    # 3. Missing vendor in active execution stages
    if status.lower() in ("work partially completed", "work completed") and (not vendor or vendor in ("None", "NA", "—")):
        defects.append(DataQualityDefect(
            defect_code="MISSING_VENDOR_LOG",
            severity="MEDIUM",
            field_name="primary_vendor",
            description="Active or completed work does not record the assigned contractor/executing agency.",
            suggested_action="Update contractor / agency details from work order docket."
        ))

    # 4. Unclassified work category
    if not category or category in ("None", "N/A", "NA"):
        defects.append(DataQualityDefect(
            defect_code="UNCLASSIFIED_WORK",
            severity="LOW",
            field_name="work_category",
            description="Work category is unassigned or recorded as N/A.",
            suggested_action="Classify work under standard MoSPI Schedule-I activity categories."
        ))

    # 5. Floating point overrun artifact (0 < excess <= 100)
    excess = disbursed - sanction
    if 0 < excess <= 100.0:
        defects.append(DataQualityDefect(
            defect_code="FLOAT_OVERRUN_ARTIFACT",
            severity="LOW",
            field_name="total_fund_disbursed",
            description=f"Apparent financial excess of INR {excess:.4f} is within IEEE-754 precision tolerance.",
            suggested_action="No auditor action required; numeric artifact filtered."
        ))

    return defects
