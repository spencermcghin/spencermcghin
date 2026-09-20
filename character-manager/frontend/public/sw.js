/*
 * Read-only offline mode (#21, first half).
 *
 * The app keeps working as a reference when the network is gone: hashed
 * assets are cached first-touch (their names change when their content
 * does), and pages plus GET API responses are served network-first with
 * the cache as the fallback. Nothing but GETs is ever cached, so writes
 * fail honestly offline instead of pretending; the sync outbox is the
 * planned second half.
 *
 * The API cache is dropped when the user signs out (the app messages us),
 * so one account's story is not readable offline by the next.
 */

const ASSETS = 'assets-v1';
const PAGES = 'pages-v1';
const API = 'api-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data === 'clear-api-cache') {
    event.waitUntil(caches.delete(API));
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(ASSETS, req));
  } else if (url.pathname === '/api/auth/export') {
    // A download of everything the account owns: fetch fresh or not at all.
    return;
  } else if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(API, req));
  } else {
    event.respondWith(networkFirst(PAGES, req));
  }
});

async function cacheFirst(name, req) {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function networkFirst(name, req) {
  const cache = await caches.open(name);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req);
    if (hit) return hit;
    throw err;
  }
}
