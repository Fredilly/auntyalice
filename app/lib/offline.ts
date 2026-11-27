"use client";

/** The page cache the service worker reads. Keep the name in step with public/sw.js. */
const PAGE_CACHE = "alice-v2-pages";

export async function saveLessonsForOffline(slugs: string[]): Promise<number> {
  if (typeof caches === "undefined") return 0;
  const cache = await caches.open(PAGE_CACHE);
  let saved = 0;
  for (const slug of slugs) {
    const url = `/learn/lesson/${slug}`;
    try {
      const existing = await cache.match(url);
      if (existing) { saved++; continue; }
      const res = await fetch(url, { credentials: "same-origin" });
      if (res.ok) { await cache.put(url, res.clone()); saved++; }
    } catch { /* one failure must not abort the rest */ }
  }
  return saved;
}

export async function savedLessonCount(slugs: string[]): Promise<number> {
  if (typeof caches === "undefined") return 0;
  const cache = await caches.open(PAGE_CACHE);
  let n = 0;
  for (const slug of slugs) if (await cache.match(`/learn/lesson/${slug}`)) n++;
  return n;
}
