import type { Metadata } from "next";
import LearningDashboard from "../components/learning-dashboard";
import { listPublishedLessons } from "../lib/public-lessons.mjs";

export const metadata: Metadata = {
  title: "Alice Academy",
  description: "Free lessons, diagnostics, revision and timed mocks for WAEC, NECO and JAMB candidates.",
};

export const dynamic = "force-dynamic";

export default async function Academy() {
  const lessons = await listPublishedLessons();
  return (
    <main id="main" className="shell dash-shell">
      <header className="dash-top">
        <p className="dash-eyebrow">ALICE ACADEMY</p>
        <h1>Your learning space.</h1>
        <p className="dash-muted">
          Free lessons and practice for Nigerian examinations. No account, no payment — progress is stored on
          this device only.
        </p>
      </header>
      <LearningDashboard lessons={lessons} />
    </main>
  );
}
