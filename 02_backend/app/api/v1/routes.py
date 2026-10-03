"""
Tactical Routing Router
Multi-factor corridor optimization with primary and fallback mountain bypasses.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.auth import User
from app.models.logistics import Route
from app.schemas.routes import (
    RouteOptimiseRequest,
    RouteOptimiseResponse,
    RouteRead,
)
from app.services.route_service import route_service
from app.security.dependencies import (
    get_current_user,
    require_role,
    verify_rate_limit,
)
from app.security.audit import log_audit_event

router = APIRouter(dependencies=[Depends(verify_rate_limit)])


@router.post("/optimise", response_model=RouteOptimiseResponse)
def optimize_tactical_route(
    payload: RouteOptimiseRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Computes optimal multi-factor supply corridor.
    Edge_Cost = Distance_km + (Terrain_Score * 1.8) + (Snowfall_mm * 0.25) + (Pass_Block_Penalty * 999)
    Returns primary safe corridor and secondary valley bypass GeoJSON polylines.
    """
    result = route_service.optimize_route(
        db=db,
        origin_id=payload.origin_id,
        dest_id=payload.dest_id,
        avoid_blocked_passes=payload.avoid_blocked_passes,
    )

    client_ip = request.client.host if request.client else "unknown"
    log_audit_event(
        db=db,
        user_id=current_user.username,
        action="ROUTE_OPTIMISED",
        resource_target=f"route/{payload.origin_id}_{payload.dest_id}",
        ip_address=client_ip,
        metadata={
            "primary_distance_km": result.primary_distance_km,
            "primary_edge_cost": result.primary_edge_cost,
            "fallback_available": result.fallback_corridor is not None,
        },
        request_payload=payload.model_dump(),
    )

    return result


@router.get("", response_model=List[RouteRead])
def list_tactical_routes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns all registered mountain passes and arterial supply roads."""
    return db.query(Route).all()


@router.get("/{route_id}/fallback", response_model=RouteOptimiseResponse)
def get_route_fallback(
    route_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves secondary valley bypass corridor for a specific route."""
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Route '{route_id}' not found")

    return route_service.optimize_route(
        db=db,
        origin_id=route.origin_id,
        dest_id=route.dest_id,
        avoid_blocked_passes=True,
    )


@router.patch("/{route_id}/status")
def update_route_status(
    route_id: str,
    new_status: str,
    request: Request,
    db: Session = Depends(get_db),
    officer: User = Depends(require_role(["CORPS_COMMANDER", "COMMANDER", "LOGISTICS_OFFICER"])),
):
    """Allows authorized officer to declare a mountain pass OPEN, RESTRICTED, or BLOCKED."""
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Route '{route_id}' not found")

    allowed_statuses = {"OPEN", "RESTRICTED", "BLOCKED"}
    clean_status = new_status.upper().strip()
    if clean_status not in allowed_statuses:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Status must be in {allowed_statuses}")

    old_status = route.status
    route.status = clean_status
    route.is_snow_blocked = (clean_status == "BLOCKED")
    db.commit()

    client_ip = request.client.host if request.client else "unknown"
    log_audit_event(
        db=db,
        user_id=officer.username,
        action="ROUTE_STATUS_OVERRIDE",
        resource_target=f"route/{route_id}",
        ip_address=client_ip,
        metadata={"old_status": old_status, "new_status": clean_status},
    )

    return {"message": f"Route '{route_id}' status updated to {clean_status}", "route_id": route_id, "status": clean_status}
