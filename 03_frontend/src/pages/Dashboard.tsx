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
  Compass, 
  CheckCheck, 
  Edit3, 
  ShieldAlert, 
  Loader2, 
  X,
  RefreshCw,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { ServerLoader } from '../components/ServerLoader';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { formatProbability } from '../api';

// Map resizer to ensure tiles fill the container without grey gaps
const MapResizer: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

const createMiniPin = (color: string, label: string, isBlocked: boolean = false, isTarget: boolean = false) => {
  return L.divIcon({
    className: 'custom-mini-tactical-pin',
    html: `
      <div style="display:flex; flex-direction:column; align-items:center; transform: translate(-50%, -100%);">
        <div style="background-color:${color}; width:14px; height:14px; border-radius:2px; border:1.5px solid #fff; box-shadow:0 0 10px ${color}; display:flex; align-items:center; justify-content:center; position:relative;">
          ${isTarget ? '<span class="animate-ping" style="position:absolute; inset:-4px; border-radius:50%; background:rgba(239,68,68,0.7);"></span>' : ''}
          ${isBlocked ? '<span style="color:#fff; font-size:10px; font-weight:900; line-height:1;">✕</span>' : '<div style="width:4px; height:4px; background:#fff; border-radius:1px;"></div>'}
        </div>
        <div style="margin-top:2px; background:rgba(2,6,23,0.92); border:1px solid ${color}; color:#fff; font-family:'JetBrains Mono',monospace; font-size:8px; font-weight:bold; padding:1px 4px; border-radius:2px; white-space:nowrap; box-shadow:0 2px 4px rgba(0,0,0,0.6);">
          ${label}
        </div>
      </div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

const miniMapNodes = [
  { id: 'KARGIL', name: 'Kargil Depot [UNIT_02]', pos: [34.56, 76.13] as [number, number], color: '#10b981', details: 'Forward Supply Depot // 94,000L Reserve' },
  { id: 'FOB_CHARLIE', name: 'FOB Charlie [UNIT_03]', pos: [35.20, 77.20] as [number, number], color: '#ef4444', details: 'CRITICAL // Fuel Stockout T-34h', isTarget: true },
  { id: 'PASS_ECHO', name: 'Pass Echo [BLOCKED]', pos: [34.80, 76.90] as [number, number], color: '#ef4444', details: 'BLOCKED // Blizzard 85mm Snowfall (Cutoff in 22h)', isBlocked: true },
  { id: 'LEH_HQ', name: 'Leh HQ [UNIT_01]', pos: [34.15, 77.58] as [number, number], color: '#10b981', details: '14 Corps Logistic Hub & Command HQ' },
];

// Blocked Primary Route through Pass Echo
const blockedPrimaryCoords: [number, number][] = [
  [34.56, 76.13],
  [34.80, 76.90],
  [35.20, 77.20],
];

// Active A* Valley Bypass Corridor (all-weather valley axis avoiding Pass Echo)
const activeBypassCoords: [number, number][] = [
  [34.56, 76.13],
  [34.35, 76.60],
  [34.50, 77.00],
  [34.85, 77.30],
  [35.20, 77.20],
];

export const Dashboard: React.FC = () => {
  const { isReadOnly } = useAuth();
  const { addToast } = useToast();

  const [miniMapStyle, setMiniMapStyle] = useState<'DARK' | 'SATELLITE' | 'TOPO'>('DARK');

  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [convoyDispatched, setConvoyDispatched] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(3); // 1: PREDICTED, 2: ROUTE OPTIMISED, 3: OFFICER APPROVAL PENDING, 4: CONVOY IN TRANSIT

  // Modify Recommendation Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [overrideVehicles, setOverrideVehicles] = useState(4);
  const [overridePass, setOverridePass] = useState('Pass Echo // South Ridge Bypass (Valley Axis)');

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
        origin_depot: data.ai_recommendation.origin_depot || 'Kargil Forward Supply Depot',
        destination: data.ai_recommendation.target_unit || 'FOB Charlie',
        vehicle_count: overrideVehicles,
        cargo_type: 'POL-88 Arctic Fuel',
        manifest_quantity: `${overrideVehicles * 5000} Litres`,
        escort_type: '2x BMP-2 Armored QRF',
        priority_level: 'DEFCON-2',
        bypass_pass: overridePass,
      });

      api.dismissRecommendation();
      setConvoyDispatched(true);
      setActiveStep(4);

      setData((prev) =>
        prev
          ? {
              ...prev,
              kpis: {
                ...prev.kpis,
                units_critical_reserve: Math.max(0, prev.kpis.units_critical_reserve - 1),
                active_convoys: prev.kpis.active_convoys + 1,
              },
            }
          : null
      );

      addToast(
        `✓ CONVOY DISPATCHED: ${overrideVehicles}x 5kL Fuel Tankers en route to FOB Charlie via ${overridePass}`,
        'success'
      );
    } catch {
      addToast('Dispatch failed. Command link interdicted.', 'error');
    } finally {
      setAccepting(false);
    }
  };

  const handleSaveOverride = () => {
    setIsModalOpen(false);
    addToast(`Mission parameters updated: ${overrideVehicles} Tankers via ${overridePass}`, 'info');
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

  // Filter top 3 critical stockout units for Tier 3 watchlist with standardized calculations
  const top3Watchlist: ForwardReserveItem[] = data?.forward_reserves
    ? [...data.forward_reserves].sort((a, b) => a.runway_days - b.runway_days).slice(0, 3)
    : [
        { sku: 'POL-88 Arctic Diesel', location: 'FOB Charlie (Tiger Post)', on_hand: '320 L', daily_burn: '235 L/d', runway_days: 1.4, status: 'CRITICAL' },
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
            SECTOR-04 // 14 CORPS LIVE TELEMETRY
          </span>
          <span className="text-slate-500 font-mono text-[11px] tabular-nums">GRID 34°32'N 76°08'E</span>
          <span className="hidden md:inline text-slate-400 dark:text-slate-600 font-mono">•</span>
          <span className="hidden md:inline text-rose-500 font-mono text-[11px] font-bold">DEFCON-2 OPERATIONAL</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadDashboard}
            disabled={refreshing}
            className="px-3 py-1.5 rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono text-xs font-semibold border border-slate-300 dark:border-slate-700/80 transition-all flex items-center gap-1.5 active:scale-95"
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

        {/* KPI 3: 24h Shortage Alerts (Amber Accent) */}
        <div className="p-4 rounded-md bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 border-l-4 border-l-amber-500 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              24h Shortage Alerts
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
              Pass Echo &amp; Zoji La
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between font-mono text-[10px] text-slate-500 dark:text-slate-400">
            <span>A* Bypass Corridors Engaged</span>
            <Snowflake className="w-3.5 h-3.5 text-cyan-500" />
          </div>
        </div>
      </div>

      {/* =========================================================================
          TIER 2: CENTERPIECE HERO — HUMAN-IN-THE-LOOP AI ADVISORY CARD
          Clear focal point, generous whitespace (p-6), heartbeat pulse animation
          WHAT happened, WHY (causal factors), QUICK ACTION ([Accept] / [Modify])
          ========================================================================= */}
      {advisory && !convoyDispatched ? (
        <div className="p-6 rounded-lg bg-white dark:bg-slate-900/90 border-2 border-rose-500/60 dark:border-rose-500/60 shadow-xl relative overflow-hidden transition-all tactical-critical-pulse">
          {/* Top Status Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-rose-600 text-white font-mono text-[10px] font-bold tracking-wider shadow-sm animate-pulse">
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
              </div>

              {/* 1. WHAT HAPPENED — Clear Military Action Statement */}
              <div className="mt-2">
                <span className="font-mono text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 tracking-wider">
                  [WHAT HAPPENED]
                </span>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  FOB Charlie (UNIT_03) Fuel drops from 4.2d static buffer to 34h (1.4d) critical stockout.
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-mono mt-0.5">
                  Emergency dispatch of {overrideVehicles}x 5kL Tankers (20,000L POL-88) required from Kargil Supply Depot before Pass Echo weather interdiction.
                </p>
              </div>

              {/* Stochastic Uncertainty Bounds */}
              <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800 mt-2">
                <span className="font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Demand Forecast:</span>
                <span>p10: <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums">1,600 L</strong></span>
                <span>•</span>
                <span>p50: <strong className="text-cyan-600 dark:text-cyan-400 tabular-nums">2,050 L</strong></span>
                <span>•</span>
                <span>p90: <strong className="text-rose-600 dark:text-rose-400 tabular-nums">2,500 L</strong></span>
                <span className="hidden sm:inline text-slate-400">•</span>
                <span className="hidden sm:inline text-slate-500 text-[10px]">
                  Depletion: 320 L / 235 L/d = 1.4d gross (1.1d usable excl. 15% reserve)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/80 rounded-md border border-slate-200 dark:border-slate-800 flex flex-col items-end shadow-inner">
                <span className="font-mono text-[9px] uppercase text-slate-500 dark:text-slate-400 font-bold">
                  Time-To-Critical
                </span>
                <span className="font-mono text-lg font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
                  {advisory.time_to_critical}
                </span>
              </div>
            </div>
          </div>

          {/* 2. WHY — High-Contrast Causal Factor Pills */}
          <div className="mt-4 mb-5">
            <span className="font-mono text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider block mb-2">
              [WHY — ROOT CAUSAL FACTORS]
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Factor 1: Blizzard Cold Snap */}
              <div className="p-3 rounded-md bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2.5">
                <span className="text-lg">❄️</span>
                <div>
                  <div className="font-bold text-xs text-rose-900 dark:text-rose-200">
                    -18°C Blizzard (2x Burn)
                  </div>
                  <div className="font-mono text-[10px] text-rose-700 dark:text-rose-400">
                    Genset duty cycle 94%
                  </div>
                </div>
              </div>

              {/* Factor 2: Pass Echo Interdiction */}
              <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-center gap-2.5">
                <span className="text-lg">🚧</span>
                <div>
                  <div className="font-bold text-xs text-amber-900 dark:text-amber-200">
                    Pass Echo Cut in 22h
                  </div>
                  <div className="font-mono text-[10px] text-amber-700 dark:text-amber-400">
                    85mm snowfall / Avalanche
                  </div>
                </div>
              </div>

              {/* Factor 3: Hybrid Gate Trigger */}
              <div className="p-3 rounded-md bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-900/50 flex items-center gap-2.5">
                <span className="text-lg">📊</span>
                <div>
                  <div className="font-bold text-xs text-cyan-900 dark:text-cyan-200">
                    Hybrid Gate: 78.0% Risk
                  </div>
                  <div className="font-mono text-[10px] text-cyan-700 dark:text-cyan-400">
                    &lt;=48h runway threshold tripped
                  </div>
                </div>
              </div>

              {/* Factor 4: Isolation Forest Anomaly */}
              <div className="p-3 rounded-md bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 flex items-center gap-2.5">
                <span className="text-lg animate-bounce">⚠️</span>
                <div>
                  <div className="font-bold text-xs text-purple-900 dark:text-purple-200">
                    ANOMALOUS CONSUMPTION
                  </div>
                  <div className="font-mono text-[10px] text-purple-700 dark:text-purple-400">
                    Isolation Forest Score: 0.89
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4-Step Animated Mission Progress Tracker */}
          <div className="p-3.5 rounded-md bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                EXECUTION PIPELINE PROGRESSION
              </span>
              <span className="font-mono text-[10px] font-semibold text-cyan-600 dark:text-cyan-400">
                STEP {activeStep} OF 4
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-xs">
              <div className={`p-2 rounded border flex items-center gap-2 transition-all ${activeStep >= 1 ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-400'}`}>
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-[10px]">✓</span>
                <span className="font-bold text-[11px]">1. PREDICTED</span>
              </div>
              <div className={`p-2 rounded border flex items-center gap-2 transition-all ${activeStep >= 2 ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-400'}`}>
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-[10px]">✓</span>
                <span className="font-bold text-[11px]">2. ROUTE OPTIMISED</span>
              </div>
              <div className={`p-2 rounded border flex items-center gap-2 transition-all ${activeStep >= 3 ? 'bg-amber-500/15 border-amber-500/50 text-amber-800 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-400'}`}>
                <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-[10px]">3</span>
                <span className="font-bold text-[11px]">3. OFFICER APPROVAL</span>
              </div>
              <div className={`p-2 rounded border flex items-center gap-2 transition-all ${activeStep >= 4 ? 'bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-400'}`}>
                <span className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center font-bold text-[10px]">4</span>
                <span className="font-bold text-[11px]">4. CONVOY IN TRANSIT</span>
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
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
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
                  Target Unit
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">
                  {advisory.target_unit} [UNIT_03]
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-600 dark:text-slate-400">
              Payload: <strong className="text-slate-900 dark:text-slate-200 tabular-nums">{overrideVehicles * 5000}L POL-88</strong> ({overrideVehicles} Tankers + 2x BMP-2 QRF)
            </div>
          </div>

          {/* 3. QUICK ACTION — Prominent Human-in-the-Loop CTA Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 font-mono text-xs text-slate-600 dark:text-slate-400">
              <ShieldAlert className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span>Human-in-the-Loop clearance required before dispatch</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Modify Mission Button */}
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2.5 rounded-md border border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <Edit3 className="w-4 h-4 text-amber-500" />
                <span>[✎ Modify Mission]</span>
              </button>

              {/* Accept & Dispatch Convoy (Large Emerald Button) */}
              <button
                type="button"
                disabled={isReadOnly || accepting}
                onClick={handleAcceptRecommendation}
                title={isReadOnly ? 'Read-only role: commander clearance required' : 'Dispatch convoy and authorize replenishment'}
                className={`px-6 py-2.5 rounded-md font-mono text-xs font-extrabold transition-all shadow-lg flex items-center gap-2 active:scale-95 ${
                  isReadOnly
                    ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
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
                    <span>[✓ Accept &amp; Dispatch Convoy]</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Confirmed "✓ CONVOY DISPATCHED" Card State */
        <div className="p-6 rounded-lg bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-900 dark:text-emerald-200 font-mono text-xs shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-500/20">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-sm shadow">
                ✓
              </span>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-emerald-800 dark:text-emerald-300">
                  ✓ CONVOY DISPATCHED — MISSION IN TRANSIT
                </h3>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                  Payload: {overrideVehicles}x 5kL Tankers (20,000L POL-88) en route from Kargil Depot to FOB Charlie via {overridePass}.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-emerald-500 text-slate-950 font-mono text-[10px] font-extrabold uppercase">
              DEFCON-2 EXECUTED
            </span>
          </div>

          {/* Completed 4-Step Progress Tracker */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-xs">
            <div className="p-2 rounded bg-emerald-500/20 border border-emerald-500/50 text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-[10px]">✓</span>
              <span className="font-bold text-[11px]">1. PREDICTED ✓</span>
            </div>
            <div className="p-2 rounded bg-emerald-500/20 border border-emerald-500/50 text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-[10px]">✓</span>
              <span className="font-bold text-[11px]">2. ROUTE OPTIMISED ✓</span>
            </div>
            <div className="p-2 rounded bg-emerald-500/20 border border-emerald-500/50 text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-[10px]">✓</span>
              <span className="font-bold text-[11px]">3. OFFICER APPROVED ✓</span>
            </div>
            <div className="p-2 rounded bg-emerald-500 text-slate-950 border border-emerald-400 flex items-center gap-2 shadow-sm animate-pulse">
              <span className="w-4 h-4 rounded-full bg-slate-950 text-emerald-400 flex items-center justify-center font-bold text-[10px]">🚚</span>
              <span className="font-extrabold text-[11px]">4. CONVOY IN TRANSIT</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TIER 3: 2-COLUMN SPLIT (7 cols Left / 5 cols Right)
          Left 7 cols: Interactive Mini-GIS Corridor Map (Blocked primary + animated A* bypass)
          Right 5 cols: Compact "Priority Stockout Watchlist" with Red/Amber/Green progress bars
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT 7 COLS: Mini-GIS Corridor Map */}
        <div className="lg:col-span-7 rounded-md bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800/80 gap-2">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <h3 className="font-mono text-xs uppercase font-bold tracking-wider text-slate-900 dark:text-white">
                  Mini-GIS Corridor Map // Sector 04
                </h3>
              </div>
              
              <div className="flex items-center gap-2">
                {/* 100% Free Keyless Tile Style Switcher */}
                <div className="flex items-center p-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">
                  <button
                    type="button"
                    onClick={() => setMiniMapStyle('DARK')}
                    className={`px-2 py-0.5 rounded font-bold transition-all ${
                      miniMapStyle === 'DARK'
                        ? 'bg-slate-900 text-cyan-400 border border-cyan-500/40 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Dark OSM
                  </button>
                  <button
                    type="button"
                    onClick={() => setMiniMapStyle('SATELLITE')}
                    className={`px-2 py-0.5 rounded font-bold transition-all ${
                      miniMapStyle === 'SATELLITE'
                        ? 'bg-emerald-600 text-white font-extrabold shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Satellite
                  </button>
                  <button
                    type="button"
                    onClick={() => setMiniMapStyle('TOPO')}
                    className={`px-2 py-0.5 rounded font-bold transition-all ${
                      miniMapStyle === 'TOPO'
                        ? 'bg-amber-600 text-white font-extrabold shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Topo
                  </button>
                </div>

                <Link
                  to="/map"
                  className="font-mono text-xs bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 px-2.5 py-1 rounded border border-cyan-500/30 font-bold inline-flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
                >
                  <span>[Full Map]</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Live Keyless Mini-GIS Map with Animated Bypass & Radar Sweep */}
            <div className="relative w-full h-[320px] rounded border border-slate-200 dark:border-slate-800 overflow-hidden shadow-inner z-0">
              {/* Radar Sweep Telemetry Overlay */}
              <div className="radar-sweep-overlay pointer-events-none" />

              <MapContainer
                center={[34.75, 76.75]}
                zoom={8}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
              >
                <MapResizer />

                {miniMapStyle === 'DARK' ? (
                  <TileLayer
                    key="mini-dark-osm"
                    className="tactical-osm-dark-tiles"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxZoom={19}
                  />
                ) : miniMapStyle === 'SATELLITE' ? (
                  <TileLayer
                    key="mini-esri-satellite"
                    attribution="Tiles &copy; Esri &mdash; Source: Esri, USGS, NOAA"
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    maxZoom={18}
                  />
                ) : (
                  <TileLayer
                    key="mini-opentopomap"
                    attribution="Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap"
                    url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                    maxZoom={17}
                  />
                )}

                {/* Primary Route: Blocked Pass Echo (Red Dashed Line) */}
                <Polyline
                  positions={blockedPrimaryCoords}
                  pathOptions={{
                    color: '#ef4444',
                    weight: 3.5,
                    dashArray: '6, 6',
                    opacity: 0.85,
                  }}
                />

                {/* Active A* Valley Bypass Corridor (Animated Glowing Green Line) */}
                <Polyline
                  positions={activeBypassCoords}
                  pathOptions={{
                    color: '#10b981',
                    weight: 4.5,
                    opacity: 0.95,
                    className: 'convoy-route-animated',
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

            {/* Corridor Map Legend */}
            <div className="grid grid-cols-3 gap-2 mt-3 font-mono text-[10px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-1 rounded bg-emerald-500"></span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">A* Valley Bypass</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-0.5 border-t-2 border-dashed border-rose-500"></span>
                <span className="text-rose-500 font-bold">Pass Echo (Blocked)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-rose-500 font-extrabold text-xs">✕</span>
                <span>Interdicted Route</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between mt-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
            <span>CORRIDOR: <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums">KARGIL -&gt; FOB CHARLIE (48.4 KM)</strong></span>
            <span>MET FORECAST: <strong className="text-rose-600 dark:text-rose-400 font-semibold">-18°C BLIZZARD</strong></span>
          </div>
        </div>

        {/* RIGHT 5 COLS: Compact "Priority Stockout Watchlist" Table with Progress Bars */}
        <div className="lg:col-span-5 rounded-md bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800/80">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <h3 className="font-mono text-xs uppercase font-bold tracking-wider text-slate-900 dark:text-white">
                  Priority Stockout Watchlist
                </h3>
              </div>
              <span className="font-mono text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase">
                &lt; 72H RESERVES
              </span>
            </div>

            {/* Watchlist Table with Animated Progress Bars */}
            <div className="space-y-3.5 font-mono">
              {top3Watchlist.map((item, index) => {
                // Color-coded runway thresholds: Red (<3d), Amber (3-7d), Green (>7d)
                const isCritical = item.runway_days < 3.0;
                const isWarning = item.runway_days >= 3.0 && item.runway_days <= 7.0;
                const barColor = isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500';
                const textColor = isCritical ? 'text-rose-600 dark:text-rose-400' : isWarning ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400';
                const badgeColor = isCritical
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                  : isWarning
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';

                // Bar width normalized to 10 days max
                const barWidth = Math.min(100, Math.max(10, (item.runway_days / 10) * 100));

                return (
                  <div
                    key={index}
                    className="p-3 rounded-md bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                          {item.location}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {item.sku}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`font-mono text-xs font-extrabold tabular-nums ${textColor}`}>
                          {item.runway_days.toFixed(1)}d
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${badgeColor}`}>
                          {item.status}
                        </span>
                      </div>
                    </div>

                    {/* Animated Stock Runway Bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden my-1.5">
                      <div
                        className={`h-full rounded-full runway-progress-bar ${barColor}`}
                        style={{ width: `${barWidth}%` }}
                        title={`${item.on_hand} on-hand / ${item.daily_burn} daily burn = ${item.runway_days.toFixed(1)} days`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                      <span>Stock: <strong className="text-slate-800 dark:text-slate-200 tabular-nums">{item.on_hand}</strong></span>
                      <span>Burn: <strong className="text-slate-800 dark:text-slate-200 tabular-nums">{item.daily_burn}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between mt-3 font-mono text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">TRIAGE TIME: &lt; 3 SEC</span>
            <Link
              to="/inventory"
              className="text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300 font-semibold inline-flex items-center gap-1 transition-colors"
            >
              <span>View Full Inventory Matrix</span>
              <ChevronRight className="w-3.5 h-3.5" />
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
