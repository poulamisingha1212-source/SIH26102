"""
Security regression test suite proving the mitigation of 8 attack vectors:
1. X-User-Role header spoofing fails (401 Unauthorized)
2. target_role privilege escalation fails (server-side role authoritative)
3. Unauthenticated reviewer access fails (401 Unauthorized)
4. Unauthenticated sync trigger fails (401 Unauthorized)
5. Brute-force login triggers rate limiter (429 Too Many Requests)
6. Oversized photo upload is rejected (413 Payload Too Large)
7. Malformed photo format is rejected (422 Unprocessable Entity)
8. Unrestricted export row limit and rate limits enforced
"""
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.auth import (
    login_limiter, public_review_limiter, export_limiter,
    ROLE_MOSPI_REVIEWER, ROLE_DISTRICT_AUDITOR, create_access_token
)

client = TestClient(app)


def test_1_x_user_role_header_spoofing_rejected():
    """Attack 1: Attacker sends 'X-User-Role: MoSPI Reviewer' to elevate privileges."""
    list_res = client.get("/api/works?page_size=1")
    assert list_res.status_code == 200
    work_id = list_res.json()["items"][0]["work_id"]

    spoofed_headers = {
        "X-User-Role": "MoSPI Reviewer",
        "X-Target-Role": "MoSPI Reviewer",
    }
    review_res = client.post(
        f"/api/works/{work_id}/review",
        json={"outcome": "irregularity", "notes": "Hacked review"},
        headers=spoofed_headers,
    )
    assert review_res.status_code == 401
    assert "detail" in review_res.json()

    sync_res = client.post(
        "/api/sync/run?mode=auto",
        headers=spoofed_headers,
    )
    assert sync_res.status_code == 401


def test_2_target_role_privilege_escalation_fails():
    """Attack 2: District Auditor account attempts to elevate to MoSPI Reviewer via target_role."""
    login_res = client.post(
        "/api/auth/login",
        json={
            "username": "auditor",
            "password": "Auditor@MPLADS2026!",
            "target_role": "MoSPI Reviewer",  # Malicious attempt to self-elevate
        }
    )
    assert login_res.status_code == 200
    data = login_res.json()
    # Server must ignore target_role and enforce the database role
    assert data["role"] == ROLE_DISTRICT_AUDITOR
    assert data["role"] != ROLE_MOSPI_REVIEWER
    token = data["access_token"]

    # Auditor token must NOT be authorized to run sync (MoSPI Reviewer only)
    sync_res = client.post(
        "/api/sync/run?mode=auto",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert sync_res.status_code == 403
    assert "Only MoSPI Reviewers" in sync_res.json()["detail"]


def test_3_unauthenticated_reviewer_access_rejected():
    """Attack 3: Unauthenticated user attempts to submit audit review."""
    list_res = client.get("/api/works?page_size=1")
    work_id = list_res.json()["items"][0]["work_id"]

    res = client.post(
        f"/api/works/{work_id}/review",
        json={"outcome": "legitimate", "notes": "Unauthenticated note"},
    )
    assert res.status_code == 401


def test_4_unauthenticated_sync_trigger_rejected():
    """Attack 4: Unauthenticated user attempts to trigger pipeline ingestion."""
    res = client.post("/api/sync/run?mode=auto")
    assert res.status_code == 401


def test_5_brute_force_login_rate_limiting():
    """Attack 5: Attacker attempts brute-force credential stuffing."""
    login_limiter._records.clear()
    
    # 5 failed attempts are allowed within rate window (max_requests=5)
    for _ in range(5):
        res = client.post(
            "/api/auth/login",
            json={"username": "admin", "password": "WrongPassword123!"}
        )
        assert res.status_code == 401

    # 6th attempt from the same client IP must be throttled with 429
    res_blocked = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "WrongPassword123!"}
    )
    assert res_blocked.status_code == 429
    assert "Too many login attempts" in res_blocked.json()["detail"]
    
    login_limiter._records.clear()


def test_6_oversized_photo_upload_rejected():
    """Attack 6: Attacker attempts DoS / storage inflation via oversized base64 photo (> 2MB)."""
    list_res = client.get("/api/works?page_size=1")
    work_id = list_res.json()["items"][0]["work_id"]

    # Generate oversized payload (> 2,000,000 chars)
    giant_base64 = "data:image/jpeg;base64," + ("A" * 2_050_000)
    res = client.post(
        f"/api/works/{work_id}/public-review",
        json={
            "is_completed": True,
            "comment": "Site inspection test",
            "photo_proof": giant_base64,
            "reporter_name": "Citizen X"
        }
    )
    # Rejection by Pydantic schema validator (422) or endpoint guard (413)
    assert res.status_code in (413, 422)


def test_7_malformed_photo_format_rejected():
    """Attack 7: Attacker uploads non-image payload (e.g. javascript/executable script)."""
    list_res = client.get("/api/works?page_size=1")
    work_id = list_res.json()["items"][0]["work_id"]

    res = client.post(
        f"/api/works/{work_id}/public-review",
        json={
            "is_completed": False,
            "comment": "Malicious payload test",
            "photo_proof": "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
            "reporter_name": "Attacker"
        }
    )
    assert res.status_code == 422
    assert "Invalid image format" in res.json()["detail"]


def test_8_export_protection_and_limits():
    """Attack 8: Attacker attempts to flood or dump entire database via unlimited export."""
    # Row limit cap enforcement: row_limit > 10,000 is rejected with 422
    res_exceeded = client.get("/api/export/works?row_limit=50000")
    assert res_exceeded.status_code == 422

    # Maximum allowed export limit (10,000) succeeds
    res_valid = client.get("/api/export/works?row_limit=100")
    assert res_valid.status_code == 200
    assert int(res_valid.headers.get("X-Row-Limit", 0)) == 100

    # Rate limiting on export (max 10 requests per minute)
    export_limiter._records.clear()
    for _ in range(10):
        r = client.get("/api/export/works?row_limit=5")
        assert r.status_code == 200

    r_blocked = client.get("/api/export/works?row_limit=5")
    assert r_blocked.status_code == 429
    assert "Export rate limit reached" in r_blocked.json()["detail"]
    export_limiter._records.clear()


def test_9_no_credentials_or_hashes_leaked_in_responses():
    """Verify that user records, logins, and API responses never expose password hashes."""
    login_res = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "Admin@MPLADS2026!"}
    )
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "password" not in login_data
    assert "password_hash" not in login_data

    list_res = client.get("/api/works?page_size=5")
    assert "password" not in list_res.text
    assert "password_hash" not in list_res.text
