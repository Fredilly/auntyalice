import type { Metadata } from "next";
import Link from "next/link";
import TimedMock from "../../components/timed-mock";
import { listPublishedQuestions } from "../../lib/public-lessons.mjs";

export const metadata: Metadata = {
  title: "Timed mock",
  description: "A timed mock examination built from published Alice Academy practice questions.",
};

export const dynamic = "force-dynamic";

export default async function Mock() {
  const questions = await listPublishedQuestions();
  // a full mock is 20 questions; shuffle deterministically per load is unnecessary here
  const mock = questions.slice(0, 20);
  return (
    <main id="main" className="shell">
      <section className="page-intro">
        <p className="eyebrow">PRACTICE · TIMED</p>
        <h1>Mock examination.</h1>
        <p>
          Original practice questions written for the Academy, under exam timing. Not a past paper —
          answers are hidden until you submit, and every one is explained afterwards.
        </p>
        <p className="muted">
          Looking for the real thing? <Link className="text-link" href="/learn/past-papers">Official past-paper sources ↗</Link>
        </p>
      </section>
      <section className="section">
        <TimedMock questions={mock} minutes={20} title="Alice Academy mock" />
      </section>
    </main>
  );
}
