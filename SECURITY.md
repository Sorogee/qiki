# Security Policy

## Reporting a Vulnerability
Please email **security@qikiworld.example**. We aim to respond within 72 hours. See also `ui/public/.well-known/security.txt`.

## Supported Versions
Security fixes are applied to the latest minor release.

## Hardening Checklist (API/UI)
- Helmet with CSP, HSTS, COOP/COEP, frame/Referrer policies.
- CSRF token required for browser-origin write requests.
- Argon2id password hashing; JWT with rotation on login; tokens invalidated after password reset.
- Input validation via zod; HTML sanitized on posts/comments.
- Rate limiting on auth & write endpoints.
- Dependencies: monitored via `npm audit`, CodeQL, and optional container scans.

## Infrastructure
- TLS everywhere; HSTS (includeSubDomains; preload).
- Place a WAF (Cloudflare WAF / AWS WAF / Azure WAF or Nginx+ModSecurity) in front of Caddy.
- Enable logging/metrics/traces; on-call alerts for 5xx and p95 latency.

