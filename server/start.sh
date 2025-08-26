#!/bin/sh
set -e
echo "[Qikiworld] Waiting for database"
until pg_isready -h pgbouncer -p 6432 -U "${POSTGRES_USER:-qiki}" >/dev/null 2>&1; do
  sleep 1
done
echo "[Qikiworld] Applying database schema"
npx prisma migrate deploy || npx prisma db push
echo "[Qikiworld] Starting API server"
node dist/index.js
