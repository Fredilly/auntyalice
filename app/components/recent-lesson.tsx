"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {getLesson} from "../lib/lessons";
const storageKey="alice:recent-lesson:v1";
export function RememberLesson({slug}:{slug:string}){
  useEffect(()=>{try{if(getLesson(slug))localStorage.setItem(storageKey,slug)}catch{}},[slug]);
  return null;
}
export function RecentLesson(){
  const [slug,setSlug]=useState<string|null>(null);
  useEffect(()=>{try{const value=localStorage.getItem(storageKey);setSlug(value&&getLesson(value)?value:null)}catch{}},[]);
  const lesson=slug?getLesson(slug):undefined;
  if(!lesson)return null;
  function clear(){try{localStorage.removeItem(storageKey)}catch{}setSlug(null)}
  return <section className="av-recent" aria-label="Recent lesson"><div><p className="av-kicker">Continue learning</p><h2>{lesson.title}</h2><p>{lesson.status==="preview"?"Development sample · ":""}Last lesson on this device</p><Link className="text-link" href={`/learn/lesson/${lesson.slug}`}>Resume lesson →</Link></div><button className="reset-button" type="button" onClick={clear}>Clear recent lesson</button></section>;
}
