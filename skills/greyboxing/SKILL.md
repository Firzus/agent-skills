---
name: greyboxing
description: >-
  Greybox a site's pages — layout, UX, motion on placeholder content — from
  an existing DESIGN.md. Use when the user wants to greybox, lay out, or
  build the pages of a site whose design system exists, or when the
  frontend-design pipeline reaches phase 2.
---

# Greyboxing

Build every page's structure, style, and motion on placeholder content — real content lands later, into a frame that already works.

Inputs, read at the start of every session: `DESIGN.md` (identity — never edited here) and `PAGES.md` (pipeline state — owned and updated here). The surface's dials (`DESIGN_VARIANCE`, `MOTION_INTENSITY`, `VISUAL_DENSITY`) gate every layout and motion decision.

Everything is **responsive, designed mobile-first**: build the narrow layout first, then widen through the breakpoints. Sole exception: features inherently bound to one platform. Shared chrome (header, footer, nav) has a **single source** — a component, custom element, or include consumed by every page, never duplicated per page.

## Prerequisites

| Tool / skill     | For                                                                    |
| ---------------- | ---------------------------------------------------------------------- |
| `prototype`      | switchable UI variants of signature-tier pages                         |
| `playwright-cli` | the visual protocol in [review.md](./review.md); when missing, the review degrades to code-level checks and the review report must say so |
| `grilling`       | the site-pass grill                                                    |

## Per-page loop

One page per fresh session, in `PAGES.md` order:

1. **Plan** — pull the page's key sections and tier from `PAGES.md`. Name the page's **signature element** (the one thing it will be remembered by — spend the boldness there, keep everything around it quiet; check `PAGES.md` that no other page already spends it). Write its **motion thesis** ([motion.md](./motion.md)). Declare the page's demoable **states** (empty, error, loading) and the query params that show them. Reach into [vocabulary.md](./vocabulary.md) for named patterns, and [3d-vfx.md](./3d-vfx.md) when the brief or dials call for 3D, video, scroll effects, or shaders.
2. **Variants** — *signature tier only*: invoke the `prototype` skill (UI branch) to generate several throwaway layout variants on the page's route, all consuming the theme source. The user picks the winner — a mix of variants is a valid pick. Utility tier skips this step.
3. **Build** — turn the plan (or winning variant) into the real page: layout, navigation, UX, and motion per the thesis; every style and motion value drawn from the theme source; every declared state reachable; placeholder content everywhere, passing the **Jane Doe test**.
4. **Review** — run the page through [review.md](./review.md): generic-default test, mechanical checklist, visual protocol, fix order. Fix before moving on. No tier skips this step.
5. **Record** — update the page's row in `PAGES.md`: status, signature element, motion thesis, state query params.

**Jane Doe test** — nothing smells fake: credible names, messy numbers like 47.2 %, plausible brand names, seeded real photos — so the review judges true proportions.

## Site pass

Once every page has passed, in its own session: run review.md's **site pass** across the whole set, then invoke the `grilling` skill on the cross-page result (signature spread, chrome, shared patterns). Record the outcome in `PAGES.md`.

**Done when:** every page in `PAGES.md` has passed the review, and the site pass — including its grill — has passed.
