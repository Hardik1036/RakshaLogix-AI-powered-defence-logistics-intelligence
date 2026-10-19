import React, { useState, useEffect } from 'react';
import { api, formatProbability } from '../api';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import type { ForecastResponse } from '../types/api';
import { 
  TrendingUp, 
  Play, 
  ShieldAlert, 
  Fuel, 
  Loader2,
  Calendar,
  Sparkles
} from 'lucide-react';
import { ServerLoader } from '../components/ServerLoader';
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

export const Forecast: React.FC = () => {
  const { theme } = useTheme();
  const { addToast } = useToast();

  const [selectedUnit, setSelectedUnit] = useState('UNIT_03');
  const [selectedCommodity, setSelectedCommodity] = useState('POL-88');
  const [horizon, setHorizon] = useState<'24h' | '48h' | '7d'>('48h');
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    runForecast(horizon);
  }, [horizon]);

  const runForecast = async (selectedHorizon: '24h' | '48h' | '7d') => {
    try {
      setLoading(true);
      const res = await api.getForecast(selectedHorizon);
      setData(res);
      addToast(`Probabilistic forecast executed for ${selectedHorizon} horizon`, 'info');
    } catch {
      addToast('Failed to run forecast model.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart points for Recharts confidence interval band
  const chartData = data?.points.map((p) => {
    const p10Val = p.lower_bound ?? p.p10 ?? 0;
    const p90Val = p.upper_bound ?? p.p90 ?? 0;
    return {
      ...p,
      bandBase: p10Val,
      bandWidth: Math.max(0, p90Val - p10Val),
    };
  }) || [];

  const actualColor = theme === 'dark' ? '#f8fafc' : '#0f172a';
  const gridColor = theme === 'dark' ? '#1e293b' : '#e2e8f0';

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h1 className="font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wider">
              PREDICTIVE DEMAND &amp; DEPLETION FORECAST
            </h1>
          </div>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
            Stochastic POL Consumption Trajectory &amp; Safety Buffer Breach Simulation
          </p>
        </div>
      </div>

      {/* SINGLE CLEAN TOP TOOLBAR BAR: Unit/Commodity selectors, [24h] | [48h] | [7d] + [Run Forecast] */}
      <div className="bg-white dark:bg-slate-900/60 p-3 rounded-md border border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 font-mono text-xs shadow-xs">
        {/* Left: Unit & Commodity Selectors */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Unit:</span>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 px-2.5 py-1.5 rounded text-xs outline-none focus:border-emerald-500 font-semibold"
            >
              <option value="UNIT_03">FOB Charlie [UNIT_03]</option>
              <option value="UNIT_01">Srinagar Base [UNIT_01]</option>
              <option value="UNIT_02">Kargil Forward Depot [UNIT_02]</option>
              <option value="UNIT_04">Dras Command Post [UNIT_04]</option>
              <option value="UNIT_08">Siachen Base Camp [UNIT_08]</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Commodity:</span>
            <select
              value={selectedCommodity}
              onChange={(e) => setSelectedCommodity(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 px-2.5 py-1.5 rounded text-xs outline-none focus:border-emerald-500 font-semibold"
            >
              <option value="POL-88">Class-III POL-88 Diesel</option>
              <option value="O2">Medical Oxygen Cylinders</option>
              <option value="AMMO-155">155mm Bofors Shells</option>
            </select>
          </div>
        </div>

        {/* Right: Horizon Selectors [24h] | [48h] | [7d] + [Run Forecast] */}
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-xs">
            {(['24h', '48h', '7d'] as const).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHorizon(h)}
                className={`px-3 py-1 rounded font-bold transition-all ${
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
            onClick={() => runForecast(horizon)}
            className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-60 active:scale-95"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>COMPUTING...</span>
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

      {loading && !data && (
        <ServerLoader message="Connecting to simulation server... (may take up to 60s on first request)" />
      )}

      {/* 70% CHART (8 cols) & 30% SUMMARY CARD (4 cols) VIEWPORT SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT 70% (8 COLS): Recharts p10-p90 Confidence Fan Chart */}
        <div className="lg:col-span-8 rounded-md bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-5 flex flex-col gap-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800/80 gap-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase text-slate-900 dark:text-white">
                POL-88 Consumption &amp; Depletion Trajectory
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] uppercase font-bold border border-slate-200 dark:border-slate-700">
                {horizon.toUpperCase()} Horizon
              </span>
            </div>

            {/* Tactical Chart Legend */}
            <div className="flex flex-wrap items-center gap-3.5 font-mono text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-0.5 bg-slate-900 dark:bg-slate-100 inline-block"></span>
                <span className="text-slate-600 dark:text-slate-400">Actual</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-0.5 border-b-2 border-dashed border-emerald-500 inline-block"></span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Predicted (p50)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-2 bg-emerald-500/20 inline-block rounded-xs"></span>
                <span className="text-slate-600 dark:text-slate-400">p10–p90 Fan</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-0.5 border-b-2 border-dotted border-rose-500 inline-block"></span>
                <span className="text-rose-500 font-semibold">Buffer Min (3,500 L)</span>
              </div>
            </div>
          </div>

          {/* Chart Canvas */}
          <div className="w-full h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 15, right: 15, left: 10, bottom: 15 }}>
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
                  tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                />
                <YAxis
                  stroke={theme === 'dark' ? '#64748b' : '#94a3b8'}
                  tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  unit="L"
                />

                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0]?.payload;
                      return (
                        <div className="bg-slate-900 border border-slate-700 p-3 shadow-xl font-mono text-xs text-slate-100 flex flex-col gap-1 rounded">
                          <div className="font-bold text-emerald-400 border-b border-slate-800 pb-1">
                            TIMESTEP: {label}
                          </div>
                          {item.actual !== undefined && (
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-400">Actual Stock:</span>
                              <span className="text-white font-bold tabular-nums">{item.actual.toLocaleString()} L</span>
                            </div>
                          )}
                          {item.predicted !== undefined && (
                            <div className="flex justify-between gap-4">
                              <span className="text-emerald-400">Predicted (p50):</span>
                              <span className="text-emerald-300 font-bold tabular-nums">{item.predicted.toLocaleString()} L</span>
                            </div>
                          )}
                          {item.lower_bound !== undefined && item.upper_bound !== undefined && (
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-400">p10–p90 Range:</span>
                              <span className="text-amber-400 font-bold tabular-nums">
                                {item.lower_bound.toLocaleString()}L – {item.upper_bound.toLocaleString()}L
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between gap-4 border-t border-slate-800 pt-1 text-[10px]">
                            <span className="text-rose-400">Buffer Minimum:</span>
                            <span className="text-rose-300 tabular-nums">3,500 L</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                {/* Reference Minimum Buffer Line */}
                <ReferenceLine
                  y={3500}
                  stroke="#f43f5e"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{ value: 'BUFFER MINIMUM (3,500 L)', fill: '#f43f5e', fontSize: 10, position: 'top' }}
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

        {/* RIGHT 30% (4 COLS): Clean Summary Card */}
        <div className="lg:col-span-4 rounded-md bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-5 flex flex-col gap-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <h3 className="font-mono text-xs uppercase font-bold tracking-wider text-slate-900 dark:text-white">
                Forecast Summary
              </h3>
            </div>
            <span className="font-mono text-[10px] text-slate-500 uppercase">
              MODEL SIGMA-2
            </span>
          </div>

          {/* Metric 1: Predicted Demand */}
          <div className="p-3.5 rounded bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between font-mono text-[10px] text-slate-500 uppercase font-bold">
              <span>Predicted Demand</span>
              <Fuel className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="my-1.5 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {data?.predicted_demand?.toLocaleString() ?? '3,850'} L
              </span>
            </div>
            <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800/60">
              <span>p10–p90 Range:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
                {data?.lower_bound?.toLocaleString() ?? '3,200'}L – {data?.upper_bound?.toLocaleString() ?? '4,500'}L
              </span>
            </div>
          </div>

          {/* Metric 2: Stockout Risk % */}
          <div className="p-3.5 rounded bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between font-mono text-[10px] text-slate-500 uppercase font-bold">
              <span>Stockout Risk</span>
              <ShieldAlert className="w-4 h-4 text-rose-500" />
            </div>
            <div className="my-1.5 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
                {formatProbability(data?.stockout_risk ?? 87)}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                HIGH THREAT
              </span>
            </div>
            <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800/60">
              <span>Depletion Horizon:</span>
              <span className="text-rose-500 font-bold">Within 36h</span>
            </div>
          </div>

          {/* Metric 3: Days of Supply */}
          <div className="p-3.5 rounded bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between font-mono text-[10px] text-slate-500 uppercase font-bold">
              <span>Days of Supply (Stock / Burn)</span>
              <Calendar className="w-4 h-4 text-amber-500" />
            </div>
            <div className="my-1.5 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
                {data?.days_of_supply ?? 1.4} d
              </span>
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                (~{Math.round((data?.days_of_supply ?? 1.4) * 24)}h runtime)
              </span>
            </div>
            <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800/60">
              <span title="Formula: Days Remaining = Current Stock / Daily Burn Rate. (Excl. 15% Reserve: (Current Stock - 15% Buffer) / Daily Burn Rate)">
                Formula Match:
              </span>
              <span className="text-amber-500 font-semibold tabular-nums">
                {data?.current_stock ?? 320}L / 235L/d = {data?.days_of_supply ?? 1.4}d (1.1d usable)
              </span>
            </div>
          </div>

          {/* Model Status & Causal Factor Pills */}
          <div className="p-3.5 rounded bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-col gap-2.5 font-mono text-xs">
            <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-500">
              <span>Anomaly Detection</span>
              {data?.anomaly_flag ? (
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 text-[9px] font-bold">
                  FLAGGED
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 text-[9px] font-bold">
                  NOMINAL
                </span>
              )}
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1.5">
                Causal Risk Factors:
              </span>
              <div className="flex flex-col gap-1.5">
                {(data?.top_factors || [
                  'Sub-zero cold snap (-28°C)',
                  '24h perimeter gen-set cycle',
                  'Zoji La avalanche closure',
                ]).slice(0, 3).map((factor, idx) => (
                  <div
                    key={idx}
                    className="px-2.5 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                    <span className="truncate">{factor}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
