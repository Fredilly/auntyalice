"use client";

/**
 * Local-only progress. Nothing leaves the device and nothing is invented:
 * every number is a count of something the student actually did.
 *
 * Answers are keyed by question id, so re-running a drill or a mock never inflates
 * the totals — a question is counted once, at its most recent result.
 */
export type AnswerRecord = { correct: boolean; at: number };
export type LessonProgress = { seen: number; answers: Record<string, AnswerRecord>; lastAt: number };
export type ProgressState = { lessons: Record<string, LessonProgress>; lastSlug: string | null };

const KEY = "alice.progress.v1";

/** Stable empty value: identical on server and client, so hydration cannot mismatch. */
export const EMPTY_STATE: ProgressState = { lessons: {}, lastSlug: null };

export function summarise(lesson: LessonProgress | undefined) {
  if (!lesson) return { answered: 0, correct: 0, pct: 0 };
  const entries = Object.values(lesson.answers ?? {});
  const correct = entries.filter((a) => a.correct).length;
  return {
    answered: entries.length,
    correct,
    pct: entries.length ? Math.round((correct / entries.length) * 100) : 0,
  };
}

export function readProgress(): ProgressState {
  if (typeof window === "undefined") return EMPTY_STATE;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as ProgressState;
    if (!parsed || typeof parsed !== "object" || !parsed.lessons) return EMPTY_STATE;
    return parsed;
  } catch {
    return EMPTY_STATE;
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
  const prev = state.lessons[slug] ?? { seen: 0, answers: {}, lastAt: 0 };
  state.lessons[slug] = { ...prev, seen: prev.seen + 1, lastAt: Date.now() };
  state.lastSlug = slug;
  write(state);
}

/** Merge per-question results. Re-answering a question replaces its record. */
export function recordAnswers(slug: string, results: { id: string; correct: boolean }[]) {
  if (!results.length) return;
  const state = readProgress();
  const prev = state.lessons[slug] ?? { seen: 0, answers: {}, lastAt: 0 };
  const answers = { ...prev.answers };
  const now = Date.now();
  for (const r of results) answers[r.id] = { correct: r.correct, at: now };
  state.lessons[slug] = { seen: prev.seen, answers, lastAt: now };
  state.lastSlug = slug;
  write(state);
}

export function clearProgress() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent("alice:progress"));
}
