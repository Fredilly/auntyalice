"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { MockQuestion } from "../lib/public-lessons.mjs";

/**
 * Diagnostic assessment. No timer, no score out of ten — the output is a ranked list
 * of topics, weakest first, each pointing at the lesson that fixes it.
 */
export default function Diagnostic({ questions }: { questions: MockQuestion[] }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);

  const byLesson = useMemo(() => {
    const map = new Map<string, { slug: string; title: string; total: number; right: number }>();
    for (const q of questions) {
      const entry = map.get(q.slug) ?? { slug: q.slug, title: q.lesson, total: 0, right: 0 };
      entry.total += 1;
      if (answers[q.id] === q.answer) entry.right += 1;
      map.set(q.slug, entry);
    }
    return [...map.values()].sort((a, b) => a.right / a.total - b.right / b.total);
  }, [answers, questions]);

  if (!questions.length) {
    return <p className="muted">No published questions yet — the diagnostic needs at least one lesson.</p>;
  }

  if (done) {
    const right = questions.filter((q) => answers[q.id] === q.answer).length;
    const weakest = byLesson[0];
    return (
      <div className="mock-results">
        <p className="eyebrow">DIAGNOSIS</p>
        <h2>{right} of {questions.length}</h2>
        <p className="muted">
          {weakest && weakest.right < weakest.total
            ? <>Start with <strong>{weakest.title}</strong> — that is where the most marks are being lost.</>
            : "Nothing stands out as weak. Move on to a timed mock."}
        </p>

        <ol className="diag-list">
          {byLesson.map((topic) => {
            const pct = Math.round((topic.right / topic.total) * 100);
            return (
              <li key={topic.slug} className={pct < 60 ? "weak" : pct < 100 ? "ok" : "strong"}>
                <div className="diag-head">
                  <span>{topic.title}</span>
                  <span className="diag-score">{topic.right}/{topic.total}</span>
                </div>
                <div className="diag-bar"><span style={{ width: `${pct}%` }} /></div>
                <Link className="text-link" href={`/learn/lesson/${topic.slug}`}>
                  {pct === 100 ? "Review the lesson" : "Fix this topic"}
                </Link>
              </li>
            );
          })}
        </ol>

        <div className="mock-actions">
          <Link className="cta" href={`/learn/revision?topics=${encodeURIComponent(
            byLesson.filter((t) => t.right < t.total).map((t) => t.slug).join(",") || "all",
          )}`}>Drill these gaps</Link>
          <Link className="outline-cta" href="/learn/mock">Timed mock</Link>
          <button className="outline-cta" onClick={() => { setDone(false); setAnswers({}); }}>Run it again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mock-run">
      <div className="mock-bar">
        <span>{Object.keys(answers).length} of {questions.length} answered</span>
        <span className="muted">No timer — answer honestly</span>
      </div>
      <ol className="diag-questions">
        {questions.map((q, i) => (
          <li key={q.id}>
            <p className="mock-q">{i + 1}. {q.prompt}</p>
            <div className="mock-options">
              {q.options.map((option, oi) => (
                <label key={oi} className={answers[q.id] === oi ? "mock-option chosen" : "mock-option"}>
                  <input type="radio" name={q.id} checked={answers[q.id] === oi}
                    onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: oi }))} />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </li>
        ))}
      </ol>
      <div className="mock-actions">
        <span className="muted">{Object.keys(answers).length < questions.length ? "Answer everything for an accurate picture" : "Ready"}</span>
        <button className="cta" disabled={Object.keys(answers).length < questions.length} onClick={() => setDone(true)}>
          See my diagnosis
        </button>
      </div>
    </div>
  );
}
