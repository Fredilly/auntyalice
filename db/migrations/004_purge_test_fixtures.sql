-- Acceptance-test artefacts are not learning content.
--
-- The M2 acceptance run created real rows in the same tables as taught lessons, so
-- "M2 Acceptance Lesson" (a 2+2 question) is visible to students on the public
-- Academy and counted in the dashboard. This migration removes those rows and makes
-- it structurally hard to repeat: fixtures get a flag, and the public view excludes
-- anything flagged.
--
-- Owner-run: the application role has no UPDATE/DELETE on academy.lessons.

BEGIN;

ALTER TABLE academy.lessons
  ADD COLUMN IF NOT EXISTS is_fixture boolean NOT NULL DEFAULT false;

-- mark known artefacts
UPDATE academy.lessons
SET is_fixture = true
WHERE slug IN ('m2-acceptance', 'isolation-probe', 'submit-practice')
   OR slug LIKE 'm2-%'
   OR slug LIKE 'isolation-%'
   OR slug LIKE 'test-%'
   OR slug LIKE 'fixture-%';

-- delete the artefacts themselves (revisions and mappings cascade)
DELETE FROM academy.lessons WHERE is_fixture = true;

COMMIT;

-- Recreate the public view so is_fixture is excluded by construction, not by filter.
CREATE OR REPLACE VIEW academy.public_lessons AS
SELECT l.slug,
       l.id,
       l.updated_at,
       r.content,
       r.version
FROM academy.lessons l
JOIN academy.revisions r ON r.id = l.published_revision_id
WHERE l.is_fixture = false;

-- Guard: a fixture may never be published in the first place.
CREATE OR REPLACE FUNCTION academy.block_fixture_publication() RETURNS trigger AS $$
BEGIN
  IF NEW.published_revision_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM academy.lessons WHERE id = NEW.lesson_id AND is_fixture) THEN
    RAISE EXCEPTION 'Fixture lessons cannot be published';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
