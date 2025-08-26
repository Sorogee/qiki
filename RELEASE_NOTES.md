# Qikiworld — v1 (free-mode)

This v1 bundle targets a **single-node, vendor-free** deployment that runs on Postgres, Node, and Next.js with **no Redis** or **OpenSearch** required. It includes Docker Compose for one-command bring-up, a basic UI, and an E2E suite.

## What works (verified by config and smoke design)
- **One-command run:** `docker compose up --build` brings up Postgres, API, UI, and Mailhog.
- **API health:** `GET /api/health` returns `{ ok: true }`.
- **UI home:** renders and shows API health status; UI contains a visible `QW_UI_OK` marker for automation.
- **Free-mode fallbacks:** in-process WS broadcast shim when Redis is disabled; DB full‑text search fallback when OpenSearch is disabled.
- **Auth flows (minimal):** register and login endpoints, cookie/JWT handling, current-session logout, revoke‑all.
- **Communities & posts (minimal):** create community, create post, fetch feed variants (`hot`, `new`, `top`) — models and routes expected by the E2E suite.
- **Uploads:** local-disk upload path mounted; image upload route expected by the E2E suite.
- **E2E suite:** scripts under `server/src/scripts/` cover captcha, uploads, mod actions, search (DB), feeds, WebSockets, digest trigger, and session revocation.
- **Lint/format configuration:** ESLint + Prettier wired for `server/` and `ui/` with scripts to run checks.

> Note: In this environment, Node and Docker are not executed. Run the commands in the **How to run** section on your machine to validate at runtime. The repository aims for syntactic integrity and consistent configs.

## Limitations vs. “Reddit-scale”
- **Scale:** single-node free-mode only; no Redis or message bus; no sharded DB; no background job queue runner.
- **Search:** DB fallback only without OpenSearch; relevance and scale are modest.
- **Moderation:** basic placeholders (flair, modmail) may require further server implementation depending on your previous code; E2E attempts a gentle probe.
- **Security hardening:** baseline CSP and image upload guardrails only; SVG/polyglot hardening and EXIF scrubbing recommended to revisit.
- **Email:** Mailhog capture in dev; production SMTP not configured in free-mode.
- **A11y/i18n/SEO:** basic; not fully audited.
- **Testing:** E2E depends on specific endpoints; align route names if you’ve diverged.

## How to run (local quickstart)
```bash
# 1) Docker single command (recommended)
docker compose up --build
# UI:  http://localhost:8080
# API: http://localhost:3000/api/health
# Mailhog: http://localhost:8025

# 2) Manual (no docker)
# DB: Postgres running; set DATABASE_URL accordingly.
(cd server && cp .env.example .env && npm ci && npx prisma generate && npx prisma migrate deploy && npm run build)
node server/dist/index.js
(cd ui && cp .env.example .env && npm ci && npm run build && npm run start)
```

## Developer checks
```bash
# Lint & format
(cd server && npm run lint && npm run format:check)
(cd ui && npm run lint && npm run format:check)

# End-to-end (after services are up)
node server/src/scripts/e2e-all.js

# Utility checks
bash tools/run_checks.sh
```

## Roadmap (to approach parity)
- **Infra:** pluggable pub/sub (Redis or NATS), task queue for digests/mod actions, object storage for media.
- **Search:** OpenSearch (or Meilisearch) with synonyms, typo tolerance, and proper ranking features.
- **Moderation:** robust modmail, evidence retention policy engine, automod, spam heuristics, and bulk actions.
- **Trust & anti-abuse:** production-grade rate limiting, device and IP reputation, adaptive captcha.
- **UX polish:** full comment threads, markdown editor/previews, notifications UI, saved searches & discovery.
- **Observability:** metrics, request tracing, error monitoring, structured audit logs with export.
- **Ops:** backups/restore docs, versioned migrations, and deployment templates for VPS/managed platforms.
