"""
RakshaLogix Defence Backend - Configuration & Operational Invariants
Ministry of Defence - Problem Statement ID: 26251
"""

import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator


class Settings(BaseSettings):
    # Base Application Metadata
    PROJECT_NAME: str = "RakshaLogix Defence Logistics & Sustainment Intelligence"
    API_V1_STR: str = "/api/v1"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = Field(default="production", description="Environment: production, staging, development, testing")
    DEBUG: bool = False

    # Operational Security & Cryptography
    SECRET_KEY: str = Field(
        default="DEFENCE_DEF_KEY_SECRET_SECURE_9876543210_HMAC_SHA256_RAKSHALOGIX_OPSEC",
        description="Master cryptographic secret for symmetric JWT fallback and HMAC verification"
    )
    ALGORITHM: str = "HS256"  # Dual-mode support: "RS256" or "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Optional Asymmetric RS256 PEM keys for zero-trust token signing
    RSA_PRIVATE_KEY_PATH: Optional[str] = None
    RSA_PUBLIC_KEY_PATH: Optional[str] = None
    RSA_PRIVATE_KEY: Optional[str] = None
    RSA_PUBLIC_KEY: Optional[str] = None

    # CORS & Network Boundaries
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

    # Database Infrastructure (PostgreSQL 16 + PostGIS)
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "raksha_admin"
    POSTGRES_PASSWORD: str = "DefSec_2026_Postgis!"
    POSTGRES_DB: str = "rakshalogix_db"
    DATABASE_URL: Optional[str] = None
    ASYNC_DATABASE_URL: Optional[str] = None

    # Defence Rate Limiting & Anti-DDoS
    RATE_LIMIT_PER_MINUTE: int = 120
    TACTICAL_BURST_CAPACITY: int = 30

    # ML Artifacts Path
    ARTIFACTS_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "artifacts")

    # Defence Operational Invariants & Thresholds
    HYBRID_STOCKOUT_RISK_THRESHOLD: float = 0.20
    HYBRID_DAYS_OF_SUPPLY_THRESHOLD: float = 2.0  # 48 hours maximum runway for CRITICAL alert

    # Role definitions
    ROLE_CORPS_COMMANDER: str = "CORPS_COMMANDER"
    ROLE_LOGISTICS_OFFICER: str = "LOGISTICS_OFFICER"
    ROLE_EDGE_READ_ONLY: str = "EDGE_READ_ONLY"

    # Canonical Item Types
    ITEM_TYPES: List[str] = [
        "Fuel",
        "Rations",
        "Medical Supplies",
        "Ammunition"
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    def get_database_url(self) -> str:
        """Returns standard synchronous SQLAlchemy connection string with offline fallback."""
        if self.DATABASE_URL:
            return self.DATABASE_URL
        if os.getenv("DATABASE_URL"):
            return os.getenv("DATABASE_URL")
        if self.ENVIRONMENT in ("testing", "test"):
            return "sqlite:///:memory:"
        try:
            import psycopg2
            return f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        except ImportError:
            return "sqlite:///./rakshalogix_local.db"

    def get_async_database_url(self) -> str:
        """Returns async SQLAlchemy connection string."""
        if self.ASYNC_DATABASE_URL:
            return self.ASYNC_DATABASE_URL
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"


settings = Settings()
