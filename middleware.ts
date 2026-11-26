import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cacheControlFor, isHashedAsset } from "./app/lib/cache-policy.mjs";

/**
 * Deployment-safe caching. Next's static output carries a one-year s-maxage on
 * HTML; that keeps a stale page alive at the edge after the next release.
 * Hashed assets stay immutable, media keeps its own policy, everything else
 * revalidates within a minute.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;
  if (isHashedAsset(pathname)) return response;
  const type = response.headers.get("content-type") ?? "";
  response.headers.set("Cache-Control", cacheControlFor(pathname, type));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
