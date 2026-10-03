"""
Inventory and Tactical Unit Pydantic Schemas
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class UnitRead(BaseModel):
    id: str
    name: str
    type: str
    altitude_m: float
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)

    model_config = ConfigDict(from_attributes=True)


class InventoryRead(BaseModel):
    id: str
    unit_id: str
    unit_name: Optional[str] = None
    item_type: str
    quantity: float
    minimum_stock: float
    maximum_stock: float
    updated_at: Optional[datetime] = None
    days_of_supply: Optional[float] = None
    stock_status: Optional[str] = None  # NORMAL, LOW, CRITICAL, SURPLUS

    model_config = ConfigDict(from_attributes=True)


class InventoryCreate(BaseModel):
    unit_id: str
    item_type: str
    quantity: float = Field(..., ge=0.0, description="Quantity cannot be negative")
    minimum_stock: float = Field(default=500.0, ge=0.0)
    maximum_stock: float = Field(default=5000.0, ge=0.0)


class InventoryUpdate(BaseModel):
    quantity: float = Field(..., ge=0.0, description="Non-negative physical quantity")
    minimum_stock: Optional[float] = Field(None, ge=0.0)
    maximum_stock: Optional[float] = Field(None, ge=0.0)


class TacticalStockSummary(BaseModel):
    unit_id: str
    unit_name: str
    unit_type: str
    altitude_m: float
    inventories: List[InventoryRead]
