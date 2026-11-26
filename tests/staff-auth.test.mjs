import assert from "node:assert/strict";
import { randomBytes, scryptSync } from "node:crypto";
import { after, before, test } from "node:test";
import { SESSION_VERSION, sign, verify } from "../app/lib/session.mjs";
import { login, logout, me, requireRole, resolveActor } from "../app/lib/staff-auth.mjs";

const envKey = "STAFF_SESSION_SECRET";
const actor = { id: "staff-1", subject: "synthetic-subject", name: "Sample Teacher", role: "teacher" };
const now = Date.now();
const payload = { ...actor, v: SESSION_VERSION, exp: now + 60_000 };
const cookieName = "__Host-staff_session";
const url = "https://school.example/api/staff";
let originalSecret;

before(() => {
  originalSecret = process.env[envKey];
  process.env[envKey] = randomBytes(32).toString("hex");
});

after(() => {
  if (originalSecret === undefined) delete process.env[envKey];
  else process.env[envKey] = originalSecret;
});

test("session token round-trips and expires at its millisecond deadline", () => {
  const token = sign(payload);
  assert.deepEqual(verify(token, now), { ok: true, payload });
  assert.deepEqual(verify(token, payload.exp), { ok: false, reason: "expired" });
  assert.deepEqual(verify(sign({ ...payload, v: SESSION_VERSION + 1 }), now), {
    ok: false, reason: "wrong_version",
  });
});

test("session verification rejects tampering and malformed input", () => {
  const [encoded, signature] = sign(payload).split(".");
  const changedSignature = `${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;
  assert.deepEqual(verify(`${encoded}.${changedSignature}`, now), {
    ok: false, reason: "invalid_signature",
  });
  const [changedPayload] = sign({ ...payload, role: "admin" }).split(".");
  assert.equal(verify(`${changedPayload}.${signature}`, now).ok, false);
  for (const invalid of [null, {}, "", "a.b.c", `${encoded}.${signature}=`, `${encoded}.${signature}\n`,
    sign(null), sign({ ...payload, exp: "later" })]) {
    assert.deepEqual(verify(invalid, now), { ok: false, reason: "malformed" });
  }
});

test("session verification and signing fail closed without a secret", () => {
  const token = sign(payload);
  const secret = process.env[envKey];
  delete process.env[envKey];
  try {
    assert.deepEqual(verify(token, now), { ok: false, reason: "missing_secret" });
    assert.throws(() => sign(payload), /not configured/);
  } finally {
    process.env[envKey] = secret;
  }
});

test("actor identity comes only from a valid session cookie", () => {
  const request = new Request(`${url}/login?id=forged&subject=forged&role=admin`, {
    method: "POST",
    body: JSON.stringify({ actor: { id: "forged", subject: "forged", role: "admin" } }),
    headers: { "X-Staff-Id": "forged", "X-Staff-Subject": "forged", "X-Staff-Role": "admin",
      Authorization: `Bearer ${sign(payload)}` },
  });
  assert.equal(resolveActor(request), null);
  assert.equal(request.bodyUsed, false);

  const cookie = `${cookieName}=${sign(payload)}`;
  request.headers.set("Cookie", `another_cookie=1; ${cookie}`);
  assert.deepEqual(resolveActor(request), actor);
  request.headers.set("Cookie", `${cookie}; ${cookie}`);
  assert.equal(resolveActor(request), null);
  request.headers.set("Cookie", `${cookieName}=invalid`);
  assert.equal(resolveActor(request), null);
});

test("role gate requires an actor with an allowed staff role", () => {
  assert.equal(requireRole(actor, ["teacher", "reviewer", "admin"]), true);
  assert.equal(requireRole(actor, ["reviewer", "admin"]), false);
  assert.equal(requireRole(null, ["teacher"]), false);
  assert.equal(requireRole({ ...actor, role: "guest" }, ["guest"]), false);
});

function loginRequest(password) {
  return new Request(`${url}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "  STAFF@EXAMPLE.TEST ", password, role: "admin" }),
  });
}

test("login rejects the wrong password and issues a cookie only for a valid login", async () => {
  const password = randomBytes(24).toString("hex");
  const salt = randomBytes(16);
  const record = {
    ...actor,
    active: true,
    passwordSalt: salt.toString("hex"),
    passwordHash: scryptSync(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 })
      .toString("hex"),
  };
  const lastLogins = [];
  const repository = {
    async findStaffByEmail(email) {
      assert.equal(email, "staff@example.test");
      return record;
    },
    async touchLastLogin(id) { lastLogins.push(id); },
  };

  const denied = await login(loginRequest(randomBytes(24).toString("hex")), repository);
  assert.equal(denied.status, 401);
  assert.equal(denied.headers.has("Set-Cookie"), false);
  assert.deepEqual(lastLogins, []);

  const accepted = await login(loginRequest(password), repository);
  assert.equal(accepted.status, 200);
  assert.equal(accepted.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(lastLogins, [actor.id]);
  const publicActor = { id: actor.id, role: actor.role, name: actor.name };
  assert.deepEqual(await accepted.json(), { actor: publicActor });
  const cookie = accepted.headers.get("Set-Cookie");
  assert.match(cookie, /^__Host-staff_session=[^;]+; Max-Age=28800; Path=\/; HttpOnly; Secure; SameSite=Lax$/);
  const request = new Request(`${url}/me`, { headers: { Cookie: cookie.split(";")[0] } });
  assert.deepEqual(resolveActor(request), actor);
  const current = me(request);
  assert.equal(current.status, 200);
  assert.deepEqual(await current.json(), { actor: publicActor });
  assert.equal(me(new Request(`${url}/me`)).status, 401);

  const signedOut = logout();
  assert.equal(signedOut.status, 204);
  assert.equal(signedOut.headers.get("Set-Cookie"),
    `${cookieName}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`);
});

test("login fails closed with the unconfigured repository", async () => {
  const response = await login(loginRequest(randomBytes(24).toString("hex")));
  assert.equal(response.status, 503);
  assert.equal(response.headers.has("Set-Cookie"), false);
});
