-- Grants required by the Academy application role, development branch only.
--
-- Context: academy_app_dev currently holds USAGE on schema `academy`, SELECT on
-- academy.public_lessons, and EXECUTE on advance_review()/reject_mutation().
-- It holds no privilege on the base tables, so login (reading `staff`) and draft
-- creation (writing `lessons`/`revisions`) fail with "permission denied".
--
-- Run as the DATABASE OWNER (not academy_app_dev), against branch
-- br-lucky-cloud-be62md6i only. Do not run against production.
--
-- Least privilege per the existing design:
--   * SELECT on staff            -> login lookup
--   * SELECT/INSERT/UPDATE lessons   -> draft create + slug/title edits
--   * SELECT/INSERT revisions        -> new draft versions (never UPDATE: history is append-only)
--   * SELECT review_events           -> read the audit trail (writes go through advance_review)
--   * DML on syllabus_mappings       -> exam track tagging
--   * DELETE is granted on nothing. Publication is a pointer move, not a delete.
--   * The existing reject_mutation trigger keeps revisions immutable; do not
--     disable it to make anything work.

BEGIN;

GRANT SELECT                        ON academy.staff              TO academy_app_dev;
GRANT SELECT, INSERT, UPDATE        ON academy.lessons            TO academy_app_dev;
GRANT SELECT, INSERT                ON academy.revisions          TO academy_app_dev;
GRANT SELECT                        ON academy.review_events      TO academy_app_dev;
GRANT SELECT, INSERT, DELETE        ON academy.syllabus_mappings  TO academy_app_dev;

-- the app may need to read the sequence value after an insert
GRANT USAGE, SELECT ON SEQUENCE academy.review_events_id_seq TO academy_app_dev;

-- verify in the same transaction; any row with false means stop
DO $$
DECLARE missing text;
BEGIN
  SELECT string_agg(name, ', ') INTO missing FROM (
    SELECT 'staff.select' AS name
     WHERE NOT has_table_privilege('academy_app_dev','academy.staff','SELECT')
    UNION ALL SELECT 'lessons.insert'
     WHERE NOT has_table_privilege('academy_app_dev','academy.lessons','INSERT')
    UNION ALL SELECT 'lessons.update'
     WHERE NOT has_table_privilege('academy_app_dev','academy.lessons','UPDATE')
    UNION ALL SELECT 'revisions.insert'
     WHERE NOT has_table_privilege('academy_app_dev','academy.revisions','INSERT')
    UNION ALL SELECT 'review_events.select'
     WHERE NOT has_table_privilege('academy_app_dev','academy.review_events','SELECT')
    UNION ALL SELECT 'sequences.usage'
     WHERE NOT has_sequence_privilege('academy_app_dev','academy.review_events_id_seq','USAGE')
  ) t;
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'grant verification failed: %', missing;
  END IF;
  RAISE NOTICE 'all required privileges present';
END $$;

COMMIT;

-- Negative check, run after COMMIT (each should fail with permission denied):
--   INSERT INTO academy.lessons(id,slug) VALUES (gen_random_uuid(),'probe');
--   UPDATE academy.revisions SET content = content;
--   DELETE FROM academy.lessons;
