import ExamBrowser from "../components/exam-browser";
import Link from "next/link";
import {RecentLesson} from "../components/recent-lesson";
export const metadata={title:"Alice Academy"};
export default function Academy(){return <main id="main"><section className="av-intro"><p className="av-kicker">Alice Academy · Free learning</p><h1>What will you learn today?</h1><p>Explore your exam, find a subject and learn at your own pace. No account needed.</p></section><RecentLesson/><section className="av-section"><ExamBrowser/></section><section className="av-section av-secondary-links"><Link className="text-link" href="/learn/subjects">Browse all subjects</Link><Link className="text-link" href="/learn/lesson/quadratic-equations">Try a sample lesson</Link></section><p className="av-note">Reviewed lessons and official syllabus mappings are in preparation. Sample material is available for preview.</p></main>}
