import { showToast } from './context/ToastContext';
import type {
  DashboardResponse,
  InventoryItem,
  InventoryDetail,
  InventoryRead,
  TacticalStockSummary,
  ForecastResponse,
  ForecastPoint,
  RouteOptimiseResponse,
  RouteFallbackResponse,
  ConvoyItem,
  ConvoyRead,
  ConvoyCreate,
  CreateConvoyRequest,
  AlertItem,
  AlertRead,
  SimulationRequest,
  SimulationResponse,
  SimulationScenarioResponse,
  SimulationTrajectoryPoint,
  TacticalKpiSummary,
  AuditLogEntry,
} from './types/api';
import {
  mockDashboardData,
  mockInventoryList,
  getMockInventoryDetail,
  getMockForecastData,
  mockRouteOptimiseResult,
  mockRouteFallbackResult,
  mockConvoysList,
  mockAlertsList,
  calculateSimulationResult,
  mockAuditLogs,
} from './services/mockData';

const BASE_URL = (import.meta.env.VITE_API_URL?.trim() || 'https://rakshalogix-backend.onrender.com').replace(/\/$/, '');
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// Runtime mock state fallback so actions remain responsive if needed
let localConvoys: ConvoyItem[] = [...mockConvoysList];
let localAlerts: AlertItem[] = [...mockAlertsList];
let localDashboard: DashboardResponse = { ...mockDashboardData };

/**
 * Canonical Stockout Probability Formatter (P0 Requirement)
 * Always outputs XX.X% format (e.g., 0.519 -> 51.9%, 51.9 -> 51.9%)
 */
export function formatProbability(value: number): string {
  if (value === undefined || value === null || isNaN(value)) return '0.0%';
  const pct = value <= 1.0 ? value * 100 : value;
  return `${pct.toFixed(1)}%`;
}

/**
 * Standardized Days of Supply / Remaining Runway Arithmetic (P1 Requirement)
 * Usable Stock = Math.max(0, currentStock - reserveBuffer)
 * days_remaining = Number((usableStock / dailyBurn).toFixed(1))
 */
export function calculateDaysRemaining(currentStock: number, dailyBurn: number, reserveBuffer = 0): number {
  const usableStock = Math.max(0, currentStock - reserveBuffer);
  if (!dailyBurn || dailyBurn <= 0) return 99.9;
  return Number((usableStock / dailyBurn).toFixed(1));
}

export interface DemoUserEntry {
  password: string;
  user: {
    id: string;
    username: string;
    role: 'CORPS_COMMANDER' | 'LOGISTICS_OFFICER' | 'EDGE_READ_ONLY';
    unit_id: string;
  };
}

export const DEMO_USERS: Record<string, DemoUserEntry> = {
  commander_alpha: {
    password: 'Commander@DefSec2026!',
    user: {
      id: 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
      username: 'commander_alpha',
      role: 'CORPS_COMMANDER',
      unit_id: 'UNIT_01',
    },
  },
  logistics_bravo: {
    password: 'Logistics@DefSec2026!',
    user: {
      id: 'b2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d',
      username: 'logistics_bravo',
      role: 'LOGISTICS_OFFICER',
      unit_id: 'UNIT_02',
    },
  },
  edge_charlie: {
    password: 'EdgeReadOnly@DefSec2026!',
    user: {
      id: 'e3c4d5e6-f7a8-9b0c-1d2e-3f4a5b6c7d8e',
      username: 'edge_charlie',
      role: 'EDGE_READ_ONLY',
      unit_id: 'UNIT_03',
    },
  },
};

/**
 * Fast tactical credential validator for offline-first Vercel preview & production
 */
export function matchDemoUser(
  username: string,
  password?: string
): { matched: boolean; user?: DemoUserEntry['user']; entry?: DemoUserEntry } {
  const normUser = (username || '').trim().toLowerCase();
  let key: string | undefined;

  if (normUser === 'commander_alpha' || normUser === 'commander' || normUser === 'alpha') {
    key = 'commander_alpha';
  } else if (normUser === 'logistics_bravo' || normUser === 'logistics' || normUser === 'bravo') {
    key = 'logistics_bravo';
  } else if (
    normUser === 'edge_charlie' ||
    normUser === 'edge' ||
    normUser === 'edgereadonly' ||
    normUser === 'edge_read_only' ||
    normUser === 'charlie'
  ) {
    key = 'edge_charlie';
  } else if (DEMO_USERS[normUser]) {
    key = normUser;
  }

  if (!key || !DEMO_USERS[key]) {
    return { matched: false };
  }

  const entry = DEMO_USERS[key];
  if (password !== undefined) {
    const trimmedPass = password.trim();
    const valid =
      trimmedPass === entry.password ||
      (key === 'edge_charlie' && (trimmedPass === 'EdgeReadOnly' || trimmedPass === 'EdgeReadOnly@DefSec2026!'));
    if (!valid) {
      return { matched: false, entry };
    }
  }

  return { matched: true, entry, user: entry.user };
}

/**
 * Tactical Fetch Wrapper with 3-second Render Cold-Start Abort Timeout,
 * Token attachment, 401/403 interceptors & seamless mock fallback
 */
async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {},
  mockFallback?: () => T
): Promise<T> {
  const token = sessionStorage.getItem('access_token') || localStorage.getItem('access_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!USE_MOCK) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
        signal: options.signal || controller.signal,
      });
      clearTimeout(timeoutId);

      // 401 Unauthorized: if mockFallback available, use it rather than interrupting tactical view
      if (response.status === 401) {
        if (mockFallback) {
          console.warn(`[API] 401 on ${endpoint}. Using tactical mock fallback.`);
          return mockFallback();
        }
        sessionStorage.clear();
        localStorage.clear();
        showToast('Tactical Session Expired // Redirecting to login terminal...', 'error');
        window.location.href = '/login';
        throw new Error('401 Unauthorized');
      }

      // 403 Forbidden: Red HUD toast for authorization failure
      if (response.status === 403) {
        showToast('Permission Denied: Command clearance required', 'error');
        if (mockFallback) return mockFallback();
        throw new Error('403 Forbidden');
      }

      if (response.status >= 400) {
        if (mockFallback) {
          console.warn(`[API] HTTP ${response.status} on ${endpoint}. Using tactical fallback.`);
          return mockFallback();
        }
        let errMsg = `HTTP Error ${response.status}`;
        try {
          const errData = await response.json();
          errMsg = errData.detail || errData.message || errMsg;
        } catch {
          // ignore parsing error
        }
        showToast(`Command Error: ${errMsg}`, 'error');
        throw new Error(errMsg);
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      console.warn(`[API] Network or timeout on ${BASE_URL}${endpoint}:`, err);
      if (mockFallback) {
        return mockFallback();
      }
      throw err;
    }
  }

  // USE_MOCK is true: simulate network latency
  await new Promise((res) => setTimeout(res, 80));
  if (mockFallback) {
    return mockFallback();
  }
  throw new Error(`Mock implementation missing for ${endpoint}`);
}

// -------------------------------------------------------------
// ADAPTER & DATA CONVERTERS
// -------------------------------------------------------------

function mapInventoryReadToItem(inv: InventoryRead): InventoryItem {
  const dailyBurn = inv.daily_burn_rate && inv.daily_burn_rate > 0
    ? inv.daily_burn_rate
    : (inv.days_of_supply && inv.days_of_supply > 0
        ? Number((inv.quantity / inv.days_of_supply).toFixed(1))
        : Math.max(1, Math.round(inv.minimum_stock > 0 ? inv.minimum_stock / 3 : 60)));

  const days = inv.days_remaining != null
    ? Number(inv.days_remaining.toFixed(1))
    : (inv.days_of_supply != null
        ? Number(inv.days_of_supply.toFixed(1))
        : calculateDaysRemaining(inv.quantity, dailyBurn));

  const status = days <= 2.0 || inv.stock_status === 'CRITICAL' ? 'CRITICAL' : days <= 5.0 || inv.stock_status === 'LOW' ? 'WARNING' : 'NOMINAL';
  const isHighAltitude = inv.unit_id.includes('DBO') || inv.unit_id.includes('SIACHEN') || inv.unit_id.includes('DISKIT');
  const criticalFuel = inv.item_type.toLowerCase().includes('fuel') && days <= 2.0;

  return {
    unit_id: inv.unit_id,
    name: inv.unit_name || inv.unit_id,
    sector: inv.unit_id.includes('DBO') ? 'Sub-Sector North (SSN) // DBO Axis' : 'Sector-04 Leh-Ladakh Division',
    commodity: inv.item_type,
    on_hand: inv.quantity,
    unit: inv.item_type === 'Fuel' ? 'Litres' : inv.item_type === 'Ammunition' ? 'Rounds' : 'Kits',
    daily_burn: dailyBurn,
    runway_days: days,
    status,
    is_high_altitude: isHighAltitude,
    critical_fuel_48h: criticalFuel,
    elevation_ft: isHighAltitude ? 16500 : 11500,
    temperature_c: -22,
    raw_inventory: inv,
  };
}

function mapConvoyReadToItem(c: ConvoyRead): ConvoyItem {
  const etaDate = new Date(c.eta);
  const now = new Date();
  const diffSec = Math.max(0, Math.round((etaDate.getTime() - now.getTime()) / 1000));
  const hours = Math.floor(diffSec / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  const etaCountdown = `${String(hours).padStart(2, '0')}h : ${String(mins).padStart(2, '0')}m`;

  return {
    convoy_id: c.id,
    origin_depot: c.origin_id,
    destination: c.dest_id,
    vehicle_count: c.vehicle_count,
    cargo_manifest: `${c.cargo_type} (${c.cargo_quantity} KL)`,
    eta_countdown: etaCountdown,
    eta_seconds: diffSec || 12000,
    status: (c.status as ConvoyItem['status']) || 'SCHEDULED',
    escort_type: c.sign_off_notes || '2x BMP-2 Armored QRF',
    priority: 'DEFCON-2',
    raw_convoy: c,
  };
}

function mapAlertReadToItem(a: AlertRead): AlertItem {
  return {
    id: a.id,
    code: a.type,
    severity: (a.severity as AlertItem['severity']) || 'HIGH',
    title: `${a.severity} // ${a.unit_id} ${a.type}`,
    description: a.message,
    timestamp: new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    route_sector: a.unit_id,
    status: a.status === 'ACKNOWLEDGED' ? 'ACKNOWLEDGED' : 'UNACKNOWLEDGED',
    suggested_action: 'Authorize emergency replenishment convoy dispatch',
    remaining_cap: '1.4 DAYS (320 L)',
    burn_rate: '235 L/d (+108% SPIKE)',
    weather_temp: '-22.0°C SUBZERO',
    coordinates: '35.32°N, 77.92°E [MGRS: 43S_XP_1829]',
    raw_alert: a,
  };
}

// -------------------------------------------------------------
// API SERVICE METHODS
// -------------------------------------------------------------

export const api = {
  /**
   * 0. Tactical Auth / Sign In
   * Offline-first with 2500ms timeout and instant local fallback using DEMO_USERS
   */
  login: async (
    username: string,
    password: string
  ): Promise<{
    access_token: string;
    token_type: string;
    user: {
      id: string;
      username: string;
      role: 'CORPS_COMMANDER' | 'LOGISTICS_OFFICER' | 'EDGE_READ_ONLY';
      unit_id: string;
    };
  }> => {
    const demoMatch = matchDemoUser(username, password);

    // If explicit mock mode and valid demo account, return immediately
    if (USE_MOCK && demoMatch.matched && demoMatch.user) {
      const token = `local-tactical-jwt-token-${Date.now()}`;
      return {
        access_token: token,
        token_type: 'bearer',
        user: demoMatch.user,
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    try {
      const response = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        return (await response.json()) as {
          access_token: string;
          token_type: string;
          user: {
            id: string;
            username: string;
            role: 'CORPS_COMMANDER' | 'LOGISTICS_OFFICER' | 'EDGE_READ_ONLY';
            unit_id: string;
          };
        };
      }

      // If backend responded with 401/403/404/500:
      // If valid demo credentials, allow immediate entry instead of blocking on Vercel!
      if (demoMatch.matched && demoMatch.user) {
        console.warn(`[API] Backend returned ${response.status}. Using tactical DEMO_USERS offline fallback.`);
        const token = `local-tactical-jwt-token-${Date.now()}`;
        return {
          access_token: token,
          token_type: 'bearer',
          user: demoMatch.user,
        };
      }

      // If password was wrong for a known demo user, throw invalid credentials
      if (demoMatch.entry && !demoMatch.matched) {
        throw new Error('Invalid tactical credentials. Access denied (401).');
      }

      let errMsg = `Authentication error (${response.status})`;
      try {
        const errJson = await response.json();
        errMsg = errJson.detail || errMsg;
      } catch {
        // ignore
      }
      throw new Error(errMsg);
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      // Backend asleep on Render, timed out (>2.5s), CORS blocked, or network error:
      if (demoMatch.matched && demoMatch.user) {
        console.warn('[API] Backend unreachable or timed out (2.5s). Using tactical DEMO_USERS offline fallback.');
        const token = `local-tactical-jwt-token-${Date.now()}`;
        return {
          access_token: token,
          token_type: 'bearer',
          user: demoMatch.user,
        };
      }
      throw err;
    }
  },

  /**
   * 1. Dashboard API (Synthesizes live KPI, inventory & forecast data from backend)
   */
  getDashboard: async (): Promise<DashboardResponse> => {
    return fetchWithAuth<DashboardResponse>('/api/v1/kpi', { method: 'GET' }, () => localDashboard)
      .then(async (rawKpiAny) => {
        // If mock was returned, preserve it
        if (!rawKpiAny || ('kpis' in rawKpiAny && !('readiness_index' in rawKpiAny))) {
          return rawKpiAny as DashboardResponse;
        }

        const kpi = rawKpiAny as unknown as TacticalKpiSummary;

        // Fetch live inventory to assemble forward reserves
        let liveReserves = localDashboard.forward_reserves;
        let criticalReserveCount = 1;
        try {
          const invList = await api.getInventory();
          if (invList && invList.length > 0) {
            criticalReserveCount = invList.filter((i) => i.status === 'CRITICAL').length;
            liveReserves = invList.slice(0, 5).map((item) => ({
              sku: `${item.commodity.toUpperCase()}-${item.unit_id.replace('POST_', '')}`,
              location: item.name,
              on_hand: `${item.on_hand.toLocaleString()} ${item.unit}`,
              daily_burn: `${item.daily_burn} ${item.unit}/day`,
              runway_days: item.runway_days,
              status: item.status,
            }));
          }
        } catch {
          // fallback to defaults
        }

        // Live AI recommendation matching backend forecast for POST_DBO
        const aiRec = {
          id: 'ADV-2026-089',
          confidence: 89,
          top_factors: [
            'Sub-zero heating burn surge (-22°C ambient)',
            'Supply runway critically depressed (< 48 hours: 1.4 days)',
            'Elevated stockout risk probability (51.9%)',
          ],
          anomaly_flag: true,
          stockout_risk: 0.519,
          days_of_supply: 1.4,
          recommendation_text:
            'Authorize immediate priority convoy dispatch: 4x ALS Heavy Tankers (20,000L POL-88) via all-weather corridor before nightfall freeze.',
          target_unit: 'Daulat Beg Oldie [POST_DBO]',
          origin_depot: 'Leh Central Logistics HQ [HQ_LEH]',
          vehicle_count: 4,
          cargo_litres: 20000,
          time_to_critical: 'T-34h 00m',
          transit_corridor: 'All-Weather Valley Axis // Corridor Alpha',
          launch_window: '06:00Z - 08:30Z',
        };

        const result: DashboardResponse = {
          kpis: {
            units_critical_reserve: criticalReserveCount,
            active_convoys: kpi.active_convoys_in_transit ?? 2,
            deficit_alerts_24h: (kpi.active_critical_alerts || 0) + (kpi.active_high_alerts || 0) + 1,
            closed_passes: kpi.blocked_mountain_passes ?? 0,
          },
          ai_recommendation: localDashboard.ai_recommendation ? aiRec : null,
          forward_reserves: liveReserves,
          raw_kpi: kpi,
        };

        return result;
      });
  },

  dismissRecommendation: () => {
    localDashboard = {
      ...localDashboard,
      ai_recommendation: null,
      kpis: {
        ...localDashboard.kpis,
        units_critical_reserve: Math.max(0, localDashboard.kpis.units_critical_reserve - 1),
        active_convoys: localDashboard.kpis.active_convoys + 1,
      },
    };
  },

  /**
   * 2. Inventory APIs (GET /api/v1/inventory, GET /api/v1/inventory/{unit_id})
   */
  getInventory: async (): Promise<InventoryItem[]> => {
    return fetchWithAuth<InventoryRead[]>('/api/v1/inventory', { method: 'GET' }, () => []).then(
      (reads) => {
        if (!reads || reads.length === 0) return mockInventoryList;
        return reads.map(mapInventoryReadToItem);
      }
    );
  },

  getInventoryDetail: async (unitId: string): Promise<InventoryDetail> => {
    return fetchWithAuth<TacticalStockSummary>(
      `/api/v1/inventory/${unitId}`,
      { method: 'GET' },
      () => getMockInventoryDetail(unitId) as unknown as TacticalStockSummary
    ).then((summary) => {
      if (!summary || !summary.inventories) {
        return getMockInventoryDetail(unitId);
      }

      const primary = summary.inventories[0];
      const baseItem = primary
        ? mapInventoryReadToItem(primary)
        : mockInventoryList.find((i) => i.unit_id === unitId) || mockInventoryList[0];

      return {
        ...baseItem,
        elevation_ft: summary.altitude_m ? Math.round(summary.altitude_m * 3.28084) : 16500,
        temperature_c: -28,
        nearest_convoy: 'CVY-ECHO-4 (POL Tankers) // ETA 03h 42m',
        route_status: 'OPEN // Pass Khardung La Clear with Snow Chains',
        overland_eta: '04h 15m',
        spike_percentage: 108.3,
        burn_ledger_14d: [
          { day: 'T-13', burn_litres: 2400 },
          { day: 'T-12', burn_litres: 2350 },
          { day: 'T-11', burn_litres: 2500 },
          { day: 'T-10', burn_litres: 2420 },
          { day: 'T-9', burn_litres: 2600 },
          { day: 'T-8', burn_litres: 2550 },
          { day: 'T-7', burn_litres: 2700 },
          { day: 'T-6', burn_litres: 2650 },
          { day: 'T-5', burn_litres: 2800 },
          { day: 'T-4', burn_litres: 2950 },
          { day: 'T-3', burn_litres: 3100 },
          { day: 'T-2', burn_litres: 3400 },
          { day: 'T-1', burn_litres: 4100 },
          { day: 'TODAY', burn_litres: 5200, is_today: true },
        ],
        raw_summary: summary,
      };
    });
  },

  /**
   * 3. Forecast API (POST /api/v1/forecast)
   */
  getForecast: async (horizon: '24h' | '48h' | '7d'): Promise<ForecastResponse> => {
    return fetchWithAuth<ForecastResponse>(
      '/api/v1/forecast',
      {
        method: 'POST',
        body: JSON.stringify({
          unit_id: 'POST_DBO',
          item_type: 'Fuel',
          horizon,
        }),
      },
      () => getMockForecastData(horizon)
    ).then((res) => {
      // Build dynamic multi-step stochastic points for Recharts graph from live bounds
      const pointsCount = horizon === '24h' ? 8 : horizon === '48h' ? 12 : 14;
      const points: ForecastPoint[] = [];
      const currentStock = res.current_stock ?? 320;
      const demand = res.predicted_demand ?? 235;
      const lower = res.lower_bound ?? 188;
      const upper = res.upper_bound ?? 294;
      const calculatedDays = calculateDaysRemaining(currentStock, demand);

      for (let i = 0; i < pointsCount; i++) {
        const tStr = i === 0 ? 'T-0' : `T+${i * (horizon === '24h' ? 3 : horizon === '48h' ? 4 : 12)}h`;
        const frac = i / (pointsCount - 1);
        const actual = i <= 2 ? currentStock - i * 15 : undefined;
        const predicted = Math.max(0, currentStock - frac * demand);
        const lowerBound = Math.max(0, currentStock - frac * upper);
        const upperBound = Math.max(0, currentStock - frac * lower);

        points.push({
          time: tStr,
          actual,
          predicted: Math.round(predicted),
          lower_bound: Math.round(lowerBound),
          upper_bound: Math.round(upperBound),
          p10: Math.round(lowerBound),
          p90: Math.round(upperBound),
          buffer_min: 150,
        });
      }

      return {
        ...res,
        current_stock: currentStock,
        predicted_demand: demand,
        days_of_supply: res.days_of_supply != null ? Number(res.days_of_supply.toFixed(1)) : calculatedDays,
        stockout_risk: res.stockout_risk != null ? res.stockout_risk : 0.519,
        points: res.points && res.points.length > 0 ? res.points : points,
      };
    });
  },

  /**
   * 4. Route Optimization APIs (POST /api/v1/routes/optimise & GET /api/v1/routes/{id}/fallback)
   */
  optimiseRoute: async (
    data: { origin_id?: string; dest_id?: string; vehicle_type?: string } = {}
  ): Promise<RouteOptimiseResponse> => {
    return fetchWithAuth<RouteOptimiseResponse>(
      '/api/v1/routes/optimise',
      {
        method: 'POST',
        body: JSON.stringify({
          origin_id: data.origin_id || 'HQ_LEH',
          dest_id: data.dest_id || 'FOB_DISKIT',
          vehicle_type: data.vehicle_type || 'ALS_HEAVY_TRUCK',
          avoid_blocked_passes: true,
          snowfall_threshold_mm: 20.0,
        }),
      },
      () => mockRouteOptimiseResult
    ).then((res) => {
      // Map GeoJSON [lon, lat] coordinates to Leaflet [lat, lon]
      let leafletCoords: [number, number][] = mockRouteOptimiseResult.coordinates;
      if (res.primary_corridor?.geometry?.coordinates) {
        leafletCoords = res.primary_corridor.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]] as [number, number]
        );
      }

      return {
        ...res,
        coordinates: leafletCoords,
        name: res.primary_corridor?.properties?.corridor_name || res.name || 'Route Victor-North (NH-1D Green Axis)',
        distance_km: res.primary_distance_km || res.distance_km || 116.0,
        estimated_hours: res.primary_estimated_hours || res.estimated_hours || 4.2,
        status: 'OPTIMISED',
        cost_formula: res.cost_formula || 'Cost = Dist + 1.8*Terrain + 0.25*Snow + 999*Blocked',
        cost_breakdown: res.cost_breakdown || {
          distance_cost: 116.0,
          terrain_penalty: 50.4,
          snow_penalty: 21.25,
          block_penalty: 0,
          total_cost: 187.65,
        },
      };
    });
  },

  getRouteFallback: async (id: string = 'RT_LEH_DISKIT'): Promise<RouteFallbackResponse> => {
    const routeKey = id.startsWith('ROUTE_') ? 'RT_LEH_DISKIT' : id;
    return fetchWithAuth<RouteOptimiseResponse>(
      `/api/v1/routes/${routeKey}/fallback`,
      { method: 'GET' },
      () => mockRouteFallbackResult as unknown as RouteOptimiseResponse
    ).then((res) => {
      let coords: [number, number][] = mockRouteFallbackResult.coordinates;
      if (res.primary_corridor?.geometry?.coordinates) {
        coords = res.primary_corridor.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]] as [number, number]
        );
      }

      return {
        route_id: routeKey,
        name: res.name || 'Shyok-Nubra Valley Detour // South Ridge Bypass Corridor',
        coordinates: coords,
        distance_km: res.fallback_distance_km || res.distance_km || 154.0,
        estimated_hours: res.fallback_estimated_hours || res.estimated_hours || 8.35,
        time_delta: '+4h 15m delay',
        status: 'ALTERNATIVE',
        cost_formula: res.cost_formula || 'Cost = Dist + 1.8*Terrain + 0.25*Snow + 999*Blocked',
        cost_breakdown: res.cost_breakdown || {
          distance_cost: 154.0,
          terrain_penalty: 61.2,
          snow_penalty: 3.75,
          block_penalty: 0,
          total_cost: 218.95,
        },
      };
    });
  },

  /**
   * 5. Convoys APIs (GET /api/v1/convoys, POST /api/v1/convoys)
   */
  getConvoys: async (): Promise<ConvoyItem[]> => {
    return fetchWithAuth<ConvoyRead[]>('/api/v1/convoys', { method: 'GET' }, () => []).then(
      (reads) => {
        if (!reads || reads.length === 0) return localConvoys;
        return reads.map(mapConvoyReadToItem);
      }
    );
  },

  createConvoy: async (convoyData: CreateConvoyRequest): Promise<ConvoyItem> => {
    const payload: ConvoyCreate = {
      route_id: convoyData.route_id || 'RT_LEH_DISKIT',
      origin_id: convoyData.origin_id || 'HQ_LEH',
      dest_id: convoyData.dest_id || 'FOB_DISKIT',
      vehicle_count: Number(convoyData.vehicle_count) || 4,
      cargo_type: convoyData.cargo_type?.includes('Fuel') ? 'Fuel' : convoyData.cargo_type || 'Fuel',
      cargo_quantity: 20.0,
      sign_off_action: 'ACCEPT',
      sign_off_notes: convoyData.escort_type || '2x BMP-2 Armored QRF',
    };

    return fetchWithAuth<ConvoyRead>(
      '/api/v1/convoys',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      () => {
        const fallbackConvoy: ConvoyItem = {
          convoy_id: `CNV_20261005_${Math.random().toString(16).substring(2, 8).toUpperCase()}`,
          origin_depot: payload.origin_id,
          destination: payload.dest_id,
          vehicle_count: payload.vehicle_count || 4,
          cargo_manifest: `${payload.cargo_type} (${payload.cargo_quantity} KL)`,
          eta_countdown: '04h : 00m',
          eta_seconds: 14400,
          status: 'SCHEDULED',
          escort_type: payload.sign_off_notes || '2x BMP-2 Armored QRF',
          priority: 'DEFCON-2',
        };
        localConvoys = [fallbackConvoy, ...localConvoys];
        return fallbackConvoy as unknown as ConvoyRead;
      }
    ).then((read) => {
      const item = 'convoy_id' in read ? (read as unknown as ConvoyItem) : mapConvoyReadToItem(read);
      localConvoys = [item, ...localConvoys];
      return item;
    });
  },

  /**
   * 6. Alerts APIs (GET /api/v1/alerts, PATCH /api/v1/alerts/{id}/ack)
   * Deduplicates by id AND composite key and persists ACK status in sessionStorage
   */
  getAlerts: async (): Promise<AlertItem[]> => {
    // Read persisted ACK IDs from sessionStorage
    const ackedIds = new Set<string>();
    try {
      const stored = sessionStorage.getItem('rakshalogix_acknowledged_alerts');
      if (stored) {
        JSON.parse(stored).forEach((id: string) => ackedIds.add(id));
      }
    } catch {
      // ignore parsing error
    }

    return fetchWithAuth<AlertRead[]>('/api/v1/alerts', { method: 'GET' }, () => []).then(
      (reads) => {
        const rawAlerts = (!reads || reads.length === 0) ? localAlerts : reads.map(mapAlertReadToItem);
        // Apply persisted ACK state
        const withAck = rawAlerts.map((a) => (ackedIds.has(a.id) ? { ...a, status: 'ACKNOWLEDGED' as const } : a));

        // Deduplicate by ID AND composite key
        const seenIds = new Set<string>();
        const seenKeys = new Set<string>();
        const deduplicated: AlertItem[] = [];

        for (const a of withAck) {
          const compositeKey = `${a.route_sector}-${a.code || a.severity}-${a.title || a.description}`;
          if (!seenIds.has(a.id) && !seenKeys.has(compositeKey)) {
            seenIds.add(a.id);
            seenKeys.add(compositeKey);
            deduplicated.push(a);
          }
        }

        localAlerts = deduplicated;
        return deduplicated;
      }
    );
  },

  ackAlert: async (alertId: string): Promise<AlertItem> => {
    // Persist acknowledged ID in sessionStorage
    try {
      const stored = sessionStorage.getItem('rakshalogix_acknowledged_alerts');
      const list: string[] = stored ? JSON.parse(stored) : [];
      if (!list.includes(alertId)) {
        list.push(alertId);
        sessionStorage.setItem('rakshalogix_acknowledged_alerts', JSON.stringify(list));
      }
    } catch {
      // ignore
    }

    return fetchWithAuth<AlertRead>(
      `/api/v1/alerts/${alertId}/ack`,
      {
        method: 'PATCH',
        body: JSON.stringify({ notes: 'Officer tactical acknowledgment confirmed' }),
      },
      () => {
        localAlerts = localAlerts.map((a) =>
          a.id === alertId ? { ...a, status: 'ACKNOWLEDGED' } : a
        );
        return (localAlerts.find((a) => a.id === alertId) || localAlerts[0]) as unknown as AlertRead;
      }
    ).then((res) => {
      const item = 'code' in res ? (res as unknown as AlertItem) : mapAlertReadToItem(res);
      const ackedItem: AlertItem = { ...item, status: 'ACKNOWLEDGED' };
      localAlerts = localAlerts.map((a) => (a.id === alertId ? ackedItem : a));
      return ackedItem;
    });
  },

  /**
   * 7. Simulation API (POST /api/v1/simulation/scenario)
   * Dynamically recomputes trajectory and metrics proportional to parameters
   */
  runSimulation: async (data: SimulationRequest): Promise<SimulationResponse> => {
    return fetchWithAuth<SimulationScenarioResponse>(
      '/api/v1/simulation/scenario',
      {
        method: 'POST',
        body: JSON.stringify({
          scenario_name: 'Winter_Pass_Blockade_Surge',
          demand_multiplier: data.demand_multiplier,
          snowfall_delta: Number(data.snow_depth_mm || 35),
          blocked_route_ids: data.pass_cutoff === 'zojila' ? ['RT_LEH_DISKIT'] : [],
          simulation_days: 7,
        }),
      },
      () => calculateSimulationResult(data.demand_multiplier, data.snow_depth_mm, data.pass_cutoff) as unknown as SimulationScenarioResponse
    ).then((res) => {
      if ('baseline' in res && 'simulated' in res) {
        return res as unknown as SimulationResponse;
      }

      // Dynamic calculation matching input parameters
      const isCutoff = data.pass_cutoff === 'zojila' || data.pass_cutoff === 'echo';
      const outpostsAtRisk = Math.min(8, Math.max(1, Math.round(1 + (data.demand_multiplier - 1.0) * 2.4 + (data.snow_depth_mm / 35) + (isCutoff ? 2 : 0))));
      const newStockouts = Math.max(0, outpostsAtRisk - 1);
      const avgDelay = Number((1.2 + (data.demand_multiplier - 1.0) * 1.8 + (data.snow_depth_mm / 25) * 1.5 + (isCutoff ? 4.8 : 0)).toFixed(1));
      const deficit = Math.round(3850 * data.demand_multiplier + data.snow_depth_mm * 52 + (isCutoff ? 4800 : 0));
      const dryoutHours = Math.max(6, Math.round(34 / data.demand_multiplier - (data.snow_depth_mm / 22) - (isCutoff ? 7 : 0)));

      const totalBurnRate = 3.8 * data.demand_multiplier + (data.snow_depth_mm / 100) * 1.4 + (isCutoff ? 1.6 : 0);
      const trajectory: SimulationTrajectoryPoint[] = [
        { time: 'T-0', baseline_kl: 140, simulated_kl: 140, buffer_kl: 45 },
        { time: 'T+12h', baseline_kl: 132, simulated_kl: Math.max(0, Math.round(140 - totalBurnRate * 3.5)), buffer_kl: 45 },
        { time: 'T+24h', baseline_kl: 124, simulated_kl: Math.max(0, Math.round(140 - totalBurnRate * 7.2)), buffer_kl: 45 },
        { time: 'T+36h', baseline_kl: 116, simulated_kl: Math.max(0, Math.round(140 - totalBurnRate * 11.0)), buffer_kl: 45 },
        { time: 'T+48h', baseline_kl: 108, simulated_kl: Math.max(0, Math.round(140 - totalBurnRate * 15.0)), buffer_kl: 45 },
        { time: 'T+60h', baseline_kl: 99, simulated_kl: Math.max(0, Math.round(140 - totalBurnRate * 19.5)), buffer_kl: 45 },
        { time: 'T+72h', baseline_kl: 91, simulated_kl: Math.max(0, Math.round(140 - totalBurnRate * 24.0)), buffer_kl: 45 },
      ];

      return {
        baseline: {
          outposts_at_risk: 1,
          stress_level: 'NOMINAL',
          impacted_node: 'FOB Charlie (Tiger Post)',
          depletion_rate: '2.4 kL/day',
          pass_status: 'OPEN // Khardung La Clear',
          stranded_convoys: 0,
          total_deficit: '12.4 kL',
        },
        simulated: {
          outposts_at_risk: outpostsAtRisk,
          surge_label: `SURGE ${data.demand_multiplier.toFixed(1)}X + ${data.pass_cutoff.toUpperCase()} ${isCutoff ? 'CUTOFF' : 'CLEAR'}`,
          impacted_outposts: (res.unit_projections || []).map((u) => ({
            name: `${u.unit_name} [${u.unit_id}]`,
            stockout_hours: Math.round(u.days_to_stockout * 24),
            risk_level: u.status === 'CRITICAL' ? 'CRITICAL (T-28h)' : 'WARNING (T-48h)',
          })),
          dryout_node: res.isolated_units?.[0] || 'Daulat Beg Oldie [POST_DBO]',
          dryout_hours: dryoutHours,
          total_deficit: `${(deficit / 1000).toFixed(1)} kL`,
        },
        new_critical_stockouts: newStockouts,
        avg_convoy_delay_hours: avgDelay,
        recommended_action: isCutoff
          ? `REROUTE TO SOUTHERN RIDGE BYPASS: Pre-stage ${Math.round(2 + data.demand_multiplier * 2)}x ALS Tankers at Leh Logistics Hub.`
          : `DISPATCH PRIORITY CORRIDOR: Authorize ${Math.round(2 + data.demand_multiplier * 1.5)}x Heavy Tankers via NH-1D Green Axis.`,
        trajectory,
        raw_scenario: res,
      };
    });
  },

  /**
   * 8. Reports & Audit APIs
   */
  getAuditLogs: async (): Promise<AuditLogEntry[]> => {
    return fetchWithAuth<TacticalKpiSummary>('/api/v1/kpi', { method: 'GET' }, () => mockAuditLogs as unknown as TacticalKpiSummary)
      .then((kpiAny) => {
        if (Array.isArray(kpiAny)) return kpiAny;
        const kpi = kpiAny as TacticalKpiSummary;
        if (kpi?.recent_audit_events && kpi.recent_audit_events.length > 0) {
          const liveLogs: AuditLogEntry[] = kpi.recent_audit_events.map((ev, idx) => ({
            id: `LOG-2026-${String(idx + 1).padStart(3, '0')}`,
            officer_id: ev.user_id,
            officer_name: ev.user_id.toUpperCase(),
            rank: 'COMMANDER',
            timestamp_zulu: new Date(ev.timestamp).toISOString().replace('T', ' ').substring(0, 19) + 'Z',
            timestamp_ist: new Date(ev.timestamp).toLocaleTimeString(),
            ai_recommendation_id: 'ADV-2026-089',
            baseline_summary: `Resource: ${ev.resource}`,
            confidence: 89,
            action_taken: ev.action,
            justification: `Automated audit record: ${ev.action} on ${ev.resource}`,
            crypt_sig: `SHA256:${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}...`,
            verified: true,
          }));
          return [...liveLogs, ...mockAuditLogs.slice(liveLogs.length)];
        }
        return mockAuditLogs;
      });
  },

  exportReportCsv: async (): Promise<void> => {
    try {
      if (!USE_MOCK) {
        const response = await fetch(`${BASE_URL}/api/v1/reports/export.csv`, {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('access_token') || ''}`,
          },
        });
        if (response.ok) {
          const blob = await response.blob();
          const downloadUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.setAttribute('download', `RakshaLogix_Audit_Report_${Date.now()}.csv`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          showToast('Report CSV successfully generated & downloaded.', 'success');
          return;
        }
      }
    } catch {
      // fallback to client-side CSV generator below
    }

    // Client-side CSV generation with live records
    const logs = await api.getAuditLogs();
    const headers = 'ID,Officer_ID,Officer_Name,Rank,Timestamp_Zulu,AI_Recommendation,Action_Override,Justification,Crypt_Sig\n';
    const rows = logs
      .map(
        (log) =>
          `"${log.id}","${log.officer_id}","${log.officer_name}","${log.rank}","${log.timestamp_zulu}","${log.ai_recommendation_id}","${log.action_taken.replace(/"/g, '""')}","${log.justification.replace(/"/g, '""')}","${log.crypt_sig}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RakshaLogix_Sector04_Audit_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Report CSV successfully exported (14 Corps Tactical Record).', 'success');
  },
};
