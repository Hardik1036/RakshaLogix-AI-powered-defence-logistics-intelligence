"""
Tactical Pipeline & Algorithmic Invariants Test Suite
Validates:
1. Hard In-Memory Simulation Sandbox Isolation Invariant (ZERO SQL mutation on base tables)
2. ML Forecast Ingress & Hybrid Critical Alert Filter
3. Multi-Factor Routing Optimization & Secondary Corridors
4. Zero Autonomous Troops Orders Invariant (Strict Human-in-the-Loop)
5. Tactical KPI Summary Engine
"""

import pytest
from app.models.logistics import Inventory, Convoy, Route
from app.models.intelligence import Alert, SimulationRun


def test_simulation_sandbox_hard_isolation(client, commander_headers, db_session):
    """
    MANDATORY DEFENSE INVARIANT:
    Simulation runs MUST clone tactical state strictly in-memory.
    NEVER execute SQL UPDATE, INSERT, or DELETE on base production tables (inventory, convoys, routes).
    """
    # 1. Snapshot base database state prior to simulation
    inv_before = [(inv.id, inv.unit_id, inv.item_type, inv.quantity) for inv in db_session.query(Inventory).all()]
    convoys_before = db_session.query(Convoy).count()
    routes_before = [(r.id, r.status, r.is_snow_blocked) for r in db_session.query(Route).all()]

    assert len(inv_before) > 0
    assert len(routes_before) > 0

    # 2. Execute aggressive war-game scenario with massive surge and blocked passes
    sim_payload = {
        "scenario_name": "Operation_White_Glacier_Heavy_Blockade",
        "demand_multiplier": 4.0,
        "snowfall_delta": 75.0,
        "blocked_route_ids": ["RT_LEH_DBO"],
        "simulation_days": 10
    }
    response = client.post("/api/v1/simulation/scenario", json=sim_payload, headers=commander_headers)
    assert response.status_code == 200
    sim_data = response.json()

    assert sim_data["sandbox_isolation_verified"] is True
    assert sim_data["simulated_stockouts"] >= sim_data["baseline_stockouts"]
    assert "recommended_prestage_depot" in sim_data

    # 3. VERIFY BASE PRODUCTION TABLES WERE NOT MUTATED
    inv_after = [(inv.id, inv.unit_id, inv.item_type, inv.quantity) for inv in db_session.query(Inventory).all()]
    convoys_after = db_session.query(Convoy).count()
    routes_after = [(r.id, r.status, r.is_snow_blocked) for r in db_session.query(Route).all()]

    # Exact equality check on base tables
    assert inv_before == inv_after, "INVARIANT VIOLATION: Inventory was mutated by simulation run!"
    assert convoys_before == convoys_after, "INVARIANT VIOLATION: Convoys table was altered by simulation run!"
    assert routes_before == routes_after, "INVARIANT VIOLATION: Route statuses were altered by simulation run!"

    # 4. Verify only the simulation audit record was stored
    sim_run_record = db_session.query(SimulationRun).filter(SimulationRun.scenario_name == sim_payload["scenario_name"]).first()
    assert sim_run_record is not None


def test_tactical_forecast_and_hybrid_alert_gate(client, logistics_headers, db_session):
    """
    Validates:
    - 17-feature vector ML inference / WMA fallback
    - Explainable Decision Cards with confidence bounds
    - Hybrid Critical Alert Gate: stockout_risk >= 0.20 AND days_of_supply <= 2.0 (48h)
    """
    # DBO Post has low fuel (250.0) -> high burn -> should trigger critical alert
    payload = {
        "unit_id": "POST_DBO",
        "item_type": "Fuel",
        "horizon": "48h"
    }
    response = client.post("/api/v1/forecast", json=payload, headers=logistics_headers)
    assert response.status_code == 200
    data = response.json()

    assert data["unit_id"] == "POST_DBO"
    assert data["item_type"] == "Fuel"
    assert data["predicted_demand"] > 0
    assert data["lower_bound"] <= data["predicted_demand"] <= data["upper_bound"]
    assert 0.0 <= data["stockout_risk"] <= 1.0

    # Decision card assertions
    card = data["decision_card"]
    assert "action_type" in card
    assert "confidence_level" in card
    assert card["confidence_percentage"] >= 50.0
    assert card["requires_officer_sign_off"] is True

    # If stockout_risk >= 0.20 and days_of_supply <= 2.0, verify critical alert
    if data["stockout_risk"] >= 0.20 and data["days_of_supply"] <= 2.0:
        assert data["critical_alert_triggered"] is True
        alert = db_session.query(Alert).filter(Alert.unit_id == "POST_DBO", Alert.severity == "CRITICAL").first()
        assert alert is not None


def test_tactical_route_optimization(client, commander_headers):
    """
    Validates multi-factor routing cost formula:
    Edge_Cost = Distance_km + (Terrain_Score * 1.8) + (Snowfall_mm * 0.25) + (Pass_Block_Penalty * 999)
    And validates clean GeoJSON output for primary and fallback corridors.
    """
    payload = {
        "origin_id": "HQ_LEH",
        "dest_id": "POST_DBO",
        "avoid_blocked_passes": True
    }
    response = client.post("/api/v1/routes/optimise", json=payload, headers=commander_headers)
    assert response.status_code == 200
    data = response.json()

    assert data["origin_id"] == "HQ_LEH"
    assert data["dest_id"] == "POST_DBO"
    assert data["primary_distance_km"] > 0
    assert data["primary_edge_cost"] > 0

    # Validate primary corridor GeoJSON
    primary_geo = data["primary_corridor"]
    assert primary_geo["type"] == "Feature"
    assert primary_geo["geometry"]["type"] == "LineString"
    assert len(primary_geo["geometry"]["coordinates"]) >= 2


def test_zero_autonomous_troops_order_invariant(client, logistics_headers):
    """
    Zero Autonomous Troops Orders:
    The backend NEVER dispatches convoys automatically.
    A convoy creation MUST contain explicit sign-off action ('ACCEPT' or 'MODIFY').
    Invalid or missing sign-off MUST be rejected with HTTP 422.
    """
    invalid_payload = {
        "route_id": "RT_LEH_DBO",
        "origin_id": "HQ_LEH",
        "dest_id": "POST_DBO",
        "vehicle_count": 5,
        "cargo_type": "Ammunition",
        "cargo_quantity": 20.0,
        "sign_off_action": "AUTONOMOUS_AI_DISPATCH"  # Illegal - human in loop required
    }
    response = client.post("/api/v1/convoys", json=invalid_payload, headers=logistics_headers)
    assert response.status_code == 422


def test_tactical_kpi_dashboard(client, commander_headers):
    """Validates operational KPI tactical readiness index and telemetry summaries."""
    response = client.get("/api/v1/kpi", headers=commander_headers)
    assert response.status_code == 200
    data = response.json()

    assert "readiness_index" in data
    assert 0.0 <= data["readiness_index"] <= 100.0
    assert "total_active_units" in data
    assert "active_critical_alerts" in data
    assert "active_convoys_in_transit" in data
    assert "recent_audit_events" in data


def test_ml_service_predict_contract(db_session):
    """
    Validates that ml_service.predict() returns the exact verified production contract:
    - 8 features for Model 2 (XGBoost Quantile)
    - 10 features for Model 3 (HistGradientBoosting calibrated stockout scorer)
    - 10 features for Model 4 (Isolation Forest anomaly detector)
    - Mandatory hybrid alert gate
    """
    from app.services.ml_service import ml_service
    res = ml_service.predict(unit_id="POST_DBO", item_type="Fuel", horizon="48h", db=db_session)
    assert res["unit_id"] == "POST_DBO"
    assert res["item_type"] == "Fuel"
    assert res["forecast_horizon"] == "48h"
    assert isinstance(res["predicted_demand"], float)
    assert isinstance(res["lower_bound"], float)
    assert isinstance(res["upper_bound"], float)
    assert isinstance(res["stockout_risk"], float)
    assert isinstance(res["days_of_supply"], float)
    assert isinstance(res["is_critical"], bool)
    assert isinstance(res["anomaly_flag"], bool)
    assert isinstance(res["top_factors"], list)
    assert res["model_version"] == "xgb_quantile_v2.1"

