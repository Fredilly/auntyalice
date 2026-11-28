import Link from "next/link";
import type { ReactNode } from "react";
import { IconArrow, IconChevron, IconExternal } from "./icons";

export default function AcademyAction({ href, title, description, icon, external = false, secondary = false, tone }: {
  href: string; title: string; description?: string; icon?: ReactNode; external?: boolean; secondary?: boolean; tone?: string;
}) {
  const content = <>
    {icon && <span className="av-action-icon" aria-hidden="true">{icon}</span>}
    <span className="av-action-copy"><strong>{title}</strong>{description && <span>{description}</span>}</span>
    {external ? <IconExternal className="av-action-chevron" /> : secondary ? <IconArrow className="av-action-chevron" /> : <IconChevron className="av-action-chevron" />}
  </>;
  const className = "av-action-row" + (secondary ? " av-action-secondary" : "");
  return external
    ? <a className={className} data-tone={tone} href={href} target="_blank" rel="noopener noreferrer" aria-label={title + " (opens in a new tab)"}>{content}</a>
    : <Link className={className} data-tone={tone} href={href}>{content}</Link>;
}
