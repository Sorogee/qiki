# Privacy & Data Residency (Run #17)

## Data Subject Requests (DSR)
Endpoints (auth required):
- `POST /api/dsr/export` → queues an export of your personal data (JSON files) into an S3 bucket. Check status with `GET /api/dsr/export/status?id=`. Download via time-limited **signed URL**.
- `GET /api/dsr/me` → quick counts of your data.
- `POST /api/dsr/delete` → schedules account erasure after a grace period (`DSR_DELETE_GRACE_DAYS`, default 7). During the grace period, the user is *shadowbanned+blocked* to prevent further activity.

### Export contents
- `user.json`, `posts.json`, `comments.json`, `votes.json`, `commentVotes.json`, `mentions.json`, `reports.json`, `memberships.json`, `notifications.json` (+ `meta.json`).

### Erasure
- Default mode `DSR_DELETE_CONTENT=HARD` **deletes** posts/comments authored by the user. Votes, notifications, mentions, memberships are removed. Reports filed by the user are **anonymized** (reporterId set null). Audit logs may be retained per legitimate interest.
- The user record is **scrubbed** and marked as deleted: username set to `deleted_<id>`, email to `deleted+<id>@invalid.local`, password invalidated, and `deletedAt` timestamped.

### S3
- Exports are placed in `S3_EXPORT_BUCKET` (or fallback to `S3_BUCKET`) under `exports/<userId>/<timestamp>.zip` and served via **signed GET** with TTL `DSR_EXPORT_TTL_HOURS`.

## .well-known
Static files:
- `/.well-known/security.txt` — security contact & policy.
- `/.well-known/privacy.txt` — privacy contact & policy.

## Notes
- This is a pragmatic implementation aligning with GDPR access & erasure rights. For strict jurisdictions, consult counsel about content retention vs. deletion, and legal bases for retaining **AuditLog**.
- To disable content deletion (retain content), set `DSR_DELETE_CONTENT=KEEP` (not recommended for strong privacy posture).
