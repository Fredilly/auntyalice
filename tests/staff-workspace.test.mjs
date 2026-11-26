import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { extractYouTubeId, validateDraft } from "../app/lib/staff-workspace.mjs";

const id = "Abc_def-123";
const validDraft = {
  title: "Sample lesson",
  slug: "sample-lesson",
  examTracks: ["waec", "jamb"],
  videoUrl: `https://youtu.be/${id}`,
  notes: "# Sample notes\n\nExplain the answer.",
  questions: [{
    id: "sample-question",
    prompt: "What is 1 + 1?",
    options: ["1", "2", "3"],
    answer: 1,
    explanation: "One plus one equals two.",
  }],
};

test("extracts an 11-character ID from watch, Shorts and youtu.be URLs", () => {
  for (const url of [
    `https://www.youtube.com/watch?v=${id}`,
    `https://m.youtube.com/watch?v=${id}&t=30s`,
    `https://youtube.com/shorts/${id}?si=shareToken`,
    `https://youtu.be/${id}?si=shareToken`,
  ]) assert.equal(extractYouTubeId(url), id, url);
});

test("rejects non-YouTube hosts, redirect parameters and malformed IDs", () => {
  for (const url of [
    `https://example.com/watch?v=${id}`,
    `https://www.youtube.com.example.com/watch?v=${id}`,
    `https://www.youtube.com@example.com/watch?v=${id}`,
    `https://example.com@www.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}?url=https%3A%2F%2Fexample.com`,
    `https://youtu.be/${id}?si=https%3A%2F%2Fexample.com`,
    `https://www.youtube.com/watch?v=${id}&next=https://example.com`,
    `https://www.youtube.com/redirect?v=${id}&q=https://example.com`,
    `https://www.youtube.com/watch?v=${id}&v=12345678901`,
    `http://youtu.be/${id}`,
    `https://youtu.be/${id}/another-path`,
    "https://youtu.be/tooshort",
    "https://youtu.be/abcdefghijkL",
    "https://www.youtube.com/watch?v=Abc_def-12%0A",
    "https://www.youtube.com/watch?v=Abc_def*123",
  ]) assert.equal(extractYouTubeId(url), null, url);
});

test("normalizes a valid draft and allows a lesson without a video", () => {
  const draft = { ...validDraft, title: "  Sample lesson  " };
  const { videoUrl, ...fields } = validDraft;
  assert.deepEqual(validateDraft(draft), { ok: true, draft: { ...fields, videoId: id } });
  assert.deepEqual(validateDraft({ ...draft, videoUrl: "" }), {
    ok: true, draft: { ...fields, videoId: null },
  });
});

test("returns field-specific messages for missing title, notes and questions", () => {
  assert.deepEqual(validateDraft({ ...validDraft, title: " ", notes: "", questions: [] }), {
    ok: false,
    errors: {
      title: "Enter a lesson title.",
      notes: "Enter written lesson notes.",
      questions: "Add at least one practice question.",
    },
  });
});

test("requires exactly one valid correct-answer index and a written explanation", () => {
  for (const answer of [undefined, null, -1, 3, [0, 1], "1", 1.5]) {
    const result = validateDraft({
      ...validDraft,
      questions: [{ ...validDraft.questions[0], answer, explanation: " " }],
    });
    assert.deepEqual(result, {
      ok: false,
      errors: {
        "questions.0.answer": "Choose exactly one correct answer for question 1.",
        "questions.0.explanation": "Question 1 needs an explanation.",
      },
    });
  }
  assert.equal(validateDraft({
    ...validDraft, questions: [{ ...validDraft.questions[0], answer: 0 }],
  }).ok, true);
});

test("validates known exam tracks, the slug and distinct answer options", () => {
  const result = validateDraft({
    ...validDraft,
    slug: "Invalid Slug",
    examTracks: ["waec", "unknown"],
    questions: [{ ...validDraft.questions[0], options: ["1", "1", "3"] }],
  });
  assert.equal(result.ok, false);
  assert.deepEqual(Object.keys(result.errors), ["slug", "examTracks", "questions.0.options"]);
});

test("lesson route modules import and call the session actor resolver", () => {
  for (const path of ["[id]", "video-preview"]) {
    const source = readFileSync(new URL(`../app/api/staff/lessons/${path}/route.ts`, import.meta.url), "utf8");
    assert.match(source, /import\s*\{\s*readSessionActor\s*\}\s*from\s*["'][^"']+\/staff-auth\.mjs["']/);
    assert.match(source, /readSessionActor\(request\)/);
  }
});
