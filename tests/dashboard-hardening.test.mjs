import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const progress = readFileSync("app/lib/progress.ts", "utf8");
const dashboard = readFileSync("app/components/learning-dashboard.tsx", "utf8");
const offline = readFileSync("app/lib/offline.ts", "utf8");
const journey = readFileSync("scripts/journey.mjs", "utf8");
const lessonsLib = readFileSync("app/lib/public-lessons.mjs", "utf8");
const nextConfig = readFileSync("next.config.ts", "utf8");

test("hydration: the dashboard renders a stable empty state on both passes", () => {
  assert.match(dashboard, /useState<ProgressState>\(EMPTY_STATE\)/);
  assert.match(dashboard, /setHydrated\(true\)/);
  // reading storage inside the render phase is the bug being prevented
  assert.equal(/useState\(readProgress\)/.test(dashboard), false);
});

test("progress counts unique questions, not attempts", () => {
  assert.match(progress, /answers: Record<string, AnswerRecord>/);
  assert.match(progress, /for \(const r of results\) answers\[r\.id\] = /);
  // the old shape incremented raw totals and double-counted re-runs
  assert.equal(/answered: prev\.answered \+ total/.test(progress), false);
});

test("revision and mock record per-question results", () => {
  const mock = readFileSync("app/components/timed-mock.tsx", "utf8");
  const revision = readFileSync("app/components/revision.tsx", "utf8");
  assert.match(mock, /recordAnswers\(slug, results\)/);
  assert.match(revision, /recordAnswers\(slug, list\)/);
});

test("saving for offline also stores the page's styles and media", () => {
  assert.match(offline, /alice-v2-assets/);
  assert.match(offline, /_next\\\/static/);
  assert.match(offline, /addAll\(missing\)/);
});

test("the browser journey fails the build when a check fails", () => {
  assert.match(journey, /process\.exitCode = failures === 0 \? 0 : 1/);
  assert.match(journey, /let failures = 0/);
});

test("acceptance-test fixtures are excluded from public content", () => {
  assert.match(lessonsLib, /FIXTURE_SLUGS/);
  assert.match(lessonsLib, /isFixture\(row\.slug\)/);
});

test("the dev overlay badge is disabled", () => {
  assert.match(nextConfig, /devIndicators: false/);
});
