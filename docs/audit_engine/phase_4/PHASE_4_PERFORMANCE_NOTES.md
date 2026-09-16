# Phase 4 — Scanner Performance and Resource Utilization Notes

**Date:** September 16, 2026  
**Database:** `mplads_sentinel`  

---

## 1. Execution Telemetry

* **Total Documents Scanned:** 228,328 works
* **Total Execution Elapsed Time:** 26.72 seconds (0.45 minutes)
* **Effective Throughput:** 8545.0 documents / second (145264.9 rule evaluations / second)
* **Query Strategy:** Server-side projected streaming cursor (`batch_size=10000`)
* **Memory Footprint:** Bounded in-memory streaming with constant accumulation dictionaries (< 120 MB RAM)

---

## 2. Production Index Analysis

During Phase 4, the entire scan was performed using a sequential projection stream without creating any new indexes, strictly obeying the read-only constraint.

### Recommended Future Operational Indexes (For Live Web / API queries):
1. `works.work_id` (Unique index) — Accelerates individual case packet lookups.
2. `works.mp_name, works.house` (Compound index) — Accelerates MP portfolio filters.
3. `works.state, works.work_category` — Accelerates category-level compliance queries.

> [!NOTE]
> No indexes were created during Phase 4. All operations remained 100% read-only.
