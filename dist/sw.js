/*
 * Cpp Hero service worker.
 *
 * VERSION is stamped by build.js ("<package version>-<html hash>"), so every
 * build that changes the app produces a byte-different sw.js; the browser
 * then installs the new worker, which pre-caches the new shell and deletes
 * the old shell cache on activate.
 *
 * Strategy:
 *   - same-origin GET          cache-first, fall back to network (and cache
 *                              successful "basic" responses)
 *   - navigations, offline     cached ./index.html
 *   - fonts.googleapis.com     stale-while-revalidate (CSS), fonts cache
 *   - fonts.gstatic.com        cache-first (font files), fonts cache
 *   - anything else            not handled (goes straight to the network)
 * Opaque (no-cors) responses are allowed in the fonts cache only.
 */
'use strict';

const VERSION = "1.0.0-7b1df4b1";
const SHELL_PREFIX = 'cpphero-shell-';
const SHELL_CACHE = `${SHELL_PREFIX}${VERSION}`;
const FONTS_CACHE = 'cpphero-fonts-v1';

const SHELL_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/icon.svg',
  './icons/apple-touch-icon.png',
];

/* ---------------------------------------------------------------- install */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => Promise.all(SHELL_URLS.map((url) =>
        // cache: 'reload' bypasses the HTTP cache so we never pre-cache a
        // stale copy of the previous build. Each URL is added on its own so
        // one failure (e.g. a missing icon) can't abort the whole install.
        cache.add(new Request(url, { cache: 'reload' })).catch((err) => {
          console.warn('[sw] pre-cache failed for', url, err);
        })
      )))
      .catch((err) => console.warn('[sw] install: could not open cache', err))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

/* --------------------------------------------------------------- activate */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((k) => k.startsWith(SHELL_PREFIX) && k !== SHELL_CACHE)
        .map((k) => caches.delete(k).catch(() => false))))
      .catch((err) => console.warn('[sw] activate: cleanup failed', err))
      .then(() => self.clients.claim())
      .catch(() => {})
  );
});

/* ------------------------------------------------------------------ fetch */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }

  if (url.origin === self.location.origin) {
    event.respondWith(sameOrigin(req));
  } else if (url.hostname === 'fonts.googleapis.com') {
    event.respondWith(staleWhileRevalidate(req, FONTS_CACHE));
  } else if (url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(req, FONTS_CACHE, true));
  }
  // Other cross-origin requests (e.g. GSAP from cdnjs) are left alone.
});

/** Same-origin: cache-first; offline navigations fall back to index.html. */
function sameOrigin(req) {
  const isNav = req.mode === 'navigate';
  return caches.match(req, { ignoreSearch: isNav })
    .catch(() => undefined)
    .then((hit) => {
      if (hit) return hit;
      return fetch(req)
        .then((res) => {
          if (res && res.ok && res.type === 'basic') putInCache(SHELL_CACHE, req, res.clone());
          return res;
        })
        .catch((err) => {
          if (isNav) {
            return caches.match('./index.html')
              .catch(() => undefined)
              .then((shell) => shell || offlineResponse());
          }
          throw err;
        });
    })
    .catch(() => offlineResponse());
}

/** Cache-first for a given cache; optionally accept opaque responses. */
function cacheFirst(req, cacheName, allowOpaque) {
  return caches.open(cacheName)
    .then((cache) => cache.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (cacheable(res, allowOpaque)) cache.put(req, res.clone()).catch(() => {});
      return res;
    })))
    .catch(() => fetch(req))
    .catch(() => offlineResponse());
}

/** Serve from cache immediately (if present) and refresh it in the background. */
function staleWhileRevalidate(req, cacheName) {
  return caches.open(cacheName)
    .then((cache) => cache.match(req).catch(() => undefined).then((hit) => {
      const network = fetch(req)
        .then((res) => {
          if (cacheable(res, true)) cache.put(req, res.clone()).catch(() => {});
          return res;
        })
        .catch(() => hit || offlineResponse());
      return hit || network;
    }))
    .catch(() => fetch(req))
    .catch(() => offlineResponse());
}

function cacheable(res, allowOpaque) {
  if (!res) return false;
  if (res.type === 'opaque') return !!allowOpaque;
  return res.ok;
}

function putInCache(cacheName, req, res) {
  caches.open(cacheName)
    .then((cache) => cache.put(req, res))
    .catch((err) => console.warn('[sw] cache put failed', req.url, err));
}

function offlineResponse() {
  return new Response('Offline', { status: 503, statusText: 'Offline', headers: { 'Content-Type': 'text/plain' } });
}
