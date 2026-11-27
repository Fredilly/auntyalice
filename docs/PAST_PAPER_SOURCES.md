# Past-examination sources, 2022–2026

Catalogue of legitimate places a student can reach authentic material, and our
rights position for each. Status here is the source of truth for
`academy.past_papers.rights_status`.

**Nothing in this file has been ingested.** Every entry is `LINK_ONLY` until a
written licence says otherwise. Path: metadata + outbound link, never hosted text.

## Official examining-body platforms (linkable, authoritative)

| Body | Resource | URL | What it is | Rights |
|---|---|---|---|---|
| WAEC | e-Learning (subjects) | waeconline.org.ng/e-learning/ | WAEC's own student resources: standards, syllabus guidance, worked material per subject | Official; link only |
| WAEC | Mathematics landing | waeconline.org.ng/E-Learning/Mathematics/mathsmain.html | Subject-specific entry point | Official; link only |
| JAMB | IBASS | ibass.jamb.gov.ng | Integrated Brochure & Syllabus System — official syllabi and CBT guidance | Official; link only |
| JAMB | IBASS CBT | ibass.jamb.gov.ng/cbt | Official CBT information and practice surface | Official; link only |
| NECO | ɪɡzam practice | practice-exam.neco.gov.ng | NECO's own practice-examination platform (registration-number login) | Official; link only |
| NECO | Main site | neco.gov.ng | Syllabus, timetables, announcements | Official; link only |

Common Entrance and BECE have no equivalent public platform; their syllabi are
published through state ministries and NERDC. To be researched before a record is
created — do not create placeholder rows.

## Openly licensed content usable for building practice

| Source | URL | Licence | Usable how |
|---|---|---|---|
| Siyavula open textbooks | siyavula.com/read | Branded editions CC BY-ND 4.0; unbranded releases exist under CC BY | CC BY versions may be adapted with attribution; ND editions may be copied but not modified. Mathematics Grades 4–12, mapped to CAPS, close to WAEC content |
| Kolibri / Learning Equality | learningequality.org/kolibri | Content-dependent; the platform is open source, bundled channels carry their own licences | Curriculum-alignment tooling and some openly licensed channels; check each channel licence before reuse |

Rule: an open licence lets us build **original practice informed by** the source
with attribution. It never lets us relabel adapted material as an authentic past
paper, and CC BY-ND forbids modification outright.

## Third-party question banks — do not assume, verify

`smartest.ng`, `cbtpastquestions.com`, `passverse.com.ng` and similar offer timed
CBT practice over large paper archives. They are **not** assumed licensed: several
display no publisher agreement, and their archives mirror the same text as the
unofficial PDF reposts. Two are worth an approach because they may hold or be able
to obtain rights:

- SmarTest — claims the last five years of every objective paper.
- CBT Past Questions — timed JAMB/WAEC CBT interface.

Either could become an authorised integration (API or licence). That is a commercial
conversation, not a scraping decision, and requires owner authority.

## Verification before any ingestion

1. A written licence or an explicit open licence naming redistribution.
2. Record `source_name`, `source_url`, `checked_at`, `licence_note`.
3. Only then set `rights_status = VERIFIED_REDISTRIBUTABLE`.
4. Answers need `answer_source`; our explanation is separate and attributed to us.
5. Anything discovered but unlicensed enters as `UNVERIFIED` and stays quarantined.

## Coverage targets (to be met with licensed or original material)

Five years per body × subject × paper:

- WAEC Mathematics 2022–2026; English Language 2022–2026
- JAMB Mathematics and Use of English 2022–2026
- NECO Mathematics 2022–2026
- BECE Mathematics 2022–2026
- Common Entrance Mathematics 2022–2026

Until licensing lands, this table is empty by design and the coverage view will
report zero. An empty table is honest; a full one built from stolen PDFs is not.
