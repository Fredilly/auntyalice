# Agent operating instructions
Read README, STATUS and all linked specifications. Inspect main, current PRs, issues and deployment evidence before selecting the next unblocked task. Work autonomously in coherent PRs; avoid routine handoffs or asking the owner to run commands that tools can perform. Preserve existing architecture and working infrastructure. Record deviations and reversible assumptions. Escalate genuine access, spending, sensitive data, irreversible or product decisions only.

Loop: inspect -> plan -> implement -> test -> inspect actual 360px mobile rendering -> refine -> test wider screens -> review -> PR -> verify CI -> after authorized merge, verify production and update issues/status. Base CSS is phone-first; use min-width enhancements. Use official docs for version-sensitive choices, pin dependencies, and commit a verified lockfile. Never claim a screenshot, test or deployment without evidence. Close issues only when all acceptance criteria are satisfied.

No unauthorized merge, production deployment, DNS changes, domain purchase, paid provisioning, secret changes or destructive operations. Existing Git-connected automatic deployment on approved main changes is the intended workflow. No real pupil data, invented school claims, fabricated testimonials, unauthorized media, direct pupil messaging or behavioral tracking. Staff auth and reviewer permissions required before publication; portal deferred to M4. Clearly identify development sample content; do not expose private drafts.

Every completion report: product/issue, PR and commit, exact test results, actual live/preview URL, visual cues to look for, clicks to test, mobile then wider screenshots if available, performance/accessibility findings, deployment status, blockers, assumptions and next task. Distinguish implemented, tested, merged and live. Update STATUS.md and relevant issue with evidence, not promises.

## Canonical documentation workflow
At the start of every development session, fetch README.md, AGENTS.md, STATUS.md and relevant specifications directly from the latest GitHub main in Fredilly/auntyalice. Project attachments are fallback snapshots only; if stale, repository main wins. Record proposed changes in PRs and update canonical docs alongside implementation. Do not require the owner to download/re-upload ZIP files for routine documentation updates. If GitHub is inaccessible, state that limitation and avoid assuming snapshot freshness.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
