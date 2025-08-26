# Abuse Mitigation & Rate Limits (Run #10)

## What we enforce
- **Global IP**: 100 req/min (bursty endpoints get their own buckets).
- **Login**: 10/min/IP, plus 8/min per email identity (on failures) with backoff.
- **Register**: 3/min/IP, 10/hour/IP.
- **Posts**: 5/min/user and 50/day/user.
- **Comments**: 20/min/user and 500/day/user.
- **Votes**: 120/min/user.
- **Search**: 30/min/IP.
- **Media**: 30/min/user (sign/finalize).

All limits are stored in **Redis** (shared across replicas). Metrics emitted via Prometheus:
- `rate_limited_total{bucket}`
- `abuse_rejected_total{reason}`

## Anti-spam checks
- **Disposable email** blocklist (toggle via `DISPOSABLE_EMAILS_BLOCK=true|false`).
- **New accounts** (< `NEW_ACCOUNT_LINK_BAN_HOURS`, default 24h) cannot post **links**.
- **Domain blacklist** via `BLOCKED_LINK_DOMAINS` (comma-separated; matches subdomains).
- (Optional) Configure a WAF with bot/SQLi/XSS rules in front of the app.

## Tuning
- Raise limits for trusted users by increasing `RATE_LIMIT_TRUSTED_MULTIPLIER`. (Hooks are present; you can pass `trusted=true` to `consumeOr429` for admins/mods.)
- Consider integrating Turnstile/hCaptcha on register/login; verify server-side before creating accounts.

## Ops
- Watch for rising `rate_limited_total` and `abuse_rejected_total` per reason.
- Set alerts if limit rates spike unexpectedly (possible attack).
