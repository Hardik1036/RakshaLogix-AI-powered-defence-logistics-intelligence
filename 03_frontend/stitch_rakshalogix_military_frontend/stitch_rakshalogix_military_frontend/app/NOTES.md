# RakshaLogix // Architecture, Live Backend Integration & API Verification Notes

## Phase 1 Summary: Foundation, Theming & Routing

### 1. Project Setup & Architecture
- **Framework**: Vite + React 18 + TypeScript + Tailwind CSS (`darkMode: 'class'`).
- **Design Tokens**: Direct implementation of `tactical_vanguard/DESIGN.md`, configuring the tactical color palette (`#020617` / `#0f131c` slate foundation, cyan `#4cd7f6` / `#06b6d4` primary, emerald `#10b981` / `#4edea3` nominal, amber `#f59e0b` / `#ffb95f` warning, and red `#ef4444` / `#ffb4ab` interdiction/critical), strict 0px border radius for ruggedized instruments, and dual typography (`Inter` for commands and navigation, `JetBrains Mono` for coordinates, MGRS, and telemetry data).
- **Core Dependencies**: Installed `react-router-dom`, `recharts`, `leaflet`, `react-leaflet`, and `lucide-react` for crisp local tactical SVG iconography (zero dependencies on remote `lh3.googleusercontent` image URLs).

### 2. State & Context Architecture
- **ThemeContext**: Implemented persistent Dark / Light mode switching stored in `localStorage` under `rakshalogix_theme`. Toggles `dark` class on `document.documentElement`.
- **AuthContext**: Manages active military session token and assigned role (`CORPS_COMMANDER`, `LOGISTICS_OFFICER`, `EDGE_READ_ONLY`) using `sessionStorage`. Supports both full backend JWT flow and dev fallback.
- **ToastContext**: Tactical HUD-style notifications for command authorization errors, clearance warnings, and operation confirmations.
- **Route Guard**: `ProtectedRoute` enforcing authenticated access while directing unauthenticated requests to `/login`.

### 3. Layout & Navigation Matrix
- **Navbar**: Real-time Zulu (UTC) and Indian Standard Time (IST) telemetry clocks, classified military header indicator (`DEFCON-2 RESTRICTED // SECRET MIL-INTEL`), interactive Light/Dark toggle, dynamic role indicator badge (`🟢 COMMANDER`, `🟡 LOGISTICS`, `🔵 READ-ONLY`), officer identity profile, and one-click session logout.
- **Sidebar**: High-density operational navigation matrix with active indicator states, keyboard shortcut keys (`F1`-`F8`), live alert badge counter (`7`), and lower Ku-band encrypted SAT-LINK telemetry health monitor.
- **Routing**: Full route map for `/login` plus 8 tactical theater screens:
  - `/dashboard` (F1)
  - `/inventory` (F2)
  - `/forecast` (F3)
  - `/map` (F4)
  - `/convoys` (F5)
  - `/alerts` (F6)
  - `/simulation` (F7)
  - `/reports` (F8)

---

## Phase 2 & 5: Live Backend Integration (`https://rakshalogix-backend.onrender.com`)

### 1. Environment Configuration
- Switched to the live Render FastAPI backend in `/app/.env`:
  ```ini
  VITE_API_URL=https://rakshalogix-backend.onrender.com
  VITE_USE_MOCK=false
  VITE_DEV_DISABLE_AUTH=false
  ```
- Added global cold-start loading indicators across all pages:
  > `"Connecting to server... (may take up to 60s on first request)"`
  Render free tier spins down idle containers, so cold-start requests take ~30–60 seconds before initial response.

### 2. Curl Test Matrix & Live Endpoint Statuses

| Endpoint | Method | Status | Verified Behavior & Sample Response |
|---|---|---|---|
| `/api/v1/auth/login` | `POST` | `200 OK` | Logs in demo users; returns `{ access_token, token_type: "bearer", user: { id, username, role, unit_id } }` |
| `/api/v1/auth/me` | `GET` | `200 OK` | Returns `{ id, username, role, unit_id, is_active: true }` |
| `/api/v1/kpi` | `GET` | `200 OK` | Returns tactical readiness metrics and `recent_audit_events` |
| `/api/v1/inventory` | `GET` | `200 OK` | Returns list of `InventoryRead` objects for forward posts (`POST_DBO`, `DEPOT_KARU`, etc.) |
| `/api/v1/inventory/{unit_id}` | `GET` | `200 OK` | Returns `TacticalStockSummary` with `altitude_m: 5065.0` and unit's inventory entries |
| `/api/v1/forecast` | `POST` | `200 OK` | Returns stochastic inference with `predicted_demand`, `lower_bound`, `upper_bound`, `stockout_risk: 0.51`, and `decision_card` |
| `/api/v1/routes` | `GET` | `200 OK` | Returns list of corridors (`RT_LEH_DISKIT`, `RT_DISKIT_DBO`, `RT_LEH_KARU`) |
| `/api/v1/routes/optimise` | `POST` | `200 OK` | Returns optimal GeoJSON LineString corridor and distance/time metrics |
| `/api/v1/routes/{id}/fallback` | `GET` | `200 OK` | Returns alternative corridor route with terrain cost penalty |
| `/api/v1/convoys` | `GET` | `200 OK` | Returns active theater convoy manifests (`ConvoyRead[]`) |
| `/api/v1/convoys` | `POST` | `201 Created` | Dispatches convoy and returns `{ id: "CNV_...", status: "SCHEDULED" }` |
| `/api/v1/alerts` | `GET` | `200 OK` | Returns active tactical alerts (`AlertRead[]`) |
| `/api/v1/alerts/{id}/ack` | `PATCH` | `200 OK` | Acknowledges alert, sets `status: "ACKNOWLEDGED"` and `acknowledged_by` |
| `/api/v1/simulation/scenario` | `POST` | `200 OK` | Executes Monte Carlo stress scenario and returns `baseline_stockouts`, `simulated_stockouts`, `unit_projections` |
| `/api/v1/reports/export.csv` | `GET` | `404 Not Found` | Endpoint does not exist in FastAPI backend (handled via client-side fallback) |

---

## API Mismatches & Real Schema Alignment

### 1. Missing Endpoints on Backend
1. **`GET /api/v1/reports/export.csv`**:
   - **Backend Status**: Returns `404 Not Found`. Not declared in backend OpenAPI specification.
   - **Frontend Resolution**: Client-side tactical CSV generator was implemented. It queries `/api/v1/kpi` to fetch `recent_audit_events`, attaches cryptographic signature chains, and triggers client-side `.csv` download.
   - **Backend Action Required**: Backend team should implement `GET /api/v1/reports/export.csv` to support server-side CSV streaming.
2. **`GET /api/v1/reports/audit`**:
   - **Backend Status**: Returns `404 Not Found`.
   - **Frontend Resolution**: `api.getAuditLogs()` pulls real live audit events from `GET /api/v1/kpi` (`recent_audit_events`) and maps them into `AuditLogEntry[]`.
3. **`GET /api/v1/dashboard`**:
   - **Backend Status**: Does not exist; backend instead provides `GET /api/v1/kpi`.
   - **Frontend Resolution**: `api.getDashboard()` aggregates live theater statistics from `GET /api/v1/kpi`, `GET /api/v1/inventory`, and `GET /api/v1/forecast`, presenting a synthesized `DashboardResponse`.

### 2. Schema and Field Mismatches (Resolved on Frontend)
1. **Authentication (`LoginRequest` / `TokenResponse` / `UserAuthProfile`)**:
   - **Mismatch**: Backend returns `user: { id, username, role, unit_id }`. Previous frontend expected `user.name` and `user.rank`.
   - **Resolution**: Updated `src/types/api.ts` to mirror `UserAuthProfile` and `TokenResponse`. `Login.tsx` now derives officer rank and callsign dynamically from the validated military role and unit identifier.
2. **Inventory (`InventoryRead` vs `InventoryItem`)**:
   - **Mismatch**: Backend fields are `item_type`, `quantity`, `minimum_stock`, `maximum_stock`, `days_of_supply`, `stock_status`. Previous frontend used `commodity`, `on_hand`, `runway_days`, `status`.
   - **Resolution**: Implemented bidirectional mapper `mapInventoryReadToItem()` in `src/api.ts`.
3. **Inventory Detail (`TacticalStockSummary`)**:
   - **Mismatch**: `GET /api/v1/inventory/{unit_id}` returns `{ unit_id, unit_name, unit_type, altitude_m, inventories: InventoryRead[] }`, whereas frontend was expecting a flat object with `burn_ledger_14d`.
   - **Resolution**: Added `TacticalStockSummary` schema and adapted it into `InventoryDetail` with altitude-adjusted metric calculations.
4. **Forecast (`ForecastRequest` / `ForecastResponse`)**:
   - **Mismatch**: Backend `POST /api/v1/forecast` requires `unit_id` (e.g. `'POST_DBO'`) and optional `item_type`. Calling it with only `{ horizon }` returned `422 Unprocessable Entity`.
   - **Mismatch 2**: Backend response provides `current_stock`, `predicted_demand`, `lower_bound`, `upper_bound`, and `decision_card` (`ExplainableDecisionCard`), but does not return pre-computed chart points.
   - **Resolution**: Frontend passes `{ unit_id: 'POST_DBO', item_type: 'Fuel', horizon }` and dynamically builds the Recharts multi-step probability envelope from live bounds.
5. **Route Optimization (`RouteOptimiseRequest` / `RouteOptimiseResponse`)**:
   - **Mismatch**: Backend requires `{ origin_id: string, dest_id: string }`. Previous frontend sent `{ origin, destination }`.
   - **Mismatch 2**: Backend returns `primary_corridor.geometry.coordinates` in GeoJSON format `[longitude, latitude]`. Leaflet `<Polyline />` requires `[latitude, longitude]`.
   - **Resolution**: Coordinates are inverted to `[coord[1], coord[0]]` and parameters use valid military node IDs (`HQ_LEH`, `FOB_DISKIT`).
6. **Convoys (`ConvoyCreate` / `ConvoyRead`)**:
   - **Mismatch**: Backend `POST /api/v1/convoys` requires `route_id`, `origin_id`, `dest_id`, and `sign_off_action` (`'ACCEPT'` or `'MODIFY'`).
   - **Resolution**: Added `ConvoyCreate` schema in `types/api.ts` and ensure required fields are always supplied in `api.createConvoy()`.
7. **Alerts (`AlertRead` / `AlertAcknowledgeRequest`)**:
   - **Mismatch**: Backend returns `status: "ACTIVE"` for unacknowledged alerts instead of `"UNACKNOWLEDGED"`.
   - **Mismatch 2**: `PATCH /api/v1/alerts/{id}/ack` expects `{ notes?: string }`.
   - **Resolution**: Frontend maps `ACTIVE` to unacknowledged state and sends `{ notes: "Officer tactical acknowledgment confirmed" }` on ack.
8. **Simulation (`SimulationScenarioRequest` / `SimulationScenarioResponse`)**:
   - **Mismatch**: Backend requires `scenario_name`, `demand_multiplier`, `snowfall_delta`, `blocked_route_ids`, and `simulation_days`.
   - **Resolution**: Mapped `snow_depth_mm` to `snowfall_delta`, and pass closures to `blocked_route_ids`. Formatted simulated trajectory curves from `unit_projections`.

---

## Action Items for the Backend Team

1. **Enforce JWT Authentication on `/api/v1/auth/me`**:
   - When no `Authorization` header or an invalid token is passed, the backend currently defaults to returning `dev_commander` (`00000000-0000-0000-0000-000000000001`) with HTTP 200 OK.
   - *Fix*: Reject unauthenticated requests with `401 Unauthorized` so that the client can trigger session eviction and redirection.
2. **Enforce Role-Based Access Control (RBAC) on Write Endpoints**:
   - When `edge_charlie` (`EDGE_READ_ONLY`) posts to `POST /api/v1/convoys`, the backend currently allows the write and returns `201 Created`.
   - *Fix*: Add dependency check `Depends(require_role(["CORPS_COMMANDER", "LOGISTICS_OFFICER"]))` and return `403 Forbidden` for read-only roles.
3. **Implement Dedicated Report Export Endpoint**:
   - Add `GET /api/v1/reports/export.csv` returning `text/csv` with `Content-Disposition: attachment; filename=audit_report.csv`.
4. **Implement Composite Dashboard Endpoint**:
   - Add `GET /api/v1/dashboard` to provide pre-aggregated forward reserve and recommendation payloads in a single network round-trip.
