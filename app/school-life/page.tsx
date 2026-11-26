import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "School life",
  description:
    "Clubs, sport and the school farm at Aunty Alice Schools, Mararaba — drama, athletics, agriculture, science, debate, art and music.",
};

type Club = {
  name: string;
  slug: string;
  body: string;
  meets: string;
  accent: "primary" | "secondary" | "neutral";
};

const clubs: Club[] = [
  {
    name: "Drama & theatre",
    slug: "drama",
    body: "Script reading, improvisation and a term-end performance. The fastest way to build confident spoken English.",
    meets: "Day and time confirmed with the coordinator",
    accent: "secondary",
  },
  {
    name: "Sports & athletics",
    slug: "sports",
    body: "Football, athletics and inter-house competition. Training is supervised and open to every year group.",
    meets: "Day and time confirmed with the coordinator",
    accent: "secondary",
  },
  {
    name: "Agriculture",
    slug: "agriculture",
    body: "The school farm: planting, tending and harvesting through the term, with the science taught alongside it.",
    meets: "Seasonal — planting and harvest weeks",
    accent: "primary",
  },
  {
    name: "Science & technology",
    slug: "science",
    body: "Practical experiments, simple electronics and building things that work — linked to the science curriculum, not instead of it.",
    meets: "Day and time confirmed with the coordinator",
    accent: "primary",
  },
  {
    name: "Debate & literature",
    slug: "debate",
    body: "Formal debates, reading circles and writing. Students learn to argue from evidence and to lose gracefully.",
    meets: "Day and time confirmed with the coordinator",
    accent: "neutral",
  },
  {
    name: "Art & music",
    slug: "art-music",
    body: "Drawing, painting and performance. Work is exhibited at the end of each term.",
    meets: "Day and time confirmed with the coordinator",
    accent: "neutral",
  },
];

export default function SchoolLife() {
  return (
    <main id="main" className="shell">
      <section className="page-intro">
        <p className="eyebrow">BEYOND THE CLASSROOM</p>
        <h1>School life.</h1>
        <p>
          The activities the school intends to run. Each one is confirmed with the school office before
          students are enrolled — what follows is the plan, not a published timetable.
        </p>
      </section>

      <section className="section">
        <div className="proposed-banner">
          <strong>Proposed activities.</strong> Descriptions below are the intended shape of each club.
          Meeting days, coordinators and supervision ratios are confirmed by the school, not published here.
        </div>
        <div className="club-grid">
          {clubs.map((club) => (
            <article className={`club-card club-${club.accent}`} key={club.slug}>
              <p className="eyebrow">CLUB</p>
              <h2>{club.name}</h2>
              <p>{club.body}</p>
              <p className="club-meta">{club.meets}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="farm-band">
          <div>
            <p className="eyebrow">THE SCHOOL FARM</p>
            <h2 className="display">Agriculture, taught outside.</h2>
            <p>
              Nasarawa is farming country, and a school farm is where biology, economics and patience
              meet. The proposed programme has students preparing beds, planting, weeding and harvesting
              through the season.
            </p>
            <p className="muted">
              Proposed, not confirmed: crop calendar, plot plan, harvest schedule and what happens to the
              produce are all to be agreed with the school.
            </p>
          </div>
          <div className="farm-steps">
            <div><span className="card-index">01</span><strong>Prepare</strong><span>Clear, dig, compost</span></div>
            <div><span className="card-index">02</span><strong>Plant</strong><span>Seed, spacing, water</span></div>
            <div><span className="card-index">03</span><strong>Tend</strong><span>Weed, thin, watch</span></div>
            <div><span className="card-index">04</span><strong>Harvest</strong><span>Weigh, sell, cook</span></div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="tile">
          <p className="eyebrow">TAKING PART</p>
          <h2>How joining works</h2>
          <p>
            A parent or guardian confirms club membership with the school office. Supervision ratios and the
            current club list are confirmed at the start of each term — they are not published here until verified.
          </p>
          <Link className="text-link" href="/admissions">Ask about clubs ↗</Link>
        </div>
      </section>
    </main>
  );
}
