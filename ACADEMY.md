# Alice Academy
Free national learning product, visibly powered by Aunty Alice Schools. No compulsory registration. Exam or class -> subject -> topic -> canonical lesson -> practice -> explanation -> next step. All five tracks: JAMB/UTME, WAEC/WASSCE, NECO, BECE, Common Entrance. Map NERDC curriculum where applicable and official exam-body syllabus editions/objectives independently; never imply affiliation. One canonical lesson ID with many-to-many mappings, not copies per exam.

Current prototype: /learn/lesson/quadratic-equations, linked from JAMB/WAEC/NECO mathematics preview pages. Original notes, two worked examples, five questions, immediate explanations, versioned local anonymous answer indices and reset. Development sample, not academically approved or syllabus-verified; teacher video absent. No real learner data collected. Local progress is not a verified assessment record.

Lesson record: stable slug, title, subject, grade, topic, objectives, versioned syllabus references, teacher, reviewer, state, video ID/duration, transcript/notes, worked examples, original questions, explanations, accessibility/rights metadata, revision timestamps. Draft -> submitted -> changes requested/approved -> published -> archived; auditable revisions and private unapproved material. Explicitly labelled public development samples are separate from the eventual private CMS drafts.

Teacher workflow: 5–10 minute focused recording (aspire to 1–2/week), phone/whiteboard/slides; school-owned YouTube with delegated access, no confidential footage (unlisted is not private). Validate video ID server-side, no arbitrary embeds, click-to-load, accurate audience designation, text alternative, rights/consent and safeguarding checks. Reviewer checks accuracy, accessibility, classification and answer keys before publication. No live CMS yet; see docs/PUBLISHING.md in repo.

Original practice, objective/difficulty tags and worked explanations. Past papers only with documented permission/lawful basis; link official sources otherwise. Later timed mocks, autosave/resume, versioned scoring, offline public bundles, optional accounts after safeguarding review. No official score predictions, public individual leaderboards or unsupervised messaging; moderated Q&A and aggregate opt-in challenges later. Certificates not accredited qualifications. Acceptance: approved objective, notes/video alternative, examples, reviewed questions, teacher and supervised learner pilot, no unpublished leakage.

## Incremental learning experience
Default journey: choose exam, subject, lesson, then notes, examples and practice. Search and direct subject/lesson entry remain available. Present a clear practice jump without hiding notes, and retain explanations and local answer state. Offer resume only after an actual lesson visit, with clear local-history removal and no identity. No forced onboarding, account or arbitrary unlocking; preview notices must remain visible.

## Past examinations (M3, 2026-11-26)

**Rights position, recorded before any ingestion.** WAEC past papers are not freely
redistributable: Ghana's Deputy Minister of Education stated publicly that a single
publisher holds reproduction rights. Nigerian JAMB/NECO material is likewise
copyright of the examining body; the many PDF "repositories" online are unlicensed
reposts, not sources.

Therefore the Academy ships three distinct kinds of question and never mixes them:

| Kind | Where it lives | Labelling |
|---|---|---|
| Original practice questions | Inside a lesson (`questions`) | Never called past questions |
| Linked past papers | `academy.past_papers` with `rights_status = LINK_ONLY` | Metadata + outbound link only |
| Licensed past questions | `academy.past_questions` with `VERIFIED_REDISTRIBUTABLE` | Attributed to body, year, paper, question number |

A database trigger (`academy.past_question_guard`) refuses to store question text
on any paper whose rights are not verified, and refuses to mark a question CHECKED
without a step-by-step explanation. `scripts/ingest-past-papers.mjs` will not
upgrade a rights status, invent a question or guess an answer key.

Coverage is tracked by `academy.past_coverage` (body × subject × year, with checked
/ unverified / disputed / mapped counts) so "five years of past papers" is a number
we can read, not a claim we make.

### Student modes

1. **Practice by topic** — questions filtered by `topic` / `syllabus_ref`.
2. **Complete past paper** — all questions for one paper, in order.
3. **Timed mock** — a paper under time pressure, answers withheld until submission.

Modes 2 and 3 depend on redistributable text; where only LINK_ONLY exists, the
student is linked out to the official source instead.
