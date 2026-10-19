import type {
  DashboardResponse,
  InventoryItem,
  InventoryDetail,
  ForecastResponse,
  RouteOptimiseResponse,
  RouteFallbackResponse,
  ConvoyItem,
  AlertItem,
  SimulationResponse,
  AuditLogEntry
} from '../types/api';

export const mockDashboardData: DashboardResponse = {
  kpis: {
    units_critical_reserve: 4,
    active_convoys: 14,
    deficit_alerts_24h: 7,
    closed_passes: 2,
  },
  ai_recommendation: {
    id: 'ADV-2026-089',
    confidence: 89,
    top_factors: [
      'Consumption Surge (+101.6% spike)',
      'Blizzard front approaching NH-1D',
      'Stockout in 34 hours without replenishment',
    ],
    anomaly_flag: true,
    stockout_risk: 87,
    days_of_supply: 1.4,
    recommendation_text: 'DISPATCH: 4x 5kL Fuel Tankers from Kargil Forward Depot (UNIT_02) to FOB Charlie (UNIT_03)',
    target_unit: 'FOB Charlie (UNIT_03)',
    origin_depot: 'Kargil Forward Depot (UNIT_02)',
    vehicle_count: 4,
    cargo_litres: 20000,
    time_to_critical: '11h : 42m : 18s',
    transit_corridor: 'ROUTE VICTOR-NORTH (74 KM)',
    launch_window: '04:30 - 07:00 HRS',
  },
  forward_reserves: [
    { sku: 'POL-88 ARCTIC DIESEL', location: 'FOB Charlie (UNIT_03)', on_hand: '1,750 L', daily_burn: '1,250 L/d', runway_days: 1.4, status: 'CRITICAL' },
    { sku: '5.56x45MM NATO BALL', location: 'Dras Outpost (UNIT_04)', on_hand: '18,400 rnds', daily_burn: '4,200 rnds/d', runway_days: 4.4, status: 'WARNING' },
    { sku: 'MEDICAL O2 CYLINDERS', location: 'Siachen Base (UNIT_09)', on_hand: '24 cyl', daily_burn: '6 cyl/d', runway_days: 4.0, status: 'WARNING' },
    { sku: 'POL-50 HEAVY LUBE', location: 'Kargil Depot (UNIT_02)', on_hand: '94,000 L', daily_burn: '4,500 L/d', runway_days: 20.9, status: 'NOMINAL' },
    { sku: '7.62x51MM SNIPER', location: 'FOB Alpha (UNIT_01)', on_hand: '2,200 L', daily_burn: '800 L/d', runway_days: 2.8, status: 'CRITICAL' },
  ],
};

export const mockInventoryList: InventoryItem[] = [
  { unit_id: 'UNIT_03', name: 'FOB Charlie', sector: 'Ladakh Sector-04', commodity: 'POL-88 Arctic Fuel', on_hand: 1750, unit: 'L', daily_burn: 1250, runway_days: 1.4, status: 'CRITICAL', is_high_altitude: true, critical_fuel_48h: true, elevation_ft: 14200, temperature_c: -28 },
  { unit_id: 'UNIT_04', name: 'Dras Sector Command Post', sector: 'Ladakh Sector-04', commodity: '5.56mm Ammunition', on_hand: 18400, unit: 'rnds', daily_burn: 4200, runway_days: 4.4, status: 'WARNING', is_high_altitude: true, critical_fuel_48h: false, elevation_ft: 10800, temperature_c: -22 },
  { unit_id: 'UNIT_09', name: 'Siachen Base Camp', sector: 'Siachen North', commodity: 'Medical Grade Oxygen', on_hand: 24, unit: 'cyl', daily_burn: 6, runway_days: 4.0, status: 'WARNING', is_high_altitude: true, critical_fuel_48h: false, elevation_ft: 18800, temperature_c: -36 },
  { unit_id: 'UNIT_01', name: 'FOB Alpha (Tiger Hill)', sector: 'Dras / Kargil Axis', commodity: 'POL-88 Arctic Fuel', on_hand: 2200, unit: 'L', daily_burn: 800, runway_days: 2.8, status: 'CRITICAL', is_high_altitude: true, critical_fuel_48h: true, elevation_ft: 16600, temperature_c: -31 },
  { unit_id: 'UNIT_02', name: 'Kargil Intermediate Depot', sector: 'Ladakh Central', commodity: 'Bulk POL & Lube', on_hand: 94000, unit: 'L', daily_burn: 4500, runway_days: 20.9, status: 'NOMINAL', is_high_altitude: false, critical_fuel_48h: false, elevation_ft: 8780, temperature_c: -14 },
  { unit_id: 'DEPOT_01', name: 'Leh Central Logistics Hub', sector: 'HQ Corps Hub', commodity: 'Strategic Munitions & Fuel', on_hand: 248000, unit: 'L', daily_burn: 8200, runway_days: 30.2, status: 'NOMINAL', is_high_altitude: false, critical_fuel_48h: false, elevation_ft: 11500, temperature_c: -11 },
  { unit_id: 'UNIT_07', name: 'Diskit Forward Outpost', sector: 'Nubra Valley Axis', commodity: 'Ration Packs (MRE)', on_hand: 1200, unit: 'pkts', daily_burn: 180, runway_days: 6.7, status: 'WARNING', is_high_altitude: true, critical_fuel_48h: false, elevation_ft: 10300, temperature_c: -18 },
  { unit_id: 'UNIT_08', name: 'Chumathang Staging Post', sector: 'Eastern Ladakh', commodity: 'POL-88 Arctic Fuel', on_hand: 3400, unit: 'L', daily_burn: 1300, runway_days: 2.6, status: 'CRITICAL', is_high_altitude: true, critical_fuel_48h: true, elevation_ft: 13200, temperature_c: -26 },
];

export const getMockInventoryDetail = (unit_id: string): InventoryDetail => {
  const base = mockInventoryList.find((i) => i.unit_id === unit_id) || mockInventoryList[0];
  
  return {
    ...base,
    elevation_ft: base.elevation_ft || 14200,
    temperature_c: base.temperature_c || -28,
    spike_percentage: 108.3,
    burn_ledger_14d: [
      { day: 'D-13', burn_litres: 580 },
      { day: 'D-12', burn_litres: 590 },
      { day: 'D-11', burn_litres: 610 },
      { day: 'D-10', burn_litres: 600 },
      { day: 'D-9', burn_litres: 620 },
      { day: 'D-8', burn_litres: 610 },
      { day: 'D-7', burn_litres: 630 },
      { day: 'D-6', burn_litres: 600 },
      { day: 'D-5', burn_litres: 620 },
      { day: 'D-4', burn_litres: 650 },
      { day: 'D-3', burn_litres: 780 },
      { day: 'D-2', burn_litres: 910 },
      { day: 'D-1', burn_litres: 1120 },
      { day: 'TODAY', burn_litres: 1250, is_today: true },
    ],
    nearest_convoy: 'CONVOY-L14 (84 km away)',
    route_status: 'Pass Zojila: Snow Chain Req. / Avalanche Lock',
    overland_eta: '14h 20m (Passable via South Ridge)',
  };
};

export const getMockForecastData = (horizon: '24h' | '48h' | '7d'): ForecastResponse => {
  const defaultDecisionCard = {
    action_type: 'RECOMMENDED_DISPATCH',
    confidence_level: 'HIGH',
    confidence_percentage: 89.0,
    primary_risk_driver: 'Critical low supply runway (< 48 hours) under sub-zero conditions',
    top_feature_contributions: {
      temperature_ambient: 0.38,
      altitude_burn_factor: 0.29,
      pass_blockade_risk: 0.18,
    },
    command_recommendation: 'Authorize immediate priority convoy dispatch via all-weather corridor.',
    requires_officer_sign_off: true,
  };

  if (horizon === '24h') {
    return {
      unit_id: 'POST_DBO',
      item_type: 'Fuel',
      current_stock: 3500,
      decision_card: defaultDecisionCard,
      horizon: '24h',
      predicted_demand: 1850,
      lower_bound: 1400,
      upper_bound: 2350,
      stockout_risk: 74,
      days_of_supply: 1.8,
      is_critical: true,
      anomaly_flag: true,
      top_factors: ['Sub-zero cold snap (-28°C)', 'Auxiliary heaters running 24h', 'Perimeter radar overload'],
      points: [
        { time: 'T-12h', actual: 4800, buffer_min: 3500 },
        { time: 'T-08h', actual: 4400, buffer_min: 3500 },
        { time: 'T-04h', actual: 3900, buffer_min: 3500 },
        { time: 'T-00', actual: 3500, predicted: 3500, lower_bound: 3500, upper_bound: 3500, p10: 3500, p90: 3500, buffer_min: 3500 },
        { time: 'T+04h', predicted: 2950, lower_bound: 2700, upper_bound: 3200, p10: 2700, p90: 3200, buffer_min: 3500 },
        { time: 'T+08h', predicted: 2400, lower_bound: 2100, upper_bound: 2750, p10: 2100, p90: 2750, buffer_min: 3500 },
        { time: 'T+12h', predicted: 1950, lower_bound: 1600, upper_bound: 2350, p10: 1600, p90: 2350, buffer_min: 3500 },
        { time: 'T+16h', predicted: 1500, lower_bound: 1100, upper_bound: 1950, p10: 1100, p90: 1950, buffer_min: 3500 },
        { time: 'T+20h', predicted: 1050, lower_bound: 650, upper_bound: 1550, p10: 650, p90: 1550, buffer_min: 3500 },
        { time: 'T+24h', predicted: 650, lower_bound: 200, upper_bound: 1200, p10: 200, p90: 1200, buffer_min: 3500 },
      ],
    };
  }

  if (horizon === '7d') {
    return {
      unit_id: 'POST_DBO',
      item_type: 'Fuel',
      current_stock: 3500,
      decision_card: defaultDecisionCard,
      horizon: '7d',
      predicted_demand: 11200,
      lower_bound: 8900,
      upper_bound: 14500,
      stockout_risk: 94,
      days_of_supply: 1.4,
      is_critical: true,
      anomaly_flag: true,
      top_factors: ['Extended Blizzard Category-3', 'Thermal generator continuous duty', 'Road transit blocked 72h'],
      points: [
        { time: 'Day -3', actual: 6500, buffer_min: 3500 },
        { time: 'Day -2', actual: 5200, buffer_min: 3500 },
        { time: 'Day -1', actual: 4100, buffer_min: 3500 },
        { time: 'Day 0', actual: 3500, predicted: 3500, lower_bound: 3500, upper_bound: 3500, p10: 3500, p90: 3500, buffer_min: 3500 },
        { time: 'Day +1', predicted: 2200, lower_bound: 1800, upper_bound: 2700, p10: 1800, p90: 2700, buffer_min: 3500 },
        { time: 'Day +2', predicted: 950, lower_bound: 400, upper_bound: 1600, p10: 400, p90: 1600, buffer_min: 3500 },
        { time: 'Day +3', predicted: 0, lower_bound: 0, upper_bound: 700, p10: 0, p90: 700, buffer_min: 3500 },
        { time: 'Day +4', predicted: 0, lower_bound: 0, upper_bound: 300, p10: 0, p90: 300, buffer_min: 3500 },
        { time: 'Day +5', predicted: 0, lower_bound: 0, upper_bound: 100, p10: 0, p90: 100, buffer_min: 3500 },
        { time: 'Day +6', predicted: 0, lower_bound: 0, upper_bound: 50, p10: 0, p90: 50, buffer_min: 3500 },
        { time: 'Day +7', predicted: 0, lower_bound: 0, upper_bound: 0, p10: 0, p90: 0, buffer_min: 3500 },
      ],
    };
  }

  // Default: 48h Horizon
  return {
    unit_id: 'POST_DBO',
    item_type: 'Fuel',
    current_stock: 3500,
    decision_card: defaultDecisionCard,
    horizon: '48h',
    predicted_demand: 3850,
    lower_bound: 2900,
    upper_bound: 4900,
    stockout_risk: 87,
    days_of_supply: 1.4,
    is_critical: true,
    anomaly_flag: true,
    top_factors: [
      'Genset operating at 190% continuous duty cycle',
      'Pass Zojila closure window T-22h',
      'NH-1D highway clearance probability <12%',
    ],
    points: [
      { time: 'T-16h', actual: 5200, buffer_min: 3500 },
      { time: 'T-12h', actual: 4800, buffer_min: 3500 },
      { time: 'T-08h', actual: 4300, buffer_min: 3500 },
      { time: 'T-04h', actual: 3850, buffer_min: 3500 },
      { time: 'T-00', actual: 3500, predicted: 3500, lower_bound: 3500, upper_bound: 3500, p10: 3500, p90: 3500, buffer_min: 3500 },
      { time: 'T+06h', predicted: 2750, lower_bound: 2400, upper_bound: 3100, p10: 2400, p90: 3100, buffer_min: 3500 },
      { time: 'T+12h', predicted: 2050, lower_bound: 1650, upper_bound: 2500, p10: 1650, p90: 2500, buffer_min: 3500 },
      { time: 'T+18h', predicted: 1420, lower_bound: 950, upper_bound: 1980, p10: 950, p90: 1980, buffer_min: 3500 },
      { time: 'T+24h', predicted: 850, lower_bound: 400, upper_bound: 1450, p10: 400, p90: 1450, buffer_min: 3500 },
      { time: 'T+30h', predicted: 350, lower_bound: 0, upper_bound: 950, p10: 0, p90: 950, buffer_min: 3500 },
      { time: 'T+34h', predicted: 0, lower_bound: 0, upper_bound: 600, p10: 0, p90: 600, buffer_min: 3500 },
      { time: 'T+40h', predicted: 0, lower_bound: 0, upper_bound: 250, p10: 0, p90: 250, buffer_min: 3500 },
      { time: 'T+48h', predicted: 0, lower_bound: 0, upper_bound: 0, p10: 0, p90: 0, buffer_min: 3500 },
    ],
  };
};

export const mockConvoysList: ConvoyItem[] = [
  {
    convoy_id: 'CVY-ECHO-04',
    origin_depot: 'Leh Central Hub [DEPOT_01]',
    destination: 'FOB Charlie [UNIT_03]',
    vehicle_count: 6,
    cargo_manifest: 'Class-III POL-88 (30kL)',
    eta_countdown: '03h : 42m',
    eta_seconds: 13320,
    status: 'IN_TRANSIT',
    escort_type: '2x QRF BMP-2 Armored',
    priority: 'DEFCON-2',
  },
  {
    convoy_id: 'CVY-DELTA-02',
    origin_depot: 'Kargil Depot [UNIT_02]',
    destination: 'Dras Outpost [UNIT_04]',
    vehicle_count: 4,
    cargo_manifest: '5.56mm Ammo (40k rnds)',
    eta_countdown: '01h : 15m',
    eta_seconds: 4500,
    status: 'IN_TRANSIT',
    escort_type: '1x MP Escort Vehicle',
    priority: 'PRIORITY-1A',
  },
  {
    convoy_id: 'CVY-BRAVO-09',
    origin_depot: 'Srinagar Base [LOG_HQ]',
    destination: 'Kargil Depot [UNIT_02]',
    vehicle_count: 10,
    cargo_manifest: 'POL & Winter Rations',
    eta_countdown: '08h : 30m',
    eta_seconds: 30600,
    status: 'DELAYED',
    escort_type: 'Heavy Armor Convoy',
    priority: 'ROUTINE-LOG',
  },
  {
    convoy_id: 'CVY-FOXTROT-01',
    origin_depot: 'Leh Central Hub [DEPOT_01]',
    destination: 'Siachen Base Camp [UNIT_09]',
    vehicle_count: 3,
    cargo_manifest: 'Medical Oxygen (60 Cyl)',
    eta_countdown: '05h : 10m',
    eta_seconds: 18600,
    status: 'SCHEDULED',
    escort_type: 'Air Cover Standby',
    priority: 'URGENT-MED',
  },
  {
    convoy_id: 'CVY-HOTEL-07',
    origin_depot: 'Kargil Depot [UNIT_02]',
    destination: 'FOB Alpha [UNIT_01]',
    vehicle_count: 5,
    cargo_manifest: 'Class-III POL (25kL)',
    eta_countdown: '02h : 05m',
    eta_seconds: 7500,
    status: 'IN_TRANSIT',
    escort_type: 'QRF Tactical Escort',
    priority: 'PRIORITY-1A',
  },
  {
    convoy_id: 'CVY-ALPHA-12',
    origin_depot: 'Diskit Staging [UNIT_07]',
    destination: 'Forward Scout Post 3',
    vehicle_count: 2,
    cargo_manifest: 'Batteries & Gen Spare Parts',
    eta_countdown: '00h : 00m',
    eta_seconds: 0,
    status: 'COMPLETED',
    escort_type: 'Light Recon Patrol',
    priority: 'ROUTINE',
  },
];

export const mockAlertsList: AlertItem[] = [
  {
    id: 'ALT-2026-9042',
    code: 'ALT-9042',
    severity: 'CRITICAL',
    title: 'CRITICAL FUEL DEPLETION: FOB CHARLIE T-34H EXHAUSTION',
    description: 'Extreme cold snap (-28°C) resulted in continuous duty cycle for perimeter thermal generators. POL-88 reserve tank below 15% capacity.',
    timestamp: '04:12Z // SECTOR-04B',
    route_sector: 'FOB CHARLIE // HIGH-ALTITUDE AXIS',
    status: 'UNACKNOWLEDGED',
    suggested_action: 'Immediate authorization of Convoy Echo-4 or helicopter emergency drop.',
    remaining_cap: '1.4 DAYS (1,750 L)',
    burn_rate: '1,250 L/d',
    weather_temp: '-28°C BLZ',
    coordinates: '34°32\'18"N 76°08\'42"E',
  },
  {
    id: 'ALT-2026-9038',
    code: 'ALT-9038',
    severity: 'CRITICAL',
    title: 'PASS CUTOFF WARNING: ZOJI LA PASS AVALANCHE CLOSURE',
    description: 'Snow accumulation exceeded 140cm at pass crest. Wind gusts 68kt. Ground transit closing in T-22h on primary Axis-Alpha route.',
    timestamp: '03:52Z // ZOJI LA CORRIDOR',
    route_sector: 'AXIS-ALPHA ROUTE NH-1D',
    status: 'UNACKNOWLEDGED',
    suggested_action: 'Reroute incoming logistics convoys to South Ridge Bypass immediately.',
    remaining_cap: 'CLOSURE T-22h',
    burn_rate: '142 cm PACK',
    weather_temp: '-32°C GUST 68KT',
    coordinates: '34°17\'04"N 75°31\'20"E',
  },
  {
    id: 'ALT-2026-9014',
    code: 'ALT-9014',
    severity: 'HIGH',
    title: 'AMMUNITION DEFICIT: DRAS SECTOR 5.56MM RUNWAY UNDER 4.5 DAYS',
    description: 'Increased perimeter border engagement rounds expended in last 36 hours. Current runway estimated at 4.4 days.',
    timestamp: '02:30Z // DRAS RIDGE',
    route_sector: 'DRAS COMMAND POST',
    status: 'UNACKNOWLEDGED',
    suggested_action: 'Approve ammunition restock payload from Kargil depot.',
    remaining_cap: '4.4 DAYS (18,400 rnds)',
    burn_rate: '4,200 rnds/d',
    weather_temp: '-22°C CLEAR',
    coordinates: '34°25\'45"N 75°45\'12"E',
  },
  {
    id: 'ALT-2026-8980',
    code: 'ALT-8980',
    severity: 'MEDIUM',
    title: 'BATTERY BANK COLD GEL DAMAGE: DISKIT OUTPOST',
    description: 'Auxiliary solar storage bank cell 4 operating at 40% efficiency due to sub-zero night freeze.',
    timestamp: 'Yesterday 21:00Z',
    route_sector: 'DISKIT OUTPOST',
    status: 'ACKNOWLEDGED',
    suggested_action: 'Deploy replacement thermal blankets on next patrol.',
    remaining_cap: '6.7 DAYS (40% CAP)',
    burn_rate: '180 pkts/d',
    weather_temp: '-18°C COLD',
    coordinates: '34°35\'12"N 77°32\'04"E',
  },
  {
    id: 'ALT-2026-8955',
    code: 'ALT-8955',
    severity: 'HIGH',
    title: 'HIGH-ALTITUDE MEDICAL O2 RUNWAY: SIACHEN BASE CAMP',
    description: 'Elevated pulmonary edema admissions. Oxygen reserve at 4.0 days runway with overland transit restricted.',
    timestamp: 'Yesterday 18:45Z',
    route_sector: 'SIACHEN NORTH AXIS',
    status: 'UNACKNOWLEDGED',
    suggested_action: 'Pre-clear Convoy Foxtrot-01 with air cover standby.',
    remaining_cap: '4.0 DAYS (24 cyl)',
    burn_rate: '6 cyl/d',
    weather_temp: '-36°C HIGH-WIND',
    coordinates: '35°12\'08"N 77°14\'30"E',
  },
];

export const calculateSimulationResult = (
  demandMultiplier: number,
  snowDepth: number,
  passCutoff: 'zojila' | 'echo' | 'none'
): SimulationResponse => {
  const isCutoff = passCutoff === 'zojila' || passCutoff === 'echo';
  const outpostsAtRisk = Math.min(8, Math.max(1, Math.round(1 + (demandMultiplier - 1.0) * 2.4 + (snowDepth / 35) + (isCutoff ? 2 : 0))));
  const deficitNumber = Math.round(3850 * demandMultiplier + snowDepth * 52 + (isCutoff ? 4800 : 0));
  const dryoutHours = Math.max(6, Math.round(34 / demandMultiplier - (snowDepth / 22) - (isCutoff ? 7 : 0)));
  const newCriticalStockouts = Math.max(0, outpostsAtRisk - 1);
  const avgDelayHours = Number((1.2 + (demandMultiplier - 1.0) * 1.8 + (snowDepth / 25) * 1.5 + (isCutoff ? 4.8 : 0)).toFixed(1));
  const recommendedTankers = Math.min(12, Math.max(2, Math.round(2 * demandMultiplier + (snowDepth > 30 ? 2 : 0) + (isCutoff ? 2 : 0))));
  const corridorText = isCutoff ? 'Pass Echo / South Ridge Bypass Corridor' : 'NH-1D Route Victor-North (Green Axis)';
  const recommendedAction = isCutoff
    ? `REROUTE TO ${corridorText.toUpperCase()}: Authorize ${recommendedTankers}x ALS Heavy Tankers with snow chains. Pre-stage ${Math.round(deficitNumber / 1000)} kL buffer reserve at Kargil Intermediate Depot.`
    : `DISPATCH PRIORITY CORRIDOR: Authorize ${recommendedTankers}x Heavy Fuel Tankers via ${corridorText}. Snow chain mandate active for passes above 11,000 ft.`;

  const snowBurnPenalty = (snowDepth / 100) * 1.4;
  const cutoffPenalty = isCutoff ? 1.6 : 0;
  const totalBurnRate = 3.8 * demandMultiplier + snowBurnPenalty + cutoffPenalty;

  return {
    baseline: {
      outposts_at_risk: 1,
      stress_level: 'LOW // DEFCON-4',
      impacted_node: 'FOB Charlie: Stockout in 34h',
      depletion_rate: 'Normal 620 L/d',
      pass_status: 'Open (Marginal)',
      stranded_convoys: 0,
      total_deficit: '-3,850 L',
    },
    simulated: {
      outposts_at_risk: outpostsAtRisk,
      surge_label: `SURGE ${demandMultiplier.toFixed(1)}X + ${passCutoff.toUpperCase()} ${isCutoff ? 'CUTOFF' : 'CLEAR'}`,
      impacted_outposts: [
        { name: 'FOB Charlie (UNIT_03)', stockout_hours: dryoutHours, risk_level: 'CRITICAL' },
        { name: 'FOB Alpha (UNIT_01)', stockout_hours: dryoutHours + 5, risk_level: 'CRITICAL' },
        { name: 'Chumathang Post (UNIT_08)', stockout_hours: dryoutHours + 10, risk_level: 'HIGH' },
        { name: 'Dras Command (UNIT_04)', stockout_hours: dryoutHours + 16, risk_level: 'WARNING' },
        { name: 'Diskit Outpost (UNIT_07)', stockout_hours: dryoutHours + 22, risk_level: 'WARNING' },
        { name: 'Siachen Base Camp (UNIT_09)', stockout_hours: dryoutHours + 28, risk_level: 'WARNING' },
      ].slice(0, outpostsAtRisk),
      dryout_node: 'FOB Charlie',
      dryout_hours: dryoutHours,
      total_deficit: `-${deficitNumber.toLocaleString()} L`,
    },
    new_critical_stockouts: newCriticalStockouts,
    avg_convoy_delay_hours: avgDelayHours,
    recommended_action: recommendedAction,
    trajectory: [
      { time: 'T+0 (NOW)', baseline_kl: 35.0, simulated_kl: 35.0, buffer_kl: 10.0 },
      { time: 'T+6h', baseline_kl: 32.5, simulated_kl: Number(Math.max(0, 35 - totalBurnRate * 0.9).toFixed(1)), buffer_kl: 10.0 },
      { time: 'T+12h', baseline_kl: 29.8, simulated_kl: Number(Math.max(0, 35 - totalBurnRate * 2.2).toFixed(1)), buffer_kl: 10.0 },
      { time: 'T+18h', baseline_kl: 26.4, simulated_kl: Number(Math.max(0, 35 - totalBurnRate * 3.6).toFixed(1)), buffer_kl: 10.0 },
      { time: 'T+24h', baseline_kl: 22.8, simulated_kl: Number(Math.max(0, 35 - totalBurnRate * 5.1).toFixed(1)), buffer_kl: 10.0 },
      { time: 'T+30h', baseline_kl: 19.5, simulated_kl: Number(Math.max(0, 35 - totalBurnRate * 6.6).toFixed(1)), buffer_kl: 10.0 },
      { time: 'T+36h', baseline_kl: 16.0, simulated_kl: Number(Math.max(0, 35 - totalBurnRate * 7.9).toFixed(1)), buffer_kl: 10.0 },
      { time: 'T+42h', baseline_kl: 12.8, simulated_kl: Number(Math.max(0, 35 - totalBurnRate * 8.9).toFixed(1)), buffer_kl: 10.0 },
      { time: 'T+48h', baseline_kl: 9.2, simulated_kl: Number(Math.max(0, 35 - totalBurnRate * 9.8).toFixed(1)), buffer_kl: 10.0 },
    ],
  };
};

export const mockRouteOptimiseResult: RouteOptimiseResponse = {
  route_id: 'ROUTE_VICTOR_NORTH',
  name: 'Route Victor-North (NH-1D Green Axis)',
  status: 'OPTIMISED',
  coordinates: [
    [34.15, 74.80], // Srinagar Rear Base
    [34.30, 75.35], // Approach Zoji La
    [34.42, 75.75], // Dras Sector Post
    [34.55, 76.13], // Kargil Intermediate Depot
    [34.35, 76.80], // Khalsi Junction
    [34.16, 77.58], // Leh Central Logistics HQ
  ],
  distance_km: 116.0,
  estimated_hours: 4.2,
  cost_formula: 'Cost = Dist + 1.8*Terrain + 0.25*Snow + 999*Blocked',
  cost_breakdown: {
    distance_cost: 116.0,
    terrain_penalty: 50.4,
    snow_penalty: 21.25,
    block_penalty: 0,
    total_cost: 187.65,
  },
};

export const mockRouteFallbackResult: RouteFallbackResponse = {
  route_id: 'ROUTE_TANGO_SOUTH',
  name: 'Shyok-Nubra Valley Detour // South Ridge Bypass Corridor',
  status: 'ALTERNATIVE',
  coordinates: [
    [34.16, 77.58], // Leh Central Logistics HQ
    [34.40, 77.70], // Wari La / South Ridge Pass
    [34.54, 77.55], // Diskit Forward Outpost (Nubra)
    [34.88, 77.20], // Shyok River Valley Corridor
    [34.62, 76.32], // FOB Charlie (Tiger Post)
    [34.55, 76.13], // Kargil Intermediate Depot
    [34.35, 76.80], // Khalsi Junction
    [34.16, 77.58], // Leh Return Loop
  ],
  distance_km: 154.0,
  estimated_hours: 8.35,
  time_delta: '+4h 15m delay',
  cost_formula: 'Cost = Dist + 1.8*Terrain + 0.25*Snow + 999*Blocked',
  cost_breakdown: {
    distance_cost: 154.0,
    terrain_penalty: 61.2,
    snow_penalty: 3.75,
    block_penalty: 0,
    total_cost: 218.95,
  },
};

export const mockAuditLogs: AuditLogEntry[] = [
  {
    id: 'LOG-001',
    officer_id: 'MAJ-VR-4412',
    officer_name: 'Maj. V. Rathore',
    rank: 'HQ 14 CORPS LOG CHIEF',
    timestamp_zulu: '05-MAR-2026 03:42Z',
    timestamp_ist: '09:12 IST',
    ai_recommendation_id: 'ADV-2026-085',
    baseline_summary: 'Dispatched 2x Heavy Fuel Tankers to Sector 4 FOB Alpha',
    confidence: 94.2,
    action_taken: 'OVERRIDE: Increased payload to 4x Tankers due to unforecasted blizzard reports',
    justification: 'Field intel via forward recon patrol confirmed sub-zero drop (-34°C) with probable 72-hour pass blockage. Extra fuel reserve vital for thermal gen-sets.',
    crypt_sig: '0x9F4A...82E1',
    verified: true,
  },
  {
    id: 'LOG-002',
    officer_id: 'BRIG-KS-1029',
    officer_name: 'Brig. K. Singh',
    rank: 'CORPS COMMANDER',
    timestamp_zulu: '04-MAR-2026 18:20Z',
    timestamp_ist: '23:50 IST',
    ai_recommendation_id: 'ADV-2026-081',
    baseline_summary: 'Standard overland transit via Zojila Pass NH-1D corridor',
    confidence: 88.0,
    action_taken: 'OVERRIDE: Directed convoy to Southern Ridge Bypass and assigned 2x BMP-2 armored escort',
    justification: 'DEFCON-2 heightened readiness directive. Interdiction threat on primary axis elevated by satellite surveillance.',
    crypt_sig: '0x3B19...55C4',
    verified: true,
  },
  {
    id: 'LOG-003',
    officer_id: 'MAJ-VR-4412',
    officer_name: 'Maj. V. Rathore',
    rank: 'HQ 14 CORPS LOG CHIEF',
    timestamp_zulu: '03-MAR-2026 11:15Z',
    timestamp_ist: '16:45 IST',
    ai_recommendation_id: 'ADV-2026-079',
    baseline_summary: 'Postpone oxygen cylinder drop to Siachen until clear weather',
    confidence: 82.5,
    action_taken: 'OVERRIDE: Authorized high-altitude emergency airdrop under marginal cloud cover',
    justification: 'Field hospital reported 3 critical frostbite and high-altitude pulmonary edema cases requiring immediate O2 support.',
    crypt_sig: '0x7E02...91F0',
    verified: true,
  },
];
