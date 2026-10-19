import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import type { SimulationResponse } from '../types/api';
import { 
  Cpu, 
  RotateCcw, 
  Play, 
  AlertTriangle, 
  ThermometerSnowflake, 
  Flame, 
  Loader2,
  Bot
} from 'lucide-react';
import { ServerLoader } from '../components/ServerLoader';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';

export const Simulation: React.FC = () => {
  const { theme } = useTheme();
  const { addToast } = useToast();

  // Sliders and controls state
  const [demandMultiplier, setDemandMultiplier] = useState(2.2);
  const [snowDepth, setSnowDepth] = useState(65);
  const [passCutoff, setPassCutoff] = useState<'zojila' | 'echo' | 'none'>('zojila');

  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    executeSimulation();
  }, []);

  const executeSimulation = async () => {
    try {
      setLoading(true);
      const res = await api.runSimulation({
        demand_multiplier: demandMultiplier,
        snow_depth_mm: snowDepth,
        pass_cutoff: passCutoff,
      });
      setResult(res);
      addToast(
        `Simulation calculated: ${demandMultiplier.toFixed(1)}x Demand, ${snowDepth}mm Snow, ${passCutoff.toUpperCase()} Pass`,
        'info'
      );
    } catch {
      addToast('Failed to run simulation scenario.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Requirement: [Reset Scenario] cleanly restores baseline state (1.0x, 0mm, open passes)
  const handleReset = async () => {
    setDemandMultiplier(1.0);
    setSnowDepth(0);
    setPassCutoff('none');
    try {
      setLoading(true);
      const res = await api.runSimulation({
        demand_multiplier: 1.0,
        snow_depth_mm: 0,
        pass_cutoff: 'none',
      });
      setResult(res);
      addToast('Scenario parameters reset to baseline nominal defaults (1.0x, 0mm, clear corridors)', 'info');
    } catch {
      addToast('Failed to reset simulation baseline.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const gridColor = theme === 'dark' ? '#1e293b' : '#e2e8f0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h1 className="font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wider">
              SIMULATION LAB // WHAT-IF SCENARIO STRESS TESTING
            </h1>
          </div>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
            Stochastic Fuel Consumption Surges, Extreme Precipitation, and Chokepoint Interdictions
          </p>
        </div>
      </div>

      {/* Loading state for cold starts */}
      {loading && !result && (
        <ServerLoader message="Connecting to simulation server... (may take up to 60s on first request)" />
      )}

      {/* Main Grid: Controls (4 cols) & Impact Analysis / Graph (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Controls & Sliders */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900/60 p-5 rounded-md border border-slate-200 dark:border-slate-800/80 flex flex-col gap-4 font-mono text-xs shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-2">
            <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              SCENARIO PARAMETERS
            </span>
            <span className="text-[10px] text-slate-500 uppercase font-bold">MONTE CARLO</span>
          </div>

          {/* Slider 1: Demand Multiplier (1.0x - 3.0x) */}
          <div className="flex flex-col gap-1.5 p-3 rounded bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-500" />
                DEMAND MULTIPLIER:
              </label>
              <span className="font-bold text-sm text-rose-600 dark:text-rose-400 tabular-nums">
                {demandMultiplier.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="1.0"
              max="3.0"
              step="0.1"
              value={demandMultiplier}
              onChange={(e) => setDemandMultiplier(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>1.0x (Nominal)</span>
              <span>2.0x</span>
              <span>3.0x (War-Footing)</span>
            </div>
          </div>

          {/* Slider 2: Snow Depth Accumulation (0 - 100 mm) */}
          <div className="flex flex-col gap-1.5 p-3 rounded bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ThermometerSnowflake className="w-3.5 h-3.5 text-cyan-500" />
                SNOW ACCUMULATION:
              </label>
              <span className="font-bold text-sm text-cyan-600 dark:text-cyan-400 tabular-nums">
                {snowDepth} mm/h
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={snowDepth}
              onChange={(e) => setSnowDepth(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0 mm</span>
              <span>25 mm</span>
              <span>50 mm</span>
              <span>100 mm (Cat-3)</span>
            </div>
          </div>

          {/* Pass Cutoff Arterial Corridor Radio/Toggle */}
          <div className="flex flex-col gap-1.5 p-3 rounded bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
            <label className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1 uppercase">
              MOUNTAIN PASS STATUS:
            </label>
            <div className="flex flex-col gap-1.5">
              <label
                className={`p-2 rounded border cursor-pointer flex items-center justify-between transition-colors ${
                  passCutoff === 'zojila'
                    ? 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    : 'border-slate-200 dark:border-slate-800 bg-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="pass"
                    checked={passCutoff === 'zojila'}
                    onChange={() => setPassCutoff('zojila')}
                    className="sr-only"
                  />
                  <span className="font-bold">Zojila Pass (Axis-Alpha)</span>
                </div>
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-600 text-white">
                  CUTOFF
                </span>
              </label>

              <label
                className={`p-2 rounded border cursor-pointer flex items-center justify-between transition-colors ${
                  passCutoff === 'echo'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'border-slate-200 dark:border-slate-800 bg-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="pass"
                    checked={passCutoff === 'echo'}
                    onChange={() => setPassCutoff('echo')}
                    className="sr-only"
                  />
                  <span className="font-bold">Pass Echo (NH-1D Bypass)</span>
                </div>
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500 text-slate-950">
                  HIGH RISK
                </span>
              </label>

              <label
                className={`p-2 rounded border cursor-pointer flex items-center justify-between transition-colors ${
                  passCutoff === 'none'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-slate-200 dark:border-slate-800 bg-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="pass"
                    checked={passCutoff === 'none'}
                    onChange={() => setPassCutoff('none')}
                    className="sr-only"
                  />
                  <span className="font-bold">All Corridors Open</span>
                </div>
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                  CLEAR PASS
                </span>
              </label>
            </div>
          </div>

          {/* Action Triggers: [Reset Scenario] & [Run Simulation] */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/80">
            {/* Reset Scenario Button */}
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 py-2 px-3 rounded-md bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold uppercase transition-all flex items-center justify-center gap-1.5 text-xs shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Scenario</span>
            </button>

            {/* Run Simulation Button */}
            <button
              type="button"
              disabled={loading}
              onClick={executeSimulation}
              className="flex-1 py-2 px-3 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold uppercase transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95 disabled:opacity-60 text-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>CALCULATING...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Simulation</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Comparison Cards and Trajectory Graph */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {/* Comparison Cards: Baseline vs Simulated */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            {/* Card 1: BASELINE SCENARIO */}
            <div className="bg-white dark:bg-slate-900/60 rounded-md border border-slate-200 dark:border-slate-800/80 p-4 flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800/80 mb-3">
                  <span className="font-bold text-slate-700 dark:text-slate-300 uppercase">
                    BASELINE SCENARIO
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold">
                    NOMINAL
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-[10px] tabular-nums">
                      {result?.baseline.outposts_at_risk ?? 1} OUTPOST AT RISK
                    </span>
                    <span className="text-[10px] text-slate-400">STRESS: 1.0X</span>
                  </div>

                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase block font-semibold">PRIMARY IMPACT</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {result?.baseline.impacted_node ?? 'FOB Charlie: Stockout in 34h'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 text-[11px] pt-1">
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1">
                      <span className="text-slate-500">Depletion Rate:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                        {result?.baseline.depletion_rate ?? 'Normal 620 L/d'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1">
                      <span className="text-slate-500">Pass Status:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        {result?.baseline.pass_status ?? 'Open (Marginal)'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between mt-3 font-bold">
                <span className="text-slate-500">TOTAL DEFICIT</span>
                <span className="text-amber-500 text-sm tabular-nums">
                  {result?.baseline.total_deficit ?? '-3,850 L'}
                </span>
              </div>
            </div>

            {/* Card 2: SIMULATED SCENARIO */}
            <div className="bg-white dark:bg-slate-900/60 rounded-md border border-slate-200 dark:border-slate-800 border-l-4 border-l-rose-500 p-4 flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800/80 mb-3">
                  <span className="font-bold text-rose-600 dark:text-rose-400 uppercase flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    SIMULATED SCENARIO
                  </span>
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold tabular-nums">
                    {result?.simulated.surge_label ?? `SURGE ${demandMultiplier.toFixed(1)}X`}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap justify-between items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold text-[10px] tabular-nums">
                      +{result?.new_critical_stockouts ?? Math.max(0, (result?.simulated.outposts_at_risk || 1) - 1)} NEW CRITICAL STOCKOUTS
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold text-[10px] tabular-nums">
                      +{result?.avg_convoy_delay_hours ?? 1.2}h AVG CONVOY DELAY
                    </span>
                  </div>

                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-rose-500 uppercase block font-semibold">FIRST COLLAPSE NODE</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                      {result?.simulated.dryout_node ?? 'FOB Charlie'}: Dry Tanks in {result?.simulated.dryout_hours ?? 14}h
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {result?.simulated.impacted_outposts?.map((outpost, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-[10px] tabular-nums"
                      >
                        {outpost.name} (T-{outpost.stockout_hours}h)
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between mt-3 font-bold">
                <span className="text-rose-600 dark:text-rose-400">TOTAL DEFICIT</span>
                <span className="text-rose-600 dark:text-rose-400 text-base tabular-nums">
                  {result?.simulated.total_deficit ?? '-14,550 L'}
                </span>
              </div>
            </div>
          </div>

          {/* TACTICAL RESUPPLY RECOMMENDATION ACTION CARD */}
          <div className="p-4 rounded-md bg-white dark:bg-slate-900/80 border border-emerald-500/40 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 font-mono text-xs">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded bg-emerald-500/10 text-emerald-500 shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-[11px]">
                    TACTICAL RESUPPLY DIRECTIVE
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-[9px]">
                    SIMULATION AI
                  </span>
                </div>
                <p className="text-slate-800 dark:text-slate-200 font-semibold text-xs mt-0.5">
                  {result?.recommended_action ??
                    'AUTHORIZE PRIORITY DISPATCH: 4x Heavy Fuel Tankers with snow chains via NH-1D Green Corridor.'}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  <span>Pass Status: <strong className="text-slate-700 dark:text-slate-300">{passCutoff === 'zojila' ? 'Zoji La Blocked' : passCutoff === 'echo' ? 'Pass Echo Blocked' : 'All Passes Clear'}</strong></span>
                  <span>•</span>
                  <span>Deficit Delta: <strong className="text-rose-600 dark:text-rose-400 tabular-nums">{result?.simulated.total_deficit}</strong></span>
                  <span>•</span>
                  <span>Delay Impact: <strong className="text-amber-500 tabular-nums">+{result?.avg_convoy_delay_hours ?? 1.2}h</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-center shrink-0">
              <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px] uppercase border border-slate-200 dark:border-slate-700">
                PROPORTIONAL DYNAMICS
              </span>
            </div>
          </div>

          {/* DUAL TRAJECTORY GRAPH CANVAS */}
          <div className="p-5 rounded-md bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 flex flex-col gap-3 shadow-xs font-mono text-xs">
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800/80 gap-2">
              <span className="font-bold uppercase text-slate-800 dark:text-slate-200">
                48H Stock Depletion Trajectory (Baseline vs Simulated)
              </span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-0.5 bg-emerald-500 inline-block"></span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Baseline</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-0.5 border-b-2 border-dashed border-rose-500 inline-block"></span>
                  <span className="text-rose-500 font-semibold">Simulated</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-0.5 border-b-2 border-dotted border-amber-500 inline-block"></span>
                  <span className="text-amber-500">Buffer (10 kL)</span>
                </div>
              </div>
            </div>

            <div className="w-full h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={result?.trajectory || []}
                  margin={{ top: 15, right: 15, left: 10, bottom: 15 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis
                    dataKey="time"
                    stroke={theme === 'dark' ? '#64748b' : '#94a3b8'}
                    tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  />
                  <YAxis
                    stroke={theme === 'dark' ? '#64748b' : '#94a3b8'}
                    tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                    unit=" kL"
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0]?.payload;
                        return (
                          <div className="bg-slate-900 border border-slate-700 p-2.5 font-mono text-xs text-slate-100 flex flex-col gap-1 shadow-xl rounded">
                            <span className="font-bold text-emerald-400 border-b border-slate-800 pb-1">
                              TIMESTEP: {label}
                            </span>
                            <div className="flex justify-between gap-4">
                              <span className="text-emerald-300">Baseline Reserve:</span>
                              <span className="font-bold text-white tabular-nums">{d.baseline_kl.toFixed(1)} kL</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-rose-400">Simulated Reserve:</span>
                              <span className="font-bold text-rose-300 tabular-nums">{d.simulated_kl.toFixed(1)} kL</span>
                            </div>
                            <div className="flex justify-between gap-4 border-t border-slate-800 pt-1 text-[10px]">
                              <span className="text-amber-400">Safety Buffer:</span>
                              <span className="tabular-nums">10.0 kL</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    y={10.0}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{ value: 'CRITICAL BUFFER (10 kL)', fill: '#f59e0b', fontSize: 10, position: 'top' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="baseline_kl"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: '#10b981' }}
                    name="Baseline"
                  />
                  <Line
                    type="monotone"
                    dataKey="simulated_kl"
                    stroke="#f43f5e"
                    strokeWidth={2.5}
                    strokeDasharray="6 4"
                    dot={{ r: 3.5, fill: '#f43f5e' }}
                    name="Simulated"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
