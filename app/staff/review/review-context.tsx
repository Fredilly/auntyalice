import { headers } from "next/headers";
import { forbidden } from "next/navigation";
import { reviewRoles } from "../../lib/review-flow.mjs";
import { requireRole, resolveActor } from "../../lib/staff-auth.mjs";

export async function reviewActor() {
  const actor = await resolveActor({ headers: await headers() });
  if (!actor || !requireRole(actor, reviewRoles)) forbidden();
  return actor;
}
