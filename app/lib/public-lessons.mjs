import { withDatabase } from "./db.mjs";

/**
 * Acceptance-test artefacts live in the same table as real lessons. They must never
 * appear in the public catalogue: a student seeing "M2 Acceptance Lesson" destroys
 * trust in the whole Academy. db/migrations/004 removes them properly; this filter is
 * the belt to that migration's braces.
 */
const FIXTURE_SLUGS = new Set(["m2-acceptance", "isolation-probe", "submit-practice", "smoke"]);
const isFixture = (slug) => FIXTURE_SLUGS.has(slug) || /^(m2-|isolation-|test-|fixture-)/.test(slug);

const query = (sql) => withDatabase(db => db.query(sql));

/** True when the database answers a trivial query. Lets pages tell "no content"
 *  apart from "the database is unreachable", which look identical to a visitor. */
export async function databaseReachable() {
  try {
    await query("select 1 from academy.public_lessons limit 1");
    return true;
  } catch {
    return false;
  }
}

/** Published lessons with their metadata, for the learning dashboard. */
export async function listPublishedLessons() {
  if (!process.env.DATABASE_URL) return [];
  try {
    const { rows } = await query("select slug, content from academy.public_lessons order by slug");
    return rows.filter((row) => !isFixture(row.slug)).map((row) => {
      const content = row.content ?? {};
      const exams = Array.isArray(content.examTracks) && content.examTracks.length ? content.examTracks : [];
      return {
        slug: row.slug,
        title: content.title ?? row.slug,
        questions: Array.isArray(content.questions) ? content.questions.length : 0,
        exam: exams.length ? exams.map((e) => String(e).toUpperCase()).join(", ") : "Academy",
      };
    });
  } catch (error) {
    if (error?.code === "42P01") return [];
    throw error;
  }
}

/** Every published lesson's questions, flattened for the timed mock. */
export async function listPublishedQuestions() {
  if (!process.env.DATABASE_URL) return [];
  const { rows } = await query(
    "select slug, content from academy.public_lessons order by slug",
  );
  const out = [];
  for (const row of rows) {
    if (isFixture(row.slug)) continue;
    const content = row.content ?? {};
    for (const q of content.questions ?? []) {
      if (!q?.id || typeof q.prompt !== "string" || !Array.isArray(q.options)) continue;
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) continue;
      out.push({
        id: `${row.slug}:${q.id}`, prompt: q.prompt, options: q.options,
        answer: q.answer, explanation: q.explanation ?? "",
        lesson: content.title ?? row.slug, slug: row.slug,
      });
    }
  }
  return out;
}
