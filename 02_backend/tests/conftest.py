"""
Pytest Fixtures & In-Memory Test Harness for RakshaLogix Backend
Provides SQLite in-memory test database, test client, and role-based test tokens.
"""

import os
import sys
import pytest

# Ensure 02_backend is on sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Force testing configuration
os.environ["ENVIRONMENT"] = "testing"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "TEST_SECRET_DEFENCE_2026_VERY_SECURE_HMAC_KEY_123456789"
os.environ["ALGORITHM"] = "HS256"

from app.config import settings
from app.models.base import Base
from app.database import get_db
from app.main import app, seed_tactical_data
from app.models.auth import User
from app.models.logistics import Unit, Inventory, Route, Vehicle, Consumption
from app.models.intelligence import Weather, Alert
from app.security.auth import create_access_token, hash_password

# Use StaticPool in-memory SQLite for instantaneous, isolated tests
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Initializes tables for test session."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db_session():
    """Provides a transactional database session per test function with auto-rollback."""
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    # Seed baseline defense data inside transaction
    Base.metadata.create_all(bind=connection)
    _seed_test_data(session)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


# Pre-cache hashed passwords to avoid expensive Argon2 re-computation per test fixture
_CACHED_HASHES = {
    "test_commander": hash_password("CommanderPass123!"),
    "test_logistics": hash_password("LogisticsPass123!"),
    "test_edge": hash_password("EdgePass123!"),
    "commander_alpha": hash_password("Commander@DefSec2026!"),
    "logistics_bravo": hash_password("Logistics@DefSec2026!"),
    "edge_charlie": hash_password("EdgeReadOnly@DefSec2026!"),
}


def _seed_test_data(session):
    """Seeds consistent baseline dataset for tests."""
    if session.query(User).count() == 0:
        commander = User(
            username="test_commander",
            hashed_password=_CACHED_HASHES["test_commander"],
            role="CORPS_COMMANDER",
            unit_id="HQ_LEH",
            is_active=True,
        )
        officer = User(
            username="test_logistics",
            hashed_password=_CACHED_HASHES["test_logistics"],
            role="LOGISTICS_OFFICER",
            unit_id="DEPOT_KARU",
            is_active=True,
        )
        edge_user = User(
            username="test_edge",
            hashed_password=_CACHED_HASHES["test_edge"],
            role="EDGE_READ_ONLY",
            unit_id="POST_DBO",
            is_active=True,
        )
        # Pre-seeded demo credentials for frontend handshake tests
        demo_commander = User(
            username="commander_alpha",
            hashed_password=_CACHED_HASHES["commander_alpha"],
            role="CORPS_COMMANDER",
            unit_id="HQ_LEH",
            is_active=True,
        )
        demo_logistics = User(
            username="logistics_bravo",
            hashed_password=_CACHED_HASHES["logistics_bravo"],
            role="LOGISTICS_OFFICER",
            unit_id="DEPOT_KARU",
            is_active=True,
        )
        demo_edge = User(
            username="edge_charlie",
            hashed_password=_CACHED_HASHES["edge_charlie"],
            role="EDGE_READ_ONLY",
            unit_id="POST_DBO",
            is_active=True,
        )
        session.add_all([commander, officer, edge_user, demo_commander, demo_logistics, demo_edge])

        # Units
        leh = Unit(id="HQ_LEH", name="Leh Corps HQ", type="HQ", altitude_m=3500.0, latitude=34.15, longitude=77.57)
        karu = Unit(id="DEPOT_KARU", name="Karu Depot", type="DEPOT", altitude_m=3400.0, latitude=33.91, longitude=77.74)
        dbo = Unit(id="POST_DBO", name="DBO Forward Post", type="POST", altitude_m=5065.0, latitude=35.31, longitude=77.93)
        session.add_all([leh, karu, dbo])

        # Inventories
        session.add(Inventory(unit_id="POST_DBO", item_type="Fuel", quantity=250.0, minimum_stock=500.0, maximum_stock=3000.0))
        session.add(Inventory(unit_id="POST_DBO", item_type="Rations", quantity=1500.0, minimum_stock=500.0, maximum_stock=3000.0))
        session.add(Inventory(unit_id="DEPOT_KARU", item_type="Fuel", quantity=20000.0, minimum_stock=2000.0, maximum_stock=30000.0))

        # Route
        session.add(Route(
            id="RT_LEH_DBO",
            name="Leh to DBO Strategic Arterial",
            origin_id="HQ_LEH",
            dest_id="POST_DBO",
            distance_km=180.0,
            terrain_score=8.5,
            status="OPEN",
            pass_altitude_m=5200.0,
            is_snow_blocked=False,
        ))
        session.add(Route(
            id="RT_LEH_KARU",
            name="Leh to Karu Arterial",
            origin_id="HQ_LEH",
            dest_id="DEPOT_KARU",
            distance_km=35.0,
            terrain_score=3.0,
            status="OPEN",
            pass_altitude_m=3400.0,
            is_snow_blocked=False,
        ))

        # Alert
        session.add(Alert(
            id="ALT_TEST_01",
            type="STOCKOUT_RISK",
            severity="CRITICAL",
            unit_id="POST_DBO",
            message="Test critical fuel shortage alert",
            status="ACTIVE"
        ))

        # Vehicle
        session.add(Vehicle(
            id="VEH_TEST_01",
            unit_id="DEPOT_KARU",
            vehicle_type="ALS_HEAVY_TRUCK",
            capacity_tons=10.0,
            status="AVAILABLE"
        ))

        session.commit()


@pytest.fixture
def client(db_session):
    """Provides FastAPI test client bound to the in-memory test database."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def commander_headers():
    token = create_access_token(subject="test_commander", role="CORPS_COMMANDER", unit_id="HQ_LEH")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def logistics_headers():
    token = create_access_token(subject="test_logistics", role="LOGISTICS_OFFICER", unit_id="DEPOT_KARU")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def edge_headers():
    token = create_access_token(subject="test_edge", role="EDGE_READ_ONLY", unit_id="POST_DBO")
    return {"Authorization": f"Bearer {token}"}
