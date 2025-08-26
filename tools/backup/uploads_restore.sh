#!/usr/bin/env bash
set -euo pipefail
FILE="${1:-}"
if [ -z "$FILE" ]; then
  echo "Usage: $0 backups/uploads/uploads_YYYYmmdd_HHMMSS.tar.gz"
  exit 1
fi
echo "[*] Restoring uploads from $FILE"
cat "$FILE" | docker compose exec -T api sh -c "mkdir -p /app/server/var/uploads/public && tar -C /app/server/var/uploads/public -xzf -"
echo "[ok] uploads restored"
