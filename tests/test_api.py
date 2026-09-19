import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import works
from backend.config import settings

client = TestClient(app)


def pytest_configure(config):
    """Portal-only pipeline: if the database is empty (fresh environment),
    seed it from the bundled sample feed directly so tests never depend on network."""
    count = works.count_documents({})
    if count == 0:
        import pandas as pd
        from backend.services.ingestion import _reshape_long_format, _upsert_dataframe
        from model.risk_engine import score_dataset
        sample_path = settings.RAW_SAMPLE_PATH
        if sample_path.exists():
            raw = pd.read_csv(sample_path)
            reshaped = _reshape_long_format(raw)
            scored = score_dataset(reshaped, model_dir=settings.MODEL_DIR)
            _upsert_dataframe(scored)


def test_get_works_pagination_and_priority_order():
    """Verify /works returns paginated results in priority rank order."""
    response = client.get("/api/works?page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert data["total"] >= 100
    assert len(data["items"]) == 10
    
    # Priority rank order (1 <= 2 <= 3 ...)
    ranks = [item["priority_rank"] for item in data["items"]]
    assert ranks == sorted(ranks)
    assert ranks[0] == 1  # Top priority case

def test_get_works_filtering():
    """Verify /works filtering by risk_tier and state."""
    response = client.get("/api/works?risk_tier=High Risk - Review&page_size=5")
    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["risk_tier"] == "High Risk - Review"

def test_get_case_packet():
    """Verify /works/{work_id} returns the complete case packet with explainability causes."""
    # Fetch first work
    list_res = client.get("/api/works?page_size=1")
    top_work = list_res.json()["items"][0]
    work_id = top_work["work_id"]

    res = client.get(f"/api/works/{work_id}")
    assert res.status_code == 200
    packet = res.json()
    assert packet["work_id"] == work_id
    assert packet["final_risk_score"] == top_work["final_risk_score"]
    assert packet["priority_rank"] == top_work["priority_rank"]
    assert isinstance(packet["causes"], list)
    assert len(packet["causes"]) > 0

def test_get_stats_overview():
    """Verify /stats/overview returns aggregated metrics and sync health."""
    res = client.get("/api/stats/overview")
    assert res.status_code == 200
    stats = res.json()
    assert stats["total_works"] >= 100
    assert stats["high_risk_count"] > 0
    assert len(stats["top_risk_mps"]) > 0
    assert len(stats["top_risk_states"]) > 0
    assert "latest_sync_status" in stats


def test_get_analytics_states():
    """Verify /api/analytics/states returns top state anomalies."""
    res = client.get("/api/analytics/states")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    if len(data) > 0:
        first = data[0]
        assert "state" in first or "name" in first
        assert "high_risk_count" in first
        assert "works_count" in first or "count" in first


def test_stats_overview_house_filter_does_not_inflate_allocation():
    """House scope must filter mp_allocations.house, not cross-join works."""
    unscoped = client.get("/api/stats/overview")
    assert unscoped.status_code == 200
    all_alloc = unscoped.json()["total_allocated_amount"]

    lok = client.get("/api/stats/overview?house=Lok Sabha")
    assert lok.status_code == 200
    lok_stats = lok.json()
    lok_alloc = lok_stats["total_allocated_amount"]

    # Subset of the ledger — never multiplied by the number of work rows.
    assert lok_alloc <= all_alloc + 0.01
    if lok_stats["total_works"] > 1 and all_alloc > 0:
        assert lok_alloc < all_alloc * lok_stats["total_works"] * 0.5


def test_mp_directory_includes_allocated_amount():
    """Compare view reads allocated_amount from the MP directory payload."""
    res = client.get("/api/mps?page_size=5")
    assert res.status_code == 200
    items = res.json()["items"]
    assert items
    assert "allocated_amount" in items[0]
    assert items[0]["allocated_amount"] >= 0

def test_human_review_workflow_and_rbac():
    """Verify POST /works/{work_id}/review records review and enforces RBAC via JWT."""
    list_res = client.get("/api/works?page_size=1")
    work_id = list_res.json()["items"][0]["work_id"]

    # 1. MoSPI Reviewer logs in and succeeds
    login_res = client.post("/api/auth/login", json={"username": "admin", "password": "Admin@MPLADS2026!"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    review_payload = {
        "outcome": "irregularity",
        "notes": "CAG report cross-examination indicates procurement concentration.",
        "reviewer_name": "Audit Officer Sharma",
        "reviewer_role": "MoSPI Reviewer"
    }
    res = client.post(
        f"/api/works/{work_id}/review",
        json=review_payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    assert res.json()["success"] is True
    assert res.json()["outcome"] == "irregularity"

    # Verify work was updated
    packet_res = client.get(f"/api/works/{work_id}")
    assert packet_res.json()["human_review_outcome"] == "irregularity"
    assert len(packet_res.json()["prior_reviews"]) > 0

    # 2. Spoofed header without valid token is 401 Unauthorized
    spoof_res = client.post(
        f"/api/works/{work_id}/review",
        json=review_payload,
        headers={"X-User-Role": "MoSPI Reviewer"}
    )
    assert spoof_res.status_code == 401


def test_unauthenticated_review_is_forbidden():
    """Fail-closed RBAC: a request without authentication must be rejected."""
    list_res = client.get("/api/works?page_size=1")
    work_id = list_res.json()["items"][0]["work_id"]
    res = client.post(
        f"/api/works/{work_id}/review",
        json={"outcome": "legitimate"},
    )
    assert res.status_code == 401



def test_invalid_sort_field_rejected():
    """Only whitelisted sort fields are accepted on /works."""
    res = client.get("/api/works?sort_by=likelihood_score")
    assert res.status_code == 400


def test_mp_directory_and_profile():
    """MP directory returns aggregates; profile deepens a single MP."""
    res = client.get("/api/mps?page_size=5&sort_by=total_sanctioned")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] > 0
    assert len(data["items"]) == 5
    first = data["items"][0]
    assert first["mp_name"]
    assert first["works_count"] > 0
    assert first["total_sanctioned"] >= 0
    # Descending total_sanctioned ordering
    amounts = [i["total_sanctioned"] for i in data["items"]]
    assert amounts == sorted(amounts, reverse=True)

    profile_res = client.get(f"/api/mps/{first['mp_name']}")
    assert profile_res.status_code == 200
    profile = profile_res.json()
    assert profile["mp_name"]
    assert profile["works_count"] > 0
    assert set(profile["tier_distribution"].keys()) == {
        "High Risk - Review", "Medium Risk - Monitor", "Low Risk"
    }
    assert len(profile["top_risk_works"]) > 0
    assert isinstance(profile["category_breakdown"], list)

    # Unknown MP → 404
    assert client.get("/api/mps/Definitely Not An MP").status_code == 404


def test_state_directory_and_profile():
    """State directory returns aggregates; profile returns top MPs."""
    res = client.get("/api/states?page_size=5")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 10  # dozens of states/UTs, not one collapsed row
    assert len(data["items"]) == 5
    first = data["items"][0]
    assert first["state"]
    assert first["mp_count"] > 0
    counts = [i["works_count"] for i in data["items"]]
    assert len(counts) == 5
    assert all(isinstance(c, int) and c >= 0 for c in counts)
    assert sum(counts) > 0

    profile_res = client.get(f"/api/states/{first['state']}")
    assert profile_res.status_code == 200
    profile = profile_res.json()
    assert profile["works_count"] > 0
    assert len(profile["top_mps"]) > 0
    assert isinstance(profile["category_breakdown"], list)


def test_category_and_status_analytics():
    """Chart aggregations return shares that sum to ~1."""
    cat_res = client.get("/api/analytics/categories")
    assert cat_res.status_code == 200
    cats = cat_res.json()
    assert len(cats) > 0
    assert "sanctioned_share" in cats[0]

    st_res = client.get("/api/analytics/status")
    assert st_res.status_code == 200
    statuses = st_res.json()
    assert len(statuses) > 0
    assert abs(sum(s["share"] for s in statuses) - 1.0) < 0.01


def test_csv_export_streams_filtered_rows():
    """Open-data export streams CSV with the same filters as /works."""
    res = client.get("/api/export/works?risk_tier=High Risk - Review&row_limit=50")
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")
    lines = res.text.strip().splitlines()
    assert lines[0].startswith("work_id,mp_name")
    assert len(lines) <= 51  # header + up to 50 rows


def test_filter_options_extended():
    """Filter options now include statuses and MPs for the directory filters."""
    res = client.get("/api/filter-options")
    assert res.status_code == 200
    data = res.json()
    assert len(data["states"]) > 0
    assert len(data["categories"]) > 0
    assert len(data["statuses"]) > 0
    assert len(data["mps"]) > 0


def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"
    assert data["works_count"] >= 100


def test_works_respect_mp_name_filter():
    """The mp_name filter param is honored by the works list."""
    mp_res = client.get("/api/mps?page_size=1")
    mp_name = mp_res.json()["items"][0]["mp_name"]
    res = client.get(f"/api/works?mp_name={mp_name}&page_size=10")
    assert res.status_code == 200
    for item in res.json()["items"]:
        assert item["mp_name"] == mp_name


# ------------------------------------------------------------------------------
# Ingestion pipeline (mode-based sync) tests
# ------------------------------------------------------------------------------

def test_sync_run_rejects_invalid_mode():
    login_res = client.post("/api/auth/login", json={"username": "admin", "password": "Admin@MPLADS2026!"})
    token = login_res.json()["access_token"]
    res = client.post(
        "/api/sync/run?mode=does-not-exist",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 400
    assert "Invalid ingestion mode" in res.json()["detail"]


def test_sync_run_rejects_removed_modes():
    """Baseline/remote/sample modes were removed — the live portal API is the
    only source, so those modes must be rejected outright."""
    login_res = client.post("/api/auth/login", json={"username": "admin", "password": "Admin@MPLADS2026!"})
    token = login_res.json()["access_token"]
    for mode in ("baseline", "remote", "sample"):
        res = client.post(
            f"/api/sync/run?mode={mode}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 400


def test_sync_run_requires_reviewer_role_for_all_modes():
    for mode in ("auto", "live"):
        res = client.post(f"/api/sync/run?mode={mode}")
        assert res.status_code == 401


# ------------------------------------------------------------------------------
# Production Hardening & Canonical Routes Tests
# ------------------------------------------------------------------------------

def test_cron_sync_requires_post_and_authorization(monkeypatch):
    """GET /api/cron/sync must return 405 Method Not Allowed; POST requires CRON_SECRET."""
    # GET is rejected
    get_res = client.get("/api/cron/sync")
    assert get_res.status_code == 405

    # POST without secret is 403
    unauth_res = client.post("/api/cron/sync?mode=live")
    assert unauth_res.status_code == 403

    # POST with valid secret executes ingestion
    monkeypatch.setattr("backend.main._cron_authorized", lambda req: True)
    monkeypatch.setattr("backend.main.run_ingestion", lambda mode: {"status": "success", "processed": 0})
    auth_res = client.post("/api/cron/sync?mode=live")
    assert auth_res.status_code == 200
    assert auth_res.json()["status"] == "success"


def test_non_api_routes_are_removed():
    """Duplicate non-/api routes have been removed in favor of canonical /api/* endpoints."""
    assert client.get("/works").status_code == 404
    assert client.get("/stats/overview").status_code == 404
    assert client.get("/health").status_code == 404
    assert client.get("/sync/status").status_code == 404


def test_cors_configuration():
    """CORS middleware returns explicit allowed methods and headers on preflight."""
    res = client.options(
        "/api/works",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization, Content-Type",
        }
    )
    assert res.status_code == 200
    allow_methods = res.headers.get("access-control-allow-methods", "")
    assert "GET" in allow_methods
    assert "POST" in allow_methods
    assert "*" not in allow_methods


def test_production_config_validation_fails_fast(monkeypatch):
    """In production, default JWT secret or localhost Mongo must fail fast with ValueError."""
    from backend.config import Settings

    # Case 1: Default JWT secret in production
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("JWT_SECRET", "mplads-sentinel-jwt-secret-key-32-chars-min!")
    monkeypatch.setenv("MONGODB_URI", "mongodb+srv://user:pass@cluster.mongodb.net/test")
    monkeypatch.setenv("DEMO_ADMIN_PASSWORD", "SecureUniquePassword2026!")
    with pytest.raises(ValueError, match="JWT_SECRET must be explicitly set"):
        Settings()

    # Case 2: Localhost Mongo URI in production
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("JWT_SECRET", "cryptographically-strong-secret-key-12345!")
    monkeypatch.setenv("MONGODB_URI", "mongodb://localhost:27017")
    with pytest.raises(ValueError, match="MONGODB_URI must be explicitly set to a production database"):
        Settings()


def test_public_review_geolocation_auditor_privacy():
    """Verify citizen geolocation is captured and strictly visible only to auditors."""
    from backend.auth import create_access_token
    from backend.database import public_reviews

    work_res = client.get("/api/works?page_size=1")
    work_id = work_res.json()["items"][0]["work_id"]

    # 1. Submit public review with GPS location
    sub_res = client.post(
        f"/api/works/{work_id}/public-review",
        json={
            "is_completed": True,
            "comment": "Field verification with GPS coordinates and camera",
            "photo_proof": "data:image/jpeg;base64,dGVzdA==",
            "reporter_name": "Citizen Audit Inspector",
            "latitude": 28.6139,
            "longitude": 77.2090,
            "location_accuracy": 10.5
        }
    )
    assert sub_res.status_code == 200
    assert sub_res.json()["latitude"] == 28.6139

    try:
        # 2. Public view (unauthenticated) — Coordinates must be REDACTED
        pub_res = client.get(f"/api/works/{work_id}")
        assert pub_res.status_code == 200
        pub_item = [r for r in pub_res.json()["public_reviews"] if r["reporter_name"] == "Citizen Audit Inspector"][0]
        assert pub_item["latitude"] is None
        assert pub_item["longitude"] is None
        assert pub_item["location_accuracy"] is None

        # 3. Auditor view (authenticated) — Coordinates must be VISIBLE
        token = create_access_token({"sub": "admin", "role": "MoSPI Reviewer"})
        aud_res = client.get(
            f"/api/works/{work_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert aud_res.status_code == 200
        aud_item = [r for r in aud_res.json()["public_reviews"] if r["reporter_name"] == "Citizen Audit Inspector"][0]
        assert aud_item["latitude"] == 28.6139
        assert aud_item["longitude"] == 77.2090
        assert aud_item["location_accuracy"] == 10.5
    finally:
        public_reviews.delete_many({"work_id": work_id, "reporter_name": "Citizen Audit Inspector"})


