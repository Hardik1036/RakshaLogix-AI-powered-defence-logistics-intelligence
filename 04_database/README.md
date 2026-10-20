# RakshaLogix database (PostgreSQL 16 + PostGIS)

**SYNTHETIC DATA FOR R&D ONLY - NOT ACTUAL INDIAN ARMY LOGS.**

## Run it
```bash
docker compose up -d                      # postgis/postgis:16-3.4 on localhost:5432
./run_all.sh                              # schema -> seed -> views -> self-tests
./run_all.sh postgresql://raksha:raksha_dev_only@localhost:5432/rakshalogix --reset   # clean rebuild
```
Use `psql` (not pgAdmin's query tool): the generated seed uses inline `COPY ... FROM stdin`.
Connection string for the backend: `postgresql://raksha:raksha_dev_only@localhost:5432/rakshalogix`

| File | What it does |
|---|---|
| `00_reset.sql` | Drops everything (only with `--reset`) |
| `01_schema.sql` | 15 tables, constraints, GIST/GIN/B-tree indexes, append-only audit trigger |
| `02_seed_generated.sql` | Units, 32 inventory rows, 365 d x 8 units x 4 items ledger, weather, demo fixtures (generated) |
| `03_seed_static.sql` | Routes (incl. fallback), vehicles, demo users, IoT sample, 2 convoys, real model metrics |
| `04_views_functions.sql` | `v_inventory_status`, `v_dashboard_kpis`, `v_ml_feature_feed`, `fn_inference_features()` |
| `05_verify.sql` | Self-tests (constraints, ledger integrity, audit immutability) + sample queries |
| `generate_seed_data.py` | Regenerates 02 (`--end-date`, `--seed`, `--demo-days`) |
| `anomaly_ground_truth.csv` | 14 injected anomalies, for scoring the Isolation Forest (not loaded into the DB) |

## Export for the ML trainer
```sql
\copy (SELECT * FROM v_ml_feature_feed WHERE consumption_lag_14d IS NOT NULL AND stockout_48h IS NOT NULL ORDER BY unit_id, item_type, date) TO 'transformed_logistics_weather.csv' CSV HEADER
```
Split by date (first 300 days train, last 65 test). `stockout_48h` is computed from **future** ledger rows
(min closing stock over today+tomorrow <= minimum stock) and is not derivable from any feature column.

## Backend hooks
- `/forecast` input: `SELECT fn_inference_features('UNIT_03','Fuel', CURRENT_DATE);` returns a JSON object keyed by the 17 feature names.
- `/routes/{id}/fallback`: `routes.fallback_route_id`.
- `/alerts/{id}/ack`: sets `acknowledged_by` (user UUID) and `acknowledged_at`.
- Simulation endpoint: write only to `simulation_runs`. Never UPDATE `inventory`.

## What is seeded for the demo
- FOB Charlie (UNIT_03) fuel: ~4.2 days at the trailing 7-day burn (AMBER on the UI rule), above its 3-day minimum.
- One fixture forecast (`model_version = 'SEED_DEMO_FIXTURE'`, 34 h to stock-out, risk 0.78) and two fixture alerts, labelled as demo fixtures.
  A real `Run Forecast` replaces them with model output.
- 3 days of storm weather (`is_forecast = true`): -18 C and 75 mm on day 2.
- Stress events in the ledger: two blizzards (5 d, -22 C, ~90 mm, routes BLOCKED), two combat surges (tempo 5, x3 fuel/ammo, border posts),
  two fleet shortages (availability 0.2). Stock-outs emerge from delayed resupply rather than being scripted.

## Tested / not tested
Tested: generator output against every CHECK/UNIQUE rule in the schema (Python), ledger arithmetic and continuity,
window-function logic (lags, rolling means, day-of-week) against pandas in SQLite.
**Not tested:** execution on a live PostgreSQL/PostGIS instance (none was available where this was built).
Run `./run_all.sh` once; `05_verify.sql` prints a PASS line per test and stops on the first failure.
