# Production database setup — controlled procedure

One pass, in this order, **run by the database owner**. Nothing here has been executed.
Every step has a gate; do not continue past a failed gate.

**Scope:** the production Neon branch only. The development branch
(`br-lucky-cloud-be62md6i`) has the schema already — it is not a template to point
production at, and production must never share it.

---

## 0. Preconditions

| Requirement | Check |
|---|---|
| Production Neon branch exists | Project `ancient-truth-19554780`, branch ≠ `br-lucky-cloud-be62md6i` |
| Owner connection to that branch | `select current_database(), current_user;` |
| Empty of Academy objects | `select count(*) from information_schema.schemata where schema_name='academy';` → **0** |
| Worker secret not yet set | Cloudflare → auntyalice → Settings → Variables → `DATABASE_URL` absent |

If the `academy` schema already exists, **stop** — this procedure is for a blank branch.

---

## 1. Schema migrations (owner connection, in order)

```bash
psql "$PROD_OWNER_URL" -v ON_ERROR_STOP=1 -f db/migrations/001_publishing.sql
psql "$PROD_OWNER_URL" -v ON_ERROR_STOP=1 -f db/migrations/002_publishing_security.sql
psql "$PROD_OWNER_URL" -v ON_ERROR_STOP=1 -f db/migrations/003_past_papers.sql
```

**Gate 1**

```sql
select table_name from information_schema.tables
where table_schema='academy' order by 1;
-- expect: lessons, past_papers, past_questions, review_events, revisions,
--         staff, syllabus_mappings
select count(*) from academy.public_lessons;  -- 0
```

### 1a. Fixture flag — do **not** run 004 in full

`004_purge_test_fixtures.sql` deletes rows. On a new branch there is nothing to
delete, but it also changes the public view. Run **only** the additive half:

```sql
alter table academy.lessons add column if not exists is_fixture boolean not null default false;
```

Leave the `DELETE` and the view replacement out: creation-time exclusion is enough,
and the fixture purge remains pending approval for the development branch.

---

## 2. Application role (owner connection)

```bash
psql "$PROD_OWNER_URL" -v ON_ERROR_STOP=1 \
  -v app_password="'REPLACE_WITH_A_LONG_RANDOM_PASSWORD'" \
  -f db/production/10_app_role.sql
```

Creates `academy_app` — no `SUPERUSER`, `CREATEDB`, `CREATEROLE`, `BYPASSRLS` — and
grants exactly what the app needs. Publication stays a pointer move through
`advance_review()`; the role cannot write `published_revision_id`, cannot UPDATE
revisions, cannot DELETE anything.

**Gate 2** — connect *as `academy_app`* and confirm both directions:

```sql
select current_user, rolsuper, rolcreatedb, rolcreaterole, rolbypassrls
from pg_roles where rolname = current_user;          -- all false
select count(*) from academy.public_lessons;         -- allowed, 0 rows
insert into academy.lessons(id, slug) values (gen_random_uuid(), 'probe');  -- must FAIL
delete from academy.lessons;                        -- must FAIL
```

---

## 3. Staff accounts (owner connection)

```bash
psql "$PROD_OWNER_URL" -v ON_ERROR_STOP=1 \
  -v teacher_subject="'<real teacher identity>'" \
  -v reviewer_subject="'<real reviewer identity>'" \
  -f db/production/20_staff.sql
```

Two real people. The script refuses `dev:`/`test:`/`@auntyalice.test` identities —
those belong to the development branch and must never authenticate against production.

**Gate 3**

```sql
select role, count(*) from academy.staff group by role;  -- teacher 1, reviewer 1
```

---

## 4. Content — staged by automation, approved by a human

Two explicit modes. The script never casts a reviewer's vote:

```bash
export DATABASE_URL="$PROD_APP_URL"     # academy_app connection string
export DEV_DATABASE_URL="$DEV_READONLY_URL"

node scripts/publish-production-content.mjs --stage    # insert + submit only
# a real reviewer approves in the staff UI
node scripts/publish-production-content.mjs --publish  # publishes approved revisions
```

`--publish` refuses any revision whose approval event is missing, was cast by a
non-reviewer, or was cast by the author.

The script refuses to run if:

- `DATABASE_URL` contains the development branch id,
- a slug is on the fixture list (`m2-acceptance`, `isolation-probe`, `submit-practice`),
- the reviewer and author are the same staff row.

**Gate 4**

```sql
select slug, version from academy.public_lessons order by slug;
-- expect: laws-of-indices, percentages-and-profit, simultaneous-equations
select count(*) from academy.lessons where is_fixture;   -- 0
```

---

## 5. Point the Worker at production

```bash
npx wrangler secret put DATABASE_URL --name auntyalice
# paste the academy_app connection string for the PRODUCTION branch
```

Use the **pooled** connection string. Never paste the development branch string.

**Gate 5 — production verification**

```bash
node scripts/verify-production.mjs
```

A 200 on `/learn` proves nothing — it renders an empty shell when the Worker has no
database. The verifier asserts four things that only hold when production is wired up:
the dashboard names at least one lesson, the known lesson returns 200 **with taught
content**, it is not the "temporarily unavailable" page, and a genuinely missing
lesson is a real 404. It exits non-zero on any failure.

P0 is closed only when it prints `PRODUCTION VERIFIED`.

---

## Rollback

| Step | Undo |
|---|---|
| 1–2 | Drop schema `academy` and role `academy_app` on the production branch |
| 4 | Content is published, not migrated: unpublish via the review flow, never delete revisions |
| 5 | Delete the `DATABASE_URL` secret; the Worker returns to the honest unavailable state |

## Explicitly out of scope

- No new infrastructure, no second database, no replica.
- No pointing production at the development branch.
- No fixture content, no destructive migration on development without separate approval.
