"""
Authentication Router
Handles officer authentication, cryptographic token issuance, and profile verification.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import jwt

from app.database import get_db
from app.models.auth import User
from app.schemas.auth import LoginRequest, TokenResponse, UserAuthProfile, RefreshTokenRequest, UserRead, UserCreate
from app.security.auth import verify_password, hash_password, create_access_token, create_refresh_token, decode_token
from app.security.dependencies import get_current_user, require_role, verify_rate_limit
from app.security.audit import log_audit_event
from app.config import settings

router = APIRouter(dependencies=[Depends(verify_rate_limit)])


@router.post("/login", response_model=TokenResponse, response_model_exclude_none=True)
def login_for_access_token(
    request: Request,
    credentials: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Officer authentication endpoint.
    Verifies Argon2id password hash and issues asymmetric RS256 / dual-mode HS256 JWT tokens.
    """
    user = db.query(User).filter(User.username == credentials.username).first()
    client_ip = request.client.host if request.client else "unknown"

    if not user or not verify_password(credentials.password, user.hashed_password):
        log_audit_event(
            db=db,
            user_id=credentials.username,
            action="AUTH_LOGIN_FAILED",
            resource_target="/api/v1/auth/login",
            ip_address=client_ip,
            request_payload={"attempted_username": credentials.username}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid callsign or security credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account inactive or access revoked",
        )

    access_token = create_access_token(
        subject=user.username,
        role=user.role,
        unit_id=user.unit_id
    )

    log_audit_event(
        db=db,
        user_id=user.username,
        action="AUTH_LOGIN_SUCCESS",
        resource_target="/api/v1/auth/login",
        ip_address=client_ip,
        metadata={"role": user.role, "unit_id": user.unit_id}
    )

    user_profile = UserAuthProfile(
        id=str(user.id),
        username=user.username,
        role=user.role,
        unit_id=user.unit_id
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_profile
    )


@router.get("/me", response_model=UserRead)
def read_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """Returns cryptographic claims and identity profile of authenticated personnel."""
    return current_user


@router.post("/refresh", response_model=TokenResponse)
def refresh_tactical_token(
    refresh_data: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """Refreshes expired access tokens using valid refresh tokens."""
    try:
        payload = decode_token(refresh_data.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        username = payload.get("sub")
    except (jwt.PyJWTError, Exception):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    user = db.query(User).filter(User.username == username, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Personnel profile not active")

    new_access_token = create_access_token(subject=user.username, role=user.role, unit_id=user.unit_id)
    new_refresh_token = create_refresh_token(subject=user.username)

    user_profile = UserAuthProfile(
        id=str(user.id),
        username=user.username,
        role=user.role,
        unit_id=user.unit_id
    )

    return TokenResponse(
        access_token=new_access_token,
        token_type="bearer",
        user=user_profile,
        refresh_token=new_refresh_token
    )


@router.post("/register", response_model=UserRead)
def register_officer(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    commander: User = Depends(require_role(["CORPS_COMMANDER", "COMMANDER"]))
):
    """
    Commander-restricted officer enrollment endpoint.
    Only authorized commanders can enroll or delegate roles to personnel.
    """
    existing = db.query(User).filter(User.username == user_in.username).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already enrolled")

    new_user = User(
        username=user_in.username,
        hashed_password=hash_password(user_in.password),
        role=user_in.role.upper(),
        unit_id=user_in.unit_id,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user
