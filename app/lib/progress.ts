"use client";

/**
 * Local-only progress. Nothing leaves the device, nothing is invented:
 * every number here is a count of something the student actually did.
 */
export type LessonProgress = { seen: number; answered: number; correct: number; lastAt: number };
export type ProgressState = { lessons: Record<string, LessonProgress>; lastSlug: string | null };

const KEY = "alice.progress.v1";
const EMPTY: ProgressState = { lessons: {}, lastSlug: null };

export function readProgress(): ProgressState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as ProgressState;
    if (!parsed || typeof parsed !== "object" || !parsed.lessons) return EMPTY;
    return parsed;
  } catch {
    return EMPTY;
  }
}

function write(state: ProgressState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("alice:progress"));
  } catch { /* private mode — progress is a convenience, never a requirement */ }
}

export function recordVisit(slug: string) {
  const state = readProgress();
  const prev = state.lessons[slug] ?? { seen: 0, answered: 0, correct: 0, lastAt: 0 };
  state.lessons[slug] = { ...prev, seen: prev.seen + 1, lastAt: Date.now() };
  state.lastSlug = slug;
  write(state);
}

export function recordAnswers(slug: string, total: number, correct: number) {
  const state = readProgress();
  const prev = state.lessons[slug] ?? { seen: 0, answered: 0, correct: 0, lastAt: 0 };
  state.lessons[slug] = {
    seen: prev.seen, answered: prev.answered + total, correct: prev.correct + correct, lastAt: Date.now(),
  };
  state.lastSlug = slug;
  write(state);
}

export function clearProgress() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent("alice:progress"));
}
