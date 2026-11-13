---
name: code-review
description: Use when asked to review a branch, a pull request, or uncommitted work, and for the review step of /work. Not for opening or updating a pull request; for a dedicated security audit, use security-review.
---

# Review a change independently

Return verified findings, not edits; publish nothing.

## 1. Fix what is reviewed

Identify the requirements (the Linear issue and the accepted decisions,
including the project's, or the user's request when there is no issue) and the
exact comparison: base commit, head, and any uncommitted or untracked files that
belong to the change. Ask when the base or the change's ownership is ambiguous
rather than assume `main`. Do not stage, commit, stash, or switch branches to
obtain a diff, and pause edits until the review returns.

## 2. Dispatch one reviewer per axis

| Axis | Compares the change with | Looks for |
| --- | --- | --- |
| Requirements | The issue and the accepted decisions | Missing, partial, wrong, or out-of-scope behavior |
| Standards | The project's instructions and documented conventions | Concrete violations with real impact |
| Correctness | The code, its callers, tests, and contracts | Bugs, regressions, failure handling, security and privacy risks |

Give each reviewer a fresh context and [the reviewer brief](references/reviewer-brief.md),
with the comparison and sources but not the author's reasoning or other reviewers'
findings. Without requirements, report that axis as unavailable instead of
inferring intent from the code. Without delegation, review the axes one at a time
yourself and say that independence was lost.

## 3. Verify and report

Treat each finding as a hypothesis: open the location, check the cited rule or
the failure scenario, and classify it confirmed, needs evidence, or rejected with
a reason. Set priority from impact (P0 urgent to P3 low). Keep optional
suggestions apart; unfamiliar style is not a defect, and linters own formatting.

Report one section per axis, each confirmed finding with its location, the rule
or failure scenario, its impact, and a bounded fix. End each axis with its most
serious finding, or "none found" with what was not covered.

## 4. Re-review corrections

Check that each previous finding is resolved and that the correction broke
nothing it touches, without a fresh audit of unrelated code.

**Done:** every dispatched axis returned or is reported unavailable, and every
finding is verified.
