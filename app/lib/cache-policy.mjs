// Cache policy for responses leaving the Worker.
// Production was serving HTML with `s-maxage=31536000` (one year), which pins a
// deployed page in the edge cache long after a new deployment ships.

export const HTML_CACHE = "public, max-age=0, s-maxage=60, stale-while-revalidate=300";
export const MEDIA_CACHE = "public, max-age=3600, stale-while-revalidate=86400";

export function isHashedAsset(pathname) {
  return pathname.startsWith("/_next/static/") || /\.[0-9a-f]{8,}\.(js|css|woff2?|png|svg|webp|avif)$/i.test(pathname);
}

export function isMedia(pathname) {
  return pathname.startsWith("/media/");
}

/**
 * Returns the Cache-Control value for a request path + response content type.
 * Hashed assets are immutable; media has its own policy; everything else that
 * is HTML or an RSC payload must revalidate quickly.
 */
export function cacheControlFor(pathname, contentType = "") {
  if (isHashedAsset(pathname)) return "public, max-age=31536000, immutable";
  if (isMedia(pathname)) return MEDIA_CACHE;
  const type = String(contentType || "").toLowerCase();
  if (type.includes("text/html") || type.includes("text/x-component")) return HTML_CACHE;
  if (type.startsWith("image/") || type.startsWith("font/")) return "public, max-age=86400";
  return HTML_CACHE;
}
