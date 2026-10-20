-- DESTRUCTIVE: drops every RakshaLogix object. Run only when you want a clean slate.
DROP VIEW     IF EXISTS v_dashboard_kpis, v_ml_feature_feed, v_inventory_status CASCADE;
DROP FUNCTION IF EXISTS fn_inference_features(TEXT, TEXT, DATE);
DROP TABLE    IF EXISTS audit_logs, simulation_runs, model_runs, maintenance, iot_data, convoys, alerts,
                        forecasts, weather, vehicles, routes, consumption, inventory, users, units CASCADE;
DROP FUNCTION IF EXISTS fn_block_mutation();
DROP FUNCTION IF EXISTS fn_touch_updated_at();
