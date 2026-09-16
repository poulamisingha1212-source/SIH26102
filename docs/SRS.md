# Software Requirements Specification (SRS)
## MPLADS AI Sentinel — Audit & Anomaly Prioritization System
**Project Identifier:** Ministry of Statistics and Programme Implementation (MoSPI)  
**Document Version:** 1.0.0  
**Status:** Approved for Implementation

---

## 1. Introduction

### 1.1 Purpose
MPLADS AI Sentinel is an intelligent audit-prioritization and anomaly detection web application built for the Ministry of Statistics and Programme Implementation (MoSPI). The system analyzes administrative, financial, and physical progress data across thousands of works funded under the Members of Parliament Local Area Development Scheme (MPLADS). It transforms raw transaction logs into evidence-grounded risk indicators, equipping auditors and ministry officials to identify potential irregularities, cost outliers, duplicate claims, and systemic bottlenecks with maximum explainability.

### 1.2 System Scope
The system ingests MPLADS long-format master datasets across six core administrative record types:
1. Works Recommended
2. Works Sanctioned
3. Works Completed
4. Expenditure on Completed & On-going Works
5. Calamity Consent Amount
6. MP Allocated Limit

The system does **not** make definitive judicial fraud determinations. Instead, it provides **statistical decision-support indicators and plain-language causes** to guide human auditors, district implementing authorities (IDAs), and ministry reviewers.

---

## 2. System Architecture & User Roles

### 2.1 Technology Stack
- **Backend:** Python, FastAPI, MongoDB with PyMongo driver (document persistence).
- **Risk Engine:** Multi-Agent Risk Engine (5 specialized domain agents: Financial Anomaly, Velocity Stagnation, Vendor Concentration, Keyword Anomaly, and Statutory Compliance).
- **Frontend:** React 19, Tailwind CSS, Lucide Icons, Chart.js.
- **Scheduling & Ingestion:** APScheduler running daily automated ingestion jobs + MongoDB distributed locking.
- **Security:** Server-side Role-Based Access Control (RBAC), bcrypt password hashing, JWT Bearer tokens, sliding-window rate limiting, and CORS origin restriction.

### 2.2 System Architecture Diagram
```
[MoSPI Portal / Data Export]
            │
            ▼ (Daily Ingestion / APScheduler / Distributed Lock)
[FastAPI Ingestion Service] ───► [risk_engine.py] ◄─── [Multi-Agent Risk Engine (5 Agents)]
            │                           │
            ▼                           ▼
  [sync_logs Collection]        [MongoDB Collections (works, mp_allocations, users, reviews)]
                                        │
                                        ▼ (JWT-Authenticated REST API Endpoints)
                             [React + Tailwind Frontend]
                             - Priority Queue
                             - Case Packet Detail View
                             - Portfolio Overview
                             - Review Feedback Action
                             - MP & State Transparency Directories
```

### 2.3 User Roles and Permissions
The application enforces strict Role-Based Access Control (RBAC):

1. **MoSPI Reviewer (Super Admin / Central Auditor):**
   - View all national works, filter by state, MP, IDA, category, and risk tier.
   - Inspect full case packets with raw mathematical signals and plain-language causes.
   - Submit and record formal human review outcomes (`legitimate`, `data-quality issue`, `irregularity`, `confirmed fraud`).
   - Trigger manual data synchronization runs and monitor sync health.

2. **District Authority Auditor (IDA / District Officer):**
   - Access works and case packets within their assigned state/district jurisdiction.
   - Inspect case packets, financial reconciliation signals, and vendor concentration metrics.
   - Submit preliminary audit observations and verification findings.

3. **Read-Only Public Tier (Citizen / Open Data Viewer):**
   - Access high-level portfolio overview statistics, state aggregations, and public work lists.
   - Cannot view internal investigator notes or submit/alter review outcomes.
   - Sensitive internal reviewer notes and credentials are strictly hidden.

---

## 3. Functional Requirements

### 3.1 Data Ingestion and Normalization (FR-1)
- **FR-1.1:** System shall ingest MPLADS administrative datasets and normalize column naming conventions.
- **FR-1.2:** System shall reshape long-format records around `work_id` as the primary key.
- **FR-1.3:** System shall aggregate multiple vendor expenditure records without dropping distinct payments.
- **FR-1.4:** System shall record every ingestion attempt in the `sync_log` table, capturing start time, end time, status (`success`, `partial`, `failed`), rows processed, inserted, updated, and error messages.
- **FR-1.5:** If an ingestion run fails or remote feeds are unreachable, the system must retain last-known-good data and raise a visible stale-data warning in the user interface.

### 3.2 Authoritative Risk Scoring (FR-2)
- **FR-2.1:** System shall execute the authoritative scoring formula implemented in `model/risk_engine.py`:
  $$\text{likelihood} = 0.45 \times \text{weighted\_rule\_score} + 0.30 \times \text{anomaly\_percentile} + 0.25 \times \text{model\_risk\_score}$$
  $$\text{priority} = \text{likelihood} \times \text{impact}$$
  $$\text{final\_risk\_score} = \text{percentile\_rank}(\text{priority}) \times 100$$
- **FR-2.2:** System shall maintain complete scoring consistency between `risk_engine.py`, MongoDB database, REST API, and the React frontend. Zero drift is permitted.
- **FR-2.3:** System shall categorize works into tiers: `High Risk - Review` (top 10%), `Medium Risk - Monitor` (next 20%), and `Low Risk` (remaining 70%).

### 3.3 Explainability and Case Packets (FR-3)
- **FR-3.1:** System must never display a bare risk number without its accompanying plain-language causes and recommended actions.
- **FR-3.2:** System shall generate detailed case packets via `risk_engine.generate_case_packet()`.
- **FR-3.3:** Case packet must include: Work ID, MP Name, State, Constituency, Implementing Agency (IDA), Primary Vendor, Work Category & Type, Financial breakdown (Sanction vs Expenditure vs Utilization), Risk Score, Priority Rank, Risk Tier, Triggered Rules, Anomaly Evidence, and Recommended Action.

### 3.4 Reviewer Feedback Loop (Phase 5) (FR-4)
- **FR-4.1:** Authorized reviewers can record audit outcomes via `POST /works/{work_id}/review`.
- **FR-4.2:** Allowed outcomes are: `legitimate`, `data-quality issue`, `irregularity`, and `confirmed fraud`.
- **FR-4.3:** System preserves review history and author timestamps in the `review_logs` table.

### 3.5 REST API Specifications (FR-5)
- `GET /works`: Paginated list of works supporting filtering (`state`, `mp_name`, `ida`, `risk_tier`, `work_category`) and sorting (default `priority_rank` ascending).
- `GET /works/{work_id}`: Comprehensive case packet for specific work.
- `GET /stats/overview`: National summary metrics, risk tier distribution, top-risk MPs/States/Vendors, and sync status.
- `POST /works/{work_id}/review`: Submit human review decision.
- `GET /sync/status`: Return data freshness, last sync timestamp, and staleness warning flag.
- `POST /sync/run`: Trigger manual ingestion run.

---

## 4. Non-Functional Requirements

### 4.1 Performance & Scalability (NFR-1)
- The application must effortlessly handle 79,000+ work records.
- Database queries must employ indexed lookups for `work_id`, `state`, `mp_name`, `ida`, `risk_tier`, `priority_rank`, and `final_risk_score`.
- Server-side pagination, filtering, and sorting must respond in under 200ms under standard loads.

### 4.2 Security & Integrity (NFR-2)
- Environment variables must store all database credentials and secret keys; `.env` must not be checked into version control.
- Reviewer submission endpoints must enforce RBAC.
- Parameterized SQL / ORM operations prevent SQL injection vulnerabilities.

### 4.3 Data Integrity & Governance (NFR-3)
- When the database is empty, the backend starts an initial live MPLADS sync in the background; existing records are preserved during later sync failures.
- Failed syncs must never drop or wipe existing records.
- A distinction between AI-detected risk signals and confirmed human fraud findings must be maintained at all times.
