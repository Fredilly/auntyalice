/**
 * Adapter contract: look up a normalized email and return null or a record
 * with id, subject (academy.staff.auth_subject), role, name, active,
 * passwordSalt and passwordHash. Both password fields are lowercase hex.
 * The salt is 16 random bytes and the 64-byte hash uses scrypt with
 * N = 32768, r = 8 and p = 3.
 * @param {string} email
 */
export async function findStaffByEmail(email) {
  // No D1 or Postgres staff repository binding is configured for this app.
  throw new Error("Staff repository not configured");
}

/** @param {string} id */
export async function touchLastLogin(id) {
  throw new Error("Staff repository not configured");
}
