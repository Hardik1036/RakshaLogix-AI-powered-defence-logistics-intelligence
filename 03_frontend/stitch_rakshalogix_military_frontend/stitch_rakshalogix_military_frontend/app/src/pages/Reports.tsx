import React, { useState, useEffect } from 'react';
import { api, formatProbability } from '../api';
import { useToast } from '../context/ToastContext';
import type { AuditLogEntry } from '../types/api';
import { 
  FileText, 
  Download, 
  ShieldCheck, 
  Loader2 
} from 'lucide-react';
import { ServerLoader } from '../components/ServerLoader';

export const Reports: React.FC = () => {
  const { addToast } = useToast();

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getAuditLogs();
      setLogs(res);
    } catch {
      addToast('Failed to fetch audit records', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      await api.exportReportCsv();
    } catch {
      addToast('Failed to export tactical report', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Export Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h1 className="font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wider">
              REPORTS &amp; AUDIT TRAIL // 14 CORPS TACTICAL RECORD
            </h1>
          </div>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
            Officer Decision Overrides, Immutable Cryptographic Hash Chain &amp; CSV Data Export
          </p>
        </div>

        {/* Export Report Button */}
        <button
          type="button"
          disabled={exporting}
          onClick={handleExportCsv}
          className="px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-bold transition-all shadow-xs flex items-center gap-2 self-start md:self-center active:scale-95 disabled:opacity-60"
        >
          {exporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>GENERATING CSV...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Export Report</span>
            </>
          )}
        </button>
      </div>

      {/* Visual Breakdown Panel: Commodities Delivered */}
      <div className="bg-white dark:bg-slate-900/60 rounded-md border border-slate-200 dark:border-slate-800/80 p-5 flex flex-col gap-4 font-mono text-xs shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-2">
          <span className="font-bold text-slate-900 dark:text-white uppercase">
            COMMODITIES FULFILLMENT BREAKDOWN [NORTH-WEST CORPS // 7-DAY TONNAGE]
          </span>
          <span className="text-slate-500 dark:text-slate-400 text-[11px] tabular-nums">
            AGGREGATE PAYLOAD: 588.6 METRIC TONS
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 pt-1">
          {/* POL-88 */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/70 rounded border border-slate-200 dark:border-slate-800 flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-800 dark:text-slate-200">POL-88 FUEL</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">180 kL</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded overflow-hidden">
              <div className="bg-emerald-500 h-full rounded" style={{ width: '78%' }}></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 tabular-nums">
              <span>TARGET: 230 kL</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">78.2%</span>
            </div>
          </div>

          {/* 5.56mm Ammo */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/70 rounded border border-slate-200 dark:border-slate-800 flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-800 dark:text-slate-200">5.56mm ORDNANCE</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">250,000 rnds</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded overflow-hidden">
              <div className="bg-emerald-500 h-full rounded" style={{ width: '92%' }}></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 tabular-nums">
              <span>TARGET: 270k rnds</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">92.5%</span>
            </div>
          </div>

          {/* Rations */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/70 rounded border border-slate-200 dark:border-slate-800 flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-800 dark:text-slate-200">RATION PACKS MRE</span>
              <span className="font-bold text-amber-500 tabular-nums">12,000 pkts</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded overflow-hidden">
              <div className="bg-amber-400 h-full rounded" style={{ width: '85%' }}></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 tabular-nums">
              <span>TARGET: 14k pkts</span>
              <span className="font-bold text-amber-500">85.7%</span>
            </div>
          </div>

          {/* Medical O2 */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/70 rounded border border-slate-200 dark:border-slate-800 flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-800 dark:text-slate-200">MEDICAL O2</span>
              <span className="font-bold text-cyan-600 dark:text-cyan-400 tabular-nums">140 cyl</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded overflow-hidden">
              <div className="bg-cyan-500 h-full rounded" style={{ width: '100%' }}></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 tabular-nums">
              <span>TARGET: 140 cyl</span>
              <span className="font-bold text-cyan-600 dark:text-cyan-400">100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Table Section */}
      <div className="rounded-md bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-xs overflow-hidden font-mono text-xs">
        <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              OFFICER DECISION OVERRIDE AUDIT LOG // 14 CORPS TACTICAL RECORD
            </span>
            <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold tabular-nums">
              {logs.length} LOGGED
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <span>SHA-256 HASH VERIFIED</span>
            <span>|</span>
            <span className="text-emerald-500 font-bold">IMMUTABLE BLOCK CHAINED</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800/80 bg-slate-100/50 dark:bg-slate-950/30 text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3 w-56">OFFICER ID &amp; RANK</th>
                <th className="py-3 px-3 w-56">TIMESTAMP</th>
                <th className="py-3 px-3 w-64">AI RECOMMENDATION</th>
                <th className="py-3 px-3">ACTION &amp; JUSTIFICATION</th>
                <th className="py-3 px-3 w-56 text-right">AUTHORIZATION SIGNATURE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center">
                    <ServerLoader message="Connecting to server... (may take up to 60s on first request)" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No officer overrides recorded in current sector.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 align-top">
                      <div className="font-bold text-slate-900 dark:text-white">{log.officer_id}</div>
                      <div className="text-slate-700 dark:text-slate-300 text-[11px] font-bold">{log.officer_name}</div>
                      <div className="text-slate-400 text-[10px]">{log.rank}</div>
                    </td>
                    <td className="py-3 px-3 align-top">
                      <div className="text-slate-900 dark:text-white font-bold tabular-nums">{log.timestamp_zulu}</div>
                      <div className="text-slate-500 text-[10px] tabular-nums">{log.timestamp_ist} (LOCAL)</div>
                      <span className="inline-block mt-0.5 px-1 py-0.2 bg-slate-100 dark:bg-slate-800 rounded text-[9px] text-slate-500">
                        {log.id}
                      </span>
                    </td>
                    <td className="py-3 px-3 align-top">
                      <div className="text-slate-900 dark:text-white font-bold">{log.ai_recommendation_id}</div>
                      <div className="text-slate-600 dark:text-slate-300 text-[11px]">{log.baseline_summary}</div>
                      <div className="text-slate-400 text-[10px] mt-0.5 tabular-nums">Model Confidence: {formatProbability(log.confidence)}</div>
                    </td>
                    <td className="py-3 px-3 align-top">
                      <div className="p-2 rounded bg-rose-500/10 border-l-2 border-rose-500 text-rose-700 dark:text-rose-300 text-[11px] font-bold">
                        {log.action_taken}
                      </div>
                      <p className="font-sans text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-normal">
                        {log.justification}
                      </p>
                    </td>
                    <td className="py-3 px-3 align-top text-right">
                      <div className="text-emerald-500 font-mono text-[11px] font-bold">
                        {log.crypt_sig}
                      </div>
                      <span className="inline-block mt-1 px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold rounded">
                        [VERIFIED CORPS HQ]
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
