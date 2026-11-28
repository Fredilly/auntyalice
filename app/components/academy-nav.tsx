"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBook, IconClock, IconHome, IconPulse } from "./icons";

/**
 * Compact bottom navigation. Four destinations that exist, sentence-case labels,
 * shared SVG icons from the design system, and a 48px touch target on every item.
 * "Sample lesson" was removed: it pointed at placeholder content, not a destination.
 */
const items = [
  { href: "/learn", label: "Home", Icon: IconHome, match: (p: string) => p === "/learn" },
  {
    href: "/learn/subjects",
    label: "Study",
    Icon: IconBook,
    match: (p: string) => p.startsWith("/learn/subjects") || p.startsWith("/learn/lesson") || /^\/learn\/(exams|jamb|waec|neco|bece|common-entrance)(\/|$)/.test(p),
  },
  {
    href: "/learn/mock",
    label: "Practice",
    Icon: IconClock,
    match: (p: string) =>
      p.startsWith("/learn/mock") || p.startsWith("/learn/past-questions") || p.startsWith("/learn/past-papers") || p.startsWith("/learn/revision"),
  },
  { href: "/learn/diagnostic", label: "Progress", Icon: IconPulse, match: (p: string) => p.startsWith("/learn/diagnostic") },
];

export default function AcademyNav() {
  const path = usePathname() ?? "";
  return (
    <nav className="av-nav" aria-label="Academy navigation">
      {items.map(({ href, label, Icon, match }) => {
        const active = match(path);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}>
            <span className="av-nav-icon">
              <Icon className="av-nav-glyph" />
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
