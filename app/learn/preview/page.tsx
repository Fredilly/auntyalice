import { mathPreviews } from "../../lib/math-preview";
import AcademyAction from "../../components/academy-action";
import { IconBook } from "../../components/icons";
export const metadata = { title: "Mathematics review previews", robots: { index: false, follow: false } };
export default function PreviewIndex() {
  return <main id="main"><section className="av-intro"><p className="av-kicker">WAEC Mathematics</p><h1>Lesson previews</h1><p>Draft materials for testing. Not academically approved or published. Do not use as an official syllabus guide.</p></section><div className="av-action-list av-grouped">{mathPreviews.map(l => <AcademyAction key={l.slug} href={`/learn/preview/${l.slug}`} title={l.title} description="Interactive draft · 5 questions" icon={<IconBook />} />)}</div></main>;
}
