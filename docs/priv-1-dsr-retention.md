# PRIV‑1 — DSR & Retention

Adds GDPR/CCPA‑style **Data Subject Requests** and retention policies.

## API
- `GET /api/dsr` — list requests (user = own; admin = all)
- `POST /api/dsr/export` — start an **export** (JSON bundle → zipped). One active at a time.
- `POST /api/dsr/erasure` — start **erasure** (pseudonymize + redact content). One active at a time.
- `GET /api/dsr/:id` — status
- `GET /api/dsr/:id/download` — download export zip when complete

## Implementation
- `server/src/worker/dsr.ts`:
  - **Export**: collects profile, posts, comments, votes, sessions, appeals → writes JSON files → zips under `server/var/dsr/` → marks COMPLETE.
  - **Erasure**: deletes **votes/credentials/sessions**, resets TOTP/WebAuthn, **redacts** post/comment bodies to `"[deleted]"`, anonymizes user record.
- Works **without Redis** using the inline `enqueueDSR` fallback. With Redis, jobs run in BullMQ.

## Retention
- **DSR exports** kept **30 days** → `server/src/jobs/dsrCleanup.ts` + systemd timer at **03:40**.
- **Evidence** (moderation) kept **90 days** after case is resolved (MOD‑1).
- **Backups** kept **7 days** (FREE‑5).

## .well‑known
- `/.well-known/security.txt` → security contact & policy.
- `/.well-known/qiki-privacy.json` → DSR endpoints & retention summary.

## Setup
```bash
# Apply DB migrations
docker compose -f free-compose.yml exec server npx prisma migrate dev --name dsr_privacy
# or Neon
docker compose -f prod-lite-compose.yml exec server npx prisma migrate deploy

# Install cleanup timers (on the VM)
sudo cp -r deploy/dsr-cleanup/* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now qiki-dsr-cleanup.timer
```
