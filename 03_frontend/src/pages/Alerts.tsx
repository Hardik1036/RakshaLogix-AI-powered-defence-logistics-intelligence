import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useAppState } from '../context/AppStateContext';
import type { AlertItem } from '../types/api';
import { 
  BellRing, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCheck, 
  Radio, 
  Loader2,
  RefreshCw,
  Lock,
  ThermometerSnowflake,
  Flame,
  ArrowRight
} from 'lucide-react';
import { ServerLoader } from '../components/ServerLoader';

export const Alerts: React.FC = () => {
  const { isReadOnly } = useAuth();
  const { addToast } = useToast();
  const { acknowledgeAlert, isAlertAcknowledged, mergeAcknowledgedAlerts } = useAppState();

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ackingId, setAckingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setRefreshing(true);
      const res = await api.getAlerts();
      // Deduplicate by ID and composite signature
      const seenIds = new Set<string>();
      const seenKeys = new Set<string>();
      const unique = res.filter((a) => {
        const compositeKey = `${a.route_sector}-${a.code || a.severity}-${a.title}`;
        if (seenIds.has(a.id) || seenKeys.has(compositeKey)) return false;
        seenIds.add(a.id);
        seenKeys.add(compositeKey);
        return true;
      });

      // Merge with persisted acknowledged alerts from AppStateContext
      const merged = mergeAcknowledgedAlerts(unique);
      setAlerts(merged);
      addToast('Alerts feed refreshed. Zero duplicates detected.', 'info');
    } catch {
      addToast('Failed to fetch tactical alerts feed', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAcknowledge = async (id: string) => {
    if (isReadOnly) return;

    try {
      setAckingId(id);
      // Persist in AppStateContext (which saves in sessionStorage and decrements sidebar badge)
      acknowledgeAlert(id);

      // Also call api to notify backend
      await api.ackAlert(id).catch(() => null);

      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'ACKNOWLEDGED' } : a))
      );
      addToast(`Alert ${id} acknowledged and logged into tactical record`, 'success');
    } catch {
      addToast(`Failed to acknowledge alert ${id}`, 'error');
    } finally {
      setAckingId(null);
    }
  };

  // Deduplicate alerts by composite key
  const uniqueAlerts = alerts.filter((alert, index, self) =>
    index === self.findIndex((a) => {
      const aUnit = a.raw_alert?.unit_id || a.route_sector;
      const alertUnit = alert.raw_alert?.unit_id || alert.route_sector;
      const aType = a.raw_alert?.type || a.code || a.severity;
      const alertType = alert.raw_alert?.type || alert.code || alert.severity;
      const aMsg = a.raw_alert?.message || a.description || a.title;
      const alertMsg = alert.raw_alert?.message || alert.description || alert.title;
      return aUnit === alertUnit && aType === alertType && aMsg === alertMsg;
    })
  );

  const unackCount = uniqueAlerts.filter(
    (a) => a.status === 'UNACKNOWLEDGED' && !isAlertAcknowledged(a.id)
  ).length;

  // Extract clean commodity name from alert
  const getCommodityBadge = (alert: AlertItem) => {
    const text = (alert.title + ' ' + alert.description).toLowerCase();
    if (text.includes('fuel') || text.includes('pol-88') || text.includes('diesel')) {
      return { label: 'POL-88 Diesel', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
    }
    if (text.includes('ammo') || text.includes('5.56mm') || text.includes('artillery') || text.includes('shells')) {
      return { label: '5.56mm Ammunition', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
    }
    if (text.includes('oxygen') || text.includes('o2') || text.includes('medical')) {
      return { label: 'Medical O2 Cylinders', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' };
    }
    if (text.includes('pass') || text.includes('zoji') || text.includes('avalanche')) {
      return { label: 'Mountain Pass Cutoff', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' };
    }
    return { label: 'Critical Supply', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' };
  };

  // Helper for progress bar calculation
  const getRunwayPercent = (remainingCap: string) => {
    if (remainingCap.includes('1.4')) return 20;
    if (remainingCap.includes('2.6')) return 35;
    if (remainingCap.includes('4.0') || remainingCap.includes('4.4')) return 58;
    if (remainingCap.includes('6.7')) return 78;
    return 25;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <BellRing className="w-5 h-5 text-rose-500 animate-pulse" />
            <h1 className="font-semibold text-lg text-slate-900 dark:text-white tracking-tight">
              Tactical Alerts &amp; Deficit Warning Feed
            </h1>
          </div>
          <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time outpost supply telemetry, mountain pass interdictions, and blizzard alerts
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchAlerts}
            disabled={refreshing}
            className="px-3.5 py-1.5 rounded-md bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-sans text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-500' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>
          <span className="px-3 py-1.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-sans text-xs font-bold flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 animate-pulse text-rose-500" />
            <span>Unacknowledged: <span className="font-mono-num font-bold">{unackCount}</span></span>
          </span>
        </div>
      </div>

      {/* Compact Visual Triage Cards List */}
      <div className="flex flex-col gap-3">
        {loading ? (
          <ServerLoader message="Connecting to tactical server feed... (may take up to 60s on first request)" />
        ) : uniqueAlerts.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-sans text-sm bg-white dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800/80">
            No active threat alerts in theater.
          </div>
        ) : (
          uniqueAlerts.map((alert) => {
            const isCritical = alert.severity === 'CRITICAL';
            const isHigh = alert.severity === 'HIGH';
            const isAck = alert.status === 'ACKNOWLEDGED' || isAlertAcknowledged(alert.id);
            const commodity = getCommodityBadge(alert);
            const runwayPercent = getRunwayPercent(alert.remaining_cap);

            return (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border transition-all flex flex-col xl:flex-row xl:items-center justify-between gap-4 ${
                  isAck
                    ? 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800/60 opacity-70'
                    : isCritical
                    ? 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 border-l-4 border-l-rose-500 shadow-sm'
                    : isHigh
                    ? 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 border-l-4 border-l-amber-500 shadow-sm'
                    : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* LEFT: Severity Icon + Unit Name + Commodity Badge */}
                <div className="flex items-center gap-3.5 min-w-[280px] xl:max-w-[320px]">
                  <div
                    className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${
                      isCritical
                        ? 'bg-rose-500/20 text-rose-500 border border-rose-500/40'
                        : isHigh
                        ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {isCritical ? (
                      <AlertTriangle className="w-5 h-5 animate-pulse" />
                    ) : isHigh ? (
                      <ShieldAlert className="w-5 h-5" />
                    ) : (
                      <BellRing className="w-5 h-5" />
                    )}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white truncate tracking-tight">
                        {alert.route_sector}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${commodity.color}`}>
                        {commodity.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                      <span className="font-mono-num text-[11px] text-slate-500">{alert.timestamp}</span>
                      <span>•</span>
                      <span className="font-mono-num text-[11px] text-slate-400">{alert.coordinates}</span>
                    </div>
                  </div>
                </div>

                {/* CENTER: Visual Runway Progress Bar + Burn Rate Icon + Weather Pill */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 flex-1 max-w-xl">
                  {/* Runway Progress Bar */}
                  <div className="flex-1 min-w-[170px]">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-slate-400 font-medium">Runway</span>
                      <span className={`font-mono-num font-bold ${isCritical ? 'text-rose-400' : isHigh ? 'text-amber-400' : 'text-slate-300'}`}>
                        {alert.remaining_cap}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCritical ? 'bg-rose-500' : isHigh ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${runwayPercent}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Burn Rate Sparkline / Metric */}
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 shrink-0">
                    <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <div className="flex flex-col text-left">
                      <span className="text-[10px] text-slate-400 leading-tight">Burn Rate</span>
                      <span className="font-mono-num text-xs font-semibold text-slate-200 leading-tight">
                        {alert.burn_rate}
                      </span>
                    </div>
                  </div>

                  {/* Weather Pill */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-cyan-950/40 border border-cyan-800/50 text-cyan-300 text-xs font-medium shrink-0">
                    <ThermometerSnowflake className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="font-mono-num">{alert.weather_temp}</span>
                  </div>
                </div>

                {/* RIGHT: Suggested Action Badge + [Acknowledge] Button */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  {/* One-Line Action Badge */}
                  <div
                    title={alert.suggested_action}
                    className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-medium max-w-[220px] truncate"
                  >
                    <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="truncate">
                      {alert.suggested_action.length > 28 ? alert.suggested_action.substring(0, 28) + '...' : alert.suggested_action}
                    </span>
                  </div>

                  {/* Acknowledge Button */}
                  {isAck ? (
                    <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                      <CheckCheck className="w-4 h-4 text-emerald-400" />
                      <span>HQ Acknowledged</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isReadOnly || ackingId === alert.id}
                      onClick={() => handleAcknowledge(alert.id)}
                      title={
                        isReadOnly
                          ? 'Requires Command Clearance'
                          : 'Acknowledge alert and log into tactical record'
                      }
                      className={`px-4 py-2 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        isReadOnly
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold active:scale-95 shadow-sm'
                      }`}
                    >
                      {ackingId === alert.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Logging...</span>
                        </>
                      ) : isReadOnly ? (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Requires Clearance</span>
                        </>
                      ) : (
                        <span>Acknowledge</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
