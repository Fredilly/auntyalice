import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseNotConfiguredError, getPool } from "../app/lib/db.mjs";
import {
  getLesson, getPublishedRevision, listLessonsForStaff, renameLesson, saveDraft, transitionLesson,
} from "../app/lib/lesson-storage.mjs";

const ownerId = "synthetic-owner";
const slug = "synthetic-input";
const mapping = {
  exam: "waec", syllabusEdition: "Synthetic edition",
  objectiveReference: "Synthetic objective", sourceUrl: "https://example.invalid/synthetic",
};
const syllabusMappings = [mapping, { ...mapping, objectiveReference: "Teacher's second objective" }];
const content = { title: "Teacher's synthetic lesson", syllabusMappings };

function mockDatabase(queryResult = () => ({ rows: [] })) {
  const calls = [];
  const releases = [];
  const client = {
    async query(sql, parameters) {
      const statement = sql.trim().replace(/\s+/g, " ");
      calls.push([statement, parameters]);
      return queryResult(statement, parameters);
    },
    release(discard) {
      releases.push(discard);
    },
  };
  return { db: { query: client.query, connect: async () => client }, calls, releases };
}

test("saveDraft inserts only granted lesson columns, then the revision and mapping, in one transaction", async () => {
  const { db, calls, releases } = mockDatabase();
  const { lessonId, revisionId } = await saveDraft({ slug, ownerId, content }, db);

  assert.deepEqual(calls, [
    ["BEGIN", undefined],
    ["INSERT INTO academy.lessons (id, slug, owner_id) VALUES ($1, $2, $3)", [lessonId, slug, ownerId]],
    ["INSERT INTO academy.revisions (id, lesson_id, version, author_id, content) SELECT $1, $2, coalesce(max(version), 0) + 1, $3, $4::jsonb FROM academy.revisions WHERE lesson_id = $2",
      [revisionId, lessonId, ownerId, { title: content.title }]],
    [
      "INSERT INTO academy.syllabus_mappings (revision_id, exam, syllabus_edition, objective_reference, source_url) " +
      'SELECT $1::uuid, exam, "syllabusEdition", "objectiveReference", "sourceUrl" ' +
      'FROM jsonb_to_recordset($2::jsonb) AS mapping( exam text, "syllabusEdition" text, "objectiveReference" text, "sourceUrl" text )',
      [revisionId, JSON.stringify(syllabusMappings)],
    ],
    ["COMMIT", undefined],
  ]);
  assert.deepEqual(releases, [false]);
});

test("saving an existing lesson locks it and appends a version without updating revisions", async () => {
  const lessonId = "synthetic-lesson";
  const { db, calls } = mockDatabase(statement => {
    if (statement.endsWith("FOR UPDATE")) return { rows: [{ owner_id: ownerId, slug }] };
    return { rows: [] };
  });
  await saveDraft({ lessonId, slug: "new-slug", ownerId, content }, db);
  assert.deepEqual(calls[1], ["SELECT owner_id, slug FROM academy.lessons WHERE id = $1 FOR UPDATE", [lessonId]]);
  assert.deepEqual(calls[2], ["UPDATE academy.lessons SET slug = $2 WHERE id = $1", [lessonId, "new-slug"]]);
  assert.match(calls[3][0], /^INSERT INTO academy\.revisions /);
  assert.ok(calls.every(([sql]) => !/UPDATE academy\.revisions/i.test(sql)));
});

test("a stale editor revision rolls back before appending content", async () => {
  const { db, calls } = mockDatabase(statement => {
    if (statement.endsWith("FOR UPDATE")) return { rows: [{ owner_id: ownerId, slug }] };
    return { rows: [{ id: "newer-revision", state: "draft", author_id: ownerId }] };
  });
  await assert.rejects(saveDraft({
    lessonId: "synthetic-lesson", expectedRevisionId: "old-revision", slug, ownerId, content,
  }, db), { status: 409 });
  assert.equal(calls.at(-1)[0], "ROLLBACK");
  assert.ok(calls.every(([sql]) => !/^INSERT INTO/i.test(sql)));
});

test("saveDraft rolls back on a syllabus insert error after inserting the lesson and revision", async () => {
  const failure = new Error("Synthetic mapping failure");
  const { db, calls, releases } = mockDatabase(statement => {
    if (statement.startsWith("INSERT INTO academy.syllabus_mappings")) throw failure;
    return { rows: [] };
  });
  await assert.rejects(saveDraft({ slug, ownerId, content }, db), error => error === failure);
  assert.deepEqual(calls.at(-1), ["ROLLBACK", undefined]);
  assert.ok(calls.every(([sql]) => sql !== "COMMIT"));
  assert.deepEqual(releases, [false]);
});

test("transitionLesson makes one function call and binds the session actor ID and decision", async () => {
  const { db, calls } = mockDatabase(() => ({ rows: [{ state: "approved" }] }));
  const input = {
    revisionId: "synthetic-revision", actorId: "synthetic-reviewer", action: "approved",
    reason: "Reviewer's note", checklist: { accuracy: true },
  };
  assert.equal(await transitionLesson(input, db), "approved");
  assert.deepEqual(calls, [
    ["SELECT academy.advance_review( (SELECT auth_subject FROM academy.staff WHERE id = $1::uuid AND active), $2, $3, $4, $5 ) AS state",
      [input.actorId, input.revisionId, input.action, input.reason, input.checklist]],
  ]);
});

test("lesson reads and renames bind all inputs, and the public read uses only the projection", async () => {
  const { db, calls } = mockDatabase();
  const actor = { id: ownerId, role: "teacher" };
  await listLessonsForStaff(actor.id, actor.role, db);
  await getLesson("synthetic-lesson", actor, db);
  await renameLesson("synthetic-lesson", slug, db);
  await getPublishedRevision(slug, db);
  assert.deepEqual(calls.map(([, parameters]) => parameters), [
    [ownerId, actor.role], [ownerId, actor.role, "synthetic-lesson"], ["synthetic-lesson", slug], [slug],
  ]);
  for (const [sql, parameters] of calls) {
    assert.ok(parameters.every(value => !sql.includes(value) || value === actor.role));
  }
  assert.match(calls[0][0], /id = \$1 AND role = \$2/);
  assert.match(calls[1][0], /l\.id = \$3/);
  assert.equal(calls[3][0], "SELECT slug, version, content FROM academy.public_lessons WHERE slug = $1");
});

test("missing DATABASE_URL has a typed error before opening a connection", () => {
  const previous = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    assert.throws(getPool, error =>
      error instanceof DatabaseNotConfiguredError && error.code === "database_not_configured");
  } finally {
    if (previous !== undefined) process.env.DATABASE_URL = previous;
  }
});
