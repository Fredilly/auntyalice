import type { Metadata } from "next";
import Link from "next/link";
import Diagnostic from "../../components/diagnostic";
import { listPublishedQuestions } from "../../lib/public-lessons.mjs";

export const metadata: Metadata = {
  title: "Diagnostic",
  description: "Find out which topics are costing you marks, and what to fix first.",
};

export const dynamic = "force-dynamic";

export default async function DiagnosticPage() {
  const questions = await listPublishedQuestions();
  return (
    <main id="main" className="shell">
      <section className="page-intro">
        <p className="eyebrow">DIAGNOSTIC</p>
        <h1>Find your gaps.</h1>
        <p>
          Answer every question. You get a ranked list of topics, weakest first, each
          pointing at the lesson that fixes it — not just a score.
        </p>
        <p className="muted">
          Want exam timing instead? <Link className="text-link" href="/learn/mock">Take a timed mock ↗</Link>
        </p>
      </section>
      <section className="section">
        <Diagnostic questions={questions} />
      </section>
    </main>
  );
}
