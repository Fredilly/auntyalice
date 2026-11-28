import Diagnostic from "../../../components/diagnostic";
import { previewQuestions } from "../../../lib/math-preview";
export default function Page(){return <main id="main"><section className="av-intro"><h1>Diagnostic preview</h1><p>Draft questions for testing only. Results are not saved.</p></section><Diagnostic questions={previewQuestions} preview /></main>}
