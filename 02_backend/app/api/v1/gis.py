"""
Tactical GIS & Map State Router
Provides complete geospatial layers for GisMap.tsx and Dashboard mini-map.
"""

from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.auth import User
from app.schemas.routes import TacticalMapLayersResponse
from app.services.route_service import route_service
from app.security.dependencies import get_current_user, verify_rate_limit

router = APIRouter(dependencies=[Depends(verify_rate_limit)])


@router.get("/layers", response_model=TacticalMapLayersResponse)
def get_gis_layers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns all geospatial layers needed by GisMap.tsx and Dashboard mini-map:
    - 8 FOBs / Units with exact WGS84 coordinates
    - Road Corridors with curved multi-point polylines
    - Active Blizzard / Avalanche Hazard Zones (50km proximity analyzed)
    - Active Convoys in transit
    """
    return route_service.get_tactical_map_state(db=db)


@router.get("/units")
def get_gis_units(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns 8 tactical units with exact WGS84 coordinates and sustainment postures."""
    state = route_service.get_tactical_map_state(db=db)
    return state["units"]


@router.get("/hazards")
def get_gis_hazards(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns active circular blizzard/avalanche hazard overlay zones."""
    return route_service.get_weather_hazards()
