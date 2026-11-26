import "server-only";
import { establishSession } from "../../../lib/staff-auth.mjs";

export function GET(request: Request) {
  return establishSession(request);
}
