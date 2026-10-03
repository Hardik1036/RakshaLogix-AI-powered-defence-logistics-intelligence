"""
Intelligence, Forecast, Alerts, Weather, and War-Game Audit Models
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Float, Integer, Date, DateTime,
    ForeignKey, Text, JSON, Index, CheckConstraint
)
from app.models.base import Base


class Forecast(Base):
    """
    Tactical demand predictions with probabilistic confidence bounds.
    Serves explainable decision cards to commanders.
    """
    __tablename__ = "forecasts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    unit_id = Column(String(32), ForeignKey("units.id", ondelete="CASCADE"), nullable=False, index=True)
    item_type = Column(String(64), nullable=False, index=True)
    forecast_time = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    horizon = Column(String(16), nullable=False, default="48h")  # '24h', '48h', '7d'
    predicted_quantity = Column(Float, nullable=False)
    lower_bound = Column(Float, nullable=False)  # P10 quantile
    upper_bound = Column(Float, nullable=False)  # P90 quantile
    stockout_risk = Column(Float, nullable=False, default=0.0)  # [0.0, 1.0]
    model_version = Column(String(64), nullable=False, default="v1.0-wma-hybrid")

    __table_args__ = (
        CheckConstraint("stockout_risk >= 0.0 AND stockout_risk <= 1.0", name="chk_forecast_stockout_risk"),
        Index("ix_forecast_unit_item_time", "unit_id", "item_type", "forecast_time"),
    )


class Alert(Base):
    """
    Defence operational alerts.
    CRITICAL alerts gated by hybrid stockout risk (>= 0.20) and days of supply (<= 2.0 days).
    """
    __tablename__ = "alerts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    type = Column(String(64), nullable=False, default="STOCKOUT_RISK")  # STOCKOUT_RISK, PASS_BLOCKED, SUPPLY_DEFICIT
    severity = Column(String(16), nullable=False, index=True)  # CRITICAL, HIGH, MEDIUM
    unit_id = Column(String(32), ForeignKey("units.id", ondelete="CASCADE"), nullable=False, index=True)
    message = Column(Text, nullable=False)
    status = Column(String(32), nullable=False, default="ACTIVE", index=True)  # ACTIVE, ACKNOWLEDGED
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    acknowledged_by = Column(String(64), nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_alerts_status_severity", "status", "severity"),
    )


class Weather(Base):
    """High-altitude meteorological conditions affecting pass traversability and fuel consumption."""
    __tablename__ = "weather"

    id = Column(Integer, primary_key=True, autoincrement=True)
    unit_id = Column(String(32), ForeignKey("units.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    temperature_c = Column(Float, nullable=False, default=-10.0)
    snowfall_mm = Column(Float, nullable=False, default=0.0)
    rainfall_mm = Column(Float, nullable=False, default=0.0)
    visibility_km = Column(Float, nullable=False, default=10.0)
    wind_speed_kmh = Column(Float, nullable=False, default=25.0)

    __table_args__ = (
        Index("ix_weather_unit_date", "unit_id", "date", unique=True),
    )


class SimulationRun(Base):
    """
    Audit log of executed in-memory war-game scenarios.
    Ensures that simulation runs are tracked without modifying base production ledgers.
    """
    __tablename__ = "simulation_runs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(64), nullable=False, index=True)
    scenario_name = Column(String(128), nullable=False)
    parameters = Column(JSON, nullable=False)
    results_summary = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
