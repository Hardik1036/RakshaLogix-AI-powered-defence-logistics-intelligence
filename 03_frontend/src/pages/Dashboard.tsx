import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { DashboardResponse, ForwardReserveItem } from '../types/api';
import { 
  AlertTriangle, 
  Truck, 
  Radio, 
  Snowflake, 
  Bot, 
  Flame, 
  Compass, 
  BatteryCharging, 
  CheckCheck, 
  Edit3, 
  ShieldAlert, 
  Loader2, 
  X,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { ServerLoader } from '../components/ServerLoader';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { useTheme } from '../context/ThemeContext';
import { formatProbability } from '../api';

const createMiniPin = (color: string, label: string, isBlocked: boolean = false) => {
  return L.divIcon({
    className: 'custom-mini-tactical-pin',
    html: `
      <div style="display:flex; flex-direction:column; align-items:center; transform: translate(-50%, -100%);">
        <div style="background-color:${color}; width:13px; height:13px; border-radius:2px; border:1.5px solid #fff; box-shadow:0 0 8px ${color}; display:flex; align-items:center; justify-content:center;">
          ${isBlocked ? '<span style="color:#fff; font-size:10px; font-weight:bold; line-height:1;">✕</span>' : '<div style="width:3px; height:3px; background:#fff; border-radius:1px;"></div>'}
        </div>
        <div style="margin-top:2px; background:rgba(2,6,23,0.9); border:1px solid ${color}; color:#fff; font-family:'JetBrains Mono',monospace; font-size:8px; font-weight:bold; padding:1px 3px; border-radius:2px; white-space:nowrap;">
          ${label}
        </div>
      </div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

const miniMapNodes = [
  { id: 'KARGIL', name: 'Kargil Depot [UNIT_02]', pos: [34.55, 76.13] as [number, number], color: '#10b981', details: 'Forward Depot // 94,000L' },
  { id: 'FOB_CHARLIE', name: 'FOB Charlie [UNIT_03]', pos: [34.62, 76.32] as [number, number], color: '#ef4444', details: 'CRITICAL // Fuel Exhaustion T-34h' },
  { id: 'ZOJI_LA', name: 'Zoji La Pass [CLOSED]', pos: [34.28, 75.48] as [number, number], color: '#ef4444', details: 'BLOCKED // Avalanche 142cm Pack', isBlocked: true },
  { id: 'LEH_HQ', name: 'Leh Central Hub', pos: [34.16, 77.58] as [number, number], color: '#10b981', details: 'HQ 14 Corps Logistics Hub' },
];

const primaryCoords: [number, number][] = [
  [34.15, 74.80],
  [34.30, 75.35],
  [34.42, 75.75],
  [34.55, 76.13],
  [34.35, 76.80],
  [34.16, 77.58],
];

const fallbackCoords: [number, number][] = [
  [34.15, 74.80],
  [33.95, 75.20],
  [34.05, 75.65],
  [34.45, 76.10],
  [34.35, 76.80],
  [34.16, 77.58],
];

export const Dashboard: React.FC = () => {
  const { isReadOnly } = useAuth();
  const { addToast } = useToast();
  const { theme } = useTheme();

  const tileUrl =
    theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accepting, setAccepting] = useState(false);

  // Modify Recommendation Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [overrideVehicles, setOverrideVehicles] = useState(4);
  const [overridePass, setOverridePass] = useState('South Ridge Bypass (Pass Echo)');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setRefreshing(true);
      const res = await api.getDashboard();
      setData(res);
    } catch {
      addToast('Failed to retrieve dashboard telemetry feed', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAcceptRecommendation = async () => {
    if (isReadOnly) return;
    if (!data?.ai_recommendation) return;

    try {
      setAccepting(true);
      await api.createConvoy({
        origin_depot: data.ai_recommendation.origin_depot,
        destination: data.ai_recommendation.target_unit,
        vehicle_count: overrideVehicles,
        cargo_type: 'POL-88 Arctic Fuel',
        manifest_quantity: `${overrideVehicles * 5000} Litres`,
        escort_type: '2x BMP-2 Armored QRF',
        priority_level: 'DEFCON-2',
        bypass_pass: overridePass,
      });

      api.dismissRecommendation();
      setData((prev) =>
        prev
          ? {
              ...prev,
              ai_recommendation: null,
              kpis: {
                ...prev.kpis,
                units_critical_reserve: Math.max(0, prev.kpis.units_critical_reserve - 1),
                active_convoys: prev.kpis.active_convoys + 1,
              },
            }
          : null
      );

      addToast(
        `Dispatch scheduled: ${overrideVehicles}x Tankers deployed to FOB Charlie via ${overridePass}`,
        'success'
      );
    } catch {
      addToast('Dispatch failed. Command connection interdicted.', 'error');
    } finally {
      setAccepting(false);
    }
  };

  const handleSaveOverride = () => {
    setIsModalOpen(false);
    addToast(`Override parameters updated: ${overrideVehicles} Tankers via ${overridePass}`, 'info');
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <ServerLoader message="Connecting to tactical server feed... (may take up to 60s on first request)" />
      </div>
    );
  }

  const kpis = data?.kpis || {
    units_critical_reserve: 4,
    active_convoys: 14,
    deficit_alerts_24h: 7,
    closed_passes: 2,
  };

  const advisory = data?.ai_recommendation;

  // Filter top 3 critical stockout units for Tier 3 watchlist
  const top3Watchlist: ForwardReserveItem[] = data?.forward_reserves
    ? [...data.forward_reserves].sort((a, b) => a.runway_days - b.runway_days).slice(0, 3)
    : [
        { sku: 'POL-88 Arctic Diesel', location: 'FOB Charlie (Tiger Post)', on_hand: '4,200 L', daily_burn: '1,250 L/d', runway_days: 1.4, status: 'CRITICAL' },
        { sku: 'Medical Oxygen Cyl.', location: 'Siachen Base Camp', on_hand: '18 Cyl', daily_burn: '6 Cyl/d', runway_days: 2.1, status: 'CRITICAL' },
        { sku: '155mm HE Bofors Shells', location: 'Dras High-Ridge CP', on_hand: '142 Rds', daily_burn: '48 Rds/d', runway_days: 2.9, status: 'CRITICAL' },
      ];

  return (
    <div className="space-y-6">
      {/* Top HUD Telemetry Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-200/80 dark:bg-slate-800/80 text-slate-800 dark:text-cyan-400 font-mono text-[11px] font-bold uppercase tracking-wider border border-slate-300 dark:border-slate-700/80">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            SECTOR-04 // LIVE TELEMETRY
          </span>
          <span className="text-slate-500 font-mono text-[11px] tabular-nums">GRID 34°32'N 76°08'E</span>
          <span className="hidden md:inline text-slate-400 dark:text-slate-600 font-mono">•</span>
          <span className="hidden md:inline text-slate-500 font-mono text-[11px]">DEFCON-2</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadDashboard}
            disabled={refreshing}
            className="px-3 py-1.5 rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono text-xs font-semibold border border-slate-300 dark:border-slate-700/80 transition-all flex items-center gap-1.5"
            title="Refresh Realtime Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-cyan-500' : ''}`} />
            <span>{refreshing ? 'POLLING...' : 'REFRESH DATA'}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          TIER 1: COMPACT KPI STRIP (4 Cards in a single row, grid-cols-2 lg:grid-cols-4)
          Muted borders, status color on left border-l-4 only
          ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Units < 48h Reserve (Rose Accent) */}
        <div className="p-4 rounded-md bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 border-l-4 border-l-rose-500 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              Units &lt; 48h Reserve
            </span>
            <span className="px-1.5 py-0.5 rounded font-mono text-[9px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
              CRITICAL
            </span>
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="font-mono text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
              {kpis.units_critical_reserve.toString().padStart(2, '0')}
            </span>
            <span className="font-mono text-xs text-rose-500 font-medium">
              +1 since 0600Z
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between font-mono text-[10px] text-slate-500 dark:text-slate-400">
            <span>Threat: {kpis.units_critical_reserve} / 18 FOBs</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          </div>
        </div>

        {/* KPI 2: Active Convoys (Emerald Accent) */}
        <div className="p-4 rounded-md bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 border-l-4 border-l-emerald-500 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              Active Convoys
            </span>
            <span className="px-1.5 py-0.5 rounded font-mono text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              NOMINAL
            </span>
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="font-mono text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
              {kpis.active_convoys.toString().padStart(2, '0')}
            </span>
            <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              58 Vehicles
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between font-mono text-[10px] text-slate-500 dark:text-slate-400">
            <span>12 En Route, 2 Delayed</span>
            <Truck className="w-3.5 h-3.5 text-emerald-500" />
          </div>
        </div>

        {/* KPI 3: 24h Deficit Alerts (Amber Accent) */}
        <div className="p-4 rounded-md bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 border-l-4 border-l-amber-500 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              24h Deficit Alerts
            </span>
            <span className="px-1.5 py-0.5 rounded font-mono text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              PENDING
            </span>
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="font-mono text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
              {kpis.deficit_alerts_24h.toString().padStart(2, '0')}
            </span>
            <span className="font-mono text-xs text-amber-600 dark:text-amber-400 font-medium">
              3 High-Altitude
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between font-mono text-[10px] text-slate-500 dark:text-slate-400">
            <span>Primary: Fuel &amp; O2</span>
            <Radio className="w-3.5 h-3.5 text-amber-500" />
          </div>
        </div>

        {/* KPI 4: Closed Passes (Cyan Accent) */}
        <div className="p-4 rounded-md bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 border-l-4 border-l-cyan-500 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              Closed Passes
            </span>
            <span className="px-1.5 py-0.5 rounded font-mono text-[9px] font-bold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
              INTERDICTED
            </span>
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="font-mono text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
              {kpis.closed_passes.toString().padStart(2, '0')}
            </span>
            <span className="font-mono text-xs text-cyan-600 dark:text-cyan-400 font-medium">
              Zoji La &amp; Khardung
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between font-mono text-[10px] text-slate-500 dark:text-slate-400">
            <span>Alt Corridor Active</span>
            <Snowflake className="w-3.5 h-3.5 text-cyan-500" />
          </div>
        </div>
      </div>

      {/* =========================================================================
          TIER 2: CENTERPIECE HERO — HUMAN-IN-THE-LOOP AI ADVISORY CARD
          Clear focal point, generous whitespace (p-6), max 3 causal factor pills
          ========================================================================= */}
      {advisory ? (
        <div className="p-6 rounded-lg bg-white dark:bg-slate-900/80 border-2 border-rose-500/50 dark:border-rose-500/40 shadow-lg relative overflow-hidden transition-all">
          {/* Top Status Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-600 text-white font-mono text-[10px] font-bold tracking-wider">
                  <Bot className="w-3.5 h-3.5" />
                  CRITICAL AI ADVISORY
                </span>
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                  ID: <strong className="text-slate-800 dark:text-slate-200">{advisory.id}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] border border-slate-200 dark:border-slate-700">
                  CONFIDENCE: <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums">{advisory.confidence}%</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-300 font-mono text-[11px] font-bold border border-rose-500/40">
                  STOCKOUT RISK: <strong className="tabular-nums">{formatProbability(advisory.stockout_risk)}</strong>
                </span>
                <span
                  title="320 L current stock / 235 L/d daily burn = 1.4 days gross runway (1.1 days usable excluding 15% tactical reserve buffer)"
                  className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-mono text-[11px] font-bold border border-rose-300 dark:border-rose-800/60 cursor-help"
                >
                  RUNWAY: <span className="tabular-nums">{advisory.days_of_supply}d</span> ({advisory.time_to_critical})
                </span>
                {advisory.anomaly_flag && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 font-mono text-[11px] font-bold border border-amber-500/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                    Anomaly Flagged
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1">
                {advisory.recommendation_text}
              </h2>
              {/* p10 / p50 / p90 Uncertainty Bounds & Formula Reconciliation */}
              <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800 mt-2">
                <span className="font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Stochastic Demand Bounds:</span>
                <span>p10: <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums">1,600 L</strong></span>
                <span>•</span>
                <span>p50: <strong className="text-cyan-600 dark:text-cyan-400 tabular-nums">2,050 L</strong></span>
                <span>•</span>
                <span>p90: <strong className="text-rose-600 dark:text-rose-400 tabular-nums">2,500 L</strong></span>
                <span className="hidden sm:inline text-slate-400">•</span>
                <span className="hidden sm:inline text-slate-500 text-[10px]">
                  Depletion: 320 L / 235 L/d = 1.4d (1.1d usable excl. 15% reserve)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
              <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-950/70 rounded border border-slate-200 dark:border-slate-800 flex flex-col items-end">
                <span className="font-mono text-[9px] uppercase text-slate-500 dark:text-slate-400 font-bold">
                  Time-To-Critical
                </span>
                <span className="font-mono text-base font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                  {advisory.time_to_critical}
                </span>
              </div>
            </div>
          </div>

          {/* Center 3 Causal Factor Pills */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-5">
            {/* Pill 1: Consumption Surge */}
            <div className="p-3.5 rounded-md bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 flex items-start gap-3">
              <div className="p-2 rounded bg-rose-500/10 text-rose-500 shrink-0 mt-0.5">
                <Flame className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
                  Consumption Surge
                </div>
                <div className="font-bold text-xs text-slate-900 dark:text-slate-100 mt-0.5">
                  1,250 L/d (+101.6% Spike)
                </div>
                <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  -28°C cold snap • Genset duty cycle 94%
                </div>
              </div>
            </div>

            {/* Pill 2: Route Threat */}
            <div className="p-3.5 rounded-md bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 flex items-start gap-3">
              <div className="p-2 rounded bg-amber-500/10 text-amber-500 shrink-0 mt-0.5">
                <Snowflake className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
                  Route Threat
                </div>
                <div className="font-bold text-xs text-slate-900 dark:text-slate-100 mt-0.5">
                  Zoji La Closure in 22h
                </div>
                <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  Avalanche risk High • Bypass required
                </div>
              </div>
            </div>

            {/* Pill 3: Exhaustion Point */}
            <div className="p-3.5 rounded-md bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 flex items-start gap-3">
              <div className="p-2 rounded bg-rose-500/10 text-rose-500 shrink-0 mt-0.5">
                <BatteryCharging className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
                  Exhaustion Point
                </div>
                <div className="font-bold text-xs text-slate-900 dark:text-slate-100 mt-0.5">
                  Dry Tanks in 34 Hours ({formatProbability(advisory.stockout_risk)})
                </div>
                <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  Zero buffer • Radar blackout threat
                </div>
              </div>
            </div>
          </div>

          {/* Replenishment Route & Target Metadata */}
          <div className="p-3.5 rounded-md bg-slate-100/70 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 mb-5 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <span className="text-[10px] uppercase text-slate-500 dark:text-slate-400 block font-bold">
                  Recommended Corridor
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">
                  {overridePass}
                </span>
              </div>
              <div className="hidden sm:block h-6 w-px bg-slate-300 dark:bg-slate-700"></div>
              <div>
                <span className="text-[10px] uppercase text-slate-500 dark:text-slate-400 block font-bold">
                  Launch Window
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {advisory.launch_window}
                </span>
              </div>
              <div className="hidden sm:block h-6 w-px bg-slate-300 dark:bg-slate-700"></div>
              <div>
                <span className="text-[10px] uppercase text-slate-500 dark:text-slate-400 block font-bold">
                  Target Destination
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">
                  {advisory.target_unit} [UNIT_03]
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-600 dark:text-slate-400">
              Payload: <strong className="text-slate-900 dark:text-slate-200 tabular-nums">{overrideVehicles * 5000}L POL-88</strong> ({overrideVehicles} Tankers)
            </div>
          </div>

          {/* Action Footer: Clear, high signal-to-noise button controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 font-mono text-xs text-slate-600 dark:text-slate-400">
              <ShieldAlert className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span>Command authorization required [AUTH_ROLE: MAJ_LOGIX_HQ]</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Modify Recommendation (Slate Outline) */}
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 rounded-md border border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Modify Recommendation</span>
              </button>

              {/* Accept Recommendation (Emerald Primary) */}
              <button
                type="button"
                disabled={isReadOnly || accepting}
                onClick={handleAcceptRecommendation}
                title={isReadOnly ? 'Read-only role: command clearance required' : 'Dispatch convoy and authorize replenishment'}
                className={`px-5 py-2 rounded-md font-mono text-xs font-bold transition-all shadow-md flex items-center gap-2 ${
                  isReadOnly
                    ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 active:scale-95'
                }`}
              >
                {accepting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>AUTHORIZING DISPATCH...</span>
                  </>
                ) : (
                  <>
                    <CheckCheck className="w-4 h-4" />
                    <span>Accept Recommendation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-mono text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>AI Recommendation ADV-2026-089 authorized and added to Convoy Dispatch queue.</span>
          </div>
          <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
            [STATUS: DISPATCH COMMENCED]
          </span>
        </div>
      )}

      {/* =========================================================================
          TIER 3: 2-COLUMN SPLIT (7 cols Left / 5 cols Right)
          Left 7 cols: Mini-GIS Situational Viewport with link to full map
          Right 5 cols: Compact "Top 3 Critical Stockout Watchlist" table
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT 7 COLS: Mini-GIS Situational Viewport */}
        <div className="lg:col-span-7 rounded-md bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800/80">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <h3 className="font-mono text-xs uppercase font-bold tracking-wider text-slate-900 dark:text-white">
                  Mini-GIS Situational Viewport
                </h3>
              </div>
              <Link
                to="/map"
                className="font-mono text-xs text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300 font-semibold inline-flex items-center gap-1 transition-colors"
              >
                <span>Full Tactical Map</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Live Keyless CartoDB Mini-GIS Map */}
            <div className="relative w-full h-72 rounded border border-slate-200 dark:border-slate-800 overflow-hidden shadow-inner z-0">
              <MapContainer
                center={[34.55, 77.15]}
                zoom={7}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  url={tileUrl}
                />

                {/* Primary Route: Solid Emerald (#10b981) */}
                <Polyline
                  positions={primaryCoords}
                  pathOptions={{
                    color: '#10b981',
                    weight: 3.5,
                    opacity: 0.9,
                  }}
                />

                {/* Alternative Bypass Route: Dashed Amber (#f59e0b) */}
                <Polyline
                  positions={fallbackCoords}
                  pathOptions={{
                    color: '#f59e0b',
                    weight: 3,
                    dashArray: '6, 6',
                    opacity: 0.9,
                  }}
                />

                {/* Tactical Status Pins */}
                {miniMapNodes.map((node) => (
                  <Marker
                    key={node.id}
                    position={node.pos}
                    icon={createMiniPin(node.color, node.name, node.isBlocked)}
                  >
                    <Popup>
                      <div className="font-mono text-xs">
                        <strong className="text-emerald-700 dark:text-emerald-400">{node.name}</strong>
                        <div className="text-[10px] text-slate-600 dark:text-slate-300">{node.details}</div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            {/* Radar Legend */}
            <div className="grid grid-cols-3 gap-2 mt-3 font-mono text-[10px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-emerald-500"></span>
                <span>Primary Route</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t border-dashed border-amber-400"></span>
                <span>South Ridge Bypass</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-rose-500 font-bold">✕</span>
                <span>Pass Blocked</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between mt-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
            <span>TRACKED UNITS: <strong className="text-slate-800 dark:text-slate-200 tabular-nums">{kpis.active_convoys} CONVOYS</strong></span>
            <span>MET FORECAST: <strong className="text-rose-600 dark:text-rose-400 font-semibold">-28°C BLIZZARD</strong></span>
          </div>
        </div>

        {/* RIGHT 5 COLS: Compact "Top 3 Critical Stockout Watchlist" Table */}
        <div className="lg:col-span-5 rounded-md bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800/80">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <h3 className="font-mono text-xs uppercase font-bold tracking-wider text-slate-900 dark:text-white">
                  Top 3 Critical Stockout Watchlist
                </h3>
              </div>
              <span className="font-mono text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase">
                PRIORITY TRIAGE
              </span>
            </div>

            {/* Watchlist Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-2 px-1">UNIT / SKU</th>
                    <th className="py-2 px-2 text-right" title="Days of Supply = Current Stock / Daily Burn Rate (1 decimal precision)">DAYS OF SUPPLY (STOCK / BURN)</th>
                    <th className="py-2 px-2 text-right">ON-HAND</th>
                    <th className="py-2 px-1 text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {top3Watchlist.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-1">
                        <div className="font-bold text-slate-900 dark:text-slate-200 truncate max-w-[140px]">
                          {item.location}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                          {item.sku}
                        </div>
                      </td>
                      <td
                        className="py-2.5 px-2 text-right font-bold tabular-nums text-rose-600 dark:text-rose-400 cursor-help"
                        title={`${item.on_hand} on-hand / ${item.daily_burn} burn = ${item.runway_days.toFixed(1)} days of supply (Stock / Burn)`}
                      >
                        {item.runway_days.toFixed(1)}d
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                        {item.on_hand}
                      </td>
                      <td className="py-2.5 px-1 text-right">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between mt-3 font-mono text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">TRIAGE TIME: &lt; 3 SEC</span>
            <Link
              to="/inventory"
              className="text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300 font-semibold inline-flex items-center gap-1 transition-colors"
            >
              <span>View All 18 Forward Units</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODIFY RECOMMENDATION OVERRIDE MODAL
          ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 max-w-lg w-full p-5 rounded-lg shadow-2xl flex flex-col gap-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-500" />
                <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-sm">
                  TACTICAL OVERRIDE // DISPATCH CONFIGURATION
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-slate-500 dark:text-slate-400 uppercase text-[10px] block mb-1 font-bold">
                  1. ALLOCATED VEHICLE COUNT (5kL TANKERS)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[2, 4, 6, 8].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setOverrideVehicles(count)}
                      className={`py-2 text-center rounded border font-bold tabular-nums transition-all ${
                        overrideVehicles === count
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
                      }`}
                    >
                      {count}x ({count * 5}kL)
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-500 dark:text-slate-400 uppercase text-[10px] block mb-1 font-bold">
                  2. TRANSIT CORRIDOR &amp; PASS BYPASS
                </label>
                <select
                  value={overridePass}
                  onChange={(e) => setOverridePass(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 px-3 py-2 rounded outline-none focus:border-emerald-500"
                >
                  <option value="South Ridge Bypass (Pass Echo)">Pass Echo // South Ridge Bypass (11,578 ft - Snow Chains)</option>
                  <option value="Direct NH-1D Corridor">Direct NH-1D Corridor (High Avalanche Risk)</option>
                  <option value="Axis-Delta Aerial Lift">Axis-Delta Heli-Lift Reserve</option>
                </select>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex flex-col gap-1 rounded">
                <div className="flex justify-between">
                  <span>PROJECTED OVERLAND PAYLOAD:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">{overrideVehicles * 5000} LITRES POL-88</span>
                </div>
                <div className="flex justify-between">
                  <span>ESTIMATED DELIVERY RUNWAY:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">+{(overrideVehicles * 4).toFixed(1)} DAYS GAIN</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3.5 py-1.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveOverride}
                className="px-4 py-1.5 rounded bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 transition-all shadow-xs"
              >
                Save Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
