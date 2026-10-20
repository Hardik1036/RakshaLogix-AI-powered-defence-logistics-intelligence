-- Static seed: routes, vehicles, users, maintenance, IoT sample, convoys, model_runs
-- SYNTHETIC DATA FOR R&D ONLY - NOT ACTUAL INDIAN ARMY LOGS. Geometry is illustrative, not surveyed.
-- Requires 02_seed_generated.sql (units) to have run first.
BEGIN;

-- Ensure base forward operating units exist if 03_seed_static.sql is run before 02_seed_generated.sql
INSERT INTO units (id, name, type, parent_unit_id, altitude_m, terrain_score, geom) VALUES
('UNIT_01', 'Leh Base HQ & Logistic Hub', 'HQ', NULL, 3500, 3.0, ST_SetSRID(ST_MakePoint(77.58, 34.15), 4326)),
('UNIT_02', 'Kargil Forward Supply Depot', 'DEPOT', 'UNIT_01', 2676, 4.0, ST_SetSRID(ST_MakePoint(76.13, 34.56), 4326)),
('UNIT_03', 'Siachen Base Camp (FOB Charlie)', 'FOB', 'UNIT_02', 3600, 8.5, ST_SetSRID(ST_MakePoint(77.2, 35.2), 4326)),
('UNIT_04', 'Dras Tactical Outpost', 'POST', 'UNIT_02', 3280, 6.0, ST_SetSRID(ST_MakePoint(75.76, 34.43), 4326)),
('UNIT_05', 'Galwan Valley Forward Post', 'POST', 'UNIT_01', 4200, 8.0, ST_SetSRID(ST_MakePoint(78.2, 34.75), 4326)),
('UNIT_06', 'Chushul Strategic Garrison', 'POST', 'UNIT_01', 4350, 7.0, ST_SetSRID(ST_MakePoint(78.65, 33.59), 4326)),
('UNIT_07', 'Nubra Valley Intermediate Depot', 'DEPOT', 'UNIT_01', 3048, 5.0, ST_SetSRID(ST_MakePoint(77.56, 34.68), 4326)),
('UNIT_08', 'Daulet Beg Oldie (DBO) FOB', 'FOB', 'UNIT_07', 5065, 9.0, ST_SetSRID(ST_MakePoint(77.92, 35.35), 4326))
ON CONFLICT (id) DO NOTHING;

-- Routes: fallback first so the primary can reference it.
INSERT INTO routes (id, name, origin_id, destination_id, route_role, fallback_route_id, pass_name,
                    distance_km, terrain_score, weather_score, risk_score, estimated_time_hours, path_geom, status) VALUES
('ROUTE_01_ALT', 'Kargil to FOB Charlie (Valley Bypass)', 'UNIT_02', 'UNIT_03', 'FALLBACK', NULL, NULL,
  245.0, 5.2, 0.90, 0.15, 8.8,
  ST_SetSRID(ST_GeomFromText('LINESTRING(76.13 34.56, 76.50 34.20, 77.00 34.70, 77.20 35.20)'), 4326), 'OPEN')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

INSERT INTO routes (id, name, origin_id, destination_id, route_role, fallback_route_id, pass_name,
                    distance_km, terrain_score, weather_score, risk_score, estimated_time_hours, path_geom, status) VALUES
('ROUTE_01', 'Kargil to FOB Charlie (Main Pass Echo Corridor)', 'UNIT_02', 'UNIT_03', 'PRIMARY', 'ROUTE_01_ALT', 'Pass Echo',
  185.0, 7.8, 0.55, 0.62, 6.5,
  ST_SetSRID(ST_GeomFromText('LINESTRING(76.13 34.56, 76.80 34.90, 77.20 35.20)'), 4326), 'BLOCKED'),
('ROUTE_02', 'Leh to Kargil (Fotu La axis)', 'UNIT_01', 'UNIT_02', 'PRIMARY', NULL, 'Fotu La',
  217.0, 4.5, 0.95, 0.10, 6.0,
  ST_SetSRID(ST_GeomFromText('LINESTRING(77.58 34.15, 76.85 34.28, 76.13 34.56)'), 4326), 'OPEN'),
('ROUTE_03', 'Kargil to Dras (Zojila axis)', 'UNIT_02', 'UNIT_04', 'PRIMARY', NULL, 'Zojila',
  60.0, 8.0, 0.80, 0.30, 3.0,
  ST_SetSRID(ST_GeomFromText('LINESTRING(76.13 34.56, 75.95 34.50, 75.76 34.43)'), 4326), 'BLOCKED'),
('ROUTE_04', 'Leh to Nubra (Khardung La)', 'UNIT_01', 'UNIT_07', 'PRIMARY', NULL, 'Khardung La',
  120.0, 8.5, 0.85, 0.25, 5.5,
  ST_SetSRID(ST_GeomFromText('LINESTRING(77.58 34.15, 77.60 34.28, 77.56 34.68)'), 4326), 'OPEN'),
('ROUTE_05', 'Leh to Chushul (Chang La)', 'UNIT_01', 'UNIT_06', 'PRIMARY', NULL, 'Chang La',
  160.0, 7.0, 0.85, 0.20, 6.0,
  ST_SetSRID(ST_GeomFromText('LINESTRING(77.58 34.15, 78.10 33.85, 78.65 33.59)'), 4326), 'OPEN'),
('ROUTE_06', 'Leh to Galwan (Shyok axis)', 'UNIT_01', 'UNIT_05', 'PRIMARY', NULL, NULL,
  230.0, 8.0, 0.85, 0.22, 9.0,
  ST_SetSRID(ST_GeomFromText('LINESTRING(77.58 34.15, 78.00 34.40, 78.20 34.75)'), 4326), 'OPEN'),
('ROUTE_07', 'Nubra to DBO (Sasser La axis)', 'UNIT_07', 'UNIT_08', 'PRIMARY', NULL, 'Sasser La',
  140.0, 9.0, 0.70, 0.40, 8.0,
  ST_SetSRID(ST_GeomFromText('LINESTRING(77.56 34.68, 77.75 35.05, 77.92 35.35)'), 4326), 'OPEN')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

-- Vehicles: 2 tankers + 2 load carriers per unit
INSERT INTO vehicles (id, unit_id, type, capacity_tonnes, fuel_level, status, current_location)
SELECT 'VEH_' || right(u.id, 2) || '_' || v.code, u.id, v.vtype, v.cap, v.fuel, 'AVAILABLE', u.geom
FROM units u
CROSS JOIN (VALUES ('T1', 'Tanker 5kL', 4.20, 92.0),
                   ('T2', 'Tanker 5kL', 4.20, 81.5),
                   ('A1', 'ALS 2.5T',  2.50, 76.0),
                   ('A2', 'ALS 2.5T',  2.50, 64.0)) AS v(code, vtype, cap, fuel)
ON CONFLICT (id) DO NOTHING;
UPDATE vehicles SET status = 'MAINTENANCE' WHERE id = 'VEH_03_A2';   -- Charlie fleet ratio 0.75
UPDATE vehicles SET status = 'MAINTENANCE' WHERE id = 'VEH_08_T2';

INSERT INTO maintenance (vehicle_id, service_date, failure_prob, next_due, notes)
SELECT id, CURRENT_DATE - 30,
       ROUND((0.04 + (abs(hashtext(id)::bigint) % 40) / 100.0)::numeric, 3),
       CURRENT_DATE + 60, 'Synthetic maintenance record'
FROM vehicles;

-- Demo users. CHANGE THE PASSWORD before showing the repo publicly.
INSERT INTO users (username, name, role, unit_id, password_hash) VALUES
('commander',  'Demo Commander (synthetic)',        'COMMANDER',   'UNIT_01', crypt('ChangeMe#2026', gen_salt('bf', 10))),
('logofficer', 'Demo Logistics Officer (synthetic)', 'LOG_OFFICER', 'UNIT_02', crypt('ChangeMe#2026', gen_salt('bf', 10)))
ON CONFLICT (username) DO NOTHING;

-- Sample IoT telemetry, last 24 h, hourly. Satellite link = late arrival (store-and-forward).
INSERT INTO iot_data (sensor_id, asset_id, unit_id, recorded_at, received_at, temperature, fuel_level_pct, battery_pct, link_type)
SELECT 'SENS_' || s.unit || '_FUEL', s.unit || '_FUEL_TANK_1', s.unit, ts, ts + s.lag_min * interval '1 minute',
       ROUND((-14 + 5 * sin(EXTRACT(HOUR FROM ts)::float8 / 24 * 2 * pi()))::numeric, 2),
       ROUND((s.start_pct - EXTRACT(EPOCH FROM (ts - (date_trunc('hour', now()) - interval '23 hours'))) / 3600.0 * 0.35)::numeric, 2),
       ROUND((100 - EXTRACT(EPOCH FROM (ts - (date_trunc('hour', now()) - interval '23 hours'))) / 3600.0 * 0.2)::numeric, 2),
       s.link
FROM (VALUES ('UNIT_03', 'LORAWAN',   2, 31.0),
             ('UNIT_08', 'SATELLITE', 45, 52.0),
             ('UNIT_02', 'LORAWAN',   1, 66.0)) AS s(unit, link, lag_min, start_pct)
CROSS JOIN generate_series(date_trunc('hour', now()) - interval '23 hours', date_trunc('hour', now()), interval '1 hour') AS ts;

-- Two sample in-transit convoys, positioned along their route geometry
INSERT INTO convoys (id, route_id, vehicle_count, cargo_type, cargo_quantity, escort_strength, status,
                     departure_time, eta, current_location, created_by)
SELECT 'CONV_001', r.id, 4, 'Rations', 2800, 1, 'IN_TRANSIT', now() - interval '3 hours', now() + interval '3 hours',
       ST_LineInterpolatePoint(r.path_geom, 0.45), (SELECT id FROM users WHERE username = 'logofficer')
FROM routes r WHERE r.id = 'ROUTE_02'
ON CONFLICT (id) DO NOTHING;

INSERT INTO convoys (id, route_id, vehicle_count, cargo_type, cargo_quantity, escort_strength, status,
                     departure_time, eta, current_location, created_by)
SELECT 'CONV_002', r.id, 2, 'Fuel', 9.0, 1, 'IN_TRANSIT', now() - interval '2 hours', now() + interval '4 hours',
       ST_LineInterpolatePoint(r.path_geom, 0.30), (SELECT id FROM users WHERE username = 'logofficer')
FROM routes r WHERE r.id = 'ROUTE_04'
ON CONFLICT (id) DO NOTHING;

-- Honest model registry: figures copied from RakshaLogix_ML_model_details.pdf (DataCo public benchmark)
INSERT INTO model_runs (model_name, model_version, dataset_version, metrics, notes) VALUES
('Model 1 - WMA baseline', 'wma_baseline', 'DataCo 2015-2018, daily category aggregate',
 '{"mae": 1.5555, "rmse": 9.1353, "test_observations": 3250}'::jsonb,
 'Baseline for ML uplift.'),
('Model 2 - XGBoost quantile (p10/p50/p90)', 'xgb_quantile_v1', 'DataCo 2015-2018, daily category aggregate',
 '{"mae_p50": 1.0275, "rmse_p50": 6.1267, "interval_coverage_p10_p90": 0.956, "quantile_ordering": 0.9975, "mae_improvement_vs_wma_pct": 33.9, "features": 8}'::jsonb,
 'Trained on 8 demand-history/calendar features; no weather or stock features. MAE is in order-item units, not kL.'),
('Model 3 - early-warning risk scorer', 'hgb_sigmoid_v1', 'DataCo 2015-2018, daily category aggregate',
 '{"precision": 0.0353, "recall": 0.8384, "f2": 0.1511, "pr_auc": 0.2571, "log_loss": 0.1437, "precision_at_10": 0.7, "precision_at_20": 0.5, "threshold": 0.0194}'::jsonb,
 'Proxy target (future demand pressure), NOT a physical stock-out label. Use for ranking, not a binary alarm.'),
('Model 4 - Isolation Forest', 'iforest_v1', 'DataCo 2015-2018, daily category aggregate',
 '{"test_observations": 3250, "anomalies": 136, "anomaly_rate": 0.0418}'::jsonb,
 'Unsupervised; no labelled anomalies in the public data.');

COMMIT;
