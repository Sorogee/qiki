# Edge Caching & CDN (Run #14)

## What we ship
- **Compression**: gzip/br via Express + Caddy `encode zstd gzip`.
- **Conditional requests**: ETag + Last-Modified on feed and search (`304 Not Modified` support).
- **Cache-Control**:
  - API feed & search: `public, s-maxage=30, stale-while-revalidate=60` + **Surrogate-Key** tags (`feed:all`, `feed:comm:<slug>`, `sort:<algo>`).
  - Static assets (`/_next/static/*`): `public, max-age=31536000, immutable`.
- **Image optimization proxy**: `/img?key=<s3key>&w=&q=&format=webp|avif|jpeg` (streams from S3 and transforms with **sharp**). CDN can cache the result for 30 days.

## Recommended CDN config
### Cloudflare
- **Cache**: Respect origin, but add a rule to cache `/api/posts/feed` and `/api/search` based on query string, TTL **30s**.
- **Browser**: leave short (0) for APIs; rely on edge cache only.
- **Brotli**: On. **Early Hints**: Optional.
- **Tiered cache**: On. **Stale while revalidate**: emulate via Serve Stale when origin down.
- **Purge**: You can purge by URL or all; to purge groups, add a Transform Rule to copy `Surrogate-Key` to `CF-Cache-Tag` so you can purge by tag.

### Fastly
- Create a header VCL to map `Surrogate-Key` → `Surrogate-Key` (Fastly supports this natively).
- Set `stale_if_error=60` and enable **shielding**.
- Use **surrogate keys** to purge `feed:comm:<slug>` when content changes (hook up your CI/deploy to call Fastly API on invalidations).

### CloudFront
- Create behaviors for `/api/posts/feed*`, `/api/search*`, and `/img*`:
  - Cache based on all query strings.
  - Respect origin caching; minimum TTL 0, default 30s, max 60s for APIs; 30 days for `/img*`.
- Enable **Compression** and **Origin Shield**.

## Purge strategy
- We already invalidate Redis keys on content changes.
- For CDN purge: add a small webhook or script to call your CDN API with the **Surrogate-Key** tags you want to purge (e.g., `feed:*`).

## Notes
- Keep API responses small; avoid embedding full comment trees in the feed to maximize cache hit ratio.
- For images, prefer `format=avif` for modern browsers; fall back to `webp`/`jpeg`.
