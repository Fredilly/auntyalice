import { forbidden, notFound } from "next/navigation";
import LessonVideo from "../../../components/lesson-video";
import { exams } from "../../../lib/catalog";
import { staffLessons } from "../../../lib/staff-lesson-repo";
import { isIndependentReviewer } from "../../../lib/review-flow.mjs";
import { reviewActor } from "../review-context";
import ReviewDecisionForm from "./review-decision-form";

export default async function ReviewLessonPage({ params }: {
  params: Promise<{ id: string }>;
}) {
  const actor = await reviewActor();
  const { id } = await params;
  const result = await staffLessons.get(actor, id);
  if (!result.ok) {
    if (result.status === 404) notFound();
    if (result.status === 403) forbidden();
    return <><h1>Lesson review</h1><p className="staff-alert">{result.error}</p></>;
  }

  const lesson = result.value;
  if (lesson.state === "draft" || lesson.state === "archived") notFound();
  const { draft } = lesson;
  const tracks = exams.filter(exam => draft.examTracks.includes(exam.slug)).map(exam => exam.name);

  return (
    <>
      <a className="staff-back" href="/staff/review"> Review queue</a>
      <h1>{draft.title}</h1>
      <p>{tracks.join(", ") || "No exam tracks selected"}</p>
      <div className="staff-fields">
        <section className="staff-panel staff-video">
          <h2>Video</h2>
          {draft.videoId ? <LessonVideo id={draft.videoId} /> : <p>No video was submitted with this lesson.</p>}
        </section>
        <section className="staff-panel">
          <h2>Lesson notes</h2>
          <p className="staff-review-notes">{draft.notes}</p>
        </section>
        <details className="staff-panel staff-review-disclosure">
          <summary>Practice questions and answers ({draft.questions.length})</summary>
          <ol className="staff-review-questions">
            {draft.questions.map(question => (
              <li key={question.id}>
                <h3>{question.prompt}</h3>
                <ul>
                  {question.options.map((option, index) => (
                    <li key={option}>{index === question.answer ? <strong>{option} (correct)</strong> : option}</li>
                  ))}
                </ul>
                <p>{question.explanation}</p>
              </li>
            ))}
          </ol>
        </details>
        <ReviewDecisionForm key={lesson.revisionId} id={id} revisionId={lesson.revisionId} slug={draft.slug} initialState={lesson.state}
          independent={isIndependentReviewer(actor, lesson)} />
      </div>
    </>
  );
}
