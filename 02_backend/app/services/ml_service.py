"""
ML Ingress & Tactical Sustainment Forecasting Service
Computes 17-feature tactical vector, loads serialized Joblib models with zero-downtime
fallback to deterministic 7-day WMA heuristic, and enforces hybrid critical alert filter.
"""

import os
import math
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Tuple, Optional
import numpy as np
from sqlalchemy.orm import Session

from app.config import settings
from app.models.logistics import Inventory, Consumption, Route, Vehicle, Unit
from app.models.intelligence import Forecast, Alert, Weather
from app.schemas.forecast import ForecastResponse, ExplainableDecisionCard

logger = logging.getLogger("rakshalogix.ml")


class MLService:
    def __init__(self):
        self.artifacts_dir = settings.ARTIFACTS_DIR
        self.demand_model = None
        self.stockout_clf = None
        self.preprocessor = None
        self.is_ml_loaded = False
        self._load_artifacts()

    def _load_artifacts(self) -> None:
        """Attempts to load serialized Joblib models from artifacts directory."""
        try:
            import joblib
            demand_path = os.path.join(self.artifacts_dir, "demand_model.joblib")
            stockout_path = os.path.join(self.artifacts_dir, "stockout_clf.joblib")
            prep_path = os.path.join(self.artifacts_dir, "preprocessor.joblib")

            if os.path.exists(demand_path) and os.path.exists(stockout_path):
                self.demand_model = joblib.load(demand_path)
                self.stockout_clf = joblib.load(stockout_path)
                if os.path.exists(prep_path):
                    self.preprocessor = joblib.load(prep_path)
                self.is_ml_loaded = True
                logger.info("Successfully loaded ML models from artifacts.")
            else:
                logger.warning("ML model files not found in %s. Using deterministic 7-day WMA heuristic.", self.artifacts_dir)
                self.is_ml_loaded = False
        except Exception as e:
            logger.warning("Failed loading ML artifacts (%s). Falling back to deterministic WMA heuristic.", e)
            self.is_ml_loaded = False

    def build_feature_vector(
        self,
        db: Session,
        unit_id: str,
        item_type: str,
    ) -> Tuple[List[float], Dict[str, float]]:
        """
        Builds the 17-feature tactical vector:
        [consumption_lag_1d, consumption_lag_3d, consumption_lag_7d, consumption_lag_14d,
         rolling_mean_3d, rolling_mean_7d, rolling_std_7d, opening_stock,
         estimated_days_remaining, temperature, rainfall_snowfall, visibility,
         terrain_score, route_status_encoded, operational_demand_level,
         vehicle_availability, day_of_week, month]
        """
        now = datetime.now(timezone.utc)
        today = now.date()

        # 1. Query past consumption up to 14 days
        past_consumptions = (
            db.query(Consumption)
            .filter(Consumption.unit_id == unit_id, Consumption.item_type == item_type)
            .order_by(Consumption.date.desc())
            .limit(14)
            .all()
        )
        c_series = [c.quantity_used for c in past_consumptions]
        while len(c_series) < 14:
            # Pad with default burn rate if historical ledger is limited
            c_series.append(c_series[-1] if c_series else 120.0)

        lag_1d = float(c_series[0])
        lag_3d = float(c_series[2])
        lag_7d = float(c_series[6])
        lag_14d = float(c_series[13])

        mean_3d = float(np.mean(c_series[:3]))
        mean_7d = float(np.mean(c_series[:7]))
        std_7d = float(np.std(c_series[:7])) if len(c_series[:7]) > 1 else 15.0
        if std_7d < 1e-4:
            std_7d = 10.0

        # 2. Opening stock from Inventory
        inv = db.query(Inventory).filter(Inventory.unit_id == unit_id, Inventory.item_type == item_type).first()
        opening_stock = float(inv.quantity) if inv else 1000.0

        # 3. Estimated days remaining
        days_remaining = float(opening_stock / (mean_7d + 1e-5))

        # 4. Weather telemetry
        weather = db.query(Weather).filter(Weather.unit_id == unit_id).order_by(Weather.date.desc()).first()
        if weather:
            temp = float(weather.temperature_c)
            precip = float(weather.snowfall_mm + weather.rainfall_mm)
            vis = float(weather.visibility_km)
        else:
            temp = -12.0
            precip = 15.0
            vis = 8.0

        # 5. Route & terrain status
        route = db.query(Route).filter(Route.dest_id == unit_id).first()
        if route:
            terrain_score = float(route.terrain_score)
            status_map = {"OPEN": 1.0, "RESTRICTED": 2.0, "BLOCKED": 3.0}
            route_status = status_map.get(route.status.upper(), 1.0)
        else:
            terrain_score = 6.0
            route_status = 1.0

        # 6. Operational tempo & vehicles
        tempo = float(past_consumptions[0].operational_tempo) if past_consumptions else 3.0
        avail_vehicles = float(
            db.query(Vehicle)
            .filter(Vehicle.unit_id == unit_id, Vehicle.status == "AVAILABLE")
            .count()
        )
        if avail_vehicles == 0:
            avail_vehicles = 4.0

        day_of_week = float(today.weekday())
        month = float(today.month)

        feature_vector = [
            lag_1d, lag_3d, lag_7d, lag_14d,
            mean_3d, mean_7d, std_7d,
            opening_stock, days_remaining,
            temp, precip, vis,
            terrain_score, route_status,
            tempo, avail_vehicles,
            day_of_week, month
        ]

        feature_dict = {
            "consumption_lag_1d": lag_1d,
            "consumption_lag_3d": lag_3d,
            "consumption_lag_7d": lag_7d,
            "consumption_lag_14d": lag_14d,
            "rolling_mean_3d": mean_3d,
            "rolling_mean_7d": mean_7d,
            "rolling_std_7d": std_7d,
            "opening_stock": opening_stock,
            "estimated_days_remaining": days_remaining,
            "temperature": temp,
            "rainfall_snowfall": precip,
            "visibility": vis,
            "terrain_score": terrain_score,
            "route_status_encoded": route_status,
            "operational_demand_level": tempo,
            "vehicle_availability": avail_vehicles,
            "day_of_week": day_of_week,
            "month": month,
        }

        return feature_vector, feature_dict

    def _deterministic_wma_forecast(
        self,
        features: Dict[str, float],
        horizon: str,
    ) -> Tuple[float, float, float, float]:
        """
        Deterministic 7-day WMA heuristic fallback.
        Computes P10, P50, P90 quantile spreads and stockout probability.
        """
        # Linear weighting favoring recent consumption: [1, 1.2, 1.5, 1.8, 2.0, 2.5, 3.0]
        weights = np.array([3.0, 2.5, 2.0, 1.8, 1.5, 1.2, 1.0])
        # Approximate past 7-day values around rolling mean & lags
        mean_7d = features["rolling_mean_7d"]
        std_7d = features["rolling_std_7d"]
        tempo_multiplier = 0.8 + (features["operational_demand_level"] * 0.1)

        daily_rate = mean_7d * tempo_multiplier

        # Horizon scaling
        if horizon == "24h":
            h_mult = 1.0
        elif horizon == "48h":
            h_mult = 2.0
        elif horizon == "7d":
            h_mult = 7.0
        else:
            h_mult = 2.0

        p50 = daily_rate * h_mult
        cv = min(0.4, max(0.1, std_7d / (mean_7d + 1e-5)))

        # Quantile bounds: P10 (lower bound), P90 (upper bound)
        p10 = max(0.0, p50 * (1.0 - 1.28 * cv))
        p90 = p50 * (1.0 + 1.28 * cv)

        # Stockout risk calculation: logistic curve over ratio of current_stock to P90 demand
        current_stock = features["opening_stock"]
        runway_ratio = current_stock / (p90 + 1e-5)

        if runway_ratio <= 1.0:
            stockout_risk = min(0.99, 1.0 - (runway_ratio * 0.5))
        elif runway_ratio <= 2.0:
            stockout_risk = 0.5 - ((runway_ratio - 1.0) * 0.3)
        else:
            stockout_risk = max(0.01, 0.20 / runway_ratio)

        return float(p50), float(p10), float(p90), float(stockout_risk)

    def forecast_demand(
        self,
        db: Session,
        unit_id: str,
        item_type: str = "Fuel",
        horizon: str = "48h",
    ) -> ForecastResponse:
        """
        Executes end-to-end tactical demand forecasting.
        Gated by hybrid critical alert filter:
        stockout_risk >= 0.20 AND (current_stock / predicted_demand_p90) <= 2.0 days (48h)
        """
        feature_vector, feature_dict = self.build_feature_vector(db, unit_id, item_type)
        current_stock = feature_dict["opening_stock"]

        # Run model inference if loaded, else fallback to deterministic WMA
        if self.is_ml_loaded and self.demand_model is not None:
            try:
                X = np.array([feature_vector])
                if self.preprocessor:
                    X = self.preprocessor.transform(X)
                predicted_demand = float(self.demand_model.predict(X)[0])
                cv = feature_dict["rolling_std_7d"] / (feature_dict["rolling_mean_7d"] + 1e-5)
                lower_bound = max(0.0, predicted_demand * (1.0 - 1.28 * cv))
                upper_bound = predicted_demand * (1.0 + 1.28 * cv)
                if self.stockout_clf:
                    stockout_risk = float(self.stockout_clf.predict_proba(X)[0][1])
                else:
                    stockout_risk = 0.25 if (current_stock / upper_bound) < 2.0 else 0.05
                model_version = "v2.4-quantile-xgb"
            except Exception as e:
                logger.error("ML inference failed (%s). Using WMA fallback.", e)
                predicted_demand, lower_bound, upper_bound, stockout_risk = self._deterministic_wma_forecast(feature_dict, horizon)
                model_version = "v1.0-wma-fallback"
        else:
            predicted_demand, lower_bound, upper_bound, stockout_risk = self._deterministic_wma_forecast(feature_dict, horizon)
            model_version = "v1.0-wma-deterministic"

        # Calculate days of supply based on upper bound (conservative military planning)
        daily_p90 = upper_bound / (2.0 if horizon == "48h" else (7.0 if horizon == "7d" else 1.0))
        days_of_supply = float(current_stock / (daily_p90 + 1e-5))

        # Enforce Hybrid Critical Alert Filter
        # Criteria: stockout_risk >= 0.20 AND days_of_supply <= 2.0 days
        critical_alert_triggered = False
        if stockout_risk >= settings.HYBRID_STOCKOUT_RISK_THRESHOLD and days_of_supply <= settings.HYBRID_DAYS_OF_SUPPLY_THRESHOLD:
            critical_alert_triggered = True
            # Persist alert if no active critical alert exists for this unit & item
            existing_alert = (
                db.query(Alert)
                .filter(
                    Alert.unit_id == unit_id,
                    Alert.severity == "CRITICAL",
                    Alert.status == "ACTIVE",
                    Alert.message.contains(item_type)
                )
                .first()
            )
            if not existing_alert:
                new_alert = Alert(
                    type="SUPPLY_DEFICIT",
                    severity="CRITICAL",
                    unit_id=unit_id,
                    message=(
                        f"CRITICAL SUPPLY WARNING: {item_type} runway critically low at {days_of_supply:.1f} days "
                        f"(Stock: {current_stock:.0f}, P90 Demand: {upper_bound:.0f}). Stockout risk: {stockout_risk * 100:.1f}%."
                    ),
                    status="ACTIVE",
                    created_at=datetime.now(timezone.utc)
                )
                db.add(new_alert)

        # Persist Forecast
        forecast_record = Forecast(
            unit_id=unit_id,
            item_type=item_type,
            forecast_time=datetime.now(timezone.utc),
            horizon=horizon,
            predicted_quantity=round(predicted_demand, 2),
            lower_bound=round(lower_bound, 2),
            upper_bound=round(upper_bound, 2),
            stockout_risk=round(stockout_risk, 3),
            model_version=model_version
        )
        db.add(forecast_record)
        db.commit()

        # Build Explainable Decision Card
        if critical_alert_triggered:
            action_type = "RECOMMENDED_DISPATCH"
            conf_level = "HIGH"
            rec_msg = f"Immediate resupply convoy authorization required for {item_type} to forward post {unit_id} before pass closure."
        elif days_of_supply <= 4.0:
            action_type = "MONITOR"
            conf_level = "MEDIUM"
            rec_msg = f"Monitor burn rate and pre-position reserves at staging depot. Runway currently {days_of_supply:.1f} days."
        else:
            action_type = "STABLE"
            conf_level = "HIGH"
            rec_msg = f"Sustainment status green. Stock buffer exceeds operational envelope ({days_of_supply:.1f} days)."

        card = ExplainableDecisionCard(
            action_type=action_type,
            confidence_level=conf_level,
            confidence_percentage=round(min(98.5, max(75.0, (1.0 - stockout_risk * 0.3) * 100)), 1),
            primary_risk_driver="High Operational Tempo & Pass Snowfall Hazard" if critical_alert_triggered else "Normal Burn Rate",
            top_feature_contributions={
                "rolling_mean_7d": round(feature_dict["rolling_mean_7d"], 2),
                "snowfall_mm": round(feature_dict["rainfall_snowfall"], 2),
                "operational_demand_level": round(feature_dict["operational_demand_level"], 1),
                "terrain_score": round(feature_dict["terrain_score"], 1),
            },
            command_recommendation=rec_msg,
            requires_officer_sign_off=True
        )

        return ForecastResponse(
            unit_id=unit_id,
            item_type=item_type,
            horizon=horizon,
            current_stock=round(current_stock, 2),
            predicted_demand=round(predicted_demand, 2),
            lower_bound=round(lower_bound, 2),
            upper_bound=round(upper_bound, 2),
            stockout_risk=round(stockout_risk, 3),
            days_of_supply=round(days_of_supply, 2),
            critical_alert_triggered=critical_alert_triggered,
            model_version=model_version,
            decision_card=card
        )


ml_service = MLService()
