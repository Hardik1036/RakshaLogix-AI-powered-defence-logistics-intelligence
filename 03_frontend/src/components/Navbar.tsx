import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import type { UserRole } from '../types/auth';
import { 
  Shield, 
  Sun, 
  Moon, 
  LogOut, 
  Clock, 
  Radio, 
  UserCheck,
  PanelLeftClose,
  PanelLeft,
  ChevronDown,
  Check,
  AlertTriangle
} from 'lucide-react';
import { useSidebar } from '../context/SidebarContext';

export const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { role, user, logout, switchRole } = useAuth();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();

  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  // Real-time Zulu & IST Clocks
  const [time, setTime] = useState<{ zulu: string; ist: string }>({ zulu: '', ist: '' });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const zulu = now.toISOString().substring(11, 19) + 'Z';
      
      const istHours = (now.getUTCHours() + 5 + Math.floor((now.getUTCMinutes() + 30) / 60)) % 24;
      const istMinutes = (now.getUTCMinutes() + 30) % 60;
      const istSeconds = now.getUTCSeconds();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const ist = `${pad(istHours)}:${pad(istMinutes)}:${pad(istSeconds)}+05:30`;

      setTime({ zulu, ist });
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close role menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setRoleMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const rolesList: { key: UserRole; label: string; iconColor: string; description: string }[] = [
    {
      key: 'CORPS_COMMANDER',
      label: 'CORPS_COMMANDER',
      iconColor: 'bg-emerald-500',
      description: 'Full Command, Convoy Authorization & Override',
    },
    {
      key: 'LOGISTICS_OFFICER',
      label: 'LOGISTICS_OFFICER',
      iconColor: 'bg-amber-500',
      description: 'Inventory Reconciliation & Corridor Recalculation',
    },
    {
      key: 'EDGE_READ_ONLY',
      label: 'EDGE_READ_ONLY',
      iconColor: 'bg-cyan-500',
      description: 'Forward Tactical Edge (Action Controls Masked)',
    },
  ];

  const currentRoleConfig = rolesList.find((r) => r.key === role) || rolesList[0];

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#070d1f]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 shadow-xs transition-colors">
      {/* 1. MANDATORY DEFENCE COMPLIANCE TOP BANNER */}
      <div className="w-full bg-amber-500 dark:bg-amber-500 text-slate-950 font-mono text-[10px] sm:text-[11px] font-extrabold tracking-wider sm:tracking-widest uppercase py-1 px-3 text-center border-b border-amber-600 flex items-center justify-center gap-1.5 shadow-xs select-none">
        <AlertTriangle className="w-3.5 h-3.5 text-slate-950 shrink-0" />
        <span className="truncate">
          SYNTHETIC DATA FOR R&D ONLY — NOT ACTUAL INDIAN ARMY LOGS | HUMAN-IN-THE-LOOP COMMAND
        </span>
      </div>

      {/* 2. MAIN NAVIGATION STRIP */}
      <div className="w-full h-14 px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Left: Brand Identity & Sidebar Toggle */}
        <div className="flex items-center gap-3 min-w-max">
          <button
            onClick={toggleSidebar}
            type="button"
            className="p-1.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-all active:scale-95 flex items-center justify-center tactical-btn"
            title={isCollapsed ? 'Expand Sidebar [Ctrl+B]' : 'Collapse Sidebar [Ctrl+B]'}
            aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? (
              <PanelLeft className="w-4 h-4 text-emerald-500" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            )}
          </button>

          <div className="w-7 h-7 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
            <Shield className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wider text-slate-900 dark:text-white uppercase">
                RAKSHALOGIX
              </span>
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400 font-semibold hidden sm:inline">
                // FORWARD-INTEL
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[9px] text-slate-500 dark:text-slate-400">
                14 CORPS HQ • LEH-SIACHEN SECTOR
              </span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
          </div>
        </div>

        {/* Center: Realtime Zulu & IST Telemetry + Classification */}
        <div className="hidden xl:flex items-center gap-4">
          <div className="flex items-center gap-3 px-3 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded font-mono text-xs">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500 font-medium">ZULU:</span>
              <span className="text-slate-800 dark:text-slate-200 font-bold tabular-nums">{time.zulu}</span>
            </div>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">IST:</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold tabular-nums">{time.ist}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/10 border border-rose-500/30 rounded text-rose-600 dark:text-rose-400 font-mono text-[10px] font-bold">
            <Radio className="w-3.5 h-3.5 animate-pulse text-rose-500" />
            <span>OPERATIONAL // DEFCON-2</span>
          </div>
        </div>

        {/* Right: Callsign, Quick Role-Switcher, Theme & Sign Out */}
        <div className="flex items-center gap-2.5 min-w-max">
          {/* Active Callsign & User Info */}
          <div className="hidden sm:flex items-center gap-2 pl-2 py-1 pr-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full">
            <div className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-none">
                {user?.username?.toUpperCase() || 'COMMANDER_ALPHA'}
              </span>
              <span className="font-mono text-[9px] text-slate-500 dark:text-slate-400 leading-none mt-0.5">
                {user?.name || 'Brig. K. Singh'}
              </span>
            </div>
          </div>

          {/* Quick Role Switcher Dropdown */}
          <div className="relative" ref={roleMenuRef}>
            <button
              type="button"
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-mono text-[11px] font-bold tracking-wider border transition-all active:scale-95 tactical-btn ${
                role === 'CORPS_COMMANDER'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25'
                  : role === 'LOGISTICS_OFFICER'
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25'
                  : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/25'
              }`}
              title="Click to Switch Role Clearance [RBAC Test]"
            >
              <span className={`w-2 h-2 rounded-full ${currentRoleConfig.iconColor} animate-pulse`}></span>
              <span>{role === 'CORPS_COMMANDER' ? '🟢 CORPS_COMMANDER' : role === 'LOGISTICS_OFFICER' ? '🟡 LOGISTICS_OFFICER' : '🔵 EDGE_READ_ONLY'}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>

            {/* Dropdown Menu */}
            {roleMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-50 font-mono text-xs animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Tactical Role Clearance Switcher
                </div>
                {rolesList.map((r) => {
                  const isActive = r.key === role;
                  return (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => {
                        switchRole(r.key);
                        setRoleMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-start gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                        isActive ? 'bg-slate-100/70 dark:bg-slate-800/40 text-slate-900 dark:text-white font-bold' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${r.iconColor}`}></span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold">{r.label}</span>
                          {isActive && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-sans font-normal truncate mt-0.5">
                          {r.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Theme Toggle Button */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md border border-slate-300 dark:border-slate-700">
            <button
              onClick={() => toggleTheme()}
              className={`p-1.5 rounded transition-colors ${
                theme === 'light'
                  ? 'bg-white shadow-xs text-amber-600'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Day/Night Vision"
              type="button"
            >
              {theme === 'light' ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-emerald-400" />
              )}
            </button>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60 rounded-md font-mono text-xs font-bold transition-all active:scale-95 tactical-btn shadow-xs"
            title="Terminate Operational Session [Sign Out]"
            type="button"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
