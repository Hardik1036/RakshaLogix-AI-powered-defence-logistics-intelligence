"""
Alerts Schemas
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class AlertRead(BaseModel):
    id: str
    type: str
    severity: str
    unit_id: str
    message: str
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    acknowledged: bool = False
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    stockout_risk: Optional[float] = None
    stockout_risk_pct: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class AlertAcknowledgeRequest(BaseModel):
    notes: Optional[str] = None

