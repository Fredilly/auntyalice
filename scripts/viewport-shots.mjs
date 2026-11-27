/** Viewport-only screenshots at 360x800 — no stitching, so fixed UI is captured honestly. */
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import WebSocket from "ws";

const CHROME = process.env.HOME + "/.hermes/tools/chromium-1248/chrome-linux64/chrome";
const BASE = process.env.BASE || "http://localhost:3001";
const PATH = process.argv[2] || "/learn/lesson/laws-of-indices";
const NAME = process.argv[3] || "lesson";
const PORT = 9335;

const chrome = spawn(CHROME, ["--headless=new","--no-sandbox","--disable-gpu","--hide-scrollbars",
  `--remote-debugging-port=${PORT}`,"--user-data-dir=/tmp/cdp-vp","about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function target() {
  for (let i = 0; i < 60; i++) {
    try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const p = l.find((t) => t.type === "page"); if (p?.webSocketDebuggerUrl) return p.webSocketDebuggerUrl; } catch {}
    await sleep(250);
  }
  throw new Error("no target");
}
const ws = new WebSocket(await target());
await new Promise((res, rej) => { ws.once("open", res); ws.once("error", rej); });
let id = 1; const pending = new Map();
ws.on("message", (raw) => { const m = JSON.parse(raw); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } });
const send = (method, params={}) => new Promise((resolve,reject)=>{ const i=id++; pending.set(i,{resolve,reject}); ws.send(JSON.stringify({id:i,method,params})); });
const js = async (e) => (await send("Runtime.evaluate", { expression: e, awaitPromise: true, returnByValue: true })).result.value;

try {
  await send("Page.enable"); await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 360, height: 800, deviceScaleFactor: 2, mobile: true });
  await send("Page.navigate", { url: BASE + PATH });
  await sleep(3000);
  const height = await js("document.body.scrollHeight");
  const stops = [0, Math.round(height * 0.45), height - 800];
  for (let i = 0; i < stops.length; i++) {
    await js(`window.scrollTo(0, ${Math.max(0, stops[i])})`);
    await sleep(600);
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(`/tmp/vp-${NAME}-${i}.png`, Buffer.from(data, "base64"));
  }
  // is the fixed nav overlapping content at the very bottom?
  const navTop = await js("(() => { const n = document.querySelector('.av-nav'); const r = n.getBoundingClientRect(); return Math.round(r.top); })()");
  const padBottom = await js("getComputedStyle(document.querySelector('main')).paddingBottom");
  console.log(JSON.stringify({ height, navTop, padBottom, stops }));
} finally {
  ws.close(); chrome.kill("SIGKILL");
}
