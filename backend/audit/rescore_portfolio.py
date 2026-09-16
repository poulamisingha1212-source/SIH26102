"""Phase 4.1 Production MongoDB Rescoring and Live Field Update Engine.

Rescores all works in MongoDB 'mplads_sentinel.works' using the Phase 3
statutory rule engine, data quality engine, and updated multi-agent heuristics.

Updates directly in MongoDB:
  - final_risk_score (100.0 for statutory FAILs, max(old, 85.0) for Annexure-II REVIEWs)
  - priority_rank (1..N strictly: Tier 1 Statutory FAILs #1..#7, Tier 2 Prohibited Reviews, Tier 3 Multi-Agent)
  - risk_tier ("High Risk - Review", "Medium Risk - Monitor", "Low Risk")
  - recommended_action / auditor_action_directive
  - rule_flag_count & rule_flags_triggered
  - statutory_fail_count, statutory_review_count, statutory_fails, statutory_reviews
  - data_quality_defects
  - updated_at (current UTC timestamp)

Canonical portal fields (work_id, state, mp_name, sanction_amount, etc.) are 100% preserved.
"""

import os
import sys
import time
import argparse
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Tuple
from collections import defaultdict
from pymongo import UpdateOne

BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.database import db, works, mp_allocations
from model.rules.evaluator import evaluate_all_rules, RuleState
from backend.engines.data_quality_engine import evaluate_data_quality
from model.agents.coordinator import ACTION_PRIORITY

import builtins
_orig_print = builtins.print
def print(*args, **kwargs):
    kwargs.setdefault("flush", True)
    _orig_print(*args, **kwargs)



def rescore_and_update(apply_changes: bool = False, batch_size: int = 5000):
    print("=" * 80)
    print("MPLADS AI Sentinel — Production MongoDB Portfolio Rescoring")
    print(f"Database: {db.name} | Collection: {works.name}")
    print(f"Mode: {'LIVE WRITE (APPLY)' if apply_changes else 'DRY RUN (NO WRITES)'}")
    print(f"Batch Size: {batch_size}")
    print("=" * 80)

    t0 = time.time()
    total_works = works.count_documents({})
    total_allocs = mp_allocations.count_documents({})
    print(f"Initial document count: {total_works:,} works, {total_allocs:,} allocations")

    # 1. Preload MP allocations map for accurate rule evaluation
    print("\n[Step 1/4] Preloading MP allocations...")
    mp_alloc_composite: Dict[Tuple[str, str], Dict[str, Any]] = {}
    mp_alloc_name_only: Dict[str, Dict[str, Any]] = {}
    alloc_cursor = mp_allocations.find({}, {"_id": 0})
    for alloc in alloc_cursor:
        mp_name = str(alloc.get("mp_name") or "").strip().lower()
        house = str(alloc.get("house") or "").strip().lower()
        mp_alloc_composite[(mp_name, house)] = alloc
        if mp_name not in mp_alloc_name_only:
            mp_alloc_name_only[mp_name] = alloc
    print(f"Loaded {len(mp_alloc_composite)} allocation records.")

    # 2. Stream all works and evaluate rules
    print(f"\n[Step 2/4] Streaming and evaluating {total_works:,} works...")
    projection = {
        "_id": 1,
        "work_id": 1,
        "work_status": 1,
        "sanction_amount": 1,
        "total_fund_disbursed": 1,
        "state": 1,
        "mp_name": 1,
        "house": 1,
        "constituency": 1,
        "ida": 1,
        "work_type": 1,
        "work_category": 1,
        "work_description": 1,
        "primary_vendor": 1,
        "completion_date": 1,
        "rule_flags_triggered": 1,
        "final_risk_score": 1,
        "likelihood_score": 1,
        "impact_score": 1,
        "weighted_rule_score": 1,
        "anomaly_percentile": 1,
        "is_anomaly": 1,
    }

    cursor = works.find({}, projection, batch_size=10000)
    records = []
    statutory_fail_records = []
    proh_review_records = []

    count = 0
    t_eval_start = time.time()
    for doc in cursor:
        count += 1
        doc_id = doc["_id"]
        wid = str(doc.get("work_id") or "").strip()
        status = str(doc.get("work_status") or "").strip()
        sanction = float(doc.get("sanction_amount") or 0.0)
        disbursed = float(doc.get("total_fund_disbursed") or 0.0)
        category = str(doc.get("work_category") or "").strip()
        mp_name = str(doc.get("mp_name") or "").strip()
        house = str(doc.get("house") or "").strip()

        # Join allocation
        mp_key_comp = (mp_name.lower(), house.lower())
        alloc = mp_alloc_composite.get(mp_key_comp) or mp_alloc_name_only.get(mp_name.lower())

        # 1. Evaluate 17 statutory rules
        rules = evaluate_all_rules(doc, alloc)
        fails = [r.rule_id for r in rules if r.state == RuleState.FAIL]
        reviews = [r.rule_id for r in rules if r.state == RuleState.REVIEW]

        # 2. Evaluate data quality defects
        dq_defects = evaluate_data_quality(doc)
        dq_codes = [d.defect_code for d in dq_defects]

        # 3. Clean and update multi-agent flags
        raw_flags = doc.get("rule_flags_triggered") or []
        flags_set = set(raw_flags if isinstance(raw_flags, list) else [])

        # Para 3.11: disbursement without sanction
        if status.lower() == "pending for sanction" and disbursed > 0:
            flags_set.add("disbursement_without_sanction")

        # Para 3.23: trust/society single work cap
        if ("trust" in category.lower() or "society" in category.lower()) and sanction > 5000000.0:
            flags_set.add("trust_single_cap_breach")

        # Eliminate IEEE-754 floating point overrun artifact
        if "over_utilization" in flags_set:
            if disbursed <= (sanction + 100.0) or sanction <= 0:
                flags_set.remove("over_utilization")

        updated_flags = sorted(list(flags_set))
        rule_flag_count = len(updated_flags)

        # 4. Action directive mapping
        if "MPLADS23-FIN-001" in fails:
            action = "Immediate administrative sanction verification"
        elif "MPLADS23-FIN-002" in fails:
            action = "Financial reconciliation"
        elif "MPLADS23-SOC-001" in fails:
            action = "Trust ceiling statutory verification"
        elif "MPLADS23-PROH-001" in reviews:
            action = "Annexure-II prohibited works eligibility verification"
        else:
            action = "Routine monitoring"
            for family, act in ACTION_PRIORITY:
                if flags_set & family:
                    action = act
                    break

        # 5. Risk score & tier
        is_fail = len(fails) > 0
        is_proh = "MPLADS23-PROH-001" in reviews

        if is_fail:
            score = 100.0
            tier = "High Risk - Review"
        elif is_proh:
            score = max(float(doc.get("final_risk_score") or 0.0), 85.0)
            tier = "High Risk - Review"
        else:
            score = float(doc.get("final_risk_score") or 0.0)
            tier = "High Risk - Review" if score > 70.0 else ("Medium Risk - Monitor" if score >= 50.0 else "Low Risk")

        update_payload = {
            "final_risk_score": score,
            "risk_tier": tier,
            "recommended_action": action,
            "auditor_action_directive": action,
            "rule_flag_count": rule_flag_count,
            "rule_flags_triggered": updated_flags,
            "statutory_fail_count": len(fails),
            "statutory_review_count": len(reviews),
            "statutory_fails": fails,
            "statutory_reviews": reviews,
            "data_quality_defects": dq_codes,
        }

        rec = (doc_id, wid, is_fail, is_proh, score, disbursed, sanction, rule_flag_count, update_payload)
        records.append(rec)
        if is_fail:
            statutory_fail_records.append(rec)
        elif is_proh:
            proh_review_records.append(rec)

        if count % 50000 == 0:
            print(f"  -> Evaluated {count:,}/{total_works:,} works ({(count/total_works)*100:.1f}%) in {time.time()-t_eval_start:.1f}s")

    print(f"Evaluation complete in {time.time()-t_eval_start:.1f}s.")
    print(f"Found {len(statutory_fail_records)} statutory FAIL records.")
    print(f"Found {len(proh_review_records)} statutory Prohibited Screening REVIEW records.")

    # 3. Global Priority Ranking Sort
    print("\n[Step 3/4] Performing global priority ranking sort...")
    t_sort_start = time.time()
    # Sort order:
    # 1. Tier 1: is_fail == True (0 first)
    # 2. Tier 2: is_proh == True (1 first)
    # 3. Tier 3: Other works (2)
    # Then: -score, -disbursed, -sanction, -rule_flag_count, work_id
    records.sort(key=lambda r: (
        0 if r[2] else (1 if r[3] else 2),
        -r[4],
        -r[5],
        -r[6],
        -r[7],
        r[1]
    ))
    print(f"Global sort completed in {time.time()-t_sort_start:.2f}s.")

    # Display Top 10 projected ranks
    print("\nTop 10 Rescored Priority Rankings:")
    now = datetime.now(timezone.utc)
    for rank in range(1, 11):
        r = records[rank - 1]
        wid = r[1]
        p = r[8]
        print(f"  Rank #{rank:2d} | Work {wid:7s} | Score: {p['final_risk_score']:5.1f} | Tier: {p['risk_tier']:18s} | Fails: {p['statutory_fails']} | Action: {p['recommended_action']}")

    # Check work 1215
    for rank, r in enumerate(records, 1):
        if r[1] == "1215":
            p = r[8]
            print(f"\nTarget Work 1215 Inspection:")
            print(f"  Rank: #{rank:,} | Score: {p['final_risk_score']} | Tier: {p['risk_tier']} | Fails: {p['statutory_fails']} | Reviews: {p['statutory_reviews']} | Flags: {p['rule_flags_triggered']}")
            break

    # 4. Write back to MongoDB
    if not apply_changes:
        print("\n[DRY RUN COMPLETE] Zero writes performed. Run with apply_changes=True to update MongoDB.")
        return

    print(f"\n[Step 4/4] Writing rescored fields to MongoDB in batches of {batch_size:,}...")
    t_write_start = time.time()
    ops = []
    written_count = 0

    for rank, r in enumerate(records, 1):
        doc_id = r[0]
        payload = r[8]
        payload["priority_rank"] = rank
        payload["updated_at"] = now

        ops.append(UpdateOne({"_id": doc_id}, {"$set": payload}))

        if len(ops) >= batch_size:
            works.bulk_write(ops, ordered=False)
            written_count += len(ops)
            elapsed = time.time() - t_write_start
            pct = (written_count / total_works) * 100.0
            print(f"  -> Written {written_count:,}/{total_works:,} ({pct:.1f}%) | Elapsed: {elapsed:.1f}s")
            ops = []

    if ops:
        works.bulk_write(ops, ordered=False)
        written_count += len(ops)

    total_time = time.time() - t0
    print(f"\nSUCCESS: Rescored and updated all {written_count:,} works in MongoDB Atlas in {total_time:.1f}s!")

    # 5. Verification
    print("\nPost-Update Verification:")
    final_count = works.count_documents({})
    print(f"  Total works in database: {final_count:,} (Original: {total_works:,})")
    assert final_count == total_works, f"COUNT MISMATCH! Expected {total_works}, found {final_count}"

    rank_1 = works.find_one({"priority_rank": 1})
    print(f"  Rank #1 work: {rank_1.get('work_id')} | Score: {rank_1.get('final_risk_score')} | Action: {rank_1.get('recommended_action')}")

    for wid in ["141185", "220383", "114399", "262075", "290981", "239748", "239767"]:
        w = works.find_one({"work_id": wid}, {"_id": 0, "work_id": 1, "priority_rank": 1, "final_risk_score": 1, "statutory_fails": 1, "recommended_action": 1})
        print(f"  FAIL Work {wid:7s} -> Rank #{w.get('priority_rank')} | Score: {w.get('final_risk_score')} | Fails: {w.get('statutory_fails')} | Action: {w.get('recommended_action')}")

    w1215 = works.find_one({"work_id": "1215"}, {"_id": 0, "work_id": 1, "priority_rank": 1, "final_risk_score": 1, "statutory_fail_count": 1, "statutory_fails": 1, "recommended_action": 1})
    print(f"  Clean Work 1215   -> Rank #{w1215.get('priority_rank'):,} | Score: {w1215.get('final_risk_score')} | Fails: {w1215.get('statutory_fails')} | Action: {w1215.get('recommended_action')}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Rescore and update production MongoDB works collection.")
    parser.add_argument("--apply", action="store_true", help="Execute live writes to MongoDB")
    parser.add_argument("--batch-size", type=int, default=5000, help="Batch size for bulk_write operations")
    args = parser.parse_args()

    rescore_and_update(apply_changes=args.apply, batch_size=args.batch_size)
