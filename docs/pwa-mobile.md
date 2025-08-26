# PWA & Mobile UX (Run #18)

## What’s included
- **PWA installability**: `manifest.webmanifest`, monochrome icons, and an install prompt on supported browsers.
- **Service Worker** (`/sw.js`):
  - Navigations: **network-first** with **offline fallback** (`/offline`).
  - API: **stale-while-revalidate** cache for `/api/posts/feed`, `/api/posts/:id`, `/api/notifications` (GET only).
  - Images: **cache-first** for `/img`, `/_next/image`.
  - Versioned caches: `qiki-static-v1`, `qiki-api-v1`, `qiki-img-v1`.
- **Offline reading**: Post details endpoint `GET /api/posts/:id` added; “Save offline” button on post page (if present).
- **Mobile UI polish**: Bottom tab bar, larger touch targets (≥44px), compact typography on small screens.
- **Meta**: `theme-color`, Apple touch icon, manifest link injected in `layout.tsx`.

## Tips
- After deploy, run Lighthouse (Chrome DevTools) → **Progressive Web App** category. Aim for 100 on installability and offline readiness.
- When you ship breaking changes to caching, bump `VERSION` in `public/sw.js` (e.g., `v2`) to purge old caches.
- For background sync/uploads offline, consider adding the Background Sync API (future run).
