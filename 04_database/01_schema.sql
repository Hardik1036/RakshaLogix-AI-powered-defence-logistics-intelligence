-- RakshaLogix | PostgreSQL 16 + PostGIS | 15 tables
-- SYNTHETIC DATA FOR R&D ONLY - NOT ACTUAL INDIAN ARMY LOGS
-- Run with psql (ON_ERROR_STOP recommended).

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;      -- gen_random_uuid(), crypt() for demo users

-- Ensure application role exists if connecting as postgres superuser
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'raksha') THEN
    CREATE ROLE raksha WITH LOGIN SUPERUSER PASSWORD 'raksha_dev_only';
  END IF;
END $$;
GRANT ALL PRIVILEGES ON DATABASE rakshalogix TO raksha;

-- 1. units ---------------------------------------------------------------
CREATE TABLE units (
    id             VARCHAR(32)  PRIMARY KEY,
    name           VARCHAR(128) NOT NULL,
    type           VARCHAR(16)  NOT NULL CHECK (type IN ('HQ','DEPOT','FOB','POST')),
    parent_unit_id VARCHAR(32)  REFERENCES units(id),
    altitude_m     INT          NOT NULL DEFAULT 3500 CHECK (altitude_m BETWEEN 0 AND 9000),
    terrain_score  NUMERIC(3,1) NOT NULL DEFAULT 5.0 CHECK (terrain_score BETWEEN 1.0 AND 10.0),
    geom           GEOMETRY(Point, 4326) NOT NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CHECK (parent_unit_id IS NULL OR parent_unit_id <> id),
    CHECK (ST_X(geom) BETWEEN -180 AND 180 AND ST_Y(geom) BETWEEN -90 AND 90)
);

-- 2. users ---------------------------------------------------------------
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(64)  NOT NULL UNIQUE,
    name          VARCHAR(128) NOT NULL,
    role          VARCHAR(16)  NOT NULL CHECK (role IN ('COMMANDER','LOG_OFFICER')),
    unit_id       VARCHAR(32)  REFERENCES units(id),
    password_hash TEXT         NOT NULL,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 3. inventory (current balance) -------------------------------------------
CREATE TABLE inventory (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id         VARCHAR(32) NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    item_type       VARCHAR(32) NOT NULL CHECK (item_type IN ('Fuel','Rations','Medical Supplies','Ammunition')),
    quantity        NUMERIC(12,2) NOT NULL CHECK (quantity >= 0),
    minimum_stock   NUMERIC(12,2) NOT NULL CHECK (minimum_stock >= 0),
    maximum_stock   NUMERIC(12,2) NOT NULL,
    unit_of_measure VARCHAR(16)   NOT NULL,           -- kL | packs | kits | rounds
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    UNIQUE (unit_id, item_type),
    CHECK (maximum_stock >= minimum_stock)
);

-- 4. consumption = daily stock ledger (burn + stock account + context) ---------
CREATE TABLE consumption (
    id                   BIGSERIAL PRIMARY KEY,
    unit_id              VARCHAR(32) NOT NULL,
    item_type            VARCHAR(32) NOT NULL,
    date                 DATE        NOT NULL,
    opening_stock        NUMERIC(12,2) NOT NULL CHECK (opening_stock >= 0),
    incoming_supply      NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (incoming_supply >= 0),
    quantity_used        NUMERIC(12,2) NOT NULL CHECK (quantity_used >= 0),
    closing_stock        NUMERIC(12,2) NOT NULL CHECK (closing_stock >= 0),
    operational_tempo    SMALLINT      NOT NULL DEFAULT 2 CHECK (operational_tempo BETWEEN 1 AND 5),
    vehicle_availability NUMERIC(3,2)  NOT NULL DEFAULT 1.00 CHECK (vehicle_availability BETWEEN 0 AND 1),
    route_status         VARCHAR(16)   NOT NULL DEFAULT 'OPEN' CHECK (route_status IN ('OPEN','RESTRICTED','BLOCKED')),
    UNIQUE (unit_id, item_type, date),
    FOREIGN KEY (unit_id, item_type) REFERENCES inventory (unit_id, item_type) ON DELETE CASCADE,
    CHECK (closing_stock = opening_stock + incoming_supply - quantity_used)   -- stock account must balance
);

-- 5. routes ----------------------------------------------------------------
CREATE TABLE routes (
    id                   VARCHAR(32) PRIMARY KEY,
    name                 VARCHAR(128) NOT NULL,
    origin_id            VARCHAR(32) NOT NULL REFERENCES units(id),
    destination_id       VARCHAR(32) NOT NULL REFERENCES units(id),
    route_role           VARCHAR(16) NOT NULL DEFAULT 'PRIMARY' CHECK (route_role IN ('PRIMARY','FALLBACK')),
    fallback_route_id    VARCHAR(32) REFERENCES routes(id),     -- powers GET /routes/{id}/fallback
    pass_name            VARCHAR(64),                            -- NULL = no high-altitude pass on this leg
    distance_km          NUMERIC(8,2) NOT NULL CHECK (distance_km > 0),
    terrain_score        NUMERIC(3,1) NOT NULL CHECK (terrain_score BETWEEN 1.0 AND 10.0),
    weather_score        NUMERIC(3,2) NOT NULL DEFAULT 1.00 CHECK (weather_score BETWEEN 0 AND 1),  -- 1 = clear
    risk_score           NUMERIC(3,2) NOT NULL DEFAULT 0.00 CHECK (risk_score BETWEEN 0 AND 1),
    estimated_time_hours NUMERIC(6,2) NOT NULL CHECK (estimated_time_hours > 0),
    path_geom            GEOMETRY(LineString, 4326) NOT NULL CHECK (ST_IsValid(path_geom)),
    status               VARCHAR(16) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','RESTRICTED','BLOCKED')),
    CHECK (origin_id <> destination_id),
    CHECK (fallback_route_id IS NULL OR fallback_route_id <> id)
);

-- 6. vehicles --------------------------------------------------------------
CREATE TABLE vehicles (
    id               VARCHAR(32) PRIMARY KEY,
    unit_id          VARCHAR(32) REFERENCES units(id),
    type             VARCHAR(64) NOT NULL,
    capacity_tonnes  NUMERIC(6,2) NOT NULL CHECK (capacity_tonnes > 0),
    fuel_level       NUMERIC(5,2) NOT NULL CHECK (fuel_level BETWEEN 0 AND 100),
    status           VARCHAR(16) NOT NULL DEFAULT 'AVAILABLE'
                     CHECK (status IN ('AVAILABLE','DISPATCHED','MAINTENANCE','UNAVAILABLE')),
    current_location GEOMETRY(Point, 4326)
);

-- 7. weather (daily per unit; is_forecast rows are the next 1-3 days) ---------
CREATE TABLE weather (
    id            BIGSERIAL PRIMARY KEY,
    unit_id       VARCHAR(32) NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    obs_date      DATE        NOT NULL,
    observed_at   TIMESTAMPTZ NOT NULL,
    temperature   NUMERIC(5,2) NOT NULL CHECK (temperature BETWEEN -60 AND 60),
    rainfall_mm   NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (rainfall_mm >= 0),
    snowfall_mm   NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (snowfall_mm >= 0),
    visibility_km NUMERIC(5,2) NOT NULL CHECK (visibility_km BETWEEN 0 AND 50),
    risk_score    NUMERIC(3,2) NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 1),
    is_forecast   BOOLEAN NOT NULL DEFAULT FALSE,
    geom          GEOMETRY(Point, 4326),
    UNIQUE (unit_id, obs_date)
);

-- 8. forecasts ---------------------------------------------------------------
CREATE TABLE forecasts (
    id                 BIGSERIAL PRIMARY KEY,
    unit_id            VARCHAR(32) NOT NULL REFERENCES units(id),
    item_type          VARCHAR(32) NOT NULL,
    forecast_time      TIMESTAMPTZ NOT NULL,
    horizon            VARCHAR(8)  NOT NULL CHECK (horizon IN ('24h','48h','7d')),
    predicted_quantity NUMERIC(12,2) NOT NULL CHECK (predicted_quantity >= 0),
    lower_bound        NUMERIC(12,2) NOT NULL CHECK (lower_bound >= 0),
    upper_bound        NUMERIC(12,2) NOT NULL CHECK (upper_bound >= 0),
    stockout_risk      NUMERIC(4,3)  NOT NULL CHECK (stockout_risk BETWEEN 0 AND 1),
    anomaly_flag       BOOLEAN NOT NULL DEFAULT FALSE,
    top_factors        JSONB   NOT NULL DEFAULT '[]'::jsonb,
    model_version      VARCHAR(48) NOT NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (lower_bound <= predicted_quantity AND predicted_quantity <= upper_bound)
);

-- 9. alerts ------------------------------------------------------------------
CREATE TABLE alerts (
    id              BIGSERIAL PRIMARY KEY,
    type            VARCHAR(32) NOT NULL,
    severity        VARCHAR(16) NOT NULL CHECK (severity IN ('CRITICAL','HIGH','MEDIUM','LOW')),
    unit_id         VARCHAR(32) REFERENCES units(id),
    item_type       VARCHAR(32),
    message         TEXT NOT NULL,
    status          VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ACKNOWLEDGED','RESOLVED')),
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (status <> 'ACKNOWLEDGED' OR (acknowledged_by IS NOT NULL AND acknowledged_at IS NOT NULL))
);

-- 10. convoys ----------------------------------------------------------------
CREATE TABLE convoys (
    id               VARCHAR(32) PRIMARY KEY,
    route_id         VARCHAR(32) NOT NULL REFERENCES routes(id),
    vehicle_count    INT NOT NULL CHECK (vehicle_count > 0),
    cargo_type       VARCHAR(32) NOT NULL CHECK (cargo_type IN ('Fuel','Rations','Medical Supplies','Ammunition')),
    cargo_quantity   NUMERIC(12,2) CHECK (cargo_quantity >= 0),
    escort_strength  INT NOT NULL DEFAULT 0 CHECK (escort_strength >= 0),
    status           VARCHAR(16) NOT NULL DEFAULT 'SCHEDULED'
                     CHECK (status IN ('SCHEDULED','IN_TRANSIT','ARRIVED','REROUTED','DELAYED')),
    departure_time   TIMESTAMPTZ,
    eta              TIMESTAMPTZ,
    current_location GEOMETRY(Point, 4326),
    created_by       UUID REFERENCES users(id),
    source_alert_id  BIGINT REFERENCES alerts(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (eta IS NULL OR departure_time IS NULL OR eta >= departure_time)
);

-- 11. iot_data (store-and-forward: recorded_at = sensor clock, received_at = server clock) ---
CREATE TABLE iot_data (
    id             BIGSERIAL PRIMARY KEY,
    sensor_id      VARCHAR(48) NOT NULL,
    asset_id       VARCHAR(48) NOT NULL,
    unit_id        VARCHAR(32) REFERENCES units(id),
    recorded_at    TIMESTAMPTZ NOT NULL,
    received_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    temperature    NUMERIC(5,2),
    fuel_level_pct NUMERIC(5,2) CHECK (fuel_level_pct BETWEEN 0 AND 100),
    battery_pct    NUMERIC(5,2) CHECK (battery_pct BETWEEN 0 AND 100),
    link_type      VARCHAR(16) NOT NULL DEFAULT 'LORAWAN' CHECK (link_type IN ('LORAWAN','SATELLITE','MQTT','REST')),
    CHECK (received_at >= recorded_at)
);

-- 12. maintenance ------------------------------------------------------------
CREATE TABLE maintenance (
    id           BIGSERIAL PRIMARY KEY,
    vehicle_id   VARCHAR(32) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    service_date DATE NOT NULL,
    failure_prob NUMERIC(4,3) NOT NULL CHECK (failure_prob BETWEEN 0 AND 1),
    next_due     DATE,
    notes        TEXT,
    CHECK (next_due IS NULL OR next_due >= service_date)
);

-- 13. model_runs ---------------------------------------------------------------
CREATE TABLE model_runs (
    id              BIGSERIAL PRIMARY KEY,
    model_name      VARCHAR(96) NOT NULL,
    model_version   VARCHAR(48) NOT NULL,
    dataset_version VARCHAR(128) NOT NULL,
    trained_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    metrics         JSONB NOT NULL,
    notes           TEXT
);

-- 14. simulation_runs (what-if sandbox results; never touches production tables) ----
CREATE TABLE simulation_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    scenario_params JSONB NOT NULL,
    delta           JSONB NOT NULL
);

-- 15. audit_logs (append-only) ---------------------------------------------------
CREATE TABLE audit_logs (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID REFERENCES users(id),
    action      VARCHAR(64) NOT NULL,
    entity_type VARCHAR(48) NOT NULL,
    entity_id   VARCHAR(64),
    details     JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Triggers -----------------------------------------------------------------------
CREATE FUNCTION fn_block_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs is append-only (% blocked)', TG_OP;
END;
$$;
CREATE TRIGGER trg_audit_immutable
    BEFORE UPDATE OR DELETE OR TRUNCATE ON audit_logs
    FOR EACH STATEMENT EXECUTE FUNCTION fn_block_mutation();

CREATE FUNCTION fn_touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_inventory_touch
    BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

-- Indexes -----------------------------------------------------------------------
CREATE INDEX idx_units_geom        ON units    USING GIST (geom);
CREATE INDEX idx_routes_geom       ON routes   USING GIST (path_geom);
CREATE INDEX idx_convoys_geom      ON convoys  USING GIST (current_location);
CREATE INDEX idx_vehicles_geom     ON vehicles USING GIST (current_location);
CREATE INDEX idx_weather_geom      ON weather  USING GIST (geom);
CREATE INDEX idx_consumption_lookup ON consumption (unit_id, item_type, date DESC);
CREATE INDEX idx_weather_lookup    ON weather (unit_id, obs_date DESC);
CREATE INDEX idx_forecasts_lookup  ON forecasts (unit_id, item_type, forecast_time DESC);
CREATE INDEX idx_alerts_active     ON alerts (status, severity);
CREATE INDEX idx_routes_dest       ON routes (destination_id, route_role);
CREATE INDEX idx_iot_sensor_time   ON iot_data (sensor_id, recorded_at DESC);
CREATE INDEX idx_model_runs_gin    ON model_runs USING GIN (metrics);
CREATE INDEX idx_sim_params_gin    ON simulation_runs USING GIN (scenario_params);
CREATE INDEX idx_audit_entity      ON audit_logs (entity_type, entity_id, created_at DESC);
