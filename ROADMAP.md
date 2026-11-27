# Delivery roadmap
Acceptance-based, not time estimates. GitHub issues #1–#16 are canonical work items; see STATUS.md for evidence. Merged does not mean complete. Next: Design System V2 and proper cards/navigation, before additional teaching functionality. Maintain institutional design and academy functionality as two coordinated tracks.

M0 #1: repository, Next/OpenNext, CI and runtime smoke tests implemented; commit verified lockfile/pin dependencies, production smoke automation outstanding. #2: verify school facts/assets/domain/teacher pilot/reviewer. M1 #3: phone-first reusable components, product launcher, cinematic poster-first hero, actual 320/360/390 then 768/1440 tests and performance report; initial shell merged, V2 and footage pending. #4: distinct primary/secondary experiences, trusted hostname routing and canonical URLs; initial pages merged. #5: verified admissions/contact, clubs, approved media and supervised joining; placeholders only. #6: five exam pages, search/subject taxonomy initial implementation; improve cards, local navigation, verified syllabus mappings and honest coverage. Acceptance: no overflow, usable navigation, no fabricated content, accessibility, build/runtime and live release checks.

M2 #7: staff auth, roles, CMS, draft-review-publish, rights/audit and leakage tests. #8: canonical mathematics prototype merged (#20), teacher-reviewed content, syllabus verification, approved video/text alternative, original practice and browser tests still needed. #9: verified clubs/news and book/uniform catalogue, WhatsApp orders first. Acceptance: teacher submits and reviewer publishes without developer; notes/practice usable without video, private drafts inaccessible, academic signoff.

M3 #10 WAEC, #11 JAMB/CBT, #12 NECO/BECE/Common Entrance, #13 offline/revision: official syllabus coverage, reviewed questions/explanations, timed autosave mocks, public offline notes/quizzes, documented rights; optional accounts only after review. M4 #14 portal discovery/pilot, #15 School Ledger and payments: interview stakeholders, highest-value workflow first, roles/audit, import/export, reconciliation and rollback, verified real workflow and permissions. M5 #16 mastery, revision, aggregate competitions, moderated Q&A, partnerships and premium services after demand validation.

Discovery checklist: official name/levels/history, logo, address, contacts/WhatsApp, admissions/fees policy, verified results, subjects/curriculum, staff/clubs/facilities, consent and approved photos/video, domain/webmaster, school YouTube access, teacher equipment/reviewer, current record/payment workflows, book/uniform inventory, School Ledger interface, mobile/data constraints and top stakeholder problems. Record source/date; do not block neutral preview work on missing facts.

## Progressive disclosure acceptance
For public UX changes, check a first-time prospective parent's admissions path and a learner's exam-to-lesson path at 360px without instructions or mandatory onboarding. Check direct subject and lesson entry, returning learner resume, clearing recent history, storage-disabled behavior, keyboard/focus and 320/390px then wider layouts. Record actual evidence; do not mark acceptance complete solely on implementation.

## M2 — functionally accepted (2026-11-26)

Accepted: draft → submit → independent review → publish → anonymous read, verified
against Neon with two separate legitimate identities, including draft isolation
(404 before publication, 200 after).

**Mandatory staff-onboarding gate:** permission *revocation* is unverified and must
be proven before any real staff account is issued. The app role holds SELECT only on
`academy.staff`, so revocation is an owner action:

    UPDATE academy.staff SET active = false WHERE auth_subject = '<staff subject>';

Expected: `/api/staff/me` and `/staff/review` both refuse while the flag is false.
Do not onboard real teachers until this has been demonstrated.

## M2 acceptance evidence — 2026-11-26

Run against the Neon development branch with two **separate legitimate identities**
(teacher `dev:teacher@`, reviewer `dev:reviewer@`), each establishing its own
session through `/api/staff/session`. No forged cookies, no auth bypass, no
weakened checks.

| Step | Result |
|---|---|
| Teacher session established | 200, role `teacher` |
| Create draft | 201, lesson + revision UUIDs |
| Draft isolation before publish | `/learn/lesson/m2-acceptance` → **404** |
| Submit for review | 200, new revision id |
| Reviewer session established | 200, role `reviewer`, distinct staff id |
| Reviewer queue page | 200 |
| Approve (five-item checklist) | 200, `state: approved` |
| Publish | 200, `state: published` |
| Anonymous student read | 200, lesson + practice question rendered |
| Teacher cookie still valid alongside reviewer | 200 |

Outstanding: **permission revocation** is not verified, and cannot be exercised
from this side. The upgrade was attempted and failed with `42501 permission denied
for table staff` — the application role holds SELECT only on `academy.staff`, so it
cannot deactivate anyone. That is correct privilege separation, not a bug: revocation
is an owner-level action.

To close it, the owner runs one statement and I assert the result:

    UPDATE academy.staff SET active = false WHERE auth_subject = 'dev:reviewer@auntyalice.test';

Expected: `/api/staff/me` and `/staff/review` both refuse while the flag is false.

## M3 — Academy depth (in progress)

- [x] One complete subject started: WAEC Mathematics, four published lessons with worked examples, common mistakes and explained questions.
- [x] Past-paper schema, rights guard, ingestion loader and coverage view.
- [ ] **Blocked on owner decision:** licensing. No redistributable source identified for WAEC/JAMB/NECO/BECE/Common Entrance. Until a licence or written permission exists, papers stay LINK_ONLY and no question text is stored. Five years of authentic papers cannot be delivered without this.
- [ ] Diagnostic test, topic-level progress, targeted revision.
- [ ] English expansion after Mathematics.
