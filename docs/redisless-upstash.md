# Redis-less Mode & Upstash Toggle

Qikiworld works **without Redis**. When `REDIS_URL` is **unset**:
- **Rate limits** use an **in-process token bucket** (per instance).
- **Email queue** runs **inline** and prints to console in FREE_MODE.
- **Notify queue** calls `createNotification()` inline (DB + WebSocket).
- **Search indexing** is skipped when OpenSearch is disabled; if enabled, we do a best-effort inline index.
- **Workers** (`worker/index.ts`, `worker/digest.ts`) are disabled automatically.

## Add Redis later (Upstash Free)
1. Create a free Upstash Redis and copy the `UPSTASH_REDIS_REST_URL` or `REDIS_URL`.
2. Set `REDIS_URL=redis://:<password>@<host>:<port>/<db>` in your `.env`.
3. Restart the stack:
   ```bash
   docker compose -f free-compose.yml down
   docker compose -f free-compose.yml up -d --build
   ```

With `REDIS_URL` set:
- Rate limits switch to **Redis-backed**.
- Queues use **BullMQ** with retries and durability.
- You can safely add a worker process in a future run.
