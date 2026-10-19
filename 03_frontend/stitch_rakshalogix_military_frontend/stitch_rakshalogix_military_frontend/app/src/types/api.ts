// API Schemas and Contracts for RakshaLogix (Exact OpenAPI Mirror & UI Adapters)

// ============================================================================
// 1. AUTH & USER SCHEMAS (OpenAPI: LoginRequest, TokenResponse, UserRead)
// ============================================================================

export interface LoginRequest {
  username: string;
  password: string;
}

export interface UserAuthProfile {
  id: string;
  username: string;
  role: string;
  unit_id?: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserAuthProfile;
  refresh_token?: string | null;
}

export interface UserRead {
  id: string;
  username: string;
  role: string;
  unit_id?: string | null;
  is_active: boolean;
  created_at?: string | null;
}

// ============================================================================
// 2. INVENTORY SCHEMAS (OpenAPI: InventoryRead, TacticalStockSummary)
// ============================================================================

export interface InventoryRead {
  id: string;
  unit_id: string;
  unit_name?: string | null;
  item_type: string;
  quantity: number;
  minimum_stock: number;
  maximum_stock: number;
  updated_at?: string | null;
  days_of_supply?: number | null;
  stock_status?: string | null;
}

export interface TacticalStockSummary {
  unit_id: string;
  unit_name: string;
  unit_type: string;
  altitude_m: number;
  inventories: InventoryRead[];
}

export interface InventoryItem {
  unit_id: string;
  name: string;
  sector: string;
  commodity: string;
  on_hand: number;
  unit: string;
  daily_burn: number;
  runway_days: number;
  status: 'CRITICAL' | 'WARNING' | 'NOMINAL';
  is_high_altitude: boolean;
  critical_fuel_48h: boolean;
  elevation_ft?: number;
  temperature_c?: number;
  raw_inventory?: InventoryRead;
}

export interface BurnLedgerEntry {
  day: string;
  burn_litres: number;
  is_today?: boolean;
}

export interface InventoryDetail extends InventoryItem {
  elevation_ft: number;
  temperature_c: number;
  burn_ledger_14d: BurnLedgerEntry[];
  nearest_convoy: string;
  route_status: string;
  overland_eta: string;
  spike_percentage: number;
  raw_summary?: TacticalStockSummary;
}

// ============================================================================
// 3. FORECAST SCHEMAS (OpenAPI: ForecastRequest, ForecastResponse, ExplainableDecisionCard)
// ============================================================================

export interface ExplainableDecisionCard {
  action_type: string;
  confidence_level: string;
  confidence_percentage: number;
  primary_risk_driver: string;
  top_feature_contributions: Record<string, number>;
  command_recommendation: string;
  requires_officer_sign_off: boolean;
}

export interface ForecastRequest {
  unit_id: string;
  item_type?: string;
  horizon?: '24h' | '48h' | '7d' | string;
}

export interface ForecastPoint {
  time: string;
  actual?: number;
  predicted?: number;
  lower_bound?: number;
  upper_bound?: number;
  p10?: number;
  p90?: number;
  buffer_min?: number;
}

export interface ForecastResponse {
  unit_id: string;
  item_type: string;
  horizon: string;
  forecast_horizon?: string | null;
  current_stock: number;
  predicted_demand: number;
  lower_bound: number;
  upper_bound: number;
  stockout_risk: number;
  days_of_supply: number;
  critical_alert_triggered?: boolean;
  is_critical?: boolean | null;
  anomaly_flag?: boolean | null;
  top_factors?: string[] | null;
  model_version?: string;
  decision_card: ExplainableDecisionCard;
  points: ForecastPoint[];
}

// ============================================================================
// 4. ROUTE & GIS SCHEMAS (OpenAPI: RouteOptimiseRequest, RouteOptimiseResponse, RouteRead)
// ============================================================================

export interface GeoJSONFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: any;
  };
  properties: Record<string, any>;
}

export interface RouteOptimiseRequest {
  origin_id: string;
  dest_id: string;
  vehicle_type?: string | null;
  avoid_blocked_passes?: boolean;
  snowfall_threshold_mm?: number;
}

export interface RouteRead {
  id: string;
  name: string;
  origin_id: string;
  dest_id: string;
  distance_km: number;
  terrain_score: number;
  status: string;
  pass_altitude_m: number;
  is_snow_blocked: boolean;
}

export interface RouteOptimiseResponse {
  route_id?: string;
  origin_id?: string;
  dest_id?: string;
  primary_corridor?: GeoJSONFeature;
  fallback_corridor?: GeoJSONFeature | null;
  primary_distance_km?: number;
  primary_estimated_hours?: number;
  primary_edge_cost?: number;
  fallback_distance_km?: number | null;
  fallback_estimated_hours?: number | null;
  fallback_edge_cost?: number | null;
  hazards_detected?: string[];
  cost_formula?: string;
  cost_breakdown?: {
    distance_cost: number;
    terrain_penalty: number;
    snow_penalty: number;
    block_penalty: number;
    total_cost: number;
  };
  // Mapped presentation fields for Leaflet:
  coordinates: [number, number][];
  name: string;
  distance_km: number;
  estimated_hours: number;
  status: 'OPTIMISED' | 'CLEAR';
}

export interface RouteFallbackResponse {
  route_id?: string;
  origin_id?: string;
  dest_id?: string;
  name: string;
  coordinates: [number, number][];
  distance_km: number;
  estimated_hours: number;
  time_delta: string;
  status: 'ALTERNATIVE';
  cost_formula?: string;
  cost_breakdown?: {
    distance_cost: number;
    terrain_penalty: number;
    snow_penalty: number;
    block_penalty: number;
    total_cost: number;
  };
}

// ============================================================================
// 5. CONVOYS SCHEMAS (OpenAPI: ConvoyCreate, ConvoyRead)
// ============================================================================

export interface ConvoyCreate {
  id?: string;
  route_id: string;
  origin_id: string;
  dest_id: string;
  vehicle_count?: number;
  cargo_type?: string;
  cargo_quantity?: number;
  departure_time?: string | null;
  eta?: string | null;
  sign_off_action: 'ACCEPT' | 'MODIFY' | string;
  sign_off_notes?: string | null;
}

export interface ConvoyRead {
  id: string;
  route_id: string;
  origin_id: string;
  dest_id: string;
  vehicle_count: number;
  cargo_type: string;
  cargo_quantity: number;
  status: string;
  departure_time: string;
  eta: string;
  sign_off_officer_id: string;
  sign_off_action: string;
  sign_off_timestamp: string;
  sign_off_notes?: string | null;
  current_location?: any;
}

export interface ConvoyItem {
  convoy_id: string;
  origin_depot: string;
  destination: string;
  vehicle_count: number;
  cargo_manifest: string;
  eta_countdown: string;
  eta_seconds: number;
  status: 'IN_TRANSIT' | 'SCHEDULED' | 'DELAYED' | 'COMPLETED';
  escort_type: string;
  priority: string;
  raw_convoy?: ConvoyRead;
}

export interface CreateConvoyRequest {
  origin_depot?: string;
  destination?: string;
  vehicle_count?: number;
  cargo_type?: string;
  manifest_quantity?: string;
  escort_type?: string;
  priority_level?: string;
  bypass_pass?: string;
  route_id?: string;
  origin_id?: string;
  dest_id?: string;
  sign_off_action?: string;
  sign_off_notes?: string;
}

// ============================================================================
// 6. ALERTS SCHEMAS (OpenAPI: AlertRead, AlertAcknowledgeRequest)
// ============================================================================

export interface AlertRead {
  id: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | string;
  unit_id: string;
  message: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | string;
  created_at: string;
  acknowledged_by?: string | null;
  acknowledged_at?: string | null;
}

export interface AlertAcknowledgeRequest {
  notes?: string | null;
}

export interface AlertItem {
  id: string;
  code: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  title: string;
  description: string;
  timestamp: string;
  route_sector: string;
  status: 'UNACKNOWLEDGED' | 'ACKNOWLEDGED';
  suggested_action: string;
  remaining_cap: string;
  burn_rate: string;
  weather_temp: string;
  coordinates: string;
  raw_alert?: AlertRead;
}

// ============================================================================
// 7. SIMULATION SCHEMAS (OpenAPI: SimulationScenarioRequest, SimulationScenarioResponse)
// ============================================================================

export interface SimulationScenarioRequest {
  scenario_name?: string;
  demand_multiplier?: number;
  snowfall_delta?: number;
  blocked_route_ids?: string[];
  simulation_days?: number;
}

export interface UnitSimulationProjection {
  unit_id: string;
  unit_name: string;
  item_type: string;
  current_stock: number;
  simulated_stock_after_run: number;
  burn_rate_per_day: number;
  days_to_stockout: number;
  status: string;
}

export interface SimulationScenarioResponse {
  scenario_name: string;
  simulation_days: number;
  modifiers_applied: Record<string, any>;
  baseline_stockouts: number;
  simulated_stockouts: number;
  stockout_increase_percentage: number;
  avg_convoy_delay_hours: number;
  recommended_prestage_depot: string;
  isolated_units: string[];
  unit_projections: UnitSimulationProjection[];
  sandbox_isolation_verified?: boolean;
  notice?: string;
}

export interface SimulationRequest {
  demand_multiplier: number;
  snow_depth_mm: number;
  pass_cutoff: 'zojila' | 'echo' | 'none';
}

export interface SimulationTrajectoryPoint {
  time: string;
  baseline_kl: number;
  simulated_kl: number;
  buffer_kl: number;
}

export interface SimulationResponse {
  baseline: {
    outposts_at_risk: number;
    stress_level: string;
    impacted_node: string;
    depletion_rate: string;
    pass_status: string;
    stranded_convoys: number;
    total_deficit: string;
  };
  simulated: {
    outposts_at_risk: number;
    surge_label: string;
    impacted_outposts: Array<{ name: string; stockout_hours: number; risk_level: string }>;
    dryout_node: string;
    dryout_hours: number;
    total_deficit: string;
  };
  trajectory: SimulationTrajectoryPoint[];
  new_critical_stockouts?: number;
  avg_convoy_delay_hours?: number;
  recommended_action?: string;
  raw_scenario?: SimulationScenarioResponse;
}

// ============================================================================
// 8. KPI, DASHBOARD & AUDIT SCHEMAS (OpenAPI: GET /api/v1/kpi)
// ============================================================================

export interface TacticalAuditEvent {
  action: string;
  user_id: string;
  timestamp: string;
  resource: string;
}

export interface TacticalKpiSummary {
  readiness_index: number;
  readiness_status: string;
  total_active_units: number;
  active_critical_alerts: number;
  active_high_alerts: number;
  active_convoys_in_transit: number;
  blocked_mountain_passes: number;
  total_mountain_corridors: number;
  critical_stock_sectors: number;
  recent_audit_events: TacticalAuditEvent[];
}

export interface KPIStats {
  units_critical_reserve: number;
  active_convoys: number;
  deficit_alerts_24h: number;
  closed_passes: number;
}

export interface AIRecommendation {
  id: string;
  confidence: number;
  top_factors: string[];
  anomaly_flag: boolean;
  stockout_risk: number;
  days_of_supply: number;
  recommendation_text: string;
  target_unit: string;
  origin_depot: string;
  vehicle_count: number;
  cargo_litres: number;
  time_to_critical: string;
  transit_corridor: string;
  launch_window: string;
}

export interface ForwardReserveItem {
  sku: string;
  location: string;
  on_hand: string;
  daily_burn: string;
  runway_days: number;
  status: 'CRITICAL' | 'WARNING' | 'NOMINAL';
}

export interface DashboardResponse {
  kpis: KPIStats;
  ai_recommendation: AIRecommendation | null;
  forward_reserves: ForwardReserveItem[];
  raw_kpi?: TacticalKpiSummary;
}

export interface AuditLogEntry {
  id: string;
  officer_id: string;
  officer_name: string;
  rank: string;
  timestamp_zulu: string;
  timestamp_ist: string;
  ai_recommendation_id: string;
  baseline_summary: string;
  confidence: number;
  action_taken: string;
  justification: string;
  crypt_sig: string;
  verified: boolean;
}
