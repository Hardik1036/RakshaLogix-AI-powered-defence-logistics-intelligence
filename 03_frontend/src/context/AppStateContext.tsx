import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ConvoyItem, AlertItem, AuditLogEntry } from '../types/api';
import { mockConvoysList, mockAuditLogs } from '../services/mockData';

interface AppStateContextType {
  acknowledgedAlertIds: string[];
  acknowledgeAlert: (id: string) => void;
  isAlertAcknowledged: (id: string) => boolean;
  unacknowledgedAlertsCount: number;
  convoys: ConvoyItem[];
  addConvoy: (convoy: Partial<ConvoyItem>) => ConvoyItem;
  auditLogs: AuditLogEntry[];
  addAuditLog: (entry: Partial<AuditLogEntry>) => void;
  isDashboardMissionDispatched: boolean;
  setDashboardMissionDispatched: (dispatched: boolean) => void;
  modifiedMissionParams: { vehicles: number; corridor: string };
  setModifiedMissionParams: (params: { vehicles: number; corridor: string }) => void;
  mergeAcknowledgedAlerts: (alerts: AlertItem[]) => AlertItem[];
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

const STORAGE_ACK_KEY = 'rakshalogix_ack_alerts_v2';
const STORAGE_CONVOYS_KEY = 'rakshalogix_convoys_v2';
const STORAGE_LOGS_KEY = 'rakshalogix_audit_logs_v2';
const STORAGE_MISSION_DISPATCHED = 'rakshalogix_mission_dispatched_v2';

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Acknowledged Alert IDs
  const [acknowledgedAlertIds, setAcknowledgedAlertIds] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_ACK_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    // Initial acknowledged alerts from mockData (ALT-2026-8980 is marked acknowledged by default)
    return ['ALT-2026-8980'];
  });

  // 2. Convoys List
  const [convoys, setConvoys] = useState<ConvoyItem[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_CONVOYS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return mockConvoysList;
  });

  // 3. Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_LOGS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return mockAuditLogs;
  });

  // 4. Dashboard Mission Dispatch State
  const [isDashboardMissionDispatched, setIsDashboardMissionDispatched] = useState<boolean>(() => {
    return sessionStorage.getItem(STORAGE_MISSION_DISPATCHED) === 'true';
  });

  // 5. Modified mission parameters
  const [modifiedMissionParams, setModifiedMissionParams] = useState<{ vehicles: number; corridor: string }>({
    vehicles: 4,
    corridor: 'Pass Echo // South Ridge Bypass (Valley Axis)',
  });

  // Sync to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_ACK_KEY, JSON.stringify(acknowledgedAlertIds));
    } catch (e) {
      console.warn('Storage sync error', e);
    }
  }, [acknowledgedAlertIds]);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_CONVOYS_KEY, JSON.stringify(convoys));
    } catch (e) {
      console.warn('Storage sync error', e);
    }
  }, [convoys]);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(auditLogs));
    } catch (e) {
      console.warn('Storage sync error', e);
    }
  }, [auditLogs]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_MISSION_DISPATCHED, isDashboardMissionDispatched ? 'true' : 'false');
  }, [isDashboardMissionDispatched]);

  const acknowledgeAlert = useCallback((id: string) => {
    setAcknowledgedAlertIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      return next;
    });

    // Also add to audit logs
    const newLog: AuditLogEntry = {
      id: `LOG-2026-${String(Math.floor(Math.random() * 900) + 100)}`,
      officer_id: sessionStorage.getItem('user_name') || 'commander_alpha',
      officer_name: sessionStorage.getItem('officer_name') || 'Brig. V. Singh',
      rank: 'COMMANDER',
      timestamp_zulu: new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z',
      timestamp_ist: new Date().toLocaleTimeString(),
      ai_recommendation_id: 'ADV-ALERT-ACK',
      baseline_summary: `Alert ${id} acknowledged by HQ command clearance.`,
      confidence: 96,
      action_taken: `ACKNOWLEDGED_ALERT_${id}`,
      justification: `Forward outpost alert ${id} reviewed and verified by on-duty logistics controller.`,
      crypt_sig: `SHA256:${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`,
      verified: true,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  }, []);

  const isAlertAcknowledged = useCallback(
    (id: string) => {
      return acknowledgedAlertIds.includes(id);
    },
    [acknowledgedAlertIds]
  );

  // Compute unacknowledged alerts count based on mockAlerts total (starts at 7 or 4 unack)
  // Total alerts pool is 7 items. When alert IDs in acknowledged list increase, unack count decrements!
  const totalAlertsCount = 7;
  const unacknowledgedAlertsCount = Math.max(0, totalAlertsCount - acknowledgedAlertIds.length);

  const addConvoy = useCallback(
    (convoyData: Partial<ConvoyItem>): ConvoyItem => {
      const newConvoy: ConvoyItem = {
        convoy_id: convoyData.convoy_id || `CNV-ECHO-${String(Math.floor(Math.random() * 90) + 10)}`,
        origin_depot: convoyData.origin_depot || 'Kargil Forward Depot [UNIT_02]',
        destination: convoyData.destination || 'FOB Charlie [UNIT_03]',
        vehicle_count: convoyData.vehicle_count || 4,
        cargo_manifest: convoyData.cargo_manifest || 'Class-III POL-88 (20kL)',
        eta_countdown: convoyData.eta_countdown || '03h : 15m',
        eta_seconds: convoyData.eta_seconds || 11700,
        status: convoyData.status || 'IN_TRANSIT',
        escort_type: convoyData.escort_type || '2x BMP-2 Armored MP',
        priority: convoyData.priority || 'DEFCON-2',
      };

      setConvoys((prev) => [newConvoy, ...prev]);

      // Add audit log
      const newLog: AuditLogEntry = {
        id: `LOG-2026-${String(Math.floor(Math.random() * 900) + 100)}`,
        officer_id: sessionStorage.getItem('user_name') || 'commander_alpha',
        officer_name: sessionStorage.getItem('officer_name') || 'Brig. V. Singh',
        rank: 'COMMANDER',
        timestamp_zulu: new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z',
        timestamp_ist: new Date().toLocaleTimeString(),
        ai_recommendation_id: 'ADV-DISPATCH-EXEC',
        baseline_summary: `Dispatched ${newConvoy.convoy_id} (${newConvoy.vehicle_count} vehicles, ${newConvoy.cargo_manifest}) to ${newConvoy.destination}`,
        confidence: 94,
        action_taken: `CONVOY_DISPATCH_${newConvoy.convoy_id}`,
        justification: `Urgent resupply corridor authorized via ${newConvoy.origin_depot} -> ${newConvoy.destination}.`,
        crypt_sig: `SHA256:${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`,
        verified: true,
      };
      setAuditLogs((prev) => [newLog, ...prev]);

      return newConvoy;
    },
    []
  );

  const addAuditLog = useCallback((entry: Partial<AuditLogEntry>) => {
    const newLog: AuditLogEntry = {
      id: entry.id || `LOG-2026-${String(Math.floor(Math.random() * 900) + 100)}`,
      officer_id: entry.officer_id || sessionStorage.getItem('user_name') || 'commander_alpha',
      officer_name: entry.officer_name || sessionStorage.getItem('officer_name') || 'Brig. V. Singh',
      rank: entry.rank || 'COMMANDER',
      timestamp_zulu: entry.timestamp_zulu || new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z',
      timestamp_ist: entry.timestamp_ist || new Date().toLocaleTimeString(),
      ai_recommendation_id: entry.ai_recommendation_id || 'ADV-MANUAL',
      baseline_summary: entry.baseline_summary || 'Command action recorded',
      confidence: entry.confidence || 95,
      action_taken: entry.action_taken || 'TACTICAL_OVERRIDE',
      justification: entry.justification || 'Standard procedural command justification',
      crypt_sig: `SHA256:${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`,
      verified: true,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  }, []);

  const mergeAcknowledgedAlerts = useCallback(
    (alerts: AlertItem[]): AlertItem[] => {
      return alerts.map((a) => {
        if (acknowledgedAlertIds.includes(a.id)) {
          return { ...a, status: 'ACKNOWLEDGED' };
        }
        return a;
      });
    },
    [acknowledgedAlertIds]
  );

  return (
    <AppStateContext.Provider
      value={{
        acknowledgedAlertIds,
        acknowledgeAlert,
        isAlertAcknowledged,
        unacknowledgedAlertsCount,
        convoys,
        addConvoy,
        auditLogs,
        addAuditLog,
        isDashboardMissionDispatched,
        setDashboardMissionDispatched: setIsDashboardMissionDispatched,
        modifiedMissionParams,
        setModifiedMissionParams,
        mergeAcknowledgedAlerts,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = (): AppStateContextType => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};
