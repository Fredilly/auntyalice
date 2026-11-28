import type { Metadata } from "next";
import AcademyAction from "../../components/academy-action";
import { IconDoc, IconClock } from "../../components/icons";

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
    <main id="main">
      <section className="av-intro">
        <p className="av-kicker">Official sources</p>
        <h1>Exam resources</h1>
        <p>Past papers, syllabuses and guidance from the examination bodies. We link to their material rather than reproduce it.</p>
      </section>
      {["WAEC", "JAMB", "NECO"].map(body => (
        <section className="av-section" key={body} aria-labelledby={body + "-resources"}>
          <h2 id={body + "-resources"} className="av-exam-heading" data-tone={body.toLowerCase()}><span>{body}</span></h2>
          <div className="av-action-list av-grouped">
            {official.filter(item => item.body === body).map(item => (
              <AcademyAction key={item.href} href={item.href} title={item.what} description={item.note} external icon={<IconDoc />} />
            ))}
          </div>
        </section>
      ))}
      <p className="av-note">Year-specific papers are not hosted here. A licensed archive will only be added with permission.</p>
      <section className="av-section">
        <h2>Practise now</h2>
        <div className="av-action-list av-grouped"><AcademyAction href="/learn/mock" title="Start a timed mock" description="Original Academy questions with explanations" icon={<IconClock />} /></div>
      </section>
    </main>
  );
}
