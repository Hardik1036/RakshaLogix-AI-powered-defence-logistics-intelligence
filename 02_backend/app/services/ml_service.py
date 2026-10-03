"""
ML Ingress & Tactical Sustainment Forecasting Service
Integrates verified production models:
  - Model 1: 7-Day WMA Baseline Fallback (wma_baseline.joblib)
  - Model 2: XGBoost Quantile Regressors (demand_quantile_models.joblib: p10, p50, p90)
  - Model 3: Calibrated HistGradientBoosting Stockout Risk Scorer (stockout_clf.joblib)
  - Model 4: Isolation Forest Anomaly Detector (anomaly_forest.joblib)
Enforces Mandatory Hybrid Critical Alert Gate:
  is_critical = (stockout_risk >= 0.20) and (days_of_supply <= 2.0)
"""

import os
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
import joblib
from sqlalchemy.orm import Session

from app.config import settings
from app.models.logistics import Inventory, Consumption, Route, Unit
from app.models.intelligence import Forecast, Alert, Weather
from app.schemas.forecast import ForecastResponse, ExplainableDecisionCard

logger = logging.getLogger("rakshalogix.ml")


class MLService:
    def __init__(self):
        self.artifacts_dir = settings.ARTIFACTS_DIR
        self.is_ml_loaded = False

        # Production model containers
        self.demand_quantile_models: Optional[Dict[str, Any]] = None  # {'p10': ..., 'p50': ..., 'p90': ...}
        self.stockout_clf = None                                       # CalibratedClassifierCV
        self.anomaly_forest = None                                     # IsolationForest
        self.wma_baseline: Optional[Dict[str, Any]] = None            # 7-day WMA dict baseline
        self.preprocessor = None

        # Verified Feature Name Specifications
        self.m2_feature_names: List[str] = [
            "consumption_lag_1d", "consumption_lag_3d", "consumption_lag_7d", "consumption_lag_14d",
            "rolling_mean_3d", "rolling_mean_7d", "day_of_week", "month"
        ]
        self.m3_feature_names: List[str] = [
            "consumption_lag_1d", "consumption_lag_3d", "consumption_lag_7d", "consumption_lag_14d",
            "rolling_mean_3d", "rolling_mean_7d", "day_of_week", "month",
            "recent_demand_3d", "recent_demand_7d"
        ]
        self.m4_feature_names: List[str] = [
            "consumption_qty", "consumption_lag_1d", "consumption_lag_3d", "consumption_lag_7d",
            "rolling_mean_7d", "rolling_std_7d", "demand_deviation", "demand_ratio",
            "day_of_week", "month"
        ]

        self._load_production_artifacts()

    def _load_production_artifacts(self) -> None:
        """Loads serialized production ML models from the artifacts directory."""
        try:
            m2_path = os.path.join(self.artifacts_dir, "demand_quantile_models.joblib")
            m3_path = os.path.join(self.artifacts_dir, "stockout_clf.joblib")
            m4_path = os.path.join(self.artifacts_dir, "anomaly_forest.joblib")
            wma_path = os.path.join(self.artifacts_dir, "wma_baseline.joblib")
            f_m2_path = os.path.join(self.artifacts_dir, "feature_names.joblib")
            f_m3_path = os.path.join(self.artifacts_dir, "stockout_feature_names.joblib")
            f_m4_path = os.path.join(self.artifacts_dir, "anomaly_feature_names.joblib")

            # Load feature names if present
            if os.path.exists(f_m2_path):
                self.m2_feature_names = joblib.load(f_m2_path)
            if os.path.exists(f_m3_path):
                self.m3_feature_names = joblib.load(f_m3_path)
            if os.path.exists(f_m4_path):
                self.m4_feature_names = joblib.load(f_m4_path)

            # Load WMA baseline
            if os.path.exists(wma_path):
                self.wma_baseline = joblib.load(wma_path)

            # Load Primary Models
            if os.path.exists(m2_path) and os.path.exists(m3_path) and os.path.exists(m4_path):
                self.demand_quantile_models = joblib.load(m2_path)
                self.stockout_clf = joblib.load(m3_path)
                self.anomaly_forest = joblib.load(m4_path)
                self.is_ml_loaded = True
                logger.info("Successfully loaded production ML artifacts (Models 2, 3, 4 + WMA Baseline).")
            else:
                logger.warning("One or more production model artifacts missing in %s. Using WMA fallback.", self.artifacts_dir)
                self.is_ml_loaded = False
        except Exception as e:
            logger.warning("Failed loading production ML artifacts (%s). Falling back to WMA baseline.", e)
            self.is_ml_loaded = False

    def construct_features(
        self,
        db: Session,
        unit_id: str,
        item_type: str,
    ) -> Dict[str, float]:
        """
        Constructs all tactical consumption lags, rolling statistics, demand ratios,
        and temporal signals from the database.
        """
        now = datetime.now(timezone.utc)
        day_of_week = float(now.weekday())
        month = float(now.month)

        # Query past 14 days of consumption
        past_consumptions = (
            db.query(Consumption)
            .filter(Consumption.unit_id == unit_id, Consumption.item_type == item_type)
            .order_by(Consumption.date.desc())
            .limit(14)
            .all()
        )
        c_series = [float(c.quantity_used) for c in past_consumptions]
        while len(c_series) < 14:
            c_series.append(c_series[-1] if c_series else 100.0)

        consumption_qty = float(c_series[0])
        lag_1d = float(c_series[0])
        lag_3d = float(c_series[2])
        lag_7d = float(c_series[6])
        lag_14d = float(c_series[13])

        rolling_mean_3d = float(np.mean(c_series[:3]))
        rolling_mean_7d = float(np.mean(c_series[:7]))
        rolling_std_7d = float(np.std(c_series[:7])) if len(c_series[:7]) > 1 else 10.0
        if rolling_std_7d < 1e-4:
            rolling_std_7d = 5.0

        recent_demand_3d = float(np.sum(c_series[:3]))
        recent_demand_7d = float(np.sum(c_series[:7]))

        demand_deviation = float(consumption_qty - rolling_mean_7d)
        demand_ratio = float(consumption_qty / (rolling_mean_7d + 1e-5))

        return {
            "consumption_qty": consumption_qty,
            "consumption_lag_1d": lag_1d,
            "consumption_lag_3d": lag_3d,
            "consumption_lag_7d": lag_7d,
            "consumption_lag_14d": lag_14d,
            "rolling_mean_3d": rolling_mean_3d,
            "rolling_mean_7d": rolling_mean_7d,
            "rolling_std_7d": rolling_std_7d,
            "recent_demand_3d": recent_demand_3d,
            "recent_demand_7d": recent_demand_7d,
            "demand_deviation": demand_deviation,
            "demand_ratio": demand_ratio,
            "day_of_week": day_of_week,
            "month": month,
        }

    def _fallback_wma_inference(
        self,
        features: Dict[str, float],
        current_stock: float,
        horizon: str,
    ) -> Dict[str, Any]:
        """
        Deterministic 7-day Weighted Moving Average (WMA) fallback.
        Uses wma_baseline.joblib parameters if available.
        """
        dow = int(features["day_of_week"])
        dow_mult = 1.0
        if self.wma_baseline and "dow_multipliers" in self.wma_baseline:
            dow_mult = self.wma_baseline["dow_multipliers"].get(dow, 1.0)

        # Linear weights [1, 2, 3, 4, 5, 6, 7]
        weights = [1, 2, 3, 4, 5, 6, 7]
        past_lags = [
            features["consumption_lag_7d"],
            features["consumption_lag_7d"],
            features["consumption_lag_7d"],
            features["consumption_lag_3d"],
            features["consumption_lag_3d"],
            features["consumption_lag_1d"],
            features["consumption_lag_1d"],
        ]
        weighted_sum = sum(w * l for w, l in zip(weights, past_lags))
        daily_p50 = (weighted_sum / sum(weights)) * dow_mult

        h_mult = 1.0 if horizon == "24h" else (7.0 if horizon == "7d" else 2.0)
        p50 = max(0.0, daily_p50 * h_mult)
        p10 = max(0.0, p50 * 0.80)
        p90 = max(p50, p50 * 1.25)

        days_of_supply = float(current_stock / (p90 + 1e-5))
        runway_ratio = current_stock / (p90 + 1e-5)
        stockout_prob = min(0.95, max(0.05, 1.0 - (runway_ratio * 0.45))) if runway_ratio <= 2.0 else max(0.02, 0.15 / runway_ratio)

        is_critical = (stockout_prob >= settings.HYBRID_STOCKOUT_RISK_THRESHOLD) and (days_of_supply <= settings.HYBRID_DAYS_OF_SUPPLY_THRESHOLD)

        return {
            "p10": p10,
            "p50": p50,
            "p90": p90,
            "stockout_prob": stockout_prob,
            "days_of_supply": days_of_supply,
            "is_critical": is_critical,
            "is_anomaly": False,
            "model_version": "wma_baseline_v1.0",
        }

    def predict(
        self,
        unit_id: str,
        item_type: str,
        horizon: str,
        db: Session,
    ) -> Dict[str, Any]:
        """
        Executes multi-model inference across Models 2, 3, 4 with verified feature sets.
        Returns verified dictionary conforming to the required schema:
        {
            "unit_id": unit_id,
            "item_type": item_type,
            "forecast_horizon": horizon,
            "predicted_demand": round(float(p50), 1),
            "lower_bound": round(float(p10), 1),
            "upper_bound": round(float(p90), 1),
            "stockout_risk": round(float(stockout_prob), 3),
            "days_of_supply": round(float(days_of_supply), 1),
            "is_critical": bool(is_critical),
            "anomaly_flag": bool(is_anomaly),
            "top_factors": factors,
            "model_version": "xgb_quantile_v2.1"
        }
        """
        features = self.construct_features(db, unit_id, item_type)

        # Opening stock
        inv = db.query(Inventory).filter(Inventory.unit_id == unit_id, Inventory.item_type == item_type).first()
        current_stock = float(inv.quantity) if inv else 1000.0

        # Horizon scaling factor: models predict 1-day demand
        h_mult = 1.0 if horizon == "24h" else (7.0 if horizon == "7d" else 2.0)

        # 1. Run Machine Learning Inference or WMA Fallback
        if self.is_ml_loaded and self.demand_quantile_models is not None:
            try:
                # Model 2: Demand Quantiles (Tree models ingest unscaled features directly)
                df_m2 = pd.DataFrame([[features[c] for c in self.m2_feature_names]], columns=self.m2_feature_names)
                raw_p10 = float(self.demand_quantile_models["p10"].predict(df_m2)[0])
                raw_p50 = float(self.demand_quantile_models["p50"].predict(df_m2)[0])
                raw_p90 = float(self.demand_quantile_models["p90"].predict(df_m2)[0])

                p10 = max(0.0, raw_p10 * h_mult)
                p50 = max(0.0, raw_p50 * h_mult)
                p90 = max(p50, max(0.0, raw_p90 * h_mult))  # Monotonicity clamp

                # Model 3: Stockout Risk Scorer (HistGradientBoosting + Sigmoid Calibration)
                df_m3 = pd.DataFrame([[features[c] for c in self.m3_feature_names]], columns=self.m3_feature_names)
                stockout_prob = float(self.stockout_clf.predict_proba(df_m3)[0][1])

                # Model 4: Isolation Forest Anomaly Detection
                df_m4 = pd.DataFrame([[features[c] for c in self.m4_feature_names]], columns=self.m4_feature_names)
                anomaly_pred = int(self.anomaly_forest.predict(df_m4)[0])
                is_anomaly = (anomaly_pred == -1)

                # Mandatory Hybrid Alert Gate
                days_of_supply = float(current_stock / (p90 + 1e-5))
                is_critical = (stockout_prob >= settings.HYBRID_STOCKOUT_RISK_THRESHOLD) and (days_of_supply <= settings.HYBRID_DAYS_OF_SUPPLY_THRESHOLD)
                model_version = "xgb_quantile_v2.1"

            except Exception as e:
                logger.error("ML model execution failed (%s). Falling back to WMA baseline.", e)
                fb = self._fallback_wma_inference(features, current_stock, horizon)
                p10, p50, p90 = fb["p10"], fb["p50"], fb["p90"]
                stockout_prob = fb["stockout_prob"]
                days_of_supply = fb["days_of_supply"]
                is_critical = fb["is_critical"]
                is_anomaly = fb["is_anomaly"]
                model_version = fb["model_version"]
        else:
            fb = self._fallback_wma_inference(features, current_stock, horizon)
            p10, p50, p90 = fb["p10"], fb["p50"], fb["p90"]
            stockout_prob = fb["stockout_prob"]
            days_of_supply = fb["days_of_supply"]
            is_critical = fb["is_critical"]
            is_anomaly = fb["is_anomaly"]
            model_version = fb["model_version"]

        # 2. Derive Top Factor Attribution Strings
        factors: List[str] = []
        if is_critical:
            factors.append(f"Critical supply runway (< 48 hours: {days_of_supply:.1f} days)")
        if stockout_prob >= 0.20:
            factors.append(f"Elevated stockout risk probability ({stockout_prob * 100:.1f}%)")
        if is_anomaly:
            factors.append("Anomalous consumption pattern flagged by Isolation Forest")

        # Environmental factors
        weather = db.query(Weather).filter(Weather.unit_id == unit_id).order_by(Weather.date.desc()).first()
        if weather:
            if weather.temperature_c <= -15.0:
                factors.append(f"Severe subzero temperature ({weather.temperature_c:.1f}°C) accelerating fuel burn")
            if weather.snowfall_mm >= 25.0:
                factors.append(f"Heavy snowfall ({weather.snowfall_mm:.1f}mm) threatening mountain pass corridor")

        route = db.query(Route).filter(Route.dest_id == unit_id).first()
        if route and route.status.upper() in ("RESTRICTED", "BLOCKED"):
            factors.append(f"Arterial access route '{route.name}' is {route.status}")

        if not factors:
            factors.append(f"Normal tactical consumption rate ({features['rolling_mean_7d']:.1f} units/day)")

        return {
            "unit_id": unit_id,
            "item_type": item_type,
            "forecast_horizon": horizon,
            "predicted_demand": round(float(p50), 1),
            "lower_bound": round(float(p10), 1),
            "upper_bound": round(float(p90), 1),
            "stockout_risk": round(float(stockout_prob), 3),
            "days_of_supply": round(float(days_of_supply), 1),
            "is_critical": bool(is_critical),
            "anomaly_flag": bool(is_anomaly),
            "top_factors": factors,
            "model_version": model_version,
            "current_stock": round(float(current_stock), 1),
        }

    def forecast_demand(
        self,
        db: Session,
        unit_id: str,
        item_type: str = "Fuel",
        horizon: str = "48h",
    ) -> ForecastResponse:
        """
        Executes end-to-end tactical demand forecasting, persists Forecast record,
        creates CRITICAL alert if hybrid gate is met, and returns ForecastResponse.
        """
        pred = self.predict(unit_id=unit_id, item_type=item_type, horizon=horizon, db=db)

        current_stock = pred["current_stock"]
        predicted_demand = pred["predicted_demand"]
        lower_bound = pred["lower_bound"]
        upper_bound = pred["upper_bound"]
        stockout_risk = pred["stockout_risk"]
        days_of_supply = pred["days_of_supply"]
        is_critical = pred["is_critical"]
        anomaly_flag = pred["anomaly_flag"]
        factors = pred["top_factors"]
        model_version = pred["model_version"]

        # Enforce Hybrid Critical Alert Filter
        # Criteria: stockout_risk >= 0.20 AND days_of_supply <= 2.0 days
        if is_critical:
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
                        f"(Stock: {current_stock:.0f}, P90 Demand: {upper_bound:.0f}). "
                        f"Stockout risk: {stockout_risk * 100:.1f}%."
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
            predicted_quantity=predicted_demand,
            lower_bound=lower_bound,
            upper_bound=upper_bound,
            stockout_risk=stockout_risk,
            model_version=model_version,
        )
        db.add(forecast_record)
        db.commit()

        # Build Explainable Decision Card
        if is_critical:
            action_type = "RECOMMENDED_DISPATCH"
            conf_level = "HIGH"
            rec_msg = f"Immediate resupply convoy authorization required for {item_type} to forward post {unit_id}."
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
            primary_risk_driver=factors[0] if factors else "Normal Burn Rate",
            top_feature_contributions={
                "p50_demand": round(predicted_demand, 1),
                "p90_demand": round(upper_bound, 1),
                "days_of_supply": round(days_of_supply, 1),
                "stockout_risk": round(stockout_risk, 3),
            },
            command_recommendation=rec_msg,
            requires_officer_sign_off=True,
        )

        return ForecastResponse(
            unit_id=unit_id,
            item_type=item_type,
            horizon=horizon,
            forecast_horizon=horizon,
            current_stock=round(current_stock, 1),
            predicted_demand=predicted_demand,
            lower_bound=lower_bound,
            upper_bound=upper_bound,
            stockout_risk=stockout_risk,
            days_of_supply=days_of_supply,
            critical_alert_triggered=is_critical,
            is_critical=is_critical,
            anomaly_flag=anomaly_flag,
            top_factors=factors,
            model_version=model_version,
            decision_card=card,
        )


ml_service = MLService()
