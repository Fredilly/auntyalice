import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { readCurrentSessionActor } from "../lib/staff-auth.mjs";
import { staffLessons, type LessonSummary } from "../lib/staff-lesson-repo";

const groups = [
  { title: "Draft", states: ["draft", "changes_requested"], empty: "Lessons that need writing or changes will appear here." },
  { title: "In review", states: ["submitted", "approved"], empty: "Lessons will appear here after they’re submitted for review." },
  { title: "Published", states: ["published"], empty: "Published lessons will appear here when they’re available in the Academy." },
];

function LessonGroups({ lessons }: { lessons: LessonSummary[] }) {
  const hasLessons = lessons.some(lesson => lesson.state !== "archived");
  if (!hasLessons) {
    return (
      <section className="staff-panel">
        <h2>No lessons yet</h2>
        <p>Lessons you can access will appear here. If you expected a lesson, ask your workspace administrator to check your access.</p>
      </section>
    );
  }

  return (
    <div className="staff-groups">
      {groups.map(group => {
        const items = lessons.filter(lesson => group.states.includes(lesson.state));
        return (
          <section className="staff-panel" key={group.title}>
            <h2>{group.title}</h2>
            {items.length ? (
              <ul className="staff-lessons">
                {items.map(lesson => (
                  <li key={lesson.id}>
                    <Link href={`/staff/lessons/${encodeURIComponent(lesson.id)}`} prefetch={false}>
                      {lesson.title}
                      {lesson.state === "changes_requested" && <small>Changes requested</small>}
                      {lesson.state === "approved" && <small>Approved for publication</small>}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p>{group.empty}</p>}
          </section>
        );
      })}
    </div>
  );
}

export default async function StaffHome() {
  const actor = await readCurrentSessionActor(new Request("http://localhost/staff", { headers: await headers() }));
  if (!actor) redirect("/staff/login");

  const result = await staffLessons.list(actor);
  return (
    <>
      <h1>Teacher workspace</h1>
      <p><span className="staff-role">Role</span> {actor.role}</p>
      {result.ok ? <LessonGroups lessons={result.value} /> : (
        <p className="staff-panel">{result.error}</p>
      )}
    </>
  );
}
