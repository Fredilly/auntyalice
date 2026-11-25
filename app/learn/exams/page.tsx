import ExamBrowser from "../../components/exam-browser";
export const metadata={title:"Exams"};
export default function Exams(){return <main id="main"><section className="av-intro"><p className="av-kicker">Alice Academy</p><h1>Examinations</h1><p>Choose the exam you are preparing for.</p></section><section className="av-section"><ExamBrowser/></section></main>}
