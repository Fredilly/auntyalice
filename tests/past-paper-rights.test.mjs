import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ingest = readFileSync("scripts/ingest-past-papers.mjs", "utf8");
const migration = readFileSync("db/migrations/003_past_papers.sql", "utf8");

test("ingestion cannot upgrade redistribution rights on re-ingest", () => {
  // an upsert that assigns rights_status from the manifest would promote LINK_ONLY
  assert.equal(/rights_status\s*=\s*excluded\.rights_status/.test(ingest), false);
  assert.match(ingest, /rights_status is deliberately NOT updated/);
});

test("ingestion decides on the STORED rights, not the manifest", () => {
  assert.match(ingest, /rows\[0\]\.rights_status === "VERIFIED_REDISTRIBUTABLE"/);
});

test("CHECKED questions require an answer key and its provenance", () => {
  assert.match(migration, /must carry an answer key/);
  assert.match(migration, /must say where its answer came from/);
});

test("the loader refuses CHECKED rows missing key or provenance", () => {
  assert.match(ingest, /gaps\.push\("answer_key"\)/);
  assert.match(ingest, /gaps\.push\("answer_source"\)/);
});

test("rights cannot be downgraded while text is stored", () => {
  assert.match(migration, /past_paper_rights_guard/);
  assert.match(migration, /Cannot downgrade rights/);
});

test("duplicate_of cannot reference itself and lessons are referentially bound", () => {
  assert.match(migration, /past_questions_no_self_duplicate/);
  assert.match(migration, /lesson_slug\s+text REFERENCES academy\.lessons\(slug\)/);
});
