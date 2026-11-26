import Link from "next/link";
import { exams } from "../../lib/catalog";
import { reviewPreviewNotice } from "../../lib/review-fixture.mjs";
import type { ReviewQueueLesson } from "../../lib/staff-lesson-repo";
import { reviewContext, type ReviewSearchParams } from "./review-context";

const dateFormat = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeZone: "UTC" });

function QueueGroup({ title, lessons, empty, query }: {
  title: string;
  lessons: ReviewQueueLesson[];
  empty: string;
  query: string;
}) {
  return (
    <section className="staff-panel">
      <h2>{title}</h2>
      {lessons.length ? (
        <ul className="staff-lessons">
          {lessons.map(lesson => (
            <li className="staff-review-item" key={lesson.id}>
              <Link href={`/staff/review/${encodeURIComponent(lesson.id)}${query}`} prefetch={false}>{lesson.title}</Link>
              <p>{lesson.authorName} · Submitted <time dateTime={lesson.submittedAt}>{dateFormat.format(new Date(lesson.submittedAt))}</time></p>
              <p>{exams.filter(exam => lesson.examTracks.includes(exam.slug)).map(exam => exam.name).join(", ") || "No exam tracks selected"}</p>
              <p>{lesson.summary}</p>
            </li>
          ))}
        </ul>
      ) : <p>{empty}</p>}
    </section>
  );
}

export default async function ReviewQueue({ searchParams }: { searchParams: ReviewSearchParams }) {
  const { actor, preview, query, repository } = await reviewContext(searchParams);
  const result = await repository.listForReview(actor);

  return (
    <>
      {preview && <p className="staff-review-preview">{reviewPreviewNotice}</p>}
      <h1>Lesson review queue</h1>
      {result.ok ? (
        <div className="staff-fields">
          <QueueGroup title="In review" lessons={result.value.filter(lesson => lesson.state === "submitted")}
            empty="No lessons are waiting for review." query={query} />
          <QueueGroup title="Approved for publication" lessons={result.value.filter(lesson => lesson.state === "approved")}
            empty="No approved lessons are waiting to be published." query={query} />
        </div>
      ) : <p className="staff-alert">{result.error}</p>}
    </>
  );
}
