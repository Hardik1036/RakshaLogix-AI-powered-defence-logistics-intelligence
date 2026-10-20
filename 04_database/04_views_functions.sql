-- Views and functions used by the API and the ML trainer
-- SYNTHETIC DATA FOR R&D ONLY - NOT ACTUAL INDIAN ARMY LOGS

-- Inventory health: days_remaining from the trailing 7 ledger days of each series.
CREATE OR REPLACE VIEW v_inventory_status AS
WITH ranked AS (
    SELECT unit_id, item_type, quantity_used,
           ROW_NUMBER() OVER (PARTITION BY unit_id, item_type ORDER BY date DESC) AS rn
    FROM consumption
), burn AS (
    SELECT unit_id, item_type, AVG(quantity_used) AS avg_burn_7d
    FROM ranked WHERE rn <= 7 GROUP BY unit_id, item_type
), calc AS (
    SELECT u.id AS unit_id, u.name AS unit_name, u.type AS unit_type, u.altitude_m,
           i.item_type, i.unit_of_measure, i.quantity AS current_stock, i.minimum_stock, i.maximum_stock,
           ROUND(b.avg_burn_7d, 2) AS daily_burn,
           ROUND(i.quantity / NULLIF(b.avg_burn_7d, 0), 2) AS days_remaining,
           u.geom
    FROM inventory i
    JOIN units u ON u.id = i.unit_id
    LEFT JOIN burn b ON b.unit_id = i.unit_id AND b.item_type = i.item_type
)
SELECT unit_id, unit_name, unit_type, altitude_m, item_type, unit_of_measure,
       current_stock, minimum_stock, maximum_stock, daily_burn, days_remaining,
       CASE WHEN days_remaining < 3 THEN 'RED'
            WHEN days_remaining < 7 THEN 'AMBER'
            ELSE 'GREEN' END AS status_color,                    -- UI rule: <3 d red, 3-7 d amber, >7 d green
       (current_stock < minimum_stock) AS buffer_breach,
       ST_Y(geom) AS lat, ST_X(geom) AS lon
FROM calc;

-- Four dashboard badges
CREATE OR REPLACE VIEW v_dashboard_kpis AS
SELECT
    (SELECT COUNT(DISTINCT unit_id) FROM v_inventory_status WHERE days_remaining < 2)              AS units_under_48h_reserve,
    (SELECT COUNT(*) FROM convoys WHERE status IN ('IN_TRANSIT','REROUTED','DELAYED'))            AS active_convoys,
    (SELECT COUNT(*) FROM alerts WHERE status = 'ACTIVE' AND severity IN ('CRITICAL','HIGH')
                                   AND created_at >= now() - interval '24 hours')                  AS shortage_alerts_24h,
    (SELECT COUNT(*) FROM routes WHERE route_role = 'PRIMARY' AND status = 'BLOCKED')              AS closed_passes;

-- ML training feed: the 17 required features + targets. Column names match the feature list.
-- Lags/rolling means use ONLY earlier rows (no look-ahead). Monday = 0 to match pandas dayofweek.
-- Rows in the first 14 days have NULL lags; drop them in the export (see README).
CREATE OR REPLACE VIEW v_ml_feature_feed AS
WITH base AS (
    SELECT
        c.date, c.unit_id, c.item_type,
        c.quantity_used AS consumption_qty,
        LAG(c.quantity_used, 1)  OVER w  AS consumption_lag_1d,
        LAG(c.quantity_used, 3)  OVER w  AS consumption_lag_3d,
        LAG(c.quantity_used, 7)  OVER w  AS consumption_lag_7d,
        LAG(c.quantity_used, 14) OVER w  AS consumption_lag_14d,
        CASE WHEN COUNT(*) OVER w3 = 3 THEN AVG(c.quantity_used) OVER w3 END AS rolling_mean_3d,
        CASE WHEN COUNT(*) OVER w7 = 7 THEN AVG(c.quantity_used) OVER w7 END AS rolling_mean_7d,
        c.opening_stock, c.closing_stock,
        c.operational_tempo, c.vehicle_availability, c.route_status,
        MIN(c.closing_stock) OVER wf  AS min_closing_next_48h,
        COUNT(*)             OVER wf  AS days_in_horizon
    FROM consumption c
    WINDOW w  AS (PARTITION BY c.unit_id, c.item_type ORDER BY c.date),
           w3 AS (w ROWS BETWEEN 3 PRECEDING AND 1 PRECEDING),
           w7 AS (w ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING),
           wf AS (w ROWS BETWEEN CURRENT ROW AND 1 FOLLOWING)
)
SELECT
    b.date, b.unit_id, b.item_type,
    b.consumption_qty,                                                   -- regression target
    b.consumption_lag_1d, b.consumption_lag_3d, b.consumption_lag_7d, b.consumption_lag_14d,
    ROUND(b.rolling_mean_3d, 4) AS rolling_mean_3d,
    ROUND(b.rolling_mean_7d, 4) AS rolling_mean_7d,
    b.opening_stock,
    LEAST(ROUND(b.opening_stock / (b.rolling_mean_3d + 0.00001), 2), 999) AS days_remaining,   -- capped at 999
    COALESCE(w.temperature, -5.0)                           AS temperature,
    COALESCE(w.snowfall_mm + w.rainfall_mm, 0.0)            AS rainfall_snowfall,
    COALESCE(w.visibility_km, 10.0)                         AS visibility,
    u.terrain_score,
    CASE b.route_status WHEN 'BLOCKED' THEN 2 WHEN 'RESTRICTED' THEN 1 ELSE 0 END AS route_status_encoded,
    b.operational_tempo                                     AS operational_demand_level,
    b.vehicle_availability,
    (EXTRACT(ISODOW FROM b.date)::int - 1)                  AS day_of_week,
    EXTRACT(MONTH FROM b.date)::int                         AS month,
    -- classification targets (computed from FUTURE ledger rows only; never used as features)
    (b.closing_stock <= i.minimum_stock)::int               AS stockout_flag,
    CASE WHEN b.days_in_horizon = 2 THEN (b.min_closing_next_48h <= i.minimum_stock)::int END AS stockout_48h
FROM base b
JOIN inventory i ON i.unit_id = b.unit_id AND i.item_type = b.item_type
JOIN units u     ON u.id = b.unit_id
LEFT JOIN weather w ON w.unit_id = b.unit_id AND w.obs_date = b.date AND NOT w.is_forecast;

-- Inference-time feature vector for "tomorrow" (p_as_of). Returns JSONB whose keys are the feature names,
-- ready to pass to predict_demand(payload). Uses history strictly before p_as_of.
CREATE OR REPLACE FUNCTION fn_inference_features(p_unit_id TEXT, p_item_type TEXT, p_as_of DATE DEFAULT CURRENT_DATE)
RETURNS JSONB
LANGUAGE sql STABLE
AS $$
WITH h AS (
    SELECT
        MAX(c.quantity_used)      FILTER (WHERE c.date = p_as_of - 1)  AS lag1,
        MAX(c.quantity_used)      FILTER (WHERE c.date = p_as_of - 3)  AS lag3,
        MAX(c.quantity_used)      FILTER (WHERE c.date = p_as_of - 7)  AS lag7,
        MAX(c.quantity_used)      FILTER (WHERE c.date = p_as_of - 14) AS lag14,
        AVG(c.quantity_used)      FILTER (WHERE c.date BETWEEN p_as_of - 3 AND p_as_of - 1) AS roll3,
        AVG(c.quantity_used)      FILTER (WHERE c.date BETWEEN p_as_of - 7 AND p_as_of - 1) AS roll7,
        MAX(c.closing_stock)      FILTER (WHERE c.date = p_as_of - 1)  AS last_close,
        MAX(c.operational_tempo)  FILTER (WHERE c.date = p_as_of - 1)  AS last_tempo
    FROM consumption c
    WHERE c.unit_id = p_unit_id AND c.item_type = p_item_type
      AND c.date BETWEEN p_as_of - 14 AND p_as_of - 1
), st AS (
    SELECT COALESCE((SELECT last_close FROM h),
                    (SELECT i.quantity FROM inventory i WHERE i.unit_id = p_unit_id AND i.item_type = p_item_type)) AS opening
), wx AS (
    SELECT COALESCE(MAX(w.temperature), -5.0)                     AS temperature,
           COALESCE(MAX(w.snowfall_mm + w.rainfall_mm), 0.0)      AS precip,
           COALESCE(MAX(w.visibility_km), 10.0)                   AS visibility
    FROM weather w WHERE w.unit_id = p_unit_id AND w.obs_date = p_as_of
), ctx AS (
    SELECT
        (SELECT u.terrain_score FROM units u WHERE u.id = p_unit_id) AS terrain,
        COALESCE((SELECT MAX(CASE r.status WHEN 'BLOCKED' THEN 2 WHEN 'RESTRICTED' THEN 1 ELSE 0 END)
                  FROM routes r WHERE r.destination_id = p_unit_id AND r.route_role = 'PRIMARY'), 0) AS route_enc,
        COALESCE((SELECT CAST(COUNT(*) FILTER (WHERE v.status = 'AVAILABLE') AS NUMERIC) / NULLIF(COUNT(*), 0)
                  FROM vehicles v WHERE v.unit_id = p_unit_id), 1.0) AS veh_avail
)
SELECT jsonb_build_object(
    'unit_id', p_unit_id,
    'item_type', p_item_type,
    'as_of', p_as_of,
    'consumption_lag_1d',  h.lag1,
    'consumption_lag_3d',  h.lag3,
    'consumption_lag_7d',  h.lag7,
    'consumption_lag_14d', h.lag14,
    'rolling_mean_3d',     h.roll3,
    'rolling_mean_7d',     h.roll7,
    'opening_stock',       st.opening,
    'days_remaining',      LEAST(ROUND(st.opening / (h.roll3 + 0.00001), 2), 999),
    'temperature',         wx.temperature,
    'rainfall_snowfall',   wx.precip,
    'visibility',          wx.visibility,
    'terrain_score',       ctx.terrain,
    'route_status_encoded', ctx.route_enc,
    'operational_demand_level', COALESCE(h.last_tempo, 2),
    'vehicle_availability', ROUND(ctx.veh_avail, 2),
    'day_of_week',         EXTRACT(ISODOW FROM p_as_of)::int - 1,
    'month',               EXTRACT(MONTH FROM p_as_of)::int
)
FROM h, st, wx, ctx;
$$;
