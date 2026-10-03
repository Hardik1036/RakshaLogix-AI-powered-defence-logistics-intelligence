# RakshaLogix — AI-Powered Forward Defence Logistics & Sustainment Intelligence
**Problem Statement ID:** 26251 | **Ministry of Defence**  
**Role:** Central FastAPI Orchestration & Defense-Grade Security Backbone  
**Cost Model:** $0.00 Budget (Strictly MIT/Apache-2.0 Open-Source Infrastructure)

---

## 1. Architectural Invariants & Defense Controls

The RakshaLogix backend enforces five mission-critical defense architectural invariants:

### 1. Zero Autonomous Troops Orders (Strict Human-in-the-Loop)
- The backend **NEVER** autonomously dispatches convoys, relocates units, or alters ammunition/fuel rosters.
- All AI endpoints serve **Explainable Decision Cards** with P10/P50/P90 confidence bounds, feature attribution, and command risk narratives.
- Resupply convoy dispatches (`POST /api/v1/convoys`) strictly require an authorized officer's cryptographic sign-off (`[Accept]` or `[Modify]`). Any attempt to dispatch without human sign-off fails with `HTTP 422`.

### 2. Hard In-Memory Simulation Sandbox
- `/api/v1/simulation/scenario` clones tactical state strictly in-memory using deep copy semantics (`copy.deepcopy`).
- **Absolute Invariant:** Simulation runs **NEVER** execute SQL `UPDATE`, `INSERT`, or `DELETE` on base production tables (`inventory`, `convoys`, `routes`).
- Verified via automated tests: database records prior to and post-simulation are strictly identical down to row values. Simulation audit logs are committed to `simulation_runs` without modifying production state.

### 3. Defense-Grade Access & Cryptographic Security
- **Password Hashing:** Argon2id (RFC 9106, 64MB memory, 2 passes) mitigating GPU/ASIC brute-force attacks.
- **Token Verification:** Asymmetric RS256 JWT (with dual-mode HS256 fallback) carrying compartmentalized role claims:
  - `CORPS_COMMANDER`: Tactical oversight, convoy dispatch sign-off, alert acknowledgment, officer delegation.
  - `LOGISTICS_OFFICER`: Stock reconciliation, route recalculation, convoy preparation, alert acknowledgment.
  - `EDGE_READ_ONLY`: Forward tactical edge view; strictly blocked (HTTP 403) from state-changing operations.
- **Immutable Audit Ledger:** All state modifications, route calculations, simulation runs, and officer overrides are recorded in the append-only `audit_logs` table containing `user_id`, `action`, `resource_target`, `metadata_json`, `ip_address`, and deterministic `request_hash` (SHA-256).
- **Anti-DDoS Token Bucket:** In-memory token bucket rate limiter to protect forward edge devices from bandwidth starvation.
- **Anti-Tampering Geometric Bounds:** Coordinates validated strictly to WGS84 physical boundaries (Longitude: `[-180.0, 180.0]`, Latitude: `[-90.0, 90.0]`).

### 4. ML Fallback Decoupling
- Model artifacts (`demand_model.joblib`, `stockout_clf.joblib`, `preprocessor.joblib`) are loaded from `app/artifacts/`.
- During offline degraded mode or when model files are absent, the engine falls back seamlessly to deterministic **7-Day Weighted Moving Average (WMA)** heuristic rules without system crashes or downtime.

### 5. Hybrid Critical Alert Filter
- Evaluates `/api/v1/forecast` output:
  $$\text{Stockout Risk} \ge 0.20 \quad \text{AND} \quad \frac{\text{Current Stock}}{\text{Predicted Demand (P90)}} \le 2.0\text{ days (48h)}$$
- Prevents command alarm fatigue by suppressing non-actionable alarms while guaranteeing critical alerts for imminent forward post isolation.

---

## 2. Multi-Factor Routing Cost Heuristic

Route service calculates optimal corridors through high-altitude passes (e.g., Khardung La, Chang La, Shyok) using NetworkX Dijkstra / A*:

$$\text{Edge\_Cost} = \text{Distance\_km} + (\text{Terrain\_Score} \times 1.8) + (\text{Snowfall\_mm} \times 0.25) + (\text{Pass\_Block\_Penalty} \times 999)$$

- Generates:
  1. `primary_corridor`: Fastest safe route formatted as GeoJSON LineString.
  2. `fallback_corridor`: Secondary valley bypass avoiding blocked passes / hazards.

---

## 3. 17-Feature Tactical ML Vector

The feature extractor assembles the 17 lag and environmental indicators from operational ledgers:
1. `consumption_lag_1d`
2. `consumption_lag_3d`
3. `consumption_lag_7d`
4. `consumption_lag_14d`
5. `rolling_mean_3d`
6. `rolling_mean_7d`
7. `rolling_std_7d`
8. `opening_stock`
9. `estimated_days_remaining`
10. `temperature`
11. `rainfall_snowfall`
12. `visibility`
13. `terrain_score`
14. `route_status_encoded` (1=OPEN, 2=RESTRICTED, 3=BLOCKED)
15. `operational_demand_level` (tempo 1–5)
16. `vehicle_availability`
17. `day_of_week` & `month`

---

## 4. Repository Structure

```
02_backend/
├── app/
│   ├── __init__.py
│   ├── main.py                     # App factory, security headers, CORS, exception handlers
│   ├── config.py                   # Pydantic v2 BaseSettings, defense constants
│   ├── database.py                 # SQLAlchemy engine & SessionLocal dependency
│   ├── security/                   # Defence Security Subsystem
│   │   ├── __init__.py
│   │   ├── auth.py                 # Argon2id, RS256/HS256 JWT utilities
│   │   ├── dependencies.py         # Current user, get_current_commander, RBAC guards
│   │   └── audit.py                # Interceptor logging all actions to audit_logs
│   ├── models/                     # PostGIS & Relational ORM models
│   │   ├── __init__.py
│   │   ├── base.py                 # SpatialPoint & SpatialLineString abstractions
│   │   ├── auth.py                 # users, audit_logs
│   │   ├── logistics.py            # units, inventory, routes, convoys, consumption, vehicles
│   │   └── intelligence.py         # forecasts, alerts, weather, simulation_runs
│   ├── schemas/                    # Pydantic Schemas with strict field validation
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── inventory.py
│   │   ├── forecast.py
│   │   ├── routes.py               # WGS84 Coordinate guards
│   │   ├── convoys.py              # Human-in-the-loop sign-off schema
│   │   ├── simulation.py
│   │   └── alerts.py
│   ├── services/                   # Core algorithmic logic
│   │   ├── __init__.py
│   │   ├── ml_service.py           # 17-feature vector builder & ML artifact wrapper
│   │   ├── route_service.py        # Multi-factor Dijkstra routing heuristic
│   │   └── sim_service.py          # Isolated in-memory sandbox war-gaming engine
│   ├── api/v1/                     # Clean REST routers matching team contracts
│   │   ├── __init__.py
│   │   ├── auth.py                 # /login, /me, /refresh, /register
│   │   ├── inventory.py            # /inventory, /inventory/{unit_id}
│   │   ├── forecast.py             # /forecast (ML trigger + auto-alert)
│   │   ├── routes.py               # /routes/optimise, /routes/{id}/fallback
│   │   ├── convoys.py              # /convoys (GET, POST sign-off, PATCH status)
│   │   ├── alerts.py               # /alerts (GET active, PATCH ack)
│   │   ├── simulation.py           # /simulation/scenario (in-memory sandbox)
│   │   └── kpi.py                  # /kpi (tactical dashboard summary metrics)
│   └── artifacts/                  # Serialized Joblib ML models
├── tests/
│   ├── conftest.py                 # In-memory SQLite harness, role fixtures
│   ├── test_security.py            # Tests for RBAC, unauthenticated blocks, tamper attempts
│   └── test_api_pipeline.py        # Tests verifying simulation isolation & forecasts
├── docker-compose.yml              # PostgreSQL 16 + PostGIS + FastAPI zero-cost stack
├── Dockerfile                      # Production multi-stage slim container (USER appuser)
├── requirements.txt
├── .env.example
└── README.md
```

---

## 5. Free Production Stack ($0 Cost)

```
[ FRONTEND CLIENT ] (React 18 / Leaflet)
         │
         ▼  (HTTPS / TLS 1.3)
┌────────────────────────────────────────────────────────┐
│  FASTAPI DOCKER CONTAINER (Non-Root User: appuser)     │
│  ├── Security Middleware (Anti-DDoS, Security Headers) │
│  ├── RS256 / HS256 JWT Authentication & RBAC Filter    │
│  ├── Pydantic Input Validation (SQLi/XSS Guard)        │
│  ├── Orchestration Routers (/forecast, /routes, /kpi)  │
│  ├── In-Memory War-Gaming Sandbox (Safe Isolation)     │
│  └── Feature Extractor & ML Fallback Controller        │
└──────────┬───────────────────────────────┬─────────────┘
           │ (Internal Encrypted Network)  │ (Joblib Loader)
           ▼                               ▼
┌──────────────────────────────┐  ┌──────────────────────┐
│ POSTGRESQL 16 + POSTGIS      │  │ SERIALIZED ML ARTIFACTS│
│ • Spatial GIST Indices       │  │ • Quantile XGBoost   │
│ • Non-Negative CHECK Gates   │  │ • HistGradientBoost  │
│ • Immutable Audit Logs Table │  │ • Isolation Forest   │
└──────────────────────────────┘  └──────────────────────┘
```

---

## 6. Setup & Execution

### Option A: Zero-Cost Docker Deployment (Recommended)
```bash
cd 02_backend
docker compose up --build -d
```
The stack spins up PostgreSQL 16 + PostGIS and the hardened FastAPI backend on port 8000.

### Option B: Local Development Run
```bash
cd 02_backend
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Pre-Seeded Personnel Credentials
| Callsign | Password | Operational Role |
| :--- | :--- | :--- |
| `commander_alpha` | `Commander@DefSec2026!` | `CORPS_COMMANDER` |
| `logistics_bravo` | `Logistics@DefSec2026!` | `LOGISTICS_OFFICER` |
| `edge_charlie` | `EdgeReadOnly@DefSec2026!` | `EDGE_READ_ONLY` |

---

## 7. Verification & Automated Testing

Run the full pytest suite (13 passing tests):
```bash
python -m pytest 02_backend/tests -v
```

### Test Coverage Summary:
- `test_security_headers_present`: Validates `nosniff`, `DENY`, `HSTS`, `CSP: default-src 'none'`.
- `test_unauthenticated_request_blocked`: Verifies 401 Unauthorized for uncredentialed requests.
- `test_invalid_token_rejected`: Verifies rejection of tampered tokens.
- `test_edge_read_only_blocked_from_convoy_dispatch`: Enforces 403 Forbidden for edge read-only roles attempting dispatch.
- `test_edge_read_only_blocked_from_alert_acknowledgement`: Enforces 403 Forbidden on alert ack.
- `test_logistics_officer_allowed_convoy_dispatch`: Verifies officer authorization with audit trail.
- `test_commander_allowed_alert_acknowledgement`: Verifies commander sign-off on defense alerts.
- `test_wgs84_coordinate_boundary_tampering_prevented`: Verifies 422 Unprocessable Entity for invalid latitude/longitude.
- `test_simulation_sandbox_hard_isolation`: Asserts 0 SQL mutations on base tables during war-game runs.
- `test_tactical_forecast_and_hybrid_alert_gate`: Verifies 17-feature vector, confidence bounds, and hybrid alert filtering.
- `test_tactical_route_optimization`: Verifies primary and secondary bypass GeoJSON line strings.
- `test_zero_autonomous_troops_order_invariant`: Rejects autonomous dispatches without human sign-off (`ACCEPT`/`MODIFY`).
- `test_tactical_kpi_dashboard`: Validates operational readiness index calculation.
