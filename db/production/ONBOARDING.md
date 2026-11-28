# Staff onboarding — teacher and reviewer

Publication is blocked on two identities. Everything else in the Academy is ready, so
this is the shortest possible path from "we have two people" to "content is live".

## Who

| Person | Role | What they can do | What they cannot |
|---|---|---|---|
| **Mr. Emenike Oliver** | `teacher` | create lessons, save drafts, submit for review | approve or publish their own work |
| **Mr. Jonah** | `reviewer` | approve or request changes, publish approved lessons | edit another author's draft |

The database enforces both limits: `advance_review()` refuses an approval where the
author and the reviewer are the same staff row. This is not a UI convention.

## What is still missing

**An email address for each of them.** That address becomes `auth_subject` — the
identity the login resolves against. Nothing else is needed from them.

Do not invent addresses. An account created against a guessed address is an account
that cannot log in and that nobody can audit.

## The command (owner, once the addresses exist)

```bash
psql "$PROD_OWNER_URL" -v ON_ERROR_STOP=1 \
  -v teacher_subject="'oliver@<school-domain>'" \
  -v reviewer_subject="'jonah@<school-domain>'" \
  -f db/production/20_staff.sql
```

The script refuses `dev:` / `test:` / `@auntyalice.test` subjects and refuses
`teacher_subject = reviewer_subject`, so a mistyped run fails instead of creating a
review path that approves itself.

**Verify:**

```sql
select role, auth_subject, active from academy.staff order by role;
-- exactly one teacher, one reviewer, both active
```

## What they will do, in order

1. **Mr. Emenike** opens `/staff/login` and signs in.
2. He reviews one draft — `quadratic-equations` is the best first lesson: it has
   objectives, two worked examples, three common mistakes and five explained questions.
3. He submits it. **No approval is possible from his account**; that is the control
   working, not a bug.
4. **Mr. Jonah** opens `/staff/review`, works the five-item checklist (accuracy, answer
   keys, rights, safeguarding, accessibility), and approves or requests changes.
5. On approval he publishes; the lesson appears at `/learn/lesson/quadratic-equations`.

## Content already prepared and waiting

Six reviewed lessons exist in development, published through the real review flow:

| Lesson | Questions |
|---|---|
| Laws of Indices | 5 |
| Quadratic Equations | 5 |
| Simple Interest | 5 |
| Percentages, Profit and Loss | 5 |
| Simultaneous Equations | 5 |
| Mean, Median and Mode | 5 |

They reach production via `publish-production-content.mjs --stage` (author submits) then
`--publish` (a genuine reviewer approval must already exist). The script refuses to
approve on anyone's behalf.

## Why this order

Staff onboarding blocks *publication*, not curriculum. The six lessons above, the
MathML renderer, the diagnostic, revision drills, timed mocks and offline caching are
all finished and tested. The only thing standing between them and a student is two
email addresses.
