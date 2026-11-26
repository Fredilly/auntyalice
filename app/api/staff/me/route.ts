import "server-only";
import { me } from "../../../lib/staff-auth.mjs";

export function GET(request: Request) {
  return me(request);
}
