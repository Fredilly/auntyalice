const youtubeHosts = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);
const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;
export const examTracks = Object.freeze(["jamb", "waec", "neco", "bece", "common-entrance"]);
export const workspaceUnavailable = "The teacher workspace is not configured yet.";

export function extractYouTubeId(value) {
  if (typeof value !== "string" || !/^https:\/\//i.test(value.trim())) return null;
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash) {
    return null;
  }

  // Allow only the share/tracking and timestamp parameters used by YouTube.
  const allowedParams = ["si", "t", "feature"];
  let id;
  if (youtubeHosts.has(url.hostname) && url.pathname === "/watch") {
    allowedParams.push("v");
    id = url.searchParams.get("v");
  } else if (youtubeHosts.has(url.hostname)) {
    id = /^\/shorts\/([^/]+)\/?$/.exec(url.pathname)?.[1];
  } else if (url.hostname === "youtu.be") {
    id = /^\/([^/]+)\/?$/.exec(url.pathname)?.[1];
  }
  const keys = [...url.searchParams.keys()];
  if (new Set(keys).size !== keys.length || keys.some(key => !allowedParams.includes(key))) {
    return null;
  }
  for (const [key, parameter] of url.searchParams) {
    if (key !== "v" && !/^[A-Za-z0-9_-]+$/.test(parameter)) return null;
  }
  return typeof id === "string" && id.length === 11 && videoIdPattern.test(id) ? id : null;
}

const cleanText = value => typeof value === "string" ? value.trim() : "";

export function validateDraft(input) {
  const title = cleanText(input?.title);
  const slug = cleanText(input?.slug);
  const notes = cleanText(input?.notes);
  const tracks = input?.examTracks;
  const videoUrl = cleanText(input?.videoUrl);
  const videoId = extractYouTubeId(videoUrl);
  const errors = {};
  const field = (name, message) => { errors[name] = message; };

  if (!title) field("title", "Enter a lesson title.");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    field("slug", "Enter a slug using lowercase letters, numbers and single hyphens.");
  }
  if (!Array.isArray(tracks) || !tracks.every(track => examTracks.includes(track)) ||
      new Set(tracks).size !== tracks.length) {
    field("examTracks", "Choose exam tracks from the list.");
  }
  if ((videoUrl && !videoId) || (input?.videoUrl != null && typeof input.videoUrl !== "string")) {
    field("videoUrl", "Enter a valid HTTPS YouTube watch, Shorts or share URL.");
  }
  if (!notes) field("notes", "Enter written lesson notes.");

  const questions = [];
  const ids = new Set();
  if (!Array.isArray(input?.questions) || input.questions.length === 0) {
    field("questions", "Add at least one practice question.");
  } else {
    for (const [index, question] of input.questions.entries()) {
      const path = `questions.${index}`;
      const label = `Question ${index + 1}`;
      const id = cleanText(question?.id);
      const prompt = cleanText(question?.prompt);
      const explanation = cleanText(question?.explanation);
      const options = Array.isArray(question?.options) ? question.options.map(cleanText) : [];
      const answer = question?.answer;
      if (!id || ids.has(id)) field(path, `${label} needs a unique ID.`);
      ids.add(id);
      if (!prompt) field(`${path}.prompt`, `${label} needs a prompt.`);
      if (options.length < 2 || !options.every(Boolean) || new Set(options).size !== options.length) {
        field(`${path}.options`, `${label} needs at least two distinct, non-empty options.`);
      }
      if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) {
        field(`${path}.answer`, `Choose exactly one correct answer for question ${index + 1}.`);
      }
      if (!explanation) field(`${path}.explanation`, `${label} needs an explanation.`);
      questions.push({ id, prompt, options, answer, explanation });
    }
  }

  return Object.keys(errors).length
    ? { ok: false, errors }
    : { ok: true, draft: { title, slug, examTracks: tracks, videoId, notes, questions } };
}

export function validateSyllabusMappings(input, tracks) {
  if (!Array.isArray(input)) return null;
  const mappings = [];
  const seen = new Set();
  for (const entry of input) {
    const exam = entry?.exam;
    const syllabusEdition = cleanText(entry?.syllabusEdition);
    const objectiveReference = cleanText(entry?.objectiveReference);
    const sourceUrl = cleanText(entry?.sourceUrl);
    const url = URL.canParse(sourceUrl) ? new URL(sourceUrl) : null;
    const key = JSON.stringify([exam, syllabusEdition, objectiveReference]);
    if (!tracks.includes(exam) || !syllabusEdition || !objectiveReference ||
        !sourceUrl.startsWith("https://") || !url || url.username || url.password || seen.has(key)) {
      return null;
    }
    seen.add(key);
    mappings.push({ exam, syllabusEdition, objectiveReference, sourceUrl });
  }
  return mappings;
}
