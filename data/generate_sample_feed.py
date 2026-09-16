"""
Synthetic MPLADS Dataset Generator.
Generates a realistic, highly connected long-format dataset covering Lok Sabha and Rajya Sabha works
across all Indian states, with full vendor links, expenditure vouchers, completion dates, and MP allocation limits.
"""

import random
import csv
from datetime import datetime, timedelta

random.seed(42)

STATES_AND_CONSTITUENCIES = {
    "Uttar Pradesh": ["Varanasi", "Lucknow", "Gorakhpur", "Amethi", "Agra", "Kanpur", "Prayagraj", "Meerut"],
    "Maharashtra": ["Nagpur", "Mumbai South", "Pune", "Nashik", "Thane", "Baramati", "Aurangabad", "Kolhapur"],
    "West Bengal": ["Kolkata Uttar", "Jadavpur", "Asansol", "Darjeeling", "Diamond Harbour", "Murshidabad"],
    "Tamil Nadu": ["Chennai South", "Coimbatore", "Madurai", "Thanjavur", "Salem", "Tiruchirappalli"],
    "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain", "Chhindwara"],
    "Bihar": ["Patna Sahib", "Gaya", "Muzaffarpur", "Bhagalpur", "Darbhanga", "Nalanda"],
    "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner", "Ajmer"],
    "Karnataka": ["Bangalore South", "Mysore", "Hubli-Dharwad", "Mangalore", "Belgaum"],
    "Gujarat": ["Gandhinagar", "Surat", "Vadodara", "Rajkot", "Ahmedabad East"],
    "Odisha": ["Bhubaneswar", "Cuttack", "Puri", "Sambalpur", "Berhampur"],
    "Kerala": ["Thiruvananthapuram", "Ernakulam", "Kozhikode", "Thrissur", "Palakkad"],
    "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati", "Anantapur"],
    "Telangana": ["Hyderabad", "Secunderabad", "Karimnagar", "Warangal", "Nizamabad"],
    "Punjab": ["Amritsar", "Ludhiana", "Jalandhar", "Patiala", "Gurdaspur"],
    "Haryana": ["Gurugram", "Faridabad", "Ambala", "Hisar", "Rohtak"],
    "Assam": ["Guwahati", "Dibrugarh", "Silchar", "Jorhat", "Tezpur"],
    "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Hazaribagh"],
    "Chhattisgarh": ["Raipur", "Bilaspur", "Durg", "Korba"],
    "Delhi": ["New Delhi", "South Delhi", "East Delhi", "Chandni Chowk"],
}

MP_NAMES_LOK_SABHA = [
    ("Shri Narendra Modi", "Uttar Pradesh", "Varanasi"),
    ("Rajnath Singh", "Uttar Pradesh", "Lucknow"),
    ("Nitin Gadkari", "Maharashtra", "Nagpur"),
    ("Piyush Goyal", "Maharashtra", "Mumbai South"),
    ("Abhishek Banerjee", "West Bengal", "Diamond Harbour"),
    ("K. Annamalai", "Tamil Nadu", "Coimbatore"),
    ("Shivraj Singh Chouhan", "Madhya Pradesh", "Vidisha"),
    ("Jyotiraditya Scindia", "Madhya Pradesh", "Gwalior"),
    ("Tejasvi Surya", "Karnataka", "Bangalore South"),
    ("Shashi Tharoor", "Kerala", "Thiruvananthapuram"),
    ("Gajendra Singh Shekhawat", "Rajasthan", "Jodhpur"),
    ("Anurag Thakur", "Himachal Pradesh", "Hamirpur"),
    ("Manohar Lal Khattar", "Haryana", "Karnal"),
    ("Sarbananda Sonowal", "Assam", "Dibrugarh"),
    ("Dharmendra Pradhan", "Odisha", "Sambalpur"),
    ("Supriya Sule", "Maharashtra", "Baramati"),
    ("Mahua Moitra", "West Bengal", "Krishnanagar"),
    ("Kanimozhi Karunanidhi", "Tamil Nadu", "Thoothukkudi"),
    ("Asaduddin Owaisi", "Telangana", "Hyderabad"),
    ("Shri Chirag Paswan", "Bihar", "Hajipur"),
]

# Generate synthetic MPs to reach ~150 MPs
for state, constituencies in STATES_AND_CONSTITUENCIES.items():
    for constituency in constituencies:
        name = f"Shri {constituency.replace(' ', '')} Representative"
        if not any(m[2] == constituency for m in MP_NAMES_LOK_SABHA):
            MP_NAMES_LOK_SABHA.append((name, state, constituency))

MP_NAMES_RAJYA_SABHA = [
    ("Shri Javed Ali Khan", "Uttar Pradesh", "Sitting Rajya Sabha"),
    ("Smt. Nirmala Sitharaman", "Karnataka", "Sitting Rajya Sabha"),
    ("Dr. S. Jaishankar", "Gujarat", "Sitting Rajya Sabha"),
    ("Shri Mallikarjun Kharge", "Karnataka", "Sitting Rajya Sabha"),
    ("Shri J. P. Nadda", "Himachal Pradesh", "Sitting Rajya Sabha"),
    ("Shri Ashwini Vaishnaw", "Odisha", "Sitting Rajya Sabha"),
    ("Shri Surendra Singh Nagar", "Uttar Pradesh", "Sitting Rajya Sabha"),
    ("Dr. Abhishek Manu Singhvi", "Telangana", "Sitting Rajya Sabha"),
    ("Shri Derek O'Brien", "West Bengal", "Sitting Rajya Sabha"),
    ("Shri Sanjay Raut", "Maharashtra", "Sitting Rajya Sabha"),
]

for state in STATES_AND_CONSTITUENCIES.keys():
    name = f"Shri {state.replace(' ', '')} Nominee RS"
    if not any(m[1] == state for m in MP_NAMES_RAJYA_SABHA):
        MP_NAMES_RAJYA_SABHA.append((name, state, "Sitting Rajya Sabha"))

WORK_CATEGORIES = [
    "Normal/Others",
    "Roads, Bridges and Culverts",
    "Drinking Water & Sanitation",
    "Education & School Infrastructure",
    "Public Health & Community Centers",
    "Electrification & Solar Power",
    "Trust and Society",
    "Bar and Associations",
    "Repair and Renovation"
]

WORK_TYPES_BY_CAT = {
    "Normal/Others": ["Construction of Community Hall", "Installation of High Mast Solar Lights", "Development of Park"],
    "Roads, Bridges and Culverts": ["Construction of CC Road", "Repair of PWD Connecting Road", "Construction of Small Culvert"],
    "Drinking Water & Sanitation": ["Installation of Community RO Drinking Water Plant", "Deep Tube Well Drilling", "Public Toilet Block Construction"],
    "Education & School Infrastructure": ["Construction of Additional Classrooms in Government School", "Computer Lab Setup in High School", "School Boundary Wall Construction"],
    "Public Health & Community Centers": ["Supply of Ambulance to Sub-District Hospital", "Community Health Sub-Center Ward Expansion"],
    "Electrification & Solar Power": ["Supply & Installation of Solar Street Lights", "Transformer Installation in Rural Village"],
    "Trust and Society": ["Grant for NGO Vocational Training Center", "Community Center Renovation for Private Trust"],
    "Bar and Associations": ["E-Library Extension in District Bar Association Building", "Furniture Purchase for Advocates Association"],
    "Repair and Renovation": ["Renovation of Old Primary School Building", "Repair of Village Drinking Water Pipeline"]
}

WORK_STATUSES = [
    "Work Completed",
    "Work in Progress",
    "Sanction",
    "Physical Inspection",
    "Vendor Identification",
    "Time Estimation"
]

VENDORS = [
    "A TO Z ASSOCIATES", "M/S INFRASTRUCTURE BUILDERS", "SRI BALAJI ENTERPRISES",
    "NEW TECH SOLAR SOLUTIONS", "RAMA CONSTRUCTIONS", "ROYAL SUPPLIERS & CONTRACTORS",
    "SHREE GANESH TRADERS", "NATIONAL INFRA PROJECTS", "MODERN WATER TECH",
    "JAI HO CONTRACTORS", "BHARAT WORKS & CO", "HINDUSTAN ENTERPRISES"
]

LONG_COLUMNS = [
    "record_type", "source_file", "source_sr_no", "state", "constituency",
    "mp_name", "house", "ida", "work_id", "work_category", "work_type",
    "work_description", "recommended_date", "sanction_date", "completion_date",
    "expenditure_date", "consent_date", "recommended_amount", "sanction_amount",
    "amount_disbursed", "fund_disbursed_amount", "consent_amount",
    "allocated_amount", "work_status", "payment_status", "vendor_name",
    "calamity_type", "calamity_name", "image_marker"
]

def random_date(start_year=2024, end_year=2026):
    start = datetime(start_year, 1, 1)
    end = datetime(end_year, 9, 1)
    delta = end - start
    return start + timedelta(days=random.randint(0, delta.days))

def generate_records():
    records = []
    sr_no = 1

    # 1. MP Allocated Limit records
    all_mps = [(m[0], m[1], m[2], "Lok Sabha") for m in MP_NAMES_LOK_SABHA] + \
              [(m[0], m[1], m[2], "Rajya Sabha") for m in MP_NAMES_RAJYA_SABHA]

    # Assign performance profile to each MP for a realistic, varied distribution
    # ~20% Low/Lagging, ~50% Average/Moderate, ~30% High/Efficient
    mp_profiles = {}
    for mp_name, state, constituency, house in all_mps:
        r = random.random()
        if r < 0.20:
            profile = "low"      # Target work utilization ~15%-45%
            alloc = 50000000.0   # ₹5 Cr statutory limit
        elif r < 0.70:
            profile = "avg"      # Target work utilization ~45%-75%
            alloc = 50000000.0   # ₹5 Cr statutory limit
        else:
            profile = "high"     # Target work utilization ~75%-95%
            alloc = 50000000.0   # ₹5 Cr statutory limit

        mp_profiles[mp_name] = profile

        records.append({
            "record_type": "MP Allocated Limit",
            "source_file": "mplads_synthetic_feed.csv",
            "source_sr_no": sr_no,
            "state": state,
            "constituency": constituency,
            "mp_name": mp_name,
            "house": house,
            "allocated_amount": alloc,
            "recommended_date": "2024-04-01"
        })
        sr_no += 1

    # 2. Works generation (~1,500 distinct works)
    num_works = 1500
    for i in range(1, num_works + 1):
        mp_tuple = random.choice(all_mps)
        mp_name, state, constituency, house = mp_tuple
        profile = mp_profiles[mp_name]

        category = random.choice(WORK_CATEGORIES)
        wtype = random.choice(WORK_TYPES_BY_CAT[category])
        work_id = f"WS/MP{random.randint(100, 999)}/2025-2026/{100000 + i}"
        ida = f"{state.upper()} DISTRICT MAGISTRATE IDA"

        # Sanction amounts
        sanc_amount = round(random.uniform(100000, 5000000), -3)

        # Inject specific anomaly signals in ~8% of works
        is_cost_outlier = (i % 25 == 0)
        if is_cost_outlier:
            sanc_amount = 18000000.0  # ₹1.8 Cr cost outlier

        rec_date = random_date(2024, 2025)
        sanc_date = rec_date + timedelta(days=random.randint(10, 60))

        # Status distribution modulated by MP profile
        if profile == "low":
            status = random.choice([
                "Sanction", "Physical Inspection", "Vendor Identification", "Time Estimation",
                "Work in Progress", "Work in Progress", "Work Completed"
            ])
        elif profile == "avg":
            status = random.choice([
                "Sanction", "Physical Inspection",
                "Work in Progress", "Work in Progress", "Work in Progress",
                "Work Completed", "Work Completed"
            ])
        else: # high
            status = random.choice([
                "Vendor Identification",
                "Work in Progress", "Work in Progress",
                "Work Completed", "Work Completed", "Work Completed", "Work Completed"
            ])

        vendor = random.choice(VENDORS)

        desc = f"{wtype} at {constituency} village ward {random.randint(1, 20)}"
        if i % 30 == 0:
            desc = "Installation of High Mast Solar Lights at Gram Panchayat Center"  # duplicate description signal

        # Record 1: Works Recommended
        records.append({
            "record_type": "Works Recommended",
            "source_file": "mplads_synthetic_feed.csv",
            "source_sr_no": sr_no,
            "state": state,
            "constituency": constituency,
            "mp_name": mp_name,
            "house": house,
            "ida": ida,
            "work_id": work_id,
            "work_category": category,
            "work_type": wtype,
            "work_description": desc,
            "recommended_date": rec_date.strftime("%Y-%m-%d"),
            "recommended_amount": sanc_amount,
        })
        sr_no += 1

        # Record 2: Works Sanctioned
        records.append({
            "record_type": "Works Sanctioned",
            "source_file": "mplads_synthetic_feed.csv",
            "source_sr_no": sr_no,
            "state": state,
            "constituency": constituency,
            "mp_name": mp_name,
            "house": house,
            "ida": ida,
            "work_id": work_id,
            "work_category": category,
            "work_type": wtype,
            "work_description": desc,
            "sanction_date": sanc_date.strftime("%Y-%m-%d"),
            "sanction_amount": sanc_amount,
            "work_status": status,
        })
        sr_no += 1

        # Generate realistic, imperfect utilization based on MP profile and work_status
        is_completed = (status == "Work Completed")

        if status in ["Sanction", "Physical Inspection", "Vendor Identification", "Time Estimation"]:
            # Early stage works: 0% to 35%
            target_util_ratio = random.choice([0.0, 0.0, 0.05, 0.15, 0.25, 0.35])
        elif status == "Work in Progress":
            if profile == "low":
                target_util_ratio = random.uniform(0.15, 0.45)
            elif profile == "avg":
                target_util_ratio = random.uniform(0.35, 0.70)
            else:
                target_util_ratio = random.uniform(0.60, 0.88)
        else: # Work Completed
            if profile == "low":
                target_util_ratio = random.uniform(0.50, 0.80)
            elif profile == "avg":
                target_util_ratio = random.uniform(0.70, 0.95)
            else:
                target_util_ratio = random.uniform(0.85, 1.08)

        # Allow occasional realistic anomalies (e.g. stalled or over-utilized works)
        if random.random() < 0.10:
            target_util_ratio = random.choice([0.10, 0.25, 0.40, 1.12])

        if target_util_ratio > 0:
            total_disbursed_target = round(sanc_amount * target_util_ratio, -2)
            n_payments = random.randint(1, 3)

            if is_completed or random.random() < 0.7:
                comp_date = sanc_date + timedelta(days=random.randint(15, 180))
                has_image = random.choice(["Yes", "Yes", "Yes", "No"])

                records.append({
                    "record_type": "Works Completed",
                    "source_file": "mplads_synthetic_feed.csv",
                    "source_sr_no": sr_no,
                    "state": state,
                    "constituency": constituency,
                    "mp_name": mp_name,
                    "house": house,
                    "ida": ida,
                    "work_id": work_id,
                    "work_category": category,
                    "work_type": wtype,
                    "work_description": desc,
                    "completion_date": comp_date.strftime("%Y-%m-%d"),
                    "amount_disbursed": total_disbursed_target,
                    "image_marker": has_image,
                })
                sr_no += 1

            payment_total = 0.0
            for p in range(n_payments):
                exp_date = sanc_date + timedelta(days=random.randint(10, 120))
                p_amount = round(total_disbursed_target / n_payments, -2)
                payment_total += p_amount
                p_status = "Payment Released" if is_completed else "Payment In-Progress"

                # Missing vendor signal in ~3% of expenditures
                p_vendor = vendor if (i % 33 != 0) else None

                records.append({
                    "record_type": "Expenditure on Completed & On-going Works",
                    "source_file": "mplads_synthetic_feed.csv",
                    "source_sr_no": sr_no,
                    "state": state,
                    "constituency": constituency,
                    "mp_name": mp_name,
                    "house": house,
                    "ida": ida,
                    "work_id": work_id,
                    "work_type": wtype,
                    "work_description": desc,
                    "expenditure_date": exp_date.strftime("%Y-%m-%d"),
                    "fund_disbursed_amount": p_amount,
                    "payment_status": p_status,
                    "vendor_name": p_vendor,
                })
                sr_no += 1

    return records

if __name__ == "__main__":
    recs = generate_records()
    filepath = "data/mplads_raw_sample.csv"
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=LONG_COLUMNS)
        writer.writeheader()
        for r in recs:
            # fill missing keys
            full_r = {col: r.get(col, "") for col in LONG_COLUMNS}
            writer.writerow(full_r)
    print(f"Generated {len(recs)} synthetic records in {filepath}")
