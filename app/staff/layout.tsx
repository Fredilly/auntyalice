import type { Metadata } from "next";
import "./workspace.css";

export const metadata: Metadata = {
  title: "Teacher workspace",
  robots: { index: false, follow: false },
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <main id="main" className="staff-workspace">{children}</main>;
}
