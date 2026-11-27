-- Production application role for Alice Academy.
-- Run once, as the database owner, on the PRODUCTION branch only.
-- Mirrors db/grants/dev_app_role.sql (already reviewed) but with no dev identity and
-- no development-specific assumptions.
--
-- Least privilege:
--   staff            SELECT                login lookup
--   lessons          SELECT, INSERT, UPDATE  draft creation, slug/title edits
--   revisions        SELECT, INSERT         append-only history; never UPDATE
--   review_events    SELECT                audit trail; writes go through advance_review()
--   syllabus_mappings SELECT, INSERT, DELETE  exam tagging
--   public_lessons   SELECT                read the published view
-- DELETE is granted on nothing. Publication is a pointer move, not a delete.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'academy_app') THEN
    EXECUTE format('CREATE ROLE academy_app LOGIN PASSWORD %L', :app_password);
  ELSE
    EXECUTE format('ALTER ROLE academy_app WITH LOGIN PASSWORD %L', :app_password);
  END IF;
END $$;

ALTER ROLE academy_app NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOINHERIT;
GRANT USAGE ON SCHEMA academy TO academy_app;

GRANT SELECT                   ON academy.staff             TO academy_app;
GRANT SELECT, INSERT, UPDATE   ON academy.lessons           TO academy_app;
GRANT SELECT, INSERT           ON academy.revisions         TO academy_app;
GRANT SELECT                   ON academy.review_events     TO academy_app;
GRANT SELECT, INSERT, DELETE   ON academy.syllabus_mappings TO academy_app;
GRANT SELECT                   ON academy.public_lessons    TO academy_app;

DO $$
DECLARE seq text;
BEGIN
  SELECT pg_get_serial_sequence('academy.review_events','id') INTO seq;
  IF seq IS NOT NULL THEN EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO academy_app', seq); END IF;
END $$;

-- Same session verification: any failure aborts the whole transaction.
DO $$
DECLARE missing text;
BEGIN
  SELECT string_agg(name, ', ') INTO missing FROM (
    SELECT 'staff.select' AS name WHERE NOT has_table_privilege('academy_app','academy.staff','SELECT')
    UNION ALL SELECT 'lessons.insert' WHERE NOT has_table_privilege('academy_app','academy.lessons','INSERT')
    UNION ALL SELECT 'lessons.update' WHERE NOT has_table_privilege('academy_app','academy.lessons','UPDATE')
    UNION ALL SELECT 'revisions.insert' WHERE NOT has_table_privilege('academy_app','academy.revisions','INSERT')
    UNION ALL SELECT 'public_lessons.select' WHERE NOT has_table_privilege('academy_app','academy.public_lessons','SELECT')
    UNION ALL SELECT 'no_delete_on_lessons' WHERE has_table_privilege('academy_app','academy.lessons','DELETE')
    UNION ALL SELECT 'no_update_on_revisions' WHERE has_table_privilege('academy_app','academy.revisions','UPDATE')
  ) t;
  IF missing IS NOT NULL THEN RAISE EXCEPTION 'production grant verification failed: %', missing; END IF;
  RAISE NOTICE 'production privileges correct';
END $$;

COMMIT;
