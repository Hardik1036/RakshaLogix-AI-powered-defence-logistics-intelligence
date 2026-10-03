"""
Sustainment Forecasting Router
Executes 17-feature ML inference or deterministic 7-day WMA fallback.
Serves explainable decision cards with P10/P50/P90 confidence bounds and triggers hybrid critical alerts.
"""

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.auth import User
from app.schemas.forecast import ForecastRequest, ForecastResponse
from app.services.ml_service import ml_service
from app.security.dependencies import get_current_user, verify_rate_limit
from app.security.audit import log_audit_event

router = APIRouter(dependencies=[Depends(verify_rate_limit)])


@router.post("", response_model=ForecastResponse)
def trigger_forecast_inference(
    payload: ForecastRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Triggers tactical ML demand inference for a unit and supply item.
    Enforces the hybrid critical alert filter:
    stockout_risk >= 0.20 AND (current_stock / predicted_demand_p90) <= 2.0 days (48h)
    """
    response = ml_service.forecast_demand(
        db=db,
        unit_id=payload.unit_id,
        item_type=payload.item_type,
        horizon=payload.horizon,
    )

    client_ip = request.client.host if request.client else "unknown"
    log_audit_event(
        db=db,
        user_id=current_user.username,
        action="FORECAST_EVALUATED",
        resource_target=f"forecast/{payload.unit_id}/{payload.item_type}",
        ip_address=client_ip,
        metadata={
            "predicted_demand": response.predicted_demand,
            "stockout_risk": response.stockout_risk,
            "critical_alert": response.critical_alert_triggered,
        },
        request_payload=payload.model_dump(),
    )

    return response


@router.get("", response_model=ForecastResponse)
def get_forecast_query(
    unit_id: str = Query(..., description="Target military unit"),
    item_type: str = Query(default="Fuel", description="Supply item type"),
    horizon: str = Query(default="48h", description="Forecast horizon (24h, 48h, 7d)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Convenience GET endpoint for query-based sustainment forecasts."""
    req = ForecastRequest(unit_id=unit_id, item_type=item_type, horizon=horizon)
    return ml_service.forecast_demand(
        db=db,
        unit_id=req.unit_id,
        item_type=req.item_type,
        horizon=req.horizon,
    )
