# PHASE 2.1 — MPLADS 2023 POLICY VERIFICATION & CORRECTION REPORT

**Document Version**: 2.1.0-VERIFIED  
**Policy Baseline**: Official MPLADS Guidelines 2023 (Ministry of Statistics and Programme Implementation, Government of India)  
**Effective Date**: 1 April 2023  
**Status**: Policy Audit Complete — Implementation Guardrails Established  

---

## 1. Executive Summary

This Phase 2.1 review audited every policy claim, statutory rule, heuristic cutoff, and data assumption made in the Phase 2 specification against the **official text of the MPLADS Guidelines 2023**.

### What Was Verified & Confirmed
1. **Jurisdictional Boundaries**: Lok Sabha MPs must recommend works within their constituency (Para 3.2); Rajya Sabha MPs within their state of election (Para 3.3); Nominated MPs anywhere in India (Para 3.4).
2. **Statutory Trust Ceilings (Chapter 6)**: An MP can recommend works for registered Trusts/Societies up to a maximum of **₹50.00 Lakh in a financial year** across all entities (Para 6.2), and a maximum of **₹1.00 Crore over the MP's tenure** for any single Trust/Society (Para 6.3), capped at 10% of total tenurial entitlement.
3. **No Disbursement Without Sanction**: Para 4.6 explicitly forbids fund disbursement and work commencement without prior formal administrative sanction by the District Authority.
4. **Annexure-II Prohibitions**: Statutory prohibitions against religious premises, commercial offices, private land construction, memorials/statues, cash grants/loans, and land purchase were verified verbatim from Annexure-II.
5. **Calamity Provisions (Chapter 5)**: MPs may recommend up to ₹1.00 Crore for disaster mitigation in affected districts within their state (Para 5.1) or severe calamities outside their state (Para 5.2).
6. **Statutory Inspection Mandates**: Chapter 7 mandates that the District Authority inspect at least **10%** of all works annually, and State authorities inspect at least **1%**.

### What Was Found to be Incorrect in Phase 2 & Previous Code
1. **The 5% Over-Expenditure "Statutory" Tolerance**:
   * *Phase 2 Claim*: Asserted a statutory 5% tolerance under Chapter 4, Para 4.7 for expenditure exceeding sanction.
   * *Official Finding*: **No 5% tolerance exists in the MPLADS 2023 Guidelines.** The Guidelines mandate that works be completed within the sanctioned cost; any cost overrun requires a revised technical/administrative sanction approved by the District Authority within the MP's overall entitlement. The 5% figure was an imported GFR/engineering contingency practice.
   * *Correction*: Reclassified from `HARD_COMPLIANCE` to `INTERNAL_CONTROL`.
2. **SC / ST Allocation Mandate vs Advisory**:
   * *Phase 2 Claim*: Treated the 15% SC and 7.5% ST provisions as mandatory work-level compliance checks.
   * *Official Finding*: The 2023 Guidelines state that MPs are **"advised to recommend"** works costing at least 15% (SC) and 7.5% (ST) of their annual entitlement. Furthermore, the denominator is the **MP's annual entitlement** (portfolio-level aggregate), not individual work rows.
   * *Correction*: Reclassified from statutory compliance to `ADVISORY_TARGET` and established that the current portal feed lacks demographic census tags, making it `NOT_AUTOMATABLE_WITH_CURRENT_DATA`.
3. **Arbitrary Timeline Thresholds Labeled as Scheme Rules**:
   * *Existing Implementation*: Used 15 days (rapid completion), 90 days (stuck payment), 180 days (stuck status), and 30 days (payment after completion).
   * *Official Finding*: These numbers are **internal audit heuristics**, not MPLADS statutory rules. The actual 2023 Guidelines establish only:
     * **45 days** for District Authority sanction/rejection (Para 4.3).
     * **1 year (365 days)** general completion timeframe from sanction date (Para 4.8).
     * **18 months** for post-tenure work completion.
   * *Correction*: Explicitly designated all four legacy timeline thresholds as `AUDIT_HEURISTIC` and established the statutory 45-day and 365-day benchmarks.
4. **Missing Portal Photographs Equated to Non-Compliance**:
   * *Previous Code*: Flagged completed works lacking an image as a risk signal (`completed_without_image`).
   * *Official Finding*: Para 7.3 requires photo upload on e-SAKSHI, but portal attachment omission frequently stems from data sync latencies, not physical asset non-existence.
   * *Correction*: Reclassified to `DATA_QUALITY` / `DATA_GAP`. It must never contribute to a fraud accusation.

### What Remains Ambiguous in Official Policy
* **Multi-Year Carry-Forward Reconciliations**: Uncommitted funds carry forward indefinitely within an MP's tenure. A work sanctioned for ₹7.50 Crore in Year 3 is legitimate if ₹2.50 Crore was unspent from Year 2. Without historical CNA balance ledgers, single-year over-allocation checks cannot distinguish legitimate carry-forward from fiscal over-commitment.

---

## 2. Official Source Register

| Source Reference | Official Document Title | Issuing Authority | Effective Date | Official Access URL | Key Sections Used |
|---|---|---|---|---|---|
| **MPLADS-GL-2023** | *Members of Parliament Local Area Development Scheme (MPLADS) Guidelines, 2023* | Ministry of Statistics and Programme Implementation (MoSPI), Government of India | 1 April 2023 | `https://www.mplads.gov.in/MPLADS/UploadedFiles/MPLADSGuidelines2023_English_.pdf` | Chapters 1, 2, 3, 4, 5, 6, 7; Annexure-I, Annexure-II |
| **e-SAKSHI-PORTAL** | *e-SAKSHI Operational Architecture & CNA Fund Flow Manual* | MoSPI, GoI | 22 February 2023 | `https://mplads.mospi.gov.in/digigov` | CNA Single-Installment Protocol, Public Reporting Feeds |
| **GFR-2017** | *General Financial Rules, 2017* | Department of Expenditure, Ministry of Finance, GoI | 2017 (with amendments) | `https://doe.gov.in/orders-circular/general-financial-rules-2017` | Rule 130, Rule 139 (Revised Sanctions, Contingencies, Procurement) |

---

## 3. Corrected MPLADS Rule Inventory

### Category A: Jurisdictional & Administrative Entitlement
* **`MPLADS23-JUR-001` (Lok Sabha Constituency Scope)**
  * *Clause*: Chapter 3, Para 3.2
  * *Legal Strength*: `MANDATORY_REQUIREMENT`
  * *Requirement*: Lok Sabha MPs must recommend works situated within their parliamentary constituency, subject to statutory calamity exceptions.
* **`MPLADS23-JUR-002` (Rajya Sabha State Scope)**
  * *Clause*: Chapter 3, Para 3.3
  * *Legal Strength*: `MANDATORY_REQUIREMENT`
  * *Requirement*: Rajya Sabha MPs must recommend works within their electing State/UT.
* **`MPLADS23-JUR-003` (Nominated MP Scope)**
  * *Clause*: Chapter 3, Para 3.4
  * *Legal Strength*: `MANDATORY_REQUIREMENT`
  * *Requirement*: Nominated MPs may recommend eligible works anywhere in India.

### Category B: Financial Authorization & Controls
* **`MPLADS23-FIN-001` (Disbursement Without Sanction)**
  * *Clause*: Chapter 4, Para 4.6
  * *Legal Strength*: `MANDATORY_PROHIBITION`
  * *Requirement*: No work shall be commenced and no fund disbursed without a formal administrative sanction order from the District Authority.
* **`MPLADS23-FIN-002` (Expenditure Exceeding Sanctioned Cost)**
  * *Clause*: Chapter 4, Para 4.7 & GFR Rule 130
  * *Legal Strength*: `INTERNAL_CONTROL`
  * *Requirement*: Actual expenditure cannot exceed sanctioned estimates without a formal revised administrative sanction issued by the District Authority.
* **`MPLADS23-FIN-003` (Annual Entitlement Ceiling)**
  * *Clause*: Chapter 2, Para 2.1 & Chapter 3, Para 3.1
  * *Legal Strength*: `MANDATORY_FINANCIAL_LIMIT`
  * *Requirement*: MP annual entitlement is ₹5.00 Crore per fiscal year. Aggregate annual recommendations exceeding ₹5.00 Crore plus verified carry-forward require reconciliation.
* **`MPLADS23-FIN-004` (Voucher vs Aggregate Disbursement Reconciliation)**
  * *Clause*: e-SAKSHI CNA Financial Accounting Controls
  * *Legal Strength*: `INTERNAL_CONTROL`
  * *Requirement*: Cumulative line-item expenditure vouchers must reconcile with total recorded disbursements.

### Category C: Trust & Society Allocations (Chapter 6)
* **`MPLADS23-SOC-001` (Annual Trust Allocation Cap)**
  * *Clause*: Chapter 6, Para 6.2
  * *Legal Strength*: `MANDATORY_FINANCIAL_LIMIT`
  * *Requirement*: Total value of works recommended for all registered Trusts/Societies combined shall not exceed **₹50.00 Lakh in a financial year**.
* **`MPLADS23-SOC-002` (Single Trust Tenurial Cap)**
  * *Clause*: Chapter 6, Para 6.3
  * *Legal Strength*: `MANDATORY_FINANCIAL_LIMIT`
  * *Requirement*: Total value of works recommended for any single Trust/Society cannot exceed **₹1.00 Crore over an MP's entire tenure**.
* **`MPLADS23-SOC-003` (Trust Tenurial Aggregate Quota)**
  * *Clause*: Chapter 6, Para 6.3
  * *Legal Strength*: `MANDATORY_FINANCIAL_LIMIT`
  * *Requirement*: Total allocation to all trusts across an MP's tenure cannot exceed 10% of their total tenurial entitlement (₹2.50 Cr for a 5-year term).
* **`MPLADS23-SOC-004` (Trust Eligibility & Darpan Registration)**
  * *Clause*: Chapter 6, Para 6.1
  * *Legal Strength*: `MANDATORY_PROCEDURAL_REQUIREMENT`
  * *Requirement*: Beneficiary trust/society must be registered on NGO Darpan, non-profit, operating for at least 3 years, with title reverting to State/UT upon dissolution.
* **`MPLADS23-SOC-005` (Conflict of Interest / Family Trust Prohibition)**
  * *Clause*: Chapter 6, Para 6.4
  * *Legal Strength*: `MANDATORY_PROHIBITION`
  * *Requirement*: No funds may be recommended for an entity where the MP or their immediate family (spouse, children, parents, siblings) hold trustee, president, or management positions.

### Category D: Prohibited Works (Annexure-II Negative List)
* **`MPLADS23-PROH-001` (Commercial & Private Office/Residence)**: Annexure-II, Item 1 (`MANDATORY_PROHIBITION`).
* **`MPLADS23-PROH-002` (Places of Religious Worship / Religious Land)**: Annexure-II, Item 2 (`MANDATORY_PROHIBITION`).
* **`MPLADS23-PROH-003` (Statues, Memorials & Naming After Persons)**: Annexure-II, Item 6 (`MANDATORY_PROHIBITION`).
* **`MPLADS23-PROH-004` (Grants, Loans & Financial Aid)**: Annexure-II, Item 4 (`MANDATORY_PROHIBITION`).
* **`MPLADS23-PROH-005` (Land Purchase & Acquisition Compensation)**: Annexure-II, Item 5 (`MANDATORY_PROHIBITION`).
* **`MPLADS23-PROH-006` (Inventory & Consumable Supplies)**: Annexure-II, Item 3 (`MANDATORY_PROHIBITION`).

### Category E: Statutory Operational Timelines & Monitoring
* **`MPLADS23-TIME-001` (Administrative Sanction Decision Window)**
  * *Clause*: Chapter 4, Para 4.3
  * *Legal Strength*: `MANDATORY_PROCEDURAL_REQUIREMENT`
  * *Requirement*: District Authority must sanction or reject MP recommendations within **45 days** of receipt.
* **`MPLADS23-TIME-002` (One-Year Completion Mandate)**
  * *Clause*: Chapter 4, Para 4.8
  * *Legal Strength*: `MANDATORY_PROCEDURAL_REQUIREMENT`
  * *Requirement*: Sanctioned works must be completed within **1 year (365 days)** of sanction, unless specific terrain exemptions are recorded in the sanction order.
* **`MPLADS23-MON-001` (Mandatory 10% District Authority Physical Inspection)**
  * *Clause*: Chapter 7, Para 7.1
  * *Legal Strength*: `MANDATORY_PROCEDURAL_REQUIREMENT`
  * *Requirement*: District Authority must physically inspect at least **10% of implemented works** annually.
* **`MPLADS23-MON-002` (Mandatory 1% State Authority Physical Inspection)**
  * *Clause*: Chapter 7, Para 7.2
  * *Legal Strength*: `MANDATORY_PROCEDURAL_REQUIREMENT`
  * *Requirement*: State Nodal Department must inspect at least **1% of implemented works** annually.
* **`MPLADS23-MON-003` (Mandatory MPLADS Plaque Inscription)**
  * *Clause*: Chapter 7, Para 7.4
  * *Legal Strength*: `MANDATORY_REQUIREMENT`
  * *Requirement*: Every completed asset must permanently display an inscription plaque stating MP name, scheme name, work title, sanction cost, and year.

### Category F: Advisory Provisions (Non-Statutory Work Compliance)
* **`MPLADS23-ADV-001` (SC Population Focus Allocation Target)**
  * *Clause*: Chapter 3, Para 3.5
  * *Legal Strength*: `ADVISORY`
  * *Requirement*: MPs are *advised* to recommend at least 15% of annual entitlement for areas inhabited by Scheduled Caste populations.
* **`MPLADS23-ADV-002` (ST Population Focus Allocation Target)**
  * *Clause*: Chapter 3, Para 3.5
  * *Legal Strength*: `ADVISORY`
  * *Requirement*: MPs are *advised* to recommend at least 7.5% of annual entitlement for areas inhabited by Scheduled Tribe populations.

---

## 4. Existing 22-Rule Verification Matrix

| Existing Rule | Current Code Implementation | Phase 2 Classification | Verified Classification | Official Policy Basis | Exact Clause | Verified Correct? | Required Change | Policy Justification |
|---|---|---|---|---|---|---|---|---|
| `disbursement_mismatch` | `abs(amt_dis - disbursed) / sanction > 0.10` | Internal Control | **INTERNAL_CONTROL** | GFR Public Accounts | Rule 139 | **CORRECT** | Convert to continuous metric; guard zero denominator | Legitimate reconciliation check; not a statutory violation. |
| `negative_sanction` | `sanction_amount < 0` | Financial | **DATA_QUALITY** | Portal Data Integrity | N/A | **CORRECT** | Route to Data Quality Engine; exclude from risk priority | Clerical portal artifact, not intentional fraud. |
| `zero_sanction_with_payments` | `sanction <= 0 and disbursed > 0` | Financial | **HARD_COMPLIANCE** | Administrative Sanction Precondition | Ch 4, Para 4.6 | **CORRECT** | Implement as `MPLADS23-FIN-001` with `FAIL` state | Direct violation of Para 4.6 prohibition. |
| `cost_outlier` | `peer_count >= 8 and abs(MAD) > 4.0` | Financial | **AUDIT_HEURISTIC** | Statistical Distribution | None | **CORRECT** | Use continuous deviation; require peer confidence threshold | Purely statistical; $4\sigma$ is an empirical heuristic. |
| `over_utilization` | `disbursed / sanction > 1.05` | Financial | **INTERNAL_CONTROL** | GFR Cost Overrun Controls | GFR Rule 130 | **INCORRECT (in Phase 2 claim)** | Remove 5% statutory claim; label as budget control | 2023 Guidelines contain no 5% tolerance clause. |
| `impossible_timeline` | `completion < sanction` | Timeline | **DATA_QUALITY** | Chronological Sequencing | N/A | **CORRECT** | Move to Data Quality Engine | Clerical sequencing inversion; cannot represent actual work delivery. |
| `rapid_completion` | `completion - sanction < 15 days` | Timeline | **AUDIT_HEURISTIC** | Project Execution Heuristic | None | **CORRECT** | Soften label to execution velocity; category-aware | 15 days is an arbitrary heuristic without statutory backing. |
| `payment_after_completion` | `last_exp - completion > 30 days` | Timeline | **AUDIT_HEURISTIC** | Contractual Retention Practice | None | **CORRECT** | Broaden tolerance to 180 days for retention payments | 30 days is overly tight for standard 6-month defect liability periods. |
| `stuck_status` | `early status and days > 180` | Timeline | **AUDIT_HEURISTIC** | Operational Stagnation | None | **CORRECT** | Make category-relative; label as administrative follow-up | 180 days is an empirical monitoring cutoff. |
| `stuck_payment` | `disbursed and no comp and days > 90` | Timeline | **AUDIT_HEURISTIC** | Financial Dormancy | None | **CORRECT** | Label as dormant disbursement follow-up | 90 days is a financial monitoring threshold. |
| `duplicate_across_mp` | `Jaccard >= 0.72 and cross_mp` | Duplicate | **AUDIT_HEURISTIC** | Ghost-Work Screening | None | **CORRECT** | Require multi-factor corroboration (amount/location) | Text similarity alone yields false positives on common public works. |
| `duplicate_description` | `Jaccard >= 0.72 and same_mp` | Duplicate | **AUDIT_HEURISTIC** | Repeat Claim Screening | None | **CORRECT** | Require structured entity corroboration | Common project names ("Ward road repair") are not duplicates. |
| `vendor_concentration` | `vendor_share_in_state > 0.30` | Vendor | **AUDIT_HEURISTIC** | Procurement Concentration | None | **CORRECT** | Measure financial exposure (₹), not work count | Work counts penalize specialized low-cost equipment providers. |
| `vendor_dominates_mp` | `vendor_share_per_mp >= 0.60` | Vendor | **AUDIT_HEURISTIC** | Contractor Dependency | None | **CORRECT** | Adjust for remote/island district availability | Remote constituencies legitimately rely on 1-2 capable contractors. |
| `vendor_multi_mp` | `vendor_mp_count >= 3` | Vendor | **AUDIT_HEURISTIC** | Multi-Constituency Contracting | None | **INCORRECT (in current design)** | Drop standalone penalty; use only in compound patterns | Established engineering firms routinely execute works across multiple urban MPs. |
| `missing_vendor` | `disbursed > 0 and vendor is null` | Vendor | **DATA_QUALITY** | Voucher Completeness | Ch 4, Para 4.8 | **CORRECT** | Route to Data Quality Engine | Incomplete voucher metadata, not proof of non-execution. |
| `over_allocation` | `sum(sanction) > alloc * 1.05` | Compliance | **HARD_COMPLIANCE** | Statutory Entitlement Cap | Ch 2, Para 2.1 | **CORRECT** | Guard multi-year carry-forward; default to `UNKNOWN` if balance missing | Valid statutory limit, but requires multi-year baseline data. |
| `trust_society_routing` | `category in ['Trust and Society']`| Compliance | **AUDIT_HEURISTIC** | Chapter 6 Ceiling Compliance | Ch 6, Para 6.2 | **INCORRECT (in current design)** | Evaluate specifically against ₹50L annual & ₹1Cr tenure caps | Trust works are expressly permitted under Chapter 6; blanket flagging is false. |
| `completed_without_image` | `completed and image != True` | Compliance | **DATA_QUALITY** | e-SAKSHI Upload Verification | Ch 7, Para 7.3 | **CORRECT** | Label as portal evidence gap; do not claim asset absent | Photo upload is an administrative reporting requirement. |
| `ida_budget_capture` | `ida_budget_share > 0.40` | Geographic | **AUDIT_HEURISTIC** | District Budget Concentration | None | **CORRECT** | Exempt major municipal corporations (BMC, KMC) | Urban municipal corporations naturally process large volumes. |
| `ida_vendor_monopoly` | `ida_vendor_conc >= 0.80` | Geographic | **AUDIT_HEURISTIC** | Agency Contractor Concentration | None | **CORRECT** | Corroborate with total IDA disbursement volume | Pattern signal for single-source procurement reviews. |
| `ida_mp_cluster` | `ida_mp_count >= 4` | Geographic | **AUDIT_HEURISTIC** | Agency MP Clustering | None | **CORRECT** | Exempt metropolitan districts | City IDAs serve all MPs overlapping the metropolitan jurisdiction. |

---

## 5. Corrected Rule Registry Specification

Below is the verified, implementation-ready JSON schema for the rule registry:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "MPLADSRuleRegistryEntry",
  "type": "object",
  "required": [
    "rule_id", "version", "effective_from", "rule_type", "category",
    "legal_strength", "title", "description", "guideline_clause",
    "required_fields", "automatable_status", "severity", "state_criteria",
    "evidence_requirements", "auditor_verification"
  ],
  "properties": {
    "rule_id": { "type": "string", "pattern": "^MPLADS23-[A-Z]+-[0-9]{3}$" },
    "version": { "type": "string", "enum": ["MPLADS_2023"] },
    "effective_from": { "type": "string", "format": "date" },
    "effective_to": { "type": ["string", "null"] },
    "rule_type": { "type": "string", "enum": ["HARD_COMPLIANCE", "FINANCIAL_CONTROL", "AUDIT_HEURISTIC", "DATA_QUALITY"] },
    "category": { "type": "string", "enum": ["JURISDICTION", "FINANCIAL_CONTROL", "TRUST_SOCIETY", "PROHIBITED_WORKS", "TIMELINE_PATTERN", "PROCUREMENT_PATTERN", "DATA_INTEGRITY", "ADVISORY_TARGET"] },
    "legal_strength": { "type": "string", "enum": [
      "MANDATORY_PROHIBITION", "MANDATORY_REQUIREMENT", "MANDATORY_FINANCIAL_LIMIT",
      "MANDATORY_PROCEDURAL_REQUIREMENT", "ADVISORY", "INTERNAL_CONTROL",
      "AUDIT_HEURISTIC", "DATA_QUALITY"
    ]},
    "title": { "type": "string" },
    "description": { "type": "string" },
    "guideline_clause": { "type": "string" },
    "guideline_page": { "type": ["integer", "null"] },
    "required_fields": { "type": "array", "items": { "type": "string" } },
    "optional_fields": { "type": "array", "items": { "type": "string" } },
    "automatable_status": { "type": "string", "enum": ["FULLY_AUTOMATABLE", "PARTIALLY_AUTOMATABLE", "NOT_AUTOMATABLE_WITH_CURRENT_DATA"] },
    "severity": { "type": "string", "enum": ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"] },
    "exceptions": { "type": "array", "items": { "type": "string" } },
    "state_criteria": {
      "type": "object",
      "required": ["pass", "fail", "review", "unknown", "not_applicable"],
      "properties": {
        "pass": { "type": "string" },
        "fail": { "type": "string" },
        "review": { "type": "string" },
        "unknown": { "type": "string" },
        "not_applicable": { "type": "string" }
      }
    },
    "evidence_requirements": {
      "type": "object",
      "required": ["tier_required", "primary_evidence_fields"],
      "properties": {
        "tier_required": { "type": "integer", "minimum": 1, "maximum": 5 },
        "primary_evidence_fields": { "type": "array", "items": { "type": "string" } },
        "corroborating_fields": { "type": "array", "items": { "type": "string" } }
      }
    },
    "data_gap_indicator": { "type": ["string", "null"] },
    "auditor_verification": { "type": "array", "items": { "type": "string" } }
  }
}
```

---

## 6. Statutory vs Control vs Heuristic Matrix

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. HARD COMPLIANCE (Direct Statutory Violations — Legally Grounded in 2023 Guidelines)           │
│ • MPLADS23-JUR-001: Lok Sabha Constituency Jurisdiction (Ch 3, Para 3.2)                         │
│ • MPLADS23-JUR-002: Rajya Sabha State Jurisdiction (Ch 3, Para 3.3)                              │
│ • MPLADS23-FIN-001: Disbursement without Administrative Sanction (Ch 4, Para 4.6)                 │
│ • MPLADS23-FIN-003: Annual MP Allocation Ceiling of ₹5 Crore (Ch 2, Para 2.1)                    │
│ • MPLADS23-SOC-001: Annual Trust/Society Ceiling of ₹50 Lakh (Ch 6, Para 6.2)                    │
│ • MPLADS23-SOC-002: Single Trust Tenurial Ceiling of ₹1 Crore (Ch 6, Para 6.3)                   │
│ • MPLADS23-PROH-001 to 006: Prohibited Works Negative List (Annexure-II)                         │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. FINANCIAL CONTROLS (Public Accounting & GFR Budget Reconciliation)                            │
│ • MPLADS23-FIN-002: Expenditure Exceeding Sanctioned Budget without Revised Sanction (GFR 130)   │
│ • MPLADS23-FIN-004: Voucher Payment Sum Diverging from Total Disbursed (Internal Accounting)     │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 3. AUDIT HEURISTICS (Statistical, Procurement & Velocity Patterns — NOT Direct Scheme Breaches)  │
│ • Cost Deviation (>3.5σ Robust MAD vs State+Category Peers)                                      │
│ • Vendor Monetary Exposure Concentration in State / MP                                           │
│ • Multi-Factor Duplicate Work Candidate Screening                                                │
│ • Operational Stagnation (>180 days in preliminary workflow stage)                               │
│ • Unusual Completion Velocity (<15 days from sanction)                                           │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 4. DATA QUALITY DEFECTS (Data Entry Glitches & Portal Sync Gaps — Excluded from Fraud Scores)    │
│ • Negative Financial Numbers (`sanction_amount < 0`)                                             │
│ • Chronological Sequence Inversions (`completion_date < sanction_date`)                         │
│ • Missing Portal Upload Photo Marker (`image_marker != True`)                                    │
│ • Incomplete Vendor Attribution in Payment Sub-Record                                            │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Exception Matrix

Every statutory check must evaluate applicable exceptions before registering a violation:

| Rule ID | General Statutory Rule | Statutory Exception | Exception Authority | Machine Implementation Logic | Required Evidence for Exception |
|---|---|---|---|---|---|
| `MPLADS23-JUR-001` | Lok Sabha MP must recommend works strictly inside constituency. | Severe natural calamity in another district/state (up to ₹1.00 Cr). | Chapter 5, Para 5.1 & 5.2 | If `calamity_type` is present or description references disaster order, set status to `NOT_APPLICABLE` for jurisdiction rule and evaluate `MPLADS23-SPEC-003`. | Official Disaster Notification Order |
| `MPLADS23-JUR-001` | Lok Sabha MP must recommend works strictly inside constituency. | SC/ST population shortfall flexibility (recommending in SC/ST area of same State). | Chapter 3, Para 3.5 | If MP's constituency has negligible SC/ST population, work in SC/ST pocket of state evaluates to `REVIEW` with note rather than `FAIL`. | District Census SC/ST percentage certificate |
| `MPLADS23-PROH-001`| Prohibition on office/administrative buildings. | Village Panchayat Ghars, Anganwadi Centres, and Railway Halt Stations. | Annexure-II, Item 1 | NLP whitelist: Descriptions containing "Panchayat Ghar", "Anganwadi", or "Halt Station" are exempt from commercial office failure. | Standard work type code |
| `MPLADS23-PROH-002`| Prohibition on works inside religious premises. | Common public crematoriums, burial grounds, and community electricity/water infrastructure. | Annexure-II, Item 2 | NLP whitelist: Terms matching "crematorium", "burial ground", "kabristan", "shamshan ghat" are exempt from religious premise failure. | Work type and revenue land title |
| `MPLADS23-PROH-004`| Prohibition on individual beneficiary grants and equipment. | Specialized assistive aids and appliances for Divyangjan (differently-abled persons). | Annexure-II, Item 7 & Ch 3, Para 3.6 | Assistive aid distribution (tricycles, hearing aids) via ALIMCO is exempt from individual aid prohibition. | ALIMCO / Social Welfare agency code |
| `MPLADS23-SOC-001` | Prohibition on works on private property. | Registered public-spirited Trusts/Societies meeting Darpan criteria (up to ₹50L/year). | Chapter 6, Para 6.1 & 6.2 | Works under category "Trust and Society" are permissible up to ₹50 Lakh; evaluate against ceiling rather than flagging as violation. | Darpan ID and non-profit registration |

---

## 8. Data Availability Matrix

| Target Field | Source Column in Pipeline | Completeness in 6,938 Rows | Usable for Compliance? | Impact on Engine if Missing |
|---|---|---|---|---|
| `work_id` | `work_id` | 98.1% | **Yes** | Missing rows dropped (131 allocation rows). |
| `state` | `state` | 100% | **Yes** | Fully usable for state jurisdiction checks. |
| `constituency` | `constituency` | 100% | **Yes** | Usable for Lok Sabha territory checks. |
| `house` | `house` | 100% | **Yes** | Governs rule applicability (LS vs RS vs Nominated). |
| `mp_name` | `mp_name` | 100% | **Yes** | Primary entity key for MP annual ceiling checks. |
| `ida` | `ida` | 98.1% | **Yes** | Identifies implementing district agency. |
| `work_category` | `work_category` | 59.0% | **Partial** | When null, category-specific rules evaluate to `UNKNOWN`. |
| `work_type` | `work_type` | 98.1% | **Yes** | Provides standardized activity classification. |
| `work_description` | `work_description` | 98.1% | **Partial** | Free text; enables candidate screening, but cannot prove ownership. |
| `sanction_amount` | `sanction_amount` | 21.6% (1,500 rows) | **Yes** | Baseline for financial control evaluations. |
| `total_fund_disbursed` | `total_fund_disbursed` | 100% (after join) | **Yes** | Core baseline for expenditure and utilization. |
| `sanction_date` | `sanction_date` | 21.6% (1,500 rows) | **Partial** | Missing dates force timeline rules to `UNKNOWN`. |
| `completion_date` | `completion_date` | 15.8% (1,093 rows) | **Partial** | Populated only for completed works. |
| `expenditure_date` | `expenditure_date` | 39.1% (2,714 rows) | **Partial** | Required for payment stagnation rules. |
| `image_marker` | `image_marker` | 15.8% (1,093 rows) | **Data Quality** | Assesses portal evidence attachment presence. |
| *Land Ownership Title* | *None* | **0.0%** | **NO** | Mandatory `DATA_GAP = "LAND_OWNERSHIP_UNAVAILABLE"`. |
| *NOC / Title Deed* | *None* | **0.0%** | **NO** | Cannot determine private land status. |
| *Darpan Portal ID* | *None* | **0.0%** | **NO** | Mandatory `DATA_GAP = "TRUST_DARPAN_ID_UNAVAILABLE"`. |
| *Trustee Relation Disclosure*| *None* | **0.0%** | **NO** | Cannot automate conflict-of-interest checks. |
| *GPS Coordinates* | *None* | **0.0%** | **NO** | Distance-based duplicate detection not possible via portal. |
| *Tender Notice / Bids* | *None* | **0.0%** | **NO** | Competitive procurement cannot be evaluated; vendor concentration is heuristic only. |
| *Census SC/ST Tag* | *None* | **0.0%** | **NO** | SC/ST allocation tracking must output `UNKNOWN`. |
| *Physical Inspection Cert* | *None* | **0.0%** | **NO** | 10% DA physical inspection compliance is not in feed. |

---

## 9. Automation Matrix

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ FULLY AUTOMATABLE (Deterministic Output from Structured Fields)                                  │
│ • MPLADS23-JUR-001 (Lok Sabha Constituency Territory Match)                                      │
│ • MPLADS23-JUR-002 (Rajya Sabha State Territory Match)                                           │
│ • MPLADS23-FIN-001 (Disbursement without Sanction: sanction <= 0 & disbursed > 0)               │
│ • MPLADS23-FIN-002 (Expenditure Overrun: disbursed > sanction)                                   │
│ • MPLADS23-FIN-003 (MP Annual Ceiling: aggregate sanctions > ₹5.00 Cr, when balance known)      │
│ • MPLADS23-FIN-004 (Voucher Reconciliation: abs(amount_disbursed - total_disbursed) > 10%)      │
│ • MPLADS23-SOC-001 (Trust Annual Cap: cumulative annual trust recommendations > ₹50 Lakh)       │
│ • MPLADS23-DQ-001  (Chronological Sequence: completion_date < sanction_date)                     │
│ • MPLADS23-DQ-002  (Negative Sanction: sanction_amount < 0)                                      │
│ • MPLADS23-DQ-003  (Portal Photo Upload Marker Presence)                                         │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ PARTIALLY AUTOMATABLE (Produces PASS / REVIEW / UNKNOWN Candidates via Structured NLP)          │
│ • MPLADS23-PROH-001 (Commercial / Private Premises Screening)                                    │
│ • MPLADS23-PROH-002 (Places of Religious Worship Screening)                                      │
│ • MPLADS23-PROH-003 (Statues & Memorials Screening)                                             │
│ • MPLADS23-PROH-004 (Direct Grants & Loans Screening)                                           │
│ • MPLADS23-SOC-002 (Single Trust Tenurial ₹1.00 Cr Tracking — requires entity name resolution)   │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ NOT AUTOMATABLE WITH CURRENT DATA (Must strictly output UNKNOWN with explicit DATA_GAP)          │
│ • MPLADS23-SOC-004 (Trust Darpan Registration & 3-Year Operational Age)                          │
│ • MPLADS23-SOC-005 (Conflict of Interest / Family-Managed Trust Prohibition)                    │
│ • MPLADS23-ADV-001 (Mandated 15% SC Population Allocation Tracking)                             │
│ • MPLADS23-ADV-002 (Mandated 7.5% ST Population Allocation Tracking)                            │
│ • Land Ownership / Non-Encumbrance Verification                                                  │
│ • Competitive Public Procurement / Tender Process Verification                                   │
│ • Mandatory 10% District Authority Physical Inspection Tracking                                 │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Inspection & Monitoring Requirements (Chapter 7)

The 2023 Guidelines establish strict monitoring obligations that must be represented in the audit engine's verification directives:

1. **District Authority 10% Inspection (Para 7.1)**:
   * *Requirement*: The District Authority must physically inspect at least **10% of all works** implemented under the scheme every year.
   * *Dataset Feasibility*: `NO`. The portal API does not expose inspection visit logs or officer sign-off dates.
   * *Engine Output*: `UNKNOWN` with `DATA_GAP = "DA_PHYSICAL_INSPECTION_LOG_UNAVAILABLE"`.
   * *Auditor Action*: Request the District Collector / DPO's annual 10% inspection register.
2. **State Nodal Department 1% Inspection (Para 7.2)**:
   * *Requirement*: State Government officers must inspect at least **1% of all works** annually.
   * *Dataset Feasibility*: `NO`.
   * *Engine Output*: `UNKNOWN` with `DATA_GAP = "STATE_INSPECTION_LOG_UNAVAILABLE"`.
3. **Mandatory Inscription Plaque (Para 7.4)**:
   * *Requirement*: A plaque must be permanently erected at the site of the asset displaying: *"Member of Parliament Local Area Development Scheme Work"*, name of the MP, year of sanction, and sanctioned cost.
   * *Dataset Feasibility*: `PARTIAL` (Photo marker exists, but image content cannot be OCR-verified via text export).
   * *Engine Output*: If `image_marker` is false, output `REVIEW` with verification action to verify plaque inscription on site.

---

## 11. Historical & Transitional Rules

The engine must support temporal versioning to avoid penalizing historical works under newer rules:

* **Boundary Date**: **1 April 2023**.
* **Pre-2023 Works (`sanction_date < 2023-04-01`)**:
  * Governed by **MPLADS Guidelines 2016**.
  * CNA Single-Installment rules do **not** apply retroactively; works operated under the previous district-level account system.
  * Trust allocation caps under 2016 guidelines permitted up to ₹50 Lakh lifetime per trust.
  * *Engine Handling*: If `sanction_date < 2023-04-01`, set `version = "MPLADS_2016"`.
* **Post-2023 Works (`sanction_date >= 2023-04-01`)**:
  * Governed strictly by **MPLADS Guidelines 2023**.
  * e-SAKSHI web-portal procedures and CNA single-installment rules apply.
* **Missing Sanction Dates**:
  * If `sanction_date` is missing/null, the engine cannot establish the governing regime with certainty. It must evaluate using 2023 rules but tag `TRANSITIONAL_UNCERTAINTY = True`.

---

## 12. Open Policy Questions & Structural Edge Cases

1. **Constituency Delimitation & Territory Mapping**:
   * *Question*: Urban parliamentary constituencies frequently do not align cleanly with District Authority (IDA) boundaries. An MP representing South Delhi may have works executed by the Municipal Corporation of Delhi (MCD) across shared zones.
   * *Engine Guardrail*: Territorial mismatches flag `REVIEW` for geographic boundary confirmation; they do not trigger a statutory `FAIL`.
2. **Nominated MP Geographic Scope**:
   * *Question*: Nominated MPs have nationwide recommendation scope.
   * *Engine Guardrail*: If `house` is Nominated or `constituency` contains "Nominated", all territorial rules (`MPLADS23-JUR-001` and `002`) immediately evaluate to `NOT_APPLICABLE`.
3. **Bar Associations Treatment**:
   * *Question*: Are Bar Associations treated identically to public welfare trusts under Chapter 6?
   * *Engine Guardrail*: Chapter 6, Para 6.1 explicitly references *"Trusts, Societies, Cooperative Societies and Bar Associations"*. Therefore, Bar Associations are subject to the ₹50.00 Lakh annual ceiling.

---

## 13. Required Changes to Phase 2 (Audit Log of Corrections)

```text
PHASE 2 ISSUE #1
Original claim:
"Disbursement cannot exceed sanctioned budget by more than 5% statutory tolerance under Chapter 4, Para 4.7."

Official requirement:
The MPLADS 2023 Guidelines contain NO statutory 5% tolerance clause. Para 4.7 mandates execution within the sanctioned estimate. Any overrun requires a revised administrative sanction. The 5% figure was an imported GFR contingency convention.

Correction:
Reclassify Rule MPLADS23-FIN-002 from HARD_COMPLIANCE to INTERNAL_CONTROL. Remove the word "statutory tolerance" from all descriptions.

Implementation consequence:
A budget overrun of 6% is flagged as an internal budgetary variance requiring revised sanction verification, not a statutory violation of the scheme.
```

```text
PHASE 2 ISSUE #2
Original claim:
"SC (15%) and ST (7.5%) allocations are mandatory statutory requirements evaluated per work."

Official requirement:
Chapter 3, Para 3.5 uses the wording: "M.P.s are advised to recommend works costing at least 15% ... and 7.5% ... of their annual entitlement." It is an advisory annual portfolio target, not a per-work mandatory condition. Furthermore, the dataset lacks demographic census tags.

Correction:
Reclassify MPLADS23-ADV-001 and ADV-002 as ADVISORY targets. Set automatable_status to NOT_AUTOMATABLE_WITH_CURRENT_DATA.

Implementation consequence:
The engine will never output FAIL on an individual work for SC/ST quotas. It outputs UNKNOWN with DATA_GAP = "CENSUS_SC_ST_TAG_ABSENT".
```

```text
PHASE 2 ISSUE #3
Original claim:
"Missing portal photograph (completed_without_image) is a compliance rule failure."

Official requirement:
Chapter 7, Para 7.3 requires photo upload before portal completion sign-off, but portal attachment omission frequently reflects IT sync latency or clerical delay, not proof that the asset was not constructed.

Correction:
Reclassify Rule MPLADS23-DQ-003 to DATA_QUALITY. Exclude it from risk score likelihood.

Implementation consequence:
Missing images generate a specific verification directive ("Conduct physical ground inspection") without artificially driving a work into High-Risk review tiers.
```

```text
PHASE 2 ISSUE #4
Original claim:
"Vendor serving >= 3 MPs is flagged for organised capture risk."

Official requirement:
The Guidelines contain no prohibition against qualified contractors bidding across multiple constituencies. Reputed engineering firms routinely execute works across neighboring constituencies.

Correction:
Eliminate standalone penalty for vendor_multi_mp. Relegate vendor metrics strictly to AUDIT_HEURISTIC, evaluated by financial exposure (₹), not contract counts.

Implementation consequence:
Routine public contractors working in metropolitan areas will no longer be flagged as suspicious.
```

---

## 14. Phase 3 Implementation Guardrails

The implementation agent in Phase 3 **must adhere to the following mandatory constraints**:

1. **Strict Code Boundary**: Do not modify existing API endpoints or schemas until the Data Quality Engine and Rule Registry are independently unit tested.
2. **Zero Inferred Violations**: No rule shall produce a `FAIL` verdict unless the required evidence fields are present with 100% confidence.
3. **Mandatory Data Gap Emittance**: Whenever a required field is missing or null, the rule evaluator must return `UNKNOWN` and populate `data_gap_indicator`.
4. **Isolation of Data Quality**: Data quality defects (`negative_sanction`, `impossible_timeline`) must be isolated in a separate `data_quality` payload and must not inflate the audit priority score.
5. **Neutral Audit Terminology**: All descriptions, causes, and recommended actions must use objective, non-accusatory language (e.g. *"Requires voucher reconciliation"*, never *"Fraud detected"* or *"Cartelization"*).

---

```text
PHASE 2.1 COMPLETE.

No production code was modified.

Production implementation is NOT authorized until this Phase 2.1 report has been reviewed and approved.
```
