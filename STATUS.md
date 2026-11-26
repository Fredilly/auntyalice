# Project handover — 2026-11-25
Repository: https://github.com/Fredilly/auntyalice | Live: https://auntyalice.fredilly.workers.dev/

Merged PRs: #17 Workers verification; #18 ecosystem specifications; #19 public school/academy shell; #20 canonical mathematics pilot; #21 mandatory mobile-first contract (merged 02:43 UTC). PR #19 and #20 CI success verified earlier; #20 run 45519822974. Owner confirmed updated site after Git authorization repair and main commit 11bc8ce; latest production version after #21 not independently verified. Do not confuse merges with live delivery.

Implemented: institutional homepage with gradient placeholder, product launcher, primary/secondary pages, admissions and proposed activities, academy search/five exam pages/subject routes, quadratic equations development sample with original notes, examples, five questions, explanations and local progress/reset; video component exists but footage absent. No operational teacher CMS, reviewed full course, database, payments, custom domains or portal. No official school claims or syllabus coverage confirmed.

Next objective: Design System V2 across public ecosystem, beginning with mobile academy cards and product-local navigation, then institutional school cards and hero refinement, desktop enhancements only after phone review. See COMPONENTS.md and issues #3–#6; do not start teacher dashboard until visual foundation reviewed. Parallel: #1 lockfile and production smoke automation, #2 approved school assets/contact/teacher discovery. Keep issues open until actual acceptance. Then #7–#9 publishing and reviewed pilot, followed by exam depth, offline and portal.

Visual verification URLs: / (school cards and launcher), /learn (search and exam cards), /learn/waec (subject cards), /learn/waec/mathematics (sample lesson link), /learn/lesson/quadratic-equations (examples, five questions, feedback, progress, reset). Current V2 card styles and bottom navigation not yet implemented. Test 360px first, then 320/390 and wider. Blockers: approved video/photos, school facts/contacts, official syllabus/reviewer, lockfile, mobile/browser/accessibility/performance evidence, production version verification. No new Cloudflare services needed for V2.

## 2026-11-25 update
PR #23 merged at 03:49 UTC: mobile-first Academy cards, local navigation and exam/subject directories. Owner requested deferring further UI polish in favor of functionality. Next: issue #7 publishing foundation, then secure staff authentication and test database integration. SQL and policy tests in the publishing PR are not an operational CMS. Browser/performance checks and institutional polish remain outstanding.

## Neon development database verification
PR #24 merged. Neon project Aunty Alice Schools; development branch br-lucky-cloud-be62md6i. Migrations 001 and 002 applied on development only. Capability roles academy_reader and academy_runtime are NOLOGIN, with no direct draft read or publication pointer update privileges. Runtime can execute review transition function; reader cannot. Actual PostgreSQL synthetic test reached deliberate rollback after draft privacy, submit, self-review denial, missing checklist denial, approval, publication and archive checks; verified zero residual staff/lessons. Production untouched. Remaining: secure login roles/secret handoff, authenticated server identity boundary (actor subject must never originate from client), validated draft creation and staff reads, concurrency/stale revision tests, runtime connection and UI. Do not grant credentials to browser or deploy write endpoints yet.

## Progressive disclosure increment
This branch proposes simpler public entrances, a truthful Academy navigation label set and device-local recent lesson resume with removal. No new services or staff authorization changes. Browser, storage-disabled and first-time usability acceptance remains pending until actual evidence is recorded.

## Staff authentication foundation — issue #7

The local `feat/staff-auth-foundation` patch adds the staff login, logout and session lookup handlers. The server resolves identity from a signed staff cookie. Login uses scrypt and a repository interface. The default repository returns an unavailable response through the login handler until an adapter is wired. See [staff authentication integration](docs/STAFF-AUTH.md) for the adapter and session contract.

Local evidence on Node 22.22.1. `npm run typecheck` and `node --test tests/staff-auth.test.mjs tests/publishing.test.mjs` exited 0, with seven staff auth cases and four publishing cases passing. An in-process check of the App Router handlers returned login 503 with the default repository, session lookup 401 without a cookie and 200 with a valid signed cookie, and logout 204 with a cookie deletion header. The sandbox denied the local HTTP listener. This patch remains uncommitted and has no preview or production deployment.

Issue #7 remains open. The next integration step is to wire an isolated development staff adapter and verify runtime login, current staff permissions and revocation before connecting publishing operations.

## Independent lesson review — issue #7, part C

The uncommitted `feat/reviewer-flow` patch adds the reviewer queue, revision decisions, and the anonymous Academy lesson page for published revisions. The queue's **In review** section uses the existing publishing state `submitted`. Approved revisions stay discoverable in **Approved for publication**. The decision route checks the signed staff session, independent authorship and ownership, current revision, and the checklist or change reason.

For local development, open `/staff/review?preview=1`, select **Comparing fractions**, expand the questions and approval checklist, approve, publish, then open the Academy lesson. Every fixture view labels the synthetic data. Restarting the development process resets the in-memory decisions. The regular repository still returns 503 without a database adapter.

Local verification on Node 22.22.1 included typecheck and 19 passing test cases. An in-process Next.js route check returned 403 for teachers, 503 from the unconfigured decision endpoint, and 404 for the synthetic lesson before publication. After publication, the labelled Academy preview returned 200 for an anonymous request and the ordinary URL still returned 404. Chromium and loopback listeners were blocked by the sandbox, so browser interaction, mobile screenshots and transfer measurements remain pending. There is no part C commit, PR, CI run or deployment. GitHub main was at `3b9c854` with part B open in PR #32, so this patch uses the part B interfaces present in the worktree.

Issue #7 remains open. The next integration step is to verify the staff and publication adapters against an isolated development database.
