import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "School shop",
  description:
    "Proposed school-shop categories for Aunty Alice Schools — textbooks, uniform, stationery and revision material. No prices or stock are published; confirm with the school office.",
};

const categories = [
  {
    name: "Textbooks & workbooks",
    body: "Subject textbooks and the exercise books on each class list. Class lists are issued at the start of term.",
  },
  {
    name: "Uniform",
    body: "Shirts, trousers or skirts, the school jumper and the sports kit. Sizing is confirmed in person.",
  },
  {
    name: "Stationery & practical kits",
    body: "Maths sets, geometry boxes and science practical items requested by subject teachers.",
  },
  {
    name: "Past questions & revision",
    body: "WAEC, NECO and JAMB revision material for senior students, aligned with the Academy.",
  },
];

export default function Shop() {
  return (
    <main id="main" className="shell">
      <section className="page-intro">
        <p className="eyebrow">SCHOOL SHOP</p>
        <h1>Books and kit.</h1>
        <p>
          The categories a school shop would normally carry, and how to check availability before you
          travel. This is a proposed catalogue: no stock, no prices and no checkout are published until the
          school confirms them.
        </p>
      </section>

      <section className="section">
        <div className="proposed-banner">
          <strong>Proposed catalogue.</strong> Categories only — the school has not confirmed stock,
          editions or prices. Use the enquiry form to ask about a specific item.
        </div>
        <div className="grid">
          {categories.map((category) => (
            <article className="tile" key={category.name}>
              <p className="eyebrow">CATEGORY</p>
              <h2>{category.name}</h2>
              <p>{category.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="shop-band">
          <div>
            <p className="eyebrow">BEFORE YOU COME</p>
            <h2 className="display">Check it is in stock.</h2>
            <p>
              Ask about a specific title, size or kit and the school office will confirm whether it is held
              and what it costs. Nothing is ordered or paid for through this website.
            </p>
            <Link className="cta" href="/admissions">Ask the school office ↗</Link>
          </div>
          <ul className="shop-list">
            <li>Class book lists are issued at the start of each term.</li>
            <li>Uniform sizing is confirmed in person — no online sizing.</li>
            <li>Past-question booklets follow the same subjects as the Academy.</li>
            <li>Nothing is paid for through this website.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
