"""
Database Engine & Session Management
Supports production PostgreSQL 16 + PostGIS and fallback SQLite for isolated testing.
"""

from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.config import settings

# Construct engine configuration
database_url = settings.get_database_url()

connect_args = {}
if database_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False
    engine = create_engine(
        database_url,
        connect_args=connect_args,
        echo=settings.DEBUG,
    )
else:
    engine = create_engine(
        database_url,
        pool_pre_ping=True,
        pool_size=15,
        max_overflow=25,
        echo=settings.DEBUG,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency yielding a clean database session per request.
    Rolls back automatically on unhandled exceptions to maintain transactional integrity.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_db() -> None:
    """Initializes schema tables if not present."""
    from app.models.base import Base
    import app.models  # ensure all models are registered
    Base.metadata.create_all(bind=engine)
