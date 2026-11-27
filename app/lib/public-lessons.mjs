import { Pool } from "pg";

let pool;
function db() {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  pool = new Pool({ connectionString: url, max: 2, ssl: { rejectUnauthorized: true } });
  return pool;
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
    const content = row.content ?? {};
    for (const q of content.questions ?? []) {
      if (!q?.id || typeof q.prompt !== "string" || !Array.isArray(q.options)) continue;
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) continue;
      out.push({
        id: `${row.slug}:${q.id}`, prompt: q.prompt, options: q.options,
        answer: q.answer, explanation: q.explanation ?? "", lesson: content.title ?? row.slug,
      });
    }
  }
  return out;
}
