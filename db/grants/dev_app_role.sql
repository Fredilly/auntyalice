-- Grants required by the Academy application role — development branch only.
--
-- Revised 2026-11-26 after schema inspection of br-lucky-cloud-be62md6i:
--   lessons(id, slug, owner_id, published_revision_id, created_at)
--   revisions(id, lesson_id, version, author_id, content, created_at)
--   review_events(id, revision_id, actor_id, action, reason, created_at, checklist)
--   staff(id, auth_subject, role, active)
--   syllabus_mappings(revision_id, exam, syllabus_edition, objective_reference, source_url)
--
-- Run as the DATABASE OWNER against the development branch only. Never production.
--
-- Design rules encoded here:
--   * publication is a pointer move and happens ONLY inside advance_review(),
--     which is SECURITY DEFINER. The app role gets NO update privilege on
--     lessons.published_revision_id, not even at column level, so a compromised
--     application cannot bypass reviewer approval.
--   * history is append-only: no UPDATE on revisions, no DELETE anywhere.
--   * no table-wide UPDATE on lessons; only the mutable column (slug) is granted.
--   * staff holds an identity mapping only (auth_subject, role, active). There is
--     no password column; authentication is external by design.

BEGIN;

-- neutralise any earlier broad grant before scoping
REVOKE ALL ON academy.lessons             FROM academy_app_dev;
REVOKE ALL ON academy.revisions           FROM academy_app_dev;
REVOKE ALL ON academy.staff               FROM academy_app_dev;
REVOKE ALL ON academy.review_events       FROM academy_app_dev;
REVOKE ALL ON academy.syllabus_mappings   FROM academy_app_dev;

GRANT SELECT ON academy.staff TO academy_app_dev;

GRANT SELECT, INSERT   ON academy.lessons TO academy_app_dev;
GRANT UPDATE (slug)    ON academy.lessons TO academy_app_dev;   -- never published_revision_id

GRANT SELECT, INSERT   ON academy.revisions TO academy_app_dev; -- never UPDATE, never DELETE

GRANT SELECT           ON academy.review_events TO academy_app_dev;
GRANT SELECT, INSERT   ON academy.syllabus_mappings TO academy_app_dev;  -- no DELETE

GRANT USAGE, SELECT ON SEQUENCE academy.review_events_id_seq TO academy_app_dev;

-- ---------------------------------------------------------------------------
-- Positive assertions: an exception aborts the whole transaction.
-- ---------------------------------------------------------------------------
DO $$
DECLARE missing text;
BEGIN
  SELECT string_agg(name, ', ') INTO missing FROM (
    SELECT 'staff.select' AS name
      WHERE NOT has_table_privilege('academy_app_dev','academy.staff','SELECT')
    UNION ALL SELECT 'lessons.insert'
      WHERE NOT has_table_privilege('academy_app_dev','academy.lessons','INSERT')
    UNION ALL SELECT 'lessons.slug.update'
      WHERE NOT has_column_privilege('academy_app_dev','academy.lessons','slug','UPDATE')
    UNION ALL SELECT 'revisions.insert'
      WHERE NOT has_table_privilege('academy_app_dev','academy.revisions','INSERT')
    UNION ALL SELECT 'review_events.select'
      WHERE NOT has_table_privilege('academy_app_dev','academy.review_events','SELECT')
    UNION ALL SELECT 'syllabus.insert'
      WHERE NOT has_table_privilege('academy_app_dev','academy.syllabus_mappings','INSERT')
    UNION ALL SELECT 'advance_review.execute'
      WHERE NOT has_function_privilege('academy_app_dev','academy.advance_review(text,uuid,text,text,jsonb)','EXECUTE')
  ) t;
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'required privileges missing: %', missing;
  END IF;
  RAISE NOTICE 'positive assertions passed';
END $$;

-- ---------------------------------------------------------------------------
-- Negative assertions: these MUST all be false. Any leak aborts the transaction,
-- which is the proof that publication cannot bypass reviewer approval.
-- ---------------------------------------------------------------------------
DO $$
DECLARE leaked text;
BEGIN
  SELECT string_agg(name, ', ') INTO leaked FROM (
    SELECT 'lessons.published_revision_id UPDATE' AS name
      WHERE has_column_privilege('academy_app_dev','academy.lessons','published_revision_id','UPDATE')
    UNION ALL SELECT 'lessons table UPDATE'
      WHERE has_table_privilege('academy_app_dev','academy.lessons','UPDATE')
    UNION ALL SELECT 'lessons DELETE'
      WHERE has_table_privilege('academy_app_dev','academy.lessons','DELETE')
    UNION ALL SELECT 'revisions UPDATE'
      WHERE has_table_privilege('academy_app_dev','academy.revisions','UPDATE')
    UNION ALL SELECT 'revisions DELETE'
      WHERE has_table_privilege('academy_app_dev','academy.revisions','DELETE')
    UNION ALL SELECT 'review_events INSERT'
      WHERE has_table_privilege('academy_app_dev','academy.review_events','INSERT')
    UNION ALL SELECT 'syllabus DELETE'
      WHERE has_table_privilege('academy_app_dev','academy.syllabus_mappings','DELETE')
    UNION ALL SELECT 'staff UPDATE'
      WHERE has_table_privilege('academy_app_dev','academy.staff','UPDATE')
  ) t;
  IF leaked IS NOT NULL THEN
    RAISE EXCEPTION 'privilege leak, publication could be bypassed: %', leaked;
  END IF;
  RAISE NOTICE 'negative assertions passed: publication requires advance_review()';
END $$;

COMMIT;

-- Post-commit probes, each of which must FAIL with "permission denied":
--   UPDATE academy.lessons SET published_revision_id = gen_random_uuid();
--   UPDATE academy.revisions SET content = content;
--   DELETE FROM academy.syllabus_mappings;
--   INSERT INTO academy.review_events(revision_id,actor_id,action)
--     VALUES (gen_random_uuid(), gen_random_uuid(), 'published');
