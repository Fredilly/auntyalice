"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {AcademyIcon} from "./academy-ui";
export default function AcademyNav(){const path=usePathname();const items=[{href:"/learn",label:"Home",icon:"home",active:path==="/learn"},{href:"/learn/exams",label:"Exams",icon:"exam",active:path!=="/learn"&&!path.startsWith("/learn/lesson")&&!path.startsWith("/learn/subjects")},{href:"/learn/subjects",label:"Subjects",icon:"book",active:path.startsWith("/learn/subjects")},{href:"/learn/lesson/quadratic-equations",label:"Practice",icon:"check",active:path.startsWith("/learn/lesson")}];return <nav className="av-nav" aria-label="Academy navigation">{items.map(i=><Link href={i.href} key={i.href} aria-current={i.active?"page":undefined}><span className="av-nav-icon"><AcademyIcon name={i.icon}/></span><span>{i.label}</span></Link>)}</nav>}
