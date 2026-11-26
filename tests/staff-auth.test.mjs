import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, test } from "node:test";
import { SESSION_VERSION, sign, verify } from "../app/lib/session.mjs";
import { logout, me, readSessionActor, readCurrentSessionActor, requireRole } from "../app/lib/staff-auth.mjs";

const envKey = "STAFF_SESSION_SECRET";
const actor = { id: "staff-1", subject: "synthetic-subject", role: "teacher", active: true };
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
  const request = new Request(`${url}/me?id=forged&subject=forged&role=admin`, {
    method: "POST",
    body: JSON.stringify({ actor: { id: "forged", subject: "forged", role: "admin" } }),
    headers: { "X-Staff-Id": "forged", "X-Staff-Subject": "forged", "X-Staff-Role": "admin",
      Authorization: `Bearer ${sign(payload)}` },
  });
  assert.equal(readSessionActor(request), null);
  assert.equal(request.bodyUsed, false);

  const cookie = `${cookieName}=${sign(payload)}`;
  request.headers.set("Cookie", `another_cookie=1; ${cookie}`);
  assert.deepEqual(readSessionActor(request), actor);
  request.headers.set("Cookie", `${cookie}; ${cookie}`);
  assert.equal(readSessionActor(request), null);
  request.headers.set("Cookie", `${cookieName}=invalid`);
  assert.equal(readSessionActor(request), null);
});

test("role gate requires an actor with an allowed staff role", () => {
  assert.equal(requireRole(actor, ["teacher", "reviewer", "admin"]), true);
  assert.equal(requireRole(actor, ["reviewer", "admin"]), false);
  assert.equal(requireRole(null, ["teacher"]), false);
  assert.equal(requireRole({ ...actor, role: "guest" }, ["guest"]), false);
});

test("session lookup exposes the public actor and logout expires the cookie", async () => {
  const request = new Request(`${url}/me`, { headers: { Cookie: `${cookieName}=${sign(payload)}` } });
  const current = await me(request, { findStaffBySubject: async () => actor });
  assert.equal(current.status, 200);
  assert.equal(current.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await current.json(), { actor: { id: actor.id, role: actor.role } });
  assert.equal((await me(new Request(`${url}/me`))).status, 401);

  const signedOut = logout();
  assert.equal(signedOut.status, 204);
  assert.equal(signedOut.headers.get("Set-Cookie"),
    `${cookieName}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`);
});

test("current authorization rejects revoked, changed or unavailable staff mappings", async () => {
  const request = new Request(url, { headers: { Cookie: `${cookieName}=${sign(payload)}` } });
  const repo = record => ({ findStaffBySubject: async subject => {
    assert.equal(subject, actor.subject);
    return record;
  } });
  assert.deepEqual(await readCurrentSessionActor(request, repo(actor)), actor);
  for (const record of [null, {...actor, active:false}, {...actor, role:"admin"}, {...actor,id:"replacement"}, {...actor,subject:"other"}]) {
    assert.equal(await readCurrentSessionActor(request, repo(record)), null);
    assert.equal((await me(request, repo(record))).status, 401);
  }
  assert.equal(await readCurrentSessionActor(request, {findStaffBySubject: async () => {throw new Error("offline");}}), null);
  assert.equal(await readCurrentSessionActor(new Request(url), {findStaffBySubject: async () => {throw new Error("unexpected lookup");}}), null);
});
