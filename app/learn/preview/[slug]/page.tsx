import Link from "next/link";
import { notFound } from "next/navigation";
import { mathPreviews } from "../../../lib/math-preview";
import LessonExperience from "../../../components/lesson-experience";
export const metadata = { title: "Draft mathematics lesson", robots: { index: false, follow: false } };
export function generateStaticParams() { return mathPreviews.map(({slug}) => ({slug})); }
export default async function Preview({params}: {params: Promise<{slug:string}>}) {
  const {slug} = await params;
  const lesson = mathPreviews.find(l => l.slug === slug);
  if (!lesson) notFound();
  return <main id="main" className="shell lesson"><Link href="/learn/preview" className="text-link">All previews</Link><section className="page-intro"><p className="av-kicker">WAEC Mathematics · Draft</p><h1>{lesson.title}</h1><p className="preview-notice">Unpublished draft for testing only. Academic approval and syllabus verification pending.</p><a href="#practice-heading" className="text-link">Jump to practice</a></section><LessonExperience key={slug} slug={slug} blocks={lesson.blocks} preview /></main>;
}
