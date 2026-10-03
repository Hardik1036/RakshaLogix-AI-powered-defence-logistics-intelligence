"""
Defence Security Subsystem - Cryptographic Identity & Token Management
Implements Argon2id password hashing and dual-mode RS256/HS256 JWT tokens.
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError
from app.config import settings

# Initialize Defense-Grade Argon2id Password Hasher
# Time cost = 2, Memory = 64MB, Parallelism = 1 (complies with RFC 9106 & OWASP recommendations)
_hasher = PasswordHasher(
    time_cost=2,
    memory_cost=65536,
    parallelism=1,
    hash_len=32
)

# In-memory RSA key generation cache if RS256 is selected without explicit keys
_generated_rsa_private_key: Optional[str] = None
_generated_rsa_public_key: Optional[str] = None


def _get_or_generate_rsa_keys():
    """Generates an in-memory 2048-bit RSA key pair if RS256 is chosen without explicit keys."""
    global _generated_rsa_private_key, _generated_rsa_public_key
    if _generated_rsa_private_key and _generated_rsa_public_key:
        return _generated_rsa_private_key, _generated_rsa_public_key

    try:
        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.hazmat.primitives import serialization
        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        priv_pem = key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ).decode("utf-8")
        pub_pem = key.public_key().public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode("utf-8")
        _generated_rsa_private_key = priv_pem
        _generated_rsa_public_key = pub_pem
        return _generated_rsa_private_key, _generated_rsa_public_key
    except Exception:
        return None, None


def hash_password(password: str) -> str:
    """Hash password using Argon2id."""
    return _hasher.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against Argon2id hash with constant-time protection."""
    try:
        return _hasher.verify(hashed_password, plain_password)
    except (VerifyMismatchError, VerificationError):
        return False
    except Exception:
        return False


def _get_signing_key_and_alg() -> tuple[str, str]:
    """Resolves whether to use asymmetric RS256 or defense HMAC-SHA256."""
    if settings.ALGORITHM == "RS256":
        if settings.RSA_PRIVATE_KEY:
            return settings.RSA_PRIVATE_KEY, "RS256"
        if settings.RSA_PRIVATE_KEY_PATH:
            with open(settings.RSA_PRIVATE_KEY_PATH, "r") as f:
                return f.read(), "RS256"
        priv, _ = _get_or_generate_rsa_keys()
        if priv:
            return priv, "RS256"
    return settings.SECRET_KEY, "HS256"


def _get_verification_key_and_algs() -> tuple[str, list[str]]:
    """Resolves public key or symmetric secret for token verification."""
    if settings.ALGORITHM == "RS256":
        if settings.RSA_PUBLIC_KEY:
            return settings.RSA_PUBLIC_KEY, ["RS256"]
        if settings.RSA_PUBLIC_KEY_PATH:
            with open(settings.RSA_PUBLIC_KEY_PATH, "r") as f:
                return f.read(), ["RS256"]
        _, pub = _get_or_generate_rsa_keys()
        if pub:
            return pub, ["RS256"]
    return settings.SECRET_KEY, ["HS256", "RS256"]


def create_access_token(
    subject: str,
    role: str,
    unit_id: Optional[str] = None,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Creates a signed JWT access token with role claims."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "sub": subject,
        "role": role,
        "unit_id": unit_id,
        "type": "access",
        "iat": now.timestamp(),
        "exp": expire.timestamp(),
        "iss": "rakshalogix-defence-pki"
    }

    key, alg = _get_signing_key_and_alg()
    return jwt.encode(payload, key, algorithm=alg)


def create_refresh_token(
    subject: str,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Creates a cryptographically signed refresh token."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    payload = {
        "sub": subject,
        "type": "refresh",
        "iat": now.timestamp(),
        "exp": expire.timestamp(),
        "iss": "rakshalogix-defence-pki"
    }

    key, alg = _get_signing_key_and_alg()
    return jwt.encode(payload, key, algorithm=alg)


def decode_token(token: str) -> Dict[str, Any]:
    """
    Decodes and cryptographically validates a JWT token.
    Raises jwt.PyJWTError on invalid signature, expiration, or format.
    """
    key, algs = _get_verification_key_and_algs()
    return jwt.decode(
        token,
        key,
        algorithms=algs,
        options={"require": ["exp", "sub", "type"]}
    )
