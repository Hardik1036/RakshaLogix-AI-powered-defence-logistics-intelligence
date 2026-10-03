"""
Defence Logistics Domain Models
Units, Inventory, Consumption Ledgers, Vehicles, Routes, and Officer-Authorized Convoys
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Float, Integer, Date, DateTime,
    ForeignKey, CheckConstraint, Boolean, Text, Index
)
from sqlalchemy.orm import relationship
from app.models.base import Base, SpatialPoint, SpatialLineString


class Unit(Base):
    """Military formation, tactical depot, forward operating base (FOB), or border post."""
    __tablename__ = "units"

    id = Column(String(32), primary_key=True)  # e.g., 'UNIT_01', 'HQ_NORTH', 'FOB_SIACHEN'
    name = Column(String(128), nullable=False)
    type = Column(String(32), nullable=False)   # 'HQ', 'DEPOT', 'FOB', 'POST'
    altitude_m = Column(Float, default=1500.0, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    geom = Column(SpatialPoint, nullable=True)

    # Relationships
    inventories = relationship("Inventory", back_populates="unit", cascade="all, delete-orphan")
    consumptions = relationship("Consumption", back_populates="unit", cascade="all, delete-orphan")
    vehicles = relationship("Vehicle", back_populates="unit", cascade="all, delete-orphan")


class Inventory(Base):
    """
    Current stock levels at tactical units.
    Strict non-negative constraint prevents physical anomalies.
    """
    __tablename__ = "inventory"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    unit_id = Column(String(32), ForeignKey("units.id", ondelete="CASCADE"), nullable=False, index=True)
    item_type = Column(String(64), nullable=False, index=True)  # Fuel, Rations, Medical Supplies, Ammunition
    quantity = Column(Float, nullable=False, default=0.0)
    minimum_stock = Column(Float, nullable=False, default=500.0)
    maximum_stock = Column(Float, nullable=False, default=5000.0)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    unit = relationship("Unit", back_populates="inventories")

    __table_args__ = (
        CheckConstraint("quantity >= 0", name="chk_inventory_quantity_non_negative"),
        Index("ix_inventory_unit_item", "unit_id", "item_type", unique=True),
    )


class Consumption(Base):
    """Historical daily burn rates and operational tempo ledgers."""
    __tablename__ = "consumption"

    id = Column(Integer, primary_key=True, autoincrement=True)
    unit_id = Column(String(32), ForeignKey("units.id", ondelete="CASCADE"), nullable=False, index=True)
    item_type = Column(String(64), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    quantity_used = Column(Float, nullable=False)
    operational_tempo = Column(Integer, default=3, nullable=False)  # 1 (Low) to 5 (High Combat)

    unit = relationship("Unit", back_populates="consumptions")

    __table_args__ = (
        CheckConstraint("operational_tempo >= 1 AND operational_tempo <= 5", name="chk_consumption_tempo_range"),
        CheckConstraint("quantity_used >= 0", name="chk_consumption_qty_non_negative"),
        Index("ix_consumption_unit_date", "unit_id", "item_type", "date"),
    )


class Vehicle(Base):
    """Tactical transport assets assigned to formations."""
    __tablename__ = "vehicles"

    id = Column(String(32), primary_key=True)  # e.g., 'VEH_ALS_001'
    unit_id = Column(String(32), ForeignKey("units.id", ondelete="SET NULL"), nullable=True, index=True)
    vehicle_type = Column(String(64), nullable=False)  # 'ALS_HEAVY_TRUCK', 'LIGHT_4X4', 'ALL_TERRAIN'
    capacity_tons = Column(Float, nullable=False, default=5.0)
    status = Column(String(32), nullable=False, default="AVAILABLE")  # AVAILABLE, MAINTENANCE, DEPLOYED

    unit = relationship("Unit", back_populates="vehicles")


class Route(Base):
    """High-altitude passes, arterial supply roads, and valley corridors."""
    __tablename__ = "routes"

    id = Column(String(32), primary_key=True)  # e.g., 'RT_LEH_DISKIT'
    name = Column(String(128), nullable=False)
    origin_id = Column(String(32), ForeignKey("units.id", ondelete="CASCADE"), nullable=False, index=True)
    dest_id = Column(String(32), ForeignKey("units.id", ondelete="CASCADE"), nullable=False, index=True)
    distance_km = Column(Float, nullable=False)
    terrain_score = Column(Float, nullable=False, default=5.0)  # 1.0 (Paved Highway) to 10.0 (Treacherous Glacial Pass)
    path_geom = Column(SpatialLineString, nullable=True)
    status = Column(String(32), nullable=False, default="OPEN")  # OPEN, RESTRICTED, BLOCKED
    pass_altitude_m = Column(Float, default=3000.0)
    is_snow_blocked = Column(Boolean, default=False)

    __table_args__ = (
        CheckConstraint("terrain_score >= 1.0 AND terrain_score <= 10.0", name="chk_route_terrain_score"),
        CheckConstraint("distance_km > 0", name="chk_route_distance_positive"),
    )


class Convoy(Base):
    """
    Officer-authorized logistics movement.
    Zero Autonomous Troops Orders invariant:
    MUST be signed off by authorized commander with ACCEPT or MODIFY action.
    """
    __tablename__ = "convoys"

    id = Column(String(32), primary_key=True)  # e.g., 'CNV_2026_001'
    route_id = Column(String(32), ForeignKey("routes.id", ondelete="RESTRICT"), nullable=False, index=True)
    origin_id = Column(String(32), ForeignKey("units.id", ondelete="RESTRICT"), nullable=False)
    dest_id = Column(String(32), ForeignKey("units.id", ondelete="RESTRICT"), nullable=False)
    vehicle_count = Column(Integer, nullable=False, default=4)
    cargo_type = Column(String(64), nullable=False)
    cargo_quantity = Column(Float, nullable=False, default=20.0)
    status = Column(String(32), nullable=False, default="SCHEDULED")  # SCHEDULED, IN_TRANSIT, ARRIVED, REROUTED
    current_location = Column(SpatialPoint, nullable=True)
    departure_time = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    eta = Column(DateTime(timezone=True), nullable=False)

    # Cryptographic officer sign-off fields
    sign_off_officer_id = Column(String(64), nullable=False)
    sign_off_action = Column(String(32), nullable=False, default="ACCEPT")  # ACCEPT, MODIFY
    sign_off_timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    sign_off_notes = Column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint("vehicle_count > 0", name="chk_convoy_vehicles_positive"),
        CheckConstraint("cargo_quantity >= 0", name="chk_convoy_cargo_positive"),
    )
