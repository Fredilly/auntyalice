-- Past-examination questions, with provenance and rights as first-class fields.
--
-- Design rule: nothing enters this table without an explicit rights_status and a
-- source. A question that cannot be traced to a real paper is not a past question,
-- and generated practice material lives in the lesson's own questions, never here.
--
-- rights_status:
--   VERIFIED_REDISTRIBUTABLE — we hold written permission or an open licence
--   LINK_ONLY                 — we may store metadata and link out, not the text
--   UNVERIFIED                — discovered, rights unknown, NOT importable
--
-- The ingestion tool refuses anything except VERIFIED_REDISTRIBUTABLE for full
-- text, and LINK_ONLY for metadata records. UNVERIFIED rows are quarantined.

BEGIN;

CREATE TABLE IF NOT EXISTS academy.past_papers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body          text NOT NULL CHECK (body IN ('WAEC','JAMB','NECO','BECE','COMMON_ENTRANCE')),
  year          smallint NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  subject       text NOT NULL,
  paper         text NOT NULL DEFAULT 'Paper 1',
  title         text,
  source_url    text NOT NULL,
  source_name   text NOT NULL,
  rights_status text NOT NULL CHECK (rights_status IN ('VERIFIED_REDISTRIBUTABLE','LINK_ONLY','UNVERIFIED')),
  licence_note  text,
  checked_at    date NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (body, year, subject, paper)
);

CREATE TABLE IF NOT EXISTS academy.past_questions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id       uuid NOT NULL REFERENCES academy.past_papers(id) ON DELETE CASCADE,
  question_no    smallint NOT NULL,
  topic          text,
  syllabus_ref   text,
  body_text      text,                 -- NULL when rights_status = LINK_ONLY
  options        jsonb,                -- [{key,text}] or NULL for theory
  answer_key     text,                 -- official key where published
  answer_source  text,                 -- who says this is the answer
  explanation    text,                 -- our step-by-step working, not the body's
  diagram_url    text,
  difficulty     smallint CHECK (difficulty BETWEEN 1 AND 5),
  verification   text NOT NULL DEFAULT 'UNVERIFIED'
                 CHECK (verification IN ('UNVERIFIED','CHECKED','DISPUTED')),
  lesson_slug    text,                 -- maps to academy.public_lessons(slug)
  duplicate_of   uuid REFERENCES academy.past_questions(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (paper_id, question_no)
);

CREATE INDEX IF NOT EXISTS past_questions_topic_idx ON academy.past_questions (topic);
CREATE INDEX IF NOT EXISTS past_questions_lesson_idx ON academy.past_questions (lesson_slug);
CREATE INDEX IF NOT EXISTS past_questions_verification_idx ON academy.past_questions (verification);

-- A question may not claim to be authentic past-paper text unless its paper is
-- redistributable, and a redistributable paper must carry a licence note.
CREATE OR REPLACE FUNCTION academy.past_question_guard() RETURNS trigger AS $$
DECLARE rights text;
BEGIN
  SELECT rights_status INTO rights FROM academy.past_papers WHERE id = NEW.paper_id;
  IF NEW.body_text IS NOT NULL AND rights <> 'VERIFIED_REDISTRIBUTABLE' THEN
    RAISE EXCEPTION 'Question text blocked: paper rights_status is %', rights;
  END IF;
  IF NEW.verification = 'CHECKED' AND NEW.explanation IS NULL THEN
    RAISE EXCEPTION 'A checked question must carry a step-by-step explanation';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS past_question_guard_trg ON academy.past_questions;
CREATE TRIGGER past_question_guard_trg BEFORE INSERT OR UPDATE ON academy.past_questions
  FOR EACH ROW EXECUTE FUNCTION academy.past_question_guard();

COMMIT;

-- Coverage view: what exists per body/subject/year, and how much of it is usable.
CREATE OR REPLACE VIEW academy.past_coverage AS
SELECT p.body, p.subject, p.year,
       count(q.id)                                              AS questions,
       count(*) FILTER (WHERE q.verification = 'CHECKED')        AS checked,
       count(*) FILTER (WHERE q.verification = 'UNVERIFIED')     AS unverified,
       count(*) FILTER (WHERE q.verification = 'DISPUTED')       AS disputed,
       count(*) FILTER (WHERE q.lesson_slug IS NOT NULL)         AS mapped_to_lessons
FROM academy.past_papers p
LEFT JOIN academy.past_questions q ON q.paper_id = p.id
GROUP BY p.body, p.subject, p.year;
