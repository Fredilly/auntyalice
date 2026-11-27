import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Regression guard for the P0 where public-lessons.mjs kept its own module-global
// pg Pool. Worker sockets belong to the request that opened them, so a cached pool
// fails intermittently on the second and later requests (live 500 / error 1101).
const source = readFileSync("app/lib/public-lessons.mjs", "utf8");

test("public lessons read through the request-scoped database helper", () => {
  assert.match(source, /import \{ withDatabase \} from "\.\/db\.mjs"/);
  // A second pool here bypasses withDatabase's in-Worker db.end().
  assert.equal(/from ["']pg["']/.test(source), false);
  assert.equal(/new\s+Pool\s*\(/.test(source), false);
});

test("missing configuration degrades to empty content instead of throwing", async () => {
  delete process.env.DATABASE_URL;
  const { databaseReachable, listPublishedLessons, listPublishedQuestions } =
    await import("../app/lib/public-lessons.mjs");

  assert.equal(await databaseReachable(), false);
  assert.deepEqual(await listPublishedLessons(), []);
  assert.deepEqual(await listPublishedQuestions(), []);
});
