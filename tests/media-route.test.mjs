import test from "node:test";
import assert from "node:assert/strict";
import { resolveKey, contentTypeFor, serve } from "../app/lib/media-keys.mjs";

const bucketWith = (obj) => ({ get: async () => obj });

test("accepts allowlisted prefixes", () => {
  assert.equal(resolveKey(["branding", "logo-mark.svg"]).key, "branding/logo-mark.svg");
  for (const p of ["primary", "secondary", "academy", "campus"]) {
    assert.equal(resolveKey([p, "card-4x3.svg"]).ok, true, p);
  }
});

test("refuses traversal, duplicates and empty keys", () => {
  for (const bad of [["branding", "..", "x.env"], ["../etc/passwd"], [""], ["branding//x.svg"]]) {
    assert.equal(resolveKey(bad).ok, false, JSON.stringify(bad));
  }
});

test("refuses prefixes outside the allowlist", () => {
  assert.equal(resolveKey(["db", "dev_app_role.sql"]).ok, false);
  assert.equal(resolveKey(["public", "x.svg"]).ok, false);
  assert.equal(resolveKey(["branding", "../db/x.sql"]).ok, false);
});

test("content types by extension", () => {
  assert.equal(contentTypeFor("branding/logo-mark.svg"), "image/svg+xml");
  assert.equal(contentTypeFor("campus/a.webp"), "image/webp");
  assert.equal(contentTypeFor("branding/x.bin"), "application/octet-stream");
});

test("serves an object with hardening headers", async () => {
  const res = await serve(new Request("https://x/media/branding/logo-mark.svg"),
    ["branding", "logo-mark.svg"],
    bucketWith({ body: new Blob(["<svg/>"]).stream(), httpEtag: '"abc"',
                httpMetadata: { contentType: "image/svg+xml" }, size: 6 }));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "image/svg+xml");
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.match(res.headers.get("content-security-policy") ?? "", /sandbox/);
});

test("304 on matching etag", async () => {
  const req = new Request("https://x/media/branding/a.svg", { headers: { "if-none-match": '"abc"' } });
  const res = await serve(req, ["branding", "a.svg"], bucketWith({ body: new Blob(["x"]).stream(), httpEtag: '"abc"' }));
  assert.equal(res.status, 304);
});

test("404 for missing object and disallowed prefix", async () => {
  assert.equal((await serve(new Request("https://x/m"), ["branding", "no.svg"], bucketWith(null))).status, 404);
  assert.equal((await serve(new Request("https://x/m"), ["db", "x.sql"], bucketWith(null))).status, 404);
});

test("503 when binding absent, 405 on POST", async () => {
  assert.equal((await serve(new Request("https://x/m"), ["branding", "a.svg"], undefined)).status, 503);
  assert.equal((await serve(new Request("https://x/m", { method: "POST" }), ["branding", "a.svg"], bucketWith(null))).status, 405);
});
