import Link from "next/link";

export default function ReviewForbidden() {
  return (
    <section className="staff-panel">
      <h1>403 · Reviewer access required</h1>
      <p>Only signed-in reviewers and administrators can open the lesson review workspace.</p>
      <Link className="staff-back" href="/staff">Return to staff workspace</Link>
    </section>
  );
}
