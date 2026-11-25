import {notFound} from "next/navigation";
import Link from "next/link";
import {exams,slugify} from "../../lib/catalog";
import {lessonsForTrack} from "../../lib/lessons";
import {AcademyCard,subjectIcon} from "../../components/academy-ui";
export default async function Exam({params}:{params:Promise<{exam:string}>}){const {exam}=await params;const e=exams.find(x=>x.slug===exam);if(!e)notFound();return <main id="main"><nav className="av-crumb" aria-label="Breadcrumb"><Link href="/learn">Academy</Link><span>/</span><Link href="/learn/exams">Exams</Link><span>/ {e.name}</span></nav><section className="av-intro"><p className="av-kicker">{e.level}</p><h1>{e.name}</h1><p>{e.full}</p></section><section className="av-section"><h2>Choose a subject</h2><div className="av-grid">{e.subjects.map(s=><AcademyCard key={s} href={`/learn/${e.slug}/${slugify(s)}`} title={s} description={lessonsForTrack(exam,slugify(s)).length?"Sample lesson available":"In preparation"} icon={subjectIcon(s)}/>)}</div></section><p className="av-note">Provisional subject catalogue. Official syllabus mappings and reviewed content are pending. Not an official examination body service.</p></main>}
