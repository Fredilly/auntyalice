"use client";

import { useMemo, useState } from "react";

/**
 * Admissions enquiry.
 *
 * Deliberately sends nothing to a server: no pupil data is collected or stored,
 * which is the honest position until the school confirms how it wants enquiries
 * handled. The form composes a message and hands it to WhatsApp, or to the
 * clipboard when no number has been verified yet.
 */

const LEVELS = [
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
] as const;

export default function EnquiryForm({ whatsapp }: { whatsapp?: string }) {
  const [level, setLevel] = useState<string>("primary");
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  const [parentName, setParentName] = useState("");
  const [phone, setPhone] = useState("");
  const [question, setQuestion] = useState("");
  const [copied, setCopied] = useState(false);

  const message = useMemo(() => {
    const lines = [
      "Admissions enquiry — Aunty Alice Schools",
      `Level: ${level === "primary" ? "Primary" : "Secondary"}`,
      childName ? `Child: ${childName}${childAge ? ` (${childAge})` : ""}` : "",
      parentName ? `Parent/guardian: ${parentName}` : "",
      phone ? `Contact: ${phone}` : "",
      question ? `Question: ${question}` : "",
    ].filter(Boolean);
    return lines.join("\n");
  }, [level, childName, childAge, parentName, phone, question]);

  const href = whatsapp
    ? `https://wa.me/${whatsapp.replace(/[^\d]/g, "")}?text=${encodeURIComponent(message)}`
    : undefined;

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <form className="enquiry" onSubmit={(e) => e.preventDefault()}>
      <div className="enquiry-row">
        <label htmlFor="level">Which school?</label>
        <div className="enquiry-choice">
          {LEVELS.map((option) => (
            <label key={option.value} className="enquiry-pill">
              <input
                type="radio"
                name="level"
                value={option.value}
                checked={level === option.value}
                onChange={() => setLevel(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="enquiry-grid">
        <label>
          Child&apos;s name
          <input value={childName} onChange={(e) => setChildName(e.target.value)} autoComplete="off" />
        </label>
        <label>
          Age
          <input value={childAge} onChange={(e) => setChildAge(e.target.value)} inputMode="numeric" autoComplete="off" />
        </label>
        <label>
          Your name
          <input value={parentName} onChange={(e) => setParentName(e.target.value)} autoComplete="name" />
        </label>
        <label>
          Phone or WhatsApp
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" />
        </label>
      </div>

      <label>
        Anything you would like to ask?
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          placeholder="Fees, transport, class sizes, a start date…"
        />
      </label>

      <div className="enquiry-actions">
        {href ? (
          <a className="cta" href={href} target="_blank" rel="noreferrer">
            Send on WhatsApp ↗
          </a>
        ) : (
          <button type="button" className="cta" onClick={copy}>
            {copied ? "Message copied ✓" : "Copy message"}
          </button>
        )}
        <span className="muted enquiry-note">
          Nothing is stored on this website. You see the exact message before it is sent.
        </span>
      </div>

      {!href && (
        <p className="enquiry-pending">
          <strong>Admissions WhatsApp number not yet published.</strong> The school&apos;s verified number and
          email will appear here once confirmed. In the meantime you can copy this message and send it to the
          school directly.
        </p>
      )}
    </form>
  );
}
