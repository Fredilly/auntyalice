import type {Metadata} from "next";
import Link from "next/link";
import Header from "./components/header";
import BrandMark from "./components/brand-mark";
import "./globals.css";
export const metadata:Metadata={title:{default:"Aunty Alice Schools",template:"%s | Aunty Alice"},description:"Primary, secondary and open learning in Mararaba, Nasarawa, Nigeria."};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body><a className="skip" href="#main">Skip to content</a><Header/>{children}<footer className="site-footer"><div className="footer-inner"><div><Link className="brand" href="/"><BrandMark className="brand-mark"/>Aunty Alice</Link><p>Mararaba, Nasarawa State, Nigeria.</p></div><nav aria-label="Footer"><Link href="/primary">Primary</Link><Link href="/secondary">Secondary</Link><Link href="/learn">Academy</Link><Link href="/admissions">Admissions</Link><Link href="/school-life">School life</Link></nav><p className="muted">Development preview. Official school details and media are being verified.</p></div></footer></body></html>}
