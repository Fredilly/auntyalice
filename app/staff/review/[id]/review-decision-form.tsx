"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { isReviewComplete, reviewChecklist } from "../../../lib/publishing.mjs";
import type { ReviewAction, ReviewState } from "../../../lib/review-flow.mjs";

const decisionMessages = {
  approved: "Approved for publication.",
  changes_requested: "Changes requested.",
  published: "Published to Alice Academy.",
} satisfies Record<ReviewState, string>;

export default function ReviewDecisionForm({ id, revisionId, slug, initialState, independent }: {
  id: string;
  revisionId: string;
  slug: string;
  initialState: "submitted" | ReviewState;
  independent: boolean;
}) {
  const [state, setState] = useState(initialState);
  const [approval, setApproval] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const status = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state !== initialState) status.current?.focus();
  }, [initialState, state]);

  async function submit(action: ReviewAction) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const evidence = action === "approve" ? { approval } : action === "request_changes" ? { reason } : {};
      const response = await fetch(`/api/staff/review/${encodeURIComponent(id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, revisionId, ...evidence }),
      });
      const result = await response.json() as { state?: ReviewState; error?: string };
      if (response.ok && result.state) setState(result.state);
      else setError(result.error ?? "The decision could not be recorded.");
    } catch {
      setError("The decision could not be recorded. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="staff-panel staff-fields" aria-labelledby="review-decision-title">
      <div>
        <h2 id="review-decision-title">Review decision</h2>
        <div ref={status} role="status" tabIndex={-1}>
          {busy ? <p>Recording your decision…</p> : state !== "submitted" && <p>{decisionMessages[state]}</p>}
        </div>
      </div>
      {!independent && <p>An independent reviewer must make decisions for lessons you authored or own.</p>}
      {state === "submitted" && (
        <>
          <details className="staff-review-disclosure">
            <summary>Approval checklist</summary>
            <fieldset className="staff-editor-fields" disabled={busy || !independent}>
              <legend>Complete all five checks to approve the lesson.</legend>
              {Object.entries(reviewChecklist).map(([key, label]) => (
                <label className="staff-choice staff-review-check" key={key}>
                  <input type="checkbox" checked={approval[key] === true}
                    onChange={event => {
                      const { checked } = event.target;
                      setApproval(previous => ({ ...previous, [key]: checked }));
                    }} />
                  {label}
                </label>
              ))}
            </fieldset>
          </details>
          {independent && (
            <>
              <div className="staff-actions">
                <button className="staff-primary" type="button" disabled={busy || !isReviewComplete(approval)}
                  onClick={() => submit("approve")}>Approve lesson</button>
              </div>
              <details className="staff-review-disclosure">
                <summary>Request changes</summary>
                <form className="staff-fields" onSubmit={event => { event.preventDefault(); void submit("request_changes"); }}>
                  <label>
                    Reason for requesting changes
                    <textarea rows={4} value={reason} onChange={event => setReason(event.target.value)} required disabled={busy} />
                  </label>
                  <div className="staff-actions">
                    <button className="staff-secondary" type="submit" disabled={busy || !reason.trim()}>Send change request</button>
                  </div>
                </form>
              </details>
            </>
          )}
        </>
      )}
      {state === "approved" && independent && (
        <div className="staff-actions">
          <button className="staff-primary" type="button" disabled={busy} onClick={() => submit("publish")}>
            Publish to Alice Academy
          </button>
        </div>
      )}
      {state === "published" && (
        <Link className="staff-back" href={`/learn/lesson/${encodeURIComponent(slug)}`} prefetch={false}>
          Open lesson in Alice Academy
        </Link>
      )}
      {error && <p className="staff-alert" role="alert">{error}</p>}
    </section>
  );
}
