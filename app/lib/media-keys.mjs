// Pure media-key logic, shared by the Worker route and the tests.
// No Next.js or Cloudflare imports here so `node --test` can load it directly.

const PREFIXES = ["branding/", "primary/", "secondary/", "academy/", "campus/"];
const KEY_RE = /^[a-z0-9][a-z0-9-_]*(\/[a-z0-9][a-z0-9-_.]*)*$/;

const TYPES = {
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  avif: "image/avif",
  ico: "image/x-icon",
  pdf: "application/pdf",
};

export function resolveKey(raw) {
  const joined = Array.isArray(raw) ? raw.join("/") : String(raw ?? "");
  const key = joined.replace(/^\/+/, "");
  if (!key) return { ok: false, reason: "empty" };
  if (key.length > 200) return { ok: false, reason: "too_long" };
  if (key.includes("..") || key.includes("//") || key.startsWith("/")) return { ok: false, reason: "traversal" };
  if (!KEY_RE.test(key)) return { ok: false, reason: "bad_characters" };
  if (!PREFIXES.some((p) => key.startsWith(p))) return { ok: false, reason: "not_allowed_prefix" };
  return { ok: true, key };
}

export function contentTypeFor(key) {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  return TYPES[ext] ?? "application/octet-stream";
}

export const ALLOWED_PREFIXES = PREFIXES;

/**
 * @param {Request} request
 * @param {string[]} segments
 * @param {{get:(k:string)=>Promise<any>}|undefined} bucket
 */
export async function serve(request, segments, bucket) {
  const resolved = resolveKey(segments);
  if (!resolved.ok) return new Response("Not found", { status: 404 });
  if (!bucket) return new Response("Media bucket not configured", { status: 503 });

  const head = request.method === "HEAD";
  if (!head && request.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
  }

  const object = await bucket.get(resolved.key);
  if (!object || !object.body) return new Response("Not found", { status: 404 });

  const headers = new Headers({
    "Content-Type": object.httpMetadata?.contentType ?? contentTypeFor(resolved.key),
    "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  });
  if (object.httpEtag) headers.set("ETag", object.httpEtag);
  if (typeof object.size === "number") headers.set("Content-Length", String(object.size));

  const inm = request.headers.get("if-none-match");
  if (inm && object.httpEtag && inm === object.httpEtag) return new Response(null, { status: 304, headers });

  return new Response(head ? null : object.body, { status: 200, headers });
}
