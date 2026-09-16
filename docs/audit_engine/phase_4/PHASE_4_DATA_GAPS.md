# Phase 4 — Data Gap and Statutory Evidence Absence Analysis

**Date:** September 16, 2026  
**Standard:** MPLADS Guidelines 2023 Statutory Evidence Requirements  

---

## 1. Absolute Methodological Rule

> [!IMPORTANT]
> **`UNKNOWN` IS NOT SUSPICION.**  
> An evaluation state of `UNKNOWN` denotes that the web portal database does not capture the documentary evidence required by the official MoSPI Guidelines to make a definitive statutory finding. It must NEVER be conflated with non-compliance or fraud.

---

## 2. Portfolio Data Gap Distribution

The following statutory data gaps were evaluated across all 228,328 works:

| Data Gap Code | Rule Evaluations Affected | Affected Sanction Exposure (₹) | Associated Rules | Description |
| :--- | :--- | :--- | :--- | :--- |
| `SANCTION_RECOMMENDATION_DATES_UNAVAILABLE` | 456,656 | ₹249,014,953,370.79 | MPLADS23-FIN-003, MPLADS23-TIME-001 | Statutory evidence not integrated into MoSPI database schema |
| `CARRY_FORWARD_LEDGER_UNAVAILABLE` | 228,328 | ₹124,507,476,685.39 | MPLADS23-FIN-003 | Statutory evidence not integrated into MoSPI database schema |
| `FINANCIAL_VOUCHER_RECONCILIATION_UNAVAILABLE` | 228,328 | ₹124,507,476,685.39 | MPLADS23-FIN-004 | Statutory evidence not integrated into MoSPI database schema |
| `LAND_OWNERSHIP_EVIDENCE_UNAVAILABLE` | 228,328 | ₹124,507,476,685.39 | MPLADS23-PROH-002 | Statutory evidence not integrated into MoSPI database schema |
| `PHOTO_PLAQUE_EVIDENCE_UNAVAILABLE` | 228,328 | ₹124,507,476,685.39 | MPLADS23-MON-003 | Statutory evidence not integrated into MoSPI database schema |
| `SC_ST_CENSUS_MAPPING_UNAVAILABLE` | 228,328 | ₹124,507,476,685.39 | MPLADS23-ADV-001 | Statutory evidence not integrated into MoSPI database schema |
| `INSPECTION_LOG_UNAVAILABLE` | 117,460 | ₹69,803,639,394.73 | MPLADS23-MON-001 | Statutory evidence not integrated into MoSPI database schema |
| `DARPAN_REGISTRATION_UNAVAILABLE` | 4,248 | ₹4,256,674,689.78 | MPLADS23-SOC-002, MPLADS23-SOC-003, MPLADS23-SOC-004 | Statutory evidence not integrated into MoSPI database schema |
| `TRUSTEE_RELATION_UNAVAILABLE` | 1,416 | ₹1,418,891,563.26 | MPLADS23-SOC-005 | Statutory evidence not integrated into MoSPI database schema |

---

## 3. High-Impact Data Gaps Requiring Field Audit Integration

1. **`SANCTION_RECOMMENDATION_DATES_UNAVAILABLE` (Affects Rule `MPLADS23-TIME-001` - 228,328 works)**
   - Neither recommendation dates nor sanction dates are stored in the `works` table.
   - Auditors must inspect the physical recommendation letter and sanction order docket to verify the 45-day decision window.

2. **`LAND_OWNERSHIP_EVIDENCE_UNAVAILABLE` (Affects Rule `MPLADS23-PROH-002` - 228,328 works)**
   - Land titles, user agreements, and non-encumbrance certificates (NOC) are held at District Authority level and absent in MongoDB.

3. **`PHOTO_PLAQUE_EVIDENCE_UNAVAILABLE` (Affects Rule `MPLADS23-MON-003` - 228,328 works)**
   - Geo-tagged photographs and work plaque records are stored in external mobile services or physical registers.

4. **`CARRY_FORWARD_LEDGER_UNAVAILABLE` (Affects Rule `MPLADS23-FIN-003` - 228,328 works)**
   - Multi-year cumulative entitlement ledgers are not modeled in the single-period work record.
