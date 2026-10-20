import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import type { RouteOptimiseResponse, RouteFallbackResponse } from '../types/api';
import { 
  Map as MapIcon, 
  Navigation, 
  Layers, 
  CheckCircle, 
  Loader2,
  Snowflake,
  ChevronRight,
  Info
} from 'lucide-react';
import { ServerLoader } from '../components/ServerLoader';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Polyline,
  Circle,
  Tooltip,
  useMap
} from 'react-leaflet';
import L from 'leaflet';

// Create tactical HTML DivIcon helpers
const createTacticalPin = (statusColor: string, code: string, isDepot = false) => {
  const isCritical = statusColor === '#ef4444';
  return L.divIcon({
    className: 'custom-tactical-pin',
    html: `
      <div style="display:flex; flex-direction:column; align-items:center; transform: translate(-50%, -100%); position:relative;">
        ${
          isCritical
            ? `
          <div style="
            position: absolute;
            top: ${isDepot ? '9px' : '7.5px'};
            left: 50%;
            transform: translate(-50%, -50%);
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 2px solid #ef4444;
            animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
            pointer-events: none;
            opacity: 0.8;
          "></div>
        `
            : ''
        }
        <div style="
          background-color: ${isDepot ? '#020617' : statusColor};
          width: ${isDepot ? '18px' : '15px'};
          height: ${isDepot ? '18px' : '15px'};
          border-radius: ${isDepot ? '2px' : '50%'};
          border: 2px solid ${statusColor};
          box-shadow: 0 0 10px ${statusColor}, 0 0 2px #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 2;
        ">
          <div style="
            width: 5px;
            height: 5px;
            background: #fff;
            border-radius: ${isDepot ? '1px' : '50%'};
          "></div>
        </div>
        <div style="
          margin-top: 3px;
          background: rgba(2, 6, 23, 0.92);
          border: 1px solid ${statusColor};
          color: #f8fafc;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          padding: 1px 4px;
          border-radius: 3px;
          white-space: nowrap;
          box-shadow: 0 2px 4px rgba(0,0,0,0.5);
          position: relative;
          z-index: 2;
        ">
          ${code}
        </div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const createBlockedPassPin = (label: string) => {
  return L.divIcon({
    className: 'custom-blocked-pin',
    html: `
      <div style="display:flex; flex-direction:column; align-items:center; transform: translate(-50%, -100%);">
        <div style="
          background: #ef4444;
          width: 22px;
          height: 22px;
          border-radius: 3px;
          border: 2px solid #ffffff;
          box-shadow: 0 0 14px rgba(239, 68, 68, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: pulse 1.8s infinite;
        ">
          <span style="color:#ffffff; font-size:14px; font-weight:900; line-height:1;">✕</span>
        </div>
        <div style="
          margin-top: 3px;
          background: rgba(15, 23, 42, 0.95);
          border: 1.5px solid #ef4444;
          color: #fca5a5;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 800;
          padding: 2px 5px;
          border-radius: 3px;
          white-space: nowrap;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        ">
          ${label}
        </div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

const createConvoyPin = (code: string) => {
  return L.divIcon({
    className: 'custom-truck-pin',
    html: `
      <div style="display:flex; flex-direction:column; align-items:center; transform: translate(-50%, -50%);">
        <div style="
          background: #047857;
          color: #ecfdf5;
          border: 1.5px solid #34d399;
          border-radius: 4px;
          padding: 2px 6px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 4px;
          box-shadow: 0 0 12px rgba(16, 185, 129, 0.6);
          white-space: nowrap;
        ">
          <span>🚚</span>
          <span>${code}</span>
        </div>
      </div>
    `,
    iconSize: [80, 24],
    iconAnchor: [40, 12],
  });
};

const createStormCenterPin = () => {
  return L.divIcon({
    className: 'custom-storm-pin',
    html: `
      <div style="display:flex; flex-direction:column; align-items:center; transform: translate(-50%, -50%);">
        <div style="
          background: rgba(239, 68, 68, 0.2);
          border: 1.5px dashed #ef4444;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 16px rgba(239, 68, 68, 0.5);
        ">
          <span style="font-size: 16px;">❄️</span>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

// All 8 Tactical Units and Depots (UNIT_01 Leh HQ to UNIT_08 DBO)
interface TheaterLocation {
  id: string;
  name: string;
  code: string;
  isDepot: boolean;
  status: 'RED' | 'AMBER' | 'GREEN';
  color: string;
  pos: [number, number];
  altitude_m: number;
  stock: string;
  daily_burn: string;
  runway_days: number;
  details: string;
}

const theaterUnitsAndDepots: TheaterLocation[] = [
  {
    id: 'UNIT_01',
    name: 'Leh Central Logistics HQ',
    code: 'HQ 14 CORPS',
    isDepot: true,
    status: 'GREEN',
    color: '#10b981',
    pos: [34.16, 77.58],
    altitude_m: 3500,
    stock: '248,000 L POL // Munitions Nominal',
    daily_burn: '8,200 L/d',
    runway_days: 30.2,
    details: 'Strategic Depot Hub // All inbound axes operational',
  },
  {
    id: 'UNIT_02',
    name: 'Kargil Intermediate Depot',
    code: 'KARGIL DEPOT',
    isDepot: true,
    status: 'GREEN',
    color: '#10b981',
    pos: [34.55, 76.13],
    altitude_m: 2676,
    stock: '94,000 L Bulk Fuel & Lube',
    daily_burn: '4,500 L/d',
    runway_days: 20.9,
    details: 'Forward Supply Depot // Staging for 4 combat FOBs',
  },
  {
    id: 'UNIT_03',
    name: 'FOB Charlie (Tiger Post)',
    code: 'FOB CHARLIE',
    isDepot: false,
    status: 'RED',
    color: '#ef4444',
    pos: [34.62, 76.32],
    altitude_m: 4328,
    stock: '1,750 L POL-88 Arctic Fuel',
    daily_burn: '1,250 L/d',
    runway_days: 1.4,
    details: 'CRITICAL RUNWAY // Genset continuous load // T-34h dryout',
  },
  {
    id: 'UNIT_04',
    name: 'Dras Command Post',
    code: 'DRAS SECTOR',
    isDepot: false,
    status: 'AMBER',
    color: '#f59e0b',
    pos: [34.42, 75.75],
    altitude_m: 3291,
    stock: '18,400 rnds 5.56mm Ammo',
    daily_burn: '4,200 rnds/d',
    runway_days: 4.4,
    details: 'WARNING // Increased patrol expenditures // Runway 4.4d',
  },
  {
    id: 'UNIT_05',
    name: 'FOB Alpha (Tiger Hill)',
    code: 'FOB ALPHA',
    isDepot: false,
    status: 'RED',
    color: '#ef4444',
    pos: [34.48, 75.82],
    altitude_m: 5060,
    stock: '2,200 L POL-88 Arctic Fuel',
    daily_burn: '800 L/d',
    runway_days: 2.8,
    details: 'CRITICAL RUNWAY // Sub-zero freeze (-31°C) // Fuel buffer thin',
  },
  {
    id: 'UNIT_06',
    name: 'Diskit Forward Outpost',
    code: 'DISKIT POST',
    isDepot: false,
    status: 'AMBER',
    color: '#f59e0b',
    pos: [34.54, 77.55],
    altitude_m: 3140,
    stock: '1,200 pkts Ration MREs',
    daily_burn: '180 pkts/d',
    runway_days: 6.7,
    details: 'WARNING // Valley transit snowbound // Auxiliary solar degraded',
  },
  {
    id: 'UNIT_07',
    name: 'Chumathang Staging Post',
    code: 'CHUMATHANG',
    isDepot: false,
    status: 'RED',
    color: '#ef4444',
    pos: [33.35, 78.35],
    altitude_m: 4023,
    stock: '3,400 L POL-88 Arctic Fuel',
    daily_burn: '1,300 L/d',
    runway_days: 2.6,
    details: 'CRITICAL RUNWAY // Eastern Ladakh frontier // 2.6d remaining',
  },
  {
    id: 'UNIT_08',
    name: 'Daulat Beg Oldie (DBO)',
    code: 'POST DBO',
    isDepot: false,
    status: 'RED',
    color: '#ef4444',
    pos: [35.24, 77.92],
    altitude_m: 5065,
    stock: '3,500 L Fuel // 24 cyl Oxygen',
    daily_burn: '2,500 L/d',
    runway_days: 1.4,
    details: 'CRITICAL ADVANCED POST // High-altitude pulmonary O2 critical',
  },
];

// Active Convoys along transit axes
interface ActiveConvoy {
  id: string;
  name: string;
  code: string;
  pos: [number, number];
  vehicle_count: number;
  cargo: string;
  speed: string;
  eta: string;
  status: string;
}

const activeConvoys: ActiveConvoy[] = [
  {
    id: 'CONVOY_ALPHA',
    name: 'Convoy Echo-4 (Heavy Fuel Tankers)',
    code: 'CVY-ECHO-4',
    pos: [34.48, 75.95],
    vehicle_count: 6,
    cargo: 'Class-III POL-88 (30kL)',
    speed: '38 km/h',
    eta: '03h 42m',
    status: 'IN_TRANSIT (Green Corridor)',
  },
  {
    id: 'CONVOY_BRAVO',
    name: 'Convoy Delta-2 (Munitions & Spares)',
    code: 'CVY-DELTA-2',
    pos: [34.35, 76.80],
    vehicle_count: 4,
    cargo: '5.56mm NATO Ammunition (40k rnds)',
    speed: '35 km/h',
    eta: '01h 15m',
    status: 'IN_TRANSIT (Approaching Khalsi)',
  },
];

// Default baseline Route Coordinates
const defaultPrimaryRouteCoords: [number, number][] = [
  [34.15, 74.80], // Srinagar Rear Base
  [34.30, 75.35], // Approach Zoji La
  [34.42, 75.75], // Dras Sector Post
  [34.55, 76.13], // Kargil Intermediate Depot
  [34.35, 76.80], // Khalsi Junction
  [34.16, 77.58], // Leh Central Logistics HQ
];

const zojilaBlockedSegment: [number, number][] = [
  [34.25, 75.40],
  [34.278, 75.470],
  [34.34, 75.56],
];

const passEchoBlockedSegment: [number, number][] = [
  [34.82, 76.60],
  [34.880, 76.750],
  [34.92, 76.85],
];

const defaultFallbackRouteCoords: [number, number][] = [
  [34.16, 77.58], // Leh Central Logistics HQ
  [34.40, 77.70], // Wari La / South Ridge Pass
  [34.54, 77.55], // Diskit Forward Outpost (Nubra)
  [34.88, 77.20], // Shyok River Valley Corridor
  [34.62, 76.32], // FOB Charlie (Tiger Post)
  [34.55, 76.13], // Kargil Intermediate Depot
  [34.35, 76.80], // Khalsi Junction
  [34.16, 77.58], // Leh Return Loop
];

// Map Resize Watcher helper component
const MapResizeWatcher: React.FC = () => {
  const map = useMap();

  React.useEffect(() => {
    const handleResize = () => {
      map.invalidateSize();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('sidebar-toggle', handleResize);

    const t1 = setTimeout(handleResize, 100);
    const t2 = setTimeout(handleResize, 250);
    const t3 = setTimeout(handleResize, 500);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('sidebar-toggle', handleResize);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [map]);

  return null;
};

export const GisMap: React.FC = () => {
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [optimisedRoute, setOptimisedRoute] = useState<RouteOptimiseResponse | null>(null);
  const [fallbackRoute, setFallbackRoute] = useState<RouteFallbackResponse | null>(null);
  const [optimising, setOptimising] = useState(false);
  const [fetchingFallback, setFetchingFallback] = useState(false);

  // Basemap selector: 'DARK' | 'SATELLITE' | 'TOPO' (100% Free & Keyless)
  const [basemapStyle, setBasemapStyle] = useState<'DARK' | 'SATELLITE' | 'TOPO'>('DARK');

  // 5 Tactical GIS Layer toggles (Default all ON as per SIH spec)
  const [showUnits, setShowUnits] = useState(true);
  const [showDepots, setShowDepots] = useState(true);
  const [showConvoys, setShowConvoys] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showWeatherHazards, setShowWeatherHazards] = useState(true);

  // State to force alternative polyline display when toggled
  const [showAlternativeCorridor, setShowAlternativeCorridor] = useState(false);

  // Handle [Optimise Route] button click
  const handleOptimiseRoute = async () => {
    try {
      setOptimising(true);
      const res = await api.optimiseRoute({ origin_id: 'HQ_LEH', dest_id: 'FOB_CHARLIE' });
      setOptimisedRoute(res);
      addToast('Route Victor-North (Leh-Diskit) calculated: Green Corridor cleared', 'success');
    } catch {
      addToast('Route optimization calculation fallback engaged', 'warning');
    } finally {
      setOptimising(false);
    }
  };

  // Handle [Show Alternative] button click
  const handleShowAlternative = async () => {
    try {
      setFetchingFallback(true);
      const res = await api.getRouteFallback('RT_LEH_DISKIT');
      setFallbackRoute(res);
      setShowAlternativeCorridor(true);
      addToast('Southern Ridge Alternative Corridor active (+4h 15m delay)', 'warning');
    } catch {
      addToast('Alternative route corridor loaded from local tactical cache', 'warning');
      setShowAlternativeCorridor(true);
    } finally {
      setFetchingFallback(false);
    }
  };

  const primaryCoords = optimisedRoute?.coordinates || defaultPrimaryRouteCoords;
  const fallbackCoords = fallbackRoute?.coordinates || defaultFallbackRouteCoords;

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <MapIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h1 className="font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wider">
              GIS TACTICAL THEATER MAP // SECTOR-04 (LADAKH / KARGIL / SIACHEN)
            </h1>
          </div>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
            Center: 34.55°N 77.15°E // Keyless Tactical Tile Context with Dynamic A* Pathfinding
          </p>
        </div>

        {/* Action Triggers: [Show Alternative] & [Optimise Route] */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Show Alternative Button */}
          <button
            type="button"
            disabled={fetchingFallback}
            onClick={handleShowAlternative}
            className={`px-3.5 py-1.5 rounded-md font-mono text-xs font-bold border transition-all shadow-xs flex items-center gap-1.5 ${
              showAlternativeCorridor
                ? 'bg-amber-500 text-slate-950 border-amber-400 ring-2 ring-amber-500/30'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
            }`}
          >
            {fetchingFallback ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            )}
            <span>{showAlternativeCorridor ? 'Bypass Corridor Active' : 'Show Alternative'}</span>
          </button>

          {/* Optimise Route Button */}
          <button
            type="button"
            disabled={optimising}
            onClick={handleOptimiseRoute}
            className="px-3.5 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
          >
            {optimising ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle className="w-3.5 h-3.5" />
            )}
            <span>Optimise Route</span>
          </button>
        </div>
      </div>

      {/* Loading state indicator */}
      {(optimising || fetchingFallback) && (
        <ServerLoader message="Recomputing dynamic A* corridor traversal weights..." />
      )}

      {/* Filter Bar: 5 Tactical Layers + Basemap Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white dark:bg-slate-900/60 p-2.5 rounded-md border border-slate-200 dark:border-slate-800/80 font-mono text-xs shadow-xs">
        {/* Layer Toggle Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-500 uppercase text-[10px] font-bold mr-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-slate-400" /> LAYERS:
          </span>

          {/* 1. Units Toggle */}
          <button
            type="button"
            onClick={() => setShowUnits(!showUnits)}
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
              showUnits
                ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-transparent'
            }`}
          >
            Units [6]
          </button>

          {/* 2. Depots Toggle */}
          <button
            type="button"
            onClick={() => setShowDepots(!showDepots)}
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
              showDepots
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-transparent'
            }`}
          >
            Depots [2]
          </button>

          {/* 3. Convoys Toggle */}
          <button
            type="button"
            onClick={() => setShowConvoys(!showConvoys)}
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
              showConvoys
                ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/40'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-transparent'
            }`}
          >
            Convoys [2]
          </button>

          {/* 4. Routes Toggle */}
          <button
            type="button"
            onClick={() => setShowRoutes(!showRoutes)}
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
              showRoutes
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-transparent'
            }`}
          >
            Routes &amp; Passes
          </button>

          {/* 5. Weather Hazards Toggle */}
          <button
            type="button"
            onClick={() => setShowWeatherHazards(!showWeatherHazards)}
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors flex items-center gap-1 ${
              showWeatherHazards
                ? 'bg-rose-600 text-white border border-rose-500'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-transparent'
            }`}
          >
            <Snowflake className="w-3 h-3" />
            <span>Weather Hazards</span>
          </button>
        </div>

        {/* 100% Free Keyless Basemap Switcher */}
        <div className="flex items-center gap-1 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800 sm:pl-2.5 pt-1 sm:pt-0">
          <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">BASEMAP:</span>
          <button
            type="button"
            onClick={() => setBasemapStyle('DARK')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
              basemapStyle === 'DARK'
                ? 'bg-slate-900 text-cyan-400 border border-cyan-500/40 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Tactical Dark
          </button>
          <button
            type="button"
            onClick={() => setBasemapStyle('SATELLITE')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
              basemapStyle === 'SATELLITE'
                ? 'bg-emerald-600 text-white font-extrabold shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Satellite
          </button>
          <button
            type="button"
            onClick={() => setBasemapStyle('TOPO')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
              basemapStyle === 'TOPO'
                ? 'bg-amber-600 text-white font-extrabold shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Topo Terrain
          </button>
        </div>
      </div>

      {/* Main Map Viewport */}
      <div className="w-full h-[650px] rounded-md overflow-hidden border border-slate-200 dark:border-slate-800/80 shadow-lg relative">
        {/* Radar Sweep Telemetry Overlay */}
        <div className="radar-sweep-overlay pointer-events-none" />

        <MapContainer
          center={[34.55, 77.15]}
          zoom={8}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <MapResizeWatcher />
          {basemapStyle === 'DARK' ? (
            <TileLayer
              key="gis-dark-osm"
              className="tactical-osm-dark-tiles"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
          ) : basemapStyle === 'SATELLITE' ? (
            <TileLayer
              key="gis-esri-satellite"
              attribution="Tiles &copy; Esri &mdash; Source: Esri, USGS, NOAA"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={18}
            />
          ) : (
            <TileLayer
              key="gis-opentopomap"
              attribution="Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap"
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
              maxZoom={17}
            />
          )}

          {/* ===================================================================
              LAYER 1 & 2: UNITS & DEPOTS MARKERS (R / A / G Supply Status)
              =================================================================== */}
          {theaterUnitsAndDepots.map((loc) => {
            if (loc.isDepot && !showDepots) return null;
            if (!loc.isDepot && !showUnits) return null;

            return (
              <Marker
                key={loc.id}
                position={loc.pos}
                icon={createTacticalPin(loc.color, loc.code, loc.isDepot)}
              >
                <Popup>
                  <div className="font-mono text-xs p-1 space-y-1.5 min-w-[210px]">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-1">
                      <strong className="text-slate-900 dark:text-white font-bold text-xs uppercase">
                        {loc.name}
                      </strong>
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white uppercase"
                        style={{ backgroundColor: loc.color }}
                      >
                        {loc.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase">ALTITUDE:</span>
                        <strong className="tabular-nums">{loc.altitude_m} m</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase">RUNWAY:</span>
                        <strong
                          className="tabular-nums font-bold"
                          style={{ color: loc.color }}
                        >
                          {loc.runway_days.toFixed(1)} Days
                        </strong>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-700 dark:text-slate-200 border-t border-slate-100 dark:border-slate-800 pt-1">
                      <span className="text-slate-400 block text-[9px] uppercase">ON-HAND STOCK:</span>
                      <span className="font-semibold">{loc.stock}</span>
                      <div className="text-[10px] text-slate-500">Burn: {loc.daily_burn}</div>
                    </div>

                    <div className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                      {loc.details}
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate(`/forecast?unit=${loc.id}`)}
                      className="w-full mt-1.5 py-1 px-2 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                    >
                      <span>Run Forecast</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* ===================================================================
              LAYER 3: ROUTES & BLOCKED PASS SEGMENTS
              =================================================================== */}
          {showRoutes && (
            <>
              {/* Primary Safe Route: Solid Emerald (#10b981, weight=4) */}
              <Polyline
                positions={primaryCoords}
                pathOptions={{
                  color: '#10b981',
                  weight: 4,
                  opacity: 0.9,
                  className: 'convoy-route-animated',
                }}
              >
                <Tooltip sticky>
                  <span className="font-mono text-xs font-bold text-emerald-800">
                    Route Victor-North (Primary Green Axis // 116 km)
                  </span>
                </Tooltip>
              </Polyline>

              {/* Blocked Pass Segment 1: Zojila Pass (Dashed Red, color="#ef4444", dashArray="6, 6") */}
              <Polyline
                positions={zojilaBlockedSegment}
                pathOptions={{
                  color: '#ef4444',
                  weight: 4,
                  dashArray: '6, 6',
                  opacity: 0.95,
                }}
              />

              {/* Blocked Pass Segment 2: Pass Echo (Dashed Red, color="#ef4444", dashArray="6, 6") */}
              <Polyline
                positions={passEchoBlockedSegment}
                pathOptions={{
                  color: '#ef4444',
                  weight: 4,
                  dashArray: '6, 6',
                  opacity: 0.95,
                }}
              />

              {/* High-contrast Red ✕ Blocked Pass Marker at Zojila Pass */}
              <Marker
                position={[34.278, 75.470]}
                icon={createBlockedPassPin('ZOJI LA PASS')}
              >
                <Tooltip direction="top" offset={[0, -20]} opacity={1}>
                  <div className="font-mono text-xs font-bold text-rose-700">
                    BLOCKED: 85mm Blizzard Snowfall (+999 Traversal Penalty)
                  </div>
                </Tooltip>
                <Popup>
                  <div className="font-mono text-xs space-y-1">
                    <strong className="text-rose-600 uppercase font-bold">
                      Zoji La Pass Interdiction
                    </strong>
                    <div>Status: PASS BLOCKED</div>
                    <div>Accumulation: 85mm Blizzard Snowfall (142cm Pack)</div>
                    <div className="text-rose-500 font-bold">Traversal Penalty: +999 Weight</div>
                    <div className="text-[10px] text-slate-500">
                      Recommendation: Divert to Shyok-Nubra Valley Detour
                    </div>
                  </div>
                </Popup>
              </Marker>

              {/* High-contrast Red ✕ Blocked Pass Marker at Pass Echo */}
              <Marker
                position={[34.880, 76.750]}
                icon={createBlockedPassPin('PASS ECHO')}
              >
                <Tooltip direction="top" offset={[0, -20]} opacity={1}>
                  <div className="font-mono text-xs font-bold text-rose-700">
                    BLOCKED: 85mm Blizzard Snowfall (+999 Traversal Penalty)
                  </div>
                </Tooltip>
                <Popup>
                  <div className="font-mono text-xs space-y-1">
                    <strong className="text-rose-600 uppercase font-bold">
                      Pass Echo Ridge Interdiction
                    </strong>
                    <div>Status: PASS BLOCKED</div>
                    <div>Accumulation: 85mm Snow Drift</div>
                    <div className="text-rose-500 font-bold">Traversal Penalty: +999 Weight</div>
                  </div>
                </Popup>
              </Marker>

              {/* Alternative / Valley Bypass Corridor: Dashed Amber (#f59e0b, weight=3, dashArray="8, 8") */}
              {(showAlternativeCorridor || fallbackRoute) && (
                <Polyline
                  positions={fallbackCoords}
                  pathOptions={{
                    color: '#f59e0b',
                    weight: 3.5,
                    dashArray: '8, 8',
                    opacity: 0.95,
                    className: 'convoy-route-animated',
                  }}
                >
                  <Tooltip sticky>
                    <span className="font-mono text-xs font-bold text-amber-800">
                      Shyok-Nubra Valley Detour Corridor (+4h 15m delay)
                    </span>
                  </Tooltip>
                </Polyline>
              )}
            </>
          )}

          {/* ===================================================================
              LAYER 4: LIVE CONVOYS
              =================================================================== */}
          {showConvoys &&
            activeConvoys.map((convoy) => (
              <Marker
                key={convoy.id}
                position={convoy.pos}
                icon={createConvoyPin(convoy.code)}
              >
                <Popup>
                  <div className="font-mono text-xs space-y-1 p-1 min-w-[200px]">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-1">
                      <strong className="text-emerald-700 dark:text-emerald-400 uppercase">
                        {convoy.name}
                      </strong>
                    </div>
                    <div className="text-[11px] text-slate-700 dark:text-slate-300">
                      <div>Cargo: <strong>{convoy.cargo}</strong></div>
                      <div>Vehicles: <strong>{convoy.vehicle_count} ALS Units</strong></div>
                      <div>Speed: <strong>{convoy.speed}</strong></div>
                      <div>ETA: <strong className="text-emerald-600 dark:text-emerald-400">{convoy.eta}</strong></div>
                      <div>Status: <span className="font-semibold text-cyan-600 dark:text-cyan-400">{convoy.status}</span></div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

          {/* ===================================================================
              LAYER 5: WEATHER / BLIZZARD HAZARD CIRCLE
              =================================================================== */}
          {showWeatherHazards && (
            <>
              {/* Active Blizzard Storm Center (50km ST_DWithin Threat Zone) */}
              <Circle
                center={[35.10, 77.20]}
                radius={30000}
                pathOptions={{
                  color: '#ef4444',
                  fillColor: '#ef4444',
                  fillOpacity: 0.12,
                  weight: 2,
                  dashArray: '4, 4',
                }}
              >
                <Tooltip direction="top" opacity={0.95}>
                  <div className="font-mono text-xs font-bold text-rose-700">
                    BLIZZARD THREAT ZONE // ST_DWithin(50km) // 85mm Snowfall
                  </div>
                </Tooltip>
              </Circle>

              {/* Storm Center Pin */}
              <Marker position={[35.10, 77.20]} icon={createStormCenterPin()}>
                <Popup>
                  <div className="font-mono text-xs space-y-1">
                    <strong className="text-rose-600 uppercase font-bold flex items-center gap-1">
                      <Snowflake className="w-3.5 h-3.5" /> Storm Cell Epsilon
                    </strong>
                    <div>Center: 35.10°N 77.20°E</div>
                    <div>Precipitation: 85mm Arctic Snowfall</div>
                    <div>Wind: 68kt Gusts (-34°C)</div>
                    <div className="text-rose-500 font-bold">50km Outposts in Hazard: DBO, Diskit, Charlie</div>
                  </div>
                </Popup>
              </Marker>
            </>
          )}
        </MapContainer>

        {/* HUD Overlay 1: Active Route Telemetry & Composite Cost Formula Card */}
        <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur-md p-3.5 rounded-md border border-slate-700/80 shadow-xl font-mono text-xs text-slate-100 flex flex-col gap-2 max-w-md">
          <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
            <span className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-cyan-400" />
              ROUTE TELEMETRY &amp; COST FORMULA
            </span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              A* SOLVER SYNC
            </span>
          </div>

          {/* Composite Cost Formula Header */}
          <div className="p-2 rounded bg-slate-950/80 border border-slate-800 text-[11px] space-y-1">
            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between">
              <span>COMPOSITE TRAVERSAL COST FORMULA:</span>
              <Info className="w-3 h-3 text-cyan-400" />
            </div>
            <code className="text-amber-400 font-mono text-[10.5px] block font-bold">
              Cost = Dist + 1.8*Terrain + 0.25*Snow + 999*Blocked
            </code>
          </div>

          {/* Route Comparison Breakdown */}
          <div className="space-y-1.5 text-[11px] tabular-nums">
            <div className="flex items-center justify-between text-emerald-400 font-bold border-b border-slate-800/60 pb-1">
              <span>GREEN CORRIDOR (VICTOR-NORTH):</span>
              <span>116 km // 4.2h // Cost: 187.65</span>
            </div>

            {showAlternativeCorridor && (
              <div className="flex items-center justify-between text-amber-400 font-bold border-b border-slate-800/60 pb-1">
                <span>SHYOK-NUBRA BYPASS:</span>
                <span>154 km // 8.3h // +4h 15m delay // Cost: 218.95</span>
              </div>
            )}

            <div className="flex justify-between text-[10.5px] text-rose-400 pt-0.5">
              <span>ZOJI LA PASS (+999 PENALTY):</span>
              <span className="font-bold">BLOCKED (85mm SNOW)</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px] text-slate-400">
            <span>SECTOR: LADAKH / KARGIL / SIACHEN</span>
            <span>ALGORITHM: A* HEURISTIC (LAT/LON)</span>
          </div>
        </div>

        {/* HUD Overlay 2: Tactical Legend (Top Right) */}
        <div className="absolute top-4 right-4 z-[1000] bg-slate-900/90 backdrop-blur-md p-3 rounded-md border border-slate-700/80 shadow-lg font-mono text-[11px] text-slate-200 flex flex-col gap-1.5 min-w-[190px]">
          <div className="font-bold text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-700 pb-1">
            TACTICAL LEGEND
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs"></span>
            <span>Nominal Runway (&gt;7d)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs"></span>
            <span>Warning Runway (3–7d)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs"></span>
            <span>Critical Runway (&lt;3d)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-0.5 bg-emerald-500"></span>
            <span>Solid Emerald: Primary Route</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-0.5 border-t-2 border-dashed border-amber-400"></span>
            <span>Dashed Amber: Bypass Detour</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-rose-500 font-extrabold text-xs">✕</span>
            <span>Dashed Red: Blocked Pass</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs">🚚</span>
            <span>Live Convoy GPS</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full border border-dashed border-rose-500 bg-rose-500/20"></span>
            <span>Blizzard 50km Hazard</span>
          </div>
        </div>
      </div>
    </div>
  );
};
