import test from "node:test";
import assert from "node:assert/strict";
import { cacheControlFor, isHashedAsset } from "../app/lib/cache-policy.mjs";

test("HTML never gets a long edge cache", () => {
  const v = cacheControlFor("/", "text/html; charset=utf-8");
  assert.match(v, /s-maxage=60\b/);
  assert.doesNotMatch(v, /s-maxage=31536000/);
});

test("RSC payloads revalidate like HTML", () => {
  assert.equal(cacheControlFor("/learn", "text/x-component"), cacheControlFor("/", "text/html"));
});

test("hashed build assets are immutable", () => {
  assert.match(cacheControlFor("/_next/static/chunks/main-8f3a2b1c9d.js", "application/javascript"), /immutable/);
  assert.equal(isHashedAsset("/_next/static/chunks/main-8f3a2b1c9d.js"), true);
});

test("media keeps its own policy and is not treated as HTML", () => {
  assert.equal(cacheControlFor("/media/branding/logo-mark.svg", "image/svg+xml"),
               "public, max-age=3600, stale-while-revalidate=86400");
});

test("unknown content types fall back to the safe HTML policy", () => {
  assert.equal(cacheControlFor("/whatever", ""), cacheControlFor("/", "text/html"));
});
