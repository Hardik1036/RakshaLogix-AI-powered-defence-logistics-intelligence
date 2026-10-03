"""
Command Alerts Router
Serves operational alerts and handles officer acknowledgements with immutable audit trails.
"""

from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.auth import User
from app.models.intelligence import Alert
from app.schemas.alerts import AlertRead, AlertAcknowledgeRequest
from app.security.dependencies import (
    get_current_user,
    require_role,
    verify_rate_limit,
)
from app.security.audit import log_audit_event

router = APIRouter(dependencies=[Depends(verify_rate_limit)])


@router.get("", response_model=List[AlertRead])
def get_alerts(
    status_filter: Optional[str] = Query("ACTIVE", description="Filter by ACTIVE or ACKNOWLEDGED"),
    severity: Optional[str] = Query(None, description="Filter by CRITICAL, HIGH, MEDIUM"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves operational defense alerts across sectors."""
    query = db.query(Alert)
    if status_filter:
        query = query.filter(Alert.status == status_filter.upper())
    if severity:
        query = query.filter(Alert.severity == severity.upper())

    return query.order_by(Alert.created_at.desc()).all()


@router.patch("/{alert_id}/ack", response_model=AlertRead)
def acknowledge_alert(
    alert_id: str,
    payload: AlertAcknowledgeRequest,
    request: Request,
    db: Session = Depends(get_db),
    officer: User = Depends(require_role(["CORPS_COMMANDER", "COMMANDER", "LOGISTICS_OFFICER"])),
):
    """
    Officer Alert Acknowledgement.
    Restricted strictly to commanders and logistics officers.
    Records officer signature and logs an immutable audit entry.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Alert '{alert_id}' not found")

    alert.status = "ACKNOWLEDGED"
    alert.acknowledged_by = officer.username
    alert.acknowledged_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(alert)

    client_ip = request.client.host if request.client else "unknown"
    log_audit_event(
        db=db,
        user_id=officer.username,
        action="ALERT_ACKNOWLEDGED",
        resource_target=f"alert/{alert_id}",
        ip_address=client_ip,
        metadata={
            "alert_id": alert_id,
            "severity": alert.severity,
            "notes": payload.notes,
        },
        request_payload=payload.model_dump(),
    )

    return alert
