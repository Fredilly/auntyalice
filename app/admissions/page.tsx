import type { Metadata } from "next";
import Link from "next/link";
import EnquiryForm from "./enquiry-form";

export const metadata: Metadata = {
  title: "Admissions",
  description:
    "Admissions at Aunty Alice Schools, Mararaba, Nasarawa State — primary and secondary. Start an enquiry and we will reply with verified requirements, fees and a visit time.",
};

// Set NEXT_PUBLIC_ADMISSIONS_WHATSAPP once the school confirms its number.
// With no number the form offers a copyable message instead of inventing one.
const whatsapp = process.env.NEXT_PUBLIC_ADMISSIONS_WHATSAPP;

const steps = [
  { n: "01", title: "Tell us about your child", body: "Level, age and what you would like to know. It takes a minute." },
  { n: "02", title: "We answer with facts", body: "Verified requirements, the current fee schedule and available places." },
  { n: "03", title: "Visit the school", body: "See the classrooms, meet a teacher and ask the awkward questions." },
  { n: "04", title: "Complete the application", body: "We confirm the documents needed before you come, so nothing is missed twice." },
];

export default function Admissions() {
  return (
    <main id="main" className="shell">
      <section className="page-intro">
        <p className="eyebrow">JOIN OUR COMMUNITY</p>
        <h1>Admissions</h1>
        <p>
          Two schools in Mararaba, Nasarawa State. Start an enquiry and we will reply with the
          verified requirements, the current fee schedule and a time to visit.
        </p>
      </section>

      <section className="section">
        <div className="admissions-grid">
          <div>
            <h2 className="display">Start an enquiry.</h2>
            <EnquiryForm whatsapp={whatsapp} />
          </div>

          <aside className="admissions-aside">
            <div className="tile">
              <p className="eyebrow">CHOOSING A SCHOOL</p>
              <h2>Primary</h2>
              <p>Early years through primary, with a focus on reading, number sense and confidence in speaking.</p>
              <Link className="text-link" href="/primary">Explore primary</Link>
            </div>
            <div className="tile">
              <p className="eyebrow">CHOOSING A SCHOOL</p>
              <h2>Secondary</h2>
              <p>Junior and senior secondary, building towards WAEC, NECO and JAMB with subject teaching and practical work.</p>
              <Link className="text-link" href="/secondary">Explore secondary</Link>
            </div>
            <div className="tile tile-muted">
              <p className="eyebrow">NOT YET VERIFIED</p>
              <p>
                Fee schedule, term dates, uniform list, transport routes and the official contact number
                are being confirmed with the school. They will be published here rather than guessed.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="section">
        <p className="eyebrow">HOW IT WORKS</p>
        <h2 className="display">Four steps, no mystery.</h2>
        <div className="grid">
          {steps.map((step) => (
            <article className="tile" key={step.n}>
              <span className="card-index">{step.n}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="tile">
          <p className="eyebrow">BEFORE YOU APPLY</p>
          <h2>What we will ask for</h2>
          <p>
            A birth certificate or age declaration, the last school report, and a transfer certificate if
            your child is moving schools. We confirm the exact list before you visit so you are not asked twice.
          </p>
        </div>
      </section>
    </main>
  );
}
