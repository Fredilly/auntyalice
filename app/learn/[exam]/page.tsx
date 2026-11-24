import {notFound} from "next/navigation";
import Link from "next/link";
const exams:Record<string,string>={jamb:"JAMB / UTME",waec:"WAEC / WASSCE",neco:"NECO",bece:"BECE","common-entrance":"Common Entrance"};
export default async function Exam({params}:{params:Promise<{exam:string}>}){const {exam}=await params;if(!Object.hasOwn(exams,exam))notFound();return <main><Link href="/learn">All exams</Link><section><h1>{exams[exam]}</h1><p>Subject guides, reviewed lessons and practice questions are in development.</p></section></main>}
