import Link from "next/link";
import { exams } from "../../lib/catalog";
import { staffLessons, type ReviewQueueLesson } from "../../lib/staff-lesson-repo";
import { reviewActor } from "./review-context";

const dateFormat = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeZone: "UTC" });

function QueueGroup({ title, lessons, empty }: {
  title: string;
  lessons: ReviewQueueLesson[];
  empty: string;
}) {
  return (
    <section className="staff-panel">
      <h2>{title}</h2>
      {lessons.length ? (
        <ul className="staff-lessons">
          {lessons.map(lesson => (
            <li className="staff-review-item" key={lesson.id}>
              <Link href={`/staff/review/${encodeURIComponent(lesson.id)}`} prefetch={false}>{lesson.title}</Link>
              <p>Submitted <time dateTime={lesson.submittedAt}>{dateFormat.format(new Date(lesson.submittedAt))}</time></p>
              <p>{exams.filter(exam => lesson.examTracks.includes(exam.slug)).map(exam => exam.name).join(", ") || "No exam tracks selected"}</p>
              <p>{lesson.summary}</p>
            </li>
          ))}
        </ul>
      ) : <p>{empty}</p>}
    </section>
  );
}

export default async function ReviewQueue() {
  const result = await staffLessons.listForReview(await reviewActor());

  return (
    <>
      <h1>Lesson review queue</h1>
      {result.ok ? (
        <div className="staff-fields">
          <QueueGroup title="In review" lessons={result.value.filter(lesson => lesson.state === "submitted")}
            empty="No lessons are waiting for review." />
          <QueueGroup title="Approved for publication" lessons={result.value.filter(lesson => lesson.state === "approved")}
            empty="No approved lessons are waiting to be published." />
        </div>
      ) : <p className="staff-alert">{result.error}</p>}
    </>
  );
}
