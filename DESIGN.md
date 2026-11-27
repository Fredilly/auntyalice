# Design constitution
Mandatory mobile-first, not desktop-first responsive. Design and implement at 360px first; verify 320/390px, then enhance at 768/1440px with min-width breakpoints. No miniature desktop layouts, horizontal overflow or unnecessary typing. Google-inspired predictability and Material principles, not a visual clone. Premium editorial institutional experience; playful primary; mature secondary; utility-first academy; task-first portal later. Brand orange #F26B0F, ink #141110, ivory #FAF8F3, white #FFFFFF, cool accent #175B77. Muted semantic supporting colors; use dark text on orange where needed. The approved design direction for the primary mark is an orange square or softly rounded box (#F26B0F) containing a white capital A (#FFFFFF), centered, without punctuation, gradients or lowercase lettering. Use consistently in header, launcher, favicon and product identities; institutional approval of final artwork remains pending.

Shared header and accessible nine-dot product launcher: label tiles, indicate current product, support keyboard, Escape, focus restoration, and compact phone popover/sheet. Show only working destinations. Product-local academy navigation uses labelled thumb-accessible bottom destinations on phones, desktop rail at wider widths, contextual breadcrumbs and prominent search. Preserve safe-area insets and avoid obscuring focus/content. Ordinary links remain available. No fake progress or dead destinations.

Root sitemap: home, about, primary, secondary, admissions, school life, news, shop, contact, privacy, safeguarding. School sections: academics, staff, calendar, clubs, admissions, resources. Academy: exam, subject, topic, canonical lesson, practice, search, library, downloads, later CBT/progress. Portal later: dashboard, children/classes, attendance, assignments, results, payments, orders/settings.

Mobile homepage: header, cinematic hero, clear admissions/academy actions, school choice cards, verified values/evidence, school life editorial grid, academy preview, admissions/contact/footer. Approved muted compressed background video is permitted (supersedes original ban); poster-first with reduced-motion, data-saving and slow-network fallback, pause control, no autoplay audio or blocking media. No carousel or heavy animation. No lesson iframe before explicit interaction. Authentic approved school imagery only; clearly label placeholders. Academy: search, exam cards, subject library, featured lesson, text-first study, examples, questions, explanations and next step.

Target WCAG 2.2 AA, semantic HTML, visible focus, accessible contrast, preferred 44px targets. Aim <=200 KiB compressed initial transfer including HTML/CSS/JS/above-fold media, excluding deferred video; measure cold cache, report exceptions, test low-end Android/slow network. No icon fonts. Public-only offline resources after cache strategy verified. See COMPONENTS.md for card patterns. Actual mobile screenshots and interaction evidence precede desktop review and release.

## Shared visual language
Source Serif 4 for institutional headlines and editorial moments; Public Sans for interface, navigation, labels and body. Fallbacks Georgia/Times New Roman and Arial/Helvetica respectively. Prefer locally hosted optimized font files, verify licenses and measure transfer. Avoid exaggerated negative tracking, oversized headings, ubiquitous pill buttons and generic AI/SaaS styling. Use disciplined spacing, restrained radii, authentic approved imagery and editorial contrast. Deep green #203B3B complements academic blue #175B77. Maintain readable text and contrast; white A is a brand symbol, not a precedent for white body text on orange. Mobile-first remains mandatory.

## Progressive disclosure (mandatory)
Simple by default, powerful when needed. Prioritize one main task per screen, clear school/admissions and study entrances, and contextual secondary actions. Never require role selection, onboarding or registration to access public content. Keep direct URLs, search and the product launcher accessible. Reveal advanced tools only when operational and relevant; never gate them by arbitrary engagement milestones. Preserve accessibility and navigation on narrow screens.

## Intent-first architecture (approved 2026-11-26)

The public site is a **router, not a table of contents**. A visitor arrives with one
of three intentions and must reach the matching door in one tap:

| Audience | Question they arrive with | Destination |
|---|---|---|
| Parent | "Is this school right for my child, and how do I apply?" | /admissions |
| Student | "Help me pass WAEC, NECO or JAMB." | /learn |
| Prospective family / curious | "What is the school actually like?" | /primary |

Rules that follow from it:

- **Home carries three doors and nothing else** below the hero. No section
  duplicates a nav link; no page is reachable only through a dropdown.
- **The navigation bar has three groups**: Schools (primary · secondary · school
  life · school shop), Academy, and a persistent **Apply** button. Staff
  publishing is deliberately absent from public navigation.
- **Mobile uses a sheet**, not a horizontal bar. Six links in a 360px bar is how
  a site starts to sprawl.
- **Search is the depth mechanism inside the Academy.** `/learn` opens with the
  question "What will you learn today?" and a search box; the exam tracks sit
  below it. Directory trees are not built for content that is still growing.
- **Every page must end with one next action.** A page that dead-ends is a
  brochure, not a tool.
- Maximum five cards above the fold. Home: one sentence per area. Section: one
  line per item. Detail: the long copy.

## Design system (Material-inspired, flat)

**Icons.** One shared set in `app/components/icons.tsx` — 24px grid, `currentColor`,
1.7 stroke, no icon font, no emoji. Navigation, cards and CTAs all draw from it.
Text glyphs like `↗ → ←` are banned in UI copy; they render inconsistently across
Android versions and read as decoration rather than affordance.

**Navigation.** Flat bottom bar, four destinations that exist: Home, Study, Practice,
Progress. No elevation shadow, one hairline top border, 48px minimum touch target per
item, sentence-case labels, `aria-current="page"` on the active route. Destinations
must resolve to a real screen — placeholder links ("Sample lesson") are not allowed.

**Spacing.** Compact rhythm on mobile: 20px between lesson blocks, 16px card padding,
14px radii. Density is a feature on a 360px screen with limited data.

**Buttons.** One primary style (solid orange, 48px high, 12px radius), one secondary
(outline), one text link. No more than one primary per screen region.

**Safe areas.** The bottom bar pads with `env(safe-area-inset-bottom)`; every Academy
page reserves `92px + inset` at the bottom so content is never hidden behind it.
