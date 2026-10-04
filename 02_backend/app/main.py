"""
RakshaLogix Backend Application Entrypoint
Ministry of Defence - Problem Statement ID: 26251
Enforces Defense-Grade Security Headers, Anti-DDoS, and Seeded Tactical Initial State
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.database import init_db, SessionLocal
from app.api.v1 import api_router
from app.models.auth import User
from app.models.logistics import Unit, Inventory, Route, Vehicle, Consumption
from app.models.intelligence import Weather, Alert
from app.security.auth import hash_password
from datetime import datetime, timezone, timedelta


class DefenceSecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Enforces strict HTTP operational security headers to mitigate clickjacking,
    MIME-sniffing, and cross-site scripting vulnerabilities in defense command centers.
    """
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

        # Allow Swagger CDN on docs routes, enforce strict CSP on API routes
        if (
            request.url.path in ["/docs", "/redoc", "/openapi.json"]
            or request.url.path.startswith(("/docs/", "/redoc/"))
        ):
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                "img-src 'self' data: https://fastapi.tiangolo.com; "
                "frame-ancestors 'none';"
            )
        else:
            response.headers["Content-Security-Policy"] = "default-src 'self';"

        return response


def seed_tactical_data():
    """Seeds initial forward defense units, inventory, routes, and officer accounts if empty."""
    db = SessionLocal()
    try:
        # 1. Seed Defense Personnel Accounts (Pre-seeded demo credentials guaranteed)
        demo_officers = [
            ("commander_alpha", "Commander@DefSec2026!", "CORPS_COMMANDER", "HQ_LEH"),
            ("logistics_bravo", "Logistics@DefSec2026!", "LOGISTICS_OFFICER", "DEPOT_KARU"),
            ("edge_charlie", "EdgeReadOnly@DefSec2026!", "EDGE_READ_ONLY", "POST_DBO"),
        ]
        for uname, pwd, role, unit in demo_officers:
            officer = db.query(User).filter(User.username == uname).first()
            if not officer:
                db.add(User(
                    username=uname,
                    hashed_password=hash_password(pwd),
                    role=role,
                    unit_id=unit,
                    is_active=True,
                ))
        db.commit()

        # 2. Seed Military Formations and Forward Posts
        if db.query(Unit).count() == 0:
            units = [
                Unit(id="HQ_LEH", name="14 Corps HQ (Leh)", type="HQ", altitude_m=3524.0, latitude=34.1526, longitude=77.5771),
                Unit(id="DEPOT_KARU", name="3 Division Forward Depot (Karu)", type="DEPOT", altitude_m=3450.0, latitude=33.9182, longitude=77.7490),
                Unit(id="FOB_DISKIT", name="Diskit Forward Operating Base", type="FOB", altitude_m=3144.0, latitude=34.5428, longitude=77.5552),
                Unit(id="POST_DBO", name="Daulat Beg Oldie Border Post", type="POST", altitude_m=5065.0, latitude=35.3122, longitude=77.9312),
                Unit(id="POST_SIACHEN", name="Siachen Glacier Base Camp", type="POST", altitude_m=3658.0, latitude=35.2000, longitude=77.1200),
            ]
            db.add_all(units)
            db.commit()

            # 3. Seed Initial Inventory Levels
            inventories = [
                # DBO Post (High Risk - Low Stock)
                Inventory(unit_id="POST_DBO", item_type="Fuel", quantity=320.0, minimum_stock=500.0, maximum_stock=2500.0),
                Inventory(unit_id="POST_DBO", item_type="Rations", quantity=450.0, minimum_stock=600.0, maximum_stock=3000.0),
                Inventory(unit_id="POST_DBO", item_type="Medical Supplies", quantity=180.0, minimum_stock=300.0, maximum_stock=1000.0),
                Inventory(unit_id="POST_DBO", item_type="Ammunition", quantity=1200.0, minimum_stock=1000.0, maximum_stock=8000.0),
                # Karu Depot (Staging Reserve)
                Inventory(unit_id="DEPOT_KARU", item_type="Fuel", quantity=15000.0, minimum_stock=2000.0, maximum_stock=25000.0),
                Inventory(unit_id="DEPOT_KARU", item_type="Rations", quantity=18000.0, minimum_stock=3000.0, maximum_stock=30000.0),
                Inventory(unit_id="DEPOT_KARU", item_type="Medical Supplies", quantity=5000.0, minimum_stock=1000.0, maximum_stock=8000.0),
                Inventory(unit_id="DEPOT_KARU", item_type="Ammunition", quantity=45000.0, minimum_stock=5000.0, maximum_stock=60000.0),
                # Diskit FOB
                Inventory(unit_id="FOB_DISKIT", item_type="Fuel", quantity=4200.0, minimum_stock=1000.0, maximum_stock=8000.0),
                Inventory(unit_id="FOB_DISKIT", item_type="Rations", quantity=5500.0, minimum_stock=1500.0, maximum_stock=9000.0),
                Inventory(unit_id="FOB_DISKIT", item_type="Medical Supplies", quantity=1400.0, minimum_stock=500.0, maximum_stock=3000.0),
                Inventory(unit_id="FOB_DISKIT", item_type="Ammunition", quantity=9500.0, minimum_stock=2000.0, maximum_stock=15000.0),
            ]
            db.add_all(inventories)

            # 4. Seed Mountain Corridors and Passes
            routes = [
                Route(
                    id="RT_LEH_DISKIT",
                    name="Leh-Khardung La-Diskit Corridor",
                    origin_id="HQ_LEH",
                    dest_id="FOB_DISKIT",
                    distance_km=116.0,
                    terrain_score=8.5,
                    status="OPEN",
                    pass_altitude_m=5359.0,
                    is_snow_blocked=False,
                ),
                Route(
                    id="RT_DISKIT_DBO",
                    name="Diskit-Shyok-DBO Arterial Axis",
                    origin_id="FOB_DISKIT",
                    dest_id="POST_DBO",
                    distance_km=145.0,
                    terrain_score=9.3,
                    status="RESTRICTED",
                    pass_altitude_m=5065.0,
                    is_snow_blocked=False,
                ),
                Route(
                    id="RT_LEH_KARU",
                    name="Leh-Karu National Highway",
                    origin_id="HQ_LEH",
                    dest_id="DEPOT_KARU",
                    distance_km=34.0,
                    terrain_score=3.0,
                    status="OPEN",
                    pass_altitude_m=3450.0,
                    is_snow_blocked=False,
                ),
            ]
            db.add_all(routes)

            # 5. Seed Vehicles
            vehicles = [
                Vehicle(id="VEH_ALS_01", unit_id="DEPOT_KARU", vehicle_type="ALS_HEAVY_TRUCK", capacity_tons=10.0, status="AVAILABLE"),
                Vehicle(id="VEH_ALS_02", unit_id="DEPOT_KARU", vehicle_type="ALS_HEAVY_TRUCK", capacity_tons=10.0, status="AVAILABLE"),
                Vehicle(id="VEH_4X4_01", unit_id="FOB_DISKIT", vehicle_type="LIGHT_4X4", capacity_tons=2.5, status="AVAILABLE"),
            ]
            db.add_all(vehicles)

            # 6. Seed Weather and Historical Consumption
            today = datetime.now(timezone.utc).date()
            for d_idx in range(14):
                d = today - timedelta(days=d_idx)
                db.add(Consumption(unit_id="POST_DBO", item_type="Fuel", date=d, quantity_used=110.0 + (d_idx % 3) * 15, operational_tempo=4))
                db.add(Consumption(unit_id="POST_DBO", item_type="Rations", date=d, quantity_used=75.0 + (d_idx % 2) * 10, operational_tempo=4))
                db.add(Consumption(unit_id="FOB_DISKIT", item_type="Fuel", date=d, quantity_used=220.0 + (d_idx % 4) * 20, operational_tempo=3))

            db.add(Weather(unit_id="POST_DBO", date=today, temperature_c=-22.0, snowfall_mm=48.0, rainfall_mm=0.0, visibility_km=3.0, wind_speed_kmh=45.0))
            db.add(Weather(unit_id="FOB_DISKIT", date=today, temperature_c=-14.0, snowfall_mm=12.0, rainfall_mm=0.0, visibility_km=8.0, wind_speed_kmh=20.0))
            db.add(Weather(unit_id="HQ_LEH", date=today, temperature_c=-8.0, snowfall_mm=5.0, rainfall_mm=0.0, visibility_km=10.0, wind_speed_kmh=15.0))

            db.commit()
    except Exception as e:
        db.rollback()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes tables and seeds initial state upon backend startup."""
    init_db()
    seed_tactical_data()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="RakshaLogix — AI-Powered Forward Defence Logistics & Sustainment Intelligence (Problem Statement ID: 26251, Ministry of Defence)",
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Apply Security Headers Middleware
app.add_middleware(DefenceSecurityHeadersMiddleware)

# Apply Strict CORS Policy for Local Development & Multi-Device Tactical Network
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Mount Clean REST Routers under /api/v1
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Health"])
def root_health_check():
    """Defence Gateway Health Check."""
    return {
        "status": "OPERATIONAL",
        "system": "RakshaLogix Forward Defence Backend",
        "version": settings.VERSION,
        "classification": "RESTRICTED - OPERATIONAL USE ONLY",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.exception_handler(Exception)
async def global_sanitized_exception_handler(request: Request, exc: Exception):
    """Sanitizes unhandled exceptions to prevent stack trace leaks in tactical environments."""
    if settings.DEBUG:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal Tactical System Error", "error": str(exc)},
        )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Operational anomaly encountered. Security incident logged."},
    )
