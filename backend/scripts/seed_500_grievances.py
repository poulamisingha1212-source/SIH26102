"""
Seed 500 authentic, domain-accurate citizen grievances across real Indian Lok Sabha constituencies.
Grounded in real MPLADS guidelines: drinking water, rural roads, school infrastructure,
community halls, PHC healthcare, solar lighting, sanitation, and flood protection.
"""
import json
import random
import re
from pathlib import Path
from datetime import datetime, timedelta, timezone

# Ensure backend imports work
import sys
BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.database import citizen_problems, is_mock

COMPLAINT_TEMPLATES = [
    # Drinking Water
    {
        "category": "Drinking Water",
        "title_tmpl": "Submersible pump non-functional at {place} Solar Deep Tube Well",
        "desc_tmpl": "The solar-powered deep borewell sanctioned under MPLADS at {place} has been completely inoperative for {months} months due to a burnt pump motor. Over {num} households are forced to fetch water from an untreated open pond 2 km away.",
        "work_prefix": "DW",
        "action_tmpl": "PHED Executive Engineer instructed to replace defective pump under warranty clause.",
        "audit_tmpl": "Physical verification confirmed motor breakdown. Show-cause notice issued to empanelled vendor."
    },
    {
        "category": "Drinking Water",
        "title_tmpl": "Drinking water RO purification plant locked and abandoned at {place}",
        "desc_tmpl": "Community RO plant constructed under MP local funds at {place} has been lying non-operational since {months} months. Membrane filtration units have choked and the vendor has failed to honor the mandatory 3-year AMC.",
        "work_prefix": "RO",
        "action_tmpl": "Directed District Water & Sanitation Mission to enforce AMC warranty and penalize vendor.",
        "audit_tmpl": "Audit inspection noted vendor default on quarterly filter replacement. Final bill withheld."
    },
    {
        "category": "Drinking Water",
        "title_tmpl": "Delay in laying distribution pipeline to Scheduled Caste habitation in {place}",
        "desc_tmpl": "Piped drinking water scheme sanctioned 14 months ago remains incomplete. Main riser pipe was laid but house connection distribution lines to Ward {ward} were skipped by the executing agency without explanation.",
        "work_prefix": "PWS",
        "action_tmpl": "Directing Zila Parishad engineering division to complete tail-end distribution within 15 days.",
        "audit_tmpl": "Field audit verified exclusion of target habitation. Deviation from approved DPR flagged."
    },
    {
        "category": "Drinking Water",
        "title_tmpl": "Severe leakage in overhead HDPE water reservoir at {place} Gram Panchayat",
        "desc_tmpl": "Newly erected 10,000-liter elevated storage tank at {place} developed structural fissures along the base seam. Approximately 3,000 liters of treated water is lost daily, flooding the adjacent primary school grounds.",
        "work_prefix": "TNK",
        "action_tmpl": "Instructed Block Development Officer to replace damaged storage tank with compliant ISI-marked unit.",
        "audit_tmpl": "Inspection revealed substandard tank thickness not complying with sanction schedule."
    },

    # Roads & Infrastructure
    {
        "category": "Roads & Infrastructure",
        "title_tmpl": "Incomplete RCC box culvert causing road blockage at {place} during rains",
        "desc_tmpl": "Construction of box culvert over the local irrigation drain at {place} was halted after casting wing walls {months} months ago. The detour is unusable for emergency medical ambulances and school buses.",
        "work_prefix": "RD-CLV",
        "action_tmpl": "Summoned contractor to MP camp office; directed release of pending milestone against time-bound completion.",
        "audit_tmpl": "Measurement book verified 45% physical progress against 75% payment claim. Discrepancy registered."
    },
    {
        "category": "Roads & Infrastructure",
        "title_tmpl": "Premature aggregate peeling and potholes on newly laid CC road in {place}",
        "desc_tmpl": "The 1.2 km cement concrete road at {place} completed just {months} months ago has begun crumbling. Top cement mortar wearing coat has disintegrated due to inadequate curing and poor cement-aggregate ratio.",
        "work_prefix": "CC-RD",
        "action_tmpl": "District Collector requested to order core-sample laboratory test and invoke performance guarantee.",
        "audit_tmpl": "Core test confirmed compressive strength 32% below M-25 design grade. Contractor blacklisted."
    },
    {
        "category": "Roads & Infrastructure",
        "title_tmpl": "Approach embankment washed away near {place} bridge connection",
        "desc_tmpl": "High flood waters eroded the uncompacted gravel approach to the newly sanctioned bridge near {place}. Without stone pitching revetment, the entire abutment structure is at imminent risk of collapse.",
        "work_prefix": "BRG-APP",
        "action_tmpl": "Emergency boulder pitching and slope stabilization sanctioned through disaster response pool.",
        "audit_tmpl": "Technical audit noted absence of geo-textile filter fabric specified in structural drawings."
    },
    {
        "category": "Roads & Infrastructure",
        "title_tmpl": "Paver block pavement around {place} community market sunken and uneven",
        "desc_tmpl": "Heavy monsoon rains caused settling of interlocking concrete blocks at {place} market square. Improper sub-base sand bedding has created hazardous water-filled craters for rural vendors and pedestrians.",
        "work_prefix": "PVR",
        "action_tmpl": "Executing agency instructed to re-level pavement base with vibratory roller compaction.",
        "audit_tmpl": "Site audit confirmed lack of proper edge restraint curbs, allowing lateral subgrade displacement."
    },

    # Sanitation & Sewage
    {
        "category": "Sanitation & Sewage",
        "title_tmpl": "Overflowing community bio-digester sanitation complex at {place}",
        "desc_tmpl": "The 6-seater community toilet block constructed at {place} has blocked soak pits. Sewage is overflowing into the public pathway, posing acute hepatitis and dengue hazards for {num} neighborhood residents.",
        "work_prefix": "SAN-CMP",
        "action_tmpl": "Urgent super-sucker tanker deployed via Municipal Council; directed permanent microbial recharge.",
        "audit_tmpl": "Soakage pit design found undersized relative to user load. Redesign mandated."
    },
    {
        "category": "Sanitation & Sewage",
        "title_tmpl": "Broken concrete drain cover slabs creating open hazard at {place} Ward {ward}",
        "desc_tmpl": "Pre-cast RCC cover slabs on the main roadside sullage drain at {place} were fractured by tractor transit {months} months ago. Two elderly citizens and a child suffered injuries falling into the 5-foot open trench.",
        "work_prefix": "DRN-CVR",
        "action_tmpl": "Directing Assistant Engineer to install heavy-duty ductile iron / reinforced slabs within 7 days.",
        "audit_tmpl": "Pre-cast slab steel reinforcement was 6mm instead of 10mm specified in schedule of rates."
    },
    {
        "category": "Sanitation & Sewage",
        "title_tmpl": "Sullage drain desilting work abandoned halfway near {place}",
        "desc_tmpl": "Contractor extracted silt from the masonry stormwater drain at {place} and left the waste piled on the road edge. Subsequent showers washed the silt straight back into the drain, nullifying the entire expenditure.",
        "work_prefix": "DRN-DSL",
        "action_tmpl": "Contractor penalized 10% on bill; JCB machinery deployed for complete clearing to landfill.",
        "audit_tmpl": "Inspection log verified waste was never lifted within 48-hour regulatory window."
    },

    # Healthcare
    {
        "category": "Healthcare",
        "title_tmpl": "Solar hybrid power backup unit inoperative at {place} Primary Health Center",
        "desc_tmpl": "The 5kW rooftop solar inverter battery system donated to {place} PHC has dead batteries. During routine night power cuts, emergency maternity deliveries and immunization cold storage are severely compromised.",
        "work_prefix": "PHC-SLR",
        "action_tmpl": "Directing Chief Medical Officer to expedite tubular battery bank replacement under guarantee.",
        "audit_tmpl": "Asset register inspection confirmed inverter installed but logbook records zero AMC visits."
    },
    {
        "category": "Healthcare",
        "title_tmpl": "Uninstalled ultrasound diagnostic machine lying packed at {place} Sub-District Hospital",
        "desc_tmpl": "State-of-the-art diagnostic imaging unit procured through MPLADS fund has remained sealed in wooden crates for {months} months due to lack of dedicated 3-phase earthing and sonologist deployment.",
        "work_prefix": "HSP-EQP",
        "action_tmpl": "Took up electrical earthing with discom and requisitioned visiting radiologist from Civil Hospital.",
        "audit_tmpl": "Asset lying idle noted in statutory audit report. Joint verification conducted."
    },
    {
        "category": "Healthcare",
        "title_tmpl": "Roof leakages and peeling plaster in renovated OPD block at {place} Health Sub-Center",
        "desc_tmpl": "Waterproofing repairs completed last winter at {place} health sub-center failed during the first downpour. Rainwater is dripping onto sterile dressing equipment and patient examination beds.",
        "work_prefix": "HSC-RNV",
        "action_tmpl": "Directing PWD Civil wing to re-do elastomeric waterproofing under defect liability period.",
        "audit_tmpl": "Substandard bitumen felt detected during core scraping. Rectification notice served."
    },

    # Education & Schools
    {
        "category": "Education & Schools",
        "title_tmpl": "Unfinished classrooms and missing window grills at {place} Govt Girls High School",
        "desc_tmpl": "Two additional classrooms sanctioned in 2024 at {place} remain without electrical wiring, window glass panes, and protective security grills. Over 90 girl students are forced to sit on floor mats in open corridors.",
        "work_prefix": "SCH-CLS",
        "action_tmpl": "Zila Parishad technical staff instructed to finish electricals and fixtures before academic term.",
        "audit_tmpl": "Funds utilized 88% but physical completion stands at 60%. Detailed measurement re-verification ordered."
    },
    {
        "category": "Education & Schools",
        "title_tmpl": "Separate girls toilet block constructed at {place} School lacks water connectivity",
        "desc_tmpl": "The modern sanitation block for female students under Swachh Vidyalaya at {place} remains locked because the contractor never connected the plumbing to the campus overhead borewell tank.",
        "work_prefix": "SCH-TLT",
        "action_tmpl": "Ordered headmaster and block education officer to complete plumbing connection using school maintenance grant.",
        "audit_tmpl": "Audit found toilet structure physically built but non-functional due to 20m missing PVC pipe."
    },
    {
        "category": "Education & Schools",
        "title_tmpl": "Boundary wall collapse at {place} Senior Secondary School posing safety risk",
        "desc_tmpl": "A 40-meter stretch of the newly sanctioned boundary wall at {place} collapsed during heavy winds due to lack of intermediate expansion joints and shallow foundation footing in black cotton soil.",
        "work_prefix": "SCH-BW",
        "action_tmpl": "Directing structural reconstruction with RCC tie-beams and deeper pile foundation at vendor expense.",
        "audit_tmpl": "Soil bearing capacity test omitted prior to foundation casting. Structural lapse recorded."
    },

    # Community Assets
    {
        "category": "Community Assets",
        "title_tmpl": "Panchayat Community Bhavan stalled at lintel level in {place}",
        "desc_tmpl": "Work on the multipurpose community hall at {place} halted {months} months ago. Exposed steel rebars on pillars are rusting rapidly in the rain, causing permanent structural deterioration.",
        "work_prefix": "COM-HL",
        "action_tmpl": "Issued final termination warning to truant contractor; balance work assigned to departmental engineering.",
        "audit_tmpl": "Rebar oxidation verified. Structural engineer certification required before slab casting."
    },
    {
        "category": "Community Assets",
        "title_tmpl": "Crematorium / Muktidham waiting shed missing roof sheeting at {place}",
        "desc_tmpl": "Sanctioned muktidham rest shed at {place} was framed in structural steel but galvanized corrugated iron roofing sheets were never fitted. Mourners have zero shade or rain protection during funeral rites.",
        "work_prefix": "CRM-SHD",
        "action_tmpl": "Expedited procurement of pre-coated roofing sheets; fabrication team mobilized on site.",
        "audit_tmpl": "Physical inventory showed sheets paid for in voucher #44 but not present on site."
    },
    {
        "category": "Community Assets",
        "title_tmpl": "Weekly Haat / Farmers Market platform damaged by heavy vehicle entry in {place}",
        "desc_tmpl": "Raised cement platform for rural agricultural produce sellers at {place} has fractured curbs. Lack of perimeter bollards allows freight trucks to reverse directly onto the citizen vendor stalls.",
        "work_prefix": "HT-PLT",
        "action_tmpl": "Instructed installation of heavy cast-iron bollards and reinforced perimeter curbing.",
        "audit_tmpl": "Safety bollards were included in sanctioned estimate but omitted during site execution."
    },

    # Electricity & Lighting
    {
        "category": "Electricity & Lighting",
        "title_tmpl": "16-Meter High-Mast LED tower light dark for {months} months at {place} Bus Stand",
        "desc_tmpl": "High-mast illumination tower at {place} junction has been non-functional due to burnt driver modules. Women commuters and evening pedestrians feel unsafe in complete pitch darkness at the junction.",
        "work_prefix": "LGT-HM",
        "action_tmpl": "Instructed energy efficiency services agency to replace faulty 400W LED drivers under 5-year AMC.",
        "audit_tmpl": "Surge protection device was bypassed during installation, causing lightning damage."
    },
    {
        "category": "Electricity & Lighting",
        "title_tmpl": "Solar street lights (10 units) fitted with substandard batteries at {place}",
        "desc_tmpl": "Solar standalone lights installed along {place} village street discharge within 45 minutes of sunset. Local youth inspected the battery boxes and found unbranded reconditioned lead-acid batteries.",
        "work_prefix": "LGT-SLR",
        "action_tmpl": "Ordered comprehensive testing of all installed batteries; fraudulent components will face criminal FIR.",
        "audit_tmpl": "Battery batch serial numbers do not match sanctioned MNRE test certification documents."
    },

    # Others (Custom Specific Categories)
    {
        "category": "Others: Flood Embankment Protection",
        "title_tmpl": "Riverbank boulder revetment washed away at {place} agricultural boundary",
        "desc_tmpl": "Erosion protection rip-rap pitching along the riverbend near {place} gave way during high water discharge. Fertile multi-crop farmland is eroding at 2 meters per week towards adjacent village huts.",
        "work_prefix": "FLD-RVT",
        "action_tmpl": "Irrigation & Waterways department dispatched for emergency geo-bag revetment stacking.",
        "audit_tmpl": "Boulder size used was 20-30kg instead of sanctioned 45-60kg hydraulic grade specification."
    },
    {
        "category": "Others: Sports & Youth Recreation",
        "title_tmpl": "Open-air gymnasium fitness equipment rusted and damaged at {place} Public Park",
        "desc_tmpl": "Outdoor gym equipment installed under MP Youth Development grant at {place} has jammed bearings and severed cables. Children and local athletes cannot utilize the park safely.",
        "work_prefix": "SPT-GYM",
        "action_tmpl": "Contractor instructed to replace corroded pulleys and lubricate all moving assemblies.",
        "audit_tmpl": "Powder coating thickness failed salt-spray anti-corrosion benchmarks."
    },
    {
        "category": "Others: Public Digital Library",
        "title_tmpl": "E-Library computer systems locked without broadband internet at {place}",
        "desc_tmpl": "Sanctioned digital study center at {place} has 8 desktop computers sitting idle for {months} months because fiber-optic broadband connectivity was not linked by the nodal agency.",
        "work_prefix": "DIG-LIB",
        "action_tmpl": "Coordinated with BSNL / BharatNet to provision high-speed FTTH connection immediately.",
        "audit_tmpl": "Recurring internet connectivity provision was not budget-mapped in original proposal."
    }
]

INDIAN_CITIZEN_NAMES = [
    # West Bengal
    ("Subhasis Ghosh", "West Bengal"), ("Ananya Banerjee", "West Bengal"), ("Debabrata Mondal", "West Bengal"),
    ("Sharmila Sen", "West Bengal"), ("Pratik Mukherjee", "West Bengal"), ("Joyita Das", "West Bengal"),
    ("Bipul Roy", "West Bengal"), ("Tanushree Ghosh", "West Bengal"), ("Kaushik Bhattacharya", "West Bengal"),
    ("Madhumita Saha", "West Bengal"), ("Dipankar Samanta", "West Bengal"), ("Moumita Chakraborty", "West Bengal"),
    ("Soumitra Dutta", "West Bengal"), ("Poulami Singha", "West Bengal"), ("Snehashis Pal", "West Bengal"),
    ("Archana Bhowmick", "West Bengal"), ("Ranjan Majumdar", "West Bengal"), ("Sampa Karmakar", "West Bengal"),
    # Rajasthan
    ("Ramesh Kumar Meena", "Rajasthan"), ("Priya Sharma", "Rajasthan"), ("Mukesh Gujjar", "Rajasthan"),
    ("Dinesh Chandra", "Rajasthan"), ("Sunita Devi Meena", "Rajasthan"), ("Bhanwar Singh Rathore", "Rajasthan"),
    ("Kamla Choudhary", "Rajasthan"), ("Gopal Lal Saini", "Rajasthan"), ("Manju Bai", "Rajasthan"),
    ("Radheshyam Bairwa", "Rajasthan"), ("Laxman Singh Shekhawat", "Rajasthan"), ("Pramila Kanwar", "Rajasthan"),
    # Uttar Pradesh
    ("Ramashankar Tiwari", "Uttar Pradesh"), ("Virendra Yadav", "Uttar Pradesh"), ("Geeta Devi", "Uttar Pradesh"),
    ("Mohammad Farooq", "Uttar Pradesh"), ("Arvind Kumar Patel", "Uttar Pradesh"), ("Sudhir Mishra", "Uttar Pradesh"),
    ("Rajeshwari Devi", "Uttar Pradesh"), ("Chandan Kumar Shukla", "Uttar Pradesh"), ("Anita Maurya", "Uttar Pradesh"),
    ("Brijesh Kumar Nishad", "Uttar Pradesh"), ("Savita Rajpoot", "Uttar Pradesh"), ("Dharmendra Singh", "Uttar Pradesh"),
    # Maharashtra
    ("Nilesh Patil", "Maharashtra"), ("Sneha Deshmukh", "Maharashtra"), ("Santosh Shinde", "Maharashtra"),
    ("Prashant Kulkarni", "Maharashtra"), ("Vaishali Gaikwad", "Maharashtra"), ("Sachin More", "Maharashtra"),
    ("Rupali Jadhav", "Maharashtra"), ("Ganesh Tambe", "Maharashtra"), ("Sunil Pawar", "Maharashtra"),
    # South India (Karnataka, Tamil Nadu, Kerala, AP, Telangana)
    ("R. Venkatasubramanian", "Tamil Nadu"), ("S. Lakshmi Priya", "Tamil Nadu"), ("K. Anantharam", "Tamil Nadu"),
    ("Prashanth Hegde", "Karnataka"), ("Kavitha Reddy", "Karnataka"), ("Manjunath Gowda", "Karnataka"),
    ("Divya Nair", "Kerala"), ("Sreejith Menon", "Kerala"), ("Anoop Varma", "Kerala"),
    ("K. Srinivas Rao", "Telangana"), ("Padmavathi Goud", "Telangana"), ("V. Satyanarayana", "Andhra Pradesh"),
    # Bihar, MP, Gujarat, Punjab, Odisha
    ("Pankaj Kumar Jha", "Bihar"), ("Renu Kumari", "Bihar"), ("Manoj Kumar Paswan", "Bihar"),
    ("Devendra Singh Lodhi", "Madhya Pradesh"), ("Mamta Malviya", "Madhya Pradesh"), ("Bhartiben Patel", "Gujarat"),
    ("Kiritbhai Solanki", "Gujarat"), ("Gurpreet Singh Dhillon", "Punjab"), ("Harpreet Kaur", "Punjab"),
    ("Soumya Ranjan Nayak", "Odisha"), ("Prativa Mohanty", "Odisha"), ("Debendra Pradhan", "Odisha")
]

PLACE_NAMES_BY_STATE = {
    "West Bengal": [
        "Jadavpur Ward 96", "Behala Chowrasta", "Diamond Harbour Port Road", "Asansol Burnpur Bazar",
        "Siliguri Matigara", "Darjeeling Mall Road", "Howrah Domjur", "Kharagpur Nimpura",
        "Baharampur Station Road", "Malda English Bazar", "Barasat Champadali", "Barrackpore Sadar",
        "Alipurduars Kalchini", "Arambagh Pally", "Krishnanagar Kotwali", "Bolpur Santiniketan Road",
        "Bankura Onda Block", "Purulia Balarampur", "Midnapore Town Ghat", "Burdwan Curzon Gate"
    ],
    "Rajasthan": [
        "Ramnagar Ward 14", "Ladpura Link Road", "Sultanpur Mor", "Mandi Chowk", "Sangod Bazar",
        "Kishorepura Chauraha", "Bhimganj Mandi", "Khatoli Village", "Chechat Mod", "Suket Road",
        "Kunhari Sector 2", "Dadabari Extension", "Vigyan Nagar", "Itawa Kasba", "Kaithoon Weavers Colony"
    ],
    "Uttar Pradesh": [
        "Assi Ghat Approach", "Shivpur Bypass", "Rohania Market", "Lanka Chowk", "Pindra Kasba",
        "Sevapuri Block", "Chirai Gaon", "Cholapur Mod", "Harahua Bazar", "Sigra Ward 8",
        "Kashi Station Link", "Babaganj Mohalla", "Rajatalab Mandi", "Phulpur Chauraha", "Badlapur Border"
    ],
    "Maharashtra": [
        "Kothrud Depot Chowk", "Hadapsar Saswad Road", "Baramati MIDC Phase 2", "Daund Kasba",
        "Shirur Market", "Bhosari Telco Road", "Wakad Link Bridge", "Warje Malwadi",
        "Dighi Magazine Corner", "Pimpri Chinchwad Sector 18", "Bhor Ghat Road", "Indapur Town Square"
    ],
    "Karnataka": [
        "Jayanagar 4th Block", "BTM Layout Ring Road", "Kengeri Satellite Town", "Yelahanka Old Town",
        "Electronic City Phase 1", "Banashankari 3rd Stage", "Mysuru Kuvempunagar", "Hubli Vidyanagar",
        "Belagavi Camp Area", "Mangaluru Hampankatta"
    ],
    "Default": [
        "Main Market Chowk", "Station Road Ward 4", "Bus Stand Junction", "Gram Panchayat Office Link",
        "Govt Hospital Approach", "Mataji Mandir Marg", "Kisan Mandi Yard", "Old Town Sector 3"
    ]
}


def generate_500_grievances():
    """Generates 500 rich, realistic, domain-accurate Indian civic complaints."""
    json_path = BASE_DIR / "data" / "constituency_credentials.json"
    ls_records = []
    if json_path.exists():
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            ls_records = [d for d in data if d.get("house") == "Lok Sabha" and d.get("role") == "Member of Parliament"]

    if not ls_records:
        print("Warning: constituency_credentials.json not found or empty, using defaults.")
        ls_records = [
            {"constituency": "KOLKATA DAKSHIN", "district": "KOLKATA DAKSHIN", "state": "West Bengal", "representative": "Mala Roy"},
            {"constituency": "DARJEELING", "district": "DARJEELING", "state": "West Bengal", "representative": "Raju Bista"},
            {"constituency": "ASANSOL", "district": "ASANSOL", "state": "West Bengal", "representative": "Shatrughan Sinha"},
            {"constituency": "HOWRAH", "district": "HOWRAH", "state": "West Bengal", "representative": "Prasun Banerjee"},
            {"constituency": "Kota", "district": "Kota", "state": "Rajasthan", "representative": "Om Birla"},
            {"constituency": "VARANASI", "district": "VARANASI", "state": "Uttar Pradesh", "representative": "Narendra Modi"},
            {"constituency": "PUNE", "district": "PUNE", "state": "Maharashtra", "representative": "Murlidhar Mohol"},
            {"constituency": "BANGALORE SOUTH", "district": "BANGALORE SOUTH", "state": "Karnataka", "representative": "Tejasvi Surya"},
        ]

    # Group constituencies by state
    by_state = {}
    for r in ls_records:
        st = r.get("state")
        if st:
            by_state.setdefault(st, []).append(r)

    # Focus weights: ensure rich representation across all regions, especially West Bengal & key hubs
    focus_states = ["West Bengal", "Rajasthan", "Uttar Pradesh", "Maharashtra", "Karnataka", "Tamil Nadu", "Bihar", "Gujarat", "Delhi", "Telangana", "Kerala", "Madhya Pradesh", "Odisha", "Punjab"]

    results = []
    now = datetime.now(timezone.utc)
    random.seed(42)  # Deterministic high-quality seeding

    target_count = 500

    for i in range(1, target_count + 1):
        # Pick state with balanced distribution
        if i % 4 == 0:
            chosen_state = "West Bengal"
        elif i % 5 == 0:
            chosen_state = "Rajasthan"
        elif i % 6 == 0:
            chosen_state = "Uttar Pradesh"
        else:
            chosen_state = random.choice(focus_states if focus_states else list(by_state.keys()))

        const_pool = by_state.get(chosen_state) or ls_records
        const_info = random.choice(const_pool)

        const_name = const_info.get("constituency", "Kota")
        district_name = const_info.get("district") or const_name
        mp_name = const_info.get("representative") or "Elected Representative"
        state_name = const_info.get("state") or chosen_state

        # Template selection
        tmpl = random.choice(COMPLAINT_TEMPLATES)
        places = PLACE_NAMES_BY_STATE.get(state_name, PLACE_NAMES_BY_STATE["Default"])
        place = random.choice(places)
        months_ago = random.randint(2, 9)
        ward_no = random.randint(1, 35)
        num_ppl = random.choice([250, 450, 800, 1200, 2500, 3000])

        title = tmpl["title_tmpl"].format(place=place, months=months_ago, ward=ward_no, num=num_ppl)
        desc = tmpl["desc_tmpl"].format(place=place, months=months_ago, ward=ward_no, num=num_ppl)

        # Citizen matching state or general
        matched_citizens = [c for c in INDIAN_CITIZEN_NAMES if c[1] == state_name]
        citizen_tuple = random.choice(matched_citizens if matched_citizens else INDIAN_CITIZEN_NAMES)
        citizen_name = citizen_tuple[0]

        # Contact masking
        prefix_num = random.choice(["9830", "9822", "9414", "9811", "9845", "9723", "9872", "9437", "8800"])
        contact_raw = f"+91 {prefix_num}{random.randint(100000, 999999)}"
        contact_masked = f"+91 {prefix_num}*****"

        # Coordinates based on state approximate area
        base_lat, base_lon = 22.5, 88.3
        if state_name == "West Bengal":
            base_lat, base_lon = random.uniform(22.0, 26.5), random.uniform(87.0, 89.0)
        elif state_name == "Rajasthan":
            base_lat, base_lon = random.uniform(24.5, 28.5), random.uniform(73.0, 77.5)
        elif state_name == "Uttar Pradesh":
            base_lat, base_lon = random.uniform(25.0, 28.5), random.uniform(78.5, 83.5)
        elif state_name == "Maharashtra":
            base_lat, base_lon = random.uniform(18.0, 20.5), random.uniform(73.5, 76.5)
        elif state_name == "Karnataka":
            base_lat, base_lon = random.uniform(12.5, 15.5), random.uniform(75.0, 77.5)
        else:
            base_lat, base_lon = random.uniform(12.0, 28.0), random.uniform(73.0, 88.0)

        # Realistic Date: spread over past 180 days
        days_offset = random.randint(1, 160)
        created_time = now - timedelta(days=days_offset, hours=random.randint(1, 23), minutes=random.randint(0, 59))

        # ID generation
        clean_code = re.sub(r'[^A-Z]', '', const_name.upper())[:3] or "PRB"
        st_code = re.sub(r'[^A-Z]', '', state_name.upper())[:2] or "IN"
        prob_id = f"PRB-{st_code}-{clean_code}-{i:04d}"
        work_id = f"WRK/{st_code}-{clean_code}/{created_time.year}/{random.randint(1000, 9999)}" if random.random() > 0.3 else None

        # Status distribution: 40% Pending Review, 25% Action Initiated, 20% Under Investigation, 15% Resolved
        roll = random.random()
        if roll < 0.40:
            status_val = "Pending Review"
            mp_reply = None
            mp_replied_at = None
            auditor_notes = None
            auditor_reviewed_at = None
        elif roll < 0.65:
            status_val = "Action Initiated"
            mp_reply_time = created_time + timedelta(days=random.randint(1, 5), hours=random.randint(2, 8))
            mp_reply = {
                "reply_text": f"I have taken note of this critical civic issue in {place}. {tmpl['action_tmpl']} The executing agency has been mandated to expedite completion and report physical verification.",
                "replied_at": mp_reply_time.isoformat(),
                "replied_by": f"Office of {mp_name}, MP ({const_name})",
                "action_taken": tmpl["action_tmpl"]
            }
            mp_replied_at = mp_reply_time
            auditor_notes = None
            auditor_reviewed_at = None
        elif roll < 0.85:
            status_val = "Under Investigation"
            mp_reply_time = created_time + timedelta(days=random.randint(1, 4))
            audit_time = mp_reply_time + timedelta(days=random.randint(2, 6))
            mp_reply = {
                "reply_text": f"Matter flagged to District Authority Auditor and Executive Engineer for urgent inspection.",
                "replied_at": mp_reply_time.isoformat(),
                "replied_by": f"Office of {mp_name}, MP ({const_name})",
                "action_taken": "Field investigation initiated with District Auditor"
            }
            mp_replied_at = mp_reply_time
            auditor_notes = {
                "notes": f"{tmpl['audit_tmpl']} Site inspection log filed in district portal; formal cure notice served.",
                "audited_at": audit_time.isoformat(),
                "audited_by": f"District Authority Auditor, {district_name}"
            }
            auditor_reviewed_at = audit_time
        else:
            status_val = "Resolved"
            mp_reply_time = created_time + timedelta(days=random.randint(1, 3))
            audit_time = mp_reply_time + timedelta(days=random.randint(3, 10))
            mp_reply = {
                "reply_text": f"Corrective execution successfully completed on-site. Field verification confirmed by district engineering staff. Civic bottleneck resolved for residents of {place}.",
                "replied_at": mp_reply_time.isoformat(),
                "replied_by": f"Office of {mp_name}, MP ({const_name})",
                "action_taken": "Site work executed and certified complete"
            }
            mp_replied_at = mp_reply_time
            auditor_notes = {
                "notes": f"Re-inspection completed. {tmpl['audit_tmpl'].split('.')[0]}. Site fully functional and handed over to local panchayat/civic body.",
                "audited_at": audit_time.isoformat(),
                "audited_by": f"Senior District Auditor, {district_name}"
            }
            auditor_reviewed_at = audit_time

        # Include realistic visual photo proof badge for ~30% of problems
        photo_proof = None
        if random.random() < 0.30:
            # High-fidelity SVG base64 thumbnail representing site evidence inspection
            photo_color = random.choice(["#3b82f6", "#f59e0b", "#10b981", "#6366f1", "#ec4899"])
            cat_icon = tmpl["category"][:16]
            svg_content = f'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240"><rect width="400" height="240" fill="#1e293b"/><circle cx="200" cy="100" r="45" fill="{photo_color}" opacity="0.2"/><path d="M180 90 L200 70 L220 90 L210 90 L210 120 L190 120 L190 90 Z" fill="{photo_color}"/><text x="200" y="165" font-family="sans-serif" font-size="13" font-weight="bold" fill="#f8fafc" text-anchor="middle">OFFICIAL FIELD EVIDENCE RECORD</text><text x="200" y="185" font-family="monospace" font-size="11" fill="#94a3b8" text-anchor="middle">{prob_id} • {const_name}</text><text x="200" y="205" font-family="sans-serif" font-size="10" fill="#64748b" text-anchor="middle">{place} • Verified Site Inspection</text></svg>'
            import base64
            b64_svg = base64.b64encode(svg_content.encode("utf-8")).decode("utf-8")
            photo_proof = f"data:image/svg+xml;base64,{b64_svg}"

        record = {
            "id": prob_id,
            "work_id": work_id,
            "work_title": f"MPLADS Project: {tmpl['category']} Scheme at {place}",
            "title": title,
            "description": desc,
            "constituency": const_name,
            "district": district_name,
            "state": state_name,
            "category": tmpl["category"],
            "comment": desc,
            "photo_proof": photo_proof,
            "reporter_name": citizen_name,
            "citizen_name": citizen_name,
            "contact": contact_raw,
            "contact_masked": contact_masked,
            "latitude": round(base_lat, 4),
            "longitude": round(base_lon, 4),
            "created_at": created_time,
            "status": status_val,
            "mp_reply": mp_reply,
            "mp_replied_at": mp_replied_at,
            "auditor_notes": auditor_notes,
            "auditor_reviewed_at": auditor_reviewed_at
        }
        results.append(record)

    return results


def seed_500_complaints_into_db(purge_old: bool = True):
    """Executes seeding into MongoDB, purging old fake records."""
    if purge_old:
        deleted = citizen_problems.delete_many({})
        print(f"Purged {deleted.deleted_count} previous fake/placeholder problems.")

    complaints = generate_500_grievances()
    citizen_problems.insert_many(complaints)
    total_count = citizen_problems.count_documents({})
    print(f"Successfully seeded {len(complaints)} realistic complaints! Total in DB: {total_count}")
    return total_count


if __name__ == "__main__":
    seed_500_complaints_into_db(purge_old=True)
