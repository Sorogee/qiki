# RANK‑1 — Feeds & Search Polish

Adds:
- **Hot ranking** (time‑decay) + **Top/New** sorts.
- **Advanced filters**: time window (24h/week/month/year/all), **community** by slug, and **NSFW** filter (exclude/include/only).
- **Saved Searches** (per user).
- **Synonyms (Postgres FTS)** — simple expansion table that augments tokens in queries when OpenSearch is disabled.

## API
- `GET /api/feed?sort=hot|new|top&time=24h|week|month|year|all&community=slug&nsfw=exclude|include|only&limit=25&cursor=postId`
- `GET /api/saved-searches` (auth), `POST /api/saved-searches`, `DELETE /api/saved-searches/:id`

## DB changes
- `Post.nsfw Boolean @default(false)`
- `SavedSearch` and `Synonym` tables

> Seed synonyms with whatever is relevant for your communities:
```sql
INSERT INTO "Synonym" ("term","variants") VALUES ('ai', ARRAY['artificial intelligence','machine learning','ml']);
INSERT INTO "Synonym" ("term","variants") VALUES ('js', ARRAY['javascript','ecmascript']);
```
(Or create via Prisma/SQL.)

## UI
- `/feed` — sort/time/nsfw/community controls + scoring
- `/search/saved` — manage saved searches

## Notes
- In FREE_MODE (Postgres FTS), the search route expands tokens using the `Synonym` table.
- At massive scale, compute scores in SQL or precompute in a cache/queue for efficiency.
