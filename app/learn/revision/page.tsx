import type { Metadata } from "next";
import Link from "next/link";
import AcademyAction from "../../components/academy-action";
import { IconBook } from "../../components/icons";
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
  // no topic selected means no drill: revision must wait for an explicit choice
  const selected = wanted.includes("all") ? all : all.filter((q) => wanted.includes(q.slug));
  const ready = wanted.length > 0 && selected.length > 0;

  const topicsAvailable = [...new Map(all.map((q) => [q.slug, q.lesson])).entries()];

  return (
    <main id="main" className="shell">
      <section className="av-intro">
        <p className="av-kicker">Practice</p>
        <h1>{wanted.length ? "Topic practice" : "Practice"}</h1>
        <p>
          Choose a topic and learn from the explanation after each answer.
        </p>
      </section>

      {!wanted.length && (
        <section className="av-section" aria-labelledby="topics-heading">
          <h2 id="topics-heading">Choose a topic</h2>
          <div className="av-action-list av-grouped">
            {all.length > 0 ? (
              <AcademyAction href="/learn/revision?topics=all" title="All topics" description="Practise across available topics" icon={<IconBook />} />
            ) : (
              <p className="av-note" role="status">No practice questions published yet.</p>
            )}
            {topicsAvailable.map(([slug, title]) => (
              <AcademyAction key={slug} href={`/learn/revision?topics=${encodeURIComponent(slug)}`} title={title} icon={<IconBook />} />
            ))}
          </div>
          <p className="av-revision-hint">Not sure what to study?</p>
          <AcademyAction href="/learn/diagnostic" title="Take the diagnostic" secondary />
        </section>
      )}

      {ready ? (
        <section className="section">
          <Revision questions={selected} />
        </section>
      ) : wanted.length > 0 ? (
        <section className="section">
          <div className="proposed-banner">
            No published questions for that topic yet. <Link className="text-link" href="/learn/revision">Choose another</Link>
          </div>
        </section>
      ) : null}
    </main>
  );
}
