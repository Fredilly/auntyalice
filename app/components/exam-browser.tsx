"use client";
import Link from "next/link";
import {useState} from "react";
import {exams} from "../lib/catalog";
export default function ExamBrowser(){const [query,setQuery]=useState("");const q=query.trim().toLowerCase();const matches=exams.filter(e=>[e.name,e.full,e.level,...e.subjects].some(s=>s.toLowerCase().includes(q)));return <><label className="search-label" htmlFor="exam-search">Find an exam or subject</label><input id="exam-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Try WAEC or Mathematics" className="search-input"/><div className="exam-grid" aria-live="polite">{matches.map((e,i)=><Link className="exam-card" key={e.slug} href={`/learn/${e.slug}`}><span className="card-index">0{i+1}</span><span className="eyebrow">{e.level}</span><h2>{e.name}</h2><p>{e.full}</p><span className="arrow">Explore track ↗</span></Link>)}{!matches.length&&<p>No matching tracks. Try another search.</p>}</div></>}
