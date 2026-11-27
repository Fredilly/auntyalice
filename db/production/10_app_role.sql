-- Production application role for Alice Academy.
-- Run once, as owner, on the PRODUCTION branch:
--   psql "$PROD_OWNER_URL" -v ON_ERROR_STOP=1 \
--     -v app_password="'a long random password'" \
--     -f db/production/10_app_role.sql
--
-- psql does NOT substitute :variables inside dollar-quoted DO blocks, so values are
-- passed through custom GUCs (set_config) and read with current_setting(). The first
-- version of this file silently created a role with the literal text ':app_password'.
--
-- Least privilege, column-scoped on purpose:
--   lessons    SELECT(id,slug,owner_id,created_at)
--              INSERT(id,slug,owner_id)          <- cannot set published_revision_id
--              UPDATE(slug)                      <- cannot publish by pointer
--   revisions  SELECT/INSERT(id,lesson_id,version,author_id,content)  <- append-only
--   review_events  SELECT only                <- writes happen inside advance_review()
--   syllabus_mappings SELECT, INSERT          <- no DELETE
--   public_lessons    SELECT
-- Publication is only reachable through advance_review(), which enforces staff role,
-- author != reviewer and the checklist. Nothing here can bypass it.

\set ON_ERROR_STOP on

BEGIN;

SELECT set_config('academy.app_password', :'app_password', true);

DO $$
DECLARE pw text := current_setting('academy.app_password');
BEGIN
  IF pw IS NULL OR length(pw) < 24 THEN
    RAISE EXCEPTION 'app_password must be at least 24 characters';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'academy_app') THEN
    EXECUTE format('CREATE ROLE academy_app LOGIN PASSWORD %L', pw);
  ELSE
    EXECUTE format('ALTER ROLE academy_app WITH LOGIN PASSWORD %L', pw);
  END IF;
END $$;

ALTER ROLE academy_app NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOINHERIT;
GRANT USAGE ON SCHEMA academy TO academy_app;

-- table-level SELECT where the whole row is safe to read
GRANT SELECT ON academy.staff             TO academy_app;
GRANT SELECT ON academy.review_events     TO academy_app;
GRANT SELECT ON academy.public_lessons    TO academy_app;
GRANT SELECT ON academy.syllabus_mappings TO academy_app;

-- column-scoped writes: nothing that can move the publication pointer
GRANT SELECT (id, slug, owner_id, created_at) ON academy.lessons   TO academy_app;
GRANT INSERT (id, slug, owner_id)             ON academy.lessons   TO academy_app;
GRANT UPDATE (slug)                            ON academy.lessons   TO academy_app;

GRANT SELECT (id, lesson_id, version, author_id, content) ON academy.revisions TO academy_app;
GRANT INSERT (id, lesson_id, version, author_id, content) ON academy.revisions TO academy_app;

GRANT INSERT (revision_id, exam, syllabus_edition, objective_reference, source_url)
  ON academy.syllabus_mappings TO academy_app;

DO $$
DECLARE seq text; missing text;
BEGIN
  SELECT pg_get_serial_sequence('academy.review_events','id') INTO seq;
  IF seq IS NOT NULL THEN EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO academy_app', seq); END IF;

  -- positive checks
  SELECT string_agg(name, ', ') INTO missing FROM (
    SELECT 'staff.select' WHERE NOT has_table_privilege('academy_app','academy.staff','SELECT')
    UNION ALL SELECT 'lessons.insert' WHERE NOT has_column_privilege('academy_app','academy.lessons','slug','INSERT')
    UNION ALL SELECT 'lessons.update_slug' WHERE NOT has_column_privilege('academy_app','academy.lessons','slug','UPDATE')
    UNION ALL SELECT 'revisions.insert' WHERE NOT has_column_privilege('academy_app','academy.revisions','content','INSERT')
    UNION ALL SELECT 'public_lessons.select' WHERE NOT has_table_privilege('academy_app','academy.public_lessons','SELECT')
    -- negative checks: these must all be false
    UNION ALL SELECT 'MUST_NOT update published_revision_id'
      WHERE has_column_privilege('academy_app','academy.lessons','published_revision_id','UPDATE')
    UNION ALL SELECT 'MUST_NOT insert published_revision_id'
      WHERE has_column_privilege('academy_app','academy.lessons','published_revision_id','INSERT')
    UNION ALL SELECT 'MUST_NOT delete lessons'
      WHERE has_table_privilege('academy_app','academy.lessons','DELETE')
    UNION ALL SELECT 'MUST_NOT update revisions'
      WHERE has_column_privilege('academy_app','academy.revisions','content','UPDATE')
    UNION ALL SELECT 'MUST_NOT delete syllabus_mappings'
      WHERE has_table_privilege('academy_app','academy.syllabus_mappings','DELETE')
    UNION ALL SELECT 'MUST_NOT insert review_events'
      WHERE has_table_privilege('academy_app','academy.review_events','INSERT')
  ) t;
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'production privilege check failed: %', missing;
  END IF;
  RAISE NOTICE 'production privileges verified: least privilege, publication locked';
END $$;

COMMIT;
