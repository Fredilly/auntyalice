import Link from "next/link";

export const metadata = { title: "Offline" };

export default function Offline() {
  return (
    <main id="main" className="shell">
      <section className="page-intro">
        <p className="eyebrow">OFFLINE</p>
        <h1>No connection.</h1>
        <p>
          This page was not saved to your device. Lessons you have already opened will still
          open — go back and try one of those.
        </p>
        <p><Link className="cta" href="/learn">Back to Academy ↗</Link></p>
      </section>
    </main>
  );
}
