import type { Metadata } from "next";
import "../workspace.css";

export const metadata: Metadata = {
  title: "Lesson review",
  robots: { index: false, follow: false },
};

export default function ReviewLayout({ children }: { children: React.ReactNode }) {
  return <main id="main" className="staff-workspace staff-editor staff-review">{children}</main>;
}
