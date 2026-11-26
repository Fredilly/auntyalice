import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_VERSION = 1;
const maxTokenLength = 3800;
const tokenPattern = /^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]{43})$/;

function signature(encoded, secret) {
  return createHmac("sha256", secret).update(encoded).digest();
}

export function sign(payload) {
  const secret = process.env.STAFF_SESSION_SECRET;
  if (!secret) throw new Error("Staff session secret not configured");

  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const token = `${encoded}.${signature(encoded, secret).toString("base64url")}`;
  if (token.length > maxTokenLength) throw new Error("Staff session token too large");
  return token;
}

export function verify(token, nowMs = Date.now()) {
  const secret = process.env.STAFF_SESSION_SECRET;
  if (!secret) return { ok: false, reason: "missing_secret" };
  const malformed = { ok: false, reason: "malformed" };
  if (typeof token !== "string" || token.length > maxTokenLength || !Number.isFinite(nowMs)) {
    return malformed;
  }
  const match = tokenPattern.exec(token);
  if (!match || match[0] !== token) return malformed;
  const [, encoded, encodedSignature] = match;
  const supplied = Buffer.from(encodedSignature, "base64url");
  if (supplied.toString("base64url") !== encodedSignature) return malformed;
  if (!timingSafeEqual(supplied, signature(encoded, secret))) {
    return { ok: false, reason: "invalid_signature" };
  }

  const bytes = Buffer.from(encoded, "base64url");
  if (bytes.toString("base64url") !== encoded) return malformed;
  let payload;
  try {
    payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return malformed;
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return malformed;
  if (payload.v !== SESSION_VERSION) return { ok: false, reason: "wrong_version" };
  if (!Number.isSafeInteger(payload.exp) || payload.exp <= 0) return malformed;
  if (nowMs >= payload.exp) return { ok: false, reason: "expired" };
  return { ok: true, payload };
}
