"""
Isolated In-Memory War-Gaming Sandbox Schemas
Guarantees zero database table mutation during scenario simulations.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class UnitSimulationProjection(BaseModel):
    unit_id: str
    unit_name: str
    item_type: str
    current_stock: float
    simulated_stock_after_run: float
    burn_rate_per_day: float
    days_to_stockout: float
    status: str  # SECURE, AT_RISK, STOCKOUT


class SimulationScenarioRequest(BaseModel):
    scenario_name: str = Field(default="Winter_Pass_Blockade_Surge", description="War-game identifier")
    demand_multiplier: float = Field(default=1.5, ge=0.1, le=10.0, description="Surge multiplier on daily burn")
    snowfall_delta: float = Field(default=35.0, ge=-50.0, le=300.0, description="Additional snowfall in mm")
    blocked_route_ids: List[str] = Field(default_factory=list, description="Explicit pass/route blockades")
    simulation_days: int = Field(default=7, ge=1, le=30, description="Planning horizon in days")


class SimulationScenarioResponse(BaseModel):
    scenario_name: str
    simulation_days: int
    modifiers_applied: Dict[str, Any]
    baseline_stockouts: int
    simulated_stockouts: int
    stockout_increase_percentage: float
    avg_convoy_delay_hours: float
    recommended_prestage_depot: str
    isolated_units: List[str]
    unit_projections: List[UnitSimulationProjection]
    sandbox_isolation_verified: bool = True
    notice: str = "Tactical state cloned strictly in-memory. Zero mutations applied to production tables."
