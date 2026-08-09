---
name: design-system
description: >-
  Create a project's design system — design read, dials, tokens, themes —
  recorded in DESIGN.md. Use when the user wants a design system, theme, or
  design tokens for a site or app, or when the frontend-design pipeline
  reaches phase 1.
---

# Design System

Turn a brief into a validated design system, recorded in `DESIGN.md` at the project root — the identity file every later design session reads first. This skill also scopes the page set into a `PAGES.md` skeleton, which the `greyboxing` skill owns from then on.

Stack-agnostic: express the tokens through the project's own theming mechanism (CSS variables, Tailwind theme, component library — whatever the stack offers).

## Prerequisites

| Skill           | For                                                    |
| --------------- | ------------------------------------------------------ |
| `grilling`      | the mandatory grill gate before validation             |
| `prototype`     | rendering the token showcase                           |
| `extract-theme` | replicating a reference site's tokens (that branch only) |

When one is missing, tell the user before the step that needs it.

## 1 — Design read

Read the brief's signals before touching a token: project kind, vibe words, linked references, audience, existing brand assets, and quiet constraints (accessibility-first, regulated, trust-first — these override aesthetic preference).

Declare the read in one line: **"Reading this as: \<project kind> for \<audience>, with a \<vibe> language, leaning toward \<aesthetic family or design system>."**

If the read genuinely diverges, ask **one** clarifying question — never a questionnaire. A reference image or site the user pins is a **pinned aesthetic**: record it in `DESIGN.md`; downstream reviews may not challenge it.

## 2 — Surfaces

Ask how many surfaces the project has (marketing site, app dashboard, docs…). Each surface gets its own design read line and its own dials; all surfaces share one set of primitives.

## 3 — Dials

Set three dials per surface, 1–10, inferred from the design read. Every layout and motion decision downstream is gated by these values — `greyboxing` reads them from `DESIGN.md`.

| Dial               | 1                | 10                   |
| ------------------ | ---------------- | -------------------- |
| `DESIGN_VARIANCE`  | perfect symmetry | artsy chaos          |
| `MOTION_INTENSITY` | static           | cinematic / physics  |
| `VISUAL_DENSITY`   | art gallery      | cockpit              |

| Read                                    | VARIANCE | MOTION | DENSITY |
| --------------------------------------- | -------- | ------ | ------- |
| minimalist / calm / editorial           | 5–6      | 3–4    | 2–3     |
| premium consumer / luxury               | 7–8      | 5–7    | 3–4     |
| playful / experimental / agency         | 9–10     | 8–10   | 3–4     |
| marketing site (default)                | 7–9      | 6–8    | 3–5     |
| dashboard / app surface                 | 4–6      | 3–5    | 5–7     |
| trust-first / public-sector / regulated | 3–4      | 2–3    | 4–5     |

## 4 — Scope the page set

Identify the project type and select the matching page categories:

| Project type            | Categories                                      |
| ----------------------- | ----------------------------------------------- |
| Marketing / vitrine     | Marketing, Legal, System                        |
| SaaS / app              | Marketing, Legal, Auth, App, System             |
| E-commerce              | Marketing, Legal, Auth, App, E-commerce, System |
| Docs / community add-on | add Community to any of the above               |

Load only the selected categories from [pages.md](./pages.md) and trim pages the project genuinely lacks. Then derive the **navigation structure** (header links, footer groupings, secondary nav) and **tier** each page:

- **signature** — carries conversion or identity (home, listing, product detail, pricing, main dashboard). Gets the full greyboxing loop with prototype variants.
- **utility** — convention is the right design (legal, auth, 404, settings, confirmations). Direct build — but the full review still applies.

**Gate:** the user confirms the page list, the tiers, and the navigation structure.

## 5 — Foundation branch

Pick one per surface:

- **Official design system** — the brief reads as an established ecosystem (Fluent, Material, Carbon, Polaris, Primer, Atlassian, GOV.UK/USWDS, shadcn/Radix): install and theme the **official package**. Honesty rule: never recreate a real system's CSS by hand, and one system per surface — never two mixed.
- **Replicate a reference site** — the user names a site: invoke `extract-theme` on that URL and adapt its output.
- **From scratch** — derive tokens from the project's subject, audience, and brand material. The subject's own world — its materials, instruments, vernacular — is where distinctive choices come from.

## 6 — Tokens

Define every family in one theme source per project (primitives + a semantic layer per surface):

| Family     | Covers                                              |
| ---------- | --------------------------------------------------- |
| Color      | brand, surfaces, text, borders, states, dark mode   |
| Typography | families, sizes, weights, line heights              |
| Spacing    | the spacing scale                                   |
| Sizing     | container widths, breakpoints, control heights, touch targets |
| Radius     | the radius scale                                    |
| Elevation  | shadow / layering levels                            |
| Motion     | duration scale + easing curves (defaults below)     |

Motion defaults, tuned by the surface's `MOTION_INTENSITY`:

| Duration   | Use                                      |
| ---------- | ---------------------------------------- |
| 100–150 ms | immediate feedback                       |
| 150–300 ms | routine state change, micro-interactions |
| 300–500 ms | layout, overlay, or view transition      |
| 500–800 ms | a deliberately authored focal entrance   |

Easing: natural deceleration — `cubic-bezier(0.16, 1, 0.3, 1)` for confident arrivals; exits at ~60–70 % of the enter duration; one duration/easing token set globally.

**Rotation discipline:** `DESIGN.md` logs the palette family and display face used. Rotate — the previous project's choices are off the table unless the brief pins them.

## 7 — Grill

Invoke the `grilling` skill on the decisions so far: design read, dials, foundation choice, palette and type direction. Mandatory — this is the most leveraged, hardest-to-reverse decision set in the pipeline.

## 8 — Showcase & validation

Invoke the `prototype` skill (UI branch) to render a **token showcase** — swatches, type scale, spacing/sizing/radius/elevation scales, motion demos playing their real durations and easings — one per surface where surfaces diverge.

**Done when:** the grill is done, the user has validated the showcase, and `DESIGN.md` plus the `PAGES.md` skeleton are written.

## DESIGN.md schema

```markdown
# DESIGN — <project>

## Brief
Design read (one line per surface) · pinned aesthetic · quiet constraints.

## Dials
| Surface | DESIGN_VARIANCE | MOTION_INTENSITY | VISUAL_DENSITY |

## Primitives
Shared brand DNA: palette, type faces, scales — pointer to the theme source file.

## Surface: <name>
Foundation (official system | replicated | from scratch) · theme (light / dark / auto) ·
semantic token mapping · voice notes for copy.

## Rotation log
Palette family and display face used (this project and known past ones).
```

## PAGES.md skeleton

Created here with the scoping data; `greyboxing` owns and updates it afterwards:

```markdown
# PAGES — <project>

## Navigation
Header links · footer groupings · secondary nav.

## Pages
| Page | Surface | Tier | Key sections (from the catalog) | Status |
| ---- | ------- | ---- | ------------------------------- | ------ |
| Home | marketing | signature | hero, social proof, features, … | scoped |

## Site pass
Status: pending
```
