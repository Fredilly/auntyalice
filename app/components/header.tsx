"use client";
import Link from "next/link";
import BrandMark from "./brand-mark";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Three doors in the bar, everything else one level down.
 * Desktop: Schools menu + Academy + Apply.
 * Mobile: a sheet — six links in a 360px bar is how sites sprawl.
 */
const schools = [
  { href: "/primary", name: "Primary" },
  { href: "/secondary", name: "Secondary" },
  { href: "/school-life", name: "School life" },
  { href: "/shop", name: "School shop" },
];

const sheetLinks = [
  { href: "/admissions", name: "Admissions" },
  { href: "/primary", name: "Primary school" },
  { href: "/secondary", name: "Secondary school" },
  { href: "/learn", name: "Alice Academy" },
  { href: "/school-life", name: "School life" },
  { href: "/shop", name: "School shop" },
];

export default function Header() {
  const path = usePathname();
  const [sheet, setSheet] = useState(false);
  const [schoolsOpen, setSchoolsOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSheet(false);
    setSchoolsOpen(false);
  }, [path]);

  useEffect(() => {
    if (!sheet) return;
    sheetRef.current?.querySelector("a")?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSheet(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [sheet]);

  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <BrandMark className="brand-mark" />
        <span>Aunty Alice<span className="brand-sub">Mararaba</span></span>
      </Link>

      <nav aria-label="Main navigation" className="desktop-nav">
        <div className="nav-group">
          <button
            className="nav-button"
            aria-expanded={schoolsOpen}
            aria-haspopup="true"
            onClick={() => setSchoolsOpen(!schoolsOpen)}
          >
            Schools <span aria-hidden="true">▾</span>
          </button>
          {schoolsOpen && (
            <div className="nav-menu" role="menu">
              {schools.map((item) => (
                <Link key={item.href} href={item.href} role="menuitem" onClick={() => setSchoolsOpen(false)}>
                  {item.name}
                </Link>
              ))}
            </div>
          )}
        </div>
        <Link href="/learn" aria-current={path.startsWith("/learn") ? "page" : undefined}>Academy</Link>
      </nav>

      <div className="header-actions">
        <Link className="small-cta" href="/admissions">Apply</Link>
        <button
          ref={trigger}
          className="sheet-trigger"
          aria-label="Open menu"
          aria-expanded={sheet}
          aria-controls="mobile-sheet"
          onClick={() => setSheet(true)}
        >
          <span aria-hidden="true">☰</span>
        </button>
      </div>

      {sheet && <div className="sheet-scrim" onClick={() => setSheet(false)} aria-hidden="true" />}
      {sheet && (
        <div id="mobile-sheet" ref={sheetRef} className="sheet" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="sheet-head">
            <Link className="brand" href="/" onClick={() => setSheet(false)}>
              <BrandMark className="brand-mark" />
              <span>Aunty Alice</span>
            </Link>
            <button
              className="sheet-close"
              onClick={() => {
                setSheet(false);
                trigger.current?.focus();
              }}
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>
          <nav className="sheet-nav" aria-label="Sections">
            {sheetLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={path === item.href ? "page" : undefined}
                onClick={() => setSheet(false)}
              >
                {item.name}
                <span aria-hidden="true">↗</span>
              </Link>
            ))}
          </nav>
          <p className="sheet-note">Staff publishing lives at <Link href="/staff" onClick={() => setSheet(false)}>/staff</Link>.</p>
        </div>
      )}
    </header>
  );
}
