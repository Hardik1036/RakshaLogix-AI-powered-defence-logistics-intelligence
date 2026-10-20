#!/usr/bin/env bash
# Usage: ./run_all.sh [postgresql://postgres:postgres@localhost:5432/rakshalogix] [--reset]
set -euo pipefail
cd "$(dirname "$0")"
URL="${1:-postgresql://postgres:postgres@localhost:5432/rakshalogix}"
[ "${2:-}" = "--reset" ] && psql "$URL" -v ON_ERROR_STOP=1 -f 00_reset.sql
for f in 01_schema.sql 02_seed_generated.sql 03_seed_static.sql 04_views_functions.sql 05_verify.sql; do
  echo ">>> $f"; psql "$URL" -v ON_ERROR_STOP=1 -f "$f"
done
