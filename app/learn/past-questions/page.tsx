import type { Metadata } from "next";
import Link from "next/link";
import TimedMock from "../../components/timed-mock";
import { pastQuestionCatalogue, paperQuestions } from "../../lib/past-questions.mjs";

export const metadata: Metadata = {
  title: "Past questions",
  description: "Practise authentic past examination questions inside Alice Academy.",
};

export const dynamic = "force-dynamic";

type Search = { body?: string; subject?: string; year?: string; paper?: string; mode?: string };

export default async function PastQuestions({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const { available, papers } = await pastQuestionCatalogue();

  const bodies = [...new Set(papers.map((p) => p.body))];
  const subjects = params.body ? [...new Set(papers.filter((p) => p.body === params.body).map((p) => p.subject))] : [];
  const years = params.body && params.subject
    ? [...new Set(papers.filter((p) => p.body === params.body && p.subject === params.subject).map((p) => p.year))]
    : [];
  const chosen = params.paper ? papers.find((p) => p.id === params.paper) : undefined;
  const questions = chosen ? await paperQuestions(chosen.id) : [];
  const timed = params.mode !== "practice";

  const crumb = (label: string, href: string) => (
    <Link className="text-link" href={href}>{label}</Link>
  );

  return (
    <main id="main" className="shell">
      <section className="page-intro">
        <p className="eyebrow">PAST QUESTIONS</p>
        <h1>{chosen ? `${chosen.body} ${chosen.subject} ${chosen.year}` : "Practise the real thing."}</h1>
        <p>
          {chosen
            ? `Authentic ${chosen.body} questions, ${chosen.title ?? chosen.paper}, answered here without leaving the Academy.`
            : "Choose an examination, subject and year. Every question is answered on this page — you never leave Alice Academy."}
        </p>
      </section>

      {!available && (
        <section className="section">
          <div className="proposed-banner">
            <strong>No licensed past papers are loaded yet.</strong> We are securing permission to host these papers.
            Until that is granted we will not copy them, so this selector is empty rather than pretending otherwise.
            <div style={{ marginTop: 12 }}>
              <Link className="cta" href="/learn/mock">Practise with Academy questions ↗</Link>
            </div>
          </div>
        </section>
      )}

      {available && !chosen && (
        <section className="section">
          <div className="picker">
            <p className="eyebrow">STEP 1 · EXAMINATION</p>
            <div className="picker-row">
              {bodies.map((body) => crumb(body, `/learn/past-questions?body=${encodeURIComponent(body)}`))}
            </div>

            {params.body && (
              <>
                <p className="eyebrow">STEP 2 · SUBJECT</p>
                <div className="picker-row">
                  {subjects.map((subject) => crumb(subject, `/learn/past-questions?body=${encodeURIComponent(params.body!)}&subject=${encodeURIComponent(subject)}`))}
                </div>
              </>
            )}

            {params.body && params.subject && (
              <>
                <p className="eyebrow">STEP 3 · YEAR</p>
                <div className="picker-row">
                  {years.map((year) => {
                    const paper = papers.find((p) => p.body === params.body && p.subject === params.subject && p.year === year)!;
                    return crumb(String(year), `/learn/past-questions?paper=${paper.id}`);
                  })}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {chosen && questions.length > 0 && (
        <section className="section">
          <div className="picker-row" style={{ marginBottom: 16 }}>
            <Link className="text-link" href="/learn/past-questions">← Choose another paper</Link>
            <Link className="text-link" href={`/learn/past-questions?paper=${chosen.id}&mode=${timed ? "practice" : "timed"}`}>
              {timed ? "Switch to practice mode (no timer)" : "Switch to timed exam mode"}
            </Link>
          </div>
          <TimedMock
            questions={questions}
            minutes={timed ? Math.max(20, questions.length) : 999}
            title={`${chosen.body} ${chosen.subject} ${chosen.year}`}
          />
        </section>
      )}

      {chosen && questions.length === 0 && (
        <section className="section">
          <div className="proposed-banner">This paper has no licensed questions loaded yet.</div>
        </section>
      )}

      <section className="section">
        <div className="tile">
          <p className="eyebrow">OFFICIAL SOURCES</p>
          <h2>Where the bodies publish.</h2>
          <p>The examining bodies&apos; own platforms, for material we do not host.</p>
          <Link className="text-link" href="/learn/past-papers">Official past-paper sources ↗</Link>
        </div>
      </section>
    </main>
  );
}
