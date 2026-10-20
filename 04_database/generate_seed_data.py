#!/usr/bin/env python3
"""
RakshaLogix synthetic seed generator
====================================
SYNTHETIC DATA FOR R&D ONLY -- NOT ACTUAL INDIAN ARMY LOGS.

Writes:
  02_seed_generated.sql      units, inventory, weather, consumption ledger, demo fixtures
  anomaly_ground_truth.csv   injected anomalies (for evaluating the Isolation Forest only;
                             NOT loaded into the database)

Design rules
  * 8 units x 4 commodities x 365 days (Execution Manual, Role 1).
  * The ledger is an exact stock account: closing = opening + incoming - used (integer cents,
    so the CHECK constraint in 01_schema.sql can never be violated by rounding).
  * Mandatory stress events from the manual are injected: Zojila-style blizzard
    (5 d, -22 C, ~90 mm, route BLOCKED), combat surge (4 d, tempo 5, x3 fuel/ammo),
    fleet shortage (availability 0.2).
  * Stock-outs are NOT scripted: they emerge when a blocked route delays resupply.
  * FOB Charlie fuel (UNIT_03 / Fuel) is pinned so that days_remaining == --demo-days
    on the last ledger day (default 4.2) for the live demo.

Run:  python3 generate_seed_data.py [--end-date YYYY-MM-DD] [--seed 42] [--demo-days 4.2]
"""
import argparse, csv, math, os
from datetime import date, datetime, timedelta
import numpy as np

ITEMS = ["Fuel", "Rations", "Medical Supplies", "Ammunition"]
UOM = {"Fuel": "kL", "Rations": "packs", "Medical Supplies": "kits", "Ammunition": "rounds"}
DEC = {"Fuel": 2, "Rations": 0, "Medical Supplies": 0, "Ammunition": 0}   # meaningful decimals

# id, name, type, parent, altitude_m, lon, lat, terrain_score(1-10), size factor (Charlie = 1.0)
UNITS = [
    ("UNIT_01", "Leh Base HQ & Logistic Hub",        "HQ",    None,      3500, 77.58, 34.15, 3.0, 3.00),
    ("UNIT_02", "Kargil Forward Supply Depot",       "DEPOT", "UNIT_01", 2676, 76.13, 34.56, 4.0, 1.50),
    ("UNIT_03", "Siachen Base Camp (FOB Charlie)",   "FOB",   "UNIT_02", 3600, 77.20, 35.20, 8.5, 1.00),
    ("UNIT_04", "Dras Tactical Outpost",             "POST",  "UNIT_02", 3280, 75.76, 34.43, 6.0, 0.60),
    ("UNIT_05", "Galwan Valley Forward Post",        "POST",  "UNIT_01", 4200, 78.20, 34.75, 8.0, 0.55),
    ("UNIT_06", "Chushul Strategic Garrison",        "POST",  "UNIT_01", 4350, 78.65, 33.59, 7.0, 0.80),
    ("UNIT_07", "Nubra Valley Intermediate Depot",   "DEPOT", "UNIT_01", 3048, 77.56, 34.68, 5.0, 0.70),
    ("UNIT_08", "Daulet Beg Oldie (DBO) FOB",        "FOB",   "UNIT_07", 5065, 77.92, 35.35, 9.0, 0.50),
]
BASE_CHARLIE = {"Fuel": 5.7, "Rations": 700.0, "Medical Supplies": 12.0, "Ammunition": 900.0}  # per day
TEMPO_MULT = {
    "Fuel":             {1: .90, 2: 1.0, 3: 1.15, 4: 1.5, 5: 3.0},
    "Rations":          {1: 1.0, 2: 1.0, 3: 1.05, 4: 1.1, 5: 1.15},
    "Medical Supplies": {1: .90, 2: 1.0, 3: 1.10, 4: 1.4, 5: 2.0},
    "Ammunition":       {1: .50, 2: 1.0, 3: 1.50, 4: 2.2, 5: 3.0},
}
# Stress events, as day indices counted from the first ledger day (0 .. days-1)
BLIZZARDS = [range(70, 75), range(118, 123)]
SURGES    = [range(150, 154), range(322, 326)]
FLEET     = [range(205, 210), range(335, 342)]
SURGE_UNITS = {"UNIT_03", "UNIT_05", "UNIT_06", "UNIT_08"}   # border FOBs / posts


def cents(x, item):
    d = DEC[item]
    return int(round(x * 10 ** d)) * 10 ** (2 - d)


def fmt(c):
    return f"{c // 100}.{c % 100:02d}"


def q(s):
    return "'" + s.replace("'", "''") + "'"


def gen_weather(rng, alt, start, n, blizz):
    T, SN, RN, VS = [], [], [], []
    noise = 0.0
    for i in range(n):
        doy = (start + timedelta(days=i)).timetuple().tm_yday
        base = 6.0 + 14.0 * math.sin(2 * math.pi * (doy - 109) / 365.0) - 6.5 * (alt - 3500) / 1000.0
        noise = 0.7 * noise + rng.normal(0, 2.0)
        t = base + noise
        snow = rain = 0.0
        if t < 2.0:
            if rng.random() < min(0.45, 0.16 + 0.08 * max(0.0, (alt - 3500) / 1000.0)):
                snow = min(110.0, rng.gamma(1.3, 7.0) * (1 + max(0.0, alt - 3500) / 3000.0))
        elif rng.random() < 0.06:
            rain = min(25.0, rng.gamma(1.2, 3.0))
        vis = float(np.clip(10.0 - 0.11 * snow + rng.normal(0, 0.6), 0.2, 10.0))
        if i in blizz:
            t = -22.0 + rng.normal(0, 0.8)
            snow = float(np.clip(rng.normal(90, 6), 70, 110))
            rain = 0.0
            vis = float(rng.uniform(0.3, 0.8))
        T.append(round(float(t), 2)); SN.append(round(float(snow), 2))
        RN.append(round(float(rain), 2)); VS.append(round(vis, 2))
    return T, SN, RN, VS


def wx_risk(t, snow, vis):
    r = 0.5 * min(snow / 60.0, 1) + 0.3 * min(max(0.0, -t - 5) / 25.0, 1) + 0.2 * (1 - min(vis, 10) / 10.0)
    return round(float(min(max(r, 0.0), 1.0)), 2)


def route_state(snow, vis, t, in_blizzard):
    if in_blizzard or snow > 40:
        return "BLOCKED"
    if snow > 15 or vis < 2 or t < -20:
        return "RESTRICTED"
    return "OPEN"


def demand(item, base, temp, snow, tempo, dow, rng):
    cold = max(0.0, -5.0 - temp)
    m = TEMPO_MULT[item][tempo]
    if item == "Fuel":
        m *= math.exp(0.03 * cold) * (1 + 0.002 * snow) * (0.95 if dow >= 5 else 1.0)
    elif item == "Rations":
        m *= 1 + 0.006 * cold
    elif item == "Medical Supplies":
        m *= 1 + 0.01 * cold
    else:
        m *= 0.6 if dow >= 5 else 1.0
    return base * m * math.exp(rng.normal(0, 0.08))


def simulate(dem, route, veh, base_c, min_c, max_c, lead, quantum, freeze_from=None):
    n = len(dem)
    S = (int(0.9 * max_c) // quantum) * quantum
    ROP = min_c + (lead + 1) * base_c
    stock, pending = S, []
    op, inc, used, clo = [], [], [], []
    for i in range(n):
        arr = sum(qty for a, qty in pending if a == i)
        pending = [(a, qty) for a, qty in pending if a != i]
        avail = stock + arr
        u = min(dem[i], avail)
        cl = avail - u
        op.append(stock); inc.append(arr); used.append(u); clo.append(cl)
        stock = cl
        pend = sum(qty for _, qty in pending)
        if cl + pend < ROP and (freeze_from is None or i + 1 < freeze_from):
            qty = S - cl - pend
            if qty <= 0:
                continue
            a = i + lead + (2 if veh[i] < 0.5 else 0)
            while a < n and route[a] == "BLOCKED":
                a += 1
            if freeze_from is not None and a >= freeze_from:
                continue
            pending.append((a, qty))
    return op, inc, used, clo


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--end-date", default=None, help="last ledger day, YYYY-MM-DD (default: yesterday)")
    ap.add_argument("--days", type=int, default=365)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--demo-days", type=float, default=4.2)
    ap.add_argument("--out", default=os.path.dirname(os.path.abspath(__file__)))
    a = ap.parse_args()

    n = a.days
    assert n > 345, "event windows need at least 346 days"
    end = date.fromisoformat(a.end_date) if a.end_date else date.today() - timedelta(days=1)
    start = end - timedelta(days=n - 1)
    blizz = {i for r in BLIZZARDS for i in r}
    surge = {i for r in SURGES for i in r}
    fleet = {i for r in FLEET for i in r}
    event_idx = blizz | surge | fleet

    # ---- injected anomalies (ground truth for Isolation Forest evaluation) ----
    ra = np.random.default_rng(a.seed + 999)
    anoms = {}
    while len(anoms) < 14:
        u = UNITS[int(ra.integers(len(UNITS)))][0]
        kind = str(ra.choice(["SIPHON", "UNLOGGED_DRAW", "SENSOR_FAIL"]))
        idx = int(ra.integers(20, n - 13))
        if idx in event_idx:
            continue
        if kind == "SIPHON":
            item, f = "Fuel", float(ra.uniform(3.0, 4.5))
        elif kind == "UNLOGGED_DRAW":
            item, f = "Ammunition", float(ra.uniform(3.5, 5.0))
        else:
            item, f = str(ra.choice(ITEMS)), 0.0
        anoms[(u, item, idx)] = (kind, f)

    weather_rows, ledger_rows, inv_rows, stats = [], [], [], []
    wx_by_unit = {}
    for ui, (uid, name, typ, parent, alt, lon, lat, terr, size) in enumerate(UNITS):
        rng = np.random.default_rng(a.seed + ui)
        T, SN, RN, VS = gen_weather(rng, alt, start, n, blizz)
        wx_by_unit[uid] = (T, SN, RN, VS)
        route = [route_state(SN[i], VS[i], T[i], i in blizz) for i in range(n)]
        tempo, cur = [], 2
        for i in range(n):
            if rng.random() < 0.12:
                cur = int(rng.choice([1, 2, 2, 2, 3, 3]))
            tempo.append(5 if (i in surge and uid in SURGE_UNITS) else cur)
        veh = [round(float(np.clip(rng.normal(0.85, 0.07), 0.55, 1.0)), 2) for _ in range(n)]
        for i in fleet:
            veh[i] = 0.2
        for i in range(n):
            d = start + timedelta(days=i)
            weather_rows.append((uid, d, T[i], RN[i], SN[i], VS[i], wx_risk(T[i], SN[i], VS[i]), False))
        lead = math.ceil(1 + terr / 3.0)

        for item in ITEMS:
            base = BASE_CHARLIE[item] * size
            qn = 10 ** (2 - DEC[item])
            base_c, min_c = cents(base, item), cents(3 * base, item)
            max_c = cents(20 * base, item)
            dem = []
            for i in range(n):
                dow = (start + timedelta(days=i)).weekday()          # Monday = 0 (matches pandas)
                x = demand(item, base, T[i], SN[i], tempo[i], dow, rng)
                k = anoms.get((uid, item, i))
                if k:
                    x = 0.0 if k[0] == "SENSOR_FAIL" else x * k[1]
                dem.append(cents(x, item))
            pinned = (uid == "UNIT_03" and item == "Fuel")
            freeze = n - 5 if pinned else None
            op, inc, used, clo = simulate(dem, route, veh, base_c, min_c, max_c, lead, qn, freeze)
            if pinned:                       # pin FOB Charlie fuel for the demo
                m7 = sum(used[-7:]) / 7.0
                target = (int(round(a.demo_days * m7)) // qn) * qn
                last = max(i for i in range(freeze) if inc[i] > 0)
                inc[last] += target - clo[-1]
                assert inc[last] >= 0, "pin adjustment would make a resupply negative"
                stock = op[last]
                for i in range(last, n):
                    op[i] = stock
                    assert used[i] <= op[i] + inc[i], "pin adjustment starved a day"
                    clo[i] = op[i] + inc[i] - used[i]
                    stock = clo[i]
                assert clo[-1] == target
            for i in range(n):
                assert clo[i] == op[i] + inc[i] - used[i] and clo[i] >= 0
                ledger_rows.append((uid, item, start + timedelta(days=i), op[i], inc[i], used[i], clo[i],
                                    tempo[i], veh[i], route[i]))
            inv_rows.append((uid, item, clo[-1], min_c, max_c, UOM[item]))
            stats.append((uid, item, sum(1 for c in clo if c <= min_c), sum(1 for c in clo if c == 0)))

    # ---- 3-day storm forecast rows (demo fixture; is_forecast = true) ----
    pattern = [(-12.0, 35.0, 1.0), (-18.0, 75.0, 0.3), (-14.0, 40.0, 1.5)]
    for uid, _, _, _, alt, *_ in UNITS:
        for k, (t0, sn, vs) in enumerate(pattern, start=1):
            t = round(t0 + (3600 - alt) / 1000.0 * 6.5, 2)
            weather_rows.append((uid, end + timedelta(days=k), t, 0.0, sn, vs, wx_risk(t, sn, vs), True))

    # ---- demo fixtures: forecast + alerts for FOB Charlie fuel ----
    inv = {(r[0], r[1]): r for r in inv_rows}
    c_stock = inv[("UNIT_03", "Fuel")][2]
    c_min = inv[("UNIT_03", "Fuel")][3]
    burn_f = c_stock / 100.0 * 24.0 / 34.0                         # kL/day that gives a 34 h stock-out
    p50, p10, p90 = 2 * burn_f, 2 * burn_f * 0.82, 2 * burn_f * 1.22
    m7c = [r for r in ledger_rows if r[0] == "UNIT_03" and r[1] == "Fuel"][-7:]
    m7 = sum(r[5] for r in m7c) / 700.0
    last_siphon = [(k, v) for k, v in anoms.items() if v[0] == "SIPHON"]
    last_siphon.sort(key=lambda kv: kv[0][2])

    out = []
    A = out.append
    A("-- GENERATED by generate_seed_data.py  |  SYNTHETIC DATA FOR R&D ONLY - NOT ACTUAL INDIAN ARMY LOGS")
    A(f"-- ledger: {start} .. {end}  ({n} days)  seed={a.seed}  demo_days={a.demo_days}")
    A("BEGIN;")
    A("INSERT INTO units (id, name, type, parent_unit_id, altitude_m, terrain_score, geom) VALUES")
    A(",\n".join(f"({q(u[0])}, {q(u[1])}, {q(u[2])}, {q(u[3]) if u[3] else 'NULL'}, {u[4]}, {u[7]}, "
                 f"ST_SetSRID(ST_MakePoint({u[5]}, {u[6]}), 4326))" for u in UNITS) + ";")
    A("COPY inventory (unit_id, item_type, quantity, minimum_stock, maximum_stock, unit_of_measure) FROM stdin;")
    for r in inv_rows:
        A(f"{r[0]}\t{r[1]}\t{fmt(r[2])}\t{fmt(r[3])}\t{fmt(r[4])}\t{r[5]}")
    A("\\.")
    A("COPY weather (unit_id, obs_date, observed_at, temperature, rainfall_mm, snowfall_mm, visibility_km, risk_score, is_forecast) FROM stdin;")
    for (uid, d, t, rn, sn, vs, rk, fc) in weather_rows:
        A(f"{uid}\t{d}\t{d} 06:00:00+00\t{t:.2f}\t{rn:.2f}\t{sn:.2f}\t{vs:.2f}\t{rk:.2f}\t{'t' if fc else 'f'}")
    A("\\.")
    A("COPY consumption (unit_id, item_type, date, opening_stock, incoming_supply, quantity_used, closing_stock, "
      "operational_tempo, vehicle_availability, route_status) FROM stdin;")
    for r in ledger_rows:
        A(f"{r[0]}\t{r[1]}\t{r[2]}\t{fmt(r[3])}\t{fmt(r[4])}\t{fmt(r[5])}\t{fmt(r[6])}\t{r[7]}\t{r[8]:.2f}\t{r[9]}")
    A("\\.")
    A("UPDATE weather w SET geom = u.geom FROM units u WHERE u.id = w.unit_id;")
    A("-- Demo fixtures. model_version marks them as NOT real model output.")
    A("INSERT INTO forecasts (unit_id, item_type, forecast_time, horizon, predicted_quantity, lower_bound, upper_bound, "
      "stockout_risk, anomaly_flag, top_factors, model_version) VALUES")
    A(f"('UNIT_03', 'Fuel', now(), '48h', {p50:.2f}, {p10:.2f}, {p90:.2f}, 0.780, FALSE, "
      f"{q('[\"Subzero temperature (-18C) surges fuel burn\", \"Pass Echo closure forecast within 22h (75 mm snowfall)\", \"Reserve buffer critical\"]')}::jsonb, 'SEED_DEMO_FIXTURE');")
    A("INSERT INTO alerts (type, severity, unit_id, item_type, message, status) VALUES")
    rows = [
        ("STOCKOUT_PREDICTED", "CRITICAL", "UNIT_03", "Fuel",
         "FOB Charlie fuel exhaustion predicted within 34h; Pass Echo closure expected in 22h. [DEMO FIXTURE - SYNTHETIC DATA]"),
        ("PASS_CLOSURE_FORECAST", "HIGH", "UNIT_02", None,
         "Heavy snowfall (75 mm) forecast on the Pass Echo corridor; consider valley bypass. [DEMO FIXTURE - SYNTHETIC DATA]"),
    ]
    if last_siphon:
        (u, item, idx), _ = last_siphon[-1]
        rows.append(("ANOMALY_DETECTED", "MEDIUM", u, item,
                     f"Unusual {item.lower()} draw logged on {start + timedelta(days=idx)}. [SYNTHETIC INJECTED ANOMALY]"))
    A(",\n".join(f"({q(t)}, {q(s)}, {q(u)}, {q(i) if i else 'NULL'}, {q(m)}, 'ACTIVE')" for t, s, u, i, m in rows) + ";")
    A("COMMIT;")
    A("ANALYZE;")
    with open(os.path.join(a.out, "02_seed_generated.sql"), "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(out) + "\n")
    with open(os.path.join(a.out, "anomaly_ground_truth.csv"), "w", newline="") as f:
        w = csv.writer(f); w.writerow(["unit_id", "item_type", "date", "kind", "factor"])
        for (u, item, idx), (kind, fct) in sorted(anoms.items(), key=lambda kv: kv[0][2]):
            w.writerow([u, item, start + timedelta(days=idx), kind, round(fct, 2)])

    print(f"ledger {start}..{end}: {len(ledger_rows)} rows, weather {len(weather_rows)} rows, inventory {len(inv_rows)}")
    c = [r for r in inv_rows if r[0] == "UNIT_03" and r[1] == "Fuel"][0]
    print(f"FOB Charlie fuel: stock {fmt(c[2])} kL, 7d burn {m7:.2f} kL/d, min {fmt(c[3])} kL, "
          f"days_remaining {c[2] / 100 / m7:.2f}, forecast burn {burn_f:.1f} kL/d")
    tot = sum(s[2] for s in stats); zero = sum(s[3] for s in stats)
    print(f"series-days at/below minimum stock: {tot} ({100.0 * tot / len(ledger_rows):.1f}%), at zero: {zero}")


if __name__ == "__main__":
    main()
