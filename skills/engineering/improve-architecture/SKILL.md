---
name: improve-architecture
description: >-
  Scan a codebase for deepening opportunities, present them on a live canvas,
  then delegate each approved refactor to a bounded sub-agent while the canvas
  tracks progress.
disable-model-invocation: true
---

# Improve Architecture

Surface architectural friction, propose **deepening opportunities** — refactors
that turn shallow modules into deep ones — and drive the approved ones to
verified completion. The aim is testability and AI-navigability. The main
thread never refactors: it scans, presents, dispatches, reviews, and keeps the
canvas current.

## Vocabulary

Invoke the `codebase-design` skill before scanning; it is required. It
supplies the architecture vocabulary (**module**, **interface**, **depth**,
**seam**, **adapter**, **leverage**, **locality**) and its principles (the
deletion test, "the interface is the test surface", "one adapter =
hypothetical seam, two = real"). Use these terms exactly in every candidate
and every work order; do not drift into "component", "service", "API", or
"boundary". If the skill is not installed, stop and tell the user to install
it first.

## 1. Explore

**Scope before you scan: YAGNI.** Deepening pays off where change is coming,
so weight recently changed code:

- If the user named a direction (module, subsystem, pain point), take it.
- Otherwise walk back a good stretch of `git log --oneline` to find hot
  spots — files and areas that keep coming up — and let those paths pull your
  attention first. Scattered changes with no hot spot: widen the net.

Read the domain glossary (`CONTEXT.md`) and any ADRs in `docs/adr/` touching
the area; ADRs record decisions this skill does not re-litigate.

Spawn one sub-agent to walk the scoped area and report friction; explore
organically rather than by rigid heuristics:

- Where does understanding one concept require bouncing between many small
  modules?
- Where are modules shallow?
- Where were pure functions extracted just for testability while the real
  bugs hide in how they are called (no locality)?
- Where do tightly-coupled modules leak across their seams?
- Which parts are untested, or untestable through their current interface?

Apply the deletion test to every suspect. The scan is complete when each
candidate carries: involved files, the friction observed, the deletion-test
result, and how tests would improve.

## 2. Present candidates on a canvas

Invoke the `canvas` skill and render the review as a **living artifact** —
one file, kept for the whole run, updated in place at every stage below.

For each candidate, a card with:

- **Files**: files and modules involved.
- **Problem**: why the current architecture causes friction.
- **Solution**: plain-English description of what would change.
- **Benefits**: in terms of locality and leverage, and how tests improve.
- **Before / after diagram**: side by side, illustrating the deepening.
- **Recommendation strength**: `Strong`, `Worth exploring`, or `Speculative`.
- **Status badge**: every candidate starts at `Proposed`.

Use `CONTEXT.md` vocabulary for the domain: if it defines "Order", write
"the Order intake module", not "the FooBarHandler". A candidate that
contradicts an ADR appears only when the friction justifies reopening the
decision, with a visible warning naming the ADR.

End with a **Top recommendation** section: which candidate to tackle first
and why. Then ask the user which candidates to run — one, several, or all.
Do not start work without a pick.

## 3. Delegate each approved refactor

For each approved candidate, write a **work order** and spawn a sub-agent to
execute it. The work order is the sub-agent's whole world, so it carries:

- **Scope**: the exact files and modules it may touch, and the statement that
  everything else is out of bounds. Behavior-preserving refactor only: no
  features, no drive-by cleanups, no dependency changes.
- **Target shape**: the deepened interface — what callers will see, what
  moves behind the seam.
- **Completion criterion**: the refactor is done when the full test suite
  passes and every caller compiles against the new interface. If the area has
  no tests, the sub-agent writes characterization tests against the current
  behavior first and keeps them green through the refactor.
- **Report format**: files changed, interface before/after, test results, and
  any discovery that changed the plan.

Independent candidates (disjoint files) may run as parallel sub-agents; any
two candidates whose scopes overlap run sequentially. On dispatch, flip the
candidate's canvas badge to `In progress`.

## 4. Review, verify, update the canvas

When a sub-agent reports back, the main thread reviews before anything is
marked done:

- Read the diff. Confirm the scope held and the interface matches the work
  order's target shape.
- Re-run the test suite from the main thread; the sub-agent's claim is not
  the evidence.
- Passed: flip the badge to `Verified` and add a short outcome line to the
  card (what the interface became, test delta). Failed or scope drifted: flip
  to `Blocked` with the reason, and either re-dispatch with a corrected work
  order or surface the decision to the user.

Side effects happen as results crystallize:

- A deepened module named after a concept missing from `CONTEXT.md`: add the
  term (create the file lazily).
- The user rejects a candidate for a load-bearing reason: offer an ADR so
  future reviews do not re-suggest it. Skip ephemeral reasons ("not worth it
  right now").

The run is complete when every approved candidate reads `Verified` or
`Blocked` on the canvas, and the closing message links the canvas with a
one-line summary per candidate.
