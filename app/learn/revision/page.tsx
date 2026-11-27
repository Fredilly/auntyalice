import type { Metadata } from "next";
import Link from "next/link";
import Revision from "../../components/revision";
import { listPublishedQuestions } from "../../lib/public-lessons.mjs";

export const metadata: Metadata = {
  title: "Revision",
  description: "Drill the topics you are weakest at, with an explanation after every answer.",
};

export const dynamic = "force-dynamic";

export default async function RevisionPage({ searchParams }: { searchParams: Promise<{ topics?: string }> }) {
  const { topics } = await searchParams;
  const all = await listPublishedQuestions();

  const wanted = (topics ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  const questions = wanted.length ? all.filter((q) => wanted.includes(q.slug)) : all;

  const topicsAvailable = [...new Map(all.map((q) => [q.slug, q.lesson])).entries()];

  return (
    <main id="main" className="shell">
      <section className="page-intro">
        <p className="eyebrow">TARGETED REVISION</p>
        <h1>{wanted.length ? "Your weak topics." : "Drill a topic."}</h1>
        <p>
          One question at a time, with the explanation before you can move on. That is the
          whole method — you cannot skip past the part that teaches.
        </p>
      </section>

      {!wanted.length && (
        <section className="section">
          <div className="picker">
            <p className="eyebrow">CHOOSE A TOPIC</p>
            <div className="picker-row">
              {topicsAvailable.map(([slug, title]) => (
                <Link key={slug} className="text-link" href={`/learn/revision?topics=${encodeURIComponent(slug)}`}>
                  {title}
                </Link>
              ))}
              <Link className="text-link" href="/learn/revision?topics=all">Everything ↗</Link>
            </div>
            <p className="muted">
              Don&apos;t know where you are weak? <Link className="text-link" href="/learn/diagnostic">Take the diagnostic ↗</Link>
            </p>
          </div>
        </section>
      )}

      <section className="section">
        <Revision questions={wanted.includes("all") ? all : questions} />
      </section>
    </main>
  );
}
