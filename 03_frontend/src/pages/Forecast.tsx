import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { formatProbability, calculateDaysRemaining } from '../api';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { 
  TrendingUp, 
  Play, 
  ShieldAlert, 
  Loader2,
  Calendar,
  Sparkles,
  Boxes
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';

interface CommodityProfile {
  name: string;
  unit: string;
  chartTitle: string;
}

const COMMODITIES: Record<string, CommodityProfile> = {
  'POL-88': {
    name: 'Class-III POL-88 Arctic Diesel',
    unit: 'L',
    chartTitle: 'POL-88 DIESEL DEPLETION TRAJECTORY',
  },
  'AMMO-155': {
    name: '155mm Bofors Artillery Shells',
    unit: 'Rounds',
    chartTitle: '155MM ARTILLERY SHELLS DEPLETION TRAJECTORY',
  },
  'O2': {
    name: 'Medical Grade Oxygen Cylinders',
    unit: 'Cylinders',
    chartTitle: 'MEDICAL OXYGEN CYLINDERS TRAJECTORY',
  },
  'RATIONS': {
    name: 'Ration Packs (MRE / Cold Weather)',
    unit: 'Kits',
    chartTitle: 'RATION PACKS DEPLETION TRAJECTORY',
  },
};

interface UnitProfile {
  name: string;
  elevation: string;
  temp: string;
  data: Record<string, { currentStock: number; dailyBurn: number; maxCapacity: number; causal: string[] }>;
}

const UNITS: Record<string, UnitProfile> = {
  'UNIT_03': {
    name: 'FOB Charlie [UNIT_03]',
    elevation: '14,200 ft',
    temp: '-28°C',
    data: {
      'POL-88': { currentStock: 320, dailyBurn: 235, maxCapacity: 2500, causal: ['🌡️ -28.5°C Extreme Cold', '❄️ 85mm Heavy Blizzard', '⚡ Continuous Genset Load', '⚠️ 87.4% Risk Gate'] },
      'AMMO-155': { currentStock: 140, dailyBurn: 45, maxCapacity: 800, causal: ['💥 Night Border Interdiction', '🎯 3x Perimeter Barrage', '⚠️ 68.2% Risk Gate'] },
      'O2': { currentStock: 14, dailyBurn: 5, maxCapacity: 60, causal: ['🏔️ 14,200ft High-Altitude', '🫁 Pulmonary Edema Surge', '⚠️ 82.5% Risk Gate'] },
      'RATIONS': { currentStock: 380, dailyBurn: 90, maxCapacity: 1500, causal: ['❄️ Avalanche Isolation', '📦 Heavy Ration Expeditions', '⚠️ 42.1% Risk Gate'] },
    },
  },
  'UNIT_01': {
    name: 'Srinagar Base [UNIT_01]',
    elevation: '5,200 ft',
    temp: '-6°C',
    data: {
      'POL-88': { currentStock: 85000, dailyBurn: 3200, maxCapacity: 120000, causal: ['🏢 Rear HQ Logistics Staging', '🚛 Outbound Convoy Fills', '✓ 12.4% Risk Nominal'] },
      'AMMO-155': { currentStock: 11200, dailyBurn: 250, maxCapacity: 15000, causal: ['📦 Strategic Depot Stock', '🛡️ Corps Munitions Vault', '✓ 8.2% Risk Nominal'] },
      'O2': { currentStock: 320, dailyBurn: 15, maxCapacity: 400, causal: ['🏥 Base Hospital Facility', '✓ 9.5% Risk Nominal'] },
      'RATIONS': { currentStock: 6500, dailyBurn: 200, maxCapacity: 8000, causal: ['🍞 Central Bake & Ration Staging', '✓ 10.1% Risk Nominal'] },
    },
  },
  'UNIT_02': {
    name: 'Kargil Forward Depot [UNIT_02]',
    elevation: '8,780 ft',
    temp: '-14°C',
    data: {
      'POL-88': { currentStock: 72000, dailyBurn: 4500, maxCapacity: 94000, causal: ['⛽ 4 Forward FOB Resupply Source', '🚧 Pass Echo Weather Alert', '⚠️ 31.5% Risk Gate'] },
      'AMMO-155': { currentStock: 5400, dailyBurn: 320, maxCapacity: 8000, causal: ['💥 Dras Ridge Forward Support', '⚠️ 28.4% Risk Gate'] },
      'O2': { currentStock: 180, dailyBurn: 12, maxCapacity: 250, causal: ['🏥 Transit Medical Post', '⚠️ 22.0% Risk Gate'] },
      'RATIONS': { currentStock: 3800, dailyBurn: 160, maxCapacity: 5000, causal: ['📦 Staging Hub Redistribution', '⚠️ 18.2% Risk Gate'] },
    },
  },
  'UNIT_04': {
    name: 'Dras Command Post [UNIT_04]',
    elevation: '10,800 ft',
    temp: '-22°C',
    data: {
      'POL-88': { currentStock: 2800, dailyBurn: 650, maxCapacity: 12000, causal: ['🌡️ -22.0°C Freeze', '❄️ 45mm Snow Drift', '⚠️ 54.2% Risk Gate'] },
      'AMMO-155': { currentStock: 420, dailyBurn: 95, maxCapacity: 2500, causal: ['💥 High-Ridge Border Patrols', '⚠️ 48.6% Risk Gate'] },
      'O2': { currentStock: 22, dailyBurn: 5, maxCapacity: 80, causal: ['🏔️ 10,800ft Elevation Stress', '⚠️ 51.0% Risk Gate'] },
      'RATIONS': { currentStock: 750, dailyBurn: 120, maxCapacity: 2000, causal: ['🍞 Cold Climate Burn', '⚠️ 38.5% Risk Gate'] },
    },
  },
  'UNIT_08': {
    name: 'Siachen Base Camp [UNIT_08]',
    elevation: '18,800 ft',
    temp: '-36°C',
    data: {
      'POL-88': { currentStock: 1450, dailyBurn: 720, maxCapacity: 8000, causal: ['🌡️ -36.0°C Extreme Arctic', '❄️ Continuous Tent Heating', '⚠️ 89.5% Risk Gate'] },
      'AMMO-155': { currentStock: 310, dailyBurn: 70, maxCapacity: 1200, causal: ['🏔️ Glacier Defense Sector', '⚠️ 62.0% Risk Gate'] },
      'O2': { currentStock: 18, dailyBurn: 7, maxCapacity: 120, causal: ['🫁 Extreme Hypoxia Risk', '🚨 Emergency Air Cover Standby', '⚠️ 91.2% Risk Gate'] },
      'RATIONS': { currentStock: 420, dailyBurn: 110, maxCapacity: 1800, causal: ['📦 High Calorie Ration Burn', '⚠️ 58.0% Risk Gate'] },
    },
  },
};

export const Forecast: React.FC = () => {
  const { theme } = useTheme();
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();

  // Initial unit from query string if available
  const initialUnit = searchParams.get('unit') || 'UNIT_03';
  const [selectedUnit, setSelectedUnit] = useState<string>(initialUnit in UNITS ? initialUnit : 'UNIT_03');
  const [selectedCommodity, setSelectedCommodity] = useState<string>('POL-88');
  const [horizon, setHorizon] = useState<'24h' | '48h' | '7d'>('48h');
  const [loading, setLoading] = useState(false);

  // Recompute forecast model deterministically based on (unit, commodity, horizon)
  const currentUnit = UNITS[selectedUnit] || UNITS['UNIT_03'];
  const currentCommodity = COMMODITIES[selectedCommodity] || COMMODITIES['POL-88'];
  const itemConfig = currentUnit.data[selectedCommodity] || currentUnit.data['POL-88'];

  // Buffer minimum is strictly 15% of the unit's max capacity (e.g. 15% * 2500L = 375L or 15% * currentStock)
  const bufferMin = Math.round(itemConfig.currentStock * 0.15);
  const usableStock = Math.max(0, itemConfig.currentStock - bufferMin);
  const daysOfSupply = calculateDaysRemaining(itemConfig.currentStock, itemConfig.dailyBurn, bufferMin);
  const hoursOfSupply = Math.round(daysOfSupply * 24);

  // Determine stockout risk percentage dynamically
  const stockoutRisk = useMemo(() => {
    if (daysOfSupply <= 1.5) return 87.4;
    if (daysOfSupply <= 3.0) return 52.4;
    if (daysOfSupply <= 5.0) return 34.0;
    return 11.5;
  }, [daysOfSupply]);

  // Compute stochastic fan chart data points
  const chartData = useMemo(() => {
    const timeLabels = horizon === '24h'
      ? ['T-8h', 'T-4h', 'T-0', 'T+4h', 'T+8h', 'T+12h', 'T+16h', 'T+24h']
      : horizon === '48h'
      ? ['T-12h', 'T-6h', 'T-0', 'T+6h', 'T+12h', 'T+18h', 'T+24h', 'T+32h', 'T+40h', 'T+48h']
      : ['D-2', 'D-1', 'D-0', 'D+1', 'D+2', 'D+3', 'D+4', 'D+5', 'D+6', 'D+7'];

    const initialStock = itemConfig.currentStock;
    const burnRatePerStep = itemConfig.dailyBurn / (horizon === '24h' ? 6 : horizon === '48h' ? 4 : 1);

    return timeLabels.map((time, idx) => {
      if (idx <= 2) {
        // Historical actuals
        const histStock = Math.round(initialStock + (2 - idx) * burnRatePerStep * 0.95);
        return {
          time,
          actual: histStock,
          buffer_min: bufferMin,
          bandBase: histStock,
          bandWidth: 0,
        };
      } else {
        // Projections
        const stepsAhead = idx - 2;
        const projected = Math.max(0, Math.round(initialStock - stepsAhead * burnRatePerStep));
        const uncertainty = Math.round(burnRatePerStep * stepsAhead * 0.35);
        const lowerBound = Math.max(0, projected - uncertainty);
        const upperBound = projected + uncertainty;

        return {
          time,
          predicted: projected,
          lower_bound: lowerBound,
          upper_bound: upperBound,
          p10: lowerBound,
          p90: upperBound,
          buffer_min: bufferMin,
          bandBase: lowerBound,
          bandWidth: Math.max(0, upperBound - lowerBound),
        };
      }
    });
  }, [itemConfig, horizon, bufferMin]);

  const handleRunForecast = useCallback((notify = true) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (notify) {
        addToast(`Forecast computed for ${currentUnit.name} // ${currentCommodity.name} (${horizon.toUpperCase()})`, 'success');
      }
    }, 280);
  }, [currentUnit.name, currentCommodity.name, horizon, addToast]);

  // Recompute with toast feedback on parameter changes
  useEffect(() => {
    handleRunForecast(false);
  }, [selectedUnit, selectedCommodity, horizon, handleRunForecast]);

  const actualColor = theme === 'dark' ? '#f8fafc' : '#0f172a';
  const gridColor = theme === 'dark' ? '#1e293b' : '#e2e8f0';

  // SVG Radial Speedometer Gauge Calculation
  const gaugeColor = stockoutRisk > 50 ? '#ef4444' : stockoutRisk >= 25 ? '#f59e0b' : '#10b981';
  // Arc angle from -90deg to +90deg (180deg total)
  const angleDeg = -90 + (stockoutRisk / 100) * 180;
  const needleRad = (angleDeg * Math.PI) / 180;
  const needleX = 50 + 36 * Math.cos(needleRad);
  const needleY = 46 + 36 * Math.sin(needleRad);

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h1 className="font-semibold text-lg text-slate-900 dark:text-white tracking-tight">
              Predictive Demand &amp; Depletion Forecast
            </h1>
          </div>
          <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Stochastic POL &amp; Munitions consumption trajectories with 15% safety reserve buffer monitoring
          </p>
        </div>
      </div>

      {/* TOP CONTROLS TOOLBAR: Unit/Commodity Selectors, [24h] | [48h] | [7d] + [Run Forecast] */}
      <div className="bg-white dark:bg-slate-900/70 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        {/* Left: Unit & Commodity Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Unit:</span>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 px-3 py-1.5 rounded-md text-xs outline-none focus:border-emerald-500 font-medium"
            >
              <option value="UNIT_03">FOB Charlie [UNIT_03]</option>
              <option value="UNIT_01">Srinagar Base [UNIT_01]</option>
              <option value="UNIT_02">Kargil Forward Depot [UNIT_02]</option>
              <option value="UNIT_04">Dras Command Post [UNIT_04]</option>
              <option value="UNIT_08">Siachen Base Camp [UNIT_08]</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Commodity:</span>
            <select
              value={selectedCommodity}
              onChange={(e) => setSelectedCommodity(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 px-3 py-1.5 rounded-md text-xs outline-none focus:border-emerald-500 font-medium"
            >
              <option value="POL-88">Class-III POL-88 Arctic Diesel</option>
              <option value="AMMO-155">155mm Bofors Shells</option>
              <option value="O2">Medical Oxygen Cylinders</option>
              <option value="RATIONS">Ration Packs (MRE)</option>
            </select>
          </div>
        </div>

        {/* Right: Horizon Selectors [24h] | [48h] | [7d] + [Run Forecast] */}
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            {(['24h', '48h', '7d'] as const).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHorizon(h)}
                className={`px-3 py-1 rounded-md font-semibold transition-all ${
                  horizon === h
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {h.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleRunForecast(true)}
            className="px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-60 active:scale-95"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Computing...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Forecast</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 70% CHART (8 cols) & 30% SUMMARY CARD (4 cols) VIEWPORT SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT 70% (8 COLS): Recharts Confidence Interval Fan Chart */}
        <div className="lg:col-span-8 rounded-lg bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 p-5 flex flex-col gap-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800/80 gap-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-900 dark:text-white tracking-tight">
                {currentCommodity.chartTitle}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold border border-slate-200 dark:border-slate-700">
                {horizon.toUpperCase()} Horizon
              </span>
            </div>

            {/* Tactical Chart Legend */}
            <div className="flex flex-wrap items-center gap-3.5 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-0.5 bg-slate-900 dark:bg-slate-100 inline-block"></span>
                <span className="text-slate-400">Actual</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-0.5 border-b-2 border-dashed border-emerald-500 inline-block"></span>
                <span className="text-emerald-400 font-semibold">Predicted (p50)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-2 bg-emerald-500/20 inline-block rounded-xs"></span>
                <span className="text-slate-400">p10–p90 Range</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-0.5 border-b-2 border-dotted border-rose-500 inline-block"></span>
                <span className="text-rose-400 font-semibold">15% Safety Buffer</span>
              </div>
            </div>
          </div>

          {/* Chart Canvas */}
          <div className="w-full h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 15, right: 15, left: 15, bottom: 15 }}>
                <defs>
                  <linearGradient id="confidenceBand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.03} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />

                <XAxis
                  dataKey="time"
                  stroke={theme === 'dark' ? '#64748b' : '#94a3b8'}
                  tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 11, fontFamily: 'Inter' }}
                />
                <YAxis
                  stroke={theme === 'dark' ? '#64748b' : '#94a3b8'}
                  tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  unit={` ${currentCommodity.unit}`}
                />

                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0]?.payload;
                      return (
                        <div className="bg-slate-900 border border-slate-700 p-3 shadow-xl text-xs text-slate-100 flex flex-col gap-1 rounded-lg">
                          <div className="font-bold text-emerald-400 border-b border-slate-800 pb-1">
                            Timestep: {label}
                          </div>
                          {item.actual !== undefined && (
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-400">Actual Stock:</span>
                              <span className="text-white font-mono-num font-bold">
                                {item.actual.toLocaleString()} {currentCommodity.unit}
                              </span>
                            </div>
                          )}
                          {item.predicted !== undefined && (
                            <div className="flex justify-between gap-4">
                              <span className="text-emerald-400">Predicted (p50):</span>
                              <span className="text-emerald-300 font-mono-num font-bold">
                                {item.predicted.toLocaleString()} {currentCommodity.unit}
                              </span>
                            </div>
                          )}
                          {item.lower_bound !== undefined && item.upper_bound !== undefined && (
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-400">p10–p90 Range:</span>
                              <span className="text-amber-400 font-mono-num font-bold">
                                {item.lower_bound.toLocaleString()} – {item.upper_bound.toLocaleString()} {currentCommodity.unit}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between gap-4 border-t border-slate-800 pt-1 text-[11px]">
                            <span className="text-rose-400">15% Reserve Buffer:</span>
                            <span className="text-rose-300 font-mono-num">
                              {bufferMin.toLocaleString()} {currentCommodity.unit}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                {/* Reference Line for 15% Buffer Minimum */}
                <ReferenceLine
                  y={bufferMin}
                  stroke="#f43f5e"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: `15% Buffer Min (${bufferMin.toLocaleString()} ${currentCommodity.unit})`,
                    fill: '#f43f5e',
                    fontSize: 11,
                    position: 'top',
                  }}
                />

                {/* Stacked Area for Translucent Confidence Band (p10 to p90) */}
                <Area
                  type="monotone"
                  dataKey="bandBase"
                  stackId="confidence"
                  stroke="none"
                  fill="transparent"
                />
                <Area
                  type="monotone"
                  dataKey="bandWidth"
                  stackId="confidence"
                  stroke="#10b981"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  fill="url(#confidenceBand)"
                />

                {/* Actual Historical Line */}
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke={actualColor}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: actualColor }}
                  name="Actual"
                />

                {/* Predicted Line p50 (emerald dashed) */}
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  dot={{ r: 4, fill: '#10b981' }}
                  name="Predicted"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RIGHT 30% (4 COLS): Visual Gauges & Summary Card */}
        <div className="lg:col-span-4 rounded-lg bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 p-5 flex flex-col gap-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">
                Operational Telemetry
              </h3>
            </div>
            <span className="text-[11px] font-mono-num font-semibold text-slate-400">
              {currentUnit.temp} // {currentUnit.elevation}
            </span>
          </div>

          {/* Metric 1: VISUAL RADIAL SPEEDOMETER / GAUGE FOR STOCKOUT RISK */}
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-col items-center">
            <div className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
              <span>Stockout Threat Probability</span>
              <ShieldAlert className={`w-4 h-4 ${stockoutRisk > 50 ? 'text-rose-500' : 'text-amber-500'}`} />
            </div>

            {/* Semi-Circular SVG Speedometer Gauge */}
            <div className="relative w-48 h-28 flex flex-col items-center justify-end">
              <svg viewBox="0 0 100 55" className="w-full h-full overflow-visible">
                {/* Background Track Arc */}
                <path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                {/* Green Zone: 0 - 25% */}
                <path
                  d="M 10 50 A 40 40 0 0 1 30 20"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="8"
                  strokeOpacity="0.4"
                />
                {/* Amber Zone: 25 - 50% */}
                <path
                  d="M 30 20 A 40 40 0 0 1 70 20"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="8"
                  strokeOpacity="0.4"
                />
                {/* Red Zone: 50 - 100% */}
                <path
                  d="M 70 20 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="8"
                  strokeOpacity="0.5"
                />
                {/* Needle */}
                <line
                  x1="50"
                  y1="48"
                  x2={needleX}
                  y2={needleY}
                  stroke={gaugeColor}
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx="50" cy="48" r="4" fill={gaugeColor} />
              </svg>

              {/* Centered Threat Percentage */}
              <div className="absolute bottom-0 flex flex-col items-center">
                <span className="font-mono-num text-2xl font-extrabold" style={{ color: gaugeColor }}>
                  {formatProbability(stockoutRisk)}
                </span>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-bold mt-0.5 uppercase tracking-wide"
                  style={{
                    backgroundColor: `${gaugeColor}20`,
                    color: gaugeColor,
                    border: `1px solid ${gaugeColor}40`,
                  }}
                >
                  {stockoutRisk > 50 ? 'Critical Threat' : stockoutRisk >= 25 ? 'Guarded Warning' : 'Nominal Safe'}
                </span>
              </div>
            </div>

            <div className="w-full flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-200 dark:border-slate-800/80 pt-2 mt-3">
              <span>Depletion Window:</span>
              <span className={`font-mono-num font-semibold ${stockoutRisk > 50 ? 'text-rose-400' : 'text-amber-400'}`}>
                {hoursOfSupply <= 36 ? `Within ${hoursOfSupply}h` : `${daysOfSupply} Days`}
              </span>
            </div>
          </div>

          {/* Metric 2: SEGMENTED BATTERY / FUEL TANK VISUAL BAR FOR DAYS OF SUPPLY */}
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
              <span>Days of Supply &amp; Buffer</span>
              <Calendar className="w-4 h-4 text-amber-500" />
            </div>

            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <span className="font-mono-num text-2xl font-bold text-slate-100">
                  {daysOfSupply} d
                </span>
                <span className="font-mono-num text-xs text-slate-400">
                  (~{hoursOfSupply}h runtime)
                </span>
              </div>
              <span className="text-[11px] font-mono-num text-slate-300">
                {itemConfig.currentStock.toLocaleString()} {currentCommodity.unit} on hand
              </span>
            </div>

            {/* Segmented Tank / Battery Visual Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="w-full flex items-center gap-1 h-3.5 bg-slate-900 p-0.5 rounded border border-slate-800">
                {Array.from({ length: 10 }).map((_, i) => {
                  const segValue = (i + 1) * 10;
                  const stockPercent = Math.min(100, (itemConfig.currentStock / itemConfig.maxCapacity) * 100);
                  const isFilled = segValue <= stockPercent;
                  const isBufferZone = i < 2; // First 15% is buffer zone

                  return (
                    <div
                      key={i}
                      className={`flex-1 h-full rounded-xs transition-all ${
                        isFilled
                          ? isBufferZone
                            ? 'bg-rose-500 shadow-xs'
                            : stockoutRisk > 50
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                          : 'bg-slate-800/60'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Usable Stock vs 15% Safety Buffer breakdown */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 font-mono-num">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                  <span>15% Buffer: {bufferMin.toLocaleString()} {currentCommodity.unit}</span>
                </span>
                <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                  <span>Usable: {usableStock.toLocaleString()} {currentCommodity.unit}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Metric 3: Predicted Demand & p10-p90 bounds */}
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
              <span>Predicted {horizon.toUpperCase()} Consumption</span>
              <Boxes className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-mono-num text-xl font-bold text-slate-100">
                {(itemConfig.dailyBurn * (horizon === '24h' ? 1 : horizon === '48h' ? 2 : 7)).toLocaleString()} {currentCommodity.unit}
              </span>
              <span className="text-xs text-slate-400 font-mono-num">
                Rate: {itemConfig.dailyBurn.toLocaleString()} {currentCommodity.unit}/d
              </span>
            </div>
          </div>

          {/* Metric 4: COMPACT CAUSAL RISK FACTOR ICON PILLS */}
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-400">
              Active Causal Risk Factors:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {itemConfig.causal.map((factor, idx) => (
                <div
                  key={idx}
                  className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-300 shadow-xs flex items-center gap-1.5"
                >
                  <span>{factor}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
