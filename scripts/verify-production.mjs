/**
 * Production endpoint verification. Fails loudly and exits non-zero.
 *
 * The previous gate only checked that /learn returned 200, which is true even when the
 * Worker has no database and serves an empty shell. This checks the things that only
 * succeed when production is actually wired up:
 *
 *   1. /learn lists at least one lesson by name
 *   2. a known lesson returns 200 AND contains taught content
 *   3. a non-existent lesson is a genuine 404, not the "unavailable" service page
 *   4. the service page is absent
 */
const BASE = process.env.PROD_BASE || "https://auntyalice.fredilly.workers.dev";
const LESSON = process.env.LESSON_SLUG || "laws-of-indices";

let failures = 0;
const check = (label, ok, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? " — " + detail : ""}`);
};

const get = async (path) => {
  const res = await fetch(BASE + path, { redirect: "manual" });
  return { status: res.status, body: await res.text() };
};

try {
  const home = await get("/learn");
  check("/learn returns 200", home.status === 200, String(home.status));
  check("/learn lists at least one lesson", /laws of indices|percentages|simultaneous/i.test(home.body));
  check("/learn is not an empty shell", !/0\s*lessons started/.test(home.body) || /laws of indices/i.test(home.body));

  const lesson = await get(`/learn/lesson/${LESSON}`);
  check(`${LESSON} returns 200`, lesson.status === 200, String(lesson.status));
  check(`${LESSON} contains taught content`,
    /index|indices|multipl|superscript|power/i.test(lesson.body));
  check(`${LESSON} is not the unavailable page`,
    !/temporarily unavailable/i.test(lesson.body));

  const missing = await get("/learn/lesson/this-lesson-does-not-exist-9f2");
  check("a genuinely missing lesson is 404", missing.status === 404, String(missing.status));
} catch (error) {
  failures++;
  console.log("FAIL verifier crashed —", error?.message ?? error);
}

console.log(failures ? `PRODUCTION VERIFICATION FAILED (${failures})` : "PRODUCTION VERIFIED");
process.exitCode = failures ? 1 : 0;
