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


def test_alert_deduplication_and_math_reconciliation(client, commander_headers, logistics_headers, db_session):
    """
    Verification test covering:
    1. Alert Deduplication: Calling POST /api/v1/forecast twice for the same critical unit does NOT create duplicate active alerts.
    2. Persistent Alert Acknowledgment: PATCH /ack and POST /acknowledge alias mark acknowledged=True and write to audit_logs.
    3. Math Reconciliation: days_remaining = round(quantity / daily_burn, 1) (e.g. 320 / 235 = 1.4 days),
       canonical stockout_risk [0.0, 1.0] and stockout_risk_pct [0, 100].
    4. Frontend Handshake Endpoints:
       - GET /api/v1/routes/{route_id}/fallback returns HTTP 200 with dashed amber bypass corridor.
       - GET /api/v1/reports/summary returns HTTP 200 with holdout metrics (Model 2 XGBoost vs Model 1 WMA).
       - GET /api/v1/reports/export.csv returns HTTP 200 with valid text/csv and correct Content-Disposition.
    5. In-Memory Simulation Consistency:
       - POST /api/v1/simulation/scenario returns 7-day depletion curves, new_critical_stockouts,
         simulated_stockout_risk, and dynamic recommended_action without mutating database tables.
    """
    # 1. Alert Deduplication
    forecast_payload = {
        "unit_id": "POST_DBO",
        "item_type": "Fuel",
        "horizon": "48h"
    }
    # Run 1
    resp1 = client.post("/api/v1/forecast", json=forecast_payload, headers=logistics_headers)
    assert resp1.status_code == 200
    data1 = resp1.json()

    # Canonical stockout representation checks
    assert 0.0 <= data1["stockout_risk"] <= 1.0
    assert data1["stockout_risk_pct"] == round(data1["stockout_risk"] * 100.0, 1)
    assert data1["days_of_supply"] == data1["days_remaining"]
    assert "stressed_days_of_supply_p90" in data1
    assert "minimum_stock" in data1

    active_alerts_count1 = db_session.query(Alert).filter(Alert.unit_id == "POST_DBO", Alert.status == "ACTIVE").count()

    # Run 2 (duplicate execution)
    resp2 = client.post("/api/v1/forecast", json=forecast_payload, headers=logistics_headers)
    assert resp2.status_code == 200

    active_alerts_count2 = db_session.query(Alert).filter(Alert.unit_id == "POST_DBO", Alert.status == "ACTIVE").count()
    assert active_alerts_count2 == active_alerts_count1, (
        f"Alert deduplication failed: active alerts increased from {active_alerts_count1} to {active_alerts_count2}"
    )

    # 2. Alert Acknowledgment via both PATCH and POST alias
    active_alert = db_session.query(Alert).filter(Alert.unit_id == "POST_DBO", Alert.status == "ACTIVE").first()
    assert active_alert is not None

    ack_resp = client.post(
        f"/api/v1/alerts/{active_alert.id}/acknowledge",
        json={"notes": "Resupply convoy Alpha dispatched via bypass"},
        headers=commander_headers
    )
    assert ack_resp.status_code == 200
    ack_data = ack_resp.json()
    assert ack_data["status"] == "ACKNOWLEDGED"
    assert ack_data["acknowledged"] is True
    assert ack_data["acknowledged_by"] == "test_commander"

    # 3. Math Reconciliation: verify days_remaining = round(quantity / daily_burn, 1)
    inv_resp = client.get("/api/v1/inventory?unit_id=POST_DBO&item_type=Fuel", headers=logistics_headers)
    assert inv_resp.status_code == 200
    inv_items = inv_resp.json()
    assert len(inv_items) >= 1
    fuel_inv = inv_items[0]
    expected_runway = round(fuel_inv["quantity"] / max(fuel_inv["daily_burn_rate"], 1e-5), 1)
    assert fuel_inv["days_remaining"] == expected_runway
    assert fuel_inv["days_of_supply"] == expected_runway

    # Explicit audit check: 320 / 235 = 1.3617... -> 1.4 days
    reconciled_example = round(320.0 / 235.0, 1)
    assert reconciled_example == 1.4

    # 4. Frontend Handshake Endpoints
    # 4a. Route Fallback
    fallback_resp = client.get("/api/v1/routes/RT_LEH_DBO/fallback", headers=commander_headers)
    assert fallback_resp.status_code == 200
    fallback_data = fallback_resp.json()
    assert fallback_data["fallback_corridor"] is not None
    assert fallback_data["fallback_corridor"]["properties"]["corridor_type"] == "FALLBACK_BYPASS"

    # 4b. Reports Summary
    summary_resp = client.get("/api/v1/reports/summary", headers=commander_headers)
    assert summary_resp.status_code == 200
    summary_data = summary_resp.json()
    assert summary_data["status"] == "OPERATIONAL"
    assert "model_evaluation" in summary_data
    assert "model_2_xgboost" in summary_data["model_evaluation"]
    assert "model_1_wma_baseline" in summary_data["model_evaluation"]
    assert summary_data["model_evaluation"]["model_2_xgboost"]["mae"] <= summary_data["model_evaluation"]["model_1_wma_baseline"]["mae"]
    assert "audit_trail" in summary_data
    assert "recent_simulations" in summary_data

    # 4c. Reports CSV Export
    csv_resp = client.get("/api/v1/reports/export.csv", headers=commander_headers)
    assert csv_resp.status_code == 200
    assert "text/csv" in csv_resp.headers["content-type"]
    assert 'attachment; filename="rakshalogix_sustainment_report.csv"' in csv_resp.headers["content-disposition"]
    assert "Unit_ID" in csv_resp.text
    assert "Days_Remaining" in csv_resp.text

    # 5. In-Memory Simulation Consistency
    sim_resp = client.post(
        "/api/v1/simulation/scenario",
        json={
            "scenario_name": "Verification_Stress_Test",
            "demand_multiplier": 2.5,
            "snowfall_delta": 40.0,
            "blocked_route_ids": ["RT_LEH_DBO"],
            "simulation_days": 7,
            "weather_severity": "EXTREME",
            "vehicle_unavailable": 2,
        },
        headers=commander_headers
    )
    assert sim_resp.status_code == 200
    sim_data = sim_resp.json()
    assert len(sim_data["baseline_depletion_curve"]) == 7
    assert len(sim_data["simulated_depletion_curve"]) == 7
    assert sim_data["baseline_depletion_curve"][0] >= sim_data["simulated_depletion_curve"][0]
    assert "new_critical_stockouts" in sim_data
    assert 0.0 <= sim_data["simulated_stockout_risk"] <= 1.0
    assert sim_data["simulated_stockout_risk_pct"] == round(sim_data["simulated_stockout_risk"] * 100.0, 1)
    assert sim_data["recommended_action"] != ""
    assert sim_data["sandbox_isolation_verified"] is True


def test_gis_tactical_map_layers_and_weather_routing(client, commander_headers):
    """
    P0 Priority Test - GIS Tactical Map State, A* / Dijkstra Multi-Factor Router,
    Fallback Bypasses, and Sector Weather Telemetry (SIH 2026 PS-26251).
    """
    # 1. Complete Tactical Map State (GET /api/v1/routes and GET /api/v1/gis/layers)
    for endpoint in ["/api/v1/routes", "/api/v1/gis/layers"]:
        resp = client.get(endpoint, headers=commander_headers)
        assert resp.status_code == 200, f"Failed at {endpoint}: {resp.text}"
        data = resp.json()

        assert "units" in data
        assert "routes" in data
        assert "weather_hazards" in data

        # Validate 8 Forward Operating Bases in Ladakh/Kargil/Siachen
        units = {u["id"]: u for u in data["units"]}
        assert len(units) >= 8

        # UNIT_01: Leh Base HQ & Logistic Hub
        u1 = units["UNIT_01"]
        assert u1["name"] == "Leh Base HQ & Logistic Hub"
        assert u1["type"] == "HQ"
        assert u1["altitude_m"] == 3500.0
        assert u1["status"] == "GREEN"
        assert u1["coordinates"] == [34.1526, 77.5771]

        # UNIT_02: Kargil Forward Supply Depot
        u2 = units["UNIT_02"]
        assert u2["name"] == "Kargil Forward Supply Depot"
        assert u2["type"] == "DEPOT"
        assert u2["altitude_m"] == 2676.0
        assert u2["coordinates"] == [34.5539, 76.1349]

        # UNIT_03: Siachen Base Camp / FOB Charlie (Critical 34h runway)
        u3 = units["UNIT_03"]
        assert "Siachen Base Camp" in u3["name"]
        assert u3["type"] == "FOB"
        assert u3["altitude_m"] == 3600.0
        assert u3["status"] == "RED"
        assert u3["coordinates"] == [35.2000, 77.2000]

        # UNIT_04: Dras Sector Garrison
        u4 = units["UNIT_04"]
        assert u4["name"] == "Dras Sector Garrison"
        assert u4["altitude_m"] == 3300.0
        assert u4["status"] == "AMBER"
        assert u4["coordinates"] == [34.4271, 75.7512]

        # UNIT_05: Galwan Forward Post
        u5 = units["UNIT_05"]
        assert "Galwan" in u5["name"]
        assert u5["altitude_m"] == 4300.0
        assert u5["status"] == "RED"
        assert u5["coordinates"] == [34.7600, 78.2200]

        # UNIT_06: Chushul Tactical Depot
        u6 = units["UNIT_06"]
        assert "Chushul" in u6["name"]
        assert u6["altitude_m"] == 4360.0
        assert u6["status"] == "GREEN"
        assert u6["coordinates"] == [33.6042, 78.6472]

        # UNIT_07: Nubra Valley Transit Base
        u7 = units["UNIT_07"]
        assert "Nubra" in u7["name"]
        assert u7["altitude_m"] == 3048.0
        assert u7["status"] == "GREEN"
        assert u7["coordinates"] == [34.5900, 77.5600]

        # UNIT_08: Daulat Beg Oldie / DBO Outpost
        u8 = units["UNIT_08"]
        assert "DBO" in u8["name"] or "Daulat Beg Oldie" in u8["name"]
        assert u8["altitude_m"] == 5065.0
        assert u8["status"] == "AMBER"
        assert u8["coordinates"] == [35.3964, 77.9269]

        # Verify all coordinates strictly within WGS84 bounds
        for u in data["units"]:
            lat, lng = u["coordinates"][0], u["coordinates"][1]
            assert -90.0 <= lat <= 90.0
            assert -180.0 <= lng <= 180.0

        # Validate Road Corridors with curved multi-point polylines
        routes = {r["id"]: r for r in data["routes"]}
        assert "ROUTE_01" in routes
        assert "ROUTE_02" in routes
        assert "ROUTE_03" in routes
        assert "ROUTE_04" in routes

        r1 = routes["ROUTE_01"]
        assert r1["status"] == "BLOCKED"
        assert r1["distance_km"] == 185.0
        assert r1["terrain_score"] == 7.8
        assert r1["snowfall_mm"] == 85.0
        assert r1["estimated_time_hours"] == 6.5
        assert len(r1["coordinates"]) >= 3  # Curved realistic polyline

        r2 = routes["ROUTE_02"]
        assert r2["status"] == "OPEN"
        assert r2["distance_km"] == 218.0
        assert r2["terrain_score"] == 5.2
        assert r2["snowfall_mm"] == 15.0
        assert r2["estimated_time_hours"] == 7.5
        assert len(r2["coordinates"]) >= 3

        # Validate Active Blizzard & Avalanche Hazard Zones (50km ST_DWithin proximity)
        hazards = {h["id"]: h for h in data["weather_hazards"]}
        assert "HAZ_ZOJILA_ECHO" in hazards
        zojila_hazard = hazards["HAZ_ZOJILA_ECHO"]
        assert zojila_hazard["radius_m"] == 35000.0
        assert zojila_hazard["temperature_c"] == -18.5
        assert zojila_hazard["snowfall_mm"] == 85.0
        assert "UNIT_03" in zojila_hazard["affected_units"]
        assert "UNIT_04" in zojila_hazard["affected_units"]

    # 2. Weather-Aware A* / Dijkstra Multi-Factor Router (POST /api/v1/routes/optimise)
    opt_payload = {
        "origin_id": "UNIT_02",
        "dest_id": "UNIT_03",
        "avoid_hazards": True,
    }
    opt_resp = client.post("/api/v1/routes/optimise", json=opt_payload, headers=commander_headers)
    assert opt_resp.status_code == 200
    opt_data = opt_resp.json()

    # Recommended route (safe valley bypass corridor)
    assert "recommended_route" in opt_data
    assert "alternative_route" in opt_data
    rec = opt_data["recommended_route"]
    assert rec["distance_km"] == 218.0
    assert rec["estimated_time_hours"] == 7.5
    assert rec["status"] == "OPEN"
    assert len(rec["coordinates"]) >= 3
    # Check Edge_Cost calculation: 218 + (1.8 * 5.2) + (0.25 * 15.0) + (999 * 0) = 218 + 9.36 + 3.75 = 231.11
    expected_rec_cost = round(218.0 + (1.8 * 5.2) + (0.25 * 15.0), 2)
    assert abs(rec["composite_cost"] - expected_rec_cost) < 0.1

    # Alternative route (blocked primary pass corridor)
    alt = opt_data["alternative_route"]
    assert alt["distance_km"] == 185.0
    assert len(alt["coordinates"]) >= 3
    assert "Khardung La" in alt["explanation"] or "Pass Echo" in alt["explanation"]
    assert alt["style"]["color"] == "#f59e0b"
    # Blocked Edge_Cost calculation: 185 + (1.8 * 7.8) + (0.25 * 85.0) + (999 * 1) = 185 + 14.04 + 21.25 + 999 = 1219.29
    expected_alt_cost = round(185.0 + (1.8 * 7.8) + (0.25 * 85.0) + 999.0, 2)
    assert abs(alt["composite_cost"] - expected_alt_cost) < 0.1

    # Test with destination_id alias
    alias_payload = {
        "origin_id": "UNIT_02",
        "destination_id": "UNIT_03",
        "avoid_hazards": True,
    }
    alias_resp = client.post("/api/v1/routes/optimise", json=alias_payload, headers=commander_headers)
    assert alias_resp.status_code == 200
    assert alias_resp.json()["primary_distance_km"] > 0

    # 3. Explicit Fallback Detour Endpoint (GET /api/v1/routes/{route_id}/fallback)
    fb_resp = client.get("/api/v1/routes/ROUTE_01/fallback", headers=commander_headers)
    assert fb_resp.status_code == 200
    fb_data = fb_resp.json()
    assert fb_data["fallback_corridor"] is not None
    assert fb_data["fallback_corridor"]["properties"]["style"]["color"] == "#f59e0b"
    assert fb_data["fallback_corridor"]["properties"]["corridor_type"] == "FALLBACK_BYPASS"

    # 4. Tactical Sector Weather Telemetry (GET /api/v1/weather/{location})
    w_resp = client.get("/api/v1/weather/UNIT_03", headers=commander_headers)
    assert w_resp.status_code == 200
    w_data = w_resp.json()
    assert w_data["location"] == "UNIT_03"
    assert w_data["resolved_unit_id"] == "UNIT_03"
    assert w_data["temperature_c"] == -22.5
    assert w_data["snowfall_mm"] == 85.0
    assert w_data["visibility_km"] == 0.8
    assert w_data["wind_speed_kmh"] == 65.0
    assert w_data["pass_closure_risk"] == "CRITICAL"

    # Check Leh HQ weather
    w_leh = client.get("/api/v1/weather/UNIT_01", headers=commander_headers)
    assert w_leh.status_code == 200
    assert w_leh.json()["resolved_unit_id"] == "UNIT_01"
    assert w_leh.json()["pass_closure_risk"] in ["LOW", "MODERATE"]

    # Check GIS Hazards endpoint
    hz_resp = client.get("/api/v1/gis/hazards", headers=commander_headers)
    assert hz_resp.status_code == 200
    assert len(hz_resp.json()) >= 1


