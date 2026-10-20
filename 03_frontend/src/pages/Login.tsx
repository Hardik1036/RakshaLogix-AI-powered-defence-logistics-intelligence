import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Shield, Key, BadgeCheck, Eye, EyeOff, ArrowRight, Lock, Radio } from 'lucide-react';
import { ServerLoader } from '../components/ServerLoader';
import { api } from '../api';
export { DEMO_USERS } from '../api';
import type { UserRole } from '../types/auth';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('commander_alpha');
  const [password, setPassword] = useState('Commander@DefSec2026!');
  const [selectedRole, setSelectedRole] = useState<UserRole>('CORPS_COMMANDER');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const applyRolePreset = (role: UserRole, userVal: string, passVal: string) => {
    setSelectedRole(role);
    setUsername(userVal);
    setPassword(passVal);
  };

  const executeLogin = async (userVal: string, passVal: string, roleVal?: UserRole) => {
    setIsLoading(true);

    try {
      const data = await api.login(userVal, passVal);
      const token = data.access_token;
      const roleToUse: UserRole = (data.user?.role as UserRole) || roleVal || selectedRole;
      const officerName =
        roleToUse === 'CORPS_COMMANDER'
          ? 'Brig. K. Singh'
          : roleToUse === 'LOGISTICS_OFFICER'
          ? 'Maj. V. Rathore'
          : 'Capt. C. Edge';

      // Store in both sessionStorage and localStorage for rock-solid session retention
      sessionStorage.setItem('access_token', token);
      sessionStorage.setItem('user_role', roleToUse);
      sessionStorage.setItem('user_name', data.user?.username || userVal);
      sessionStorage.setItem('officer_name', officerName);
      sessionStorage.setItem('user', JSON.stringify(data.user));
      sessionStorage.removeItem('explicit_logout');

      localStorage.setItem('access_token', token);
      localStorage.setItem('user_role', roleToUse);
      localStorage.setItem('user_name', data.user?.username || userVal);
      localStorage.setItem('officer_name', officerName);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.removeItem('explicit_logout');

      login(token, roleToUse, data.user?.username || userVal, officerName);
      addToast(`Session authenticated: [${roleToUse}] ${officerName}`, 'success');
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed. Check tactical credentials.';
      addToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeLogin(username, password, selectedRole);
  };

  return (
    <div className="relative min-h-screen bg-slate-950 dark:bg-surface-container-lowest text-slate-100 dark:text-on-surface flex items-center justify-center p-4 selection:bg-primary-container selection:text-on-primary">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none opacity-20 flex items-center justify-center overflow-hidden">
        <svg className="w-full h-full max-w-4xl" fill="none" viewBox="0 0 800 800">
          <circle cx="400" cy="400" r="380" stroke="#06b6d4" strokeDasharray="4 8" strokeWidth="1" />
          <circle cx="400" cy="400" r="280" stroke="#4cd7f6" strokeOpacity="0.3" strokeWidth="1" />
          <circle cx="400" cy="400" r="160" stroke="#4cd7f6" strokeOpacity="0.2" strokeWidth="1" />
          <line x1="400" y1="20" x2="400" y2="780" stroke="#3d494c" strokeDasharray="2 4" strokeWidth="1" />
          <line x1="20" y1="400" x2="780" y2="400" stroke="#3d494c" strokeDasharray="2 4" strokeWidth="1" />
        </svg>
      </div>

      <div className="relative w-full max-w-xl mx-auto z-10 flex flex-col shadow-2xl">
        {/* Telemetry Status Bar */}
        <div className="bg-slate-900 dark:bg-surface-container-lowest px-4 py-2 flex items-center justify-between border-t border-x border-slate-700 dark:border-outline-variant/40">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-mono text-[10px] text-emerald-400 tracking-widest uppercase">
              SAT-LINK ENCRYPTED // NODE: HQ-14-LEH
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-amber-400 font-bold px-1.5 py-0.5 bg-amber-950/40 rounded">
              DEFCON-2 ACTIVE
            </span>
            <span className="font-mono text-[10px] text-slate-400">MGRS: 43S_XP_1829</span>
          </div>
        </div>

        {/* Main Terminal Card */}
        <div className="relative bg-slate-900/90 dark:bg-[#181b25] p-6 sm:p-8 border border-slate-700 dark:border-outline-variant/40 flex flex-col gap-5 backdrop-blur-md">
          {/* Precision Crosshairs */}
          <span className="absolute top-2 left-2 font-mono text-cyan-400 select-none opacity-80">+</span>
          <span className="absolute top-2 right-2 font-mono text-cyan-400 select-none opacity-80">+</span>
          <span className="absolute bottom-2 left-2 font-mono text-cyan-400 select-none opacity-80">+</span>
          <span className="absolute bottom-2 right-2 font-mono text-cyan-400 select-none opacity-80">+</span>

          {/* Header */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-cyan-500/20 border border-cyan-400/40 text-cyan-400 flex items-center justify-center font-bold">
                  <Shield className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="flex flex-col">
                  <span className="font-mono text-sm text-cyan-400 tracking-wider uppercase font-bold">
                    RAKSHALOGIX // FORWARD-LOGIX-OPS
                  </span>
                  <span className="font-sans text-xs text-slate-400 tracking-normal">
                    LOGISTICAL READINESS COMMAND & TELEMETRY
                  </span>
                </div>
              </div>
              <span className="bg-slate-800 dark:bg-surface-container-highest px-2 py-0.5 text-slate-300 dark:text-on-surface-variant font-mono text-[10px]">
                GATEWAY 04
              </span>
            </div>

            <div className="bg-slate-950/80 dark:bg-surface-container-lowest px-3 py-1 mt-1 flex items-center justify-between border border-slate-800 dark:border-outline-variant/30">
              <span className="font-mono text-[11px] text-slate-300 dark:text-on-surface uppercase tracking-wide">
                SECTOR-04 NORTH-WEST CORPS // SECURE ACCESS GATEWAY
              </span>
              <span className="font-mono text-[11px] text-cyan-400">MIL-STD 810G</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Officer ID */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <label className="font-mono text-[11px] text-slate-300 dark:text-on-surface uppercase flex items-center gap-1.5">
                  <BadgeCheck className="w-3.5 h-3.5 text-cyan-400" />
                  OFFICER SERVICE NO. / USERNAME
                </label>
                <span className="font-mono text-[10px] text-slate-500">REQ: 8-DIGIT / UID</span>
              </div>
              <div className="relative flex items-center bg-slate-950 dark:bg-surface-container-lowest border border-slate-700 dark:border-outline-variant focus-within:border-cyan-400">
                <span className="pl-3 font-mono text-xs text-slate-500 select-none">MGRS:</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-transparent px-3 py-2 font-mono text-xs text-slate-100 dark:text-on-surface placeholder:text-slate-600 focus:outline-none"
                  placeholder="e.g. commander_alpha"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <label className="font-mono text-[11px] text-slate-300 dark:text-on-surface uppercase flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-cyan-400" />
                  CRYPTOGRAPHIC ACCESS KEY / PASSWORD
                </label>
                <span className="font-mono text-[10px] text-slate-500">HSM-ENCRYPTED</span>
              </div>
              <div className="relative flex items-center bg-slate-950 dark:bg-surface-container-lowest border border-slate-700 dark:border-outline-variant focus-within:border-cyan-400">
                <span className="pl-3 font-mono text-xs text-slate-500 select-none">KEY:</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent px-3 py-2 font-mono text-xs text-slate-100 dark:text-on-surface placeholder:text-slate-600 focus:outline-none tracking-widest"
                  placeholder="••••••••••••••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="pr-3 text-slate-400 hover:text-cyan-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Loading state for cold starts */}
            {isLoading && (
              <div className="mt-2">
                <ServerLoader
                  message="Connecting to server... (may take up to 60s on first request)"
                  subtext="Military FastAPI host waking from cold-standby on Render..."
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs py-3 px-4 uppercase font-bold tracking-wider flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.99] transition duration-75 shadow-md disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>{isLoading ? 'CONNECTING TO SERVER... (UP TO 60S)' : 'AUTHENTICATE & ENTER SYSTEM'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick-Fill Presets as mandated in prompt:
              1. commander_alpha / Commander@DefSec2026! (CORPS_COMMANDER)
              2. logistics_bravo / Logistics@DefSec2026! (LOGISTICS_OFFICER)
              3. edge_charlie / EdgeReadOnly@DefSec2026! (EDGE_READ_ONLY)
          */}
          <div className="flex flex-col gap-1.5 pt-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-slate-400 dark:text-on-surface-variant uppercase tracking-wider">
                TACTICAL PRESET OVERRIDES // ZERO-LATENCY DISPATCH
              </span>
              <span className="font-mono text-[10px] text-slate-500">QUICK FILL</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {/* Preset 1: Commander */}
              <button
                type="button"
                onClick={() => {
                  applyRolePreset('CORPS_COMMANDER', 'commander_alpha', 'Commander@DefSec2026!');
                  executeLogin('commander_alpha', 'Commander@DefSec2026!', 'CORPS_COMMANDER');
                }}
                className={`p-2.5 flex flex-col text-left transition border cursor-pointer hover:brightness-110 active:scale-[0.98] ${
                  selectedRole === 'CORPS_COMMANDER'
                    ? 'bg-slate-800 dark:bg-surface-container border-cyan-400 ring-1 ring-cyan-400/40'
                    : 'bg-slate-950 dark:bg-surface-container-lowest border-slate-700 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-mono text-[11px] text-emerald-400 font-bold uppercase">
                    Commander
                  </span>
                  <span className="font-mono text-[9px] text-emerald-300 px-1 bg-emerald-950/60 rounded">
                    1-CLICK ENTER
                  </span>
                </div>
                <span className="font-mono text-[10px] text-slate-300 truncate">
                  commander_alpha
                </span>
                <span className="font-mono text-[9px] text-slate-500 truncate">
                  Full Command Auth
                </span>
              </button>

              {/* Preset 2: Logistics Officer */}
              <button
                type="button"
                onClick={() => {
                  applyRolePreset('LOGISTICS_OFFICER', 'logistics_bravo', 'Logistics@DefSec2026!');
                  executeLogin('logistics_bravo', 'Logistics@DefSec2026!', 'LOGISTICS_OFFICER');
                }}
                className={`p-2.5 flex flex-col text-left transition border cursor-pointer hover:brightness-110 active:scale-[0.98] ${
                  selectedRole === 'LOGISTICS_OFFICER'
                    ? 'bg-slate-800 dark:bg-surface-container border-amber-400 ring-1 ring-amber-400/40'
                    : 'bg-slate-950 dark:bg-surface-container-lowest border-slate-700 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-mono text-[11px] text-amber-400 font-bold uppercase">
                    Logistics
                  </span>
                  <span className="font-mono text-[9px] text-amber-300 px-1 bg-amber-950/60 rounded">
                    1-CLICK ENTER
                  </span>
                </div>
                <span className="font-mono text-[10px] text-slate-300 truncate">
                  logistics_bravo
                </span>
                <span className="font-mono text-[9px] text-slate-500 truncate">
                  Maj. V. Rathore // Ops
                </span>
              </button>

              {/* Preset 3: Read-Only */}
              <button
                type="button"
                onClick={() => {
                  applyRolePreset('EDGE_READ_ONLY', 'edge_charlie', 'EdgeReadOnly@DefSec2026!');
                  executeLogin('edge_charlie', 'EdgeReadOnly@DefSec2026!', 'EDGE_READ_ONLY');
                }}
                className={`p-2.5 flex flex-col text-left transition border cursor-pointer hover:brightness-110 active:scale-[0.98] ${
                  selectedRole === 'EDGE_READ_ONLY'
                    ? 'bg-slate-800 dark:bg-surface-container border-cyan-400 ring-1 ring-cyan-400/40'
                    : 'bg-slate-950 dark:bg-surface-container-lowest border-slate-700 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-mono text-[11px] text-cyan-400 font-bold uppercase">
                    Read-Only
                  </span>
                  <span className="font-mono text-[9px] text-cyan-300 px-1 bg-cyan-950/60 rounded">
                    1-CLICK ENTER
                  </span>
                </div>
                <span className="font-mono text-[10px] text-slate-300 truncate">
                  edge_charlie
                </span>
                <span className="font-mono text-[9px] text-slate-500 truncate">
                  Edge Recon // Observer
                </span>
              </button>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-slate-950 dark:bg-surface-container-lowest p-2.5 flex flex-col gap-1 border border-slate-800 dark:border-outline-variant/30">
            <div className="flex items-center gap-1.5 text-red-400">
              <Radio className="w-3.5 h-3.5 animate-pulse shrink-0" />
              <p className="font-mono text-[10px] leading-tight font-semibold">
                RESTRICTED GOVERNMENT SYSTEM. SECRECY ACT PROTOCOL ENFORCED.
              </p>
            </div>
            <div className="flex items-center justify-between text-slate-500 font-mono text-[9px] pt-1 border-t border-slate-800">
              <span>SHA-256 SESSION: 4F92-7E1A-B831-DC88</span>
              <span className="text-emerald-400 flex items-center gap-1 font-bold">
                <span className="w-1.5 h-1.5 bg-emerald-400 inline-block"></span>
                SYS_ONLINE
              </span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between px-4 py-2 text-slate-500 font-mono text-[10px] border-b border-x border-slate-700 dark:border-outline-variant/40 bg-slate-900/60">
          <span>NODE ADDR: 192.0.2.144 // TOC-SECTOR-NW</span>
          <span>RAKSHALOGIX SYSTEM V4.18.2</span>
        </div>
      </div>
    </div>
  );
};
