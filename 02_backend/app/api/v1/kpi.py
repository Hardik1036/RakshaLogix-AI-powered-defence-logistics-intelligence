"""
Tactical Dashboard KPI Router
Provides consolidated operational readiness metrics for military commanders.
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.auth import User, AuditLog
from app.models.logistics import Unit, Inventory, Convoy, Route
from app.models.intelligence import Alert
from app.security.dependencies import get_current_user, verify_rate_limit

router = APIRouter(dependencies=[Depends(verify_rate_limit)])


@router.get("", response_model=Dict[str, Any])
def get_tactical_kpi_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Computes real-time Command Dashboard KPIs:
    - Operational readiness index (%)
    - Active critical alerts count
    - Active convoys in transit
    - Mountain pass blockage tally
    - Low-stock forward post count
    """
    total_units = db.query(Unit).count()
    active_critical_alerts = db.query(Alert).filter(Alert.status == "ACTIVE", Alert.severity == "CRITICAL").count()
    active_high_alerts = db.query(Alert).filter(Alert.status == "ACTIVE", Alert.severity == "HIGH").count()
    active_convoys = db.query(Convoy).filter(Convoy.status.in_(["IN_TRANSIT", "SCHEDULED"])).count()
    blocked_passes = db.query(Route).filter(Route.status == "BLOCKED").count()
    total_routes = db.query(Route).count()

    # Calculate supply readiness index
    critical_stocks = (
        db.query(Inventory)
        .filter(Inventory.quantity <= Inventory.minimum_stock * 0.5)
        .count()
    )
    total_inventories = db.query(Inventory).count()

    readiness_index = 100.0
    if total_inventories > 0:
        penalty = (critical_stocks / total_inventories) * 40.0
        penalty += min(20.0, active_critical_alerts * 5.0)
        penalty += min(20.0, blocked_passes * 4.0)
        readiness_index = max(10.0, round(100.0 - penalty, 1))

    recent_audits = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(5).all()
    audit_previews = [
        {
            "action": a.action,
            "user_id": a.user_id,
            "timestamp": a.timestamp.isoformat() if a.timestamp else None,
            "resource": a.resource_target,
        }
        for a in recent_audits
    ]

    return {
        "readiness_index": readiness_index,
        "readiness_status": "COMBAT_READY" if readiness_index >= 85.0 else ("DEGRADED" if readiness_index >= 60.0 else "CRITICAL"),
        "total_active_units": total_units,
        "active_critical_alerts": active_critical_alerts,
        "active_high_alerts": active_high_alerts,
        "active_convoys_in_transit": active_convoys,
        "blocked_mountain_passes": blocked_passes,
        "total_mountain_corridors": total_routes,
        "critical_stock_sectors": critical_stocks,
        "recent_audit_events": audit_previews,
    }
