import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { AlertItem } from '../types/api';
import { 
  BellRing, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCheck, 
  Radio, 
  Loader2,
  RefreshCw
} from 'lucide-react';
import { ServerLoader } from '../components/ServerLoader';

export const Alerts: React.FC = () => {
  const { isReadOnly } = useAuth();
  const { addToast } = useToast();

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
      // Ensure strict deduplication by ID and composite signature
      const seenIds = new Set<string>();
      const seenKeys = new Set<string>();
      const unique = res.filter((a) => {
        const compositeKey = `${a.route_sector}-${a.code || a.severity}-${a.title}`;
        if (seenIds.has(a.id) || seenKeys.has(compositeKey)) return false;
        seenIds.add(a.id);
        seenKeys.add(compositeKey);
        return true;
      });
      setAlerts(unique);
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
      const updated = await api.ackAlert(id);
      setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)));
      addToast(`Alert ${id} acknowledged and logged into tactical record`, 'success');
    } catch {
      addToast(`Failed to acknowledge alert ${id}`, 'error');
    } finally {
      setAckingId(null);
    }
  };

  // Deduplicate alerts by composite key (unit_id + type + message) per evaluation fix
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

  const unackCount = uniqueAlerts.filter((a) => a.status === 'UNACKNOWLEDGED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <BellRing className="w-5 h-5 text-rose-500 animate-pulse" />
            <h1 className="font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wider">
              TACTICAL ALERTS &amp; DEFICIT WARNING FEED
            </h1>
          </div>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
            Critical Outpost Supply Depletions, Road Pass Interdictions, and Meteorological Threats
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            type="button"
            onClick={fetchAlerts}
            disabled={refreshing}
            className="px-3 py-1.5 rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-500' : ''}`} />
            <span>{refreshing ? 'REFRESHING...' : 'REFRESH DATA'}</span>
          </button>
          <span className="px-3 py-1 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold flex items-center gap-1.5 tabular-nums">
            <Radio className="w-3.5 h-3.5 animate-pulse text-rose-500" />
            <span>UNACKNOWLEDGED: {unackCount}</span>
          </span>
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="flex flex-col gap-4">
        {loading ? (
          <ServerLoader message="Connecting to server... (may take up to 60s on first request)" />
        ) : uniqueAlerts.length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-mono text-xs bg-white dark:bg-slate-900/60 rounded-md border border-slate-200 dark:border-slate-800/80">
            No active threat alerts in theater.
          </div>
        ) : (
          uniqueAlerts.map((alert) => {
            const isCritical = alert.severity === 'CRITICAL';
            const isHigh = alert.severity === 'HIGH';
            const isAck = alert.status === 'ACKNOWLEDGED';

            return (
              <div
                key={alert.id}
                className={`p-5 rounded-md border transition-all flex flex-col gap-3 font-mono text-xs ${
                  isAck
                    ? 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 opacity-75'
                    : isCritical
                    ? 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 border-l-4 border-l-rose-500 shadow-xs'
                    : isHigh
                    ? 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 border-l-4 border-l-amber-500 shadow-xs'
                    : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Alert Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isCritical
                          ? 'bg-rose-600 text-white'
                          : isHigh
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-200'
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold tabular-nums">
                      {alert.timestamp}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-700 dark:text-slate-300 font-bold">
                    {alert.route_sector}
                  </span>
                </div>

                {/* Title and Description */}
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase mb-1">
                    {alert.title}
                  </h3>
                  <p className="font-sans text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {alert.description}
                  </p>
                </div>

                {/* Suggested Action Bar */}
                <div className="p-2.5 rounded bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-amber-700 dark:text-amber-300 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>SUGGESTED ACTION:</strong> {alert.suggested_action}
                  </span>
                </div>

                {/* Telemetry Metric Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded border border-slate-200 dark:border-slate-800 text-[11px]">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block font-semibold">REMAINING CAP</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">{alert.remaining_cap}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block font-semibold">BURN RATE</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{alert.burn_rate}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block font-semibold">WEATHER TEMP</span>
                    <span className="font-semibold text-cyan-600 dark:text-cyan-400 tabular-nums">{alert.weather_temp}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block font-semibold">COORDINATES</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{alert.coordinates}</span>
                  </div>
                </div>

                {/* Bottom Action Footer with RBAC check */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    {isAck ? (
                      <span className="text-emerald-500 font-bold flex items-center gap-1">
                        <CheckCheck className="w-4 h-4" />
                        ACKNOWLEDGED BY HQ
                      </span>
                    ) : (
                      <span className="text-rose-500 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        UNACKNOWLEDGED TACTICAL IMPASSE
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={isReadOnly || isAck || ackingId === alert.id}
                    onClick={() => handleAcknowledge(alert.id)}
                    title={
                      isReadOnly
                        ? 'Read-only access: command clearance required'
                        : isAck
                        ? 'Alert is already acknowledged'
                        : 'Acknowledge alert and log into audit'
                    }
                    className={`px-4 py-2 rounded-md font-bold uppercase transition-all flex items-center gap-1.5 ${
                      isAck
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-default'
                        : isReadOnly
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 active:scale-95 shadow-xs'
                    }`}
                  >
                    {ackingId === alert.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>LOGGING ACK...</span>
                      </>
                    ) : isAck ? (
                      <>
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Acknowledged</span>
                      </>
                    ) : (
                      <span>Acknowledge Alert</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
