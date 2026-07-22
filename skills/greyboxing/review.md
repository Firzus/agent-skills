# Page review

Run every greyboxed page through this file. A page with any unticked box is not done. The brief always wins: a pinned aesthetic recorded in `DESIGN.md` overrides any rule here.

## Generic-default test

Ask of the whole page: *would I produce this for any similar brief?* If any part reads like the generic default, revise it and say what changed. Calibration — the current AI-default looks and scaffolds to design past:

- Warm cream background (near `#F4F1EA`) + high-contrast serif display + terracotta accent.
- Near-black background + single acid-green or vermilion accent.
- Broadsheet layout: hairline rules, zero border-radius, dense columns.
- Same-size cards of icon + heading + text as the page structure; the hero-metric template (big number, small label, supporting stats).
- A tracked uppercase eyebrow over every section; section numbers (01/02/03) when the sequence carries no information.
- Gradient text (emphasis comes from weight or size); monospace as a costume for "technical".

All are legitimate *choices* for some briefs — the failure is reaching them as defaults.

## Mechanical checklist

Countable, binary:

- [ ] Signature element present.
- [ ] ≥ 4 layout families across the page's sections; a 3rd consecutive image/text zigzag fails.
- [ ] Eyebrows ≤ ceil(sections / 3).
- [ ] One accent color and one radius system; light and dark never mix within a page, and both themes are verified where the surface tokenized dark mode.
- [ ] Hero fits the viewport: headline ≤ 2 lines desktop, ≤ 4 text elements, logo wall below it.
- [ ] One primary CTA per screen; CTA labels don't wrap.
- [ ] Typography: body measure 65–75 ch, line-height 1.5–1.75, ≥ 16 px base on mobile, tabular figures for data.
- [ ] Every interactive element has hover, disabled, and loading states, plus visible keyboard focus; every data-driven view has empty and error states.
- [ ] Semantic landmarks (`header`, `nav`, `main`, `footer`) present; heading hierarchy: a single `h1`, no skipped levels.
- [ ] Contrast ≥ 4.5:1 per state and per theme; touch targets ≥ 44 pt.
- [ ] Responsive verified at 375 px and landscape; `dvh` over `vh`.
- [ ] Reduced-motion collapse verified; each remaining animation passes [motion.md](./motion.md)'s review test.
- [ ] Every style and motion value traces to a token of the theme source.
- [ ] Every state declared in `PAGES.md` (empty, error, loading) is reachable via its query param.

## Visual protocol — playwright-cli

The checklist's responsive, contrast, theme, and state items are verified **on screenshots, not by reading code**. Per page:

- Capture at **375 px, 768 px, and 1440 px**.
- One pass with **`prefers-reduced-motion` emulated**.
- One capture per declared state (the page's query params in `PAGES.md`).
- **Look at every capture** — read them as images and judge them; producing files is not verifying.

When `playwright-cli` is unavailable, verify the same items by code reading and state that degradation in the review report.

## Site pass — once every page has passed

Run once across the whole page set:

- [ ] Shared chrome (header, footer, nav) is identical on every page and matches `PAGES.md`'s navigation structure.
- [ ] The same job uses the same component pattern everywhere: one card style per content type, one button hierarchy, one form style.
- [ ] Signature elements differ across pages — no two pages spend their boldness on the same move.

## Fix order

Triage top-down — raise the whole page, not one corner:

1. Broken or blocked interactions.
2. Missing states (loading, empty, error, success, disabled).
3. Hierarchy, responsive, and token drift.
4. Visual and motion inconsistencies.
5. Cosmetic cleanup.

Final pass: refine what's there instead of adding more.
