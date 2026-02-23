/* Service worker for Slim Tarot

Goals:
- Cache core app shell
- Precache all thumbnail images (fast flips)
- Cache full-size images on demand

This is intentionally simple (no build step).
*/

const VERSION = 'v1';
const CORE_CACHE = `core-${VERSION}`;
const IMG_CACHE = `img-${VERSION}`;

const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './cards.js',
  './thumbs-manifest.json',
  './images/card-back-roses-lilies.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const core = await caches.open(CORE_CACHE);
    await core.addAll(CORE_ASSETS);

    // Pre-cache thumbnails for instant flips
    try {
      const res = await fetch('./thumbs-manifest.json', { cache: 'no-cache' });
      const thumbs = await res.json();
      const imgCache = await caches.open(IMG_CACHE);
      await imgCache.addAll(thumbs);
    } catch (e) {
      // If manifest fetch fails, app still works without precache.
    }

    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => {
      if (k !== CORE_CACHE && k !== IMG_CACHE) return caches.delete(k);
    }));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  const isImage = req.destination === 'image' || url.pathname.includes('/images/');

  if (isImage) {
    // Cache-first for images (thumbs + full-size)
    event.respondWith((async () => {
      const cache = await caches.open(IMG_CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;

      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    })());
    return;
  }

  // For navigations + core assets: cache-first, update in background
  event.respondWith((async () => {
    const cache = await caches.open(CORE_CACHE);
    const cached = await cache.match(req);
    if (cached) {
      event.waitUntil((async () => {
        try {
          const fresh = await fetch(req);
          if (fresh.ok) cache.put(req, fresh.clone());
        } catch {}
      })());
      return cached;
    }

    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  })());
});
