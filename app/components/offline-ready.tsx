"use client";
import { useEffect } from "react";

/** Registers the offline worker. Silent on failure — offline is a bonus, not a gate. */
export default function OfflineReady() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const timer = setTimeout(() => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }, 2000);
    return () => clearTimeout(timer);
  }, []);
  return null;
}
