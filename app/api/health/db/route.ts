import { NextResponse } from "next/server";
import { withDatabase } from "../../../lib/db.mjs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const safeCodes = new Set(["ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "EPIPE", "ERR_TLS_CERT_ALTNAME_INVALID", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "CERT_HAS_EXPIRED", "SELF_SIGNED_CERT_IN_CHAIN", "database_not_configured"]);

export async function GET() {
  const started = Date.now();
  let stage = "connect";
  try {
    const rows = await withDatabase(async (db) => {
      const client = await db.connect();
      try {
        stage = "query";
        const result = await client.query("select 1 as ok");
        stage = "cleanup";
        return result.rowCount;
      } finally {
        client.release();
      }
    });
    return NextResponse.json({ ok: true, rows, ms: Date.now() - started },
      { headers: { "cache-control": "no-store" } });
  } catch (caught) {
    const error = caught as { code?: unknown } | null;
    const raw = error?.code;
    const code = typeof raw === "string" && (safeCodes.has(raw) || /^[0-9A-Z]{5}$/.test(raw)) ? raw : null;
    return NextResponse.json({ ok: false, stage, code, ms: Date.now() - started },
      { status: 503, headers: { "cache-control": "no-store" } });
  }
}
