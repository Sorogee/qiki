# PWA‑1 — Mobile polish (Lighthouse verified)

Done:
- Proper **manifest** with 192/512 **PNG icons**, theme color, display=standalone
- **Service Worker** already registers (`/sw.js`) with offline shell + SWR caching for anon HTML and `/api/feed`
- **Prefetch** helper to warm common routes on idle
- **Head tags** for PWA + iOS
- **LHCI config** to verify PWA score ≥ 0.90

## Verify Lighthouse (locally)
```bash
# In ui/
npm i -D lighthouse @lhci/cli
npx lhci autorun --config=.lighthouserc.json
```
The run asserts `categories:pwa >= 0.9`. If it fails, see the HTML report.

## Notes
- Icons live at `/public/icons/icon-192.png` and `icon-512.png` (solid-color placeholders).
- Production behind HTTPS + valid TLS is required for PWA Install; Caddy + Cloudflare already handle this.
