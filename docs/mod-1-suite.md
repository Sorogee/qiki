# MOD‑1 — Moderation Suite

Adds:
- **Bulk actions**: approve/remove/lock/unlock/nsfw/un-nsfw/ban/shadowban/warn/escalate on posts, comments, and (admin) users.
- **Escalations**: move a case from OPEN → ESCALATED → RESOLVED.
- **Appeals**: users can appeal a moderation on their post/comment; mods/admins review and resolve.
- **Evidence retention (90d)**: when a case is resolved, evidence gets a `purgeAfter=closedAt+90d`; a daily job deletes expired evidence.
- **Audit export**: CSV or NDJSON of audit logs within a time range.

## API
- `POST /api/mod/bulk` → `{ action, targets:[{type:'POST'|'COMMENT'|'USER',id}], reason?, metadata? }`
- `POST /api/mod/cases/:id/escalate` → escalate
- `POST /api/mod/cases/:id/resolve` → resolve + set evidence purge window
- `POST /api/mod/cases/:id/evidence` → add text/link evidence
- `POST /api/mod/appeals` → user creates appeal `{ subjectType, subjectId, reason }`
- `GET /api/mod/appeals` → list appeals (mods see their communities, admins see all)
- `POST /api/mod/appeals/:id/resolve` → `{ decision:'ACCEPTED'|'REJECTED', note? }`
- `GET /api/mod/audit/export?from=ISO&to=ISO&format=csv|ndjson` → stream export (admin)

## Permissions
- **ADMIN** can act on anything and export audits.
- **MODERATOR** (community member with role MODERATOR) can act within their community.
- Users can file appeals for their own posts/comments (or self in USER case).

## Evidence retention job
- Node script: `server/src/jobs/modRetention.ts` (compiled to `dist` at build)
- Systemd timer (03:10 nightly):
  ```bash
  sudo cp -r deploy/mod-retention/* /etc/systemd/system/
  sudo systemctl daemon-reload
  sudo systemctl enable --now qiki-mod-retention.timer
  ```

## UI
- `/_app/mod/console` → bulk selection + actions (uses existing modqueue endpoint)
- `/mod/appeals` → appeals review

> Note: if your Post model lacks an `nsfw` boolean or flair system, the NSFW/FLAIR operations are placeholders in backend; you can add fields later.
