if (typeof window !== "undefined") throw new Error("Staff repository is server-only");

// Neon SQL-over-HTTPS keeps this single lookup usable in the Worker without a driver dependency.
export async function findStaffBySubject(subject) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Staff repository not configured");

  const database = URL.parse(connectionString);
  if (!database || !["postgres:", "postgresql:"].includes(database.protocol) ||
      !database.hostname.endsWith(".neon.tech")) {
    throw new Error("Staff repository requires a Neon connection string");
  }

  const suffix = database.hostname.slice(database.hostname.indexOf("."));
  const response = await fetch(`https://api${suffix}/sql`, {
    method: "POST",
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(5000),
    headers: {
      "Content-Type": "application/json",
      "Neon-Connection-String": connectionString,
      "Neon-Raw-Text-Output": "true",
      "Neon-Array-Mode": "true",
    },
    body: JSON.stringify({
      query: "SELECT id, auth_subject, role, active FROM academy.staff WHERE auth_subject = $1",
      params: [subject],
    }),
  });
  if (!response.ok) throw new Error("Staff lookup unavailable");

  const { rows } = await response.json();
  if (!Array.isArray(rows)) throw new Error("Invalid staff lookup response");
  if (rows.length === 0) return null;
  if (rows.length !== 1 || !Array.isArray(rows[0]) || rows[0].length !== 4) {
    throw new Error("Invalid staff lookup response");
  }

  const [id, authSubject, role, active] = rows[0];
  return { id, subject: authSubject, role, active: active === "t" };
}
