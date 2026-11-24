import Link from "next/link";
const exams=[["jamb","JAMB / UTME"],["waec","WAEC / WASSCE"],["neco","NECO"],["bece","BECE"],["common-entrance","Common Entrance"]];
export default function Academy(){return <main><Link href="/">Aunty Alice Schools</Link><section><p className="eyebrow">FREE LEARNING</p><h1>Alice Academy</h1><p>Choose your examination. Reviewed learning content is forthcoming.</p><div className="grid">{exams.map(([slug,title])=><Link key={slug} href={`/learn/${slug}`}>{title} →</Link>)}</div></section></main>}
