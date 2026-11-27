import Link from "next/link";
import type { ReactNode } from "react";

export default function AcademyAction({ href, title, description, icon }: {
  href: string; title: string; description?: string; icon: ReactNode;
}) {
  return (
    <Link className="av-action-row" href={href}>
      <span className="av-action-icon" aria-hidden="true">{icon}</span>
      <span className="av-action-copy"><strong>{title}</strong>{description && <span>{description}</span>}</span>
      <svg className="av-action-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
    </Link>
  );
}
