import React from 'react';
import { Radio, Server } from 'lucide-react';

interface ServerLoaderProps {
  message?: string;
  subtext?: string;
  className?: string;
}

export const ServerLoader: React.FC<ServerLoaderProps> = ({
  message = 'Connecting to server... (may take up to 60s on first request)',
  subtext = 'FastAPI military backend waking up from cold-standby on Render...',
  className = '',
}) => {
  return (
    <div
      className={`py-12 px-6 flex flex-col items-center justify-center gap-3 text-center bg-slate-900/60 dark:bg-surface-container/60 border border-cyan-500/30 rounded backdrop-blur-sm shadow-xl font-mono ${className}`}
    >
      <div className="relative flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin flex items-center justify-center">
          <Server className="w-5 h-5 text-cyan-400 animate-pulse" />
        </div>
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
        </span>
      </div>

      <div className="flex flex-col gap-1 items-center max-w-md">
        <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold tracking-wider uppercase">
          <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
          <span>{message}</span>
        </div>
        {subtext && (
          <p className="text-[11px] text-slate-400 dark:text-outline-variant font-mono">
            {subtext}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 mt-1">
        <span className="text-[10px] px-2 py-0.5 bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 rounded uppercase">
          HOST: RAKSHALOGIX-BACKEND.ONRENDER.COM
        </span>
        <span className="text-[10px] px-2 py-0.5 bg-amber-950/60 border border-amber-500/40 text-amber-300 rounded uppercase">
          TLS ENCRYPTED // DEFCON-2
        </span>
      </div>
    </div>
  );
};
