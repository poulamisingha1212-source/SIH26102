---
title: MPLADS AI Sentinel
sdk: docker
app_port: 7860
---

# MPLADS AI Sentinel — Audit & Anomaly Prioritization Platform
**MoSPI** — Ministry of Statistics and Programme Implementation

---

## 1. What MPLADS AI Sentinel Does

**MPLADS AI Sentinel** is an AI-assisted audit prioritization and decision-support web platform designed for **MoSPI**. It systematically surfaces potential irregularities, cost outliers, duplicate claims, stagnant implementation, and procurement concentration across works executed under the **Members of Parliament Local Area Development Scheme (MPLADS)**.

> **Crucial Explainability Principle:**  
> The system produces **Risk Tiers (`High Risk - Review`, `Medium Risk - Monitor`, `Low Risk`)** and **Action Directives**, not definitive criminal verdicts. An AI flag is a decision-support filter for audit inspection; only authorized human reviewers can confirm an irregularity or fraud.

---

## 2. Project Architecture

```
project-root/
├── docs/
│   ├── SRS.md                      # Software Requirements Specification (aligned to MongoDB & 5-Agent Engine)
│   └── fraud_detection_logic.md    # Evidence-grounded typology & multi-agent signal mapping
│
├── model/
│   ├── risk_engine.py              # Risk scoring coordinator & case packet generator
│   └── agents/                     # Multi-Agent Risk Engine:
│       ├── coordinator.py          # Orchestrates agent pipeline and weights
│       ├── financial.py            # Financial & disbursement anomaly agent
│       ├── velocity.py             # Stagnation & milestone velocity agent
│       ├── vendor.py               # Vendor procurement concentration agent
│       ├── keyword.py              # High-risk description & keyword anomaly agent
│       └── compliance.py           # Guideline & statutory compliance agent
│
├── data/
│   ├── mplads_raw_sample.csv       # Reference schema sample for tests and offline replay
│   └── last_live_feed.csv          # Local live-sync cache (bounded atomic write)
│
├── backend/
│   ├── config.py                   # Pydantic & environment configuration
│   ├── database.py                 # PyMongo MongoDB client, collections & TTL index setup
│   ├── models.py                   # Domain data helpers & UTC normalization
│   ├── schemas.py                  # Pydantic REST API schemas & request validation
│   ├── auth.py                     # Bcrypt hashing, JWT tokens, rate limiting & server-side RBAC
│   ├── seeder.py                   # Idempotent database seeder & user initialization
│   ├── main.py                     # FastAPI REST API application & lifespan management
│   └── services/
│       ├── ingestion.py            # Portal ingestion pipeline, distributed lock & sync logging
│       ├── mplads_live.py          # Live portal client (requests session & cookies)
│       └── analytics.py            # MP/state directories, portfolio analytics & CSV streaming
│
├── frontend/                       # React + Tailwind CSS Dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                 # Accessible UI primitives (button, dialog, card, etc.)
│   │   │   ├── Header.jsx          # MoSPI branding, system status pill, login trigger
│   │   │   ├── LoginModal.jsx      # JWT authentication modal (no client role selection)
│   │   │   ├── PriorityQueue.jsx   # Default view ordered by priority rank
│   │   │   ├── CasePacketModal.jsx # Detailed dossier with review & citizen verification
│   │   │   ├── PortfolioOverview.jsx # Macro metrics, charts & entity risk ranking
│   │   │   ├── MPDirectory.jsx     # Public MP fund directory (sortable table)
│   │   │   ├── MPProfileModal.jsx  # Per-MP transparency dossier
│   │   │   ├── StatesView.jsx      # State-wise directory & profiles
│   │   │   ├── CompareView.jsx     # Side-by-side MP comparison
│   │   │   └── SyncLogsView.jsx    # Audit logs and governance disclosure
│   │   ├── lib/
│   │   │   ├── api.js              # apiFetch wrapper with automatic JWT Bearer injection
│   │   │   └── chart.js            # Chart.js light-theme defaults
│   │   ├── App.jsx                 # Stateful application coordinator
│   │   └── index.css               # Design tokens & glassmorphism theme
│   └── vite.config.js              # Vite bundler configuration
│
└── tests/
    ├── conftest.py                 # Isolated test database setup & fixtures
    ├── test_api.py                 # REST API, directory & analytics tests
    ├── test_risk_engine.py         # 5-Agent risk engine & zero-drift scoring tests
    ├── test_security_regression.py # 8-vector security attack regression suite
    └── test_ingestion_regression.py# Ingestion, pandas merge & locking regression suite
```

---

## 3. Public Transparency & Governance API

The backend exposes citizen-facing transparency views alongside protected auditor workflows (all under `/api`):

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/auth/login` | POST | Public | Authenticates credentials, verifies bcrypt hash, returns JWT access token. |
| `/api/works` | GET | Public | Paginated works list sorted by priority rank. Filterable by state, MP, house, tier. |
| `/api/works/{work_id}` | GET | Public | Full case packet detail, explainability causes, prior audits & citizen reports. |
| `/api/works/{work_id}/review` | POST | **JWT (Reviewer/Auditor)** | Records formal audit determination. Server-side role authoritative. |
| `/api/works/{work_id}/public-review` | POST | Public (Rate Limited) | Citizen verification feedback (1.5MB photo upload cap, format verified). |
| `/api/mps` | GET | Public | MP directory: allocations, disbursed totals, utilization %, avg & max risk score. |
| `/api/mps/{mp_name}` | GET | Public | Detailed MP transparency dossier: category splits, top risk works. |
| `/api/states` | GET | Public | State-wise aggregation and MP coverage statistics. |
| `/api/states/{state}` | GET | Public | State dossier: tier spread, top MPs, category distributions. |
| `/api/analytics/categories` | GET | Public | Fund share and risk distribution per work category. |
| `/api/analytics/status` | GET | Public | Execution status distribution (Completed, Ongoing, Sanctioned). |
| `/api/export/works` | GET | Public (Rate Limited) | Open-data CSV export stream (capped at 10,000 rows, 10 req/min). |
| `/api/sync/run` | POST | **JWT (MoSPI Reviewer)** | Dispatches background ingestion with distributed lock. |
| `/api/sync/status` | GET | Public | Ingestion pipeline health, last sync time, staleness check. |
| `/api/sync/logs` | GET | Public | Audit log of all past synchronization runs. |
| `/api/health` | GET | Public | Service health probe (database connectivity, total works count). |

---

## 4. Security Architecture & Hardening

1. **Server-Side Role-Based Access Control (RBAC):**
   - Client-sent `X-User-Role` headers are **completely rejected**.
   - User identity and role are strictly derived from signed JWT Bearer tokens validated against MongoDB.
   - Self-elevation attempts via `target_role` are ignored.
2. **Password Hashing:**
   - Passwords are encrypted using **bcrypt** with a cost factor of 12. Plaintext passwords and hashes are never returned via API responses.
3. **Throttling & Rate Limiting:**
   - Sliding-window rate limiters prevent brute-force attacks on `/api/auth/login` (5 attempts per minute).
   - Citizen verification submissions (`/public-review`) and open-data exports (`/export/works`) are rate-limited per IP.
4. **Payload & Abuse Protection:**
   - Citizen review image uploads are capped at 1.5MB (2,000,000 characters base64) and validated for MIME image types (JPEG, PNG, WEBP).
   - CSV export has a strict upper bound of 10,000 rows.
5. **CORS Hardening:**
   - Production environments restrict CORS to explicit origin domains; wildcard `*` with credentials is fully disallowed.
6. **Distributed Locking:**
   - MongoDB-backed distributed lock (`distributed_locks` collection with TTL index) prevents race conditions and overlapping ingestion across worker processes.

---

## 5. How to Install Dependencies

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- MongoDB 6.0+ (Local MongoDB Community or MongoDB Atlas URI)

### Backend Setup
```bash
# In the repository root:
pip install -r requirements.txt
```

### Frontend Setup
```bash
cd frontend
npm ci
```

---

## 6. Environment Configuration

Create a `.env` file in the project root:
```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
MONGO_DB_NAME=mplads_sentinel

# Security & Authentication
ENVIRONMENT=development
JWT_SECRET=your-secure-random-secret-key-at-least-32-chars-long!
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Initial Demo Accounts (seeded only in development)
DEMO_ADMIN_USER=admin
DEMO_ADMIN_PASSWORD=Admin@MPLADS2026!
DEMO_AUDITOR_USER=auditor
DEMO_AUDITOR_PASSWORD=Auditor@MPLADS2026!

# CORS & Server Settings
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
PORT=8000
```

---

## 7. Running the Application

### 1. Database Initialization & Seeder
```bash
python -m backend.seeder
```

### 2. Start the Backend Server
```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### 3. Start the Frontend Application
```bash
cd frontend
npm run dev
```
Access the application at `http://localhost:5173`.

---

## 8. Running Automated Tests

The test suite runs against an isolated mock database (`mongomock`) by default, preventing any modification to production or local data:

```bash
# Run all unit, integration, and security regression tests:
pytest -v

# Run frontend build and linter checks:
cd frontend
npm run build
npm run lint
```
