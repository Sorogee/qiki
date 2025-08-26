\
#!/usr/bin/env bash
set -euo pipefail
# Usage: scripts/restore_neon.sh <DATABASE_URL_DIRECT> <DB_DUMP_FILE> [UPLOADS_TGZ_PATH]
DUMP_URL="${1:?DATABASE_URL (direct/non-pooled) e.g. postgres://user:pass@host.region.neon.tech/db?sslmode=require}"
DB_DUMP="${2:?path to db dump}"
UP_TGZ="${3:-}"

# Strip pgbouncer flag if present
DUMP_URL="${DUMP_URL//pgbouncer=true/}"

echo "[restore] Restoring to Neon via pg_restore (this replaces schema & data)"
cat "$DB_DUMP" | docker run --rm -i postgres:15-alpine sh -lc "pg_restore -d \"$DUMP_URL\" --clean -j 2"

if [[ -n "$UP_TGZ" ]]; then
  echo "[restore] Restoring uploads to local path (sync to your live server)"
  if [[ -d "server/var" ]]; then
    tar -C server -xzf "$UP_TGZ"
  elif [[ -d "/opt/qikiworld/server/var" ]]; then
    tar -C /opt/qikiworld/server -xzf "$UP_TGZ"
  else
    echo "[restore] Could not locate server/var for uploads extraction"
  fi
fi
echo "[restore] Done"
