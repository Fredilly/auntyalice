import type {Metadata} from "next";
import Link from "next/link";
import Header from "./components/header";
import BrandMark from "./components/brand-mark";
import "./globals.css";
const site = process.env.NEXT_PUBLIC_SITE_URL || "https://auntyalice.fredilly.workers.dev";
export const metadata:Metadata={
  metadataBase:new URL(site),
  title:{default:"Aunty Alice Schools",template:"%s | Aunty Alice"},
  description:"Primary, secondary and open learning in Mararaba, Nasarawa, Nigeria.",
  icons:{icon:[{url:"/media/branding/favicon.svg",type:"image/svg+xml"}]},
  openGraph:{
    type:"website",siteName:"Aunty Alice Schools",locale:"en_NG",
    title:"Aunty Alice Schools",description:"Primary, secondary and open learning in Mararaba, Nasarawa, Nigeria.",
    images:[{url:"/media/branding/og-default.svg",width:1200,height:630,alt:"Aunty Alice Schools"}],
  },
  twitter:{card:"summary_large_image",images:["/media/branding/og-default.svg"]},
};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body><a className="skip" href="#main">Skip to content</a><Header/>{children}<footer className="site-footer"><div className="footer-inner"><div><Link className="brand" href="/"><BrandMark className="brand-mark"/>Aunty Alice</Link><p>Mararaba, Nasarawa State, Nigeria.</p></div><nav aria-label="Footer"><Link href="/primary">Primary</Link><Link href="/secondary">Secondary</Link><Link href="/learn">Academy</Link><Link href="/admissions">Admissions</Link><Link href="/school-life">School life</Link></nav><p className="muted">Development preview. Official school details and media are being verified.</p></div></footer></body></html>}
