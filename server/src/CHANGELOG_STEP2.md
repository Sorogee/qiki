Qikiworld — Step 2 (Sessions + Redis-less) — Change Log
Date: 2025-08-24

Summary:
- Enforced device-session (JTI) validation for all authenticated APIs.
- Hardened WebSocket auth to respect JTI.
- Implemented Redis-less trending fallback with in-memory Maps.
- Sanitized user.bio and community.about/rules on the server.
- Added an e2e smoke test script and verified feed path parity.

Changes:
1) server/src/utils/jwt2.ts
   - Added `verifyJwtWithJti(token)` to decode JWT and require a live DeviceSession by `tokenId` (revoked sessions are rejected).

2) server/src/middlewares/auth.ts
   - Now imports `verifyJwtWithJti` and prefers it over legacy `verifyJwt`.
   - Normalizes `req.user` as `{ id: payload.id || payload.sub, username, email }`.
   - Legacy tokens without `jti` fall back to `verifyJwt` but will not pass session checks; new tokens are issued with `jti` (see auth.ts).

3) server/src/routes/auth.ts
   - Registration and login now issue JTI tokens via `signJwtWithJti` and create a `DeviceSession { userId, tokenId, ip, ua }`.
   - Cookie sessions (if enabled) still work; cookies now carry JTI-bound tokens.

4) server/src/realtime/ws.ts
   - WebSocket handshake now validates tokens using `verifyJwtWithJti`.
   - Free-mode guard: if Redis doesn’t support pub/sub (in-memory shim), subscription is skipped to avoid crashes.

5) server/src/search/discovery.ts
   - Added in-memory trending fallback when Redis ZSET ops are unavailable:
     - `bumpTrendingQuery`, `bumpTrendingClick`, `topTrending` gracefully use an in-process Map instead of Redis.
     - Preserves behavior in free mode; persists only for process lifetime.

6) server/src/routes/users.ts
   - Sanitizes `bio` (strip HTML, 500 chars), and validates `avatarUrl` scheme (http/https only) server-side.

7) server/src/routes/communities.ts
   - Sanitizes `about` (500 chars) and `rules` (2000 chars) allowing only safe inline tags and http/https links with `rel="nofollow noopener noreferrer"`.

8) server/src/scripts/e2e-smoke.js
   - Node 18+ script that registers a user, logs in, creates a community/post/comment, hits feed and search.
   - Run with: `node server/src/scripts/e2e-smoke.js`

Feed Path Parity:
- UI uses `/api/feed` (see `ui/app/feed/page.tsx` and `ui/app/page.tsx`).
- API mounts `/api/feed` (see `server/src/index.ts`), backed by `server/src/routes/feed.ts`.

How to run (free mode / no paid infra):
- Requirements: Docker (for Postgres/OpenSearch optional), Node 18+.
- Quick start (API only, minimal): 
  1) In one terminal: `cd server` then `npm install && npm run build && npm start`
  2) In another: `cd ui` then `npm install && npm run dev` (NEXT_PUBLIC_API_URL defaults to http://localhost:4000)
- Optional: `docker compose up` if the repo includes a compose file for Postgres and OpenSearch (OpenSearch is optional; search falls back to DB + in-memory trending).
- Smoke test: `node server/src/scripts/e2e-smoke.js`

Notes:
- “Sign-out everywhere” works via `/api/sessions/revoke_all`. Because `requireAuth` now checks live DeviceSessions by JTI, revoked tokens are immediately invalid across HTTP and WebSocket.