# Database Backup & Restore (PITR-ready with WAL-G)

**Goal:** RPO ≤ 15 minutes, RTO ≤ 1 hour.

## Strategy
- **Base backups**: taken hourly.
- **WAL archiving**: every minute via `archive_timeout=60s` (configure in Postgres).
- **Object storage**: S3-compatible bucket (e.g., S3/Cloudflare R2/MinIO).

## Environment (examples)
```
# WAL-G
WALG_S3_PREFIX=s3://qikiworld-pg
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_ENDPOINT=http://minio:9000 # for local
AWS_S3_FORCE_PATH_STYLE=true
```

## Backup
- Base backup: `wal-g backup-push /var/lib/postgresql/data`
- Verify: `wal-g backup-list`

## Restore (latest point)
1. Stop writers (scale API to 0).
2. On a **new** Postgres data dir: `wal-g backup-fetch /var/lib/postgresql/data LATEST`
3. Create `recovery.signal` and set `restore_command='wal-g wal-fetch %f %p'`
4. Start Postgres; it replays WALs.
5. Point **READ_DATABASE_URL** to restored replica; fail over if promoting.

## Testing
- Run quarterly restores in a throwaway environment; record RTO/RPO.
