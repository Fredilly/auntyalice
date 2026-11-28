"use client";
import Link from "next/link";
import { useState } from "react";
import { recordAnswers } from "../lib/progress";
import type { MockQuestion } from "../lib/public-lessons.mjs";

/**
 * Targeted revision: immediate feedback after every answer, then straight into the
 * next one. The point is the explanation, so it is shown before the student can move
 * on — no skipping past the part that teaches.
 */
export default function Revision({ questions, preview = false }: { questions: MockQuestion[]; preview?: boolean }) {
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  const [finished, setFinished] = useState(false);
  const [results, setResults] = useState<{ slug: string; id: string; correct: boolean }[]>([]);

  if (!questions.length) {
    return <p className="muted">Nothing to revise yet — choose a topic with published questions.</p>;
  }

  if (finished) {
    return (
      <div className="mock-results">
        <p className="eyebrow">REVISION COMPLETE</p>
        <h2>{right} of {questions.length} correct</h2>
        <p className="muted">
          {right === questions.length
            ? "Clean sweep. Move up to a timed mock."
            : "Re-run this drill until it is clean, then try the mock."}
        </p>
        <div className="mock-actions">
          <button className="outline-cta" onClick={() => { setIndex(0); setChosen(null); setRight(0); setResults([]); setFinished(false); }}>
            Drill again
          </button>
          <Link className="cta" href={preview?"/learn/preview/mock":"/learn/mock"}>Timed mock</Link>
        </div>
      </div>
    );
  }

  const q = questions[index];
  const answered = chosen !== null;
  const isRight = chosen === q.answer;

  return (
    <div className="mock-run">
      <div className="mock-bar">
        <span>{index + 1} of {questions.length}</span>
        <span className="muted">{q.lesson}</span>
      </div>

      <h2 className="mock-prompt">{q.prompt}</h2>
      <div className="mock-options">
        {q.options.map((option, i) => {
          const state = !answered ? "" : i === q.answer ? " correct" : i === chosen ? " incorrect" : "";
          return (
            <label key={i} className={`mock-option${chosen === i ? " chosen" : ""}${state}`}>
              <input type="radio" name={q.id} checked={chosen === i} disabled={answered}
                onChange={() => {
                  setChosen(i);
                  if (i === q.answer) setRight((n) => n + 1);
                  setResults((prev) => [...prev, { slug: q.slug, id: q.id, correct: i === q.answer }]);
                }} />
              <span>{option}</span>
            </label>
          );
        })}
      </div>

      {answered && (
        <div className={isRight ? "rev-feedback right" : "rev-feedback wrong"}>
          <p className="rev-verdict">{isRight ? "Correct." : "Not quite."}</p>
          <p>{q.explanation}</p>
          <Link className="text-link" href={`/learn/${preview?"preview":"lesson"}/${q.slug}`}>Read the full lesson</Link>
        </div>
      )}

      <div className="mock-actions">
        <span className="muted">{answered ? "Read the explanation before moving on" : "Pick an answer"}</span>
        <button className="cta" disabled={!answered}
          onClick={() => {
            if (index + 1 >= questions.length) {
              const byLesson = new Map<string, { id: string; correct: boolean }[]>();
              for (const r of results) {
                const list = byLesson.get(r.slug) ?? [];
                list.push({ id: r.id, correct: r.correct });
                byLesson.set(r.slug, list);
              }
              for (const [slug, list] of byLesson) if (!preview && slug !== "unknown") recordAnswers(slug, list);
              setFinished(true);
            }
            else { setIndex((i) => i + 1); setChosen(null); }
          }}>
          {index + 1 >= questions.length ? "Finish" : "Next"}
        </button>
      </div>
    </div>
  );
}
