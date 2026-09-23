---
name: code-review
description: Review a scoped diff against requirements, project standards, and correctness using independent read-only reviewers. Use for branch, PR, or uncommitted-change review, and implementation review checkpoints.
---

# Review a change independently

Return verified findings, not edits. Keep requirements, standards, and correctness
separate: a passing axis cannot hide a failing one. The caller owns corrections,
tests, and delivery. Review does not authorize publication or product execution.

## 1. Fix the review scope

1. Read the request and project instructions. Identify repository, authoritative
   issue/spec, delivery boundary, and task-owned changes. Prefer supplied requirements,
   then verified links in the work record or commits; never infer intent from code.
2. Resolve the base to a commit ID and state the comparison:

   | Request | Comparison |
   | --- | --- |
   | Explicit range | Requested endpoint or merge-base comparison, stated explicitly |
   | PR / branch against target | Verified target and merge-base with reviewed head |
   | In-progress implementation | Recorded task baseline plus scoped committed, staged, unstaged, and untracked changes |
   | Ambiguous base / ownership | Ask before review; never silently assume `main` or include unrelated work |

3. Validate refs and inventory additions, deletions, renames, and relevant untracked
   content. Empty or invalid comparisons end before delegation.
4. Record a checkpoint: base/head IDs, scoped paths, local-change inventory, and
   content hashes or equivalent snapshot identity. Pause caller edits during review
   or use an isolated snapshot including local changes; a worktree at HEAD alone
   omits uncommitted work.

Exclude credentials, private artifacts, and unrelated files from review packages.
Do not stage, commit, stash, reset, or switch branches just to obtain a diff.

**Done:** scope/version reproducible; missing inputs explicit. Without a spec, mark
Requirements unavailable and continue other axes, without inventing requirements.

## 2. Dispatch independent reviewers

Use [the reviewer brief](references/reviewer-brief.md) for each applicable axis:

| Axis | Evidence | Focus |
| --- | --- | --- |
| Requirements | Issue, accepted decisions/criteria, validated prototype contract | Missing, partial, incorrect, or out-of-scope behavior |
| Standards | Applicable instructions and documented conventions | Concrete violations; maintainability concerns with demonstrated impact |
| Correctness | Code, callers, tests, configuration, public contracts | Bugs, regressions, errors, state, compatibility, relevant security/privacy risks |

- Spawn at most one read-only reviewer per axis, with fresh context where supported.
  For the initial review, supply checkpoint, sources, scope, and brief, not the
  author's reasoning or another reviewer's findings. Follow-up receives the relevant
  verified findings and correction evidence. The user stays in the same conversation.
- Review surrounding code only as needed for impact, not as a whole-repository audit.
  Reviewers never edit, invoke this skill recursively, or spawn additional agents.
- Reviewers inspect sources by default; they propose checks to the caller rather
  than running application/test commands with persistent effects.
- If isolated delegation is unavailable, inspect axes separately and disclose the
  loss of independence. A partial review is not an independent pass.

**Done:** dispatched reviewers have returned reports or explicit failures. Wait for
completion before using results; unavailable axes remain limitations.

## 3. Verify and report

1. Recheck the checkpoint. Changed content invalidates affected findings/coverage;
   refresh that review rather than report stale locations as current evidence.
2. Treat claims as hypotheses: inspect each location, rule/requirement, triggering
   conditions, and caller impact before confirming it.
3. Classify as confirmed, needs evidence, or rejected with a reason. Keep optional
   improvements separate: unfamiliar style and uncodified smells are not violations.
   Skip linter-owned style; actual check failures can be verification gaps, not
   duplicated style findings.
4. Deduplicate defects while retaining affected axes. Set priority from impact,
   not confidence or preference for another design.

### Report contract

Return the checkpoint and one section per axis, including unavailable axes.
Each confirmed finding includes:

- Stable ID; priority P0 urgent, P1 high, P2 normal, or P3 low.
- File and exact line/range in the reviewed version; identify deleted-side locations.
- Cited rule/requirement or concrete failure scenario, impact, conditions, and evidence.
- Bounded correction suggestion; blocking/non-blocking rationale against acceptance,
  safety, and the agreed delivery boundary.

End each axis with its highest-priority confirmed finding, or "none found" with
coverage limits. Do not combine axes into one ranked winner. Separate unresolved
claims, optional suggestions, missing inputs, and executed-versus-inspected evidence.
"None found" proves neither correctness nor passing tests.

**Done:** findings verified and limitations reported. Return without edits, commits,
external comments, or automatic correction.

## 4. Re-review corrections

Take the previous checkpoint, finding IDs/dispositions, correction delta, and new
test evidence. Review corrections and affected interactions; mark findings resolved,
open, or unverifiable. Expand only to newly affected scope supported by evidence,
not an unrelated fresh audit.

Verify new regressions through the same report contract. The caller owns the repair
loop and decides whether to correct, clarify, or stop.
