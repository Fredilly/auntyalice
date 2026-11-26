import type { PublishedLesson, PublicLessonRepository, StaffActor, StaffLesson, staffLessons } from "./staff-lesson-repo";

export type ReviewAction = "approve" | "request_changes" | "publish";
export type ReviewState = "approved" | "changes_requested" | "published";
export interface ReviewDecision {
  revisionId: string;
  approval?: Record<string, boolean>;
  reason?: string;
}

export const reviewRoles: readonly ["reviewer", "admin"];
export function isIndependentReviewer(actor: StaffActor | null, lesson: Pick<StaffLesson, "authorId" | "ownerId">): boolean;
export function validateReviewDecision(
  actor: StaffActor, lesson: StaffLesson, action: ReviewAction, decision: ReviewDecision,
): { ok: true; value: ReviewState } | { ok: false; status: 400 | 403 | 409; error: string };
export function handleReviewDecision(
  request: Request, id: string, repository: Pick<typeof staffLessons, "get" | "transition">, actor?: StaffActor | null,
): Promise<Response>;
export function getPublishedLesson(repository: PublicLessonRepository, slug: string): Promise<PublishedLesson | null>;
