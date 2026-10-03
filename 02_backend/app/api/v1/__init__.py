# API v1 Routers Package
from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.inventory import router as inventory_router
from app.api.v1.forecast import router as forecast_router
from app.api.v1.routes import router as routes_router
from app.api.v1.convoys import router as convoys_router
from app.api.v1.alerts import router as alerts_router
from app.api.v1.simulation import router as simulation_router
from app.api.v1.kpi import router as kpi_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["Defence Authentication"])
api_router.include_router(inventory_router, prefix="/inventory", tags=["Tactical Inventory"])
api_router.include_router(forecast_router, prefix="/forecast", tags=["Sustainment Forecasting"])
api_router.include_router(routes_router, prefix="/routes", tags=["Tactical Routing"])
api_router.include_router(convoys_router, prefix="/convoys", tags=["Officer Convoy Dispatch"])
api_router.include_router(alerts_router, prefix="/alerts", tags=["Command Alerts"])
api_router.include_router(simulation_router, prefix="/simulation", tags=["War-Gaming Sandbox"])
api_router.include_router(kpi_router, prefix="/kpi", tags=["Tactical KPIs"])
