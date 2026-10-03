"""
Authentication and Immutable Audit Log Models
Ministry of Defence OPSEC and Compliance Requirements
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, BigInteger, Integer, JSON, Index
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base


class User(Base):
    """
    Defence personnel identity with granular role claims.
    Roles:
      - CORPS_COMMANDER: Full tactical oversight, route authorization, convoy dispatch sign-off.
      - LOGISTICS_OFFICER: Inventory tracking, route calculations, alert ack, convoy creation.
      - EDGE_READ_ONLY: Tactical edge display, strictly read-only telemetries.
    """
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(64), unique=True, index=True, nullable=False)
    hashed_password = Column(String(256), nullable=False)
    role = Column(String(32), nullable=False, default="EDGE_READ_ONLY", index=True)
    unit_id = Column(String(32), nullable=True, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_users_username_role", "username", "role"),
    )


class AuditLog(Base):
    """
    Append-only immutable audit ledger.
    Every state change, simulation run, route override, or officer sign-off
    MUST be cryptographically recorded with request hash.
    """
    __tablename__ = "audit_logs"

    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    user_id = Column(String(64), nullable=True, index=True)
    action = Column(String(128), nullable=False, index=True)
    resource_target = Column(String(128), nullable=True)
    metadata_json = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    request_hash = Column(String(64), nullable=True, index=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    __table_args__ = (
        Index("ix_audit_action_timestamp", "action", "timestamp"),
    )
