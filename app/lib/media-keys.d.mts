export interface MediaObject {
  body: ReadableStream | null;
  httpEtag?: string;
  httpMetadata?: { contentType?: string };
  size?: number;
}

export interface MediaBucket {
  get(key: string): Promise<MediaObject | null>;
}

export type ResolvedKey = { ok: true; key: string } | { ok: false; reason: string };

export declare function resolveKey(raw: string[] | string): ResolvedKey;
export declare function contentTypeFor(key: string): string;
export declare const ALLOWED_PREFIXES: readonly string[];
export declare function serve(
  request: Request,
  segments: string[],
  bucket: MediaBucket | undefined,
): Promise<Response>;
