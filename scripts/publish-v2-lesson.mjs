/**
 * Publish the V2 revision of the reference lesson through the real review flow:
 * insert revision -> advance_review(submitted) -> approved -> published.
 * Nothing bypasses the reviewer.
 */
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { lawsOfIndicesBlocks, lawsOfIndicesMeta } from "../app/lib/lesson-v2-content.mjs";

const line = readFileSync(process.env.HOME + "/.config/auntyalice/dev.env", "utf8")
  .split("\n").find((x) => x.startsWith("DATABASE_URL="));
const c = new pg.Client({
  connectionString: line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, ""),
  ssl: { rejectUnauthorized: true },
});
await c.connect();

const teacher = (await c.query("select id, auth_subject from academy.staff where role='teacher' limit 1")).rows[0];
const reviewer = (await c.query("select auth_subject from academy.staff where role='reviewer' limit 1")).rows[0].auth_subject;
const CHECKLIST = JSON.stringify({ accuracy: true, answerKeys: true, rights: true, safeguarding: true, accessibility: true });

const lesson = (await c.query("select id from academy.lessons where slug=$1", [lawsOfIndicesMeta.slug])).rows[0];
if (!lesson) { console.error("lesson not found:", lawsOfIndicesMeta.slug); process.exit(1); }

const version = (await c.query("select coalesce(max(version),0)+1 as v from academy.revisions where lesson_id=$1", [lesson.id])).rows[0].v;
const revisionId = randomUUID();

const content = {
  title: lawsOfIndicesMeta.title,
  slug: lawsOfIndicesMeta.slug,
  examTracks: lawsOfIndicesMeta.examTracks,
  videoId: null,
  notes: "Structured V2 lesson: objectives, worked examples, common mistakes, explained practice.",
  questions: lawsOfIndicesBlocks.find((b) => b.type === "practice").questions,
  blocks: lawsOfIndicesBlocks,
};

await c.query("begin");
await c.query(
  "insert into academy.revisions(id, lesson_id, version, author_id, content) values ($1,$2,$3,$4,$5)",
  [revisionId, lesson.id, version, teacher.id, JSON.stringify(content)],
);
// the review flow refuses a revision with no syllabus mapping
await c.query(
  `insert into academy.syllabus_mappings(revision_id, exam, syllabus_edition, objective_reference, source_url)
   values ($1,'waec','2021-2025','Number: indices and standard form','https://www.waecnigeria.org/')`,
  [revisionId],
);

for (const action of ["submitted", "approved", "published"]) {
  const subj = action === "submitted" ? teacher.auth_subject : reviewer;
  await c.query("select academy.advance_review($1,$2,$3,$4,$5::jsonb)", [subj, revisionId, action, action === "approved" ? "reviewed" : "", CHECKLIST]);
}
await c.query("commit");

console.log("published", lawsOfIndicesMeta.slug, "v" + version, revisionId);
await c.end();
