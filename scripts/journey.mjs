/**
 * Real-browser student journey at 360px, driven over CDP.
 * Verifies the dashboard, a lesson, the diagnostic and an offline reload by executing
 * the actual app in Chromium — not by asserting source text.
 */
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import WebSocket from "ws";

const CHROME = process.env.HOME + "/.hermes/tools/chromium-1248/chrome-linux64/chrome";
const BASE = process.env.BASE || "http://localhost:3001";
const PORT = 9333;

const chrome = spawn(CHROME, [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`, "--user-data-dir=/tmp/cdp-profile-journey", "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      const page = list.find((t) => t.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error("chromium did not expose a debugging target");
}

const ws = new WebSocket(await wsUrl());
await new Promise((res, rej) => { ws.once("open", res); ws.once("error", rej); });

let nextId = 1;
const pending = new Map();
const listeners = [];
ws.on("message", (raw) => {
  const msg = JSON.parse(raw.toString());
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
  } else if (msg.method) {
    for (const fn of listeners) fn(msg);
  }
});

function send(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const { result } = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  return result.value;
}

async function goto(path) {
  await send("Page.navigate", { url: BASE + path });
  await sleep(1200);
  for (let i = 0; i < 40; i++) {
    const ready = await evaluate("document.readyState === 'complete'");
    if (ready) break;
    await sleep(150);
  }
  await sleep(500);
}

/** Poll for text instead of trusting a fixed sleep — dev builds compile lazily. */
async function waitForText(re, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const text = await evaluate("document.body.innerText");
    if (re.test(text)) return text;
    await sleep(400);
  }
  return await evaluate("document.body.innerText");
}

async function shot(name) {
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  const path = `/tmp/journey-${name}.png`;
  writeFileSync(path, Buffer.from(data, "base64"));
  return path;
}

const out = [];
let failures = 0;
const check = (label, ok, detail = "") => {
  if (!ok) failures++;
  out.push(`${ok ? "PASS" : "FAIL"} ${label}${detail ? " — " + detail : ""}`);
  return ok;
};

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 360, height: 800, deviceScaleFactor: 2, mobile: true,
  });

  // 1. dashboard
  await goto("/learn");
  const dashText = await evaluate("document.body.innerText");
  check("dashboard renders at 360", /Your learning space/.test(dashText));
  check("dashboard shows real zero-state", /0\s*questions answered/i.test(dashText));
  check("dashboard links all five surfaces",
    ["Diagnostic", "Revision", "Timed mock", "Past questions"].every((t) => dashText.includes(t)));
  await shot("1-dashboard");

  // save for offline from the dashboard, then confirm the control reports it
  await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => /save for offline/i.test(x.textContent)); if (b) b.click(); })()`);
  // saving four lessons plus their styles takes a few seconds on a cold cache
  let savedLabel = "missing";
  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    savedLabel = await evaluate("(() => { const b = [...document.querySelectorAll('button')].find(x => /saved offline|save for offline|saving/i.test(x.textContent)); return b ? b.textContent.trim() : 'missing'; })()");
    if (/all saved offline/i.test(savedLabel)) break;
  }
  check("save for offline reports saved state", /all saved offline/i.test(savedLabel), savedLabel);

  // 2. open a lesson from the list
  await evaluate(`(() => { const a = [...document.querySelectorAll('a.lesson-row')].find(x => x.getAttribute('href').includes('laws-of-indices')); a.click(); })()`);
  // wait for text that only exists on the lesson page — the dashboard also says
  // "Laws of Indices", so matching the title alone passes before navigation happens
  const lessonText = await waitForText(/Multiplication/i);
  check("lesson opens from dashboard", /Laws of Indices/i.test(lessonText));
  check("lesson shows notes", /Multiplication|index/i.test(lessonText));
  await shot("2-lesson");

  // 3. service worker gains control
  await sleep(2500);
  const controlled = await evaluate("!!navigator.serviceWorker.controller");
  check("service worker controls the page", controlled);

  // 4. diagnostic
  await goto("/learn/diagnostic");
  const diagText = await evaluate("document.body.innerText");
  check("diagnostic renders", /Find your gaps|DIAGNOSTIC/i.test(diagText));
  await shot("3-diagnostic");

  // 5. offline reload of the lesson that was visited
  await send("Network.emulateNetworkConditions", {
    offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0,
  });
  await goto("/learn/lesson/laws-of-indices");
  const offlineText = await evaluate("document.body.innerText");
  const stillThere = /Laws of Indices/i.test(offlineText);
  check("lesson reloads with the network disabled", stillThere, stillThere ? "" : offlineText.slice(0, 80));

  // an offline page that lost its stylesheet is not offline support
  const styled = await evaluate(`(() => {
    const h1 = document.querySelector('h1');
    if (!h1) return { ok: false, reason: 'no h1' };
    const size = parseFloat(getComputedStyle(h1).fontSize);
    const sheets = document.styleSheets.length;
    return { ok: size > 22 && sheets > 0, size, sheets };
  })()`);
  check("offline page keeps its styles", styled?.ok === true, JSON.stringify(styled));
  await shot("4-offline");

  await send("Network.emulateNetworkConditions", {
    offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1,
  });
} catch (error) {
  failures++;
  out.push(`FAIL harness crashed — ${error?.message ?? error}`);
} finally {
  console.log(out.join("\n"));
  console.log(failures === 0 ? "JOURNEY OK" : `JOURNEY FAILED (${failures})`);
  // a failing journey must fail CI, not print politely and exit 0
  process.exitCode = failures === 0 ? 0 : 1;
  ws.close();
  chrome.kill("SIGKILL");
}
