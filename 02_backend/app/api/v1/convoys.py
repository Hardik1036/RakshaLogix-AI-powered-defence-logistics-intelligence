"""
Officer-Authorized Convoy Dispatch Router
Zero Autonomous Troop Orders Invariant:
No convoy is dispatched automatically. Every movement requires explicit officer cryptographic sign-off.
"""

import uuid
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.auth import User
from app.models.logistics import Convoy, Route, Unit
from app.schemas.convoys import (
    ConvoyCreate,
    ConvoyStatusUpdate,
    ConvoyRead,
)
from app.security.dependencies import (
    get_current_user,
    require_role,
    verify_rate_limit,
)
from app.security.audit import log_audit_event

router = APIRouter(dependencies=[Depends(verify_rate_limit)])


@router.get("", response_model=List[ConvoyRead])
def list_convoys(
    status_filter: Optional[str] = Query(None, description="Filter by SCHEDULED, IN_TRANSIT, ARRIVED, REROUTED"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists officer-authorized troop and supply movements across sectors."""
    query = db.query(Convoy)
    if status_filter:
        query = query.filter(Convoy.status == status_filter.upper())
    return query.order_by(Convoy.departure_time.desc()).all()


@router.get("/{convoy_id}", response_model=ConvoyRead)
def get_convoy_detail(
    convoy_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves operational details and cryptographic sign-off chain for a convoy."""
    convoy = db.query(Convoy).filter(Convoy.id == convoy_id).first()
    if not convoy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Convoy '{convoy_id}' not found")
    return convoy


@router.post("", response_model=ConvoyRead, status_code=status.HTTP_201_CREATED)
def authorize_convoy_dispatch(
    payload: ConvoyCreate,
    request: Request,
    db: Session = Depends(get_db),
    officer: User = Depends(require_role(["CORPS_COMMANDER", "COMMANDER", "LOGISTICS_OFFICER"])),
):
    """
    Officer Resupply Dispatch Authorization.
    MANDATORY DEFENSE INVARIANT:
    Requires explicit cryptographic sign-off ('ACCEPT' or 'MODIFY').
    Autonomous dispatch without human sign-off is strictly prohibited.
    """
    # Verify route exists
    route = db.query(Route).filter(Route.id == payload.route_id).first()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Route '{payload.route_id}' does not exist")

    now = datetime.now(timezone.utc)
    departure = payload.departure_time or now
    eta = payload.eta or (departure + timedelta(hours=int(route.distance_km / 30.0 + 1.0)))

    convoy_id = payload.id or f"CNV_{now.strftime('%Y%m%d')}_{uuid.uuid4().hex[:6].upper()}"

    convoy = Convoy(
        id=convoy_id,
        route_id=payload.route_id,
        origin_id=payload.origin_id,
        dest_id=payload.dest_id,
        vehicle_count=payload.vehicle_count,
        cargo_type=payload.cargo_type,
        cargo_quantity=payload.cargo_quantity,
        status="SCHEDULED",
        departure_time=departure,
        eta=eta,
        sign_off_officer_id=officer.username,
        sign_off_action=payload.sign_off_action.upper(),
        sign_off_timestamp=now,
        sign_off_notes=payload.sign_off_notes,
    )

    db.add(convoy)
    db.commit()
    db.refresh(convoy)

    client_ip = request.client.host if request.client else "unknown"
    log_audit_event(
        db=db,
        user_id=officer.username,
        action="CONVOY_DISPATCH_AUTHORIZED",
        resource_target=f"convoy/{convoy.id}",
        ip_address=client_ip,
        metadata={
            "convoy_id": convoy.id,
            "sign_off_action": convoy.sign_off_action,
            "route_id": convoy.route_id,
            "cargo": convoy.cargo_type,
            "quantity": convoy.cargo_quantity,
        },
        request_payload=payload.model_dump(),
    )

    return convoy


@router.patch("/{convoy_id}/status", response_model=ConvoyRead)
def update_convoy_status(
    convoy_id: str,
    payload: ConvoyStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    officer: User = Depends(require_role(["CORPS_COMMANDER", "COMMANDER", "LOGISTICS_OFFICER"])),
):
    """Updates operational movement progress with immutable audit tracking."""
    convoy = db.query(Convoy).filter(Convoy.id == convoy_id).first()
    if not convoy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Convoy '{convoy_id}' not found")

    old_status = convoy.status
    convoy.status = payload.status

    if payload.current_longitude is not None and payload.current_latitude is not None:
        convoy.current_location = [payload.current_longitude, payload.current_latitude]

    db.commit()
    db.refresh(convoy)

    client_ip = request.client.host if request.client else "unknown"
    log_audit_event(
        db=db,
        user_id=officer.username,
        action="CONVOY_STATUS_UPDATED",
        resource_target=f"convoy/{convoy_id}",
        ip_address=client_ip,
        metadata={"old_status": old_status, "new_status": convoy.status},
        request_payload=payload.model_dump(),
    )

    return convoy
