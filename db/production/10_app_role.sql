-- Production application role for Alice Academy.
--
-- Run as the Neon project owner on the PRODUCTION branch:
--
--   export ACADEMY_APP_PASSWORD="$(openssl rand -base64 33)"
--   psql "$PROD_OWNER_URL" -v ON_ERROR_STOP=1 -f db/production/10_app_role.sql
--
-- The password is read from the environment, never from the command line: a -v value
-- lands in shell history and is visible in `ps` to every user on the machine.
--
-- Neon note: the project owner is NOT a superuser, and `ALTER ROLE ... NOSUPERUSER`
-- fails there with "permission denied" even when the role already has that value.
-- Role attributes are therefore asserted rather than written, and the role is created
-- with PostgreSQL's defaults (NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOBYPASSRLS).
--
-- Nothing here drops or alters a schema object: the production schema is preserved.
--
-- Least privilege, column-scoped:
--   lessons    SELECT(id,slug,owner_id,created_at) / INSERT(id,slug,owner_id) / UPDATE(slug)
--   revisions  SELECT, INSERT (append-only)
--   review_events   SELECT only
--   syllabus_mappings SELECT, INSERT
--   public_lessons    SELECT
--   advance_review()  EXECUTE   <- revoked from PUBLIC by migration 002
-- Publication remains reachable only through advance_review().

\set ON_ERROR_STOP on
\set VERBOSITY terse
\getenv app_password ACADEMY_APP_PASSWORD

\if :{?app_password}
\else
  \warn 'ACADEMY_APP_PASSWORD is not set — export it before running this file'
  \quit 1
\endif

BEGIN;

-- \gset captures the result into a psql variable instead of printing it: a bare
-- SELECT would echo the password to the terminal and into any captured CI log.
SELECT set_config('academy.app_password', :'app_password', true) AS session_password \gset
\unset session_password

DO $$
DECLARE pw text := current_setting('academy.app_password');
BEGIN
  IF pw IS NULL OR length(pw) < 24 THEN
    RAISE EXCEPTION 'ACADEMY_APP_PASSWORD must be at least 24 characters';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'academy_app') THEN
    EXECUTE format('CREATE ROLE academy_app LOGIN PASSWORD %L', pw);
  ELSE
    EXECUTE format('ALTER ROLE academy_app WITH LOGIN PASSWORD %L', pw);
  END IF;
END $$;

-- Assert the attributes instead of setting them (Neon cannot ALTER SUPERUSER bits).
DO $$
DECLARE bad text;
BEGIN
  SELECT string_agg(attr, ', ') INTO bad FROM (
    SELECT 'SUPERUSER'       AS attr WHERE (SELECT rolsuper      FROM pg_roles WHERE rolname='academy_app')
    UNION ALL SELECT 'CREATEDB' AS name WHERE (SELECT rolcreatedb   FROM pg_roles WHERE rolname='academy_app')
    UNION ALL SELECT 'CREATEROLE' AS name WHERE (SELECT rolcreaterole FROM pg_roles WHERE rolname='academy_app')
    UNION ALL SELECT 'BYPASSRLS' AS name WHERE (SELECT rolbypassrls  FROM pg_roles WHERE rolname='academy_app')
    UNION ALL SELECT 'REPLICATION' AS name WHERE (SELECT rolreplication FROM pg_roles WHERE rolname='academy_app')
    UNION ALL SELECT 'NOT LOGIN' AS name WHERE NOT (SELECT rolcanlogin FROM pg_roles WHERE rolname='academy_app')
  ) t;
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'academy_app has forbidden attributes: %', bad;
  END IF;
  RAISE NOTICE 'role attributes verified (no superuser, no createdb/createrole, no bypassrls)';
END $$;

GRANT USAGE ON SCHEMA academy TO academy_app;

GRANT SELECT ON academy.staff             TO academy_app;
GRANT SELECT ON academy.review_events     TO academy_app;
GRANT SELECT ON academy.public_lessons    TO academy_app;
GRANT SELECT ON academy.syllabus_mappings TO academy_app;

GRANT SELECT (id, slug, owner_id, created_at) ON academy.lessons   TO academy_app;
GRANT INSERT (id, slug, owner_id)             ON academy.lessons   TO academy_app;
GRANT UPDATE (slug)                            ON academy.lessons   TO academy_app;

GRANT SELECT (id, lesson_id, version, author_id, content) ON academy.revisions TO academy_app;
GRANT INSERT (id, lesson_id, version, author_id, content) ON academy.revisions TO academy_app;

GRANT INSERT (revision_id, exam, syllabus_edition, objective_reference, source_url)
  ON academy.syllabus_mappings TO academy_app;

-- 002 revokes this from PUBLIC; without it review and publication fail with 42501.
GRANT EXECUTE ON FUNCTION academy.advance_review(text,uuid,text,text,jsonb) TO academy_app;

DO $$
DECLARE seq text; missing text;
BEGIN
  SELECT pg_get_serial_sequence('academy.review_events','id') INTO seq;
  IF seq IS NOT NULL THEN EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO academy_app', seq); END IF;

  SELECT string_agg(name, ', ') INTO missing FROM (
    SELECT 'staff.select' AS name WHERE NOT has_table_privilege('academy_app','academy.staff','SELECT')
    UNION ALL SELECT 'lessons.insert' AS name WHERE NOT has_column_privilege('academy_app','academy.lessons','slug','INSERT')
    UNION ALL SELECT 'lessons.update_slug' AS name WHERE NOT has_column_privilege('academy_app','academy.lessons','slug','UPDATE')
    UNION ALL SELECT 'revisions.insert' AS name WHERE NOT has_column_privilege('academy_app','academy.revisions','content','INSERT')
    UNION ALL SELECT 'public_lessons.select' AS name WHERE NOT has_table_privilege('academy_app','academy.public_lessons','SELECT')
    UNION ALL SELECT 'advance_review.execute' AS name WHERE NOT has_function_privilege('academy_app','academy.advance_review(text,uuid,text,text,jsonb)','EXECUTE')
    UNION ALL SELECT 'MUST_NOT update published_revision_id' AS name WHERE has_column_privilege('academy_app','academy.lessons','published_revision_id','UPDATE')
    UNION ALL SELECT 'MUST_NOT insert published_revision_id' AS name WHERE has_column_privilege('academy_app','academy.lessons','published_revision_id','INSERT')
    UNION ALL SELECT 'MUST_NOT delete lessons' AS name WHERE has_table_privilege('academy_app','academy.lessons','DELETE')
    UNION ALL SELECT 'MUST_NOT update revisions' AS name WHERE has_column_privilege('academy_app','academy.revisions','content','UPDATE')
    UNION ALL SELECT 'MUST_NOT delete syllabus_mappings' AS name WHERE has_table_privilege('academy_app','academy.syllabus_mappings','DELETE')
    UNION ALL SELECT 'MUST_NOT insert review_events' AS name WHERE has_table_privilege('academy_app','academy.review_events','INSERT')
  ) t;
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'production privilege check failed: %', missing;
  END IF;
  RAISE NOTICE 'production privileges verified: least privilege, publication locked';
END $$;

COMMIT;

-- Rotating an exposed password (safe to run at any time, no privilege is lost):
--
--   export ACADEMY_APP_PASSWORD="$(openssl rand -base64 33)"
--   psql "$PROD_OWNER_URL" -v ON_ERROR_STOP=1 -f db/production/10_app_role.sql
--   npx wrangler secret put DATABASE_URL --name auntyalice   # paste the URL with the new password
--
-- Until the Worker secret is updated the app keeps using the old password, which the
-- ALTER above has already invalidated — rotate the secret in the same sitting.
