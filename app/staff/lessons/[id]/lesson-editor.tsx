"use client";

import { useRef, useState, type FormEvent } from "react";
import { examTracks, workspaceUnavailable, type LessonDraft, type PracticeQuestion } from "../../../lib/staff-workspace.mjs";
import VideoPreview from "./video-preview";

const examLabels = {
  jamb: "JAMB",
  waec: "WAEC",
  neco: "NECO",
  bece: "BECE",
  "common-entrance": "Common Entrance",
};

function QuestionFields({
  question, index, editable, change, remove,
}: {
  question: PracticeQuestion;
  index: number;
  editable: boolean;
  change: (question: PracticeQuestion) => void;
  remove: () => void;
}) {
  function removeOption(optionIndex: number) {
    const options = question.options.filter((_, index) => index !== optionIndex);
    const answer = question.answer === optionIndex ? -1 :
      question.answer > optionIndex ? question.answer - 1 : question.answer;
    change({ ...question, options, answer });
  }

  return (
    <fieldset className="staff-question staff-fields" disabled={!editable}>
      <legend>Question {index + 1}</legend>
      <label>
        Prompt
        <textarea rows={2} value={question.prompt}
          onChange={event => change({ ...question, prompt: event.target.value })} />
      </label>
      <fieldset className="staff-options staff-fields">
        <legend>Options and correct answer</legend>
        {question.options.map((option, optionIndex) => (
          <div className="staff-option" key={optionIndex}>
            <label>
              Option {optionIndex + 1}
              <input value={option} onChange={event => {
                const options = question.options.slice();
                options[optionIndex] = event.target.value;
                change({ ...question, options });
              }} />
            </label>
            <div className="staff-option-actions">
              <label className="staff-choice">
                <input type="radio" name={`answer-${question.id}`}
                  checked={question.answer === optionIndex}
                  onChange={() => change({ ...question, answer: optionIndex })} />
                Correct answer
                <span className="staff-visually-hidden"> for option {optionIndex + 1}</span>
              </label>
              {editable && question.options.length > 2 && (
                <button type="button" className="staff-quiet" onClick={() => removeOption(optionIndex)}>
                  Remove option {optionIndex + 1}
                </button>
              )}
            </div>
          </div>
        ))}
        {editable && <button type="button" className="staff-quiet"
          onClick={() => change({ ...question, options: [...question.options, ""] })}>Add option</button>}
      </fieldset>
      <label>
        Explanation
        <textarea rows={2} value={question.explanation}
          onChange={event => change({ ...question, explanation: event.target.value })} />
      </label>
      {editable && <button type="button" className="staff-quiet" onClick={remove}>Remove question {index + 1}</button>}
    </fieldset>
  );
}

export default function LessonEditor({
  id, revisionId, initialDraft, editable,
}: {
  id: string;
  revisionId: string;
  initialDraft: LessonDraft;
  editable: boolean;
}) {
  const [questions, setQuestions] = useState(initialDraft.questions);
  const [videoUrl, setVideoUrl] = useState(initialDraft.videoId
    ? `https://www.youtube.com/watch?v=${initialDraft.videoId}` : "");
  const [revision, setRevision] = useState(revisionId);
  const [pending, setPending] = useState<"save" | "submit">();
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const disclosure = useRef<HTMLDetailsElement>(null);
  const errorSummary = useRef<HTMLDivElement>(null);
  const canEdit = editable && !submitted;
  const hasErrors = Object.keys(errors).length > 0;

  function showErrors(nextErrors: Record<string, string>) {
    setErrors(nextErrors);
    if (Object.keys(nextErrors).some(key => key.startsWith("questions")) && disclosure.current) {
      disclosure.current.open = true;
    }
    requestAnimationFrame(() => errorSummary.current?.focus());
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit || pending) return;

    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const action = submitter?.getAttribute("value") === "submit" ? "submit" : "save";
    const form = new FormData(event.currentTarget);
    setPending(action);
    setErrors({});
    setStatus("");

    try {
      const response = await fetch(`/api/staff/lessons/${encodeURIComponent(id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          revisionId: revision,
          draft: {
            title: form.get("title"),
            slug: form.get("slug"),
            examTracks: form.getAll("examTracks"),
            videoUrl,
            notes: form.get("notes"),
            questions,
          },
        }),
      });
      const body = await response.json().catch(() => null) as {
        revisionId?: string;
        error?: string;
        errors?: Record<string, string>;
      } | null;
      if (!response.ok) {
        const message = response.status === 503 ? workspaceUnavailable :
          body?.error ?? "Could not update the lesson. Try again.";
        showErrors(body?.errors ?? { form: message });
        return;
      }
      if (!body?.revisionId) {
        showErrors({ form: "The server did not confirm the update. Copy your edits before reloading the page." });
        return;
      }
      setRevision(body.revisionId);
      setSubmitted(action === "submit");
      setStatus(action === "submit" ? "Lesson submitted for review." : "Draft saved.");
    } catch {
      showErrors({ form: "The request failed. Your edits are still here. Try again." });
    } finally {
      setPending(undefined);
    }
  }

  return (
    <form method="post" className="staff-editor" noValidate onSubmit={save}>
      {!editable && <p className="staff-panel">Only the authoring teacher can edit a current draft.</p>}
      <div role="alert" ref={errorSummary} tabIndex={-1}>
        {hasErrors && (
          <ul id="staff-editor-errors" className="staff-alert">
            {Object.entries(errors).map(([key, message]) => <li key={key}>{message}</li>)}
          </ul>
        )}
      </div>
      <fieldset className="staff-editor-fields staff-fields" disabled={Boolean(pending)}>
        <section className="staff-panel staff-fields">
          <h2>Lesson details</h2>
          <label>
            Title
            <input name="title" defaultValue={initialDraft.title} required readOnly={!canEdit} aria-invalid={Boolean(errors.title)} />
          </label>
          <label>
            Slug
            <input name="slug" defaultValue={initialDraft.slug} required readOnly={!canEdit} autoCapitalize="none"
              spellCheck={false} aria-describedby="staff-slug-help" aria-invalid={Boolean(errors.slug)} />
            <small id="staff-slug-help">Use lowercase letters, numbers and hyphens.</small>
          </label>
          <label>
            YouTube URL (optional)
            <input name="videoUrl" type="url" value={videoUrl} readOnly={!canEdit} autoCapitalize="none"
              aria-invalid={Boolean(errors.videoUrl)} onChange={event => setVideoUrl(event.target.value)} />
          </label>
          <VideoPreview key={videoUrl} url={videoUrl} />
          <fieldset className="staff-exams" disabled={!canEdit}>
            <legend>Exam tracks</legend>
            <div className="staff-exam-options">
              {examTracks.map(exam => (
                <label className="staff-choice" key={exam}>
                  <input type="checkbox" name="examTracks" value={exam}
                    defaultChecked={initialDraft.examTracks.includes(exam)} />
                  {examLabels[exam]}
                </label>
              ))}
            </div>
          </fieldset>
        </section>
        <section className="staff-panel staff-fields">
          <h2>Written notes</h2>
          <label>
            Lesson notes
            <textarea name="notes" rows={8} defaultValue={initialDraft.notes} required readOnly={!canEdit}
              aria-describedby="staff-notes-help" aria-invalid={Boolean(errors.notes)} />
            <small id="staff-notes-help">Use plain text with headings, lists and blank lines.</small>
          </label>
        </section>
        <details className="staff-panel" ref={disclosure}>
          <summary>Practice questions ({questions.length})</summary>
          <div className="staff-fields staff-practice">
            {questions.length === 0 && <p>{canEdit
              ? "Add a question with an answer and explanation." : "This lesson has no practice questions."}</p>}
            {questions.map((question, index) => (
              <QuestionFields key={question.id} question={question} index={index} editable={canEdit}
                change={updated => setQuestions(current => current.map(item =>
                  item.id === question.id ? updated : item))}
                remove={() => setQuestions(current => current.filter(item => item.id !== question.id))} />
            ))}
            {canEdit && <button type="button" className="staff-secondary" onClick={() => {
              const question = { id: crypto.randomUUID(), prompt: "", options: ["", ""], answer: -1, explanation: "" };
              setQuestions(current => [...current, question]);
            }}>Add question</button>}
          </div>
        </details>
        {canEdit && (
          <div className="staff-actions">
            <button type="submit" className="staff-secondary" value="save">
              {pending === "save" ? "Saving…" : "Save draft"}
            </button>
            <button type="submit" className="staff-primary" value="submit">
              {pending === "submit" ? "Submitting…" : "Submit for review"}
            </button>
          </div>
        )}
      </fieldset>
      <div role="status">{status && <p className="staff-panel">{status}</p>}</div>
    </form>
  );
}
