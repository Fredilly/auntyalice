import "server-only";

import { resolveActor } from "../../../lib/staff-auth.mjs";
import { staffLessons } from "../../../lib/staff-lesson-repo";
import { validateDraft, validateSyllabusMappings } from "../../../lib/staff-workspace.mjs";

const json = (body: object, status: number) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const actor = resolveActor(request);
  if (!actor) return json({ error: "Staff session required" }, 401);
  if (actor.role !== "teacher") return json({ error: "Only teachers can create lesson drafts." }, 403);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return json({ error: "Expected application/json" }, 415);
  }

  const body = await request.json().catch(() => null) as { draft?: { syllabusMappings?: unknown } } | null;
  const validated = validateDraft(body?.draft);
  if (!validated.ok) return json({ errors: validated.errors }, 422);
  const mappingInput = body?.draft?.syllabusMappings;
  const mappings = mappingInput === undefined ? [] : validateSyllabusMappings(mappingInput, validated.draft.examTracks);
  if (!mappings) return json({ errors: { syllabusMappings: "Enter unique syllabus mappings with an edition, objective and HTTPS source for selected exam tracks." } }, 422);

  const result = await staffLessons.create(actor, validated.draft, mappings);
  return result.ok ? json(result.value, 201) : json({ error: result.error }, result.status);
}
