\
#!/usr/bin/env bash
set -euo pipefail
# Usage: scripts/restore_local.sh <COMPOSE_FILE> <DB_DUMP_FILE> [UPLOADS_TGZ]
COMPOSE_FILE="${1:-free-compose.yml}"
DB_DUMP="${2:?path to db dump}"
UP_TGZ="${3:-}"

echo "[restore] Restoring to local Postgres via docker compose ($COMPOSE_FILE)"
docker compose -f "$COMPOSE_FILE" exec -T -e PGPASSWORD=qiki postgres dropdb -U qiki qikiworld || true
docker compose -f "$COMPOSE_FILE" exec -T -e PGPASSWORD=qiki postgres createdb -U qiki qikiworld
cat "$DB_DUMP" | docker compose -f "$COMPOSE_FILE" exec -T -e PGPASSWORD=qiki postgres pg_restore -U qiki -d qikiworld --clean

if [[ -n "$UP_TGZ" ]]; then
  echo "[restore] Restoring uploads"
  # Try common paths
  if docker compose -f "$COMPOSE_FILE" ps server >/dev/null 2>&1; then
    # Extract on host into the bind-mounted path
    if [[ -d "server/var" ]]; then
      tar -C server -xzf "$UP_TGZ"
    elif [[ -d "/opt/qikiworld/server/var" ]]; then
      tar -C /opt/qikiworld/server -xzf "$UP_TGZ"
    else
      echo "[restore] Could not locate server/var for uploads extraction"
    fi
  fi
fi
echo "[restore] Done"
