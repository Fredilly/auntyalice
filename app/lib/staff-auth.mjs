import { scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { SESSION_VERSION, sign, verify } from "./session.mjs";
import * as staffRepo from "./staff-repo.mjs";

if (typeof window !== "undefined") throw new Error("Staff auth is server-only");

const cookieName = "__Host-staff_session";
const sessionSeconds = 8 * 60 * 60;
const roles = ["teacher", "reviewer", "admin"];
const deriveKey = promisify(scrypt);
const scryptOptions = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const text = (value) => typeof value === "string" && value.trim().length > 0;

function staffActor(record) {
  if (!text(record?.id) || !text(record.subject) || !text(record.name) || !roles.includes(record.role)) {
    return null;
  }
  return { id: record.id, subject: record.subject, role: record.role, name: record.name };
}

export function resolveActor(request) {
  const cookies = request.headers.get("cookie");
  if (!cookies) return null;

  let token;
  for (const cookie of cookies.split(";")) {
    const pair = cookie.trimStart();
    if (!pair.startsWith(`${cookieName}=`)) continue;
    if (token !== undefined) return null;
    token = pair.slice(cookieName.length + 1);
  }
  if (!token) return null;

  const session = verify(token);
  return session.ok ? staffActor(session.payload) : null;
}

export function requireRole(actor, allowedRoles) {
  return Boolean(actor && roles.includes(actor.role) && allowedRoles.includes(actor.role));
}

function actorResponse({ id, role, name }, cookie) {
  const headers = new Headers({ "Cache-Control": "no-store" });
  if (cookie) headers.set("Set-Cookie", cookie);
  return Response.json({ actor: { id, role, name } }, { headers });
}

function errorResponse(status, error) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function sessionCookie(token, maxAge) {
  return `${cookieName}=${token}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

async function verifyPassword(password, candidate) {
  const { passwordSalt, passwordHash } = candidate ?? {};
  const hasHash = typeof passwordSalt === "string" && passwordSalt.length === 32 &&
    !/[^0-9a-f]/.test(passwordSalt) && typeof passwordHash === "string" &&
    passwordHash.length === 128 && !/[^0-9a-f]/.test(passwordHash);
  // Unknown accounts still run scrypt with the same parameters.
  const salt = hasHash ? Buffer.from(passwordSalt, "hex") : Buffer.alloc(16);
  const expected = hasHash ? Buffer.from(passwordHash, "hex") : Buffer.alloc(64);
  const derived = await deriveKey(password, salt, expected.length, scryptOptions);
  return timingSafeEqual(derived, expected) && hasHash;
}

export async function login(request, repository = staffRepo) {
  const mediaType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (mediaType !== "application/json") return errorResponse(415, "Expected application/json");
  let credentials;
  try {
    credentials = await request.json();
  } catch {
    return errorResponse(400, "Invalid credentials format");
  }
  const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
  const password = credentials?.password;
  if (!email || email.length > 254 || typeof password !== "string" || !password ||
      Buffer.byteLength(password) > 1024) {
    return errorResponse(400, "Invalid credentials format");
  }

  try {
    const staff = await repository.findStaffByEmail(email);
    const validPassword = await verifyPassword(password, staff);
    const actor = staffActor(staff);
    if (!validPassword || staff?.active !== true || !actor) {
      return errorResponse(401, "Invalid email or password");
    }

    const token = sign({ ...actor, v: SESSION_VERSION, exp: Date.now() + sessionSeconds * 1000 });
    await repository.touchLastLogin(actor.id);
    return actorResponse(actor, sessionCookie(token, sessionSeconds));
  } catch {
    return errorResponse(503, "Staff login unavailable");
  }
}

export function logout() {
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store", "Set-Cookie": sessionCookie("", 0) },
  });
}

export function me(request) {
  const actor = resolveActor(request);
  return actor ? actorResponse(actor) : errorResponse(401, "Staff session required");
}
