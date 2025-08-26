# Prod‑Lite on Neon (Serverless Postgres)

This profile replaces the local Postgres with **Neon** and keeps everything else on your VM.

## 1) Create Neon project
- Create a database and a role (user/password).
- **Connection string**: copy the **pooled** endpoint (PgBouncer) URL.
- Append query params: `?sslmode=require&pgbouncer=true&connection_limit=5`

## 2) Cap autoscale to 1 CU
- In Neon console, set autoscaling min=0 (scale‑to‑zero) and max=1 CU for the branch.
- Optionally shorten the scale‑down idle timer to save credits.

## 3) Configure Qikiworld
```bash
cp .env.neon.example .env.neon
# Edit .env.neon and paste your Neon pooled DATABASE_URL
# Also set DOMAIN and EMAIL for Caddy TLS
```

## 4) Launch (no local Postgres)
```bash
docker compose -f prod-lite-compose.yml --env-file .env.neon up -d --build
```

The `migrate` job applies Prisma migrations to Neon, then `server` starts and `ui` + `caddy` come up.

## 5) Verify
- API health: `https://yourdomain.com/api/health`
- UI: `https://yourdomain.com`

## 6) Rollback
You can stop prod‑lite and go back to the one‑box setup:
```bash
docker compose -f prod-lite-compose.yml down
docker compose -f free-compose.yml up -d --build
```
