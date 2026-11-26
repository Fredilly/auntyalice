import "server-only";

import { transition } from "../../../../lib/publishing.mjs";
import { resolveActor } from "../../../../lib/staff-auth.mjs";
import { canEditLesson, staffLessons } from "../../../../lib/staff-lesson-repo";
import { validateDraft } from "../../../../lib/staff-workspace.mjs";

const json = (body: object, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = resolveActor(request);
  if (!actor) return json({ error: "Staff session required" }, 401);

  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return json({ error: "Expected application/json" }, 415);
  }

  const { id } = await params;
  const result = await staffLessons.get(actor, id);
  if (!result.ok) return json({ error: result.error }, result.status);
  const lesson = result.value;

  const body = await request.json().catch(() => null) as {
    action?: unknown;
    revisionId?: unknown;
    draft?: unknown;
  } | null;
  const action = body?.action;
  if (!body || (action !== "save" && action !== "submit")) {
    return json({ error: "Choose save draft or submit for review." }, 400);
  }
  if (body.revisionId !== lesson.revisionId) {
    return json({ error: "This lesson changed. Copy your edits before reloading the page." }, 409);
  }

  if (action === "submit") {
    try {
      transition({
        state: lesson.state,
        action: "submitted",
        actor: { ...actor, active: true },
        ownerId: lesson.ownerId,
        authorId: lesson.authorId,
      });
    } catch {
      const status = lesson.state === "draft" ? 403 : 409;
      return json({ error: "Only the authoring teacher can submit a current draft for review." }, status);
    }
  } else if (!canEditLesson(actor, lesson)) {
    return json({ error: "Only the authoring teacher can edit a current draft." }, 403);
  }

  const validated = validateDraft(body.draft);
  if (!validated.ok) return json({ errors: validated.errors }, 422);

  const saved = await staffLessons.save(actor, lesson, validated.draft, action);
  return saved.ok ? json(saved.value) : json({ error: saved.error }, saved.status);
}
