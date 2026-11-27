"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { readProgress, recordVisit } from "../lib/progress";
import { saveLessonsForOffline, savedLessonCount } from "../lib/offline";
import { IconArrow, IconBook, IconCheck, IconClock, IconCloud, IconDoc, IconPlay, IconPulse, IconTarget } from "./icons";

export type DashLesson = { slug: string; title: string; questions: number; exam: string };

type Props = { lessons: DashLesson[] };

export default function LearningDashboard({ lessons }: Props) {
  const [state, setState] = useState(readProgress);
  const [online, setOnline] = useState(true);
  const [saved, setSaved] = useState(0);
  const [saving, setSaving] = useState(false);

  const slugs = lessons.map((l) => l.slug);

  useEffect(() => {
    const refresh = () => setState(readProgress());
    refresh();
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
  const started = lessons.filter((l) => state.lessons[l.slug]);
  const answered = Object.values(state.lessons).reduce((n, p) => n + p.answered, 0);
  const correct = Object.values(state.lessons).reduce((n, p) => n + p.correct, 0);

  return (
    <div className="dash">
      {!online && (
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
            <p className="dash-muted">{last.exam} · {state.lessons[last.slug]?.answered ?? 0} of {last.questions} {last.questions === 1 ? "question" : "questions"} attempted</p>
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
        <div><strong>{answered}</strong><span>questions answered</span></div>
        <div><strong>{answered ? Math.round((correct / answered) * 100) : 0}%</strong><span>correct</span></div>
        <div><strong>{started.length}/{lessons.length}</strong><span>lessons started</span></div>
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
        <Link className="tool" href="/learn/past-questions">
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
            const p = state.lessons[lesson.slug];
            const done = p ? Math.min(p.answered, lesson.questions) : 0;
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
                      {p ? ` · ${done}/${lesson.questions} done` : " · not started"}
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
