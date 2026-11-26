import "server-only";

import { resolveActor } from "../../../../lib/staff-auth.mjs";
import { extractYouTubeId } from "../../../../lib/staff-workspace.mjs";

const json = (body: object, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  if (!resolveActor(request)) return json({ error: "Staff session required" }, 401);

  const body = await request.json().catch(() => null) as { videoUrl?: unknown } | null;
  const videoId = extractYouTubeId(body?.videoUrl);
  return videoId
    ? json({ videoId })
    : json({ error: "Enter a valid HTTPS YouTube watch, Shorts or share URL." }, 422);
}
