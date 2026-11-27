/**
 * Lesson Experience V2 — interaction test at 360px in a real browser.
 * Proves the maths is MathML, the worked example reveals step by step, and practice
 * gives immediate feedback. Exits non-zero on failure.
 */
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import WebSocket from "ws";

const CHROME = process.env.HOME + "/.hermes/tools/chromium-1248/chrome-linux64/chrome";
const BASE = process.env.BASE || "http://localhost:3001";
const PORT = 9334;
const chrome = spawn(CHROME, ["--headless=new","--no-sandbox","--disable-gpu","--hide-scrollbars",
  `--remote-debugging-port=${PORT}`,"--user-data-dir=/tmp/cdp-lesson","about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function target() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error("no debugging target");
}

const ws = new WebSocket(await target());
await new Promise((res, rej) => { ws.once("open", res); ws.once("error", rej); });
let id = 1;
const pending = new Map();
ws.on("message", (raw) => {
  const m = JSON.parse(raw.toString());
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); }
});
const send = (method, params = {}) => new Promise((resolve, reject) => { const i = id++; pending.set(i, { resolve, reject }); ws.send(JSON.stringify({ id: i, method, params })); });
const js = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result.value;

let failures = 0;
const out = [];
const check = (label, ok, detail = "") => { if (!ok) failures++; out.push(`${ok ? "PASS" : "FAIL"} ${label}${detail ? " — " + detail : ""}`); };

try {
  await send("Page.enable"); await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 360, height: 800, deviceScaleFactor: 2, mobile: true });
  await send("Page.navigate", { url: BASE + "/learn/lesson/laws-of-indices" });
  await sleep(2500);
  for (let i = 0; i < 20 && !(await js("document.body.innerText.includes('Practise')")); i++) await sleep(500);

  const mathCount = await js("document.querySelectorAll('math').length");
  check("maths renders as MathML", mathCount >= 8, `${mathCount} <math> elements`);

  // the eyebrow is CSS-uppercased, so innerText returns it in caps
  const objectives = await js("/by the end of this lesson you can/i.test(document.body.innerText)");
  check("learning objectives present", objectives);
  const objCount = await js("document.querySelectorAll('.lx-objectives li').length");
  check("objectives are itemised", objCount >= 3, `${objCount} objectives`);
  const mistakes = await js("document.querySelectorAll('.lx-mistake').length");
  check("common mistakes shown", mistakes >= 2, `${mistakes} mistakes`);

  // worked example reveal
  const before = await js("document.querySelectorAll('.lx-steps li').length");
  await js("(() => { const b = [...document.querySelectorAll('.lx-reveal')][0]; if (b) b.click(); })()");
  await sleep(400);
  const after = await js("document.querySelectorAll('.lx-steps li').length");
  check("worked example reveals step by step", after === before + 1, `${before} -> ${after}`);

  // practice: immediate feedback
  await js("(() => { const o = document.querySelector('.lx-option'); if (o) o.click(); })()");
  await sleep(500);
  const feedback = await js("!!document.querySelector('.lx-feedback')");
  check("practice gives immediate feedback", feedback);
  const verdict = await js("(document.querySelector('.lx-verdict') || {}).textContent || ''");
  check("feedback states correct/not quite", /correct|not quite/i.test(verdict), verdict);
  const nextBtn = await js("!!document.querySelector('.lx-next')");
  check("practice advances to the next question", nextBtn);

  await js("window.scrollTo(0, 0)");
  const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  writeFileSync("/tmp/lesson-v2.png", Buffer.from(data, "base64"));
  console.log("screenshot: /tmp/lesson-v2.png");
} catch (e) {
  failures++;
  out.push("FAIL harness — " + e.message);
} finally {
  console.log(out.join("\n"));
  console.log(failures ? `LESSON V2 FAILED (${failures})` : "LESSON V2 OK");
  process.exitCode = failures ? 1 : 0;
  ws.close(); chrome.kill("SIGKILL");
}
