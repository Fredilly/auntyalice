import { resolveIdentity } from "./identity.mjs";
import { SESSION_VERSION, sign, verify } from "./session.mjs";
import * as staffRepo from "./staff-repo.mjs";

if (typeof window !== "undefined") throw new Error("Staff auth is server-only");

const cookieName = "__Host-staff_session";
const sessionSeconds = 15 * 60;
const roles = ["teacher", "reviewer", "admin"];
const text = (value) => typeof value === "string" && value.trim().length > 0;

function staffActor(record) {
  if (record?.active !== true || !text(record.id) || !text(record.subject) || !roles.includes(record.role)) {
    return null;
  }
  return { id: record.id, subject: record.subject, role: record.role, active: true };
}

export async function resolveActor(request, repository = staffRepo) {
  const identity = await resolveIdentity(request);
  if (!identity) return null;

  const staff = await repository.findStaffBySubject(identity.subject);
  return staff?.subject === identity.subject ? staffActor(staff) : null;
}

export function readSessionActor(request) {
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

// A signed cookie proves prior authentication, not current authorization.
export async function readCurrentSessionActor(request, repository = staffRepo) {
  const session = readSessionActor(request);
  if (!session) return null;
  try {
    const current = staffActor(await repository.findStaffBySubject(session.subject));
    return current?.id === session.id && current.subject === session.subject &&
      current.role === session.role ? current : null;
  } catch {
    return null;
  }
}

export function requireRole(actor, allowedRoles) {
  return Boolean(actor && roles.includes(actor.role) && allowedRoles.includes(actor.role));
}

function actorResponse({ id, role }, cookie) {
  const headers = new Headers({ "Cache-Control": "no-store" });
  if (cookie) headers.set("Set-Cookie", cookie);
  return Response.json({ actor: { id, role } }, { headers });
}

function errorResponse(status, error) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function sessionCookie(token, maxAge) {
  return `${cookieName}=${token}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export async function establishSession(request, repository = staffRepo) {
  try {
    const actor = await resolveActor(request, repository);
    if (!actor) return errorResponse(401, "An authorized staff identity is required");

    const token = sign({ ...actor, v: SESSION_VERSION, exp: Date.now() + sessionSeconds * 1000 });
    return actorResponse(actor, sessionCookie(token, sessionSeconds));
  } catch {
    return errorResponse(503, "Staff sign-in unavailable");
  }
}

export function logout() {
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store", "Set-Cookie": sessionCookie("", 0) },
  });
}

export function me(request) {
  const actor = readSessionActor(request);
  return actor ? actorResponse(actor) : errorResponse(401, "Staff session required");
}
