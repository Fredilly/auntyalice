"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EMPTY_STATE, readProgress, recordVisit, summarise, type ProgressState } from "../lib/progress";
import { saveLessonsForOffline, savedLessonCount } from "../lib/offline";
import { IconArrow, IconBook, IconCheck, IconClock, IconCloud, IconDoc, IconPlay, IconPulse, IconTarget } from "./icons";

export type DashLesson = { slug: string; title: string; questions: number; exam: string };

type Props = { lessons: DashLesson[] };

export default function LearningDashboard({ lessons }: Props) {
  // Server and first client paint both use the stable empty state; real progress is
  // loaded in an effect. Reading localStorage during render is what breaks hydration.
  const [state, setState] = useState<ProgressState>(EMPTY_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [online, setOnline] = useState(true);
  const [saved, setSaved] = useState(0);
  const [saving, setSaving] = useState(false);

  const slugs = lessons.map((l) => l.slug);

  useEffect(() => {
    const refresh = () => setState(readProgress());
    refresh();
    setHydrated(true);
    savedLessonCount(slugs).then(setSaved).catch(() => {});
    const on = () => setOnline(navigator.onLine);
    on();
    window.addEventListener("alice:progress", refresh);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      window.removeEventListener("alice:progress", refresh);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, [slugs.join(",")]);

  const saveAll = useCallback(async () => {
    setSaving(true);
    const n = await saveLessonsForOffline(slugs);
    setSaved(n);
    setSaving(false);
  }, [slugs.join(",")]);

  const last = state.lastSlug ? lessons.find((l) => l.slug === state.lastSlug) : undefined;

  // unique questions only: every count below goes through summarise(), which keys on
  // question id, so repeated drills can never inflate the totals
  const totals = lessons.reduce(
    (acc, lesson) => {
      const s = summarise(state.lessons[lesson.slug]);
      return { answered: acc.answered + s.answered, correct: acc.correct + s.correct };
    },
    { answered: 0, correct: 0 },
  );
  const startedCount = lessons.filter((l) => summarise(state.lessons[l.slug]).answered > 0).length;
  const accuracy = totals.answered ? Math.round((totals.correct / totals.answered) * 100) : 0;

  return (
    <div className="dash">
      {hydrated && !online && (
        <div className="dash-offline" role="status">
          <IconCloud className="dash-ico" /> You are offline. {saved > 0 ? `${saved} lesson${saved === 1 ? "" : "s"} saved on this device still open.` : "Nothing saved yet — connect once to save lessons."}
        </div>
      )}

      {/* continue */}
      <section className="dash-continue">
        <p className="dash-eyebrow">{last ? "PICK UP WHERE YOU LEFT OFF" : "START HERE"}</p>
        {last ? (
          <>
            <h2>{last.title}</h2>
            <p className="dash-muted">{last.exam} · {Math.min(summarise(state.lessons[last.slug]).answered, last.questions)} of {last.questions} {last.questions === 1 ? "question" : "questions"} answered</p>
            <Link className="dash-btn" href={`/learn/lesson/${last.slug}`} onClick={() => recordVisit(last.slug)}>
              Resume lesson <IconArrow className="dash-ico" />
            </Link>
          </>
        ) : (
          <>
            <h2>Find your gaps first.</h2>
            <p className="dash-muted">Ten minutes of diagnostic tells you what to study. No account needed.</p>
            <Link className="dash-btn" href="/learn/diagnostic">Take the diagnostic <IconArrow className="dash-ico" /></Link>
          </>
        )}
      </section>

      {/* real local numbers only */}
      <section className="dash-stats" aria-label="Your progress on this device">
        <div><strong>{totals.answered}</strong><span>questions answered</span></div>
        <div><strong>{accuracy}%</strong><span>correct</span></div>
        <div><strong>{startedCount}/{lessons.length}</strong><span>lessons started</span></div>
      </section>

      {/* tools */}
      <section className="dash-tools" aria-label="Study tools">
        <Link className="tool" href="/learn/diagnostic">
          <IconPulse className="tool-ico" /><span className="tool-name">Diagnostic</span><span className="tool-sub">Find weak topics</span>
        </Link>
        <Link className="tool" href="/learn/revision">
          <IconTarget className="tool-ico" /><span className="tool-name">Revision</span><span className="tool-sub">Drill one topic</span>
        </Link>
        <Link className="tool" href="/learn/mock">
          <IconClock className="tool-ico" /><span className="tool-name">Timed mock</span><span className="tool-sub">Exam conditions</span>
        </Link>
        <Link className="tool" href="/learn/past-papers">
          <IconDoc className="tool-ico" /><span className="tool-name">Past questions</span><span className="tool-sub">By exam &amp; year</span>
        </Link>
      </section>

      {/* lessons */}
      <section className="dash-lessons" aria-label="Lessons">
        <div className="dash-head">
          <h2>Lessons</h2>
          <button className="dash-ghost" onClick={saveAll} disabled={saving}>
            <IconCloud className="dash-ico" />
            {saving ? "Saving…" : saved >= slugs.length && slugs.length > 0 ? "All saved offline" : "Save for offline"}
          </button>
        </div>

        <ul className="lesson-list">
          {lessons.map((lesson) => {
            const s = summarise(state.lessons[lesson.slug]);
            const done = Math.min(s.answered, lesson.questions);
            const pct = lesson.questions ? Math.round((done / lesson.questions) * 100) : 0;
            return (
              <li key={lesson.slug}>
                <Link href={`/learn/lesson/${lesson.slug}`} className="lesson-row" onClick={() => recordVisit(lesson.slug)}>
                  <span className={pct === 100 ? "lesson-state done" : "lesson-state"}>
                    {pct === 100 ? <IconCheck className="dash-ico" /> : pct > 0 ? <IconPlay className="dash-ico" /> : <IconBook className="dash-ico" />}
                  </span>
                  <span className="lesson-body">
                    <span className="lesson-title">{lesson.title}</span>
                    <span className="lesson-meta">
                      {lesson.exam} · {lesson.questions} {lesson.questions === 1 ? "question" : "questions"}
                      {s.answered > 0 ? ` · ${done}/${lesson.questions} done` : " · not started"}
                    </span>
                    <span className="lesson-bar"><span style={{ width: `${pct}%` }} /></span>
                  </span>
                  <IconArrow className="lesson-go" />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
