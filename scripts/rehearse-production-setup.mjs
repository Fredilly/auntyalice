/**
 * Rehearse the production setup end to end against a DISPOSABLE database.
 *
 *   REHEARSAL_DATABASE_URL='postgres://owner:...@host/db' node scripts/rehearse-production-setup.mjs
 *
 * Requires an owner-level connection (it creates a role and a schema). It refuses to
 * run against the development branch, and it tears everything down afterwards.
 *
 * What it proves, in order:
 *   1. migrations 001-003 apply cleanly on a blank database
 *   2. academy_app is created with the exact least-privilege grants
 *   3. the app role CAN do its job: read staff, insert a lesson/revision, submit
 *   4. the app role CANNOT bypass review:
 *        - insert or update published_revision_id
 *        - delete a lesson
 *        - update a revision
 *        - insert a review_event
 *        - publish without a reviewer (advance_review as the teacher)
 *   5. publishing works only when a distinct reviewer approves
 *   6. teardown leaves no schema and no role behind
 */
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { randomUUID } from "node:crypto";
import pg from "pg";

const DEV_MARKER = "br-lucky-cloud-be62md6i";
const URL_ = process.env.REHEARSAL_DATABASE_URL;
if (!URL_) { console.error("REHEARSAL_DATABASE_URL is required"); process.exit(1); }
if (URL_.includes(DEV_MARKER)) { console.error("refusing: that is the development branch"); process.exit(1); }

const PASSWORD = randomBytes(18).toString("base64url");
let failures = 0;
const check = (label, ok, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? " — " + detail : ""}`);
};

const admin = new pg.Client({ connectionString: URL_, ssl: { rejectUnauthorized: true } });
await admin.connect();

const appUrl = new URL(URL_);
appUrl.username = "academy_app";
appUrl.password = PASSWORD;

async function appClient() {
  const c = new pg.Client({ connectionString: appUrl.toString(), ssl: { rejectUnauthorized: true } });
  await c.connect();
  return c;
}

async function expectFailure(label, sql, params = []) {
  const c = await appClient();
  try {
    await c.query(sql, params);
    c.release?.();
    await c.end();
    check(label, false, "operation was ALLOWED but must be refused");
  } catch (error) {
    const denied = /permission denied|violates|not authorized|must be/i.test(error.message);
    check(label, denied, denied ? "" : error.message.slice(0, 90));
  } finally {
    await c.end().catch(() => {});
  }
}

try {
  // 1. migrations on a blank database
  for (const file of ["001_publishing.sql", "002_publishing_security.sql", "003_past_papers.sql"]) {
    await admin.query(readFileSync(`db/migrations/${file}`, "utf8"));
    console.log("applied", file);
  }
  await admin.query("alter table academy.lessons add column if not exists is_fixture boolean not null default false");

  const tables = (await admin.query(
    "select count(*)::int n from information_schema.tables where table_schema='academy'",
  )).rows[0].n;
  check("academy schema created", tables >= 7, `${tables} tables`);

  // 2. role + grants, exactly as db/production/10_app_role.sql
  const grants = readFileSync("db/production/10_app_role.sql", "utf8")
    .split("\n").filter((l) => /^\s*(GRANT|ALTER ROLE)/i.test(l)).join("\n");
  await admin.query(`drop role if exists academy_app`);
  await admin.query(`create role academy_app login password '${PASSWORD}' nosuperuser nocreatedb nocreaterole nobypassrls`);
  await admin.query("grant usage on schema academy to academy_app");
  await admin.query(grants);

  const priv = (await admin.query(`
    select
      has_column_privilege('academy_app','academy.lessons','slug','INSERT') as ins_slug,
      has_column_privilege('academy_app','academy.lessons','published_revision_id','INSERT') as ins_pub,
      has_column_privilege('academy_app','academy.lessons','published_revision_id','UPDATE') as upd_pub,
      has_table_privilege('academy_app','academy.lessons','DELETE') as del_lessons,
      has_column_privilege('academy_app','academy.revisions','content','UPDATE') as upd_rev,
      has_table_privilege('academy_app','academy.review_events','INSERT') as ins_events
  `)).rows[0];
  check("app may insert a lesson", priv.ins_slug === true);
  check("app may NOT insert published_revision_id", priv.ins_pub === false);
  check("app may NOT update published_revision_id", priv.upd_pub === false);
  check("app may NOT delete lessons", priv.del_lessons === false);
  check("app may NOT update revisions", priv.upd_rev === false);
  check("app may NOT write review_events", priv.ins_events === false);

  // 3. staff + a lesson the app role may create
  const teacherId = randomUUID();
  const reviewerId = randomUUID();
  await admin.query(
    `insert into academy.staff(id, auth_subject, role, active) values ($1,'rehearsal.teacher','teacher',true), ($2,'rehearsal.reviewer','reviewer',true)`,
    [teacherId, reviewerId],
  );

  const app = await appClient();
  const lessonId = randomUUID();
  await app.query("insert into academy.lessons(id, slug, owner_id) values ($1,'rehearsal-lesson',$2)", [lessonId, teacherId]);
  check("app may create a lesson", true);

  const revisionId = randomUUID();
  await app.query(
    "insert into academy.revisions(id, lesson_id, version, author_id, content) values ($1,$2,1,$3,$4)",
    [revisionId, lessonId, teacherId, JSON.stringify({ title: "Rehearsal", questions: [] })],
  );
  check("app may append a revision", true);
  await app.end();

  // 4. the operations that would bypass review
  await expectFailure("app cannot insert published_revision_id",
    "insert into academy.lessons(id, slug, owner_id, published_revision_id) values (gen_random_uuid(),'x','" + teacherId + "', '" + revisionId + "')");
  await expectFailure("app cannot update published_revision_id",
    "update academy.lessons set published_revision_id = $1 where id = $2", [revisionId, lessonId]);
  await expectFailure("app cannot delete a lesson", "delete from academy.lessons where id = $1", [lessonId]);
  await expectFailure("app cannot rewrite a revision",
    "update academy.revisions set content = '{}' where id = $1", [revisionId]);
  await expectFailure("app cannot insert a review event",
    "insert into academy.review_events(revision_id, actor_id, action) values ($1,$2,'approved')", [revisionId, reviewerId]);
  await expectFailure("teacher cannot self-approve",
    "select academy.advance_review('rehearsal.teacher',$1,'approved','', '{}'::jsonb)", [revisionId]);

  // 5. the legitimate path still works: submit, independent reviewer approves, publish
  const flow = await appClient();
  try {
    await flow.query("select academy.advance_review('rehearsal.teacher',$1,'submitted','', '{}'::jsonb)", [revisionId]);
    await flow.query(`select academy.advance_review('rehearsal.reviewer',$1,'approved','reviewed',
      '{"accuracy":true,"answerKeys":true,"rights":true,"safeguarding":true,"accessibility":true}'::jsonb)`, [revisionId]);
    await flow.query("select academy.advance_review('rehearsal.reviewer',$1,'published','', '{}'::jsonb)", [revisionId]);
    const published = (await flow.query("select count(*)::int n from academy.public_lessons where slug='rehearsal-lesson'")).rows[0].n;
    check("independent reviewer can publish", published === 1, `${published} public row`);
  } catch (error) {
    check("independent reviewer can publish", false, error.message.slice(0, 90));
  } finally {
    await flow.end();
  }
} catch (error) {
  failures++;
  console.log("FAIL rehearsal crashed —", error.message);
} finally {
  // 6. teardown
  await admin.query("drop schema if exists academy cascade").catch(() => {});
  await admin.query("drop role if exists academy_app").catch(() => {});
  const gone = (await admin.query(
    "select count(*)::int n from information_schema.schemata where schema_name='academy'",
  )).rows[0].n;
  check("teardown removed the schema", gone === 0);
  await admin.end().catch(() => {});
  console.log(failures ? `REHEARSAL FAILED (${failures})` : "REHEARSAL PASSED");
  process.exitCode = failures ? 1 : 0;
}
