# Review of the code in the RakshaLogix documents

Reviewed: ML Trainer (Doc 01), Frontend (Doc 03), Database (Doc 04), ML model details, pitch deck, Execution Manual.

Note on syntax: in the PDFs the operators `>=`, `<=`, `==`, `::`, `--` and `->` are rendered as `=`, `=`, `=`, `:`, `-`, `>`.
If your actual `.py`/`.sql` files look like that, they will not run. Compare the source files against the "Fix" column.

## A. Fails to run (check your source files)
| Where | As printed | Fix |
|---|---|---|
| train.py | `df[df['date'] = split_date]` | `>=` |
| train.py | `(train_df['days_remaining'] = 2.0)` (also test) | `<=` (but see B1) |
| train.py | `(test_prob = 0.40)` | `>=` |
| inference.py | `def predict_demand(payload: dict) > dict` | `-> dict` |
| inference.py | `... [0] = -1`, `route_status_encoded', 0) = 2` | `== -1`, `== 2` |
| inference.py | `operational_demand_level', 1) = 4` | `>= 4` (combat tempo is 5, so `== 4` never fires) |
| schema.sql | `CHECK (quantity = 0)`, `minimum_stock = 0`, `quantity_used = 0`, `maximum_stock = minimum_stock` | `>= 0`, `>=` (as printed, the constraints do not prevent negative stock) |
| schema/seed SQL | `- 1. EXTENSIONS`, `- Primary Corridor ...`, inline `- 50 km radius AND` | `--` comments (the inline one comments out the rest of the WHERE) |
| SQL | `u.geom :geography`, `:INT`, `w.timestamp :date` | `::` |
| KPI query 1 | `c.date = CURRENT_DATE - INTERVAL '7 days'` | `>=`; as printed it averages exactly one day |

## B. Logic errors (independent of the printing problem)
1. **Label leakage in the stock-out model.** `y = (days_remaining <= 2.0)` while `days_remaining` is feature #8. The model learns a threshold on its own input, so any recall (including ">90%") is meaningless. It also describes *now*, not "within 48 h". Build the label from future stock (`stockout_48h` in `v_ml_feature_feed`).
2. **Day-of-week mismatch.** Spec says Monday = 0 (pandas). PostgreSQL `EXTRACT(DOW)` has Sunday = 0, so SQL-fed features differ from the training features. Use `EXTRACT(ISODOW) - 1`.
3. **`opening_stock` is wrong for history.** The view joins every historical day to the *current* `inventory.quantity`. That is look-ahead leakage. Fixed by storing opening/closing stock per day in the ledger.
4. **View has 14 of 17 features.** `terrain_score`, `route_status_encoded`, `vehicle_availability` are missing although Doc 04 says the columns match the 17 features. Names also disagree across docs (`days_remaining` vs `estimated_days_remaining`, `operational_demand` vs `operational_demand_level`, artifact names `demand_model.joblib` vs `demand_quantile_models.joblib`).
5. **Schema is not 15 tables.** The matrix lists 15; the DDL creates 11 (no users, iot_data, maintenance, model_runs, simulation_runs, audit_logs). Alert severities are `CRIT/HIGH/MED` in the matrix, `CRITICAL/HIGH/MEDIUM/LOW` in the DDL. Missing columns for the API: fallback route link, ack user, forecast `anomaly_flag`/`top_factors`.
6. **Seed data contradicts the demo story.** Only 9 of 32 inventory rows exist; no consumption seed, although the checklist says 12 months are loaded. Charlie fuel is seeded at 1,400 kL against a 2,000 kL minimum, i.e. already in breach, but the pitch says it "reads green" at 4.2 days. 650 kL/d gives 2.15 days, not 4.2. The advisory card says 1,250 **L**/d, the table kL/d. 4.2 days to 34 h needs about 3x burn, not "doubles". Under the UI rule (3-7 d = AMBER) 4.2 days is amber, not green.
7. **Weather join breaks silently.** `w.location = c.unit_id` needs weather rows named by unit id, and `timestamp::date` on a timestamptz depends on session time zone. Now `weather.unit_id` (FK) + `obs_date`.
8. **Alert threshold contradicts your own metrics.** Manual: write an alert when `stockout_risk > 0.70`. The deployment metadata shows 0.70 gives recall 21.2% (precision 53.8%), i.e. it misses about 79% of positives. Use risk tiers (SAFE < 0.05, WATCH 0.05-0.20, HIGH >= 0.20) and ranking.

## C. ML package vs the specs
- Specs: 17 features, scaler, `item_type` in {Fuel, Rations, Medical, Ammo}. Shipped package: 8 features (stock-out model 10, anomaly model 10 different ones), no scaler, `item_type` = 50 retail categories (Toys, Video Games...). `inference.py` from Doc 01 will not run against it (wrong feature keys, `PREPROCESSOR.transform`).
- The package cannot respond to temperature, snow, stock or route status because it never saw them. For the demo, retrain on the database export (`v_ml_feature_feed`), which has all 17 features and a real stock-out label.
- Quantile crossing: ordering holds on 99.75% of rows, so sort `p10 <= p50 <= p90` in `predict_demand`.
- `CalibratedClassifierCV(cv=3)` is not time-aware; use `TimeSeriesSplit` (as the ML report did). `StandardScaler` is unnecessary for trees. One global model with no unit/item feature must cope with kL and rounds on one scale; add `item_type`/`unit_id` or train per item.

## D. Numbers that do not match across documents (fix before judging)
| Claim in deck (slides 2 and 6) | ML report |
|---|---|
| Stock-out recall 92.4% | 83.84% recall at 3.53% precision, proxy target |
| MAE 48.2 kL | MAE 1.03 in order-item units (DataCo), not kL |
| Inference < 38 ms, GIS 14.6 ms, TRL-5 "validated", AFMIS/ERP interoperable | no benchmark or integration evidence in the package |
| Data: Kaggle + Open-Meteo merged (Doc 01) | ML report: DataCo only, weather deliberately not used; Manual: synthetic |

Doc 01 itself says "no fake numbers presented to judges". Replace the deck figures with the report's, label the data synthetic, and say the stock-out score is an early-warning ranker.

## E. Smaller items
- Geography: Khardung La is on the Leh-Nubra road and Zojila is on the Srinagar-Dras axis, not between Kargil and Siachen. "Pass Echo" is fictional. Fine if labelled illustrative; an Army reviewer will notice otherwise.
- Frontend chart: the mask `<Area dataKey="p10" fill="#0b0f19">` does not match `bg-slate-950` (#020617), so a visible patch appears and gridlines are hidden. Use a range/stacked area for the p10-p90 band.
- Frontend offers `[7d]` horizon, but the models forecast one day ahead.
- Spatial query 2 uses a different storm centre than the manual (77.20, 35.10 vs 77.58, 34.15, which is Leh itself).
- `days_remaining = stock / (rolling_3d + 1e-5)` explodes when burn is 0; capped at 999 in the view.
