import "server-only";

import type { StaffActor } from "./staff-auth.mjs";
import type { ReviewAction, ReviewDecision, ReviewState } from "./review-flow.mjs";
import { validateReviewDecision } from "./review-flow.mjs";
import { DatabaseNotConfiguredError, withDatabase, type Pool } from "./db.mjs";
import {
  getLesson, getPublishedRevision, insertDraft, LessonWriteError, listLessonsForStaff,
  listReviewQueue, requireActiveTeacher, transitionLesson, withTransaction,
} from "./lesson-storage.mjs";
import { workspaceUnavailable, type ExamTrack, type LessonDraft, type SyllabusMapping } from "./staff-workspace.mjs";

export { getLesson, listLessonsForStaff, renameLesson, saveDraft, transitionLesson } from "./lesson-storage.mjs";

export type { StaffActor } from "./staff-auth.mjs";
type LessonState = "draft" | "changes_requested" | "submitted" | "approved" | "published" | "archived";

export interface LessonSummary {
  id: string;
  title: string;
  state: LessonState;
}

export interface StaffLesson extends LessonSummary {
  ownerId: string;
  authorId: string;
  revisionId: string;
  draft: LessonDraft;
  syllabusMappings: SyllabusMapping[];
}

type Failure = { ok: false; status: 400 | 403 | 404 | 409 | 503; error: string };
export type Result<T> = { ok: true; value: T } | Failure;

export interface ReviewQueueLesson extends LessonSummary {
  submittedAt: string;
  examTracks: LessonDraft["examTracks"];
  summary: string;
}

export interface PublishedLesson extends LessonDraft {
  state: "published";
  version: number;
  blocks?: unknown[];
}

export interface PublicLessonRepository {
  // Read only the revision selected by the public publication pointer.
  getPublished(slug: string): Promise<Result<PublishedLesson>>;
}

interface LessonRepository {
  // Reads return only records the actor is authorized to see.
  list(actor: StaffActor): Promise<Result<LessonSummary[]>>;
  get(actor: StaffActor, id: string): Promise<Result<StaffLesson>>;
  create(actor: StaffActor, draft: LessonDraft, mappings: SyllabusMapping[]): Promise<Result<{ lessonId: string; revisionId: string }>>;
  save(actor: StaffActor, lesson: StaffLesson, draft: LessonDraft, action: "save" | "submit", mappings?: SyllabusMapping[]):
    Promise<Result<{ revisionId: string }>>;
  // Reviewer-only summaries for submitted and approved revisions.
  listForReview(actor: StaffActor): Promise<Result<ReviewQueueLesson[]>>;
  // Atomically recheck active staff, independence, revision and state, record the
  // decision (including evidence or reason) and update the publication pointer.
  transition(actor: StaffActor, lesson: StaffLesson, action: ReviewAction, decision: ReviewDecision):
    Promise<Result<{ state: ReviewState }>>;
}

const reviewEvents = {
  approve: "approved",
  request_changes: "changes_requested",
  publish: "published",
} as const;

const missing = new LessonWriteError(404, "Lesson not found.");

async function run<T>(operation: (db: Pool) => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, value: await withDatabase(operation) };
  } catch (error) {
    if (error instanceof LessonWriteError) return { ok: false, status: error.status, error: error.message };
    if (error instanceof DatabaseNotConfiguredError) return { ok: false, status: 503, error: workspaceUnavailable };
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "23505") return { ok: false, status: 409, error: "The slug or syllabus mapping is already in use." };
      if (error.code === "P0001" && "message" in error) {
        switch (error.message) {
          case "Active staff required":
          case "Independent reviewer required":
            return { ok: false, status: 403, error: "An active independent reviewer is required for this decision." };
          case "Syllabus mapping required":
            return { ok: false, status: 400, error: "Add a syllabus mapping before submitting the lesson." };
          case "Complete checklist required":
            return { ok: false, status: 400, error: "Complete all five checklist items before approving." };
          case "Revision not found":
            return { ok: false, status: 404, error: "Revision not found." };
          case "Invalid transition":
          case "Cannot publish stale revision":
          case "Owner teacher and draft required":
            return { ok: false, status: 409, error: "The revision changed. Reload the lesson and try again." };
        }
      }
    }
    return { ok: false, status: 503, error: workspaceUnavailable };
  }
}

function notesText(notes: string | string[] | null | undefined) {
  return Array.isArray(notes) ? notes.join("\n\n") : notes ?? "";
}

function toDraft(content: Partial<Omit<LessonDraft, "slug" | "notes">> & { notes?: string | string[] },
  slug: string, mappedExams: ExamTrack[] = []): LessonDraft {
  return {
    slug,
    title: content.title ?? slug,
    notes: notesText(content.notes),
    examTracks: content.examTracks ?? mappedExams,
    videoId: content.videoId ?? null,
    questions: content.questions ?? [],
    // V2 structured lessons travel as blocks; older revisions simply have none.
    ...(Array.isArray((content as { blocks?: unknown }).blocks)
      ? { blocks: (content as { blocks: unknown[] }).blocks }
      : {}),
  };
}

export const staffLessons: LessonRepository = {
  list: actor => run(db => listLessonsForStaff(actor.id, actor.role, db)),
  get: (actor, id) => run(async db => {
    if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) throw missing;
    const row = await getLesson(id, actor, db);
    if (!row) throw missing;
    const syllabusMappings: SyllabusMapping[] = row.mappings;
    const draft = toDraft(row.content, row.slug, [...new Set(syllabusMappings.map(mapping => mapping.exam))]);
    return {
      id: row.id, ownerId: row.owner_id, authorId: row.author_id, revisionId: row.revision_id,
      state: row.state, title: draft.title, draft, syllabusMappings,
    };
  }),
  create: (actor, draft, syllabusMappings) => run(db => withTransaction(db, async client => {
    await requireActiveTeacher(client, actor);
    return insertDraft(client, { slug: draft.slug, ownerId: actor.id, content: { ...draft, syllabusMappings } });
  })),
  save: (actor, lesson, draft, action, mappings) => run(db => withTransaction(db, async client => {
    if (!canEditLesson(actor, lesson)) throw new LessonWriteError(403, "Only the authoring teacher can edit this draft.");
    await requireActiveTeacher(client, actor);
    const syllabusMappings = mappings ?? lesson.syllabusMappings.filter(mapping => draft.examTracks.includes(mapping.exam));
    const { revisionId } = await insertDraft(client, {
      lessonId: lesson.id, expectedRevisionId: lesson.revisionId, slug: draft.slug,
      ownerId: actor.id, content: { ...draft, syllabusMappings },
    });
    if (action === "submit") await transitionLesson({
      revisionId, actorId: actor.id, action: "submitted",
    }, client);
    return { revisionId };
  })),
  listForReview: actor => run(async db => {
    if (actor.role === "teacher") throw new LessonWriteError(403, "Reviewer access required.");
    const rows = await listReviewQueue(actor.id, actor.role, db);
    return rows.map(row => ({
      id: row.id, title: row.title, state: row.state, submittedAt: row.submitted_at.toISOString(),
      examTracks: row.exam_tracks ?? row.mapped_exams, summary: notesText(row.notes).split(/\n\s*\n/, 1)[0],
    }));
  }),
  transition: (actor, lesson, action, decision) => run(async db => {
    const allowed = validateReviewDecision(actor, lesson, action, decision);
    if (!allowed.ok) throw new LessonWriteError(allowed.status, allowed.error);
    const state = await transitionLesson({
      revisionId: lesson.revisionId, actorId: actor.id, action: reviewEvents[action],
      reason: decision.reason, checklist: decision.approval,
    }, db);
    return { state };
  }),
};

export const publicLessons: PublicLessonRepository = {
  getPublished: slug => run(async db => {
    const row = await getPublishedRevision(slug, db);
    if (!row) throw missing;
    return { ...toDraft(row.content, row.slug), version: row.version, state: "published" };
  }),
};

export function canEditLesson(actor: StaffActor, lesson: StaffLesson) {
  return actor.role === "teacher" && actor.id === lesson.ownerId &&
    actor.id === lesson.authorId && (lesson.state === "draft" || lesson.state === "changes_requested");
}
