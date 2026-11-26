import { serve } from "../../lib/media-keys.mjs";

/**
 * Private-asset proxy for the `auntyalice-assets` R2 bucket.
 * The bucket is never public: objects are readable only here, only from
 * allowlisted prefixes, only by exact key. No listing, no index, no traversal.
 */

type Bucket = Parameters<typeof serve>[2];

function bucketFromEnv(): Bucket {
  const g = globalThis as unknown as { __env?: { MEDIA?: Bucket }; process?: { env: Record<string, unknown> } };
  return g.__env?.MEDIA ?? (g.process?.env?.MEDIA as Bucket | undefined);
}

export async function GET(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return serve(request, path, bucketFromEnv());
}

export const HEAD = GET;
