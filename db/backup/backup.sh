#!/bin/sh
set -e
: "${WALG_S3_PREFIX:?WALG_S3_PREFIX required}"
echo "[wal-g] Taking base backup"
wal-g backup-push /var/lib/postgresql/data
echo "[wal-g] Done."
