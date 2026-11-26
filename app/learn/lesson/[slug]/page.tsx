import Link from "next/link";
import { notFound } from "next/navigation";
import LessonVideo from "../../../components/lesson-video";
import Practice from "../../../components/practice";
import { RememberLesson } from "../../../components/recent-lesson";
import { exams } from "../../../lib/catalog";
import { getLesson } from "../../../lib/lessons";
import { getReviewPreviewFixture, isReviewPreview, reviewPreviewNotice } from "../../../lib/review-fixture.mjs";
import { getPublishedLesson } from "../../../lib/review-flow.mjs";
import { publicLessons } from "../../../lib/staff-lesson-repo";

export default async function LessonPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string | string[] }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const preview = isReviewPreview(query.preview);
  const published = await getPublishedLesson(preview ? getReviewPreviewFixture() : publicLessons, slug);
  const sample = !preview && !published ? getLesson(slug) : undefined;
  const lesson = published ?? sample;
  if (!lesson) notFound();

  const tracks = published && exams.filter(exam => published.examTracks.includes(exam.slug)).map(exam => exam.name);
  const lessonKey = published
    ? `${preview ? "fixture" : "published"}:${slug}:${published.revisionId}`
    : `${slug}:v${sample?.version}`;

  return (
    <main id="main" className="shell lesson">
      {!preview && <RememberLesson slug={slug} />}
      <Link className="text-link" href="/learn">← Alice Academy</Link>
      <section className="page-intro">
        {preview && <p className="preview-notice">{reviewPreviewNotice}</p>}
        {sample && <p className="eyebrow">MATHEMATICS / {sample.topic}</p>}
        <h1>{lesson.title}</h1>
        {tracks && <p>{tracks.join(", ") || "No exam tracks selected"}</p>}
        {sample?.status === "preview" && (
          <p className="preview-notice">Development sample · awaiting academic review. Not verified against any official exam syllabus.</p>
        )}
        {sample && <p>{sample.objective}</p>}
        <a className="text-link" href="#practice-title">Jump to practice ↓</a>
      </section>
      {preview && published?.videoId && <p>The sample video ID is a placeholder.</p>}
      <LessonVideo id={lesson.videoId ?? undefined} />
      <section className="section">
        <h2 className="display">{published ? "Lesson notes" : "Understand the idea."}</h2>
        {published && <p className="published-lesson-notes">{published.notes}</p>}
        {sample?.notes.map(note => <p key={note}>{note}</p>)}
      </section>
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
      <Practice key={lessonKey} questions={lesson.questions} lessonKey={lessonKey} showAnswers={Boolean(published)} />
      <Link className="text-link" href="/learn">Explore other subjects ↗</Link>
    </main>
  );
}
