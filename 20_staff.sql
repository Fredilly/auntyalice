-- Production staff accounts. Run as owner on the PRODUCTION branch.
-- Exactly two real people: an author and an independent reviewer.
-- Development identities (dev:*, test:*, *@auntyalice.test) are rejected — they belong
-- to the development branch and must never authenticate against production.
--
--   psql "$PROD_OWNER_URL" -v ON_ERROR_STOP=1 \
--     -v teacher_subject="'real-teacher-id'" -v reviewer_subject="'real-reviewer-id'" \
--     -f db/production/20_staff.sql

BEGIN;

DO $$
BEGIN
  IF :teacher_subject ~ '^(dev:|test:)' OR :teacher_subject LIKE '%@auntyalice.test' THEN
    RAISE EXCEPTION 'refusing development identity for production: %', :teacher_subject;
  END IF;
  IF :reviewer_subject ~ '^(dev:|test:)' OR :reviewer_subject LIKE '%@auntyalice.test' THEN
    RAISE EXCEPTION 'refusing development identity for production: %', :reviewer_subject;
  END IF;
  IF :teacher_subject = :reviewer_subject THEN
    RAISE EXCEPTION 'author and reviewer must be different people';
  END IF;
END $$;

INSERT INTO academy.staff (auth_subject, role, active)
VALUES (:teacher_subject, 'teacher', true), (:reviewer_subject, 'reviewer', true)
ON CONFLICT (auth_subject) DO UPDATE SET role = EXCLUDED.role, active = true;

DO $$
DECLARE t int; rv int;
BEGIN
  SELECT count(*) INTO t  FROM academy.staff WHERE role='teacher'  AND active;
  SELECT count(*) INTO rv FROM academy.staff WHERE role='reviewer' AND active;
  IF t < 1 OR rv < 1 THEN RAISE EXCEPTION 'need one active teacher and one active reviewer'; END IF;
  IF EXISTS (SELECT 1 FROM academy.staff WHERE auth_subject ~ '^(dev:|test:)') THEN
    RAISE EXCEPTION 'development identity present in production staff';
  END IF;
  RAISE NOTICE 'staff ready: % teacher(s), % reviewer(s)', t, rv;
END $$;

COMMIT;
