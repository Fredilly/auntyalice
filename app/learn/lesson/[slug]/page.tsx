import Link from "next/link";
import { notFound } from "next/navigation";
import LessonVideo from "../../../components/lesson-video";
import LessonExperience, { type Block } from "../../../components/lesson-experience";
import Practice from "../../../components/practice";
import { RememberLesson } from "../../../components/recent-lesson";
import { exams } from "../../../lib/catalog";
import { getLesson } from "../../../lib/lessons";
import { getPublishedLesson } from "../../../lib/review-flow.mjs";
import { publicLessons } from "../../../lib/staff-lesson-repo";
import { databaseReachable } from "../../../lib/public-lessons.mjs";

export const dynamic = "force-dynamic";

export default async function LessonPage({ params }: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const published = await getPublishedLesson(publicLessons, slug);
  const sample = !published ? getLesson(slug) : undefined;
  const lesson = published ?? sample;

  // A missing database and a missing lesson both surface as "no published revision".
  // 404 tells a student the lesson does not exist, which is wrong and un-actionable
  // when the real fault is that the Worker has no database credentials.
  if (!lesson) {
    if (await databaseReachable()) notFound();
    return (
      <main id="main" className="shell">
        <p className="eyebrow">ALICE ACADEMY</p>
        <h1>Lessons are temporarily unavailable.</h1>
        <p>
          The Academy cannot reach its lesson library right now. This is a service problem, not a
          missing lesson — try again shortly.
        </p>
        <p><a className="text-link" href="/learn">Back to the Academy</a></p>
      </main>
    );
  }

  const tracks = published && exams.filter(exam => published.examTracks.includes(exam.slug)).map(exam => exam.name);
  const lessonKey = published
    ? `published:${slug}:v${published.version}`
    : `${slug}:v${sample?.version}`;

  return (
    <main id="main" className="shell lesson">
      <RememberLesson slug={slug} />
      <Link className="text-link" href="/learn">← Alice Academy</Link>
      <section className="page-intro">
        {sample && <p className="eyebrow">MATHEMATICS / {sample.topic}</p>}
        <h1>{lesson.title}</h1>
        {tracks && <p>{tracks.join(", ") || "No exam tracks selected"}</p>}
        {sample?.status === "preview" && (
          <p className="preview-notice">Development sample · awaiting academic review. Not verified against any official exam syllabus.</p>
        )}
        {sample && <p>{sample.objective}</p>}
        <a className="text-link" href={Array.isArray(published?.blocks) ? "#practice-heading" : "#practice-title"}>Jump to practice ↓</a>
      </section>
      <LessonVideo id={lesson.videoId ?? undefined} />
      {Array.isArray((published as { blocks?: unknown })?.blocks) ? null : (
        <section className="section">
          <h2 className="display">{published ? "Lesson notes" : "Understand the idea."}</h2>
          {published && <p className="published-lesson-notes">{published.notes}</p>}
          {sample?.notes.map(note => <p key={note}>{note}</p>)}
        </section>
      )}
      {sample && (
        <section className="section">
          <h2 className="display">Worked examples.</h2>
          {sample.examples.map(example => (
            <article className="tile example" key={example.prompt}>
              <h3>{example.prompt}</h3>
              <ol>{example.steps.map(step => <li key={step}>{step}</li>)}</ol>
            </article>
          ))}
        </section>
      )}
      {Array.isArray((published as { blocks?: unknown })?.blocks) ? (
        <LessonExperience slug={slug} blocks={(published as unknown as { blocks: Block[] }).blocks} />
      ) : (
        <Practice key={lessonKey} questions={lesson.questions} lessonKey={lessonKey} showAnswers={Boolean(published)} />
      )}
      <Link className="text-link" href="/learn">Explore other subjects ↗</Link>
    </main>
  );
}
