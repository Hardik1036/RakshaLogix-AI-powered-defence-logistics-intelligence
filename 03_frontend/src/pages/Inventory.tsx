import React, { useState, useEffect } from 'react';
import { api, calculateDaysRemaining } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useAppState } from '../context/AppStateContext';
import type { InventoryItem, InventoryDetail } from '../types/api';
import { 
  Boxes, 
  RefreshCw, 
  Search, 
  ChevronRight, 
  X, 
  Thermometer, 
  Mountain, 
  Rocket, 
  AlertTriangle,
  Loader2,
  Gauge,
  Lock
} from 'lucide-react';
import { ServerLoader } from '../components/ServerLoader';

type FilterTab = 'all' | 'high_altitude' | 'critical_fuel';

export const Inventory: React.FC = () => {
  const { isReadOnly } = useAuth();
  const { addToast } = useToast();
  const { addConvoy } = useAppState();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  // Side Drawer State for Progressive Disclosure
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [drawerDetail, setDrawerDetail] = useState<InventoryDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [dispatchingEmergency, setDispatchingEmergency] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setRefreshing(true);
      const res = await api.getInventory();
      setItems(res);
      addToast('Inventory telemetry synchronized with theater depots', 'info');
    } catch {
      addToast('Failed to fetch inventory data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleViewDetails = async (unitId: string) => {
    setSelectedUnitId(unitId);
    try {
      setDrawerLoading(true);
      const detail = await api.getInventoryDetail(unitId);
      setDrawerDetail(detail);
    } catch {
      addToast(`Failed to load details for unit ${unitId}`, 'error');
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleEmergencyReplenishment = async () => {
    if (isReadOnly) return;
    if (!drawerDetail) return;

    try {
      setDispatchingEmergency(true);
      
      // Dispatch and register directly in AppStateContext
      const newCvy = addConvoy({
        convoy_id: `CNV-EMG-${String(Math.floor(Math.random() * 80) + 10)}`,
        origin_depot: 'Kargil Forward Depot [UNIT_02]',
        destination: `${drawerDetail.name} [${drawerDetail.unit_id}]`,
        vehicle_count: 4,
        cargo_manifest: `${drawerDetail.commodity} (20,000L)`,
        eta_countdown: '02h : 45m',
        eta_seconds: 9900,
        status: 'IN_TRANSIT',
        escort_type: '2x BMP-2 Armored MP',
        priority: 'DEFCON-2 EMERGENCY',
      });

      await api.createConvoy({
        origin_depot: 'Kargil Forward Depot [UNIT_02]',
        destination: `${drawerDetail.name} [${drawerDetail.unit_id}]`,
        vehicle_count: 4,
        cargo_type: drawerDetail.commodity,
        manifest_quantity: '20,000 Litres',
        escort_type: '2x BMP-2 Armored MP',
        priority_level: 'DEFCON-2 EMERGENCY',
        bypass_pass: 'Pass Echo / South Ridge Bypass',
      }).catch(() => null);

      addToast(
        `✓ Emergency convoy ${newCvy.convoy_id} dispatched to ${drawerDetail.name}`,
        'success'
      );
    } catch {
      addToast('Failed to dispatch emergency replenishment.', 'error');
    } finally {
      setDispatchingEmergency(false);
    }
  };

  // Filter & Search logic
  const filteredItems = items.filter((item) => {
    if (activeTab === 'high_altitude' && !item.is_high_altitude) return false;
    if (activeTab === 'critical_fuel' && !item.critical_fuel_48h) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchSector = item.sector.toLowerCase().includes(q);
      const matchCommodity = item.commodity.toLowerCase().includes(q);
      const matchId = item.unit_id.toLowerCase().includes(q);
      return matchName || matchSector || matchCommodity || matchId;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h1 className="font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wider">
              FORWARD INVENTORY MATRIX // OPERATIONAL RUNWAY
            </h1>
          </div>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
            Class-III (POL Fuel) &amp; Class-V (Ammunition) Depletion Risk Ledger
          </p>
        </div>

        <button
          type="button"
          onClick={fetchInventory}
          disabled={refreshing}
          className="px-3.5 py-1.5 rounded-md bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono text-xs font-bold border border-slate-300 dark:border-slate-700 transition-all shadow-xs flex items-center gap-1.5 self-start md:self-center disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-500' : ''}`} />
          <span>{refreshing ? 'REFRESHING LEDGER...' : 'REFRESH DATA'}</span>
        </button>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900/60 p-2.5 rounded-md border border-slate-200 dark:border-slate-800/80">
        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded transition-all font-semibold ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Sectors ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('high_altitude')}
            className={`px-3 py-1.5 rounded transition-all font-semibold ${
              activeTab === 'high_altitude'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            High-Altitude Only
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('critical_fuel')}
            className={`px-3 py-1.5 rounded transition-all font-semibold flex items-center gap-1 ${
              activeTab === 'critical_fuel'
                ? 'bg-rose-600 text-white font-bold shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Critical Fuel &lt;48h</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative flex items-center w-full sm:w-72 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5">
          <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search unit, sector, or SKU..."
            className="w-full bg-transparent font-mono text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Split: Scannable Main Table (<3s Triage) + Slide-over Drawer */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Table Container */}
        <div
          className={`${
            selectedUnitId ? 'xl:col-span-8' : 'xl:col-span-12'
          } rounded-md bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-xs transition-all overflow-hidden`}
        >
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                FORWARD STOCK MATRIX
              </span>
              <span className="text-[10px] text-slate-500 font-mono hidden md:inline">
                • Formula: Days of Supply = Current Stock / Daily Burn Rate (Excl. 15% Reserve: (Stock - 15% Buffer) / Burn)
              </span>
            </div>
            <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
              RECORDED NODES: {filteredItems.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800/80 bg-slate-100/50 dark:bg-slate-950/30 text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3">Unit Name</th>
                  <th className="py-3 px-3">Commodity</th>
                  <th className="py-3 px-3 text-right">Current Stock</th>
                  <th className="py-3 px-3 text-right">Daily Burn</th>
                  <th className="py-3 px-3 text-center" title="Days of Supply = Current Stock / Daily Burn Rate (1 decimal precision)">Days of Supply (Stock / Burn)</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center">
                      <ServerLoader message="Connecting to server... (may take up to 60s on first request)" />
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No matching forward inventory units found.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr
                      key={item.unit_id}
                      onClick={() => handleViewDetails(item.unit_id)}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer ${
                        selectedUnitId === item.unit_id
                          ? 'bg-slate-100 dark:bg-slate-800/60 border-l-2 border-emerald-500'
                          : ''
                      }`}
                    >
                      {/* 1. Unit Name */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {item.name}
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          [{item.unit_id}] • {item.sector}
                        </span>
                      </td>

                      {/* 2. Commodity */}
                      <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                        {item.commodity}
                      </td>

                      {/* 3. Current Stock */}
                      <td className="py-2.5 px-3 text-right text-slate-900 dark:text-white font-bold tabular-nums">
                        {item.on_hand.toLocaleString()} {item.unit}
                      </td>

                      {/* 4. Daily Burn */}
                      <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400 tabular-nums">
                        {item.daily_burn.toLocaleString()} {item.unit}/d
                      </td>

                      {/* 5. Days Remaining (Clean Red <3d, Amber 3-7d, Green >7d pill badges with math tooltip) */}
                      <td className="py-2.5 px-3 text-center">
                        <div
                          title={`${item.on_hand.toLocaleString()} ${item.unit} / ${item.daily_burn.toLocaleString()} ${item.unit}/d = ${item.runway_days.toFixed(1)} days of supply (Excl. 15% reserve: ${calculateDaysRemaining(item.on_hand, item.daily_burn, item.on_hand * 0.15)}d)`}
                          className="inline-block cursor-help"
                        >
                          {item.runway_days < 3 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 tabular-nums">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              {item.runway_days.toFixed(1)}d (&lt;3d)
                            </span>
                          ) : item.runway_days <= 7 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 tabular-nums">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              {item.runway_days.toFixed(1)}d (3–7d)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 tabular-nums">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              {item.runway_days.toFixed(1)}d (&gt;7d)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 6. Action: [View Details] */}
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(item.unit_id);
                          }}
                          className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-all inline-flex items-center gap-1"
                        >
                          <span>[View Unit Details]</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* =========================================================================
            SLIDE-OVER DRAWER: Secondary telemetry, Buffer Bar, 14-Day Ledger & Emergency Dispatch
            ========================================================================= */}
        {selectedUnitId && (
          <div className="xl:col-span-4 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-5 flex flex-col gap-4 transition-all tactical-drawer-enter">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Mountain className="w-4 h-4 text-emerald-500" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase">
                    {drawerDetail?.name || selectedUnitId}
                  </h3>
                  <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                    SECONDARY TELEMETRY &amp; 14-DAY AUDIT
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUnitId(null)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                title="Close Drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {drawerLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500 font-mono text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                <span>LOADING SECONDARY TELEMETRY...</span>
              </div>
            ) : drawerDetail ? (
              <>
                {/* Secondary Telemetry: Elevation & Sub-Zero Temperature */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 font-mono text-xs">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Elevation</span>
                    <div className="flex items-center gap-1 font-bold text-slate-900 dark:text-white tabular-nums">
                      <Mountain className="w-3.5 h-3.5 text-cyan-500" />
                      <span>{drawerDetail.elevation_ft.toLocaleString()} FT</span>
                    </div>
                    <span className="text-[9px] text-slate-400">Hypoxia Risk Tier-3</span>
                  </div>

                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 font-mono text-xs">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Temperature</span>
                    <div className="flex items-center gap-1 font-bold text-amber-500 tabular-nums">
                      <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                      <span>{drawerDetail.temperature_c}°C SUB-ZERO</span>
                    </div>
                    <span className="text-[9px] text-rose-500">Gelling Threat Active</span>
                  </div>
                </div>

                {/* Minimum/Maximum Buffer Progress Bar (Requirement) */}
                <div className="p-3 rounded bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-col gap-1.5 font-mono text-xs">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Gauge className="w-3.5 h-3.5 text-emerald-500" />
                      Buffer Thresholds
                    </span>
                    <span className="tabular-nums text-slate-700 dark:text-slate-300">
                      Current: 4,200L / Max: 20,000L
                    </span>
                  </div>
                  {/* Progress track */}
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden relative">
                    {/* Minimum safety threshold marker (3500L = 17.5%) */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10"
                      style={{ left: '17.5%' }}
                      title="Min Buffer: 3,500L"
                    ></div>
                    {/* Actual fill */}
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{ width: `${Math.min(100, (4200 / 20000) * 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                    <span className="text-rose-500 font-semibold">Min Buffer: 3,500L</span>
                    <span>Max Capacity: 20,000L</span>
                  </div>
                </div>

                {/* 14-Day Visual Burn Ledger */}
                <div className="p-3.5 rounded bg-slate-950 text-slate-100 border border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      14-Day Burn Ledger (POL-88)
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-mono text-[9px] font-bold tabular-nums">
                      +{drawerDetail.spike_percentage}% SPIKE
                    </span>
                  </div>

                  {/* Visual Bar Columns */}
                  <div className="w-full h-28 flex items-end justify-between gap-1 pt-3">
                    {drawerDetail.burn_ledger_14d.map((entry, idx) => {
                      const maxBurn = 1300;
                      const heightPercent = Math.min(100, Math.round((entry.burn_litres / maxBurn) * 100));
                      const isToday = entry.is_today;

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group">
                          <span className="text-[8px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
                            {entry.burn_litres}L
                          </span>
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className={`w-full rounded-t transition-all ${
                              isToday
                                ? 'bg-rose-500 shadow-sm'
                                : entry.burn_litres > 800
                                ? 'bg-amber-500'
                                : 'bg-slate-600 hover:bg-slate-400'
                            }`}
                          ></div>
                          <span
                            className={`text-[8px] font-mono mt-1 ${
                              isToday ? 'text-rose-400 font-bold' : 'text-slate-500'
                            }`}
                          >
                            {isToday ? 'TODAY' : entry.day.replace('D-', '')}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Compact Status Chips replacing text paragraph */}
                  <div className="flex flex-wrap items-center justify-center gap-1.5 border-t border-slate-800 pt-2.5 mt-1 text-xs">
                    <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 font-medium flex items-center gap-1">
                      <span>🔥</span> Heaters: Continuous
                    </span>
                    <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-medium flex items-center gap-1">
                      <span>📡</span> Radar Gen: Active
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium flex items-center gap-1">
                      <span>⚡</span> +18% Surge
                    </span>
                  </div>
                </div>

                {/* Rapid Logistics Appraisal */}
                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 text-xs flex flex-col gap-2 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 uppercase font-semibold">
                    <span>Rapid Logistics Appraisal</span>
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Runway to Dry Tanks:</span>
                    <span className="font-mono-num font-bold text-rose-600 dark:text-rose-400">
                      {(drawerDetail.runway_days * 24).toFixed(0)} Hours ({drawerDetail.runway_days}d)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Nearest Convoy:</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium">
                      {drawerDetail.nearest_convoy}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Route Status:</span>
                    <span className="text-amber-500 font-medium">
                      {drawerDetail.route_status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Overland ETA:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono-num">
                      {drawerDetail.overland_eta}
                    </span>
                  </div>
                </div>

                {/* Emergency Replenishment Button */}
                <button
                  type="button"
                  disabled={isReadOnly || dispatchingEmergency}
                  onClick={handleEmergencyReplenishment}
                  title={isReadOnly ? 'Requires Command Clearance' : 'Dispatch immediate emergency replenishment convoy'}
                  className={`w-full py-2.5 px-3 rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 ${
                    isReadOnly
                      ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700'
                      : 'bg-rose-600 hover:bg-rose-500 text-white active:scale-95 shadow-rose-600/20'
                  }`}
                >
                  {dispatchingEmergency ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Dispatching Emergency Convoy...</span>
                    </>
                  ) : isReadOnly ? (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Requires Command Clearance</span>
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4" />
                      <span>Initiate Emergency Replenishment</span>
                    </>
                  )}
                </button>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
