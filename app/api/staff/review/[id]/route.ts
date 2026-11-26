import "server-only";

import { handleReviewDecision } from "../../../../lib/review-flow.mjs";
import { staffLessons } from "../../../../lib/staff-lesson-repo";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleReviewDecision(request, id, staffLessons);
}
