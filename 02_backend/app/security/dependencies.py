"""
Defence Security Dependencies - Current User, Granular RBAC, and Edge Anti-DDoS
"""

import time
from typing import List, Callable, Dict, Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
import jwt
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.auth import User
from app.security.auth import decode_token
from app.config import settings

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=False
)


class TokenBucketRateLimiter:
    """
    In-memory Token Bucket Anti-DDoS rate limiter.
    Ensures tactical edge bandwidth is protected from denial-of-service attacks.
    Zero licensing dependencies.
    """
    def __init__(self, capacity: int = 120, refill_rate_per_sec: float = 2.0):
        self.capacity = capacity
        self.refill_rate = refill_rate_per_sec
        self.buckets: Dict[str, Dict[str, float]] = {}

    def is_allowed(self, client_ip: str) -> bool:
        now = time.time()
        bucket = self.buckets.get(client_ip)

        if bucket is None:
            self.buckets[client_ip] = {"tokens": self.capacity - 1, "last_updated": now}
            return True

        # Refill tokens based on elapsed time
        elapsed = now - bucket["last_updated"]
        bucket["tokens"] = min(self.capacity, bucket["tokens"] + elapsed * self.refill_rate)
        bucket["last_updated"] = now

        if bucket["tokens"] >= 1.0:
            bucket["tokens"] -= 1.0
            return True
        return False


# Singleton rate limiter instance
edge_rate_limiter = TokenBucketRateLimiter(
    capacity=settings.TACTICAL_BURST_CAPACITY,
    refill_rate_per_sec=float(settings.RATE_LIMIT_PER_MINUTE) / 60.0
)


def verify_rate_limit(request: Request) -> None:
    """FastAPI dependency to rate-limit edge requests."""
    client_ip = request.client.host if request.client else "unknown_edge"
    if not edge_rate_limiter.is_allowed(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Tactical Edge Rate Limit Exceeded. Back off request stream to maintain link stability."
        )


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Extracts and cryptographically validates the JWT bearer token.
    Returns the authenticated User ORM record.
    If DEV_DISABLE_AUTH is True, immediately returns a mock commander identity.
    """
    if settings.DEV_DISABLE_AUTH:
        return User(
            id="00000000-0000-0000-0000-000000000001",
            username="dev_commander",
            role="CORPS_COMMANDER",
            is_active=True,
            unit_id="HQ_LEH"
        )

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate defence operational credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        username: str = payload.get("sub")
        token_type: str = payload.get("type")
        if username is None or token_type != "access":
            raise credentials_exception
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tactical token has expired. Officer re-authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise credentials_exception

    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Military identity not found in active personnel roster",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Officer account is suspended or decommissioned",
        )
    return user


def require_role(allowed_roles: List[str]) -> Callable[[User], User]:
    """
    Granular RBAC Dependency Factory.
    Enforces operational role compartmentalization.
    If DEV_DISABLE_AUTH is True, bypasses role checks.
    """
    # Normalize aliases: allow COMMANDER to match CORPS_COMMANDER and vice-versa
    normalized_allowed = set(r.upper() for r in allowed_roles)
    if "COMMANDER" in normalized_allowed:
        normalized_allowed.add("CORPS_COMMANDER")
    if "CORPS_COMMANDER" in normalized_allowed:
        normalized_allowed.add("COMMANDER")

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if settings.DEV_DISABLE_AUTH:
            return current_user

        user_role = current_user.role.upper()
        # Handle alias match
        is_match = (user_role in normalized_allowed) or (
            user_role == "CORPS_COMMANDER" and "COMMANDER" in normalized_allowed
        ) or (
            user_role == "COMMANDER" and "CORPS_COMMANDER" in normalized_allowed
        )

        if not is_match:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Forbidden: Operation requires one of the following roles: {allowed_roles}. Current role: {current_user.role}",
            )
        return current_user

    return role_checker


# Pre-configured role guards
get_current_commander = require_role(["CORPS_COMMANDER", "COMMANDER"])
get_current_logistics_officer = require_role(["CORPS_COMMANDER", "COMMANDER", "LOGISTICS_OFFICER"])
