"""
Authentication & Authorization Pydantic Schemas
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=64, description="Officer callsign or system identifier")
    password: str = Field(..., min_length=6, description="Cryptographic password")


class UserAuthProfile(BaseModel):
    id: str
    username: str
    role: str
    unit_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserAuthProfile
    refresh_token: Optional[str] = None


LoginResponse = TokenResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    password: str = Field(..., min_length=8)
    role: str = Field(default="EDGE_READ_ONLY")
    unit_id: Optional[str] = None


class UserRead(BaseModel):
    id: str
    username: str
    role: str
    unit_id: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
