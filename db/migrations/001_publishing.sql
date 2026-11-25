-- Proposed Neon PostgreSQL schema. Apply to disposable test DB before production approval.
BEGIN;
CREATE SCHEMA academy;
CREATE TABLE academy.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_subject text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('teacher','reviewer','admin')),
  active boolean NOT NULL DEFAULT true
);
CREATE TABLE academy.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  owner_id uuid NOT NULL REFERENCES academy.staff(id),
  published_revision_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE academy.revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES academy.lessons(id),
  version integer NOT NULL CHECK(version > 0),
  author_id uuid NOT NULL REFERENCES academy.staff(id),
  content jsonb NOT NULL CHECK(jsonb_typeof(content) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(lesson_id,version),
  UNIQUE(lesson_id,id)
);
ALTER TABLE academy.lessons ADD CONSTRAINT published_revision_belongs_to_lesson
  FOREIGN KEY(id,published_revision_id) REFERENCES academy.revisions(lesson_id,id);
CREATE TABLE academy.review_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  revision_id uuid NOT NULL REFERENCES academy.revisions(id),
  actor_id uuid NOT NULL REFERENCES academy.staff(id),
  action text NOT NULL CHECK(action IN ('submitted','changes_requested','approved','published','archived')),
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX review_events_revision_idx ON academy.review_events(revision_id,id DESC);
CREATE TABLE academy.syllabus_mappings (
  revision_id uuid NOT NULL REFERENCES academy.revisions(id),
  exam text NOT NULL CHECK(exam IN ('jamb','waec','neco','bece','common-entrance')),
  syllabus_edition text NOT NULL CHECK(length(trim(syllabus_edition)) > 0),
  objective_reference text NOT NULL CHECK(length(trim(objective_reference)) > 0),
  source_url text NOT NULL CHECK(source_url LIKE 'https://%'),
  PRIMARY KEY(revision_id,exam,syllabus_edition,objective_reference)
);
-- Append-only content and review history. Runtime grants must also exclude TRUNCATE and DDL.
CREATE FUNCTION academy.reject_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Publishing history is immutable'; END;
$$;
CREATE TRIGGER immutable_revision BEFORE UPDATE OR DELETE ON academy.revisions
FOR EACH ROW EXECUTE FUNCTION academy.reject_mutation();
CREATE TRIGGER immutable_review BEFORE UPDATE OR DELETE ON academy.review_events
FOR EACH ROW EXECUTE FUNCTION academy.reject_mutation();
CREATE TRIGGER immutable_mapping BEFORE UPDATE OR DELETE ON academy.syllabus_mappings
FOR EACH ROW EXECUTE FUNCTION academy.reject_mutation();
-- No public or application grants in this migration. The future public reader
-- must receive access only to an explicitly approved projection, never base tables.
REVOKE ALL ON SCHEMA academy FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA academy FROM PUBLIC;
COMMIT;
