# ==============================================================================
# Multi-Stage Production Dockerfile for RakshaLogix Defence Backend
# Ministry of Defence - Problem Statement ID: 26251
# Hardened non-root execution (appuser:10001), minimal attack surface
# ==============================================================================

# ----------------- Stage 1: Build & Dependencies -----------------
FROM python:3.11-slim-bookworm AS builder

WORKDIR /build

# Install build dependencies for C-extensions (psycopg2, argon2, shapely, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Build wheels into /install directory
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ----------------- Stage 2: Hardened Runtime Container -----------------
FROM python:3.11-slim-bookworm AS runner

# Create dedicated non-root user and group with explicit UID/GID
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -s /bin/bash -m appuser

# Install only minimal runtime shared libraries (libpq for postgresql, libgeos for shapely, libgomp1 for xgboost)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    libgeos-c1v5 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy installed Python packages from builder stage
COPY --from=builder /install /usr/local

# Copy application source code with non-root ownership
COPY --chown=appuser:appgroup app /app/app

# Ensure correct permissions
RUN chown -R appuser:appgroup /app

# Set operational environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    PORT=8000 \
    ENVIRONMENT=production

# Switch to non-root defense user
USER appuser

# Expose internal service port
EXPOSE 8000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

# Production server entrypoint using Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--proxy-headers", "--forwarded-allow-ips", "*"]
