import { NextResponse } from "next/server";
import { withDatabase } from "../../../lib/db.mjs";

/**
 * Narrow diagnostic for P0 (#7). The Worker's lesson route fails intermittently while
 * the same query succeeds against Neon from outside, and Cloudflare logs are not
 * reachable from the engineering loop. This exposes the *shape* of the failure so it can
 * be read over HTTP:
 *
 *   {"ok":true,"rows":1,"ms":42}
 *   {"ok":false,"stage":"connect|query","code":"ENOTFOUND","message":"..."}
 *
 * Deliberately excluded: the connection string, host, user, database name, and any
 * parameter. Message is truncated to 120 characters. Nothing here is cached.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const started = Date.now();
  try {
    const rows = await withDatabase(async (db) => {
      const result = await db.query("select 1 as ok");
      return result.rowCount;
    });
    return NextResponse.json(
      { ok: true, rows, ms: Date.now() - started },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const code = typeof error?.code === "string" ? error.code : null;
    const stage = /connect|timeout|socket|getaddrinfo|ENOTFOUND|ECONN/i.test(String(error?.message ?? ""))
      ? "connect"
      : "query";
    const message = String(error?.message ?? "unknown").replace(/\s+/g, " ").slice(0, 120);
    return NextResponse.json(
      { ok: false, stage, code, message, ms: Date.now() - started },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
