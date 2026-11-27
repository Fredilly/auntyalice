/**
 * Rehearse the production setup end to end against a DISPOSABLE database.
 *
 *   REHEARSAL_CONFIRM=throwaway \
 *   REHEARSAL_DATABASE_URL='postgres://owner:...@host/db' \
 *   node scripts/rehearse-production-setup.mjs
 *
 * Needs an owner/creator connection: it creates and drops roles. Safe to run twice in
 * a row — CI asserts that against a disposable PostgreSQL service.
 */
import { readFileSync } from "node:fs";
import { randomBytes, randomUUID } from "node:crypto";
import pg from "pg";

const DEV_MARKER = "br-lucky-cloud-be62md6i";

/** Roles created by migration 002 and by this script. All must be removable. */
const MIGRATION_ROLES = ["academy_runtime", "academy_reader"];
const APP_ROLE = "academy_app";
const ALL_ROLES = [...MIGRATION_ROLES, APP_ROLE];

/** Codes that legitimately mean "already gone". Anything else must surface. */
const GONE = new Set(["42P01", "3F000", "42704", "2BP01", "25P02"]);

const fail = (message) => { console.error("REFUSING:", message); process.exit(1); };

if (process.env.REHEARSAL_CONFIRM !== "throwaway") {
  fail("set REHEARSAL_CONFIRM=throwaway — this script DROPS the academy schema and roles");
}
const URL_ = process.env.REHEARSAL_DATABASE_URL;
if (!URL_) fail("REHEARSAL_DATABASE_URL is required");
if (URL_.includes(DEV_MARKER)) fail("connection string contains the development branch id");

// endpoint verification before anything destructive
function endpointOf(connection) {
  try {
    const host = new URL(connection).hostname;
    return { host, endpoint: host.split(".")[0].replace(/-pooler$/, "") };
  } catch { return { host: "", endpoint: "" }; }
}
const target = endpointOf(URL_);
const devEndpoint = endpointOf(process.env.DATABASE_URL || "").endpoint;
const isNeon = target.host.endsWith(".neon.tech");

if (isNeon) {
  if (!/^ep-/.test(target.endpoint)) fail(`unrecognised Neon endpoint: ${target.host}`);
  if (devEndpoint && target.endpoint === devEndpoint) fail(`endpoint ${target.endpoint} is the development branch`);
  const allowed = (process.env.REHEARSAL_ENDPOINTS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (allowed.length && !allowed.includes(target.endpoint)) fail(`endpoint ${target.endpoint} is not allow-listed`);
} else if (!/^(localhost|127\.0\.0\.1|db|postgres)$/.test(target.host)) {
  fail(`refusing non-local host ${target.host}; allow-list it with REHEARSAL_ENDPOINTS`);
}

const admin = new pg.Client({ connectionString: URL_, ...(isNeon ? { ssl: { rejectUnauthorized: true } } : {}) });
await admin.connect();

const identity = (await admin.query(`
  select current_database() as db, current_user as usr,
         coalesce((select rolsuper from pg_roles where rolname = current_user), false) as is_super,
         coalesce((select rolcreaterole from pg_roles where rolname = current_user), false) as can_create_role
`)).rows[0];

if (!identity.is_super && !identity.can_create_role) fail(`${identity.usr} cannot create roles — use an owner connection`);
console.log(`rehearsing on ${identity.db} as ${identity.usr} via ${target.host || "unix socket"}`);

let failures = 0;
const check = (label, ok, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? " — " + detail : ""}`);
};

async function trySql(sql, extra = []) {
  try { await admin.query(sql); return true; }
  catch (error) {
    if (extra.includes(error.code) || GONE.has(error.code)) return false;
    throw new Error(`unexpected error from "${sql.slice(0, 60)}…": [${error.code}] ${error.message}`);
  }
}

async function cleanAll() {
  await trySql("rollback");
  await trySql("drop schema if exists academy cascade");
  for (const role of ALL_ROLES) {
    await trySql(`drop owned by ${role}`);
    await trySql(`drop role if exists ${role}`);
  }
}

await cleanAll();

const appUrl = new URL(URL_);
appUrl.username = APP_ROLE;
appUrl.password = randomBytes(18).toString("base64url");

const appClient = async () => {
  const c = new pg.Client({ connectionString: appUrl.toString(), ...(isNeon ? { ssl: { rejectUnauthorized: true } } : {}) });
  await c.connect();
  return c;
};

async function expectFailure(label, sql, params = []) {
  const c = await appClient();
  try {
    await c.query(sql, params);
    check(label, false, "operation was ALLOWED but must be refused");
  } catch (error) {
    const denied = /permission denied|violates|not authorized|must be|cannot/i.test(error.message);
    check(label, denied, denied ? "" : `[${error.code}] ${error.message.slice(0, 80)}`);
  } finally { await c.end().catch(() => {}); }
}

try {
  for (const file of ["001_publishing.sql", "002_publishing_security.sql", "003_past_papers.sql"]) {
    await admin.query(readFileSync(`db/migrations/${file}`, "utf8"));
    console.log("applied", file);
  }
  await admin.query("alter table academy.lessons add column if not exists is_fixture boolean not null default false");

  const tables = (await admin.query(
    "select count(*)::int n from information_schema.tables where table_schema='academy'")).rows[0].n;
  check("academy schema created", tables >= 7, `${tables} tables`);

  const teacherId = randomUUID();
  const reviewerId = randomUUID();
  await admin.query(
    `insert into academy.staff(id, auth_subject, role, active) values
       ($1,'rehearsal.teacher','teacher',true), ($2,'rehearsal.reviewer','reviewer',true)`,
    [teacherId, reviewerId]);

  const source = readFileSync("db/production/10_app_role.sql", "utf8")
    .replace(/^\s*--.*$/gm, "").replace(/^\\set.*$/gm, "");
  const statements = source.split(";").map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => /^(grant|alter role|revoke)\b/i.test(s));

  const unscoped = statements.filter((s) => /^grant\b/i.test(s) && !/\bto\b/i.test(s));
  if (unscoped.length || statements.length < 10) {
    throw new Error(`grant extraction looks wrong: ${statements.length} statements, ${unscoped.length} unscoped`);
  }

  await admin.query(`create role ${APP_ROLE} login password '${appUrl.password}' nosuperuser nocreatedb nocreaterole nobypassrls`);
  await admin.query(`grant usage on schema academy to ${APP_ROLE}`);
  for (const statement of statements) {
    try { await admin.query(statement); }
    catch (error) { throw new Error(`grant failed: ${statement.slice(0, 60)}… — [${error.code}] ${error.message}`); }
  }
  console.log(`applied ${statements.length} grant statements`);

  const priv = (await admin.query(`
    select
      has_column_privilege('${APP_ROLE}','academy.lessons','slug','INSERT') as ins_slug,
      has_column_privilege('${APP_ROLE}','academy.lessons','published_revision_id','INSERT') as ins_pub,
      has_column_privilege('${APP_ROLE}','academy.lessons','published_revision_id','UPDATE') as upd_pub,
      has_table_privilege('${APP_ROLE}','academy.lessons','DELETE') as del_lessons,
      has_column_privilege('${APP_ROLE}','academy.revisions','content','UPDATE') as upd_rev,
      has_table_privilege('${APP_ROLE}','academy.review_events','INSERT') as ins_events
  `)).rows[0];
  check("app may insert a lesson", priv.ins_slug === true);
  check("app may NOT insert published_revision_id", priv.ins_pub === false);
  check("app may NOT update published_revision_id", priv.upd_pub === false);
  check("app may NOT delete lessons", priv.del_lessons === false);
  check("app may NOT update revisions", priv.upd_rev === false);
  check("app may NOT write review_events", priv.ins_events === false);

  const app = await appClient();
  const lessonId = randomUUID();
  const revisionId = randomUUID();
  await app.query("insert into academy.lessons(id, slug, owner_id) values ($1,'rehearsal-lesson',$2)", [lessonId, teacherId]);
  await app.query(
    "insert into academy.revisions(id, lesson_id, version, author_id, content) values ($1,$2,1,$3,$4)",
    [revisionId, lessonId, teacherId, JSON.stringify({ title: "Rehearsal", questions: [] })]);
  check("app may create a lesson and revision", true);
  await app.end();

  await expectFailure("app cannot insert published_revision_id",
    "insert into academy.lessons(id, slug, owner_id, published_revision_id) values (gen_random_uuid(),'x',$1,$2)",
    [teacherId, revisionId]);
  await expectFailure("app cannot update published_revision_id",
    "update academy.lessons set published_revision_id = $1 where id = $2", [revisionId, lessonId]);
  await expectFailure("app cannot delete a lesson", "delete from academy.lessons where id = $1", [lessonId]);
  await expectFailure("app cannot rewrite a revision", "update academy.revisions set content = '{}' where id = $1", [revisionId]);
  await expectFailure("app cannot insert a review event",
    "insert into academy.review_events(revision_id, actor_id, action) values ($1,$2,'approved')", [revisionId, reviewerId]);
  await expectFailure("teacher cannot self-approve",
    "select academy.advance_review('rehearsal.teacher',$1,'approved','', '{}'::jsonb)", [revisionId]);

  const flow = await appClient();
  try {
    await flow.query("select academy.advance_review('rehearsal.teacher',$1,'submitted','', '{}'::jsonb)", [revisionId]);
    await flow.query(`select academy.advance_review('rehearsal.reviewer',$1,'approved','reviewed',
      '{"accuracy":true,"answerKeys":true,"rights":true,"safeguarding":true,"accessibility":true}'::jsonb)`, [revisionId]);
    await flow.query("select academy.advance_review('rehearsal.reviewer',$1,'published','', '{}'::jsonb)", [revisionId]);
    const published = (await flow.query("select count(*)::int n from academy.public_lessons where slug='rehearsal-lesson'")).rows[0].n;
    check("independent reviewer can publish", published === 1, `${published} public row`);
  } catch (error) {
    check("independent reviewer can publish", false, `[${error.code}] ${error.message.slice(0, 80)}`);
  } finally { await flow.end().catch(() => {}); }
} catch (error) {
  failures++;
  console.log("FAIL rehearsal crashed —", error.message);
} finally {
  await cleanAll();
  const left = (await admin.query(`
    select
      (select count(*) from information_schema.schemata where schema_name='academy')::int as schema_left,
      (select count(*) from pg_roles where rolname = any($1))::int as roles_left
  `, [ALL_ROLES])).rows[0];
  check("teardown removed the schema", left.schema_left === 0);
  check("teardown removed every migration role", left.roles_left === 0, `${left.roles_left} left`);
  await admin.end().catch(() => {});
  console.log(failures ? `REHEARSAL FAILED (${failures})` : "REHEARSAL PASSED");
  process.exitCode = failures ? 1 : 0;
}
