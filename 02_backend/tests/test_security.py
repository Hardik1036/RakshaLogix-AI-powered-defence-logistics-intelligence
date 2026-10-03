"""
Defence Security & RBAC Test Suite
Validates Operational Security Invariants:
1. HTTP Security Headers
2. Zero Unauthenticated Access
3. Granular Role-Based Access Control (Edge read-only blocked from orders)
4. Anti-Tampering Coordinate Boundaries (WGS84)
5. Immutable Audit Logging
"""

import pytest
from app.models.auth import AuditLog
from app.models.intelligence import Alert


def test_security_headers_present(client):
    """Verifies that all defense-mandated HTTP security headers are injected."""
    response = client.get("/")
    assert response.status_code == 200
    headers = response.headers
    assert headers.get("x-content-type-options") == "nosniff"
    assert headers.get("x-frame-options") == "DENY"
    assert "max-age=31536000" in headers.get("strict-transport-security", "")
    assert "default-src 'none'" in headers.get("content-security-policy", "")


def test_unauthenticated_request_blocked(client):
    """Verifies that unauthenticated access to tactical endpoints is rejected with HTTP 401."""
    response = client.get("/api/v1/inventory")
    assert response.status_code == 401
    assert "Not authenticated" in response.json().get("detail", "")


def test_invalid_token_rejected(client):
    """Verifies that tampered or invalid bearer tokens are rejected."""
    bad_headers = {"Authorization": "Bearer BAD_SIGNATURE_TOKEN_DEFENCE_TAMPER"}
    response = client.get("/api/v1/inventory", headers=bad_headers)
    assert response.status_code == 401


def test_edge_read_only_blocked_from_convoy_dispatch(client, edge_headers):
    """
    MANDATORY RBAC INVARIANT:
    EDGE_READ_ONLY personnel MUST be blocked from authorizing convoy movements (HTTP 403).
    """
    payload = {
        "route_id": "RT_LEH_DBO",
        "origin_id": "HQ_LEH",
        "dest_id": "POST_DBO",
        "vehicle_count": 3,
        "cargo_type": "Fuel",
        "cargo_quantity": 15.0,
        "sign_off_action": "ACCEPT",
        "sign_off_notes": "Unauthorized edge dispatch attempt"
    }
    response = client.post("/api/v1/convoys", json=payload, headers=edge_headers)
    assert response.status_code == 403
    assert "Access Forbidden" in response.json().get("detail", "")


def test_edge_read_only_blocked_from_alert_acknowledgement(client, edge_headers):
    """EDGE_READ_ONLY personnel MUST NOT acknowledge operational defense alerts (HTTP 403)."""
    response = client.patch("/api/v1/alerts/ALT_TEST_01/ack", json={"notes": "Illegal ack"}, headers=edge_headers)
    assert response.status_code == 403


def test_logistics_officer_allowed_convoy_dispatch(client, logistics_headers, db_session):
    """Logistics Officer possesses legitimate dispatch privileges with human sign-off."""
    payload = {
        "route_id": "RT_LEH_DBO",
        "origin_id": "HQ_LEH",
        "dest_id": "POST_DBO",
        "vehicle_count": 4,
        "cargo_type": "Fuel",
        "cargo_quantity": 25.0,
        "sign_off_action": "ACCEPT",
        "sign_off_notes": "Urgent winter buffer resupply"
    }
    response = client.post("/api/v1/convoys", json=payload, headers=logistics_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "SCHEDULED"
    assert data["sign_off_officer_id"] == "test_logistics"
    assert data["sign_off_action"] == "ACCEPT"

    # Verify audit log entry
    audit = db_session.query(AuditLog).filter(AuditLog.action == "CONVOY_DISPATCH_AUTHORIZED").first()
    assert audit is not None
    assert audit.user_id == "test_logistics"


def test_commander_allowed_alert_acknowledgement(client, commander_headers, db_session):
    """Corps Commander successfully signs off and acknowledges alerts."""
    response = client.patch(
        "/api/v1/alerts/ALT_TEST_01/ack",
        json={"notes": "Airlift resupply standing by"},
        headers=commander_headers
    )
    assert response.status_code == 200
    assert response.json()["status"] == "ACKNOWLEDGED"
    assert response.json()["acknowledged_by"] == "test_commander"


def test_wgs84_coordinate_boundary_tampering_prevented(client, logistics_headers):
    """
    Data Sanitization: Pydantic coordinate boundaries strictly reject invalid coordinates.
    Longitude must be in [-180, 180], Latitude in [-90, 90].
    """
    # Create valid convoy first
    convoy_payload = {
        "route_id": "RT_LEH_DBO",
        "origin_id": "HQ_LEH",
        "dest_id": "POST_DBO",
        "vehicle_count": 2,
        "cargo_type": "Rations",
        "cargo_quantity": 10.0,
        "sign_off_action": "ACCEPT",
    }
    c_res = client.post("/api/v1/convoys", json=convoy_payload, headers=logistics_headers)
    assert c_res.status_code == 201
    convoy_id = c_res.json()["id"]

    # Attempt coordinate tampering: Longitude = 299.0 (exceeds 180.0)
    tamper_payload = {
        "status": "IN_TRANSIT",
        "current_longitude": 299.0,
        "current_latitude": 34.5
    }
    patch_res = client.patch(f"/api/v1/convoys/{convoy_id}/status", json=tamper_payload, headers=logistics_headers)
    assert patch_res.status_code == 422  # Pydantic validation rejected geometric tampering
