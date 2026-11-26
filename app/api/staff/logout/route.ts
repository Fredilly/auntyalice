import "server-only";
import { logout } from "../../../lib/staff-auth.mjs";

export function POST() {
  return logout();
}
