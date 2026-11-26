import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { before, test } from "node:test";
import { verify } from "../app/lib/session.mjs";

const issuer = "https://test-team.cloudflareaccess.com";
const audience = "test-application";
const subject = "test-access-subject";
const email = "staff@example.test";
const staff = { id: "c5b27ff0-61d5-4199-886b-b763bbe3536e", subject, role: "teacher", active: true };
const sessionUrl = "https://school.example.test/api/staff/session";
const jwksUrl = `${issuer}/cdn-cgi/access/certs`;
const databaseUrl = "postgresql://test@ep-test-pooler.us-east-2.aws.neon.tech/academy";
const sqlUrl = "https://api.us-east-2.aws.neon.tech/sql";
const algorithm = "RSASSA-PKCS1-v1_5";
const kid = "test-key";
const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
const repository = { findStaffBySubject: async () => staff };
let keys;
let jwk;
let resolveIdentity;
let resolveActor;
let establishSession;
let readSessionActor;

before(async () => {
  delete process.env.STAFF_DEV_IDENTITY;
  process.env.CF_ACCESS_TEAM_DOMAIN = issuer;
  process.env.CF_ACCESS_AUD = audience;
  process.env.STAFF_SESSION_SECRET = randomBytes(32).toString("hex");
  process.env.DATABASE_URL = databaseUrl;
  ({ resolveIdentity } = await import("../app/lib/identity.mjs"));
  ({ resolveActor, establishSession, readSessionActor } = await import("../app/lib/staff-auth.mjs"));
  keys = await crypto.subtle.generateKey({
    name: algorithm, modulusLength: 2048, publicExponent: Uint8Array.of(1, 0, 1), hash: "SHA-256",
  }, true, ["sign", "verify"]);
  jwk = { ...await crypto.subtle.exportKey("jwk", keys.publicKey), kid };
});

async function assertion(claims = {}, header = {}) {
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: issuer, aud: [audience], exp: now + 900, nbf: now - 10, sub: subject, email, ...claims };
  const data = `${encode({ alg: "RS256", kid, ...header })}.${encode(payload)}`;
  const signature = await crypto.subtle.sign(algorithm, keys.privateKey, Buffer.from(data));
  return `${data}.${Buffer.from(signature).toString("base64url")}`;
}

function request(token, headers = {}) {
  const req = new Request(sessionUrl, { headers });
  if (token) req.headers.set("Cf-Access-Jwt-Assertion", token);
  return req;
}

test("a fabricated Access email cannot resolve an actor or set a cookie", async t => {
  const untrusted = request(null, { "Cf-Access-Authenticated-User-Email": email });
  const lookup = t.mock.method(repository, "findStaffBySubject");
  assert.equal(await resolveIdentity(untrusted), null);
  assert.equal(await resolveActor(untrusted, repository), null);
  const denied = await establishSession(untrusted, repository);
  assert.equal(denied.status, 401);
  assert.equal(denied.headers.get("Set-Cookie"), null);
  assert.equal(lookup.mock.callCount(), 0);
});

test("unsigned, tampered, expired, early and wrong-issuer or wrong-audience assertions are refused", async t => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ keys: [jwk] }));
  const valid = await assertion();
  const [header, payload, signature] = valid.split(".");
  const unsigned = `${encode({ alg: "none", kid })}.${payload}.`;
  const tampered = `${header}.${payload}.${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;
  const now = Math.floor(Date.now() / 1000);
  const invalid = [
    unsigned, tampered,
    await assertion({ exp: now - 1 }),
    await assertion({ nbf: now + 60 }),
    await assertion({ nbf: undefined }),
    await assertion({ aud: ["different-application"] }),
    await assertion({ iss: "https://wrong-team.cloudflareaccess.com" }),
    await assertion({}, { kid: "unknown-key" }),
  ];
  const lookup = t.mock.method(repository, "findStaffBySubject");
  for (const token of invalid) {
    assert.equal(await resolveIdentity(request(token)), null);
    const denied = await establishSession(request(token), repository);
    assert.equal(denied.status, 401);
    assert.equal(denied.headers.get("Set-Cookie"), null);
  }
  assert.equal(lookup.mock.callCount(), 0);
});

test("Access keys are shared across requests in memory until the TTL expires", async t => {
  const { resolveIdentity: resolveFreshIdentity } = await import("../app/lib/identity.mjs?cache-test");
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  const token = await assertion();
  const fetchKeys = t.mock.method(globalThis, "fetch", async url => {
    assert.equal(url, jwksUrl);
    return Response.json({ keys: [jwk] });
  });
  const check = () => resolveFreshIdentity(request(token, { "Cf-Access-Authenticated-User-Email": "forged@example.test" }));
  assert.deepEqual(await Promise.all([check(), check()]), [{ subject, email }, { subject, email }]);
  now += 5 * 60 * 1000 - 1;
  assert.deepEqual(await check(), { subject, email });
  assert.equal(fetchKeys.mock.callCount(), 1);
  now++;
  assert.deepEqual(await check(), { subject, email });
  assert.equal(fetchKeys.mock.callCount(), 2);
});

test("a verified subject must map to an active staff record with a supported role", async t => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ keys: [jwk] }));
  const verified = request(await assertion());
  for (const record of [null, { ...staff, active: false }, { ...staff, role: null }, { ...staff, role: "guest" },
    { ...staff, subject: "different-subject" }]) {
    const repo = { findStaffBySubject: async verifiedSubject => {
      assert.equal(verifiedSubject, subject);
      return record;
    } };
    assert.equal(await resolveActor(verified, repo), null);
    const denied = await establishSession(verified, repo);
    assert.equal(denied.status, 401);
    assert.equal(denied.headers.get("Set-Cookie"), null);
  }
});

test("session establishment queries the four real staff columns and signs a short-lived cookie", async t => {
  const now = Date.now();
  t.mock.method(Date, "now", () => now);
  let rows = [[staff.id, subject, staff.role, "t"]];
  const lookup = t.mock.fn();
  t.mock.method(globalThis, "fetch", async (url, init) => {
    if (url === jwksUrl) return Response.json({ keys: [jwk] });
    lookup(url, init);
    return Response.json({ rows });
  });
  const verified = request(await assertion());
  const session = await establishSession(verified);
  assert.equal(session.status, 200);
  assert.equal(session.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await session.json(), { actor: { id: staff.id, role: staff.role } });
  const cookie = session.headers.get("Set-Cookie");
  assert.match(cookie, /^__Host-staff_session=.+; Max-Age=900; Path=\/; HttpOnly; Secure; SameSite=Lax$/);
  const cookiePair = cookie.split(";")[0];
  const sessionRequest = request(null, { Cookie: cookiePair });
  assert.deepEqual(readSessionActor(sessionRequest), staff);
  assert.equal(verify(cookiePair.split("=")[1], now).payload.exp, now + 900_000);
  const existingSession = await establishSession(sessionRequest);
  assert.equal(existingSession.status, 401);
  assert.equal(existingSession.headers.get("Set-Cookie"), null);

  for (const deniedRows of [[], [[staff.id, subject, staff.role, "f"]]]) {
    rows = deniedRows;
    assert.equal(await resolveActor(verified), null);
  }

  assert.equal(lookup.mock.callCount(), 3);
  const [url, init] = lookup.mock.calls[0].arguments;
  assert.equal(url, sqlUrl);
  assert.equal(init.method, "POST");
  assert.equal(init.headers["Neon-Array-Mode"], "true");
  assert.equal(init.headers["Neon-Raw-Text-Output"], "true");
  assert.deepEqual(JSON.parse(init.body), {
    query: "SELECT id, auth_subject, role, active FROM academy.staff WHERE auth_subject = $1",
    params: [subject],
  });
});

test("development identity is opt-in, still needs a staff mapping, and throws on production import", () => {
  const authModule = new URL("../app/lib/staff-auth.mjs", import.meta.url).href;
  const script = `
    import assert from "node:assert/strict";
    import { establishSession, resolveActor } from ${JSON.stringify(authModule)};
    const request = new Request(${JSON.stringify(sessionUrl)});
    const staff = ${JSON.stringify(staff)};
    const repository = { findStaffBySubject: async subject => subject === staff.subject ? staff : null };
    assert.equal(await resolveActor(request, { findStaffBySubject: async () => null }), null);
    assert.deepEqual(await resolveActor(request, repository), staff);
    assert.equal((await establishSession(request, repository)).status, 200);
    request.headers.set("Cf-Access-Jwt-Assertion", "invalid");
    assert.equal(await resolveActor(request, repository), null);
  `;
  const env = { ...process.env, STAFF_DEV_IDENTITY: subject };
  const development = spawnSync(process.execPath, ["--input-type=module", "-e", script],
    { env: { ...env, NODE_ENV: "test" }, encoding: "utf8" });
  assert.equal(development.status, 0, development.stderr);

  for (const value of [subject, ""]) {
    const production = spawnSync(process.execPath, ["--input-type=module", "-e", `import "${authModule}"`],
      { env: { ...env, NODE_ENV: "production", STAFF_DEV_IDENTITY: value }, encoding: "utf8" });
    assert.equal(production.status, 1);
    assert.match(production.stderr, /STAFF_DEV_IDENTITY is forbidden in production/);
  }
});
