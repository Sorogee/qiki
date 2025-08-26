\
#!/usr/bin/env bash
set -euo pipefail

# Config
COMPOSE_FILE="${COMPOSE_FILE:-free-compose.yml}"   # or prod-lite-compose.yml
BACKUP_DIR="${BACKUP_DIR:-/opt/qiki-backups}"
DATE="$(date +%F_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Try to load env (for Neon DATABASE_URL, DOMAIN, etc.)
if [[ -f ".env.neon" ]]; then
  set -o allexport
  source .env.neon || true
  set +o allexport
fi
if [[ -f ".env" ]]; then
  set -o allexport
  source .env || true
  set +o allexport
fi

MODE="local"
if [[ "${DATABASE_URL:-}" =~ neon\.tech ]]; then
  MODE="neon"
fi

echo "[backup] Mode: $MODE"
DB_OUT="$BACKUP_DIR/db_${DATE}.dump"
UP_OUT="$BACKUP_DIR/uploads_${DATE}.tgz"

if [[ "$MODE" == "local" ]]; then
  echo "[backup] Dumping local Postgres via docker compose ($COMPOSE_FILE)"
  # Default creds from free-compose.yml
  docker compose -f "$COMPOSE_FILE" exec -T -e PGPASSWORD=qiki postgres \
    pg_dump -U qiki -d qikiworld -F c -Z 9 > "$DB_OUT"
else
  echo "[backup] Dumping Neon Postgres (serverless)"
  # Prefer a dedicated backup URL (direct endpoint, not PgBouncer)
  DUMP_URL="${DATABASE_URL_BACKUP:-${DATABASE_URL}}"
  # Remove pgbouncer param if present
  DUMP_URL="${DUMP_URL//pgbouncer=true/}"
  # Ensure sslmode=require
  if [[ "$DUMP_URL" != *"sslmode="* ]]; then
    if [[ "$DUMP_URL" == *"?"* ]]; then
      DUMP_URL="${DUMP_URL}&sslmode=require"
    else
      DUMP_URL="${DUMP_URL}?sslmode=require"
    fi
  fi
  docker run --rm -i postgres:15-alpine sh -lc "PGCONNECT_TIMEOUT=30 pg_dump \"$DUMP_URL\" -F c -Z 9" > "$DB_OUT"
fi

echo "[backup] Archiving uploads directory"
# If run from project root on the VM:
if [[ -d "server/var/uploads" ]]; then
  tar -C server -czf "$UP_OUT" var/uploads || true
# Or typical install path:
elif [[ -d "/opt/qikiworld/server/var/uploads" ]]; then
  tar -C /opt/qikiworld/server -czf "$UP_OUT" var/uploads || true
else
  echo "[backup] uploads dir not found; skipping"
fi

echo "[backup] Rotating backups older than 7 days"
find "$BACKUP_DIR" -type f -mtime +6 -name "*.dump" -delete || true
find "$BACKUP_DIR" -type f -mtime +6 -name "*.tgz" -delete || true

echo "[backup] Done -> $BACKUP_DIR"
