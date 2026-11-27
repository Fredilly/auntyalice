import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Past papers",
  description: "Where to find official WAEC, JAMB, NECO, BECE and Common Entrance past papers and syllabi — linked, not copied.",
};

const official = [
  { body: "WAEC", what: "Past questions, standards and worked material", href: "https://waeconline.org.ng/e-learning/", note: "Official WAEC e-Learning" },
  { body: "WAEC", what: "Mathematics subject resources", href: "https://waeconline.org.ng/E-Learning/Mathematics/mathsmain.html", note: "Official WAEC e-Learning" },
  { body: "JAMB", what: "Official syllabus system (IBASS)", href: "https://ibass.jamb.gov.ng", note: "Official JAMB" },
  { body: "JAMB", what: "CBT information and practice guidance", href: "https://ibass.jamb.gov.ng/cbt", note: "Official JAMB" },
  { body: "NECO", what: "Practice examination platform", href: "https://practice-exam.neco.gov.ng/", note: "Official NECO" },
  { body: "NECO", what: "Syllabus, timetables and announcements", href: "https://neco.gov.ng/", note: "Official NECO" },
];

export default function PastPapers() {
  return (
    <main id="main" className="shell">
      <section className="page-intro">
        <p className="eyebrow">OFFICIAL SOURCES</p>
        <h1>Past papers.</h1>
        <p>
          These are the official platforms where the examining bodies publish their own material. We link to
          them and do not copy them: the papers are the examiners&apos; copyright, and reposting them is not
          ours to do.
        </p>
      </section>

      <section className="section">
        <div className="grid">
          {official.map((item) => (
            <article className="tile" key={item.href + item.what}>
              <p className="eyebrow">{item.body}</p>
              <h2>{item.what}</h2>
              <p className="muted">{item.note}</p>
              <a className="text-link" href={item.href} target="_blank" rel="noreferrer">Open official source</a>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="proposed-banner">
          <strong>Year-specific papers are not hosted here.</strong> Official platforms give you the papers
          directly. If a verified, licensed archive is later added, it will be labelled by body, year, paper
          and question number — and only after written permission.
        </div>
      </section>

      <section className="section">
        <div className="tile">
          <p className="eyebrow">PRACTISE NOW</p>
          <h2>Timed mock, written by us.</h2>
          <p>
            Our own questions in the exam&apos;s style, timed, with every answer explained. Clearly not a past
            paper — and useful from the day it ships.
          </p>
          <a className="cta" href="/learn/mock">Start a mock</a>
        </div>
      </section>
    </main>
  );
}
