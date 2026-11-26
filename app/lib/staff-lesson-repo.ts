import "server-only";

import type { StaffActor } from "./staff-auth.mjs";
import type { ReviewAction, ReviewDecision, ReviewState } from "./review-flow.mjs";
import { workspaceUnavailable, type LessonDraft } from "./staff-workspace.mjs";

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
}

type Failure = { ok: false; status: 400 | 403 | 404 | 409 | 503; error: string };
export type Result<T> = { ok: true; value: T } | Failure;

export interface ReviewQueueLesson extends LessonSummary {
  authorName: string;
  submittedAt: string;
  examTracks: LessonDraft["examTracks"];
  summary: string;
}

export interface PublishedLesson extends LessonDraft {
  state: "published";
  revisionId: string;
}

export interface PublicLessonRepository {
  // Read only the revision selected by the public publication pointer.
  getPublished(slug: string): Promise<Result<PublishedLesson>>;
}

interface LessonRepository {
  // Reads return only records the actor is authorized to see.
  list(actor: StaffActor): Promise<Result<LessonSummary[]>>;
  get(actor: StaffActor, id: string): Promise<Result<StaffLesson>>;
  // A future adapter must recheck active staff, ownership, current state and revision
  // inside the same transaction as the new revision and any submission event.
  save(actor: StaffActor, lesson: StaffLesson, draft: LessonDraft, action: "save" | "submit"):
    Promise<Result<{ revisionId: string }>>;
  // Reviewer-only summaries for submitted and approved revisions.
  listForReview(actor: StaffActor): Promise<Result<ReviewQueueLesson[]>>;
  // Atomically recheck active staff, independence, revision and state, record the
  // decision (including evidence or reason) and update the publication pointer.
  transition(actor: StaffActor, lesson: StaffLesson, action: ReviewAction, decision: ReviewDecision):
    Promise<Result<{ state: ReviewState }>>;
}

async function unavailable(): Promise<Failure> {
  return { ok: false, status: 503, error: workspaceUnavailable };
}

export const staffLessons: LessonRepository = {
  list: unavailable,
  get: unavailable,
  save: unavailable,
  listForReview: unavailable,
  transition: unavailable,
};

export const publicLessons: PublicLessonRepository = { getPublished: unavailable };

export function canEditLesson(actor: StaffActor, lesson: StaffLesson) {
  return actor.role === "teacher" && actor.id === lesson.ownerId &&
    actor.id === lesson.authorId && lesson.state === "draft";
}
