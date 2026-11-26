import { isReviewComplete, reviewChecklist, transition } from "./publishing.mjs";
import { requireRole } from "./staff-auth.mjs";

export const reviewRoles = Object.freeze(["reviewer", "admin"]);

// The repository and SQL policy use decision event names as revision states.
const actions = Object.freeze({
  approve: "approved",
  request_changes: "changes_requested",
  publish: "published",
});

const failure = (status, error) => ({ ok: false, status, error });
const success = value => ({ ok: true, value });

export function isIndependentReviewer(actor, lesson) {
  return Boolean(actor?.id && requireRole(actor, reviewRoles) &&
    actor.id !== lesson.authorId && actor.id !== lesson.ownerId);
}

export function validateReviewDecision(actor, lesson, action, decision) {
  if (!isIndependentReviewer(actor, lesson)) {
    return failure(403, "An independent reviewer is required. You cannot review or publish a lesson you authored or own.");
  }
  if (typeof action !== "string" || !Object.hasOwn(actions, action)) {
    return failure(400, "Choose a review decision.");
  }
  if (decision.revisionId !== lesson.revisionId) {
    return failure(409, "This revision has changed. Reload the lesson before making a decision.");
  }
  if (action === "approve" && !isReviewComplete(decision.approval)) {
    return failure(400, "Complete all five checklist items before approving.");
  }
  if (action === "request_changes" && (typeof decision.reason !== "string" || !decision.reason.trim())) {
    return failure(400, "Enter a reason for requesting changes.");
  }

  try {
    return success(transition({
      state: lesson.state,
      action: actions[action],
      actor: { ...actor, active: true },
      ownerId: lesson.ownerId,
      authorId: lesson.authorId,
      approval: decision.approval,
    }));
  } catch {
    return failure(409, action === "publish"
      ? "Only an approved revision can be published."
      : "Only a revision in review can receive this decision.");
  }
}

const json = (body, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function handleReviewDecision(request, id, repository, actor = null) {
  if (!actor) return json({ error: "Staff session required." }, 401);
  if (!requireRole(actor, reviewRoles)) return json({ error: "Only reviewers and administrators can make review decisions." }, 403);

  const mediaType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (mediaType !== "application/json") return json({ error: "Expected application/json." }, 415);
  const body = await request.json().catch(() => null);
  const action = body?.action;
  if (typeof action !== "string" || !Object.hasOwn(actions, action)) {
    return json({ error: "Choose a review decision." }, 400);
  }

  const result = await repository.get(actor, id);
  if (!result.ok) return json({ error: result.error }, result.status);

  const lesson = result.value;
  const decision = {
    revisionId: typeof body.revisionId === "string" ? body.revisionId : "",
  };
  if (action === "approve") {
    decision.approval = Object.fromEntries(
      Object.keys(reviewChecklist).map(key => [key, body.approval?.[key] === true]),
    );
  }
  if (action === "request_changes") {
    decision.reason = typeof body.reason === "string" ? body.reason.trim() : "";
  }
  const allowed = validateReviewDecision(actor, lesson, action, decision);
  if (!allowed.ok) return json({ error: allowed.error }, allowed.status);

  const updated = await repository.transition(actor, lesson, action, decision);
  return updated.ok ? json({ state: updated.value.state }) : json({ error: updated.error }, updated.status);
}

export async function getPublishedLesson(repository, slug) {
  const result = await repository.getPublished(slug);
  if (!result.ok || result.value.state !== "published" || result.value.slug !== slug) return null;
  return result.value;
}
