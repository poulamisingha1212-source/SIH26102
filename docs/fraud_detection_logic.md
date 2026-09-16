# Evidence-Grounded Fraud & Anomaly Detection Typology
## MPLADS AI Sentinel
**Ministry of Statistics and Programme Implementation (MoSPI)**

---

## 1. Philosophical Foundation: Audit Prioritization vs. Fraud Verdict

A fundamental tenet of MPLADS AI Sentinel is that:
> **An AI model or statistical signal is a decision-support filter for audit prioritization; it is never proof of fraud.**

MPLADS (Members of Parliament Local Area Development Scheme) administrative data reflects complex real-world workflows involving district administrations, executing agencies, multiple contractors, and staggered public accounts. Administrative delays, data-entry errors, portal migration glitches, and emergency weather sanctions frequently create anomalies that appear identical to malfeasance on paper.

Therefore:
1. The system generates **Risk Tiers (`High Risk - Review`, `Medium Risk - Monitor`, `Low Risk`)** and **Action Directives**, not criminal charges.
2. Every risk score is strictly grounded in **plain-language causes and evidence trails**.
3. Only an authorized human auditor, after documentary examination and physical site verification, can confirm an irregularity or fraud.

---

## 2. Typology Mapping: Governance Vulnerabilities to Detection Signals

The risk engine codifies empirical findings from Comptroller and Auditor General (CAG) audit reports, administrative reviews, and public expenditure typologies:

| Typology Category | Governance Risk / Scheme Vulnerability | Detection Signals | Evidence Basis & Severity |
| :--- | :--- | :--- | :--- |
| **Financial Reconciliation** | Fund leakage; inflated completion claims; contractor over-invoicing. | `disbursement_mismatch`, `over_utilization` | **High Severity (Weight: 3)**<br>When completed amount differs substantially (>10%) from cumulative vendor disbursement logs, funds have either been diverted or expenditure reporting is incomplete. |
| **Chronological Anomaly** | Backdated approvals; ghost works certified post-facto; administrative fabrication. | `impossible_timeline` | **High Severity (Weight: 3)**<br>Completion date recorded prior to sanction date represents either fraudulent paper regularization or severe administrative data corruption. |
| **Scheme Guideline Breach** | Sanctioning works exceeding annual permissible quotas; bypassing fiscal caps. | `over_allocation`, `trust_society_routing` | **High / Moderate Severity (Weight: 3 & 2)**<br>Total sanctions exceeding MP allocated limits or routing works through private trusts/societies requires heightened scrutiny per MPLADS guidelines. |
| **Procurement & Monopoly Risk** | Bid rigging; preferred contractor cartels; vendor favoritism. | `vendor_concentration`, `missing_vendor` | **Moderate Severity (Weight: 2 & 1)**<br>Single vendor monopolizing >30% of works within a state or omitting vendor records altogether signals non-competitive procurement. |
| **Cost Inflation / Skimming** | Cost estimates grossly inflated relative to peers; kickbacks. | `cost_outlier` | **Moderate Severity (Weight: 2)**<br>Calculated using median and Median Absolute Deviation (MAD) against peer works of identical category and type within the same state. |
| **Duplicate & Ghost Works** | Double billing for identical works; reusing previous project photos/descriptions. | `duplicate_description`, `duplicate_work_id` | **Moderate Severity (Weight: 2)**<br>Text-similarity (TF-IDF + Cosine distance) and exact identifier duplicates within 90-day windows flag potential repeat claims. |
| **Stagnant Implementation** | Funds parked in escrow; non-execution of approved works; contractor abandonment. | `stuck_status`, `stuck_payment` | **Monitoring Severity (Weight: 1)**<br>Works languishing in preliminary stages (Physical Inspection, Time Estimation) >180 days or pending disbursements >90 days. |

---

## 3. Severity Weighting and Normalization

### 3.1 Deterministic Rule Score
Each rule is assigned an evidence-backed weight reflecting CAG audit severity:
$$\text{weighted\_rule\_score} = \frac{\sum_{i} \mathbb{I}(\text{rule}_i) \times \text{weight}_i}{\text{MAX\_SEVERITY\_SCORE}}$$
Where $\text{MAX\_SEVERITY\_SCORE} = \sum \text{weight}_i = 28$.

### 3.2 Unsupervised Anomaly Detection (Isolation Forest)
### 3.2 Statistical Anomaly Detection & Multi-Agent Architecture
Rather than relying on uninterpretable black-box weights or ungrounded model artifacts, the platform utilizes a **Deterministic Multi-Agent Risk Engine** (`model/agents/`):
- **Financial Anomaly Agent (`financial.py`):** Detects disbursement mismatches, extreme cost MAD outliers, and round-figure transaction anomalies.
- **Velocity & Stagnation Agent (`velocity.py`):** Flags delayed execution, dormant sanctioned funds, and temporal clustering.
- **Vendor Concentration Agent (`vendor.py`):** Evaluates single-vendor monopolization, contract splitting, and high-frequency repeat awards.
- **Keyword & Description Agent (`keyword.py`):** Scans for vague project descriptions and high-risk procurement terminology.
- **Statutory Compliance Agent (`compliance.py`):** Enforces statutory MPLADS limits, MP tenure thresholds, and category allocation rules.

Multi-dimensional anomaly percentiles (`anomaly_percentile`) and domain agent weighted rule scores (`weighted_rule_score`) are aggregated transparently with complete explainability causes generated for audit case packets.

---

## 4. The Unified Risk-Score Formula

The authoritative unified formula synthesizes all three pillars into a single transparent priority index:

$$\text{likelihood} = 0.45 \times \text{weighted\_rule\_score} + 0.30 \times \text{anomaly\_percentile} + 0.25 \times \text{model\_risk\_score}$$

$$\text{priority} = \text{likelihood} \times (0.5 + 0.5 \times \text{impact})$$

$$\text{final\_risk\_score} = \text{percentile\_rank}(\text{priority}) \times 100$$

- **Likelihood:** "How many distinct risk and anomaly signals are present?"
- **Impact:** "What is the financial magnitude of public money involved?"
- **Priority:** Elevates high-risk cases that also involve substantial public funds.

---

## 5. Limitations & Caveats

1. **Text & Photo Markers:** The `Image` marker in portal exports is a textual flag indicating attachment presence, not computer-vision accessible imagery. Image-based duplicate detection is therefore flagged as a known data gap.
2. **Annual vs. All-Time Allocations:** Unless the source data breaks down annual allocations per MP, allocation cap checks evaluate cumulative multi-year totals.
3. **Data Freshness:** Administrative updates depend on district entries into eSAKSHI. A lack of recent expenditure records may reflect reporting latency rather than project abandonment.
