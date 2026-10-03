"""
Tactical Forecasting & Explainable Decision Card Schemas
Zero Autonomous Orders Invariant: All predictions serve explainable decision cards.
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


class ExplainableDecisionCard(BaseModel):
    action_type: str = Field(..., description="RECOMMENDED_DISPATCH, MONITOR, STABLE, SURPLUS_TRANSFER")
    confidence_level: str = Field(..., description="HIGH, MEDIUM, LOW")
    confidence_percentage: float = Field(..., ge=0.0, le=100.0)
    primary_risk_driver: str
    top_feature_contributions: Dict[str, float]
    command_recommendation: str
    requires_officer_sign_off: bool = True


class ForecastRequest(BaseModel):
    unit_id: str
    item_type: str = Field(default="Fuel")
    horizon: str = Field(default="48h", description="Forecast horizon: 24h, 48h, 7d")


class ForecastResponse(BaseModel):
    unit_id: str
    item_type: str
    horizon: str
    forecast_horizon: Optional[str] = None
    current_stock: float
    predicted_demand: float
    lower_bound: float
    upper_bound: float
    stockout_risk: float
    days_of_supply: float
    critical_alert_triggered: bool = False
    is_critical: Optional[bool] = False
    anomaly_flag: Optional[bool] = False
    top_factors: Optional[List[str]] = Field(default_factory=list)
    model_version: str = "xgb_quantile_v2.1"
    decision_card: ExplainableDecisionCard

    model_config = ConfigDict(from_attributes=True)
