# RakshaLogix — AI-Powered Forward Defence Logistics & Sustainment Intelligence

### Ministry of Defence | Problem Statement ID: 26251

## Module Layout

- [`02_backend/`](file:///e:/RakshaLogix/02_backend): Central FastAPI Orchestration & Defence-Grade Security Backbone ($0 Free Stack)
  - **Framework**: FastAPI (Async/Sync) with Pydantic v2
  - **Database**: PostgreSQL 16 + PostGIS (`postgis/postgis:16-3.4-alpine`)
  - **Cryptography**: Argon2id password hashing, RS256/HS256 JWT with role claims
  - **Security**: Granular RBAC, Anti-DDoS Token Bucket, HTTP Security Headers, WGS84 anti-tamper guards
  - **Audit Immutability**: Append-only cryptographic audit logs
  - **Tactical Routing**: Multi-factor Dijkstra/A* routing heuristic with primary & fallback corridors
  - **War-Gaming Engine**: Hard In-Memory Simulation Sandbox (Zero SQL mutation on base tables)
  - **ML Ingress**: 17-Feature vector builder with Joblib models and deterministic 7-day WMA fallback
  - **Containerization**: Multi-stage hardened Dockerfile (`USER appuser`) and `docker-compose.yml`

For detailed backend documentation, setup commands, API specifications, and test suite details, refer to [02_backend/README.md](file:///e:/RakshaLogix/02_backend/README.md).
