
/* Qikiworld Service Worker — Run #18 */
const VERSION = 'v1';
const STATIC_CACHE = `qiki-static-${VERSION}`;
const API_CACHE = `qiki-api-${VERSION}`;
const IMG_CACHE = `qiki-img-${VERSION}`;

const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll([OFFLINE_URL, '/','/manifest.webmanifest']);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => ![STATIC_CACHE, API_CACHE, IMG_CACHE].includes(k)).map(k => caches.delete(k)));
    self.clients.claim();
  })());
});

// Helper: stale-while-revalidate for GET
async function swr(request, cacheName, putOpaque=false) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(async (network) => {
    if (network && (network.status === 200 || (putOpaque && network.type === 'opaque'))) {
      try { await cache.put(request, network.clone()); } catch {}
    }
    return network;
  }).catch(() => cached);
  return cached ? Promise.resolve(cached) : fetchPromise;
}

// Navigation: network-first with offline fallback
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  // Service worker itself
  if (url.pathname === '/sw.js') {
    event.respondWith(fetch(req, { cache: 'no-store' }));
    return;
  }

  // Handle navigations
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        // cache the page
        const cache = await caches.open(STATIC_CACHE);
        cache.put(req, res.clone()).catch(()=>{});
        return res;
      } catch (e) {
        // fallback to cache or offline
        const cached = await caches.match(req);
        return cached || caches.match(OFFLINE_URL);
      }
    })());
    return;
  }

  // API caching (GET only)
  if (req.method === 'GET' && (url.pathname.startsWith('/api/posts/feed') || url.pathname.startsWith('/api/posts/') || url.pathname.startsWith('/api/notifications'))) {
    event.respondWith(swr(req, API_CACHE));
    return;
  }

  // Images
  if (req.method === 'GET' && (url.pathname.startsWith('/img') || url.pathname.startsWith('/_next/image') || url.pathname.startsWith('/icons/'))) {
    event.respondWith(swr(req, IMG_CACHE, true));
    return;
  }
});
