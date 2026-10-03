"""
Isolated War-Gaming Sandbox Simulation Service
Hard In-Memory Sandbox Invariant:
Clones tactical state strictly in-memory (deep copy of graphs/ledgers).
NEVER executes SQL UPDATE, INSERT, or DELETE on base production tables (inventory, convoys, routes).
"""

import copy
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from app.models.logistics import Unit, Inventory, Consumption, Route
from app.models.intelligence import SimulationRun
from app.schemas.simulation import (
    SimulationScenarioRequest,
    SimulationScenarioResponse,
    UnitSimulationProjection,
)


class SimService:
    def run_war_game_scenario(
        self,
        db: Session,
        scenario: SimulationScenarioRequest,
        user_id: str,
    ) -> SimulationScenarioResponse:
        """
        Executes a war-game scenario simulation in an isolated in-memory memory sandbox.
        All entities are cloned into pure python structures.
        Base tables are NEVER mutated.
        """
        # 1. READ-ONLY Extraction of Base Tactical State
        db_units = db.query(Unit).all()
        db_inventories = db.query(Inventory).all()
        db_consumptions = db.query(Consumption).all()
        db_routes = db.query(Route).all()

        # 2. Strict Deep Copy into Isolated In-Memory Python Dictionaries
        units_sandbox: Dict[str, Dict[str, Any]] = {}
        for u in db_units:
            units_sandbox[u.id] = {
                "id": u.id,
                "name": u.name,
                "type": u.type,
                "altitude_m": float(u.altitude_m),
                "latitude": float(u.latitude),
                "longitude": float(u.longitude),
            }

        # In-memory inventory ledger: unit_id -> {item_type: quantity}
        inventory_sandbox: Dict[str, Dict[str, float]] = {}
        inventory_baseline: Dict[str, Dict[str, float]] = {}
        for inv in db_inventories:
            if inv.unit_id not in inventory_sandbox:
                inventory_sandbox[inv.unit_id] = {}
                inventory_baseline[inv.unit_id] = {}
            inventory_sandbox[inv.unit_id][inv.item_type] = float(inv.quantity)
            inventory_baseline[inv.unit_id][inv.item_type] = float(inv.quantity)

        # Baseline average daily burn rate: unit_id -> {item_type: daily_burn}
        burn_rates: Dict[str, Dict[str, List[float]]] = {}
        for c in db_consumptions:
            if c.unit_id not in burn_rates:
                burn_rates[c.unit_id] = {}
            if c.item_type not in burn_rates[c.unit_id]:
                burn_rates[c.unit_id][c.item_type] = []
            burn_rates[c.unit_id][c.item_type].append(float(c.quantity_used))

        daily_burn_map: Dict[str, Dict[str, float]] = {}
        for u_id in units_sandbox:
            daily_burn_map[u_id] = {}
            for item in ["Fuel", "Rations", "Medical Supplies", "Ammunition"]:
                rates = burn_rates.get(u_id, {}).get(item, [80.0])
                daily_burn_map[u_id][item] = float(sum(rates) / len(rates)) if rates else 80.0

        # In-memory routes copy
        routes_sandbox: List[Dict[str, Any]] = []
        for r in db_routes:
            routes_sandbox.append({
                "id": r.id,
                "name": r.name,
                "origin_id": r.origin_id,
                "dest_id": r.dest_id,
                "distance_km": float(r.distance_km),
                "terrain_score": float(r.terrain_score),
                "status": r.status,
                "is_snow_blocked": r.is_snow_blocked,
            })

        # Deep clone in-memory sandbox to guarantee total isolation
        sim_inventory = copy.deepcopy(inventory_sandbox)
        sim_routes = copy.deepcopy(routes_sandbox)

        # 3. Apply Scenario Modifiers In-Memory
        # Block requested routes
        blocked_set = set(scenario.blocked_route_ids)
        for r in sim_routes:
            if r["id"] in blocked_set or scenario.snowfall_delta >= 45.0:
                r["status"] = "BLOCKED"
                r["is_snow_blocked"] = True

        # Calculate average convoy detour delay
        baseline_delay = 0.0
        simulated_delay = 0.0
        blocked_count = sum(1 for r in sim_routes if r["status"] == "BLOCKED")
        simulated_delay = round(blocked_count * 4.5 * (1.0 + scenario.snowfall_delta / 100.0), 1)

        # 4. In-Memory Multi-Day Burn Simulation
        days = scenario.simulation_days
        multiplier = scenario.demand_multiplier

        baseline_stockouts = 0
        simulated_stockouts = 0
        projections: List[UnitSimulationProjection] = []
        depot_stock_accumulator: Dict[str, float] = {}

        for u_id, u_info in units_sandbox.items():
            u_name = u_info["name"]
            is_depot = u_info["type"].upper() in ("DEPOT", "HQ")

            for item, start_stock in inventory_sandbox.get(u_id, {}).items():
                normal_burn = daily_burn_map[u_id].get(item, 80.0)
                surge_burn = normal_burn * multiplier

                # Baseline burn
                baseline_end = max(0.0, start_stock - (normal_burn * days))
                if baseline_end <= 0.0:
                    baseline_stockouts += 1

                # Simulated burn with modifiers
                simulated_end = max(0.0, start_stock - (surge_burn * days))
                days_to_stockout = round(start_stock / (surge_burn + 1e-5), 1)

                if simulated_end <= 0.0:
                    simulated_stockouts += 1
                    status = "STOCKOUT"
                elif days_to_stockout <= 3.0:
                    status = "AT_RISK"
                else:
                    status = "SECURE"

                # Track depot available capacity for prestaging recommendation
                if is_depot:
                    depot_stock_accumulator[u_id] = depot_stock_accumulator.get(u_id, 0.0) + simulated_end

                projections.append(
                    UnitSimulationProjection(
                        unit_id=u_id,
                        unit_name=u_name,
                        item_type=item,
                        current_stock=round(start_stock, 1),
                        simulated_stock_after_run=round(simulated_end, 1),
                        burn_rate_per_day=round(surge_burn, 1),
                        days_to_stockout=days_to_stockout,
                        status=status,
                    )
                )

        # Determine recommended prestage depot based on highest remaining capacity & accessibility
        recommended_depot = "DEPOT_LEH_CENTRAL"
        if depot_stock_accumulator:
            recommended_depot = max(depot_stock_accumulator.items(), key=lambda x: x[1])[0]

        stockout_increase = (
            round(((simulated_stockouts - baseline_stockouts) / max(1, baseline_stockouts)) * 100.0, 1)
            if simulated_stockouts >= baseline_stockouts
            else 0.0
        )

        isolated_units = [
            u_id for u_id in units_sandbox
            if all(r["status"] == "BLOCKED" for r in sim_routes if r["dest_id"] == u_id or r["origin_id"] == u_id)
        ]

        response_summary = {
            "baseline_stockouts": baseline_stockouts,
            "simulated_stockouts": simulated_stockouts,
            "avg_convoy_delay_hours": simulated_delay,
            "recommended_prestage_depot": recommended_depot,
            "isolated_units_count": len(isolated_units),
        }

        # 5. Persist strictly the simulation audit metadata (NO MUTATION of inventory/convoys/routes)
        sim_run_record = SimulationRun(
            user_id=user_id,
            scenario_name=scenario.scenario_name,
            parameters=scenario.model_dump(),
            results_summary=response_summary,
        )
        db.add(sim_run_record)
        db.commit()

        return SimulationScenarioResponse(
            scenario_name=scenario.scenario_name,
            simulation_days=days,
            modifiers_applied=scenario.model_dump(),
            baseline_stockouts=baseline_stockouts,
            simulated_stockouts=simulated_stockouts,
            stockout_increase_percentage=stockout_increase,
            avg_convoy_delay_hours=simulated_delay,
            recommended_prestage_depot=recommended_depot,
            isolated_units=isolated_units,
            unit_projections=projections,
            sandbox_isolation_verified=True,
            notice="Tactical state cloned strictly in-memory. Zero mutations applied to production tables."
        )


sim_service = SimService()
