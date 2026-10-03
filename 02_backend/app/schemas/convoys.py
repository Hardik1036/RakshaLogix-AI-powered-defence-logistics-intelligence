"""
Officer-Authorized Convoy Schemas
Strict Human-in-the-Loop: Zero Autonomous Troop Orders Invariant
"""

from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field, field_validator, ConfigDict
from app.schemas.routes import Coordinate


class ConvoyCreate(BaseModel):
    id: Optional[str] = Field(None, description="Optional callsign, auto-assigned if null")
    route_id: str
    origin_id: str
    dest_id: str
    vehicle_count: int = Field(default=4, gt=0)
    cargo_type: str = Field(default="Fuel")
    cargo_quantity: float = Field(default=20.0, gt=0.0)
    departure_time: Optional[datetime] = None
    eta: Optional[datetime] = None
    sign_off_action: str = Field(..., description="Must be 'ACCEPT' or 'MODIFY'")
    sign_off_notes: Optional[str] = Field(None, description="Officer operational justification")

    @field_validator("sign_off_action")
    @classmethod
    def validate_sign_off_action(cls, v: str) -> str:
        normalized = v.upper().strip()
        if normalized not in ("ACCEPT", "MODIFY"):
            raise ValueError("Convoy dispatch requires explicit sign_off_action of 'ACCEPT' or 'MODIFY'")
        return normalized


class ConvoySignOff(BaseModel):
    sign_off_action: str = Field(..., description="ACCEPT or MODIFY")
    sign_off_notes: Optional[str] = None

    @field_validator("sign_off_action")
    @classmethod
    def validate_action(cls, v: str) -> str:
        normalized = v.upper().strip()
        if normalized not in ("ACCEPT", "MODIFY"):
            raise ValueError("Sign-off action must strictly be 'ACCEPT' or 'MODIFY'")
        return normalized


class ConvoyStatusUpdate(BaseModel):
    status: str = Field(..., description="SCHEDULED, IN_TRANSIT, ARRIVED, REROUTED")
    current_longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    current_latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        allowed = {"SCHEDULED", "IN_TRANSIT", "ARRIVED", "REROUTED"}
        normalized = v.upper().strip()
        if normalized not in allowed:
            raise ValueError(f"Status must be one of {allowed}")
        return normalized


class ConvoyRead(BaseModel):
    id: str
    route_id: str
    origin_id: str
    dest_id: str
    vehicle_count: int
    cargo_type: str
    cargo_quantity: float
    status: str
    departure_time: datetime
    eta: datetime
    sign_off_officer_id: str
    sign_off_action: str
    sign_off_timestamp: datetime
    sign_off_notes: Optional[str] = None
    current_location: Optional[Any] = None

    model_config = ConfigDict(from_attributes=True)
