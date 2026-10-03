"""
Route Planning & GeoJSON Schemas with Strict Coordinate Boundary Guards
Mitigates geometric tampering with WGS84 boundary enforcement (-180 to 180, -90 to 90).
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator, ConfigDict


class Coordinate(BaseModel):
    longitude: float = Field(..., ge=-180.0, le=180.0, description="WGS84 Longitude")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="WGS84 Latitude")

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, v: float) -> float:
        if not (-180.0 <= v <= 180.0):
            raise ValueError("Longitude must strictly be between -180.0 and 180.0 degrees WGS84")
        return v

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, v: float) -> float:
        if not (-90.0 <= v <= 90.0):
            raise ValueError("Latitude must strictly be between -90.0 and 90.0 degrees WGS84")
        return v


class GeoJSONLineString(BaseModel):
    type: str = "LineString"
    coordinates: List[List[float]]

    @field_validator("coordinates")
    @classmethod
    def validate_coordinates(cls, coords: List[List[float]]) -> List[List[float]]:
        for pt in coords:
            if len(pt) < 2:
                raise ValueError("Coordinate point must have at least [longitude, latitude]")
            lon, lat = pt[0], pt[1]
            if not (-180.0 <= lon <= 180.0 and -90.0 <= lat <= 90.0):
                raise ValueError(f"Coordinate [{lon}, {lat}] violates WGS84 geometric boundary")
        return coords


class GeoJSONFeature(BaseModel):
    type: str = "Feature"
    geometry: Dict[str, Any]
    properties: Dict[str, Any]


class RouteOptimiseRequest(BaseModel):
    origin_id: str = Field(..., description="Origin unit ID (e.g. DEPOT_LEH)")
    dest_id: str = Field(..., description="Destination unit ID (e.g. FOB_DAULAT)")
    vehicle_type: Optional[str] = "ALS_HEAVY_TRUCK"
    avoid_blocked_passes: bool = True
    snowfall_threshold_mm: float = 20.0


class RouteSegment(BaseModel):
    route_id: str
    name: str
    origin_id: str
    dest_id: str
    distance_km: float
    terrain_score: float
    snowfall_mm: float
    pass_block_penalty: float
    edge_cost: float
    status: str


class RouteOptimiseResponse(BaseModel):
    origin_id: str
    dest_id: str
    primary_corridor: GeoJSONFeature
    fallback_corridor: Optional[GeoJSONFeature] = None
    primary_distance_km: float
    primary_estimated_hours: float
    primary_edge_cost: float
    fallback_distance_km: Optional[float] = None
    fallback_estimated_hours: Optional[float] = None
    fallback_edge_cost: Optional[float] = None
    hazards_detected: List[str] = []


class RouteRead(BaseModel):
    id: str
    name: str
    origin_id: str
    dest_id: str
    distance_km: float
    terrain_score: float
    status: str
    pass_altitude_m: float
    is_snow_blocked: bool

    model_config = ConfigDict(from_attributes=True)
