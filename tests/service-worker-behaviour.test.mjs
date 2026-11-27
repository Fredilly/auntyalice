import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

/**
 * Runs public/sw.js in a sandbox with stubbed Cache Storage and fetch, so the offline
 * path is actually executed rather than asserted from source text.
 */
function bootWorker() {
  const stores = new Map();          // cacheName -> Map(url -> Response clone)
  const handlers = {};
  let online = true;
  const fetched = [];

  const cacheFor = (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name);
    return {
      addAll: async (urls) => { for (const u of urls) store.set(u, new Response("shell", { status: 200 })); },
      put: async (req, res) => { store.set(typeof req === "string" ? req : req.url, res); },
      keys: async () => [...store.keys()].map((u) => new Request(u)),
      match: async (req) => store.get(typeof req === "string" ? req : req.url),
    };
  };

  const caches = {
    open: async (name) => cacheFor(name),
    keys: async () => [...stores.keys()],
    delete: async (name) => stores.delete(name),
    match: async (req, opts) => {
      const url = typeof req === "string" ? req : req.url;
      const names = opts?.cacheName ? [opts.cacheName] : [...stores.keys()];
      for (const n of names) {
        const hit = stores.get(n)?.get(url);
        if (hit) return hit;
      }
      return undefined;
    },
  };

  const self = {
    location: { origin: "https://auntyalice.test" },
    addEventListener: (type, fn) => { handlers[type] = fn; },
    skipWaiting: () => {},
    clients: { claim: () => {} },
  };

  const sandbox = {
    self, caches, console,
    Response, Request, Headers, URL,
    fetch: async (req) => {
      fetched.push(typeof req === "string" ? req : req.url);
      if (!online) throw new Error("network down");
      const url = typeof req === "string" ? req : req.url;
      // real same-origin responses arrive with type "basic"; Node's do not
      const basic = (r) => { Object.defineProperty(r, "type", { value: "basic", configurable: true }); return r; };
      if (url.includes("/api/")) return basic(new Response("api", { status: 200 }));
      if (url.includes("broken")) return basic(new Response("nope", { status: 500 }));
      return basic(new Response("page:" + new URL(url).pathname, { status: 200 }));
    },
    Promise, setTimeout, clearTimeout,
  };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync("public/sw.js", "utf8"), sandbox);

  const dispatch = async (request) => {
    let result;
    const event = { request, respondWith: (p) => { result = p; } };
    handlers.fetch(event);
    return result ? await result : undefined;
  };

  return { handlers, stores, dispatch, setOnline: (v) => { online = v; }, fetched };
}

// Request(mode: "navigate") is not constructible in Node; force it for the sandbox.
function req(path, mode = "navigate") {
  const r = new Request("https://auntyalice.test" + path);
  Object.defineProperty(r, "mode", { value: mode, configurable: true });
  return r;
}

test("a lesson page is cached when online and served when the network dies", async () => {
  const w = bootWorker();
  const page = req("/learn/lesson/laws-of-indices");

  const online = await w.dispatch(page);
  assert.equal(await online.text(), "page:/learn/lesson/laws-of-indices");

  w.setOnline(false);
  const offline = await w.dispatch(req("/learn/lesson/laws-of-indices"));
  assert.ok(offline, "offline navigation must be answered from cache");
  assert.equal(await offline.text(), "page:/learn/lesson/laws-of-indices");
});

test("an uncached page offline falls back to the offline shell", async () => {
  const w = bootWorker();
  w.handlers.install({ waitUntil: (p) => p });
  await new Promise((r) => setTimeout(r, 10));
  w.setOnline(false);
  const res = await w.dispatch(req("/learn/lesson/never-opened"));
  assert.ok(res);
  assert.match(await res.text(), /shell|Offline/);
});

test("a 500 response is never cached", async () => {
  const w = bootWorker();
  await w.dispatch(req("/learn/broken"));
  const cached = await cachesMatch(w, "/learn/broken");
  assert.equal(cached, undefined);
});

test("API and staff routes are not intercepted at all", async () => {
  const w = bootWorker();
  assert.equal(await w.dispatch(req("/api/staff/me")), undefined);
  assert.equal(await w.dispatch(req("/staff/review")), undefined);
});

test("RSC payloads are never cached", async () => {
  const w = bootWorker();
  const rsc = new Request("https://auntyalice.test/learn?_rsc=abc", { mode: "cors" });
  assert.equal(await w.dispatch(rsc), undefined);
});

test("only alice- caches are cleaned up on activate", async () => {
  const w = bootWorker();
  w.stores.set("someone-elses-cache", new Map());
  w.stores.set("alice-v1-pages", new Map());
  let done;
  w.handlers.activate({ waitUntil: (p) => { done = p; } });
  await done;
  assert.equal(w.stores.has("alice-v1-pages"), false, "stale alice cache should go");
  assert.equal(w.stores.has("someone-elses-cache"), true, "foreign cache must survive");
});

async function cachesMatch(w, url) {
  for (const store of w.stores.values()) if (store.has("https://auntyalice.test" + url)) return store.get("https://auntyalice.test" + url);
  return undefined;
}
