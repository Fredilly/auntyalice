// Pure domain policy; not an authentication or database boundary.
const states = {
  draft: {submitted: "submitted"},
  submitted: {changes_requested: "changes_requested", approved: "approved"},
  approved: {published: "published"},
  published: {archived: "archived"},
};
const text = v => typeof v === "string" && v.trim().length > 0;
export function validateLessonContent(c) {
  const errors = [];
  if (!c || typeof c !== "object" || Array.isArray(c)) return ["Lesson content is required"];
  for (const k of ["title","subject","topic","objective"]) if (!text(c[k])) errors.push(k+" is required");
  if (!Array.isArray(c.notes) || !c.notes.length || !c.notes.every(text)) errors.push("Written notes are required");
  if (c.videoId != null && !/^[A-Za-z0-9_-]{11}$/.test(typeof c.videoId === "string" ? c.videoId : "")) errors.push("Invalid YouTube video ID");
  if (!Array.isArray(c.examples) || !c.examples.length || !c.examples.every(e=>e && text(e.prompt) && Array.isArray(e.steps) && e.steps.length && e.steps.every(text))) errors.push("Worked examples are required");
  if (!Array.isArray(c.questions) || !c.questions.length) errors.push("Practice questions are required");
  else {
    const ids = new Set();
    for (const q of c.questions) {
      if (!q || !text(q.id) || ids.has(q.id) || !text(q.prompt) || !Array.isArray(q.options) || q.options.length < 2 || !q.options.every(text) || new Set(q.options.map(s=>s.trim())).size !== q.options.length || !Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length || !text(q.explanation)) errors.push("Invalid or duplicate practice question");
      if(q && text(q.id)) ids.add(q.id);
    }
  }
  return errors;
}
export function transition({state, action, actor, ownerId, authorId, approval}) {
  if (!actor?.active || !text(actor.id)) throw new Error("Active staff required");
  if (!Object.hasOwn(states,state) || !Object.hasOwn(states[state],action)) throw new Error("Invalid transition");
  const reviewer = actor.role === "reviewer" || actor.role === "admin";
  if (action === "submitted") {
    if (actor.role !== "teacher" || actor.id !== ownerId || actor.id !== authorId) throw new Error("Owner teacher required");
  } else {
    if (!reviewer || actor.id === authorId || actor.id === ownerId) throw new Error("Independent reviewer required");
    if (action === "approved" && !["accuracy","answerKeys","rights","safeguarding","accessibility"].every(k=>approval?.[k]===true)) throw new Error("Complete review checklist required");
  }
  return states[state][action];
}
