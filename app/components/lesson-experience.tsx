"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { MathBlock, MathInline, Prose } from "./math";
import { recordAnswers } from "../lib/progress";
import { IconCheck, IconTarget } from "./icons";

export type Block =
  | { type: "objectives"; items: string[] }
  | { type: "section"; heading: string; paras?: string[]; math?: string; note?: string }
  | { type: "worked"; title: string; steps: { text?: string; math?: string }[]; answer?: string }
  | { type: "mistakes"; items: { wrong: string; why: string; right: string }[] }
  | { type: "practice"; questions: { id: string; prompt: string; options: string[]; answer: number; explanation: string }[] };

export default function LessonExperience({ slug, blocks, preview = false }: { slug: string; blocks: Block[]; preview?: boolean }) {
  const practice = useMemo(
    () => blocks.find((b): b is Extract<Block, { type: "practice" }> => b.type === "practice"),
    [blocks],
  );

  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [results, setResults] = useState<{ id: string; correct: boolean }[]>([]);
  const [revealed, setRevealed] = useState<Record<number, number>>({});

  const q = practice?.questions[index];
  const done = results.length;
  const correct = results.filter((r) => r.correct).length;

  function answer(option: number) {
    if (chosen !== null || !q) return;
    setChosen(option);
    const record = { id: q.id, correct: option === q.answer };
    const next = [...results, record];
    setResults(next);
    if (!preview && next.length === practice!.questions.length) recordAnswers(slug, next);
  }

  function advance() {
    if (!practice) return;
    if (index + 1 >= practice.questions.length) {
      setIndex(practice.questions.length);
      setChosen(null);
      return;
    }
    setIndex((n) => n + 1);
    setChosen(null);
  }

  return (
    <div className="lx">
      {blocks.map((block, i) => {
        if (block.type === "objectives") {
          return (
            <section className="lx-objectives" key={i} aria-labelledby="objectives-heading">
              <p className="lx-eyebrow" id="objectives-heading">
                <IconTarget className="lx-ico" /> By the end of this lesson you can
              </p>
              <ul>
                {block.items.map((item) => (
                  <li key={item}><IconCheck className="lx-ico" /><span>{item}</span></li>
                ))}
              </ul>
            </section>
          );
        }

        if (block.type === "section") {
          return (
            <section className="lx-section" key={i}>
              <h2>{block.heading}</h2>
              {block.paras?.map((p) => <Prose key={p} text={p} />)}
              {block.math ? <MathBlock tex={block.math} /> : null}
              {block.note ? <p className="lx-note">{block.note}</p> : null}
            </section>
          );
        }

        if (block.type === "worked") {
          const shown = revealed[i] ?? 0;
          return (
            <section className="lx-worked" key={i} aria-label={block.title}>
              <p className="lx-eyebrow">WORKED EXAMPLE</p>
              <h3>{block.title}</h3>
              <ol className="lx-steps">
                {block.steps.slice(0, shown).map((step, si) => (
                  <li key={si}>
                    {step.text ? <Prose text={step.text} /> : null}
                    {step.math ? <MathBlock tex={step.math} /> : null}
                  </li>
                ))}
              </ol>
              {shown < block.steps.length ? (
                <button className="lx-reveal" onClick={() => setRevealed((r) => ({ ...r, [i]: shown + 1 }))}>
                  {shown === 0 ? "Show me step 1" : `Show step ${shown + 1} of ${block.steps.length}`}
                </button>
              ) : block.answer ? (
                <Prose className="lx-answer" text={block.answer} />
              ) : null}
            </section>
          );
        }

        if (block.type === "mistakes") {
          return (
            <section className="lx-mistakes" key={i}>
              <h2>Common mistakes</h2>
              {block.items.map((m) => (
                <article className="lx-mistake" key={m.wrong}>
                  <p className="lx-wrong"><span>✗</span> {m.wrong}</p>
                  <p className="lx-why">{m.why}</p>
                  <p className="lx-right"><span>✓</span> {m.right}</p>
                </article>
              ))}
            </section>
          );
        }

        return null;
      })}

      {practice && (
        <section className="lx-practice" aria-labelledby="practice-heading">
          <div className="lx-practice-head">
            <h2 id="practice-heading">Practise</h2>
            <span className="lx-count">
              {index < practice.questions.length ? `${index + 1} / ${practice.questions.length}` : `${correct} / ${practice.questions.length} correct`}
            </span>
          </div>

          {q ? (
            <>
              <Prose className="lx-prompt" text={q.prompt} />
              <div className="lx-options">
                {q.options.map((option, oi) => {
                  const state =
                    chosen === null ? "" : oi === q.answer ? " correct" : oi === chosen ? " incorrect" : "";
                  return (
                    <button key={oi} className={`lx-option${state}`} onClick={() => answer(oi)} disabled={chosen !== null}>
                      <span className="lx-key">{"ABCDE"[oi]}</span>
                      <Prose className="lx-option-copy" text={option} />
                    </button>
                  );
                })}
              </div>

              {chosen !== null && (
                <div className={chosen === q.answer ? "lx-feedback right" : "lx-feedback wrong"}>
                  <p className="lx-verdict">{chosen === q.answer ? "Correct" : "Not quite"}</p>
                  <Prose text={q.explanation} />
                  <button className="lx-next" onClick={advance}>
                    {index + 1 >= practice.questions.length ? "Finish" : "Next question"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="lx-done">
              <p className="lx-done-score">{correct} of {practice.questions.length} correct</p>
              <p className="lx-note">
                {preview ? "Draft practice complete. Results are not saved to your learning progress." : correct === practice.questions.length
                  ? "Clean. Try the topic in a timed mock."
                  : "Re-run this practice until it is clean, then try a timed mock."}
              </p>
              <div className="lx-done-actions">
                <button className="lx-next" onClick={() => { setIndex(0); setChosen(null); setResults([]); }}>Practise again</button>
                <Link className="lx-link" href={preview ? "/learn/preview" : "/learn/mock"}>{preview ? "Other previews" : "Timed mock"}</Link>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
