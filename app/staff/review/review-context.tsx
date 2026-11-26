import { headers } from "next/headers";
import { forbidden } from "next/navigation";
import { getReviewPreviewFixture, isReviewPreview, previewReviewer } from "../../lib/review-fixture.mjs";
import { reviewRoles } from "../../lib/review-flow.mjs";
import { requireRole, resolveActor } from "../../lib/staff-auth.mjs";
import { staffLessons } from "../../lib/staff-lesson-repo";

export type ReviewSearchParams = Promise<{ preview?: string | string[] }>;

export async function reviewContext(searchParams: ReviewSearchParams) {
  const [queryParams, requestHeaders] = await Promise.all([searchParams, headers()]);
  const preview = isReviewPreview(queryParams.preview);
  const sessionActor = resolveActor({ headers: requestHeaders });
  const actor = sessionActor ?? (preview ? previewReviewer : null);
  if (!actor || !requireRole(actor, reviewRoles)) forbidden();

  return {
    actor,
    preview,
    query: preview ? "?preview=1" : "",
    repository: preview ? getReviewPreviewFixture() : staffLessons,
  };
}

