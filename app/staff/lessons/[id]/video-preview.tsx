"use client";

import { useState } from "react";
import { workspaceUnavailable } from "../../../lib/staff-workspace.mjs";

export default function VideoPreview({ url }: { url: string }) {
  const [videoId, setVideoId] = useState<string>();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function loadPreview() {
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch("/api/staff/lessons/video-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl: url }),
      });
      const body = await response.json().catch(() => null) as { videoId?: string; error?: string } | null;
      if (response.ok && body?.videoId) setVideoId(body.videoId);
      else setError(response.status === 503
        ? workspaceUnavailable : body?.error ?? "The video preview could not be loaded. Try again.");
    } catch {
      setError("The video preview could not be loaded. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (!url.trim()) return null;
  return (
    <div className="staff-video">
      {videoId ? (
        <iframe
          title="Lesson video preview"
          src={`https://www.youtube-nocookie.com/embed/${videoId}`}
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          ref={frame => { frame?.focus(); }}
        />
      ) : (
        <button type="button" className="staff-poster" disabled={pending} onClick={loadPreview}>
          {pending ? "Loading preview…" : "Load YouTube preview"}
        </button>
      )}
      <div role="alert">{error && <p className="staff-alert">{error}</p>}</div>
    </div>
  );
}
