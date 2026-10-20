import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { 
  Map as MapIcon, 
  Navigation, 
  Layers, 
  Loader2,
  Snowflake,
  ChevronRight,
  ShieldCheck,
  Ban,
  Compass
} from 'lucide-react';
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

// Tactical HTML DivIcon Pin Creators
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
            width: 26px;
            height: 26px;
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
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid ${statusColor};
          color: #f8fafc;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          padding: 1px 5px;
          border-radius: 3px;
          white-space: nowrap;
          box-shadow: 0 2px 4px rgba(0,0,0,0.6);
          position: relative;
          z-index: 2;
        ">
          ${code}
        </div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
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
          border-radius: 4px;
          border: 2px solid #ffffff;
          box-shadow: 0 0 14px rgba(239, 68, 68, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: pulse 1.8s infinite;
        ">
          <span style="color:#ffffff; font-size:13px; font-weight:900; line-height:1;">✕</span>
        </div>
        <div style="
          margin-top: 3px;
          background: rgba(15, 23, 42, 0.95);
          border: 1.5px solid #ef4444;
          color: #fca5a5;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 800;
          padding: 1px 5px;
          border-radius: 3px;
          white-space: nowrap;
          text-transform: uppercase;
        ">
          ${label}
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
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
          box-shadow: 0 0 12px rgba(16, 185, 129, 0.7);
          white-space: nowrap;
        ">
          <span>🚚</span>
          <span>${code}</span>
        </div>
      </div>
    `,
    iconSize: [84, 24],
    iconAnchor: [42, 12],
  });
};

// Genuine Himalayan Coordinates (Bound to Earth)
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
}

const theaterUnitsAndDepots: TheaterLocation[] = [
  {
    id: 'UNIT_01',
    name: 'Leh Central Logistics Hub',
    code: 'LEH HQ',
    isDepot: true,
    status: 'GREEN',
    color: '#10b981',
    pos: [34.15, 77.57],
    altitude_m: 3500,
    stock: '248,000 L POL // Nominal',
    daily_burn: '8,200 L/d',
    runway_days: 30.2,
  },
  {
    id: 'UNIT_02',
    name: 'Kargil Forward Depot',
    code: 'KARGIL DEPOT',
    isDepot: true,
    status: 'GREEN',
    color: '#10b981',
    pos: [34.55, 76.13],
    altitude_m: 2676,
    stock: '94,000 L Bulk Fuel',
    daily_burn: '4,500 L/d',
    runway_days: 20.9,
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
    stock: '1,750 L POL-88 Fuel',
    daily_burn: '1,250 L/d',
    runway_days: 1.4,
  },
  {
    id: 'UNIT_04',
    name: 'Dras Command Post',
    code: 'DRAS SECTOR',
    isDepot: false,
    status: 'AMBER',
    color: '#f59e0b',
    pos: [34.43, 75.75],
    altitude_m: 3291,
    stock: '18,400 rnds 5.56mm Ammo',
    daily_burn: '4,200 rnds/d',
    runway_days: 4.4,
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
    stock: '2,200 L POL-88',
    daily_burn: '800 L/d',
    runway_days: 2.8,
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
    stock: '1,200 pkts Ration MRE',
    daily_burn: '180 pkts/d',
    runway_days: 6.7,
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
    stock: '3,400 L POL-88 Fuel',
    daily_burn: '1,300 L/d',
    runway_days: 2.6,
  },
  {
    id: 'UNIT_08',
    name: 'Daulat Beg Oldie (DBO)',
    code: 'POST DBO',
    isDepot: false,
    status: 'RED',
    color: '#ef4444',
    pos: [35.39, 77.92],
    altitude_m: 5065,
    stock: '3,500 L Fuel // 24 cyl O2',
    daily_burn: '2,500 L/d',
    runway_days: 1.4,
  },
];

interface ActiveConvoy {
  id: string;
  name: string;
  code: string;
  pos: [number, number];
  vehicle_count: number;
  cargo: string;
  eta: string;
  status: string;
}

const activeConvoys: ActiveConvoy[] = [
  {
    id: 'CONVOY_ALPHA',
    name: 'Convoy Echo-4 (Heavy Fuel Tankers)',
    code: 'CVY-ECHO-4',
    pos: [34.48, 76.45],
    vehicle_count: 6,
    cargo: 'POL-88 (30kL)',
    eta: '03h 42m',
    status: 'IN_TRANSIT (Valley Bypass)',
  },
  {
    id: 'CONVOY_BRAVO',
    name: 'Convoy Delta-2 (Munitions & Spares)',
    code: 'CVY-DELTA-2',
    pos: [34.35, 76.88],
    vehicle_count: 4,
    cargo: '5.56mm Ammo (40k rnds)',
    eta: '01h 15m',
    status: 'IN_TRANSIT (Approaching Khalsi)',
  },
];

// Realistic Multi-Waypoint Road Polylines following real Himalayan valleys
// 1. Blocked Zoji La Route: From Srinagar up to Zoji La Pass crest (stops at pass marker)
const blockedZojilaRouteCoords: [number, number][] = [
  [34.08, 74.79], // Srinagar Rear Base
  [34.18, 75.05], // Ganderbal
  [34.31, 75.29], // Sonamarg
  [34.28, 75.47], // Zoji La Pass Crest (Blocked)
];

// 2. A* Valley Bypass Corridor (Safe, Clear of Blizzard Threat Zone)
// Curves through Dras Valley, Kargil, Khalsi, and Leh along the river valley
const safeValleyBypassCoords: [number, number][] = [
  [34.15, 77.57], // Leh HQ
  [34.28, 77.25], // Nimoo
  [34.35, 76.88], // Khalsi Junction
  [34.48, 76.45], // Mulbekh
  [34.55, 76.13], // Kargil Intermediate Depot
  [34.49, 75.95], // Shingo Valley
  [34.43, 75.75], // Dras Command Post
];

const fobCharlieBranchCoords: [number, number][] = [
  [34.55, 76.13], // Kargil Intermediate Depot
  [34.58, 76.22], // Suru Corridor
  [34.62, 76.32], // FOB Charlie
];

// Map View Bounds Controller component
const MapBoundsController: React.FC<{ triggerFit: number }> = ({ triggerFit }) => {
  const map = useMap();

  useEffect(() => {
    if (triggerFit > 0) {
      // Fit to active A* Valley Bypass corridor with animation
      map.fitBounds(
        [
          [34.15, 75.60],
          [34.70, 77.65],
        ],
        { padding: [60, 60], animate: true, duration: 1.2 }
      );
    }
  }, [triggerFit, map]);

  return null;
};

export const GisMap: React.FC = () => {
  const { addToast } = useToast();
  const navigate = useNavigate();

  // 5 Interactive Layer Toggles
  const [showUnits, setShowUnits] = useState(true);
  const [showDepots, setShowDepots] = useState(true);
  const [showConvoys, setShowConvoys] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showWeatherHazards, setShowWeatherHazards] = useState(true);

  // Basemap style
  const [basemapStyle, setBasemapStyle] = useState<'DARK' | 'SATELLITE' | 'TOPO'>('DARK');

  // Route optimization state
  const [isOptimising, setIsOptimising] = useState(false);
  const [isRouteOptimised, setIsRouteOptimised] = useState(false);
  const [fitTrigger, setFitTrigger] = useState(0);

  const handleOptimiseRoute = () => {
    setIsOptimising(true);
    setTimeout(() => {
      setIsOptimising(false);
      setIsRouteOptimised(true);
      setFitTrigger((prev) => prev + 1);
      addToast('A* Valley Corridor recalculation complete. Bypassing Zoji La Avalanche Zone.', 'success');
    }, 600);
  };

  return (
    <div className="space-y-4">
      {/* Header and Action Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <MapIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h1 className="font-semibold text-lg text-slate-900 dark:text-white tracking-tight">
              GIS Tactical Logistics &amp; Route Telemetry Map
            </h1>
          </div>
          <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time geospatial fleet tracking, mountain pass closures, and dynamic A* valley routing
          </p>
        </div>

        {/* Action Triggers: [Optimise Route] */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isOptimising}
            onClick={handleOptimiseRoute}
            className="px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-sans text-xs font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-60"
          >
            {isOptimising ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Computing A* Path...</span>
              </>
            ) : (
              <>
                <Compass className="w-4 h-4" />
                <span>Optimise Route</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter Bar: 5 Interactive Tactical Layers + Basemap Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white dark:bg-slate-900/70 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800/80 text-xs shadow-xs">
        {/* Layer Toggle Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 text-xs font-semibold mr-1 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" /> Layers:
          </span>

          {/* 1. Units Toggle */}
          <button
            type="button"
            onClick={() => setShowUnits(!showUnits)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
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
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
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
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
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
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
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
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              showWeatherHazards
                ? 'bg-rose-600 text-white border border-rose-500'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-transparent'
            }`}
          >
            <Snowflake className="w-3 h-3" />
            <span>Weather Hazards</span>
          </button>
        </div>

        {/* Basemap Switcher */}
        <div className="flex items-center gap-1.5 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800 sm:pl-3 pt-2 sm:pt-0">
          <span className="text-xs font-semibold text-slate-400 mr-1">Basemap:</span>
          <button
            type="button"
            onClick={() => setBasemapStyle('DARK')}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
              basemapStyle === 'DARK'
                ? 'bg-slate-900 text-cyan-400 border border-cyan-500/40 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Tactical Dark
          </button>
          <button
            type="button"
            onClick={() => setBasemapStyle('SATELLITE')}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
              basemapStyle === 'SATELLITE'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Satellite
          </button>
          <button
            type="button"
            onClick={() => setBasemapStyle('TOPO')}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
              basemapStyle === 'TOPO'
                ? 'bg-amber-600 text-white font-semibold shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Topo
          </button>
        </div>
      </div>

      {/* Main Map Canvas Viewport */}
      <div className="w-full h-[650px] rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800/80 shadow-lg relative">
        <MapContainer
          center={[34.55, 76.50]}
          zoom={8}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <MapBoundsController triggerFit={fitTrigger} />

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
              attribution="Map data: &copy; OpenStreetMap contributors, SRTM"
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
              maxZoom={17}
            />
          )}

          {/* LAYER 1 & 2: UNITS & DEPOTS */}
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
                  <div className="font-sans text-xs p-1 space-y-1.5 min-w-[210px]">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-1">
                      <strong className="text-slate-900 dark:text-white font-bold text-xs">
                        {loc.name}
                      </strong>
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white uppercase"
                        style={{ backgroundColor: loc.color }}
                      >
                        {loc.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-slate-300">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Altitude:</span>
                        <strong className="font-mono-num">{loc.altitude_m} m</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Runway:</span>
                        <strong className="font-mono-num font-bold" style={{ color: loc.color }}>
                          {loc.runway_days.toFixed(1)} Days
                        </strong>
                      </div>
                    </div>

                    <div className="text-slate-200 border-t border-slate-700 pt-1">
                      <span className="text-slate-400 block text-[10px]">On-Hand:</span>
                      <span className="font-medium font-mono-num">{loc.stock}</span>
                      <div className="text-[11px] text-slate-400 font-mono-num">Daily Burn: {loc.daily_burn}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate(`/forecast?unit=${loc.id}`)}
                      className="w-full mt-2 py-1.5 px-2 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                    >
                      <span>Run Forecast</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* LAYER 3: ROUTES & PASSES */}
          {showRoutes && (
            <>
              {/* Primary Pass Route (Zoji La): Red Dashed Stopping at Red Pass Marker */}
              <Polyline
                positions={blockedZojilaRouteCoords}
                pathOptions={{
                  color: '#ef4444',
                  weight: 4,
                  dashArray: '6, 8',
                  opacity: 0.95,
                }}
              >
                <Tooltip sticky>
                  <span className="text-xs font-bold text-rose-700">
                    ✕ Primary Pass (Zoji La): Blocked by 85mm Snow Pack
                  </span>
                </Tooltip>
              </Polyline>

              {/* Red ✕ Blocked Zoji La Pass Marker */}
              <Marker
                position={[34.28, 75.47]}
                icon={createBlockedPassPin('ZOJI LA PASS')}
              >
                <Tooltip direction="top" offset={[0, -20]} opacity={1}>
                  <div className="text-xs font-bold text-rose-700">
                    ✕ BLOCKED: 85mm Blizzard Snowpack
                  </div>
                </Tooltip>
                <Popup>
                  <div className="font-sans text-xs space-y-1">
                    <strong className="text-rose-600 font-bold block">
                      Zoji La Pass (Elevation 3,528 m)
                    </strong>
                    <div className="text-rose-400 font-bold">Status: INTERDICTED</div>
                    <div>Accumulation: 85mm Arctic Snowpack</div>
                    <div className="text-slate-400 text-[11px]">
                      Recommended Action: Divert to A* Valley Bypass Corridor
                    </div>
                  </div>
                </Popup>
              </Marker>

              {/* A* Valley Bypass: Animated Emerald Corridor following Himalayan Valleys */}
              <Polyline
                positions={safeValleyBypassCoords}
                pathOptions={{
                  color: isRouteOptimised ? '#10b981' : '#34d399',
                  weight: isRouteOptimised ? 5 : 4,
                  opacity: 0.95,
                  className: 'convoy-route-animated',
                }}
              >
                <Tooltip sticky>
                  <span className="text-xs font-bold text-emerald-800">
                    ✓ A* Valley Bypass Corridor (Clear // 118 km | ETA 4.2h)
                  </span>
                </Tooltip>
              </Polyline>

              <Polyline
                positions={fobCharlieBranchCoords}
                pathOptions={{
                  color: '#10b981',
                  weight: 3.5,
                  dashArray: '4, 4',
                  opacity: 0.9,
                }}
              />
            </>
          )}

          {/* LAYER 4: LIVE CONVOYS */}
          {showConvoys &&
            activeConvoys.map((convoy) => (
              <Marker
                key={convoy.id}
                position={convoy.pos}
                icon={createConvoyPin(convoy.code)}
              >
                <Popup>
                  <div className="font-sans text-xs space-y-1 p-1 min-w-[200px]">
                    <strong className="text-emerald-400 font-bold block">{convoy.name}</strong>
                    <div className="text-slate-300">
                      <div>Cargo: <strong className="font-mono-num">{convoy.cargo}</strong></div>
                      <div>Vehicles: <strong>{convoy.vehicle_count} Tankers</strong></div>
                      <div>ETA: <strong className="text-emerald-400 font-mono-num">{convoy.eta}</strong></div>
                      <div className="text-cyan-400 font-medium">{convoy.status}</div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

          {/* LAYER 5: WEATHER HAZARDS (50km ST_DWithin Blizzard Cell) */}
          {showWeatherHazards && (
            <>
              <Circle
                center={[35.10, 77.20]}
                radius={32000}
                pathOptions={{
                  color: '#ef4444',
                  fillColor: '#ef4444',
                  fillOpacity: 0.12,
                  weight: 2,
                  dashArray: '4, 4',
                }}
              >
                <Tooltip direction="top" opacity={0.95}>
                  <div className="text-xs font-bold text-rose-700">
                    Blizzard Threat Zone // 85mm Snowfall // -34°C
                  </div>
                </Tooltip>
              </Circle>
            </>
          )}
        </MapContainer>

        {/* HUD OVERLAY: COMPACT VISUAL ROUTE COMPARISON WIDGET (REPLACING TEXT FORMULA WALL) */}
        <div className="absolute bottom-5 left-5 z-[1000] bg-slate-900/90 backdrop-blur-md p-4 rounded-lg border border-slate-700/80 shadow-2xl font-sans text-xs text-slate-100 flex flex-col gap-2.5 max-w-sm">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
            <span className="font-bold text-slate-100 tracking-tight flex items-center gap-2">
              <Navigation className="w-4 h-4 text-emerald-400" />
              Route Telemetry &amp; Comparison
            </span>
            <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              A* Active
            </span>
          </div>

          {/* Visual Route 1: Primary Pass (Zoji La) -> Blocked */}
          <div className="p-2.5 rounded-md bg-rose-950/40 border border-rose-500/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ban className="w-4 h-4 text-rose-400 shrink-0" />
              <div>
                <span className="font-semibold text-slate-200 block">Primary Pass (Zoji La)</span>
                <span className="text-[11px] text-rose-400 font-medium">Avalanche Accumulation</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/50">
              ✕ BLOCKED — 85mm Snow
            </span>
          </div>

          {/* Visual Route 2: A* Valley Bypass -> Emerald Active Bar */}
          <div className={`p-2.5 rounded-md transition-all ${
            isRouteOptimised
              ? 'bg-emerald-950/60 border border-emerald-500/70 shadow-sm ring-1 ring-emerald-500/30'
              : 'bg-emerald-950/30 border border-emerald-500/40'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold text-slate-100">A* Valley Bypass</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/50">
                ✓ CLEAR
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-300 font-mono-num">
              <span>Distance: <strong>118 km</strong></span>
              <span>•</span>
              <span>ETA: <strong>4.2h</strong></span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">Risk: Low</span>
            </div>
          </div>
        </div>

        {/* HUD OVERLAY 2: Compact Tactical Legend (Top Right) */}
        <div className="absolute top-5 right-5 z-[1000] bg-slate-900/90 backdrop-blur-md p-3 rounded-lg border border-slate-700/80 shadow-lg text-xs text-slate-200 flex flex-col gap-1.5 min-w-[180px]">
          <span className="font-semibold text-[11px] text-slate-400 border-b border-slate-700 pb-1">
            Tactical Map Legend
          </span>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Nominal (&gt;7d)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Warning (3–7d)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span>Critical (&lt;3d)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-0.5 bg-emerald-500"></span>
            <span>A* Valley Corridor</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-0.5 border-t border-dashed border-rose-500"></span>
            <span className="text-rose-400">Blocked Pass Route</span>
          </div>
        </div>
      </div>
    </div>
  );
};
