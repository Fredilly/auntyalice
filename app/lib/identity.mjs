if (typeof window !== "undefined") throw new Error("Staff identity is server-only");

const devSubject = process.env.STAFF_DEV_IDENTITY;
if (process.env.NODE_ENV === "production" && devSubject !== undefined) {
  throw new Error("STAFF_DEV_IDENTITY is forbidden in production");
}
export const staffDevIdentityEnabled = process.env.NODE_ENV !== "production" && Boolean(devSubject?.trim());

const jwksTtlMs = 5 * 60 * 1000;
const jwksFetchTimeoutMs = 5000;
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const rsaAlgorithm = "RSASSA-PKCS1-v1_5";
let jwksCache;

function decode(segment) {
  return Uint8Array.from(atob(segment.replaceAll("-", "+").replaceAll("_", "/")), char => char.charCodeAt(0));
}

async function fetchKeys(issuer) {
  const response = await fetch(`${issuer}/cdn-cgi/access/certs`, {
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(jwksFetchTimeoutMs),
  });
  if (!response.ok) throw new Error("Access keys unavailable");

  const { keys } = await response.json();
  const byId = new Map();
  for (const key of keys) {
    if (key.kty === "RSA" && key.kid &&
        (key.alg === undefined || key.alg === "RS256") &&
        (key.use === undefined || key.use === "sig")) {
      byId.set(key.kid, await crypto.subtle.importKey(
        "jwk", key, { name: rsaAlgorithm, hash: "SHA-256" }, false, ["verify"],
      ));
    }
  }
  if (byId.size === 0) throw new Error("Access keys unavailable");
  return byId;
}

function getKeys(issuer) {
  if (jwksCache?.issuer === issuer && Date.now() < jwksCache.expiresAt) return jwksCache.keys;

  // The Worker may cancel the request that started a refresh. Allow subsequent
  // requests to retry even if that request's promise never settles.
  const entry = { issuer, expiresAt: Date.now() + jwksFetchTimeoutMs };
  entry.keys = fetchKeys(issuer).then(keys => {
    entry.expiresAt = Date.now() + jwksTtlMs;
    return keys;
  }).catch(error => {
    if (jwksCache === entry) jwksCache = undefined;
    throw error;
  });
  jwksCache = entry;
  return entry.keys;
}

function validClaims(claims, issuer, audience) {
  const now = Date.now() / 1000;
  const audiences = Array.isArray(claims?.aud) ? claims.aud : [claims?.aud];
  return claims?.iss === issuer && audiences.includes(audience) &&
    typeof claims.sub === "string" && claims.sub.trim().length > 0 &&
    Number.isFinite(claims.exp) && now < claims.exp &&
    Number.isFinite(claims.nbf) && now >= claims.nbf;
}

export async function resolveIdentity(request) {
  // A client reaching the Worker directly can fabricate Cf-Access-Authenticated-User-Email.
  // Only the signed assertion establishes a Cloudflare Access identity.
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (token === null) {
    return staffDevIdentityEnabled ? { subject: devSubject, email: null } : null;
  }

  const issuer = process.env.CF_ACCESS_TEAM_DOMAIN?.replace(/\/$/, "");
  const audience = process.env.CF_ACCESS_AUD;
  if (!issuer || !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer) || !audience) return null;
  if (token.length > 16384 || !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token)) return null;

  try {
    const [header, payload, signature] = token.split(".");
    const { alg, kid, crit } = JSON.parse(decoder.decode(decode(header)));
    if (alg !== "RS256" || typeof kid !== "string" || !kid || crit !== undefined) return null;

    const claims = JSON.parse(decoder.decode(decode(payload)));
    if (!validClaims(claims, issuer, audience)) return null;

    const key = (await getKeys(issuer)).get(kid);
    if (!key || !await crypto.subtle.verify(rsaAlgorithm, key, decode(signature), encoder.encode(`${header}.${payload}`))) {
      return null;
    }
    if (!validClaims(claims, issuer, audience)) return null;
    return { subject: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
  } catch {
    return null;
  }
}
