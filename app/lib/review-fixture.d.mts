import type { PublicLessonRepository, StaffActor, staffLessons } from "./staff-lesson-repo";

type ReviewFixture = Pick<typeof staffLessons, "get" | "listForReview" | "transition"> & PublicLessonRepository;

export const previewReviewer: StaffActor;
export const reviewPreviewNotice: string;
export function isReviewPreview(value: unknown): boolean;
export function createReviewFixture(): ReviewFixture;
export function getReviewPreviewFixture(): ReviewFixture;
