import { Pool } from "pg";

let pool;
function db() {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  pool = new Pool({ connectionString: url, max: 2, ssl: { rejectUnauthorized: true } });
  return pool;
}

/**
 * Authentic past-question supply.
 * Degrades to "nothing available" rather than failing the page when the past-paper
 * tables have not been migrated, or when no licensed paper exists yet.
 * Returns ONLY rows that passed the rights guard — never link-only, never unverified.
 */
export async function pastQuestionCatalogue() {
  const p = db();
  if (!p) return { available: false, bodies: [], papers: [] };
  try {
    const { rows } = await p.query(
      `select p.id, p.body, p.subject, p.year, p.paper, p.title,
              count(q.id)::int as questions
       from academy.past_papers p
       join academy.past_questions q on q.paper_id = p.id
       where p.rights_status = 'VERIFIED_REDISTRIBUTABLE'
         and q.body_text is not null
       group by p.id, p.body, p.subject, p.year, p.paper, p.title
       having count(q.id) > 0
       order by p.body, p.subject, p.year desc, p.paper`,
    );
    const bodies = [...new Set(rows.map((x) => x.body))];
    return { available: rows.length > 0, bodies, papers: rows };
  } catch (error) {
    if (error?.code === "42P01") return { available: false, bodies: [], papers: [] }; // tables not migrated
    throw error;
  }
}

export async function paperQuestions(paperId) {
  const p = db();
  if (!p) return [];
  try {
    const { rows } = await p.query(
      `select question_no, body_text, options, answer_key, explanation, diagram_url
       from academy.past_questions
       where paper_id = $1 and body_text is not null
       order by question_no`,
      [paperId],
    );
    return rows.map((row) => ({
      id: `pq-${row.question_no}`,
      prompt: row.body_text,
      options: Array.isArray(row.options) ? row.options.map((o) => (typeof o === "string" ? o : o.text)) : [],
      answer: Array.isArray(row.options)
        ? row.options.findIndex((o) => (typeof o === "string" ? o : o.key) === row.answer_key)
        : -1,
      explanation: row.explanation ?? "",
      lesson: `Past paper question ${row.question_no}`,
      diagram: row.diagram_url ?? null,
    }));
  } catch (error) {
    if (error?.code === "42P01") return [];
    throw error;
  }
}
