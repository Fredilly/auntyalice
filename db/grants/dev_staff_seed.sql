-- Development seed: the two staff identities needed to exercise the full
-- teacher -> reviewer -> student path. Run once, as the DATABASE OWNER,
-- against br-lucky-cloud-be62md6i only.
--
-- Why this cannot be done by the app role: it holds SELECT only on academy.staff,
-- by design. Staff records are provisioning data, not application data.
--
-- auth_subject is the external identity subject (Cloudflare Access). The values
-- below are development-only placeholders; replace them with real Access subjects
-- before any non-development use. They are deliberately in a reserved test domain.

BEGIN;

INSERT INTO academy.staff (id, auth_subject, role, active) VALUES
  (gen_random_uuid(), 'dev:teacher@auntyalice.test',  'teacher',  true),
  (gen_random_uuid(), 'dev:reviewer@auntyalice.test', 'reviewer', true)
ON CONFLICT (auth_subject) DO UPDATE SET active = true, role = EXCLUDED.role;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM academy.staff WHERE auth_subject LIKE 'dev:%@auntyalice.test';
  IF n < 2 THEN
    RAISE EXCEPTION 'seed failed: expected 2 development staff rows, found %', n;
  END IF;
  RAISE NOTICE 'development staff seeded: %', n;
END $$;

COMMIT;

-- Verify after COMMIT:
--   SELECT id, auth_subject, role, active FROM academy.staff ORDER BY role;
