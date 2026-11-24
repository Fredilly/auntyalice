import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {title:"Aunty Alice Schools",description:"School and open learning in Mararaba, Nasarawa."};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>}
