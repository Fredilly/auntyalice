import TimedMock from "../../../components/timed-mock";
import { previewQuestions } from "../../../lib/math-preview";
export default function Page(){return <main id="main"><section className="av-intro"><h1>Timed mock preview</h1><p>Original draft questions for testing only. Results are not saved.</p></section><TimedMock questions={previewQuestions} minutes={15} title="Mathematics preview" preview /></main>}
