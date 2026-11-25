import AcademyNav from "../components/academy-nav";
import "./academy.css";
export default function AcademyLayout({children}:{children:React.ReactNode}){return <div className="av-layout"><AcademyNav/><div className="av-content">{children}</div></div>}
