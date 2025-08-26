# Qikiworld — One-command local stack

This repo now supports a **single-command** local run using Docker Compose. No external vendors required.

## Quickstart

```bash
cp .env.example .env
docker compose up --build
```

Then open **http://localhost:8080**.

### Services

- **Caddy** (port 8080): reverse proxy for UI and API
- **UI** (Next.js): served behind Caddy
- **API** (Node/Express): `/api/*`
- **Postgres**: persistent DB (volume `db-data`)
- **Mailhog**: dev inbox at http://localhost:8025 (API sends via console + Mailhog)
- **OpenSearch (optional)**: enable with `--profile search`
- **Uploads**: persisted in volume `uploads` (mounted at `/app/server/var/uploads/public`)

### Healthchecks

- UI: `GET /api/health`
- API:
  - `GET /api/health/healthz` — liveness
  - `GET /api/health/readinessz` — DB + (optional) OpenSearch readiness

### Environment

See `.env.example` and copy to `.env`.

Important:
- `NEXT_PUBLIC_SITE_URL=http://localhost:8080`
- `NEXT_PUBLIC_API_URL=http://localhost:8080`
- `DATABASE_URL` is injected automatically for Compose (`api` service).

### Backups

Create backups:
```bash
./tools/backup/pg_backup.sh
./tools/backup/uploads_backup.sh
```

Restore:
```bash
./tools/backup/pg_restore.sh backups/pg/db_YYYYmmdd_HHMMSS.sql.gz
./tools/backup/uploads_restore.sh backups/uploads/uploads_YYYYmmdd_HHMMSS.tar.gz
```

Backups are stored under `backups/pg` and `backups/uploads` in your working directory.

### Optional: OpenSearch

Enable the `opensearch` service (uses the `search` profile):

```bash
docker compose --profile search up -d
# Then set OPENSEARCH_URL in .env (or as env for api service)
```

### Notes

- This stack runs without Redis (free mode). Trending uses in-memory fallback.
- Dev-only endpoints are enabled (`/api/dev/*`) when `FREE_MODE=true` (default here).

## Development without Docker

You can still run `server` and `ui` locally with Node. Ensure `DATABASE_URL` points to any Postgres, run `npx prisma migrate dev`, and set `NEXT_PUBLIC_*` URLs.
