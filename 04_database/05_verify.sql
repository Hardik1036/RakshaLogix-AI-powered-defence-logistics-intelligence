-- Smoke tests. Every PASS line must appear; any FAIL raises an exception.
\echo '--- row counts'
SELECT 'units' AS t, COUNT(*) FROM units UNION ALL SELECT 'inventory', COUNT(*) FROM inventory
UNION ALL SELECT 'consumption', COUNT(*) FROM consumption UNION ALL SELECT 'weather', COUNT(*) FROM weather
UNION ALL SELECT 'routes', COUNT(*) FROM routes UNION ALL SELECT 'vehicles', COUNT(*) FROM vehicles
UNION ALL SELECT 'alerts', COUNT(*) FROM alerts UNION ALL SELECT 'convoys', COUNT(*) FROM convoys
UNION ALL SELECT 'iot_data', COUNT(*) FROM iot_data UNION ALL SELECT 'model_runs', COUNT(*) FROM model_runs;

DO $$
DECLARE n BIGINT; ok BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO n FROM consumption;          IF n <> 11680 THEN RAISE EXCEPTION 'FAIL: expected 11680 ledger rows, got %', n; END IF;
    SELECT COUNT(*) INTO n FROM inventory;            IF n <> 32    THEN RAISE EXCEPTION 'FAIL: expected 32 inventory rows, got %', n; END IF;
    RAISE NOTICE 'PASS: row counts';

    -- ledger continuity: today's opening = yesterday's closing
    SELECT COUNT(*) INTO n FROM (
        SELECT opening_stock - LAG(closing_stock) OVER (PARTITION BY unit_id, item_type ORDER BY date) AS gap
        FROM consumption) x WHERE gap IS NOT NULL AND gap <> 0;
    IF n <> 0 THEN RAISE EXCEPTION 'FAIL: % ledger continuity breaks', n; END IF;
    RAISE NOTICE 'PASS: ledger continuity';

    -- inventory balance equals last ledger closing
    SELECT COUNT(*) INTO n FROM inventory i JOIN LATERAL (
        SELECT closing_stock FROM consumption c WHERE c.unit_id = i.unit_id AND c.item_type = i.item_type
        ORDER BY date DESC LIMIT 1) l ON TRUE WHERE l.closing_stock <> i.quantity;
    IF n <> 0 THEN RAISE EXCEPTION 'FAIL: % inventory rows disagree with ledger', n; END IF;
    RAISE NOTICE 'PASS: inventory matches ledger';

    -- constraint: negative inventory rejected
    ok := FALSE;
    BEGIN
        INSERT INTO inventory (unit_id, item_type, quantity, minimum_stock, maximum_stock, unit_of_measure)
        VALUES ('UNIT_01', 'Fuel', -1, 0, 10, 'kL');
    EXCEPTION WHEN check_violation THEN ok := TRUE; END;
    IF NOT ok THEN RAISE EXCEPTION 'FAIL: negative inventory accepted'; END IF;
    RAISE NOTICE 'PASS: negative inventory rejected';

    -- constraint: impossible coordinates rejected
    ok := FALSE;
    BEGIN
        INSERT INTO units (id, name, type, geom) VALUES ('UNIT_X', 'bad', 'POST', ST_SetSRID(ST_MakePoint(77, 95), 4326));
    EXCEPTION WHEN check_violation THEN ok := TRUE; END;
    IF NOT ok THEN RAISE EXCEPTION 'FAIL: latitude 95 accepted'; END IF;
    RAISE NOTICE 'PASS: invalid coordinates rejected';

    -- constraint: unbalanced ledger row rejected
    ok := FALSE;
    BEGIN
        INSERT INTO consumption (unit_id, item_type, date, opening_stock, incoming_supply, quantity_used, closing_stock)
        VALUES ('UNIT_01', 'Fuel', DATE '2000-01-01', 10, 0, 1, 5);
    EXCEPTION WHEN check_violation THEN ok := TRUE; END;
    IF NOT ok THEN RAISE EXCEPTION 'FAIL: unbalanced ledger row accepted'; END IF;
    RAISE NOTICE 'PASS: unbalanced ledger rejected';

    -- audit log is append-only
    INSERT INTO audit_logs (action, entity_type, entity_id) VALUES ('VERIFY_SELFTEST', 'system', 'verify');
    ok := FALSE;
    BEGIN UPDATE audit_logs SET action = 'tamper'; EXCEPTION WHEN raise_exception THEN ok := TRUE; END;
    IF NOT ok THEN RAISE EXCEPTION 'FAIL: audit_logs UPDATE allowed'; END IF;
    ok := FALSE;
    BEGIN DELETE FROM audit_logs; EXCEPTION WHEN raise_exception THEN ok := TRUE; END;
    IF NOT ok THEN RAISE EXCEPTION 'FAIL: audit_logs DELETE allowed'; END IF;
    RAISE NOTICE 'PASS: audit_logs is append-only';
END $$;

\echo '--- FOB Charlie (UNIT_03) inventory'
SELECT item_type, current_stock, minimum_stock, daily_burn, days_remaining, status_color, buffer_breach
FROM v_inventory_status WHERE unit_id = 'UNIT_03' ORDER BY item_type;

\echo '--- dashboard KPIs'
SELECT * FROM v_dashboard_kpis;

\echo '--- units within 50 km of storm centre (77.20, 35.10) holding < 125% of minimum stock'
SELECT u.id, u.name, i.item_type, i.quantity,
       ROUND((ST_Distance(u.geom::geography, ST_SetSRID(ST_MakePoint(77.20, 35.10), 4326)::geography) / 1000)::numeric, 1) AS km
FROM units u JOIN inventory i ON i.unit_id = u.id
WHERE ST_DWithin(u.geom::geography, ST_SetSRID(ST_MakePoint(77.20, 35.10), 4326)::geography, 50000)
  AND i.quantity < i.minimum_stock * 1.25;

\echo '--- fallback route for ROUTE_01'
SELECT r.id, r.status, f.id AS fallback_id, f.status AS fallback_status, ST_AsGeoJSON(f.path_geom) AS fallback_geojson
FROM routes r JOIN routes f ON f.id = r.fallback_route_id WHERE r.id = 'ROUTE_01';

\echo '--- ML feed: 17 features present, label balance (rows with full 14-day history)'
SELECT COUNT(*) AS rows, ROUND(AVG(stockout_48h)::numeric, 4) AS stockout_48h_rate, SUM(stockout_48h) AS positives
FROM v_ml_feature_feed WHERE consumption_lag_14d IS NOT NULL AND stockout_48h IS NOT NULL;

\echo '--- inference feature vector for FOB Charlie fuel (tomorrow)'
SELECT jsonb_pretty(fn_inference_features('UNIT_03', 'Fuel', CURRENT_DATE));
