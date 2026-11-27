import { Pool } from "pg";

/**
 * Acceptance-test artefacts live in the same table as real lessons. They must never
 * appear in the public catalogue: a student seeing "M2 Acceptance Lesson" destroys
 * trust in the whole Academy. db/migrations/004 removes them properly; this filter is
 * the belt to that migration's braces.
 */
const FIXTURE_SLUGS = new Set(["m2-acceptance", "isolation-probe", "submit-practice", "smoke"]);
const isFixture = (slug) => FIXTURE_SLUGS.has(slug) || /^(m2-|isolation-|test-|fixture-)/.test(slug);

let pool;
function db() {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  pool = new Pool({ connectionString: url, max: 2, ssl: { rejectUnauthorized: true } });
  return pool;
}

/** Published lessons with their metadata, for the learning dashboard. */
export async function listPublishedLessons() {
  const p = db();
  if (!p) return [];
  try {
    const { rows } = await p.query("select slug, content from academy.public_lessons order by slug");
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
  const p = db();
  if (!p) return [];
  const { rows } = await p.query(
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
