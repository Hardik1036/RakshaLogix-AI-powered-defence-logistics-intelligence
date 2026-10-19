import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { ConvoyItem, CreateConvoyRequest } from '../types/api';
import { 
  Truck, 
  Plus, 
  Clock, 
  ShieldCheck, 
  X, 
  Loader2, 
  Check, 
  Radio 
} from 'lucide-react';
import { ServerLoader } from '../components/ServerLoader';

export const Convoys: React.FC = () => {
  const { isReadOnly } = useAuth();
  const { addToast } = useToast();

  const [convoys, setConvoys] = useState<ConvoyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [origin, setOrigin] = useState('Kargil Forward Depot [UNIT_02]');
  const [destination, setDestination] = useState('FOB Charlie [UNIT_03]');
  const [vehicleCount, setVehicleCount] = useState(4);
  const [cargoType, setCargoType] = useState('Class-III POL-88 Arctic Diesel');
  const [quantity, setQuantity] = useState('20,000 Litres');
  const [escort, setEscort] = useState('2x QRF Armored MP (BMP-2)');
  const [priority, setPriority] = useState('DEFCON-2 CRITICAL REPLENISHMENT');

  useEffect(() => {
    fetchConvoys();
  }, []);

  const fetchConvoys = async () => {
    try {
      setLoading(true);
      const res = await api.getConvoys();
      setConvoys(res);
    } catch {
      addToast('Failed to load active convoys list', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConvoy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    try {
      setSubmitting(true);
      const req: CreateConvoyRequest = {
        origin_depot: origin,
        destination,
        vehicle_count: vehicleCount,
        cargo_type: cargoType,
        manifest_quantity: quantity,
        escort_type: escort,
        priority_level: priority,
      };

      const created = await api.createConvoy(req);
      setConvoys((prev) => [created, ...prev]);
      setIsModalOpen(false);
      addToast(`Convoy ${created.convoy_id} authorized & dispatched to ${destination}`, 'success');
    } catch {
      addToast('Failed to authorize convoy dispatch', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h1 className="font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wider">
              CONVOYS HUB // ACTIVE OVERLAND MANIFESTS
            </h1>
          </div>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
            Encrypted GPS Fleet Tracking, Armored Escorts, and Live ETA Timelines
          </p>
        </div>

        {/* Create Convoy Button with RBAC check */}
        <button
          type="button"
          disabled={isReadOnly}
          onClick={() => setIsModalOpen(true)}
          title={isReadOnly ? 'Read-only access: command clearance required' : 'Open tactical convoy dispatch authorization'}
          className={`px-4 py-2 rounded-md font-mono text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 self-start md:self-center ${
            isReadOnly
              ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 active:scale-95'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Create Convoy</span>
        </button>
      </div>

      {/* Convoy Telemetry Table Container */}
      <div className="rounded-md bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-xs overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 uppercase">
            <span>ACTIVE DISPATCH MANIFEST</span>
            <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] tabular-nums">
              TOTAL: {convoys.length} CONVOYS
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <span>ENCRYPTED MGRS STREAM</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800/80 bg-slate-100/50 dark:bg-slate-950/30 text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">CONVOY ID</th>
                <th className="py-3 px-3">ORIGIN DEPOT</th>
                <th className="py-3 px-3">DESTINATION</th>
                <th className="py-3 px-3 text-right">ASSETS</th>
                <th className="py-3 px-3">CARGO MANIFEST</th>
                <th className="py-3 px-3">ESCORT &amp; PRIORITY</th>
                <th className="py-3 px-3">ETA COUNTDOWN</th>
                <th className="py-3 px-3 text-right">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center">
                    <ServerLoader message="Connecting to server... (may take up to 60s on first request)" />
                  </td>
                </tr>
              ) : convoys.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No active convoys in manifest.
                  </td>
                </tr>
              ) : (
                convoys.map((convoy) => (
                  <tr key={convoy.convoy_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {convoy.convoy_id}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                      {convoy.origin_depot}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                      {convoy.destination}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                      {convoy.vehicle_count} Assets
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                      {convoy.cargo_manifest}
                    </td>
                    <td className="py-3 px-3 text-[11px]">
                      <div className="text-slate-800 dark:text-slate-200 font-semibold">{convoy.escort_type}</div>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                        {convoy.priority}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-1.5 tabular-nums">
                        <Clock className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{convoy.eta_countdown}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          convoy.status === 'IN_TRANSIT'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : convoy.status === 'DELAYED'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            : convoy.status === 'SCHEDULED'
                            ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {convoy.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DISPATCH CONVOY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 max-w-xl w-full p-5 rounded-lg shadow-2xl flex flex-col gap-4 font-mono text-xs text-slate-900 dark:text-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-500" />
                <span className="font-bold uppercase tracking-wider text-sm">
                  TACTICAL DISPATCH AUTHORIZATION // FLIGHT &amp; GROUND MANIFEST
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

            {/* Directive notice */}
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 px-3 py-1.5 rounded flex items-center justify-between text-[10px] text-rose-700 dark:text-rose-300 font-bold">
              <span>ORDNANCE &amp; FUEL ESCORT DIRECTIVE // LEVEL-2 COMMAND SIGN-OFF</span>
              <span>AUTH: LOG-MAJ-VR-09</span>
            </div>

            <form onSubmit={handleCreateConvoy} className="flex flex-col gap-3">
              {/* Origin Depot */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">
                  01. ORIGIN DEPOT
                </label>
                <select
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 p-2 rounded outline-none focus:border-emerald-500"
                >
                  <option value="Kargil Forward Depot [UNIT_02]">Kargil Forward Depot [UNIT_02]</option>
                  <option value="Leh Central Hub [DEPOT_01]">Leh Central Hub [DEPOT_01]</option>
                  <option value="Srinagar Base [LOG_HQ]">Srinagar Base [LOG_HQ]</option>
                </select>
              </div>

              {/* Destination */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">
                  02. TARGET DESTINATION
                </label>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 p-2 rounded outline-none focus:border-emerald-500"
                >
                  <option value="FOB Charlie [UNIT_03]">FOB Charlie [UNIT_03]</option>
                  <option value="Dras Sector Command [UNIT_04]">Dras Sector Command [UNIT_04]</option>
                  <option value="Siachen Base Camp [UNIT_09]">Siachen Base Camp [UNIT_09]</option>
                  <option value="FOB Alpha Tiger Hill [UNIT_01]">FOB Alpha Tiger Hill [UNIT_01]</option>
                </select>
              </div>

              {/* Assets and Cargo Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">
                    03. VEHICLE COUNT
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={vehicleCount}
                    onChange={(e) => setVehicleCount(Number(e.target.value))}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 p-2 rounded outline-none focus:border-emerald-500 tabular-nums"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">
                    04. MANIFEST QUANTITY
                  </label>
                  <input
                    type="text"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 p-2 rounded outline-none focus:border-emerald-500 font-bold tabular-nums"
                  />
                </div>
              </div>

              {/* Cargo Class */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">
                  05. CARGO CLASS
                </label>
                <input
                  type="text"
                  value={cargoType}
                  onChange={(e) => setCargoType(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 p-2 rounded outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              {/* Escort Strength */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">
                  06. ESCORT STRENGTH &amp; TACTICAL COVER
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`p-2 border rounded cursor-pointer flex items-center gap-2 ${
                      escort.includes('BMP')
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-slate-300 dark:border-slate-700 bg-transparent'
                    }`}
                  >
                    <input
                      type="radio"
                      name="escort"
                      checked={escort.includes('BMP')}
                      onChange={() => setEscort('2x QRF Armored MP (BMP-2)')}
                      className="sr-only"
                    />
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-[10px] font-bold">2x BMP-2 Armor Escort</span>
                  </label>

                  <label
                    className={`p-2 border rounded cursor-pointer flex items-center gap-2 ${
                      escort.includes('Air')
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-slate-300 dark:border-slate-700 bg-transparent'
                    }`}
                  >
                    <input
                      type="radio"
                      name="escort"
                      checked={escort.includes('Air')}
                      onChange={() => setEscort('Air Cover Standby (HAL Rudra)')}
                      className="sr-only"
                    />
                    <Radio className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-[10px] font-bold">Air Cover Standby</span>
                  </label>
                </div>
              </div>

              {/* Priority Level */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">
                  07. PRIORITY LEVEL
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 p-2 rounded outline-none focus:border-emerald-500 font-bold"
                >
                  <option value="DEFCON-2 CRITICAL REPLENISHMENT">DEFCON-2 CRITICAL REPLENISHMENT</option>
                  <option value="PRIORITY-1A URGENT ORDNANCE">PRIORITY-1A URGENT ORDNANCE</option>
                  <option value="ROUTINE-LOG THEATER RESUPPLY">ROUTINE-LOG THEATER RESUPPLY</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:text-slate-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center gap-1.5 shadow-xs"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>DISPATCHING...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm Dispatch</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
