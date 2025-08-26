#!/usr/bin/env bash
set -euo pipefail
FILE="${1:-}"
if [ -z "$FILE" ]; then
  echo "Usage: $0 backups/pg/db_YYYYmmdd_HHMMSS.sql.gz"
  exit 1
fi
echo "[*] Restoring $FILE into Postgres"
gunzip -c "$FILE" | docker compose exec -T db psql -U ${POSTGRES_USER:-qiki} -d ${POSTGRES_DB:-qikiworld}
echo "[ok] restore complete"
