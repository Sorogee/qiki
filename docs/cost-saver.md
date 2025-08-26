# Cost Saver Mode

Qikiworld can run with near-zero cost using the **FREE_MODE** profile:

## What FREE_MODE does
- **Storage**: Stores uploads/exports on local disk (`LOCAL_STORAGE_DIR`) and serves them under `/files`. No S3/R2 required.
- **Search**: Uses **Postgres full-text search** (no OpenSearch cluster).
- **Queues/Rate limits**: If `REDIS_URL` is not set, uses **in-process** fallbacks for some features (sufficient for low traffic).
- **Email**: Logs to console instead of sending.
- **DSR jobs**: Processed **inline** without Redis when requested.

## Trade-offs
- In-process fallbacks are per-instance and reset on restart. For production, set up **Redis** (e.g., free plan) and S3/R2.
- Local files live on the instance; make sure your VM has backups or mount a persistent volume.

## Suggested zero/low-cost stack
- **Single free VM** (e.g., Oracle Cloud **Always Free** Ampere A1) running Docker Compose.
- **Postgres**: Use a managed free tier (e.g., Neon Free) or run Postgres on the VM.
- **Redis**: Optional. Upstash free plan works for light usage.

## Enable
1. Copy `.env.example` → `.env` and leave `FREE_MODE=true`.
2. Ensure `LOCAL_STORAGE_DIR` is writable (`server/var/uploads` by default).
3. `docker compose up -d server ui postgres`

See `README.md` for details.
