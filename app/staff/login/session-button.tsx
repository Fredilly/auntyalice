"use client";

import { useState } from "react";
import { workspaceUnavailable } from "../../lib/staff-workspace.mjs";

export default function SessionButton({ development }: { development: boolean }) {
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<{ message: string; unavailable: boolean }>();

  async function signIn() {
    if (pending) return;
    setPending(true);
    setFailure(undefined);
    try {
      const response = await fetch("/api/staff/session", { cache: "no-store", redirect: "error" });
      if (response.ok) {
        window.location.replace("/staff");
        return;
      }
      const body = await response.json().catch(() => null) as { error?: unknown } | null;
      setFailure({
        message: typeof body?.error === "string" ? body.error : "Sign-in failed. Try again.",
        unavailable: response.status === 503,
      });
    } catch {
      setFailure({ message: "The sign-in request failed. Try again.", unavailable: false });
    }
    setPending(false);
  }

  return (
    <div className="staff-panel staff-fields">
      <div role="alert">
        {failure && <div className="staff-alert">
          {failure.unavailable && <p>{workspaceUnavailable}</p>}
          <p>{failure.message}</p>
        </div>}
      </div>
      <button type="button" className="staff-primary" disabled={pending} onClick={signIn}>
        {pending ? "Signing in…" : development ? "Continue as development staff" : "Continue to workspace"}
      </button>
    </div>
  );
}
