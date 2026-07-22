---
name: frontend-design
description: >-
  Design a site's whole frontend — design system, greyboxing, real content.
  Use when the user wants to design or redesign a site's frontend, or to
  build all the pages of a new site.
---

# Frontend Design

A router: a site's frontend is designed in three phases, each owned by its own skill, handing off through two artifacts at the project root.

| Phase | Skill           | Artifact it owns                                                        |
| ----- | --------------- | ----------------------------------------------------------------------- |
| 1     | `design-system` | `DESIGN.md` — identity: design read, dials, tokens, surfaces            |
| 2     | `greyboxing`    | `PAGES.md` — page list, tiers, statuses, signature elements, motion theses |
| 3     | `real-content`  | the pages themselves — every placeholder replaced, copy self-audit passed |

Invoke the skill for the phase the project is in; each declares its own gates and prerequisites. A phase starts only when the previous phase's artifact exists and its exit gate has passed. The artifacts are the memory: any session can pick the pipeline up by reading them.

## Session discipline

Context is the scarce resource — split the work across sessions:

- One session for `design-system`, through its grill and validation gate.
- **One fresh session per page** for `greyboxing`: read `DESIGN.md` + `PAGES.md`, build the page, update `PAGES.md`, stop. The site pass gets its own session.
- One session for `real-content` (one per surface on multi-surface projects).

Small site (fewer than ~5 pages)? Chaining phases in one session is acceptable — the artifacts still get written, so any later session can take over.
