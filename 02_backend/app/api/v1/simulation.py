"""
War-Gaming & Stress-Test Simulation Sandbox Router
Hard In-Memory Simulation Sandbox Invariant:
Clones state in memory. Base tables (inventory, convoys, routes) are NEVER modified.
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.auth import User
from app.schemas.simulation import (
    SimulationScenarioRequest,
    SimulationScenarioResponse,
)
from app.services.sim_service import sim_service
from app.security.dependencies import (
    get_current_user,
    require_role,
    verify_rate_limit,
)
from app.security.audit import log_audit_event

router = APIRouter(dependencies=[Depends(verify_rate_limit)])


@router.post("/scenario", response_model=SimulationScenarioResponse)
def execute_war_game_scenario(
    payload: SimulationScenarioRequest,
    request: Request,
    db: Session = Depends(get_db),
    officer: User = Depends(require_role(["CORPS_COMMANDER", "COMMANDER", "LOGISTICS_OFFICER"])),
):
    """
    Executes a high-altitude winter warfare simulation in an isolated in-memory sandbox.
    MANDATORY DEFENSE INVARIANT:
    Clones all tactical graphs and ledgers in-memory.
    NEVER writes or updates inventory, convoys, or routes in the production database.
    """
    response = sim_service.run_war_game_scenario(
        db=db,
        scenario=payload,
        user_id=officer.username,
    )

    client_ip = request.client.host if request.client else "unknown"
    log_audit_event(
        db=db,
        user_id=officer.username,
        action="SIMULATION_WAR_GAME_EXECUTED",
        resource_target=f"simulation/{payload.scenario_name}",
        ip_address=client_ip,
        metadata={
            "scenario": payload.scenario_name,
            "baseline_stockouts": response.baseline_stockouts,
            "simulated_stockouts": response.simulated_stockouts,
            "sandbox_isolated": response.sandbox_isolation_verified,
        },
        request_payload=payload.model_dump(),
    )

    return response
