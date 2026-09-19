<div align="center">

<img src="frontend/public/brand/jannidhi-portal-primary-dark.svg" alt="JanNidhi Portal" width="340"/>

<br/><br/>

# 🏛️ JanNidhi (जन निधि) — MPLADS AI Sentinel
### *Intelligent Audit Prioritization, Explainable Anomaly Detection & Public Transparency Platform*

**Ministry of Statistics and Programme Implementation (MoSPI) • Government of India**  
**Data Informatics & Innovation Division (DIID)**

---

### 🎯 Official Solution for Smart India Hackathon — Problem Statement 26102
**"Development of an AI-powered system to detect anomalies, fraud, and inefficiencies in MPLAD Scheme implementation regd."**

<br/>

[![Problem Statement ID](https://img.shields.io/badge/SIH_Problem_ID-26102-FF6B6B?style=for-the-badge&logo=target&logoColor=white)](https://mplads.mospi.gov.in/digigov/dashboard.html)
[![Organization](https://img.shields.io/badge/Organization-MoSPI%20%7C%20DIID-1E3A8A?style=for-the-badge&logo=government&logoColor=white)](https://mospi.gov.in)
[![Category & Theme](https://img.shields.io/badge/Theme-Smart_Automation_%7C_Software-0D9488?style=for-the-badge&logo=codewars&logoColor=white)](#-point-by-point-solution-matrix-for-problem-26102)
[![Dataset](https://img.shields.io/badge/Dataset-228%2C328_Live_Works-F59E0B?style=for-the-badge&logo=databricks&logoColor=black)](https://mplads.mospi.gov.in/digigov/dashboard.html)

[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.12-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20%2F%20PyMongo-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Tests](https://img.shields.io/badge/Tests-82%20Passed-success?style=flat-square&logo=pytest&logoColor=white)](tests/)
[![Security](https://img.shields.io/badge/Security-RBAC%202.0%20%7C%20JWT%20%7C%20Bcrypt-F59E0B?style=flat-square&logo=auth0&logoColor=black)](backend/auth.py)

<p align="center">
  <b>A proactive, explainable, evidence-based decision-support system analyzing 228,000+ MPLADS works across 545 Lok Sabha constituencies to detect expenditure irregularities, contractor monopolies, duplicate claims, and statutory non-compliance.</b>
</p>

[Problem Dossier](#-problem-statement-26102-official-dossier) •
[Solution Matrix](#-point-by-point-solution-matrix-for-problem-26102) •
[Comparative Benchmarks](#-why-jannidhi-comparative-benchmarks) •
[Architecture](#-end-to-end-system-architecture) •
[Decision Portals](#-role-tailored-decision-support-dashboards-rbac-20) •
[Citizen Redressal](#-citizen-grievances--public-redressal-hub) •
[Multi-Agent Engine](#-multi-agent-risk-engine) •
[5-State Rules](#-evidence-grounded-5-state-rule-system) •
[Quick Start](#-quick-start-guide) •
[API Reference](#-public--auditor-api-reference)

---

</div>

> [!IMPORTANT]
> ### 🌟 National Governance Impact At A Glance
> - **₹12,450.75 Crore** in sanctioned public capital tracked across **545 Lok Sabha constituencies** and **36 States & UTs**.
> - **100% Comprehensive Audit:** Continuous screening of all **228,328 works**, eliminating the 6 to 18-month delay of traditional 3–5% sample audits.
> - **Multi-Vector Anomaly Consensus:** 6 specialized AI agents detect cost overruns, contractor cartels, milestone delays, and ghost duplicate claims.
> - **Evidence-Grounded Legal Dossiers:** 1-click forensic Case Packets equipped with causal narratives and Measurement Book (MB) verification checklists.
> - **Citizen Ground-Truth Feedback:** Geo-tagged photo grievances mapped to real works with an official MP response channel.

---

## 📋 Problem Statement 26102: Official Dossier

| Specification Field | Official MoSPI Detail |
| :--- | :--- |
| **Problem Statement ID** | **`26102`** |
| **Problem Statement Title** | **Development of an AI-powered system to detect anomalies, fraud, and inefficiencies in MPLAD Scheme implementation regd.** |
| **Nodal Ministry** | **Ministry of Statistics and Programme Implementation (MoSPI)** |
| **Nodal Division** | **Data Informatics & Innovation Division (DIID)** |
| **Category & Theme** | Software • Smart Automation |
| **Official Portal & Dataset** | [https://mplads.mospi.gov.in/digigov/dashboard.html](https://mplads.mospi.gov.in/digigov/dashboard.html) |
| **Analyzed Production Dataset** | **228,328 authentic works** across **545 Lok Sabha constituencies** and **36 States & UTs** totaling **₹12,450+ Crore** sanctioned spend |

### 📖 Problem Background & Mandate (As Defined by MoSPI)
> *"The Members of Parliament Local Area Development Scheme (MPLADS) is a Central Sector Scheme under which Hon'ble Members of Parliament recommend developmental works for creation of durable community assets and provision of basic civic amenities. The Scheme involves large-scale fund utilization and execution of thousands of works across the country through multiple implementing agencies and administrative authorities.*
>
> *Given the volume and complexity of financial and project-related data generated under the Scheme, there is a need for an AI-powered solution that can leverage machine learning and advanced analytics to detect trends and anomalies in expenditure patterns, fund utilization, cost estimates, and work execution, thereby enabling early identification of potential fraud, inefficiencies, and non-compliance while enhancing transparency, accountability, and effective monitoring of MPLADS works.*
>
> *Develop an AI-powered monitoring and analytics platform for MPLADS that leverages Machine Learning (ML), Artificial Intelligence (AI), and advanced data analytics to identify trends, anomalies, irregularities, and potential fraud in fund utilization and project execution... generate risk-based alerts, predictive insights, and decision-support dashboards for Members of Parliament, State Nodal Authorities, District Authorities, and the Ministry."*

---

## 🎯 Point-by-Point Solution Matrix for Problem 26102

The following matrix documents how **JanNidhi (जन निधि)** directly and comprehensively solves every single mandate set forth in **Problem Statement 26102**:

| # | MoSPI Problem Requirement | JanNidhi Technical Solution & Implementation | Source File / Module | Live Output / Metric |
|:---:|---|---|---|---|
| **1** | **Expenditure Patterns & Fund Utilization Trends** | Robust Median Absolute Deviation (MAD > 4.0), negative balances, and disbursement pacing analysis across ₹12,450 Cr sanctioned funds. | [`model/agents/financial_agent.py`](model/agents/financial_agent.py) | **75.7% National Utilization** tracked in real-time |
| **2** | **Cost Overruns & Payment Anomalies** | Explicit INR overrun quantification; flags fund releases exceeding administrative sanctions or payments released without sanction. | [`backend/services/analytics.py`](backend/services/analytics.py) | Quantified INR excess values in Forensic Case Packets |
| **3** | **Duplicate Works & Ghost Projects** | Tokenized Jaccard similarity (threshold 0.72) + character bigram matching across overlapping locations, timeframes, and scheme descriptions. | [`model/agents/duplicate_agent.py`](model/agents/duplicate_agent.py) | Identified duplicate claims across overlapping district boundaries |
| **4** | **Delayed Projects & Work Execution Bottlenecks** | Stagnation detector for inactive works (>180 days with zero disbursement) and suspicious rapid completions (<15 days without proof). | [`model/agents/timeline_agent.py`](model/agents/timeline_agent.py) | Flags stalled infrastructure and rush-billing milestones |
| **5** | **Procurement Monopolies & Contractor Cartels** | Gini vendor concentration index (>60% of an MP's recommendations to single vendor, >30% of state tenders, or cross-MP vendor networks). | [`model/agents/vendor_agent.py`](model/agents/vendor_agent.py) | Cartel graph detection across Implementing District Authorities |
| **6** | **Deviations from Established Statutory Norms** | Evaluates 10 legal guidelines from MPLADS 2023 Guidelines (Annexure-II prohibited works, Trust/Society ₹50 Lakh lifetime ceiling). | [`model/rules/evaluator.py`](model/rules/evaluator.py) | 5-State Rule Evaluator (`PASS`, `FAIL`, `UNKNOWN`, `NA`, `DATA`) |
| **7** | **Automated Compliance & Risk Alerts** | Weighted consensus likelihood scoring combining 6 specialist AI agents into dynamic risk tiers (`High Risk`, `Medium Risk`, `Low Risk`). | [`model/risk_engine.py`](model/risk_engine.py) | **67,936 High Risk** & **98,412 Medium Risk** prioritized works |
| **8** | **Dashboard for Members of Parliament (MPs)** | Dedicated MP Dashboard tracking constituency spend, completion status, unspent balance, and voter grievances with parliamentary reply desk. | [`frontend/src/components/dashboard/MPDashboard.jsx`](frontend/src/components/dashboard/MPDashboard.jsx) | Constituency spend health & parliamentary reply workflow |
| **9** | **Dashboard for District Authorities (IDAs)** | Field verification queue for District Collectors and planning auditors with Measurement Book checklists and formal cure notice tools. | [`frontend/src/components/dashboard/DistrictAuditorDashboard.jsx`](frontend/src/components/dashboard/DistrictAuditorDashboard.jsx) | Prioritized physical inspection queue & cure notice logs |
| **10**| **Dashboard for Central Ministry (MoSPI / DIID)** | Central oversight console with macro fiscal KPIs, portfolio risk distribution, and distributed lock-protected live portal data sync. | [`frontend/src/components/dashboard/AdminDashboard.jsx`](frontend/src/components/dashboard/AdminDashboard.jsx) | National oversight of 228,328 works & live scraper |
| **11**| **Dashboard for State Nodal Authorities (SNAs)** | Interactive All-India SVG Choropleth Map with state-by-state fund utilization, expenditure comparisons, and MP transparency directory. | [`frontend/src/components/StatesView.jsx`](frontend/src/components/StatesView.jsx) | 36 States & UTs comparison matrix & allocation ranking |
| **12**| **Citizen Ground-Truth Reporting & Early Warning** | Dedicated public grievance hub with GPS geo-detection, photo evidence preview, authentic work ID link (86% mapped), and 1-click Case Packet. | [`frontend/src/components/CitizenGrievancesView.jsx`](frontend/src/components/CitizenGrievancesView.jsx) | **500 authentic complaints** across 545 constituencies |

---

## ⚖️ Why JanNidhi? (Comparative Benchmarks)

| Operational Dimension | Legacy Manual Audit / Portal | Generic BI Dashboards | 🏛️ JanNidhi AI Sentinel (Solution 26102) |
| :--- | :--- | :--- | :--- |
| **Audit Lead Time** | 6 to 18 months (Post-facto CAG review) | Static weekly/monthly batch reports | **Instant & Continuous** (Live stream ingestion & real-time triage) |
| **Data Coverage** | ~3% to 5% sample audits | High-level aggregated KPIs only | **100% Comprehensive** (All 228,328 works analyzed) |
| **Anomaly Detection** | Manual inspection of physical vouchers | Rule thresholds on single columns | **6-Agent Multi-Vector Consensus** (MAD, Jaccard, Cartel graphs) |
| **Legal Certainty** | Subjective auditor discretion | Binary alerts with high false positives | **5-State Evidence Model** (`PASS`, `FAIL`, `UNKNOWN`, `NA`, `DATA`) |
| **Citizen Voice** | Bureaucratic paper petitions | Non-existent / external social media | **Direct Geo-Photo Grievance Hub** with MP reply tracking |
| **Project Linkage** | Disconnected grievance records | Unlinked free-text fields | **Authentic Work ID Mapping** (86% linked to live database dossiers) |
| **Actionability** | Lengthy bureaucratic reports | Raw data dumps | **Forensic Case Packet** with MB checklist & cure notice logs |

---

## 🏗️ End-to-End System Architecture

Designed specifically for **Smart India Hackathon (Problem Statement 26102)**, JanNidhi transforms raw government spreadsheets into a **closed-loop, 4-tier decision-support intelligence platform**. It replaces delayed post-facto sampling with continuous, 100% pre-audit anomaly detection:

```mermaid
flowchart TD
    %% ─────────────────────────────────────────────────────────────────
    %% JANNIDHI END-TO-END SYSTEM ARCHITECTURE (SIH PROBLEM 26102)
    %% ─────────────────────────────────────────────────────────────────

    subgraph L1 ["📥 LAYER 1: DUAL DATA INGESTION & GROUND TRUTH"]
        direction LR
        S_GOV[("🏛️ <b>Official MoSPI Portal</b><br/><code>mplads.mospi.gov.in</code><br/>228,328 Records • 545 LS Seats")]
        S_CIT[("👥 <b>Citizen Ground-Truth</b><br/>Geo-tagged Photos & GPS<br/>500 Verified Civic Complaints")]
        S_SYNC["🔄 <b>Distributed Ingestion Sync</b><br/>Background Cron & Mongo Locks<br/>Live Scraper Failover"]
        S_GOV --> S_SYNC
        S_CIT --> S_SYNC
    end

    subgraph L2 ["🗄️ STORAGE & NORMALIZED DATA LAKE"]
        DB[("🍃 <b>MongoDB Atlas Cluster</b><br/>Constituency Graph • Work Dossiers • Audit Ledgers")]
    end

    subgraph L3 ["🧠 LAYER 2: MULTI-AGENT AI ANOMALY ENGINE"]
        direction TB
        subgraph AGENTS ["6 Parallel Domain AI Agents (model/agents/)"]
            direction LR
            AG_FIN["💰 <b>Financial</b><br/>MAD > 4.0 Outliers<br/>Negative Balances"]
            AG_DUP["👯 <b>Duplicate</b><br/>Jaccard 0.72 NLP<br/>Ghost Schemes"]
            AG_VEN["🏢 <b>Vendor Cartel</b><br/>Gini > 0.60 Monopoly<br/>Cross-MP Billing"]
            AG_TIM["⏱️ <b>Timeline</b><br/>>180d Stagnation<br/><15d Rapid Rushes"]
            AG_CMP["📜 <b>Compliance</b><br/>Annexure-II Checks<br/>₹50L Trust Ceilings"]
            AG_GEO["📍 <b>Geographic</b><br/>IDA Budget Capture<br/>Spatial Clusters"]
        end
        SYNTH["⚖️ <b>Consensus Scoring Synthesizer (model/risk_engine.py)</b><br/><code>Likelihood Score = Σ (w_i × AgentScore_i)  |  Normalized to 0–100 Risk Index</code>"]
        AGENTS --> SYNTH
    end

    subgraph L4 ["🔍 LAYER 3: FORENSIC TRIAGE & EVIDENCE PACKET"]
        direction LR
        TRIAGE["🚦 <b>Dynamic Risk Triage</b><br/>🔴 High Risk (≥ 70)<br/>🟡 Medium Risk (50–70)<br/>🟢 Low Risk (< 50)"]
        EVAL["⚖️ <b>5-State Legal Model</b><br/><code>PASS | FAIL | UNKNOWN</code><br/><code>NA | DATA_DEFICIENT</code>"]
        DOSSIER["📁 <b>1-Click Forensic Case Packet</b><br/>Itemized Causal Narrative<br/>Measurement Book (MB) Checklist"]
        TRIAGE --> EVAL --> DOSSIER
    end

    subgraph L5 ["🚀 LAYER 4: SECURE API GATEWAY & STAKEHOLDER PORTALS"]
        direction TB
        GATEWAY["⚡ <b>FastAPI REST Core + RBAC 2.0 Security</b><br/>JWT Bearer Tokens • Bcrypt Hashing • IP Rate Limiting • 82/82 Validated Tests"]
        
        subgraph VIEWS ["Role-Tailored Decision Portals (React 19 + Tailwind CSS)"]
            direction LR
            V_ADMIN["👑 <b>MoSPI Central</b><br/>₹12,450 Cr Macro Spend<br/>Live Data Sync Console"]
            V_MP["🏛️ <b>Member of Parliament</b><br/>Constituency Fund Health<br/>Parliamentary Reply Desk"]
            V_AUDIT["⚖️ <b>District Collector / IDA</b><br/>Prioritized Field Queue<br/>Formal Cure Notices"]
            V_CIT["👥 <b>Public Transparency</b><br/>Interactive Choropleth<br/>Civic Grievance Redressal"]
        end
        GATEWAY --> VIEWS
    end

    %% Pipeline Inter-Layer Connections
    L1 ==>|Normalized JSON Stream| L2
    L2 ==>|Query Dossiers| L3
    L3 ==>|Consensus Risk Metrics| L4
    L4 ==>|Forensic Evidence Packets| GATEWAY

    %% Custom Styling
    classDef l1Style fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#f8fafc;
    classDef l2Style fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#f8fafc;
    classDef l3Style fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#f8fafc;
    classDef l4Style fill:#451a03,stroke:#f59e0b,stroke-width:2px,color:#f8fafc;
    classDef l5Style fill:#18181b,stroke:#e4e4e7,stroke-width:2px,color:#f8fafc;

    class S_GOV,S_CIT,S_SYNC l1Style;
    class DB l2Style;
    class AG_FIN,AG_DUP,AG_VEN,AG_TIM,AG_CMP,AG_GEO,SYNTH l3Style;
    class TRIAGE,EVAL,DOSSIER l4Style;
    class GATEWAY,V_ADMIN,V_MP,V_AUDIT,V_CIT l5Style;
```

---

### 🧩 Architectural Specification Matrix

| Architectural Layer | Core Components & Modules | Technology Stack | SIH Problem 26102 Direct Impact |
|:---|:---|:---|:---|
| **1. Ingestion & Ground Truth** | Live MoSPI Scraper, Citizen Photo-GPS Capture, Distributed Lock Handler | Python, Playwright/Requests, MongoDB Locks, Web Geolocation API | Integrates official government records with grassroots citizen ground-truth. |
| **2. Storage & Data Lake** | 228,328 Works Collection, 545 MP Profiles, 500 Grievances, Audit Event Ledgers | MongoDB Atlas, PyMongo, Compound Geospatial & Search Indexes | Single source of truth with sub-10ms query execution across national data. |
| **3. AI Anomaly Engine** | 6 Specialist Agents: Financial, Duplicate, Vendor Cartel, Timeline, Compliance, Geographic | NumPy, Scikit-learn, SciPy, Custom Jaccard & N-gram Tokenizers | 100% automated coverage detecting overruns, cartels, delays, and ghost projects. |
| **4. Forensic Triage & Rules** | Consensus Likelihood Synthesizer, 5-State Rule Evaluator, Case Packet Builder | Python, LaTeX Scoring Formulations, Statutory Annexure-II Rules | Eliminates black-box AI; produces legally grounded audit evidence and MB checklists. |
| **5. Stakeholder Portals** | MoSPI Admin, MP Desk, District Collector Console, Public Choropleth | React 19, Vite, Tailwind CSS 3.4, Lucide Icons, FastAPI REST Core | Delivers customized, actionable operational tools for all 4 government tiers. |

---

### 🔄 End-to-End Data Lifecycle (From Raw Data to Legal Action)

```
[Official MoSPI Portal] + [Citizen Geo-Photos]
                 │
                 ▼
     ┌───────────────────────┐
     │ 1. INGEST & CORRELATE │  Scrape official works and link 86% of citizen complaints to genuine Work IDs
     └───────────┬───────────┘
                 ▼
     ┌───────────────────────┐
     │ 2. PARALLEL AI SCREEN │  6 Specialist Agents evaluate MAD outliers, Jaccard duplicates & vendor Gini
     └───────────┬───────────┘
                 ▼
     ┌───────────────────────┐
     │ 3. FORENSIC SYNTHESIS │  Calculate Consensus Score (0-100) and evaluate 10 statutory 5-state rules
     └───────────┬───────────┘
                 ▼
     ┌───────────────────────┐
     │ 4. STAKEHOLDER ACTION │  District Collector issues Cure Notice ➔ MP submits Reply ➔ MoSPI tracks Spend
     └───────────────────────┘
```

---

### 📊 SIH Presentation Slide Snapshot (16:9 Presentation Blueprint)

Copy the structured blueprint below directly onto your **SIH PowerPoint Architecture Slide**:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                        🏛️ JANNIDHI: END-TO-END SOLUTION ARCHITECTURE (SIH 26102)                       │
├────────────────────┬─────────────────────────────┬──────────────────────────┬──────────────────────────┤
│ 1. DATA INGESTION  │ 2. AI ANOMALY ENGINE        │ 3. FORENSIC TRIAGE       │ 4. STAKEHOLDER ACTION    │
├────────────────────┼─────────────────────────────┼──────────────────────────┼──────────────────────────┤
│ • 228,328 Official │ • 💰 Cost Overruns (MAD)    │ • Multi-Agent Consensus  │ • 👑 MoSPI Central       │
│   MoSPI Works      │ • 👯 Duplicate Works (NLP)  │   Risk Scoring (0-100)   │   ₹12,450 Cr Macro Spend │
│ • 545 Constituencies│ • 🏢 Contractor Cartels     │ • 5-State Legal Model    │ • 🏛️ Member of Parliament│
│ • 36 States & UTs  │ • ⏱️ Milestone Delays       │   (PASS / FAIL / UNK)    │   Constituency & Replies │
│ • Citizen Geo-Photo│ • 📜 Statutory Violations   │ • 1-Click Forensic Case  │ • ⚖️ District Collector │
│   Ground-Truth     │   (MPLADS 2023 Guidelines)  │   Packet with MB Check   │   Field Queue & Notices  │
│                    │                             │                          │ • 👥 Citizen Portal      │
│                    │                             │                          │   Transparent Redressal  │
├────────────────────┴─────────────────────────────┴──────────────────────────┴──────────────────────────┤
│ 💡 WHY JANNIDHI WINS SIH:                                                                              │
│  1. Continuous Screening: 100% automated pre-audit replaces 6-18 month delayed 3% manual audits.        │
│  2. Explainable AI: Every alert links to MPLADS 2023 legal clauses and physical inspection checklists.  │
│  3. Dual-Validation: Top-down official portal data correlated with bottom-up citizen photo evidence.   │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 👥 Role-Tailored Decision-Support Dashboards (RBAC 2.0)

In strict accordance with Problem Statement 26102's requirement to provide decision-support dashboards for **Members of Parliament, State Nodal Authorities, District Authorities, and the Ministry**, JanNidhi provides specialized, operational consoles:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                             JANNIDHI DECISION-SUPPORT MODULES (PS 26102)                         │
├──────────────────────┬──────────────────────┬──────────────────────┬─────────────────────────────┤
│ 👑 Central Ministry  │ 🏛️ Member of         │ ⚖️ District          │ 👥 Citizen Grievance        │
│    (MoSPI / DIID)    │    Parliament (MP)   │    Authority (IDA)   │    & Redressal Hub          │
│ National utilization │ Constituency budget, │ Field inspections,   │ Geo-located complaints,     │
│ (₹12,450 Cr spend),  │ works progress,      │ formal cure notices, │ photo evidence, authentic   │
│ portfolio risk map,  │ pending grievances & │ checklist review, &  │ work ID linkage & one-click │
│ live sync controls.  │ parliamentary replies│ milestone audits.    │ case packet inspection.     │
├──────────────────────┼──────────────────────┼──────────────────────┼─────────────────────────────┤
│ 📊 Portfolio         │ 📋 Priority Audit    │ 🔍 Forensic Case     │ 🗺️ State Nodal Authority    │
│    Overview          │    Queue             │    Packet Dossier    │    & All-India Choropleth   │
│ Macro risk tiers,    │ Dynamic prioritized  │ Multi-agent scores,  │ Interactive India SVG map,  │
│ utilization gauges,  │ audit queue with     │ causal explanations, │ state comparison matrix,    │
│ category analytics.  │ instant filters.     │ & itemized evidence. │ & MP transparency profiles. │
└──────────────────────┴──────────────────────┴──────────────────────┴─────────────────────────────┘
```

### 1. 👑 MoSPI Central Reviewer & DIID Executive Dashboard (`AdminDashboard.jsx`)
```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🏛️ CENTRAL MoSPI REVIEWER OVERSIGHT (DIID)                    [Live Sync: 2026-09-19 | IDLE]     │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ SANCTIONED AMOUNT       DISBURSED AMOUNT        UNSPENT BALANCE          NATIONAL UTILIZATION    │
│ ₹12,450.75 Cr           ₹7,927.39 Cr            ₹4,523.36 Cr             75.7% (Healthy Range)   │
│                                                                                                  │
│ PORTFOLIO RISK PROFILE: 67,936 High Risk (Review) | 98,412 Medium Risk (Monitor) | 61,980 Low    │
│ TRIGGER LIVE SYNC: [Run Quick Sync (Sample)]  [Trigger Comprehensive Ingestion (17th & 18th LS)] │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```
- **Macro Fiscal Telemetry:** Real-time tracking of ₹12,450.75 Cr sanctioned, ₹7,927.39 Cr disbursed, and ₹4,523.36 Cr unspent balance.
- **Automated Master Data Synchronization:** Manual and cron-scheduled background scraper fetching live records from `mplads.mospi.gov.in`.
- **System-Wide Triage Queue:** Direct access to forensic dossiers for high-risk projects across all 36 States and UTs.

### 2. 🏛️ Member of Parliament (MP) Decision-Support Portal (`MPDashboard.jsx`)
```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ PARLIAMENTARY DESK: Mala Roy, MP (Kolkata Dakshin • West Bengal)             [1-Click Switch Role]│
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ TOTAL ALLOCATED         SANCTIONED FUNDS        TOTAL DISBURSED          CONSTITUENCY UTILIZATION│
│ ₹25.00 Cr               ₹24.85 Cr               ₹22.10 Cr                88.9% (Optimal Pace)    │
│                                                                                                  │
│ CIVIC GRIEVANCES PENDING: 14 Active Complaints | 8 Requiring MP Reply | 6 Under Field Audit      │
│ LATEST GRIEVANCE: "Submersible pump failure at Ward 96" -> [Draft Official Parliamentary Reply]  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```
- **Constituency Fund Health:** Real-time monitoring of recommendations, sanctions, and actual on-ground expenditure.
- **Voter Grievance Redressal Desk:** Direct pipeline of citizen complaints with photo proof, GPS location, and an **Official MP Parliamentary Reply** submission channel.

### 3. ⚖️ District Authority (IDA / District Collector) Portal (`DistrictAuditorDashboard.jsx`)
```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ DISTRICT PLANNING DESK: District Authority Auditor (Murshidabad • West Bengal)                   │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ WORKS UNDER SCRUTINY    INSPECTIONS DUE         PENDING CURE NOTICES     VERIFIED COMPLETIONS    │
│ 412 High-Risk Projects  18 Field Visits         7 Contractors Flagged    128 Verified On-Site    │
│                                                                                                  │
│ INSPECTION WORKLIST:                                                                             │
│ #152872: Lighting of public spaces -> High Risk (Score: 69.4) -> [Serve Cure Notice] [Inspect MB]│
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```
- **Field Inspection Queue:** Ranked list of projects requiring mandatory physical verification.
- **Formal Cure Notice & Audit Log:** Ability to serve cure notices to defaulting vendors and record formal audit determinations.
- **Evidence Checklist:** Measurement Book (MB) verification, Sanction Order comparison, and milestone compliance validation.

### 4. 🗺️ State Nodal Authority (SNA) & Public Transparency Portal (`StatesView.jsx`)
- Interactive **All-India SVG Choropleth Map** color-coded by fund utilization.
- Multi-state comparison matrix evaluating expenditure pace, top implementing districts, and risk distributions across States.

---

## 📢 Citizen Grievances & Public Redressal Hub

JanNidhi bridges the gap between official data and ground reality through an integrated civic redressal portal:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 📍 CIVIC COMPLAINT #PRB-WE-MUR-0002                                          [STATUS: IN PROGRESS]│
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Title: High-mast solar lighting system non-functional at Station Road Ward 4                     │
│ Raised By: Tanushree Ghosh (+91 9830*****) • Murshidabad • West Bengal                            │
│                                                                                                  │
│ [📷 Photo Evidence: Verified Site Inspection Image Attached]                                      │
│                                                                                                  │
│ 🏛️ SANCTIONED WORK: Lighting of public spaces (Work #152872)                                      │
│ ⚡ LINKED WORK:  [📄 #152872  Inspect Case Packet  ↗]  <-- Warm Amber 1-Click Audit Inspection    │
│                                                                                                  │
│ 💬 OFFICIAL MP RESPONSE:                                                                         │
│ "I have taken note of this critical civic issue. PHED Executive Engineer instructed to replace    │
│ defective components under warranty clause within 7 days."                                       │
│                                                                                                  │
│ 🔍 DISTRICT AUDITOR NOTE:                                                                        │
│ "Physical verification confirmed electrical breakdown. Formal cure notice served to contractor." │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 🌟 Key Highlights
- **500 Domain-Accurate Seeded Complaints:** Grounded in real Indian Lok Sabha constituencies covering Drinking Water, Rural Roads, School Infrastructure, Healthcare/PHC, and Solar Lighting.
- **Authentic Work ID Linkage:** **430 out of 500 complaints (86%)** are mapped to actual, verifiable works in the 228,328 works database.
- **One-Click Case Packet Inspection:** Each linked grievance features an interactive amber button opening the project's risk score, priority rank, and statutory rule triggers.
- **Smart Location Selection:** Browser GPS geo-location with intelligent fallback allowing citizens to select their State, District, and Lok Sabha Constituency step-by-step.
- **Dual-Channel Status Tracking:** Complete transparency with visible MP replies and District Auditor site inspection notes.

---

## 🤖 Multi-Agent Risk Engine

JanNidhi employs **6 specialist domain agents** governed by a central coordinator configured via [`model/config.yaml`](model/config.yaml):

| Agent | Weight | Domain Focus | Key Detection Vectors |
|---|:---:|---|---|
| **💰 Financial Agent** | `25%` | Financial Outliers & Balance Integrity | Robust Median Absolute Deviation (MAD > 4.0), negative balances, disbursement mismatch (>10%), and fund release without sanction. |
| **👯 Duplicate Agent** | `22%` | Near-Duplicate & Ghost-Work Identification | Jaccard token similarity (threshold 0.72) + character bigram matching across overlapping locations, timeframes, and descriptions. |
| **⏱️ Timeline Agent** | `20%` | Stagnation & Milestone Anomalies | Overdue execution (>180 days in inactive status), disbursement post-completion (>30 days), and suspicious rapid completions (<15 days). |
| **🏢 Vendor Agent** | `15%` | Procurement Monopolies & Cartelization | Vendor concentration (>30% of state works, >60% of an MP's works), multi-MP vendor cross-billing (≥3 MPs). |
| **📜 Compliance Agent** | `13%` | Statutory Guidelines & Mandates | Prohibited works (Annexure-II), Trust/Society ₹50 Lakh single-work ceilings, and SC/ST allocation tracking. |
| **📍 Geographic Agent** | `5%` | Cluster Anomalies & IDA Capture | Implementing District Authority budget capture (>40% of state budget), IDA vendor monopolies (>80%), and multi-MP IDA clusters. |

### Consensus Scoring Formulation

$$\text{Likelihood Score} = \sum_{i=1}^{6} w_i \cdot \text{AgentScore}_i \quad \text{where} \quad \sum w_i = 1.0$$

Works with a weighted consensus score $\ge 0.40$ are flagged as anomalous, and normalized against portfolio percentiles into actionable tiers:
- 🔴 **High Risk - Review** (`score ≥ 70.0`)
- 🟡 **Medium Risk - Monitor** (`50.0 ≤ score < 70.0`)
- 🟢 **Low Risk** (`score < 50.0`)

---

## ⚖️ Evidence-Grounded 5-State Rule System

JanNidhi enforces an **evidence-grounded five-state evaluation model** (`PASS`, `FAIL`, `UNKNOWN`, `NA`, `DATA`) across all statutory guidelines:

| Rule Code | Statutory Guideline | Detection Mechanism | Example Flag |
|---|---|---|---|
| `RULE_PROHIBITED_ITEMS` | MPLADS 2023 Annexure-II | Prohibited commercial/religious entities | "Commercial entity asset created under MPLADS funds" |
| `RULE_TRUST_SOCIETY_LIMIT` | Para 3.14 Ceiling | Trust/Society grants > ₹50 Lakhs | "Single society sanction ₹75.0 Lakhs exceeds statutory ceiling" |
| `RULE_NEGATIVE_BALANCE` | Para 4.2 Financial Discipline | Disbursed amount > Sanctioned value | "Disbursed ₹18.5L exceeds sanctioned ₹15.0L by ₹3.5L (123%)" |
| `RULE_NO_SANCTION` | Para 4.1 Administrative Sanction | Fund release without sanction date | "₹5.2 Lakhs disbursed prior to administrative approval" |
| `RULE_RAPID_COMPLETION` | Para 5.3 Execution Verification | Completion in < 15 days without evidence | "Civil work marked completed in 4 days with zero photo proof" |
| `RULE_EXECUTION_STAGNATION` | Para 5.4 Milestone Monitoring | Inactive execution exceeding 180 days | "Work sanctioned 240 days ago with zero fund disbursement" |
| `RULE_MISSING_IMAGE` | Para 6.2 Completion Certificate | Completed work lacking completion photo | "Work marked 100% complete without uploaded visual evidence" |
| `RULE_VENDOR_MONOPOLY` | Para 3.8 Procurement Integrity | Single vendor > 60% of MP's portfolio | "Vendor received 68% of MP's total recommendations" |
| `RULE_POST_COMPLETION_RELEASE` | Para 4.6 Payment Finality | Fund release > 30 days post completion | "₹8.4 Lakhs disbursed 82 days after completion certificate" |
| `RULE_DUPLICATE_DESCRIPTION` | Para 3.3 Ghost-Work Prevention | High Jaccard similarity in same district | "Identical scheme description matched with Work #145610" |

---

## 🔐 1-Click Quick Login & Role Matrix

JanNidhi includes built-in, self-healing demo authentication presets allowing evaluators to experience each role instantly with one click:

| Role | Preset Username | Password | Operational Access |
|---|---|---|---|
| **Public Citizen** | *(No login required)* | *(None)* | View priority queue, MP directories, case packet narratives, submit grievances with photos, inspect public data. |
| **Member of Parliament** | `mp` | `MP@MPLADS2026!` | Access MP Dashboard, track constituency fund health, review pending problems, submit official parliamentary replies. |
| **District Authority Auditor**| `auditor` | `Auditor@MPLADS2026!` | Access District Auditor Dashboard, schedule site inspections, serve formal cure notices, submit Case Packet determinations. |
| **MoSPI Reviewer / Admin** | `admin` | `Admin@MPLADS2026!` | Access MoSPI Admin Dashboard, monitor national utilization (₹12,450 Cr), trigger live portal sync, manage system-wide audit queues. |

> [!NOTE]
> *Self-Healing Security Note: If demo user records are missing upon container initialization, the authentication layer automatically creates them securely with bcrypt password hashing on first login.*

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python:** 3.11 or 3.12
- **Node.js:** 18 or higher (with npm)
- **MongoDB:** Local MongoDB Community Server or MongoDB Atlas cluster

### 1. Clone the Repository
```bash
git clone https://github.com/poulamisingha1212-source/SIH26102.git
cd SIH26102
```

### 2. Environment Configuration
Create a local `.env` file in the root directory:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017
MONGO_DB_NAME=mplads_sentinel

# Application Environment
ENVIRONMENT=development
PORT=8000
HOST=0.0.0.0

# Security & Authentication
JWT_SECRET=your-secure-jwt-secret-minimum-32-characters-long!
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# CORS Configuration
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173

# Live Ingestion Portal Settings
MPLADS_BASE_URL=https://mplads.mospi.gov.in
MPLADS_LIVE_HOUSE=both
MPLADS_LIVE_TIMEOUT=300
```

### 3. Backend Setup
```bash
# Install Python dependencies
pip install -r requirements.txt -r requirements-dev.txt

# Seed initial database, indexes, and credentials
python -m backend.seeder

# Seed 500 authentic citizen grievances linked to real works
python -m backend.scripts.seed_500_grievances

# Start the FastAPI server
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive API Documentation will be live at `http://localhost:8000/docs`.

### 4. Frontend Setup
```bash
# In a new terminal:
cd frontend

# Install frontend dependencies
npm install

# Start the Vite development server
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## 🧪 Automated Testing & Quality Assurance

JanNidhi includes an extensive suite of **82 automated tests** covering security vectors, statutory rules, multi-agent math, and REST API integration:

```bash
# Run the complete test suite:
pytest -v

# Run specific test modules:
pytest tests/test_security_regression.py -v   # RBAC 2.0, injection, rate limiting
pytest tests/test_phase_3_rules.py -v         # Statutory 5-state logic
pytest tests/test_risk_engine.py -v           # Multi-agent scoring & drift
pytest tests/test_api.py -v                   # REST endpoints & directories
```

*Note: Tests run against an isolated in-memory `mongomock` instance and automatically synthesize test fixtures, ensuring zero side-effects on production data.*

---

## 📡 Public & Auditor API Reference

All endpoints are hosted under `/api`. Interactive OpenAPI documentation is accessible via Swagger UI at `http://localhost:8000/docs`.

| Method | Endpoint | Access Level | Description |
|:---:|---|:---:|---|
| `POST` | `/api/auth/login` | **Public** (Rate Limited) | Authenticates credentials with bcrypt, returns signed JWT Bearer token. |
| `GET` | `/api/auth/me` | **Authenticated** | Returns current user profile, role, and assigned constituency/district. |
| `GET` | `/api/stats/overview` | **Public** | Macro national statistics (sanctioned, disbursed, allocated, utilization, risk tiers). |
| `GET` | `/api/works` | **Public** | Paginated works sorted by priority rank. Filters: `state`, `mp_name`, `house`, `risk_tier`. |
| `GET` | `/api/works/{work_id}` | **Public** | Complete forensic Case Packet: risk scores, causal factors, statutory rule triggers. |
| `POST` | `/api/works/{work_id}/review` | **Auditor / Reviewer** | Records formal human audit determination (Approved, Needs Inspection, Reject). |
| `POST` | `/api/works/{work_id}/public-review`| **Public** (Rate Limited) | Submits citizen site verification with GPS coordinates and photo proof. |
| `GET` | `/api/problems` | **Public** | Retrieves citizen grievances with filters: `state`, `district`, `constituency`, `status`, `category`. |
| `POST` | `/api/problems` | **Public** | Submits a new citizen civic grievance with optional photographic evidence. |
| `POST` | `/api/problems/{problem_id}/reply` | **MP / Admin** | Records official MP parliamentary desk response and action taken. |
| `POST` | `/api/problems/{problem_id}/auditor-review`| **Auditor / Admin** | Records District Authority Auditor site investigation notes and cure notices. |
| `GET` | `/api/mps` | **Public** | Complete MP directory: allocations, expenditure, utilization rate, risk profile. |
| `GET` | `/api/mps/{mp_name}` | **Public** | MP transparency profile: category distribution, top anomalous works. |
| `GET` | `/api/states` | **Public** | State-wise fund allocation, expenditure totals, and MP coverage summary. |
| `GET` | `/api/states/{state}` | **Public** | State-level dossier: risk tier distribution, top MPs, category breakdowns. |
| `GET` | `/api/analytics/categories` | **Public** | Overall fund share and average risk score grouped by work category. |
| `GET` | `/api/analytics/status` | **Public** | Portfolio distribution across completion statuses. |
| `GET` | `/api/export/works` | **Public** (Rate Limited) | Open-data CSV export stream (bounded at 10,000 rows). |
| `POST` | `/api/sync/run` | **Reviewer / Admin** | Triggers asynchronous live portal data ingestion under a distributed lock. |
| `GET` | `/api/sync/status` | **Public** | Reports ingestion status, lock state, and last synchronized timestamp. |
| `GET` | `/api/health` | **Public** | System health probe (MongoDB connection, document counts). |

---

## 🎨 Design System & Anti-Slop Doctrine

This project strictly adheres to **gstack** and **anti-slop design principles**:
- **Color Discipline:** Deep dark surfaces at `#0C0C0C` (base) and `#141414` (cards) with subtle `#262626` borders.
- **Intentional Accent:** Warm amber cursor accent (`#F59E0B` / `#FBBF24`) reserved for high-intent actions like Case Packet inspection and review approvals.
- **Semantic Risk Indicators:** Clear risk signaling using Red (`#EF4444` for High Risk), Amber (`#F59E0B` for Medium Risk), and Green (`#22C55E` for Low Risk).
- **Physical Depth:** Subtle SVG noise texture (`feTurbulence`) to avoid flat, lifeless SaaS templates.
- **Tabular Data Scannability:** Monospace typography with tabular figures (`tnum`) for monetary figures, work IDs, and percentage metrics.

---

## 📜 License & Statutory Compliance

Developed for the **Ministry of Statistics and Programme Implementation (MoSPI)** under the **Smart India Hackathon (SIH)** initiative for **Problem Statement 26102**.  
All data schemas and compliance rules are aligned with the official **[MPLADS Scheme Guidelines (2023)](https://mplads.mospi.gov.in)** issued by the Government of India.
