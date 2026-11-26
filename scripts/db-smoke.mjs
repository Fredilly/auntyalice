import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { DatabaseNotConfiguredError, getPool } from "../app/lib/db.mjs";
import { getLesson, getPublishedRevision, insertDraft, listLessonsForStaff, transitionLesson } from "../app/lib/lesson-storage.mjs";
import { reviewChecklist } from "../app/lib/publishing.mjs";

let pool;
let stage = "database configuration";
try {
  pool = getPool();
  stage = "database connection";
  const client = await pool.connect();
  let discard = false;
  let lessonId;
  try {
    await client.query("BEGIN");

    stage = "current role";
    const { rows: [attributes] } = await client.query(`
      SELECT current_user, rolsuper, rolcreaterole, rolcreatedb, rolcanlogin, rolreplication, rolbypassrls, rolinherit
      FROM pg_catalog.pg_roles WHERE rolname = current_user`);
    assert.ok(attributes);
    console.log(JSON.stringify(attributes));

    const reads = {
      staff: "SELECT 1 FROM academy.staff LIMIT 1",
      lessons: "SELECT 1 FROM academy.lessons LIMIT 1",
      revisions: "SELECT 1 FROM academy.revisions LIMIT 1",
      review_events: "SELECT 1 FROM academy.review_events LIMIT 1",
      syllabus_mappings: "SELECT 1 FROM academy.syllabus_mappings LIMIT 1",
      public_lessons: "SELECT 1 FROM academy.public_lessons LIMIT 1",
    };
    for (const [table, query] of Object.entries(reads)) {
      stage = `read academy.${table}`;
      await client.query(query);
      console.log(`Readable: academy.${table}`);
    }

    stage = "staff count";
    const { rows: [{ count }] } = await client.query("SELECT count(*) FROM academy.staff");
    console.log(`Staff rows: ${count}`);

    stage = "find an active teacher and reviewer or administrator";
    const { rows: [teacher] } = await client.query(
      "SELECT id FROM academy.staff WHERE active AND role = 'teacher' ORDER BY id LIMIT 1",
    );
    const { rows: [reviewer] } = await client.query(
      "SELECT id FROM academy.staff WHERE active AND role IN ('reviewer', 'admin') ORDER BY id LIMIT 1",
    );
    assert.ok(teacher && reviewer);

    stage = "create synthetic draft";
    const draftSlug = `synthetic-db-smoke-${randomUUID()}`;
    const slug = `${draftSlug}-revised`;
    const title = "Synthetic database smoke lesson";
    const content = {
      title, notes: "Synthetic data for database verification.", videoId: null, questions: [], examTracks: ["waec"],
      syllabusMappings: [{
        exam: "waec", syllabusEdition: "Synthetic", objectiveReference: "Synthetic", sourceUrl: "https://example.invalid/syllabus",
      }],
    };
    const draft = await insertDraft(client, { slug: draftSlug, ownerId: teacher.id, content });
    lessonId = draft.lessonId;
    assert.equal(await getPublishedRevision(draftSlug, client), null);

    stage = "append a revision and verify staff reads";
    const { revisionId } = await insertDraft(client, {
      lessonId, expectedRevisionId: draft.revisionId, slug, ownerId: teacher.id, content,
    });
    const actor = { id: teacher.id, role: "teacher" };
    const latest = await getLesson(lessonId, actor, client);
    assert.equal(latest?.slug, slug);
    assert.equal(latest?.revision_id, revisionId);
    assert.equal(latest?.version, 2);
    assert.deepEqual(latest?.mappings, content.syllabusMappings);
    assert.ok((await listLessonsForStaff(teacher.id, actor.role, client))
      .some(lesson => lesson.id === lessonId && lesson.state === "draft"));
    assert.equal(await getPublishedRevision(slug, client), null);

    stage = "submit draft";
    assert.equal(await transitionLesson({ revisionId, actorId: teacher.id, action: "submitted" }, client), "submitted");

    stage = "approve revision";
    const checklist = Object.fromEntries(Object.keys(reviewChecklist).map(key => [key, true]));
    assert.equal(await transitionLesson({ revisionId, actorId: reviewer.id, action: "approved", checklist }, client), "approved");
    assert.equal(await getPublishedRevision(slug, client), null);

    stage = "publish revision and read public_lessons";
    assert.equal(await transitionLesson({ revisionId, actorId: reviewer.id, action: "published" }, client), "published");
    const published = await getPublishedRevision(slug, client);
    assert.equal(published?.version, 2);
    assert.equal(published?.content.title, title);
  } finally {
    try {
      await client.query("ROLLBACK");
    } catch {
      discard = true;
      stage = "rollback";
      throw new Error("Rollback failed.");
    } finally {
      client.release(discard);
    }
  }
  stage = "verify rollback";
  const { rows } = await pool.query("SELECT id FROM academy.lessons WHERE id = $1", [lessonId]);
  assert.equal(rows.length, 0);
  console.log("Synthetic draft, revision, staff reads, submission, approval, publication and public read passed. Rollback verified.");
} catch (error) {
  const missing = error instanceof DatabaseNotConfiguredError ? " (database_not_configured)" : "";
  console.error(`Database smoke failed at ${stage}${missing}.`);
  process.exitCode = 1;
} finally {
  if (pool) {
    try {
      await pool.end();
    } catch {
      console.error("Database smoke failed to close the pool.");
      process.exitCode = 1;
    }
  }
}
