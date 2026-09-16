import os
import time
from pymongo import UpdateOne
from backend.database import init_database, works

def recompute_global_priority_ranks(batch_size=5000):
    uri = os.environ.get("MONGODB_URI", "mongodb+srv://Netai:Netai@cluster0.04vfzta.mongodb.net/?appName=Cluster0")
    init_database(uri)

    total_works = works.count_documents({})
    print(f"Recomputing global priority ranks for all {total_works:,} works in MongoDB Atlas...")
    t0 = time.time()

    # Query all works ordered strictly by risk score desc, sanction amount desc, rule_flag_count desc, work_id asc
    cursor = works.find(
        {},
        {"_id": 1}
    ).sort([
        ("final_risk_score", -1),
        ("sanction_amount", -1),
        ("rule_flag_count", -1),
        ("work_id", 1)
    ])

    ops = []
    updated_count = 0
    rank = 1

    for doc in cursor:
        ops.append(UpdateOne({"_id": doc["_id"]}, {"$set": {"priority_rank": rank}}))
        rank += 1

        if len(ops) >= batch_size:
            works.bulk_write(ops, ordered=False)
            updated_count += len(ops)
            elapsed = time.time() - t0
            pct = (updated_count / total_works) * 100.0
            print(f"  -> Ranked {updated_count:,}/{total_works:,} ({pct:.1f}%) | Elapsed: {elapsed:.1f}s")
            ops = []

    if ops:
        works.bulk_write(ops, ordered=False)
        updated_count += len(ops)

    elapsed = time.time() - t0
    print(f"\nSUCCESS: Recomputed global priority ranks 1 to {total_works:,} in {elapsed:.1f}s!")

    # Verify rank 1, 2, 3 and no duplicates
    top3 = list(works.find({}, {"_id": 0, "work_id": 1, "priority_rank": 1, "final_risk_score": 1, "sanction_amount": 1}).sort([("priority_rank", 1)]).limit(5))
    print("\nTop 5 works by new priority_rank:")
    for w in top3:
        print(f"  Rank #{w['priority_rank']} | work_id: {w['work_id']} | Risk: {w['final_risk_score']} | Sanction: Rs. {w['sanction_amount']:,.0f}")

    rank_1_count = works.count_documents({"priority_rank": 1})
    print(f"\nNumber of works with priority_rank == 1: {rank_1_count} (Expected: exactly 1)")

if __name__ == "__main__":
    recompute_global_priority_ranks()
