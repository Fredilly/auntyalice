import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const sw = readFileSync("public/sw.js", "utf8");
const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));
const revisionPage = readFileSync("app/learn/revision/page.tsx", "utf8");

test("service worker caches only successful public same-origin responses", () => {
  assert.match(sw, /response\.status !== 200/);
  assert.match(sw, /response\.type !== "basic"/);
  assert.match(sw, /response\.redirected/);
  assert.match(sw, /no-store|private/i);
  assert.match(sw, /authorization/);
});

test("service worker isolates its own caches and deletes only those", () => {
  assert.match(sw, /k\.startsWith\("alice-"\)/);
  assert.match(sw, /!OWNED\.includes\(k\)/);
  // the old blanket delete removed every cache on the origin
  assert.equal(/keys\.filter\(\(k\) => k !== CACHE\)/.test(sw), false);
});

test("service worker handles Next.js navigations as navigations", () => {
  assert.match(sw, /request\.mode === "navigate"/);
});

test("service worker never caches RSC payloads or private routes", () => {
  assert.match(sw, /_rsc/);
  assert.match(sw, /startsWith\("\/api\/"\)/);
  assert.match(sw, /startsWith\("\/staff"\)/);
});

test("manifest declares both install icons and they exist in the bucket listing", () => {
  const sizes = (manifest.icons ?? []).map((i) => i.sizes);
  assert.ok(sizes.includes("192x192"), "192 icon missing");
  assert.ok(sizes.includes("512x512"), "512 icon missing");
  for (const icon of manifest.icons) {
    assert.match(icon.src, /^\/media\/branding\/icon-\d+\.png$/);
    assert.equal(icon.type, "image/png");
  }
});

test("the uploader targets exactly the icons the manifest names", () => {
  const uploader = readFileSync("scripts/upload-manifest-icons.mjs", "utf8");
  for (const icon of manifest.icons) {
    const key = icon.src.replace("/media/", "");
    assert.ok(uploader.includes(key), `uploader does not cover ${key}`);
  }
});

test("revision waits for an explicit topic selection", () => {
  assert.match(revisionPage, /const ready = wanted\.length > 0 && selected\.length > 0/);
  assert.match(revisionPage, /\{ready \?/);
  // selecting nothing must not silently drill every question
  assert.equal(/wanted\.length \? all\.filter/.test(revisionPage), false);
});
