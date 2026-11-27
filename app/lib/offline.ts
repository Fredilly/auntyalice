"use client";

/** Cache names must match public/sw.js — the worker reads these exact stores. */
const PAGE_CACHE = "alice-v2-pages";
const ASSET_CACHE = "alice-v2-assets";

/**
 * A saved page is only useful offline if the styles, scripts and images it points at
 * are saved too. We fetch the HTML, then pull every same-origin /_next/static and
 * /media reference it contains into the asset cache. A lesson that renders unstyled
 * is not offline support.
 */
const ASSET_PATTERN = /(?:href|src)="(\/_next\/static\/[^"?#]+|\/media\/[^"?#]+)"/g;

export async function saveLessonsForOffline(slugs: string[]): Promise<number> {
  if (typeof caches === "undefined") return 0;
  const pages = await caches.open(PAGE_CACHE);
  const assets = await caches.open(ASSET_CACHE);
  let saved = 0;

  for (const slug of slugs) {
    const url = `/learn/lesson/${slug}`;
    try {
      let html: string | null = null;

      const cached = await pages.match(url);
      if (cached) {
        html = await cached.clone().text();
        saved++;
      } else {
        const res = await fetch(url, { credentials: "same-origin" });
        if (!res.ok) continue;
        html = await res.clone().text();
        await pages.put(url, res.clone());
        saved++;
      }

      const found = [...(html ?? "").matchAll(ASSET_PATTERN)].map((m) => m[1]);
      const missing = [];
      for (const path of new Set(found)) {
        if (!(await assets.match(path))) missing.push(path);
      }
      if (missing.length) await assets.addAll(missing).catch(() => { /* partial is fine */ });
    } catch { /* one lesson failing must not abort the rest */ }
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
