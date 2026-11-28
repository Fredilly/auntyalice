/**
 * Publish reviewed Academy content into the production database.
 *
 * Reads authored revisions from the development branch (read-only) and re-publishes
 * them on production through the real review flow: insert revision -> advance_review
 * submitted -> approved -> published. Nothing is copied by hand and nothing bypasses
 * the reviewer.
 *
 * Refuses to run unless:
 *   - DATABASE_URL is the production branch (development branch id is rejected)
 *   - DEV_DATABASE_URL is set and different from DATABASE_URL
 *   - the slug is not a test fixture
 *   - production has one active teacher and one active reviewer
 *
 * Usage:
 *   export DATABASE_URL="$PROD_APP_URL"
 *   export DEV_DATABASE_URL="$DEV_READONLY_URL"
 *   node scripts/publish-production-content.mjs
 */
import { randomUUID } from "node:crypto";
import pg from "pg";

const DEV_BRANCH_MARKER = "br-lucky-cloud-be62md6i";

/** Authored content that has been through review on the development branch. */
const PUBLISH = [
  { slug: "laws-of-indices", exam: "waec", edition: "2021-2025", objective: "Number: indices and standard form" },
  { slug: "percentages-and-profit", exam: "waec", edition: "2021-2025", objective: "Number: percentages, profit and loss" },
  { slug: "simultaneous-equations", exam: "waec", edition: "2021-2025", objective: "Algebra: simultaneous linear equations" },
];

const FIXTURES = new Set(["m2-acceptance", "isolation-probe", "submit-practice", "smoke"]);
const isFixture = (slug) => FIXTURES.has(slug) || /^(m2-|isolation-|test-|fixture-)/.test(slug);



/**
 * Two modes, on purpose. Automation must not cast a reviewer's vote:
 *   --stage    insert revisions and submit them; approval is a human decision
 *   --publish  publish revisions that carry an approval event from a staff member
 *              who is not the author
 */
const MODE = process.argv.includes("--publish") ? "publish" : process.argv.includes("--stage") ? "stage" : null;
if (!MODE) fail("pass --stage (submit for review) or --publish (publish approved revisions)");

function envUrl(name) {
  const value = process.env[name];
  if (!value) fail(`${name} is not set`);
  return value;
}

function fail(message) {
  console.error("REFUSING:", message);
  process.exit(1);
}

const prodUrl = envUrl("DATABASE_URL");
const devUrl = envUrl("DEV_DATABASE_URL");

if (prodUrl.includes(DEV_BRANCH_MARKER)) fail("DATABASE_URL points at the development branch");
if (devUrl === prodUrl) fail("DATABASE_URL and DEV_DATABASE_URL are the same database");

const dev = new pg.Client({ connectionString: devUrl, ssl: { rejectUnauthorized: true } });
const prod = new pg.Client({ connectionString: prodUrl, ssl: { rejectUnauthorized: true } });
await dev.connect();
await prod.connect();

const teacher = (await prod.query("select id, auth_subject from academy.staff where role='teacher' and active limit 1")).rows[0];
const reviewer = (await prod.query("select auth_subject from academy.staff where role='reviewer' and active limit 1")).rows[0]?.auth_subject;
if (!teacher || !reviewer) fail("production needs one active teacher and one active reviewer (run db/production/20_staff.sql)");
if (teacher.auth_subject === reviewer) fail("author and reviewer are the same identity");

let published = 0;
for (const item of PUBLISH) {
  if (isFixture(item.slug)) { console.warn("skip fixture:", item.slug); continue; }

  if (MODE === "publish") {
    // Publish the exact latest revision already approved by a human reviewer.
    // Never insert another revision in this mode.
    const { rows: [approved] } = await prod.query(
      `select r.id, r.version, s.auth_subject
       from academy.lessons l
       join lateral (select * from academy.revisions where lesson_id=l.id order by version desc limit 1) r on true
       join lateral (select * from academy.review_events where revision_id=r.id order by id desc limit 1) e on true
       join academy.staff s on s.id=e.actor_id
       where l.slug=$1 and not l.is_fixture and e.action='approved'
         and s.active and s.role='reviewer' and s.id<>r.author_id and s.id<>l.owner_id`,
      [item.slug],
    );
    if (!approved) fail(`${item.slug} has no current genuine reviewer approval`);
    await prod.query("select academy.advance_review($1,$2,$3,$4,$5::jsonb)", [
      approved.auth_subject, approved.id, "published", "", null,
    ]);
    published++;
    console.log("published", item.slug, "v" + approved.version);
    continue;
  }

  const source = (await dev.query("select content from academy.public_lessons where slug=$1", [item.slug])).rows[0];
  if (!source) { console.warn("skip (not published on development):", item.slug); continue; }

  // production must hold only reviewed, non-fixture rows
  const existing = await prod.query("select id, is_fixture from academy.lessons where slug=$1", [item.slug]);
  if (existing.rows[0]?.is_fixture) fail(`production lesson ${item.slug} is flagged as a fixture`);

  const lessonId = existing.rows[0]?.id ?? randomUUID();
  if (!existing.rows[0]) {
    await prod.query("begin");
    await prod.query("insert into academy.lessons(id, slug, owner_id) values ($1,$2,$3)", [lessonId, item.slug, teacher.id]);
    await prod.query("commit");
  }

  const version = (await prod.query("select coalesce(max(version),0)+1 as v from academy.revisions where lesson_id=$1", [lessonId])).rows[0].v;
  const revisionId = randomUUID();

  await prod.query("begin");
  await prod.query(
    "insert into academy.revisions(id, lesson_id, version, author_id, content) values ($1,$2,$3,$4,$5)",
    [revisionId, lessonId, version, teacher.id, JSON.stringify(source.content)],
  );
  await prod.query(
    `insert into academy.syllabus_mappings(revision_id, exam, syllabus_edition, objective_reference, source_url)
     values ($1,$2,$3,$4,'https://www.waecnigeria.org/')`,
    [revisionId, item.exam, item.edition, item.objective],
  );
  await prod.query("select academy.advance_review($1,$2,$3,$4,$5::jsonb)", [
    teacher.auth_subject, revisionId, "submitted", "", null,
  ]);
  await prod.query("commit");
  console.log("staged for review:", item.slug, "v" + version);

}

const fixtures = (await prod.query("select count(*)::int as n from academy.lessons where is_fixture")).rows[0].n;
console.log({ published, fixtures_in_production: fixtures });
console.log("public lessons:", (await prod.query("select slug from academy.public_lessons order by slug")).rows.map((r) => r.slug));

await dev.end();
await prod.end();
