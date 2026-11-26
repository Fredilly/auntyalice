import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { readSessionActor } from "../../../lib/staff-auth.mjs";
import { canEditLesson, staffLessons } from "../../../lib/staff-lesson-repo";
import LessonEditor from "./lesson-editor";

export default async function StaffLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = readSessionActor(new Request("http://localhost/staff", { headers: await headers() }));
  if (!actor) redirect("/staff/login");

  const { id } = await params;
  const result = await staffLessons.get(actor, id);
  return (
    <>
      <Link className="staff-back" href="/staff">← Teacher workspace</Link>
      <h1>Lesson editor</h1>
      {result.ok ? (
        <LessonEditor
          key={result.value.id}
          id={result.value.id}
          revisionId={result.value.revisionId}
          initialDraft={result.value.draft}
          editable={canEditLesson(actor, result.value)}
        />
      ) : <p className="staff-panel">{result.error}</p>}
    </>
  );
}
