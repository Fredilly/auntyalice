"use client";
import {useState} from "react";
import {exams} from "../lib/catalog";
import {AcademyCard,AcademyIcon,examIcons} from "./academy-ui";
export default function ExamBrowser(){const [query,setQuery]=useState("");const q=query.trim().toLowerCase();const matches=exams.filter(e=>[e.name,e.full,e.level,...e.subjects].some(s=>s.toLowerCase().includes(q)));return <><label className="av-search-label" htmlFor="exam-search">Find an exam or subject</label><div className="av-search"><AcademyIcon name="search"/><input id="exam-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Try WAEC or Mathematics"/></div><h2>Explore examinations</h2><div className="av-grid" aria-live="polite">{matches.map(e=><AcademyCard key={e.slug} href={`/learn/${e.slug}`} title={e.name} description={e.level} icon={examIcons[e.slug]} tone={e.slug}/>)}{!matches.length&&<p className="av-note av-wide">No matching exams. Try another search.</p>}</div></>}
