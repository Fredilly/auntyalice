-- Production staff. Two genuine people, supplied by the owner. No defaults, no
-- fabricated identities, no dev:/test: subjects.
--
--   psql "$PROD_OWNER_URL" -v ON_ERROR_STOP=1 \
--     -v teacher_subject="'real-teacher-subject'" \
--     -v reviewer_subject="'real-reviewer-subject'" \
--     -f db/production/20_staff.sql
--
-- psql does not substitute variables inside DO blocks, hence the GUC round-trip.

\set ON_ERROR_STOP on

BEGIN;

SELECT set_config('academy.teacher_subject',  :'teacher_subject',  true);
SELECT set_config('academy.reviewer_subject', :'reviewer_subject', true);

DO $$
DECLARE t text := current_setting('academy.teacher_subject');
        r text := current_setting('academy.reviewer_subject');
BEGIN
  IF t IS NULL OR r IS NULL OR btrim(t) = '' OR btrim(r) = '' THEN
    RAISE EXCEPTION 'both -v teacher_subject and -v reviewer_subject are required';
  END IF;
  IF t ~ '^(dev:|test:)' OR t LIKE '%@auntyalice.test'
     OR r ~ '^(dev:|test:)' OR r LIKE '%@auntyalice.test' THEN
    RAISE EXCEPTION 'refusing development or test identity in production (% / %)', t, r;
  END IF;
  IF t = r THEN
    RAISE EXCEPTION 'author and reviewer must be different people';
  END IF;

  INSERT INTO academy.staff (auth_subject, role, active)
  VALUES (t, 'teacher', true), (r, 'reviewer', true)
  ON CONFLICT (auth_subject) DO UPDATE SET role = EXCLUDED.role, active = true;
END $$;

DO $$
DECLARE t int; rv int;
BEGIN
  SELECT count(*) INTO t  FROM academy.staff WHERE role='teacher'  AND active;
  SELECT count(*) INTO rv FROM academy.staff WHERE role='reviewer' AND active;
  IF t < 1 OR rv < 1 THEN RAISE EXCEPTION 'need one active teacher and one active reviewer'; END IF;
  IF EXISTS (SELECT 1 FROM academy.staff WHERE auth_subject ~ '^(dev:|test:)'
               OR auth_subject LIKE '%@auntyalice.test') THEN
    RAISE EXCEPTION 'development identity present in production staff';
  END IF;
  RAISE NOTICE 'staff ready: % teacher(s), % reviewer(s)', t, rv;
END $$;

COMMIT;
