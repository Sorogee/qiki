#!/usr/bin/env bash
set -euo pipefail
TS=$(date +%Y%m%d_%H%M%S)
OUTDIR=backups/uploads
mkdir -p "$OUTDIR"
echo "[*] Archiving uploads to $OUTDIR/uploads_$TS.tar.gz"
docker compose exec -T api sh -c "tar -C /app/server/var/uploads/public -czf - ." > "$OUTDIR/uploads_$TS.tar.gz"
echo "[ok] $OUTDIR/uploads_$TS.tar.gz"
