"use client";

import { useState, type FormEvent } from "react";
import { workspaceUnavailable } from "../../lib/staff-workspace.mjs";

export default function LoginForm() {
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<{ message: string; unavailable: boolean }>();

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setFailure(undefined);
    try {
      const response = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
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
    <form method="post" className="staff-panel staff-fields" onSubmit={signIn}>
      <label>
        Email
        <input type="email" name="email" autoComplete="username" required />
      </label>
      <label>
        Password
        <input type="password" name="password" autoComplete="current-password" required />
      </label>
      <div role="alert">
        {failure && <div className="staff-alert">
          {failure.unavailable && <p>{workspaceUnavailable}</p>}
          <p>{failure.message}</p>
        </div>}
      </div>
      <button className="staff-primary" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
