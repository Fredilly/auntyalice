import Link from "next/link";
import type {ReactNode} from "react";
const icons:Record<string,ReactNode>={
home:<><path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-6h6v6"/></>,
exam:<><path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v6q6 5 12 0v-6M22 9v7"/></>,
book:<><path d="M12 5v15M3 4h5q4 0 4 3 0-3 4-3h5v15h-5q-4 0-4 2-0-2-4-2H3z"/></>,
check:<><rect x="5" y="5" width="14" height="16" rx="2"/><path d="M9 5V3h6v2M8 13l3 3 5-6"/></>,
school:<><path d="m3 10 9-6 9 6M5 10v10h14V10M10 20v-5h4v5"/></>,
math:<><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2m4 0h2m-8 4h2m4 0h2"/></>,
science:<><path d="M9 3h6m-5 0v7L4 19q-1 2 2 2h12q3 0 2-2l-6-9V3M7 16h10"/></>,
leaf:<><path d="M5 19C1 8 12 4 21 3c-1 12-5 19-16 16zM5 19 16 8"/></>,
globe:<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3q-9 9 0 18 9-9 0-18"/></>,
search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
arrow:<path d="M5 12h14m-6-6 6 6-6 6"/>,
};
export function AcademyIcon({name}:{name:string}){return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]??icons.book}</svg>}
export function subjectIcon(name:string){return /math|quantitative/i.test(name)?"math":/science|physics|chemistry/i.test(name)?"science":/biology|agricultur/i.test(name)?"leaf":/government|social|economics/i.test(name)?"globe":"book"}
export const examIcons:Record<string,string>={jamb:"exam",waec:"book",neco:"check",bece:"school","common-entrance":"school"};
export function AcademyCard({href,title,description,icon,tone="neutral",action,tag}:{href:string;title:string;description:string;icon:string;tone?:string;action?:string;tag?:string}){return <Link href={href} className="av-card" data-tone={tone}><div className="av-card-top"><span className="av-icon"><AcademyIcon name={icon}/></span><span className="av-arrow"><AcademyIcon name="arrow"/></span></div><div className="av-card-copy">{tag&&<span className="av-tag">{tag}</span>}<h3>{title}</h3><p>{description}</p>{action&&<span className="av-action">{action}</span>}</div></Link>}
