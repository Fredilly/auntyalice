import "server-only";

import { handleReviewDecision } from "../../../../lib/review-flow.mjs";
import { getReviewPreviewFixture, isReviewPreview, previewReviewer } from "../../../../lib/review-fixture.mjs";
import { readSessionActor } from "../../../../lib/staff-auth.mjs";
import { staffLessons } from "../../../../lib/staff-lesson-repo";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const previewValues = new URL(request.url).searchParams.getAll("preview");
  const preview = previewValues.length === 1 && isReviewPreview(previewValues[0]);
  const actor = readSessionActor(request) ?? (preview ? previewReviewer : null);
  return handleReviewDecision(request, id, preview ? getReviewPreviewFixture() : staffLessons, actor);
}

