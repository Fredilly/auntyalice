import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sw = readFileSync("public/sw.js", "utf8");
const mediaRoute = readFileSync("app/media/[...path]/route.ts", "utf8");
const dashboard = readFileSync("app/components/learning-dashboard.tsx", "utf8");
const progress = readFileSync("app/lib/progress.ts", "utf8");

test("the dashboard itself is precached for offline use", () => {
  assert.match(sw, /const SHELL = \["\/learn", "\/offline"\]/);
});

test("media binding is resolved the way OpenNext actually exposes it", () => {
  assert.match(mediaRoute, /getCloudflareContext/);
  assert.match(mediaRoute, /__env\?\.MEDIA/);
  assert.match(mediaRoute, /process\?\.env\?\.MEDIA/);
  // resolution must not throw when the module is unavailable (local dev, tests)
  assert.match(mediaRoute, /catch \{/);
});

test("dashboard progress is read from local storage, never invented", () => {
  assert.match(dashboard, /readProgress/);
  // no hard-coded counters or fake percentages
  assert.equal(/students|enrolled|\d{2,}% of students/i.test(dashboard), false);
  assert.match(progress, /alice\.progress\.v1/);
  assert.match(progress, /window\.localStorage/);
});

test("dashboard degrades when storage is unavailable", () => {
  assert.match(progress, /catch \{\s*\/\* private mode/);
});

test("offline banner and save-for-offline are wired", () => {
  assert.match(dashboard, /navigator\.onLine/);
  assert.match(dashboard, /saveLessonsForOffline/);
});
