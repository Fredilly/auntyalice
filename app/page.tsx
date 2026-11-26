import Link from "next/link";
import HeroMedia from "./components/hero";

/**
 * Intent router, not a table of contents.
 * Three audiences, three doors: a parent applying, a student revising, someone
 * checking the school out. Everything else sits one level deeper.
 */

const doors = [
  {
    href: "/admissions",
    kicker: "FOR PARENTS",
    title: "Is this the right school for my child?",
    body: "Two schools in Mararaba. Start an enquiry and we answer with verified requirements, fees and a visit time.",
    action: "Admissions",
    tone: "door-primary",
  },
  {
    href: "/learn",
    kicker: "FOR STUDENTS",
    title: "I need to pass WAEC, NECO or JAMB.",
    body: "Free lessons, notes and practice for the exams you are sitting. No account needed.",
    action: "Alice Academy",
    tone: "door-dark",
  },
  {
    href: "/primary",
    kicker: "OUR SCHOOL",
    title: "What is the school actually like?",
    body: "Primary, secondary, clubs and the school farm — with what is confirmed and what is still being verified stated plainly.",
    action: "Explore the school",
    tone: "door-neutral",
  },
];

export default function Home() {
  return (
    <main id="main">
      <section className="hero">
        <HeroMedia poster="/media/campus/texture-16x9.svg" />
        <div className="hero-content">
          <p className="eyebrow">MARARABA, NASARAWA · NIGERIA</p>
          <h1>Growing minds.<br /><em>Opening futures.</em></h1>
          <p>Primary and secondary school, plus a free academy for the exams that decide what comes next.</p>
          <div className="actions">
            <Link className="cta" href="/admissions">Start an enquiry ↗</Link>
            <Link className="outline-cta" href="/learn">Study for exams →</Link>
          </div>
        </div>
        <span className="hero-note">01 / THE AUNTY ALICE EXPERIENCE</span>
      </section>

      <div className="shell">
        <section className="section door-section">
          <p className="eyebrow">WHERE WOULD YOU LIKE TO GO?</p>
          <div className="door-grid">
            {doors.map((door) => (
              <Link className={`door ${door.tone}`} href={door.href} key={door.href}>
                <span className="card-index">{door.kicker}</span>
                <h2>{door.title}</h2>
                <p>{door.body}</p>
                <span className="door-action">{door.action} ↗</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
