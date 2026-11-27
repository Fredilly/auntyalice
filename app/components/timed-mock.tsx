"use client";
import { useEffect, useMemo, useState } from "react";
import { recordAnswers } from "../lib/progress";

type Option = string;
export type MockQuestion = { id: string; prompt: string; options: Option[]; answer: number; explanation: string; lesson: string; slug?: string };

/**
 * Timed mock examination.
 * One question at a time, answers withheld until submission, then every answer is
 * explained. Built over our own questions — no third-party paper text.
 */
export default function TimedMock({ questions, minutes, title }: { questions: MockQuestion[]; minutes: number; title: string }) {
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [remaining, setRemaining] = useState(minutes * 60);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!started || submitted) return;
    if (remaining <= 0) { submit(); return; }
    const t = setTimeout(() => setRemaining((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [started, remaining, submitted]);

  const score = useMemo(
    () => questions.filter((q) => answers[q.id] === q.answer).length,
    [answers, questions],
  );

  const submit = () => {
    // group by lesson so progress lands on the right topic, keyed by question id
    const byLesson = new Map<string, { id: string; correct: boolean }[]>();
    for (const q of questions) {
      const slug = q.slug ?? "unknown";
      const list = byLesson.get(slug) ?? [];
      list.push({ id: q.id, correct: answers[q.id] === q.answer });
      byLesson.set(slug, list);
    }
    for (const [slug, results] of byLesson) if (slug !== "unknown") recordAnswers(slug, results);
    setSubmitted(true);
  };

  if (!questions.length) {
    return <p className="mock-empty">No practice questions are published for this exam yet.</p>;
  }

  if (!started) {
    return (
      <div className="mock-start">
        <p className="eyebrow">{title}</p>
        <h2>{questions.length} questions · {minutes} minutes</h2>
        <p>Answers are hidden until you submit. The timer starts when you begin and submits automatically at zero.</p>
        <button className="cta" onClick={() => setStarted(true)}>Start the mock ↗</button>
      </div>
    );
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  if (submitted) {
    return (
      <div className="mock-results">
        <p className="eyebrow">RESULT</p>
        <h2>{score} / {questions.length}</h2>
        <p className="muted">{score === questions.length ? "Full marks." : "Every answer is explained below — that is the part that teaches."}</p>
        <ol className="mock-review">
          {questions.map((q, i) => {
            const chosen = answers[q.id];
            const right = chosen === q.answer;
            return (
              <li key={q.id} className={right ? "right" : "wrong"}>
                <p className="mock-q">{i + 1}. {q.prompt}</p>
                <p className="mock-a">
                  {right ? "Correct" : chosen === undefined ? "Not answered" : `You chose: ${q.options[chosen]}`}
                  {!right && <> · Answer: {q.options[q.answer]}</>}
                </p>
                <p className="mock-x">{q.explanation}</p>
                <p className="mock-src">From the lesson: {q.lesson}</p>
              </li>
            );
          })}
        </ol>
        <button className="cta" onClick={() => { setSubmitted(false); setStarted(false); setIndex(0); setAnswers({}); setRemaining(minutes * 60); }}>
          Try again
        </button>
      </div>
    );
  }

  const q = questions[index];
  return (
    <div className="mock-run">
      <div className="mock-bar">
        <span>Question {index + 1} of {questions.length}</span>
        <span className={remaining < 60 ? "mock-clock low" : "mock-clock"} aria-live="off">{mm}:{ss}</span>
      </div>
      <h2 className="mock-prompt">{q.prompt}</h2>
      <div className="mock-options">
        {q.options.map((option, i) => (
          <label key={i} className={answers[q.id] === i ? "mock-option chosen" : "mock-option"}>
            <input type="radio" name={q.id} checked={answers[q.id] === i}
              onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: i }))} />
            <span>{option}</span>
          </label>
        ))}
      </div>
      <div className="mock-actions">
        <button className="outline-cta" disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))}>← Back</button>
        {index < questions.length - 1
          ? <button className="cta" onClick={() => setIndex((i) => i + 1)}>Next →</button>
          : <button className="cta" onClick={submit}>Submit</button>}
      </div>
      <p className="muted mock-progress">{Object.keys(answers).length} of {questions.length} answered</p>
    </div>
  );
}
