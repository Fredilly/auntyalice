-- Restricted capability roles, not login credentials. Apply per environment.
BEGIN;
CREATE ROLE academy_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE ROLE academy_reader NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
GRANT USAGE ON SCHEMA academy TO academy_runtime, academy_reader;
ALTER TABLE academy.review_events ADD COLUMN checklist jsonb;
CREATE VIEW academy.public_lessons AS  SELECT l.slug,
    r.version,
    r.content
   FROM academy.lessons l
     JOIN academy.revisions r ON r.id = l.published_revision_id AND r.lesson_id = l.id
  WHERE (( SELECT e.action
           FROM academy.review_events e
          WHERE e.revision_id = r.id
          ORDER BY e.id DESC
         LIMIT 1)) = 'published'::text;
GRANT SELECT ON academy.public_lessons TO academy_reader, academy_runtime;
CREATE OR REPLACE FUNCTION academy.advance_review(p_actor_subject text, p_revision uuid, p_action text, p_reason text DEFAULT ''::text, p_checklist jsonb DEFAULT NULL::jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'academy'
AS $function$
DECLARE a academy.staff%ROWTYPE; r academy.revisions%ROWTYPE; l academy.lessons%ROWTYPE; s text; previous uuid;
BEGIN
 SELECT * INTO a FROM academy.staff WHERE auth_subject=p_actor_subject AND active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active staff required'; END IF;
 SELECT * INTO r FROM academy.revisions WHERE id=p_revision;
 IF NOT FOUND THEN RAISE EXCEPTION 'Revision not found'; END IF;
 SELECT * INTO l FROM academy.lessons WHERE id=r.lesson_id FOR UPDATE;
 SELECT action INTO s FROM academy.review_events WHERE revision_id=r.id ORDER BY id DESC LIMIT 1;
 s:=coalesce(s,'draft');
 IF p_action='submitted' THEN
 IF s<>'draft' OR a.role<>'teacher' OR a.id<>l.owner_id OR a.id<>r.author_id THEN RAISE EXCEPTION 'Owner teacher and draft required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM academy.syllabus_mappings WHERE revision_id=r.id) THEN RAISE EXCEPTION 'Syllabus mapping required'; END IF;
 ELSIF p_action IN ('approved','changes_requested','published','archived') THEN
 IF a.role NOT IN ('reviewer','admin') OR a.id IN (l.owner_id,r.author_id) THEN RAISE EXCEPTION 'Independent reviewer required'; END IF;
 IF NOT ((s='submitted' AND p_action IN ('approved','changes_requested')) OR (s='approved' AND p_action='published') OR (s='published' AND p_action='archived')) THEN RAISE EXCEPTION 'Invalid transition'; END IF;
 IF p_action='approved' AND NOT coalesce(p_checklist @> '{"accuracy":true,"answerKeys":true,"rights":true,"safeguarding":true,"accessibility":true}'::jsonb,false) THEN RAISE EXCEPTION 'Complete checklist required'; END IF;
 IF p_action='published' THEN
 IF l.published_revision_id IS NOT NULL THEN
 SELECT id INTO previous FROM academy.revisions WHERE id=l.published_revision_id AND version>=r.version;
 IF FOUND THEN RAISE EXCEPTION 'Cannot publish stale revision'; END IF;
 INSERT INTO academy.review_events(revision_id,actor_id,action,reason) VALUES(l.published_revision_id,a.id,'archived','Superseded by newer revision');
 END IF;
 UPDATE academy.lessons SET published_revision_id=r.id WHERE id=l.id;
 ELSIF p_action='archived' THEN
 UPDATE academy.lessons SET published_revision_id=NULL WHERE id=l.id AND published_revision_id=r.id;
 END IF;
 ELSE RAISE EXCEPTION 'Invalid action'; END IF;
 INSERT INTO academy.review_events(revision_id,actor_id,action,reason,checklist) VALUES(r.id,a.id,p_action,coalesce(p_reason,''),CASE WHEN p_action='approved' THEN p_checklist ELSE NULL END);
 RETURN p_action;
END $function$;
REVOKE ALL ON FUNCTION academy.advance_review(text,uuid,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION academy.advance_review(text,uuid,text,text,jsonb) TO academy_runtime;
COMMIT;
