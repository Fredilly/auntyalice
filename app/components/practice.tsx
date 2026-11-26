"use client";

import { useEffect, useState } from "react";
import type { Question } from "../lib/lessons";

type Answers = Record<string, number>;

export default function Practice({ questions, lessonKey, showAnswers = false }: {
  questions: readonly Question[];
  lessonKey: string;
  showAnswers?: boolean;
}) {
  const key = "alice-practice:" + lessonKey;
  const [answers, setAnswers] = useState<Answers>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const valid: Answers = Object.create(null);
    try {
      const stored = JSON.parse(localStorage.getItem(key) ?? "{}");
      for (const question of questions) {
        const answer = stored?.[question.id];
        if (Number.isInteger(answer) && answer >= 0 && answer < question.options.length) {
          valid[question.id] = answer;
        }
      }
    } catch {
      // Practice stays usable when device storage is unavailable.
    }
    setAnswers(valid);
    setReady(true);
  }, [key, questions]);

  function choose(id: string, index: number) {
    if (!ready || Object.hasOwn(answers, id)) return;
    const next = { ...answers, [id]: index };
    setAnswers(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
  }

  function reset() {
    setAnswers({});
    try { localStorage.removeItem(key); } catch {}
  }

  const done = questions.filter(question => Object.hasOwn(answers, question.id)).length;
  const correct = questions.filter(question => answers[question.id] === question.answer).length;

  return (
    <section className="section practice" aria-labelledby="practice-title">
      <p className="eyebrow">PRACTISE / ORIGINAL QUESTIONS</p>
      <h2 id="practice-title" className="display">Check your understanding.</h2>
      <div className="practice-progress">
        <p role="status">{done} of {questions.length} answered · {correct} correct</p>
        <progress max={questions.length} value={done} aria-label="Questions answered" />
        <button className="reset-button" type="button" onClick={reset} disabled={!ready}>Reset practice</button>
      </div>
      <p className="muted">Progress is saved on this device when local storage is available. No account or personal information is collected.</p>
      {questions.map((question, index) => {
        const answered = Object.hasOwn(answers, question.id);
        const selected = answers[question.id];
        return (
          <fieldset className="question" key={question.id}>
            <legend>{index + 1}. {question.prompt}</legend>
            <div className="answers">
              {question.options.map((option, optionIndex) => {
                const correctOption = answered && optionIndex === question.answer;
                const wrongSelection = answered && optionIndex === selected && !correctOption;
                const className = correctOption ? "answer correct" : wrongSelection ? "answer incorrect" : "answer";
                return (
                  <button className={className} type="button" key={option} disabled={!ready || answered}
                    onClick={() => choose(question.id, optionIndex)} aria-pressed={selected === optionIndex}>
                    <span>{String.fromCharCode(65 + optionIndex)}</span>
                    {option}{correctOption ? " ✓" : wrongSelection ? " ✕" : ""}
                  </button>
                );
              })}
            </div>
            {showAnswers && !answered && (
              <details className="practice-reveal">
                <summary>Show answer</summary>
                <p><strong>{question.options[question.answer]}.</strong> {question.explanation}</p>
              </details>
            )}
            {answered && (
              <div role="status" className="feedback">
                <strong>{selected === question.answer ? "Correct." : "Not quite."}</strong> {question.explanation}
              </div>
            )}
          </fieldset>
        );
      })}
      {done === questions.length && (
        <div className="tile" role="status">
          <h3>Practice complete</h3>
          <p>You answered {correct} of {questions.length} correctly. Revisit the {showAnswers ? "notes" : "examples"} before trying again.</p>
        </div>
      )}
    </section>
  );
}
