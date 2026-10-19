"""
Tactical Sector Weather Telemetry Router
Provides live/reanalysis Himalayan weather telemetry for units and high-altitude mountain passes.
"""

from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.auth import User
from app.services.route_service import route_service, TACTICAL_UNITS
from app.security.dependencies import get_current_user, verify_rate_limit

router = APIRouter(dependencies=[Depends(verify_rate_limit)])


@router.get("/{location}")
def get_sector_weather(
    location: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Returns live/reanalysis Himalayan weather metrics:
    temperature_c, snowfall_mm, visibility_km, wind_speed_kmh, pass_closure_risk.
    """
    return route_service.get_weather_telemetry(location=location, db=db)


@router.get("")
def list_sector_weather(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """Returns weather telemetry for all active tactical units in the sector."""
    results = []
    for u_id in TACTICAL_UNITS.keys():
        results.append(route_service.get_weather_telemetry(location=u_id, db=db))
    return results
