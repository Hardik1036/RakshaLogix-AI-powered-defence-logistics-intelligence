"""
Immutable Audit Ledger Service
Ministry of Defence Mandate: Every state change, route recalculation, simulation run,
and officer override MUST be committed to an append-only audit_logs table.
"""

import hashlib
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.auth import AuditLog


def compute_request_hash(data: Any) -> str:
    """Computes a deterministic SHA-256 hash of the request payload for cryptographic auditability."""
    if data is None:
        return hashlib.sha256(b"EMPTY_PAYLOAD").hexdigest()
    try:
        if isinstance(data, (dict, list)):
            canonical_json = json.dumps(data, sort_keys=True, default=str)
            return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()
        return hashlib.sha256(str(data).encode("utf-8")).hexdigest()
    except Exception:
        return hashlib.sha256(b"SERIALIZATION_ERROR").hexdigest()


def log_audit_event(
    db: Session,
    user_id: Optional[str],
    action: str,
    resource_target: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    request_payload: Optional[Any] = None,
) -> AuditLog:
    """
    Commits an immutable entry to the audit_logs table.
    Any tampering with audit logs violates defense invariants.
    """
    req_hash = compute_request_hash(request_payload if request_payload is not None else metadata)

    entry = AuditLog(
        user_id=user_id or "ANONYMOUS_OR_SYSTEM",
        action=action,
        resource_target=resource_target,
        metadata_json=metadata or {},
        ip_address=ip_address,
        request_hash=req_hash,
        timestamp=datetime.now(timezone.utc)
    )

    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
