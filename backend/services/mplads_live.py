"""
Live MPLADS dashboard API client (mplads.mospi.gov.in /digigov).

The public dashboard at /digigov/dashboard.html renders its tiles and MP-level
reports from an internal JSON REST endpoint:

    POST /rest/PreLoginDashboardData/getTilesReportData
         body: {"combo": "<house selector>", "key": "<dataset name>"}

using the session cookies issued by a plain GET of the dashboard page (no
login). This module replicates that exchange and reshapes the four work-level
datasets into the long `record_type` format already consumed by the ingestion
pipeline (the data/mplads_raw_sample.csv contract), so live rows flow through
the same reshape -> risk scoring -> upsert path as every other feed.

House selector (`combo`) values used by the portal dashboard:
    Rajya Sabha      0,0,0,1
    Lok Sabha (18th) 0,0,0,2,7
    Lok Sabha (17th) 0,0,0,2,5

Politeness: requests are sequential with a delay between datasets, retried
with exponential backoff, and given a long timeout — the Lok Sabha
"Works Recommended" payload exceeds 90 MB and can take minutes.
"""
import json
import re
import time
from typing import Dict, List, Optional

import pandas as pd
import requests

from backend.config import settings

HOUSE_COMBOS = {
    "rajya_sabha": "0,0,0,1",
    "lok_sabha_18": "0,0,0,2,7",
    "lok_sabha_17": "0,0,0,2,5",
}

DATASET_KEYS = {
    "works_recommended": "Works Recommended",
    "works_completed": "Works Completed",
    "expenditure": "Expenditure on Completed and On-going Works as on Date",
    "allocated_limit": "Allocated Limit for Hon'ble MPs",
}

# Exact column contract of the long-format feeds (see data/mplads_raw_sample.csv)
LONG_COLUMNS = [
    "record_type", "source_file", "source_sr_no", "state", "constituency",
    "mp_name", "house", "ida", "work_id", "work_category", "work_type",
    "work_description", "recommended_date", "sanction_date", "completion_date",
    "expenditure_date", "consent_date", "recommended_amount", "sanction_amount",
    "amount_disbursed", "fund_disbursed_amount", "consent_amount",
    "allocated_amount", "work_status", "payment_status", "vendor_name",
    "calamity_type", "calamity_name", "image_marker",
]

HOUSE_LABELS = {
    "rajya_sabha": "Rajya Sabha",
    "lok_sabha_17": "Lok Sabha",
    "lok_sabha_18": "Lok Sabha",
}

_DATE_COLUMNS = [
    "recommended_date", "sanction_date", "completion_date",
    "expenditure_date", "consent_date",
]

# "Shri Javed Ali Khan (2022-28)" -> "Shri Javed Ali Khan"
_TENURE_SUFFIX = re.compile(r"\s*\(\d{4}-\d{2,4}\)\s*$")
# "WS/MP187/2023-2024/1362-Street lights" -> "Street lights"
_ACTIVITY_CODE_PREFIX = re.compile(r"^[A-Za-z]{1,4}/MP\d+/\d{4}-\d{4}/\d+-")

_BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": "en-US,en;q=0.9",
    "X-Requested-With": "XMLHttpRequest",
}


# ------------------------------------------------------------------------------
# Selection & normalization helpers (pure, unit-testable without network)
# ------------------------------------------------------------------------------

def resolve_house_selection(spec: Optional[str] = None) -> List[str]:
    """Map a house spec string to combo keys. Accepts rajya_sabha, lok_sabha
    (defaults to the current 18th term), lok_sabha_17/18, and both/all."""
    s = (spec or settings.MPLADS_LIVE_HOUSE or "rajya_sabha").strip().lower().replace(" ", "_")
    if s in ("both", "all"):
        return ["lok_sabha_18", "rajya_sabha"]
    if s == "lok_sabha":
        return ["lok_sabha_18"]
    if s in HOUSE_COMBOS:
        return [s]
    raise ValueError(
        f"Invalid MPLADS_LIVE_HOUSE '{spec}'. Must be one of: "
        f"rajya_sabha, lok_sabha, lok_sabha_17, lok_sabha_18, both."
    )


def _clean_mp_name(name) -> Optional[str]:
    if name is None:
        return None
    cleaned = _TENURE_SUFFIX.sub("", str(name)).strip()
    return cleaned or None


def _short_work_type(activity_name) -> Optional[str]:
    """Strip the portal's work-code prefix from ACTIVITY_NAME to get the short title."""
    if activity_name is None:
        return None
    text = str(activity_name).strip()
    return _ACTIVITY_CODE_PREFIX.sub("", text).strip() or None


def _valid_entity(rec: dict) -> bool:
    """State/MP must be present and not a Grand Total row."""
    state = str(rec.get("STATE_NAME") or "").strip()
    mp = str(rec.get("MP_NAME") or "").strip()
    if len(state) <= 1 or len(mp) <= 1:
        return False
    if "total" in state.lower() or "total" in mp.lower():
        return False
    return True


def _work_id(rec: dict) -> Optional[str]:
    try:
        wid = int(float(rec.get("WORK_RECOMMENDATION_DTL_ID")))
    except (TypeError, ValueError):
        return None
    return str(wid) if wid > 0 else None


def datasets_to_long_frame(datasets: Dict[str, List[dict]], house: Optional[str] = None) -> pd.DataFrame:
    """Convert raw API records (one list per dataset) into the long-format
    DataFrame contract used by _reshape_long_format / score_dataset. When
    `house` is given ('Lok Sabha'/'Rajya Sabha') every row is tagged with it."""
    rows: List[dict] = []

    for rec in datasets.get("works_recommended", []):
        if not _valid_entity(rec):
            continue
        wid = _work_id(rec)
        if not wid:
            continue
        base = {
            "source_file": "mplads_dashboard_api",
            "source_sr_no": rec.get("Sno"),
            "state": rec.get("STATE_NAME"),
            "constituency": rec.get("CONSTITUENCY"),
            "mp_name": _clean_mp_name(rec.get("MP_NAME")),
            "ida": rec.get("IDA_NAME"),
            "work_id": wid,
            "work_category": rec.get("WORK_CATEGORY"),
            "work_type": _short_work_type(rec.get("ACTIVITY_NAME")),
            "work_description": rec.get("WORK_DESCRIPTION"),
        }
        if rec.get("RECOMMENDATION_DATE") or rec.get("RECOMMENDED_AMOUNT"):
            rows.append({**base, "record_type": "Works Recommended",
                         "recommended_date": rec.get("RECOMMENDATION_DATE"),
                         "recommended_amount": rec.get("RECOMMENDED_AMOUNT")})
        if rec.get("SANCTION_DATE") or rec.get("SANCTION_AMOUNT"):
            rows.append({**base, "record_type": "Works Sanctioned",
                         "sanction_date": rec.get("SANCTION_DATE"),
                         "sanction_amount": rec.get("SANCTION_AMOUNT"),
                         "work_status": rec.get("WORK_STAGE")})

    for rec in datasets.get("works_completed", []):
        if not _valid_entity(rec) or not _work_id(rec):
            continue
        has_image = str(rec.get("FILE_STATUS")).lower() == "true" or rec.get("FILE_STATUS") is True
        rows.append({
            "record_type": "Works Completed",
            "source_file": "mplads_dashboard_api",
            "source_sr_no": rec.get("Sno"),
            "state": rec.get("STATE_NAME"),
            "constituency": rec.get("CONSTITUENCY"),
            "mp_name": _clean_mp_name(rec.get("MP_NAME")),
            "ida": rec.get("IDA_NAME"),
            "work_id": _work_id(rec),
            "work_category": rec.get("WORK_CATEGORY"),
            "work_type": _short_work_type(rec.get("ACTIVITY_NAME")),
            "work_description": rec.get("WORK_DESCRIPTION"),
            "completion_date": rec.get("ACTUAL_END_DATE"),
            "amount_disbursed": rec.get("ACTUAL_AMOUNT"),
            "image_marker": "Yes" if has_image else "No",
        })

    for rec in datasets.get("expenditure", []):
        if not _valid_entity(rec) or not _work_id(rec):
            continue
        rows.append({
            "record_type": "Expenditure on Completed & On-going Works",
            "source_file": "mplads_dashboard_api",
            "source_sr_no": rec.get("Sno"),
            "state": rec.get("STATE_NAME"),
            "constituency": rec.get("CONSTITUENCY"),
            "mp_name": _clean_mp_name(rec.get("MP_NAME")),
            "ida": rec.get("IDA_NAME") or rec.get("IA_NAME"),
            "work_id": _work_id(rec),
            "work_type": _short_work_type(rec.get("ACTIVITY_NAME")),
            "work_description": rec.get("ACTIVITY_NAME"),
            "expenditure_date": rec.get("EXPENDITURE_DATE"),
            "fund_disbursed_amount": rec.get("FUND_DISBURSED_AMT"),
            "payment_status": rec.get("WORK_STATUS"),
            "vendor_name": rec.get("VENDOR_NAME"),
        })

    for rec in datasets.get("allocated_limit", []):
        if not _valid_entity(rec):
            continue
        rows.append({
            "record_type": "MP Allocated Limit",
            "source_file": "mplads_dashboard_api",
            "source_sr_no": rec.get("Sno"),
            "state": rec.get("STATE_NAME"),
            "constituency": rec.get("CONSTITUENCY"),
            "mp_name": _clean_mp_name(rec.get("MP_NAME")),
            "allocated_amount": rec.get("ALLOCATED_AMT"),
        })

    df = pd.DataFrame(rows, columns=LONG_COLUMNS)
    if house:
        df["house"] = house

    # Portal dates look like "Apr 3, 2024 12:00:00 AM" — normalize to ISO dates.
    for col in _DATE_COLUMNS:
        if col in df.columns:
            parsed = pd.to_datetime(df[col], errors="coerce")
            df[col] = parsed.dt.strftime("%Y-%m-%d")
    return df


# ------------------------------------------------------------------------------
# HTTP client
# ------------------------------------------------------------------------------

def _extract_records(payload, requested_key: str) -> List[dict]:
    """Unwrap the portal response: a single-key object whose value is usually a
    JSON-encoded string containing the record array."""
    if isinstance(payload, list):
        return payload
    if not isinstance(payload, dict):
        raise ValueError(f"Unexpected response shape: {type(payload).__name__}")

    raw = payload.get(requested_key)
    if raw is None:
        wanted = requested_key.lower()
        for key, value in payload.items():
            k = key.lower()
            if wanted in k or k in wanted:
                raw = value
                break
        if raw is None and len(payload) == 1:
            raw = next(iter(payload.values()))
    if raw is None:
        raise ValueError(f"No data key in response (keys: {list(payload)})")

    if isinstance(raw, str):
        raw = json.loads(raw)
    if isinstance(raw, dict):
        raw = next(iter(raw.values()), [])
    if not isinstance(raw, list):
        raise ValueError(f"Expected record array, got {type(raw).__name__}")
    return raw


class MPLADSLiveClient:
    """Session-managed client for the dashboard's internal REST endpoint."""

    def __init__(self, base_url: str = None, timeout: int = None,
                 max_retries: int = 2, inter_request_delay: float = 1.0,
                 retry_delay: float = 2.0):
        self.base_url = (base_url or settings.MPLADS_BASE_URL).rstrip("/")
        self.timeout = timeout or settings.MPLADS_LIVE_TIMEOUT
        self.max_retries = max_retries
        self.inter_request_delay = inter_request_delay
        self.retry_delay = retry_delay
        self.session = requests.Session()
        self.session.headers.update(_BROWSER_HEADERS)

    def _bootstrap_session(self) -> None:
        """Visit the dashboard page to collect the session cookies the API needs."""
        resp = self.session.get(
            f"{self.base_url}/digigov/dashboard.html",
            timeout=min(self.timeout, 60),
        )
        resp.raise_for_status()
        if not self.session.cookies:
            raise RuntimeError("Dashboard page issued no session cookies")

    def fetch_dataset(self, combo_key: str, dataset: str) -> List[dict]:
        if combo_key not in HOUSE_COMBOS:
            raise ValueError(f"Unknown house '{combo_key}'. Must be one of {list(HOUSE_COMBOS)}")
        key = DATASET_KEYS.get(dataset)
        if not key:
            raise ValueError(f"Unknown dataset '{dataset}'. Must be one of {list(DATASET_KEYS)}")

        last_err = None
        for attempt in range(1, self.max_retries + 1):
            try:
                if not self.session.cookies:
                    self._bootstrap_session()
                resp = self.session.post(
                    f"{self.base_url}/rest/PreLoginDashboardData/getTilesReportData",
                    json={"combo": HOUSE_COMBOS[combo_key], "key": key},
                    timeout=self.timeout,
                )
                if resp.status_code in (401, 403):
                    self.session.cookies.clear()
                    raise RuntimeError(f"Session rejected (HTTP {resp.status_code})")
                resp.raise_for_status()
                records = _extract_records(resp.json(), key)
                if not records:
                    raise ValueError("Endpoint returned 0 records")
                return records
            except Exception as e:  # noqa: BLE001 — rethrow aggregated below
                last_err = e
                self.session.cookies.clear()
                if attempt < self.max_retries:
                    time.sleep(self.retry_delay * (2 ** (attempt - 1)))
        raise RuntimeError(
            f"Live fetch failed for {combo_key}/{dataset} "
            f"after {self.max_retries} attempts: {last_err}"
        )

    def fetch_long_dataframe(self, houses: Optional[str] = None) -> pd.DataFrame:
        """Fetch all four datasets for the selected houses and return the
        long-format DataFrame ready for the ingestion pipeline. Rows are
        tagged with the house they were fetched from."""
        import gc
        combos = resolve_house_selection(houses)
        frames: List[pd.DataFrame] = []

        for combo_key in combos:
            collected: Dict[str, List[dict]] = {name: [] for name in DATASET_KEYS}
            for dataset in DATASET_KEYS:
                collected[dataset].extend(self.fetch_dataset(combo_key, dataset))
                time.sleep(self.inter_request_delay)
            df = datasets_to_long_frame(collected, house=HOUSE_LABELS[combo_key])
            del collected
            gc.collect()
            if not df.empty:
                frames.append(df)

        if not frames:
            raise ValueError("Live dashboard API returned no usable records")
        df = frames[0] if len(frames) == 1 else pd.concat(frames, ignore_index=True)
        del frames
        gc.collect()
        return df


def fetch_live_long_dataframe(houses: Optional[str] = None,
                              base_url: str = None,
                              timeout: int = None) -> pd.DataFrame:
    """Convenience entry point used by the ingestion pipeline."""
    return MPLADSLiveClient(base_url=base_url, timeout=timeout).fetch_long_dataframe(houses)
