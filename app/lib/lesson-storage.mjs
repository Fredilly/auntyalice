import { randomUUID } from "node:crypto";
import { withDatabase } from "./db.mjs";

const database = {
  query: (sql, parameters) => withDatabase(db => db.query(sql, parameters)),
};

const latestRevision = `
  FROM academy.lessons l
  JOIN LATERAL (
    SELECT id, version, author_id, content, created_at
    FROM academy.revisions WHERE lesson_id = l.id ORDER BY version DESC LIMIT 1
  ) r ON true
  LEFT JOIN LATERAL (
    SELECT action FROM academy.review_events WHERE revision_id = r.id ORDER BY id DESC LIMIT 1
  ) e ON true`;

const state = "coalesce(e.action, 'draft')";
const visible = `(
  $2::text IN ('reviewer', 'admin')
  OR ($2 = 'teacher' AND (l.owner_id = $1 OR e.action IN ('submitted', 'approved')))
)`;
const activeStaff = `EXISTS (
  SELECT 1 FROM academy.staff WHERE id = $1 AND role = $2 AND active
)`;

export async function listLessonsForStaff(staffId, role, db = database) {
  const { rows } = await db.query(`
    SELECT l.id, coalesce(r.content->>'title', l.slug) AS title, ${state} AS state
    ${latestRevision}
    WHERE ${activeStaff} AND ${visible}
    ORDER BY r.created_at DESC, l.id`, [staffId, role]);
  return rows;
}

export async function getLesson(id, actor = null, db = database) {
  const { rows } = await db.query(`
    SELECT l.id, l.slug, l.owner_id, l.published_revision_id, l.created_at,
      r.id AS revision_id, r.version, r.author_id, r.created_at AS revision_created_at, r.content, ${state} AS state,
      coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'exam', exam, 'syllabusEdition', syllabus_edition,
          'objectiveReference', objective_reference, 'sourceUrl', source_url
        ) ORDER BY exam, syllabus_edition, objective_reference)
        FROM academy.syllabus_mappings WHERE revision_id = r.id
      ), '[]'::jsonb) AS mappings
    ${latestRevision}
    WHERE l.id = $3 AND ($1::uuid IS NULL OR (${activeStaff} AND ${visible}))`,
  [actor?.id ?? null, actor?.role ?? null, id]);
  return rows[0] ?? null;
}

export async function listReviewQueue(staffId, role, db = database) {
  const { rows } = await db.query(`
    SELECT l.id, coalesce(r.content->>'title', l.slug) AS title, ${state} AS state,
      r.content->'notes' AS notes, r.content->'examTracks' AS exam_tracks,
      (SELECT created_at FROM academy.review_events
       WHERE revision_id = r.id AND action = 'submitted' ORDER BY id DESC LIMIT 1) AS submitted_at,
      ARRAY(SELECT DISTINCT exam FROM academy.syllabus_mappings WHERE revision_id = r.id ORDER BY exam) AS mapped_exams
    ${latestRevision}
    WHERE $2::text IN ('reviewer', 'admin') AND ${activeStaff} AND e.action IN ('submitted', 'approved')
    ORDER BY submitted_at DESC, l.id`, [staffId, role]);
  return rows;
}

export async function withTransaction(db, work) {
  const client = await db.connect();
  let discard = false;
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      discard = true;
    }
    throw error;
  } finally {
    client.release(discard);
  }
}

export async function renameLesson(id, slug, db = database) {
  const result = await db.query("UPDATE academy.lessons SET slug = $2 WHERE id = $1", [id, slug]);
  return result.rowCount === 1;
}

// The caller owns the transaction when composing this with submission or smoke checks.
export async function insertDraft(client, { lessonId, slug, ownerId, content, expectedRevisionId }) {
  let previousContent;
  if (lessonId) {
    // Match the lesson lock in advance_review. UPDATE on slug permits this row lock.
    const { rows: [lesson] } = await client.query(
      "SELECT owner_id, slug FROM academy.lessons WHERE id = $1 FOR UPDATE", [lessonId],
    );
    if (!lesson || lesson.owner_id !== ownerId) throw new LessonWriteError(403, "Only the owner can edit this lesson.");

    if (expectedRevisionId) {
      const { rows: [current] } = await client.query(`
        SELECT r.id, r.author_id, r.content, ${state} AS state
        FROM academy.revisions r
        LEFT JOIN LATERAL (
          SELECT action FROM academy.review_events WHERE revision_id = r.id ORDER BY id DESC LIMIT 1
        ) e ON true
        WHERE r.lesson_id = $1 ORDER BY r.version DESC LIMIT 1`, [lessonId]);
      if (current?.id !== expectedRevisionId || !["draft", "changes_requested"].includes(current.state)) {
        throw new LessonWriteError(409, "This lesson changed. Copy your edits before reloading the page.");
      }
      if (current.author_id !== ownerId) throw new LessonWriteError(403, "Only the authoring teacher can edit this draft.");
      previousContent = current.content;
    }
    if (lesson.slug !== slug) await renameLesson(lessonId, slug, client);
  } else {
    lessonId = randomUUID();
    await client.query("INSERT INTO academy.lessons (id, slug, owner_id) VALUES ($1, $2, $3)", [lessonId, slug, ownerId]);
  }

  const { syllabusMappings = [], ...revisionContent } = content;
  const revisionId = randomUUID();
  await client.query(`
    INSERT INTO academy.revisions (id, lesson_id, version, author_id, content)
    SELECT $1, $2, coalesce(max(version), 0) + 1, $3, $4::jsonb
    FROM academy.revisions WHERE lesson_id = $2`,
  [revisionId, lessonId, ownerId, { ...previousContent, ...revisionContent }]);

  if (syllabusMappings.length > 0) {
    await client.query(`
      INSERT INTO academy.syllabus_mappings (revision_id, exam, syllabus_edition, objective_reference, source_url)
      SELECT $1::uuid, exam, "syllabusEdition", "objectiveReference", "sourceUrl"
      FROM jsonb_to_recordset($2::jsonb) AS mapping(
        exam text, "syllabusEdition" text, "objectiveReference" text, "sourceUrl" text
      )`,
    [revisionId, JSON.stringify(syllabusMappings)]);
  }

  return { lessonId, revisionId };
}

export class LessonWriteError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function requireActiveTeacher(db, actor) {
  const { rows } = await db.query(
    "SELECT id FROM academy.staff WHERE id = $1 AND auth_subject = $2 AND active AND role = 'teacher'",
    [actor.id, actor.subject],
  );
  if (rows.length === 0) throw new LessonWriteError(403, "An active teacher session is required.");
}

export function saveDraft(draft, db) {
  const save = pool => withTransaction(pool, client => insertDraft(client, draft));
  return db ? save(db) : withDatabase(save);
}

export async function transitionLesson({ revisionId, actorId, action, reason = "", checklist = null }, db = database) {
  // The SQL function takes auth_subject. Resolve it from the server-provided staff UUID.
  const { rows } = await db.query(`
    SELECT academy.advance_review(
      (SELECT auth_subject FROM academy.staff WHERE id = $1::uuid AND active), $2, $3, $4, $5
    ) AS state`, [actorId, revisionId, action, reason, checklist]);
  return rows[0].state;
}

export async function getPublishedRevision(slug, db = database) {
  const { rows } = await db.query(
    "SELECT slug, version, content FROM academy.public_lessons WHERE slug = $1", [slug],
  );
  return rows[0] ?? null;
}
