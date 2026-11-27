import { serve } from "../../lib/media-keys.mjs";

/**
 * Private-asset proxy for the `auntyalice-assets` R2 bucket.
 * The bucket is never public: objects are readable only here, only from
 * allowlisted prefixes, only by exact key. No listing, no index, no traversal.
 *
 * Binding lookup is deliberately layered. OpenNext on Cloudflare exposes bindings
 * through getCloudflareContext(); older/simpler deployments leave them on globalThis
 * or process.env. Production returned 503 for every /media asset because only the
 * last two were checked, so all of them are tried, cheapest last.
 */

type Bucket = Parameters<typeof serve>[2];
type Env = { MEDIA?: Bucket };

async function bucketFromEnv(): Promise<Bucket> {
  const g = globalThis as unknown as {
    __env?: Env;
    process?: { env: Record<string, unknown> };
  };

  if (g.__env?.MEDIA) return g.__env.MEDIA;

  try {
    const mod = await import("@opennextjs/cloudflare");
    const ctx = (mod as { getCloudflareContext?: (opts?: { async?: boolean }) => { env?: Env } })
      .getCloudflareContext?.({ async: true });
    const resolved = ctx instanceof Promise ? await ctx : ctx;
    if (resolved?.env?.MEDIA) return resolved.env.MEDIA;
  } catch {
    // not running under OpenNext (local dev, tests) — fall through
  }

  return g.process?.env?.MEDIA as Bucket | undefined;
}

export async function GET(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return serve(request, path, await bucketFromEnv());
}

export const HEAD = GET;
