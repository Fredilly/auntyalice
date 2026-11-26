import { reviewRoles, validateReviewDecision } from "../../app/lib/review-flow.mjs";
import { requireRole } from "../../app/lib/staff-auth.mjs";

export const previewReviewer = {
  id: "sample-reviewer",
  subject: "development-preview",
  role: "reviewer",
  active: true,
};

export function isReviewPreview(value) {
  return process.env.NODE_ENV === "development" && value === "1";
}

export function createReviewFixture() {
  const summary = {
    id: "sample-fractions",
    title: "Comparing fractions",
    state: "submitted",
    authorName: "Sample author",
    submittedAt: "2026-11-25T12:00:00Z",
    examTracks: ["bece", "common-entrance"],
    summary: "Compare fractions by expressing them with the same denominator.",
  };
  let lesson = {
    id: summary.id,
    title: summary.title,
    state: summary.state,
    authorId: "sample-author",
    ownerId: "sample-owner",
    revisionId: "sample-fractions-v1",
    draft: {
      slug: "sample-fractions",
      title: summary.title,
      examTracks: summary.examTracks,
      videoId: "AAAAAAAAAAA",
      notes: "To compare fractions, rewrite them with the same denominator. Once the denominators match, compare the numerators.\n\nFor example, 1/2 is 2/4, so it is greater than 1/4.",
      questions: [
        { id: "fraction-1", prompt: "Which fraction is greater?", options: ["1/2", "1/4"], answer: 0, explanation: "One half equals two quarters, so it is larger than one quarter." },
        { id: "fraction-2", prompt: "Which fraction is equivalent to 2/3?", options: ["3/6", "4/6", "5/6"], answer: 1, explanation: "Multiply the numerator and denominator by two to get 4/6." },
      ],
    },
  };

  const denied = { ok: false, status: 403, error: "Reviewer access required." };
  const missing = { ok: false, status: 404, error: "Lesson not found." };

  return {
    async listForReview(actor) {
      if (!requireRole(actor, reviewRoles)) return denied;
      const visible = lesson.state === "submitted" || lesson.state === "approved";
      return { ok: true, value: visible ? [structuredClone({ ...summary, state: lesson.state })] : [] };
    },
    async get(actor, id) {
      if (!requireRole(actor, reviewRoles)) return denied;
      return id === lesson.id ? { ok: true, value: structuredClone(lesson) } : missing;
    },
    async transition(actor, expected, action, decision) {
      if (expected.id !== lesson.id) return missing;
      if (expected.revisionId !== lesson.revisionId || expected.state !== lesson.state) {
        return { ok: false, status: 409, error: "This lesson changed. Reload it before making a decision." };
      }
      const result = validateReviewDecision(actor, lesson, action, decision);
      if (!result.ok) return result;
      lesson = { ...lesson, state: result.value };
      return { ok: true, value: { state: result.value } };
    },
    async getPublished(slug) {
      if (slug !== lesson.draft.slug || lesson.state !== "published") return missing;
      return { ok: true, value: { ...structuredClone(lesson.draft), revisionId: lesson.revisionId, state: "published" } };
    },
  };
}
