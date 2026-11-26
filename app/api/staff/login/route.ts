import "server-only";
import { login } from "../../../lib/staff-auth.mjs";

export function POST(request: Request) {
  return login(request);
}
