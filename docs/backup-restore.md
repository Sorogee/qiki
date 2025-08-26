# Backups without vendors (FREE‑5)

This adds simple, reliable backups on your VM — no third‑party backup service needed.

## What you get
- `scripts/backup.sh` — Nightly **pg_dump** (local or Neon) + **uploads tar** with **7‑day rotation**.
- `scripts/restore_local.sh` — Restore to local Postgres (compose).
- `scripts/restore_neon.sh` — Restore to Neon (direct endpoint).
- `deploy/backup/qiki-backup.service` + `.timer` — systemd units to run backups daily at **02:30**.
- Default backup dir: `/opt/qiki-backups` (override with `BACKUP_DIR` env).

## Install (systemd)
```bash
sudo mkdir -p /opt/qiki-backups
sudo cp -r deploy/backup/* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now qiki-backup.timer
sudo systemctl status qiki-backup.timer
```
Backups land in `/opt/qiki-backups` as:
```
db_YYYY-MM-DD_HHMMSS.dump
uploads_YYYY-MM-DD_HHMMSS.tgz
```

## Manual run
```bash
# From /opt/qikiworld
BACKUP_DIR=/opt/qiki-backups COMPOSE_FILE=free-compose.yml scripts/backup.sh
# or with Neon prod-lite
BACKUP_DIR=/opt/qiki-backups COMPOSE_FILE=prod-lite-compose.yml scripts/backup.sh
```

## Neon specifics
- Prefer **direct (non‑pooled)** connection for dumps/restores. Set `DATABASE_URL_BACKUP` with the direct endpoint (and `sslmode=require`). The script strips `pgbouncer=true` if present.
- To restore, use `scripts/restore_neon.sh "<DIRECT_DATABASE_URL>" <dump-file>`.

## Restore (local)
```bash
# Stop app if you want a clean restore window (optional)
docker compose -f free-compose.yml stop server ui

# Restore DB
scripts/restore_local.sh free-compose.yml /opt/qiki-backups/db_YYYY-MM-DD_HHMMSS.dump

# Restore uploads
scripts/restore_local.sh free-compose.yml /opt/qiki-backups/db_*.dump /opt/qiki-backups/uploads_*.tgz

# Start app again
docker compose -f free-compose.yml up -d server ui
```

## Tips
- Test a restore monthly to validate backups.
- Keep backups on a separate disk or rsync to another host for extra safety.
- If you use **Neon**, consider enabling branch snapshots in the Neon console for additional safety.
