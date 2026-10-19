import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Sun, 
  Moon, 
  Power, 
  Clock, 
  Radio, 
  UserCheck,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';
import { useSidebar } from '../context/SidebarContext';

export const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { role, user, logout } = useAuth();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Dynamic Role Badge rendering based on prompt:
  // "Navbar role badge: 🟢 COMMANDER, 🟡 LOGISTICS, 🔵 READ-ONLY (dynamic, not hardcoded)"
  const renderRoleBadge = () => {
    switch (role) {
      case 'CORPS_COMMANDER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-bold tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            COMMANDER
          </span>
        );
      case 'LOGISTICS_OFFICER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-mono text-[11px] font-bold tracking-wider">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            LOGISTICS
          </span>
        );
      case 'EDGE_READ_ONLY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 font-mono text-[11px] font-bold tracking-wider">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
            READ-ONLY
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
            {role}
          </span>
        );
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-white/90 dark:bg-[#070d1f]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 shadow-xs transition-colors">
      <div className="w-full h-16 px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Left: Brand Identity & Sidebar Toggle */}
        <div className="flex items-center gap-3 min-w-max">
          <button
            onClick={toggleSidebar}
            type="button"
            className="p-1.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-all active:scale-95 flex items-center justify-center"
            title={isCollapsed ? 'Expand Sidebar [Ctrl+B]' : 'Collapse Sidebar [Ctrl+B]'}
            aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? (
              <PanelLeft className="w-4 h-4 text-emerald-500" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            )}
          </button>

          <div className="w-8 h-8 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
            <Shield className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wider text-slate-900 dark:text-white uppercase">
                RAKSHALOGIX
              </span>
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400 font-semibold">
                // FORWARD-LOGIX-OPS
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                [SECTOR-04 NORTH-WEST CORPS | DEFCON-2]
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
            <span>RESTRICTED // SECRET MIL-INTEL</span>
          </div>
        </div>

        {/* Right: Role Badge, Profile, Theme Toggle & Logout */}
        <div className="flex items-center gap-3 min-w-max">
          {/* Dynamic Role Badge */}
          {renderRoleBadge()}

          {/* User Profile Pill */}
          <div className="flex items-center gap-2 pl-2 py-1 pr-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full">
            <div className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 leading-none">
                {user?.name || 'MAJ. V. RATHORE'}
              </span>
              <span className="font-mono text-[9px] text-slate-500 dark:text-slate-400 leading-none mt-0.5">
                {user?.rank || 'CHIEF'} // {user?.username || 'OFFICER'}
              </span>
            </div>
          </div>

          {/* Theme Toggle Button */}
          <div className="flex items-center bg-slate-200 dark:bg-slate-800 p-0.5 rounded-md border border-slate-300 dark:border-slate-700">
            <button
              onClick={() => toggleTheme()}
              className={`p-1.5 rounded transition-colors ${
                theme === 'light'
                  ? 'bg-white shadow-xs text-amber-600'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Theme"
              type="button"
            >
              {theme === 'light' ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-emerald-400" />
              )}
            </button>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-700 hover:text-rose-700 dark:text-slate-300 dark:hover:text-rose-300 border border-slate-300 dark:border-slate-700 hover:border-rose-400 dark:hover:border-rose-500/50 rounded-md font-mono text-xs font-semibold transition-colors"
            title="Terminate Operational Session"
            type="button"
          >
            <Power className="w-3.5 h-3.5" />
            <span className="hidden md:inline">LOGOUT</span>
          </button>
        </div>
      </div>
    </header>
  );
};
