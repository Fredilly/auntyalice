import assert from "node:assert/strict";
import test from "node:test";
import { reviewChecklist } from "../app/lib/publishing.mjs";
import { createReviewFixture, isReviewPreview, previewReviewer } from "./fixtures/review-fixture.mjs";
import { getPublishedLesson, handleReviewDecision } from "../app/lib/review-flow.mjs";

const id = "sample-fractions";
const revisionId = "sample-fractions-v1";
const approval = Object.fromEntries(Object.keys(reviewChecklist).map(key => [key, true]));
const author = { ...previewReviewer, id: "sample-author" };
const teacher = { ...previewReviewer, role: "teacher" };

function decide(repository, action, actor = previewReviewer, fields = {}) {
  const request = new Request(`https://academy.test/api/staff/review/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, revisionId, ...fields }),
  });
  return handleReviewDecision(request, id, repository, actor);
}

test("the author cannot approve or publish, even when passed directly to the route helper", async () => {
  const repository = createReviewFixture();
  const deniedApproval = await decide(repository, "approve", author, { approval });
  assert.equal(deniedApproval.status, 403);
  assert.match((await deniedApproval.json()).error, /you authored/i);

  assert.equal((await decide(repository, "approve", previewReviewer, { approval })).status, 200);
  const deniedPublication = await decide(repository, "publish", { ...author, role: "admin" });
  assert.equal(deniedPublication.status, 403);
  assert.match((await deniedPublication.json()).error, /you authored/i);
  assert.equal(await getPublishedLesson(repository, id), null);
});

test("approval requires every checklist item to be true", async () => {
  const repository = createReviewFixture();
  for (const key of Object.keys(approval)) {
    const incomplete = { ...approval };
    delete incomplete[key];
    const response = await decide(repository, "approve", previewReviewer, { approval: incomplete });
    assert.equal(response.status, 400, key);
    assert.match((await response.json()).error, /checklist/i);
  }
  assert.equal((await decide(repository, "approve", previewReviewer, {
    approval: { ...approval, rights: "true" },
  })).status, 400);
  assert.equal((await repository.get(previewReviewer, id)).value.state, "submitted");
});

test("publication requires approval and exposes the exact published revision", async () => {
  const repository = createReviewFixture();
  const premature = await decide(repository, "publish");
  assert.equal(premature.status, 409);
  assert.match((await premature.json()).error, /approved revision/i);

  assert.deepEqual(await (await decide(repository, "approve", previewReviewer, { approval })).json(), { state: "approved" });
  assert.equal(await getPublishedLesson(repository, id), null);
  assert.deepEqual(await (await decide(repository, "publish")).json(), { state: "published" });
  const published = await getPublishedLesson(repository, id);
  assert.equal(published.revisionId, revisionId);
  assert.equal(published.title, "Comparing fractions");
  assert.equal(published.questions.length, 2);
  assert.equal(Object.hasOwn(published, "authorId"), false);
});

test("requesting changes requires a non-empty reason, which is trimmed before saving", async () => {
  const repository = createReviewFixture();
  for (const reason of [undefined, "", " \n\t", 5]) {
    const response = await decide(repository, "request_changes", previewReviewer, { reason });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /reason/i);
  }
  const transition = repository.transition;
  repository.transition = (...args) => {
    assert.equal(args[3].reason, "Check the explanation.");
    return transition(...args);
  };
  assert.deepEqual(await (await decide(repository, "request_changes", previewReviewer, {
    reason: "  Check the explanation. ",
  })).json(), { state: "changes_requested" });
  assert.equal(await getPublishedLesson(repository, id), null);
});

test("a teacher or anonymous caller cannot supply reviewer identity in the request body", async () => {
  const repository = createReviewFixture();
  const body = { approval, actor: previewReviewer, actorId: previewReviewer.id, role: "reviewer" };
  assert.equal((await decide(repository, "approve", teacher, body)).status, 403);
  const request = new Request(`https://academy.test/api/staff/review/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "approve", revisionId, ...body }),
  });
  assert.equal((await handleReviewDecision(request, id, repository)).status, 401);
});

test("the public lesson lookup returns no content for an in-review lesson", async () => {
  const repository = createReviewFixture();
  assert.equal(await getPublishedLesson(repository, id), null);
  const stored = (await repository.get(previewReviewer, id)).value;
  const overbroadRepository = {
    getPublished: async () => ({ ok: true, value: { ...stored.draft, state: stored.state } }),
  };
  assert.equal(await getPublishedLesson(overbroadRepository, id), null);
});

test("stale revisions cannot receive decisions", async () => {
  const repository = createReviewFixture();
  const response = await decide(repository, "approve", previewReviewer, { approval, revisionId: "older" });
  assert.equal(response.status, 409);
  assert.equal((await repository.get(previewReviewer, id)).value.state, "submitted");
});

test("preview requires development mode and an explicit opt-in", () => {
  const previous = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    assert.equal(isReviewPreview("1"), false);
    process.env.NODE_ENV = "development";
    assert.equal(isReviewPreview("1"), true);
    assert.equal(isReviewPreview(undefined), false);
    assert.equal(isReviewPreview(["1", "1"]), false);
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});
