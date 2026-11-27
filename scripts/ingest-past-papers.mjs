#!/usr/bin/env node
/**
 * Past-paper ingestion. Refuses anything it cannot attribute.
 *
 * Usage: node scripts/ingest-past-papers.mjs <manifest.json>
 *
 * A manifest entry is one paper plus its questions. The loader enforces:
 *   - a source_url and source_name on every paper
 *   - rights_status of VERIFIED_REDISTRIBUTABLE to store question text
 *   - LINK_ONLY stores metadata only; body_text is never written
 *   - UNVERIFIED is quarantined: metadata is recorded, nothing is importable
 *   - every question needs an explanation before it may be marked CHECKED
 *
 * It will not invent a question, guess an answer key, or upgrade a rights status.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const line = readFileSync(process.env.HOME + "/.config/auntyalice/dev.env", "utf8")
  .split("\n").find((x) => x.startsWith("DATABASE_URL="));
const c = new pg.Client({
  connectionString: line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, ""),
  ssl: { rejectUnauthorized: true },
});
await c.connect();

const manifest = JSON.parse(readFileSync(process.argv[2], "utf8"));
const BODIES = new Set(["WAEC", "JAMB", "NECO", "BECE", "COMMON_ENTRANCE"]);
const RIGHTS = new Set(["VERIFIED_REDISTRIBUTABLE", "LINK_ONLY", "UNVERIFIED"]);

let papers = 0, imported = 0, quarantined = 0;

for (const paper of manifest.papers ?? []) {
  const fail = [];
  if (!BODIES.has(paper.body)) fail.push("unknown examining body");
  if (!paper.source_url?.startsWith("https://")) fail.push("source_url must be https");
  if (!paper.source_name) fail.push("source_name required");
  if (!RIGHTS.has(paper.rights_status)) fail.push("rights_status required");
  if (!Number.isInteger(paper.year)) fail.push("year required");
  if (fail.length) { console.error("SKIP paper:", fail.join(", "), paper.subject, paper.year); continue; }

  const { rows } = await c.query(
    `insert into academy.past_papers(body, year, subject, paper, title, source_url, source_name,
       rights_status, licence_note, checked_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,current_date)
     on conflict (body, year, subject, paper) do update set source_url=excluded.source_url,
       rights_status=excluded.rights_status, licence_note=excluded.licence_note, checked_at=current_date
     returning id, rights_status`,
    [paper.body, paper.year, paper.subject, paper.paper ?? "Paper 1", paper.title ?? null,
     paper.source_url, paper.source_name, paper.rights_status, paper.licence_note ?? null],
  );
  const paperId = rows[0].id;
  papers++;

  if (rows[0].rights_status === "UNVERIFIED") {
    quarantined += (paper.questions ?? []).length;
    console.log("QUARANTINED", paper.body, paper.subject, paper.year, "- rights unverified");
    continue;
  }

  for (const q of paper.questions ?? []) {
    if (!Number.isInteger(q.question_no)) continue;
    const storeText = rows[0].rights_status === "VERIFIED_REDISTRIBUTABLE";
    if (q.verification === "CHECKED" && !q.explanation) {
      console.error("  skip q" + q.question_no + ": marked CHECKED without an explanation");
      continue;
    }
    try {
      await c.query(
        `insert into academy.past_questions(paper_id, question_no, topic, syllabus_ref, body_text,
           options, answer_key, answer_source, explanation, diagram_url, difficulty, verification, lesson_slug)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         on conflict (paper_id, question_no) do nothing`,
        [paperId, q.question_no, q.topic ?? null, q.syllabus_ref ?? null,
         storeText ? (q.body_text ?? null) : null,
         storeText ? (q.options ? JSON.stringify(q.options) : null) : null,
         q.answer_key ?? null, q.answer_source ?? null, q.explanation ?? null,
         q.diagram_url ?? null, q.difficulty ?? null, q.verification ?? "UNVERIFIED", q.lesson_slug ?? null],
      );
      imported++;
    } catch (error) {
      console.error("  q" + q.question_no + " refused by guard:", error.message);
    }
  }
}

const cov = await c.query("select * from academy.past_coverage order by body, subject, year");
console.log({ papers, imported, quarantined });
console.table(cov.rows);
await c.end();
