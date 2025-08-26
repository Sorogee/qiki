#!/usr/bin/env bash
set -euo pipefail
TS=$(date +%Y%m%d_%H%M%S)
OUTDIR=backups/pg
mkdir -p "$OUTDIR"
echo "[*] Dumping Postgres to $OUTDIR/db_$TS.sql.gz"
docker compose exec -T db pg_dump -U ${POSTGRES_USER:-qiki} -d ${POSTGRES_DB:-qikiworld} | gzip > "$OUTDIR/db_$TS.sql.gz"
echo "[ok] $OUTDIR/db_$TS.sql.gz"
