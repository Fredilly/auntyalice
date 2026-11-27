/* Alice Academy service worker.
 *
 * Rules it must never break:
 *  - only successful, same-origin, public responses are cached
 *  - it deletes only caches it created (prefix "alice-")
 *  - Next.js navigations are handled as navigations; RSC fetches are never cached
 */
const VERSION = "alice-v2";
const SHELL_CACHE = `${VERSION}-shell`;
const PAGE_CACHE = `${VERSION}-pages`;
const ASSET_CACHE = `${VERSION}-assets`;
const OWNED = [SHELL_CACHE, PAGE_CACHE, ASSET_CACHE];
const SHELL = ["/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)).catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      // isolate: remove only our own older caches, never anything another worker owns
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith("alice-") && !OWNED.includes(k)).map((k) => caches.delete(k)),
      )),
  );
  self.clients.claim();
});

/** A response may be cached only if it is a successful, public, same-origin full response. */
function isCacheable(request, response) {
  if (!response || !response.ok) return false;               // no 4xx/5xx, no opaque
  if (response.status !== 200) return false;                 // no 204, no 206 partials
  if (response.type !== "basic") return false;               // same-origin only; no opaque/cors
  if (response.redirected) return false;                     // /staff/login redirects must not be stored
  const cc = response.headers.get("cache-control") || "";
  if (/no-store|private/i.test(cc)) return false;            // respect the origin
  if (request.headers.get("authorization")) return false;    // never cache authenticated traffic
  return true;
}

async function putIfCacheable(cacheName, request, response) {
  if (!isCacheable(request, response)) return;
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  } catch (_) { /* quota exceeded or body already consumed — caching is best-effort */ }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;           // never touch cross-origin

  // private or dynamic surfaces: never cached, never served from cache
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/staff")) return;

  // Next.js RSC requests for client-side navigation: network only.
  // Caching these poisons the router across deploys.
  if (url.searchParams.has("_rsc") || request.headers.get("RSC") === "1") return;

  // 1. Navigations (a real page load or reload): network first, cached copy, then /offline.
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        await putIfCacheable(PAGE_CACHE, request, fresh);
        return fresh;
      } catch (_) {
        const cached = await caches.match(request, { cacheName: PAGE_CACHE });
        if (cached) return cached;
        const shell = await caches.match("/offline");
        if (shell) return shell;
        return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
      }
    })());
    return;
  }

  // 2. Static build assets and media: cache first, then network.
  const isAsset = url.pathname.startsWith("/_next/static") ||
                  url.pathname.startsWith("/media") ||
                  url.pathname === "/manifest.webmanifest";
  if (isAsset) {
    event.respondWith((async () => {
      const cached = await caches.match(request, { cacheName: ASSET_CACHE });
      if (cached) return cached;
      const fresh = await fetch(request);
      await putIfCacheable(ASSET_CACHE, request, fresh);
      return fresh;
    })());
  }
});
