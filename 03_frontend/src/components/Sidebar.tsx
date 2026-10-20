import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Boxes, 
  TrendingUp, 
  Map, 
  Truck, 
  BellRing, 
  Cpu, 
  FileText,
  ChevronLeft,
  ChevronRight,
  Radio
} from 'lucide-react';
import { useSidebar } from '../context/SidebarContext';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  kbd: string;
  badge?: string;
  alertDot?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'COMMAND & TRIAGE',
    items: [
      { name: 'Command Dashboard', path: '/dashboard', icon: LayoutDashboard, kbd: 'F1' },
      { name: 'GIS Logistics Map', path: '/map', icon: Map, kbd: 'F4', alertDot: true },
      { name: 'Alerts Hub', path: '/alerts', icon: BellRing, kbd: 'F6', badge: '7' },
    ],
  },
  {
    title: 'SUSTAINMENT OPS',
    items: [
      { name: 'Inventory Matrix', path: '/inventory', icon: Boxes, kbd: 'F2' },
      { name: 'Forecast Explorer', path: '/forecast', icon: TrendingUp, kbd: 'F3' },
      { name: 'Convoy Ops', path: '/convoys', icon: Truck, kbd: 'F5' },
    ],
  },
  {
    title: 'WAR-GAMING & AUDIT',
    items: [
      { name: 'Simulation Lab', path: '/simulation', icon: Cpu, kbd: 'F7' },
      { name: 'Reports & Audit', path: '/reports', icon: FileText, kbd: 'F8' },
    ],
  },
];

export const Sidebar: React.FC = () => {
  const { isCollapsed, toggleSidebar } = useSidebar();

  return (
    <aside
      className={`sticky top-20 h-[calc(100vh-5rem)] shrink-0 z-30 bg-slate-50/95 dark:bg-[#070d1f]/90 backdrop-blur-md border-r border-slate-200 dark:border-slate-800/80 flex flex-col justify-between transition-[width] duration-200 ease-in-out select-none ${
        isCollapsed ? 'w-[72px]' : 'w-[280px]'
      }`}
    >
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
        {/* Top Header / Collapse Toggle */}
        {!isCollapsed ? (
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800/70 flex items-center justify-between font-mono text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
            <div className="flex items-center gap-1.5 truncate">
              <span>OPERATIONAL UNITS</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-cyan-400 border border-slate-300 dark:border-slate-700 text-[9px] font-bold">
                SEC-04
              </span>
            </div>
            <button
              onClick={toggleSidebar}
              type="button"
              title="Collapse Sidebar [Ctrl+B]"
              aria-label="Collapse Sidebar"
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="py-2.5 flex items-center justify-center border-b border-slate-200 dark:border-slate-800/70">
            <button
              onClick={toggleSidebar}
              type="button"
              title="Expand Sidebar [Ctrl+B]"
              aria-label="Expand Sidebar"
              className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            </button>
          </div>
        )}

        {/* Tactical Navigation Groups */}
        <nav className="p-2 flex flex-col gap-4">
          {navGroups.map((group, groupIdx) => (
            <div key={group.title} className="flex flex-col gap-1">
              {/* Group Header */}
              {!isCollapsed ? (
                <div className="px-3 pt-1 pb-1 font-mono text-[10px] uppercase tracking-wider text-slate-500 font-semibold select-none flex items-center justify-between">
                  <span>{group.title}</span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-600">0{groupIdx + 1}</span>
                </div>
              ) : (
                groupIdx > 0 && <div className="my-1.5 mx-3 border-t border-slate-200 dark:border-slate-800/80" />
              )}

              {/* Group Links */}
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={isCollapsed ? `${item.name} (${item.kbd})` : undefined}
                    className={({ isActive }) =>
                      `rounded font-mono text-xs transition-colors duration-150 ${
                        isCollapsed
                          ? 'flex items-center justify-center p-3 relative'
                          : 'flex items-center justify-between px-3 py-2'
                      } ${
                        isActive
                          ? 'border-l-2 border-emerald-500 dark:border-emerald-400 bg-slate-200/80 dark:bg-slate-800/70 text-slate-900 dark:text-white font-semibold shadow-xs'
                          : 'border-l-2 border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className={`flex items-center ${isCollapsed ? 'justify-center relative' : 'gap-2.5 truncate'}`}>
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-colors ${
                              isActive
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          />
                          {!isCollapsed && <span className="truncate">{item.name}</span>}

                          {/* Alert indicators */}
                          {item.alertDot && (
                            <span
                              className={`w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0 ${
                                isCollapsed ? 'absolute -top-1 -right-1' : ''
                              }`}
                            ></span>
                          )}

                          {item.badge && (
                            <span
                              className={`rounded-full bg-red-600 text-white font-mono font-bold shrink-0 flex items-center justify-center ${
                                isCollapsed
                                  ? 'absolute -top-1.5 -right-2 text-[9px] w-4 h-4'
                                  : 'px-1.5 py-0.2 text-[10px]'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>

                        {!isCollapsed && (
                          <span
                            className={`font-mono text-[10px] px-1 py-0.5 rounded border shrink-0 ${
                              isActive
                                ? 'bg-slate-300/80 dark:bg-slate-700/80 text-slate-800 dark:text-slate-200 border-slate-400/40 dark:border-slate-600'
                                : 'bg-slate-200/60 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-slate-300/60 dark:border-slate-800'
                            }`}
                          >
                            {item.kbd}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Sat-Link Telemetry Footer */}
      {!isCollapsed ? (
        <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 bg-slate-100/50 dark:bg-slate-900/40">
          <div className="bg-white/80 dark:bg-slate-900/60 rounded p-2.5 border border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-mono text-[10px] uppercase text-slate-700 dark:text-slate-300 font-bold tracking-wider">
                  SAT-LINK ENCRYPTED
                </span>
              </div>
              <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                99.4%
              </span>
            </div>
            <div className="flex items-center justify-between font-mono text-[11px] text-slate-500 dark:text-slate-400">
              <span>Ku-BAND PING</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">14ms // LOCK</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden mt-2">
              <div className="bg-emerald-500 h-full w-[94%]"></div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="p-3 border-t border-slate-200 dark:border-slate-800/80 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800/30 transition-colors"
          title="SAT-LINK ENCRYPTED // 99.4% UPTIME // 14ms Ku-BAND LOCK"
        >
          <div className="relative">
            <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>
          <span className="font-mono text-[9px] text-emerald-500 font-bold mt-1 tabular-nums">99%</span>
        </div>
      )}
    </aside>
  );
};
