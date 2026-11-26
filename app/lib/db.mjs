import pg from "pg";

export class DatabaseNotConfiguredError extends Error {
  code = "database_not_configured";

  constructor() {
    super("DATABASE_URL is required.");
  }
}

const inWorker = globalThis.navigator?.userAgent === "Cloudflare-Workers";
let pool;

export function getPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new DatabaseNotConfiguredError();
  if (pool) return pool;

  try {
    const url = new URL(connectionString);
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || url.hostname.includes("%")) {
      throw new Error("Expected a PostgreSQL host.");
    }
    // Connection-string SSL options override pg's TLS object.
    for (const key of ["ssl", "sslmode", "sslcert", "sslkey", "sslrootcert", "uselibpqcompat", "sslnegotiation", "host"]) {
      url.searchParams.delete(key);
    }
    const configuredPool = new pg.Pool({
      connectionString: url.toString(),
      // pg verifies the certificate chain and the database hostname (verify-full).
      ssl: { rejectUnauthorized: true },
      sslnegotiation: "postgres",
      max: 3,
      connectionTimeoutMillis: 5000,
    });
    // Idle client failures are removed by the pool. Never log connection details.
    configuredPool.on("error", () => {});
    if (!inWorker) pool = configuredPool;
    return configuredPool;
  } catch {
    throw new Error("Invalid database configuration.");
  }
}

// Worker sockets belong to the request that opened them.
export async function withDatabase(work) {
  const db = getPool();
  try {
    return await work(db);
  } finally {
    if (inWorker) await db.end();
  }
}
