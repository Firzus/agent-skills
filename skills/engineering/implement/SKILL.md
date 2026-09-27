---
name: implement
description: Execute a Linear issue by work type, or deliver a defined change, with status tracking, test-first verification, current documentation, and a verified handoff.
disable-model-invocation: true
---

# Implement a verified change

Deliver one coherent, reviewable outcome. Tests, context, and affected documentation
belong to the change. Invoking this skill on a Linear issue authorizes, for that
issue: status changes, creation of a missing label, commits, pushing a prototype
branch, closing a Research issue when its research completes, and closing a
Prototype or Interview issue after the user validates its result. For a Task or
Bug, ask the user to validate opening the PR once the work is verified; that
validation authorizes the push and a non-draft PR. It does not authorize
unrelated work, merge, or deployment.

## 1. Read the work and route it

1. Read the request, project instructions, current repository state, and existing
   work record. For a Linear issue, include comments, linked decisions, acceptance
   criteria, and native blocking relations.
   Record the starting revision and scoped local changes before routing or edits,
   so later review can distinguish this task's changes from existing work.
2. Apply [intake and handoff](references/intake-and-handoff.md): check the status,
   route executable work by its Type label, move it to In Progress, and verify prerequisites,
   prototype version, and context changes. A Prototype, Research, or Interview
   issue follows its route there instead of the rest of this workflow; a Bug goes
   through `debug` and resumes at step 4.
3. Trace the affected behavior through callers, contracts, configuration, and tests.
   Separate unrelated local work and pre-existing failures.
4. Resolve discoverable facts locally. For consequential open choices or conflicts,
   resolve them with `interview` when they stay inside the issue's scope, otherwise
   retain an out-of-scope finding in the conversation. Publish it as a Need triage
   issue only with approval of its content and destination, or explicit existing
   authorization covering that creation. Pause only the dependent work.

**Done:** scope, prerequisites, authorization, and independent acceptance evidence
are clear. Otherwise report the precise blocker and continue only independent,
authorized work. In read-only or planning mode, retain a plan rather than edit.

## 2. Prepare the change and verification

1. Preserve the prepared branch/worktree and unrelated changes. Identify existing
   components and dependencies to reuse; avoid speculative restructuring.
2. Establish the relevant baseline and map each acceptance criterion to a focused
   check, including consequential adverse cases for security, privacy, money,
   destructive operations, or public compatibility.
3. Choose the smallest coherent implementation sequence and the agreed delivery
   boundary. Read [delivery](references/delivery.md) before Git publication or
   Linear updates.

**Done:** baseline and checks identified, work isolated, delivery expectations explicit.

## 3. Implement with tests and documentation

For each production behavior:

1. Write a focused test at an existing caller-facing boundary.
2. Run it and inspect the failure: it must demonstrate the missing behavior,
   not a broken fixture, dependency, or command.
3. Make the smallest correct change using established components and contracts.
4. Run the test again; refactor while green, then move to the next behavior.

| Work shape | Verification |
| --- | --- |
| Production behavior | Test first by default |
| Test-first unsuitable | State why and use relevant substitute evidence; avoid infrastructure solely for ceremony |
| Refactoring | Establish and preserve a passing behavioral baseline |
| Documentation only | Verify sources, claims, and links; no artificial code change or failing test |

- Deliver the accepted context delta using [intake and handoff](references/intake-and-handoff.md#deliver-context-with-the-change).
- For a new, substantially changed, audited, or retired system page, use
  [system documentation](references/system-documentation.md). Keep small wording
  repairs local to their sources and links. Any edit to a system page updates its
  "Last updated" date.
- Keep comments beside verified, non-obvious rationale or caller obligations.
  Explain workaround sources and removal conditions; update stale affected comments.
  Avoid narration, decorative labels, vague TODOs, and disabled code.
- A new consequential decision returns to clarification; ordinary internal choices
  remain with implementation. Research/prototype needs do not expand scope silently.

**Done:** each behavior has failing/passing evidence or a justified substitute;
code, context, contracts, and affected documentation agree.

## 4. Verify the complete result

1. Run [the review-correction loop](references/review-loop.md) using `code-review`.
   Reviewers inspect; implement verifies findings, corrects confirmed problems,
   and requests targeted follow-up. Keep optional cleanup out of the change.
2. Run focused checks and required project checks. Fix failures caused by the
   change; report pre-existing failures without broadening the task.
3. For user-visible behavior, exercise the ordinary integrated entry point,
   interactions, and relevant narrow or target-device layout. Keep the review
   surface available through supported tools.
4. Identify prototype, simulation, or live data. Distinguish inspected behavior,
   executed checks, and unavailable runtime evidence.
5. After a visual bug fix or when a recorded demo is requested, use the available
   `video-report` skill to capture and review evidence; its capture rules stay there.
   Video supplements tests, not replaces them. If unavailable, report the gap;
   it blocks delivery only when video is required acceptance evidence. Keep recordings
   local unless their publication is authorized.

**Done:** the review loop's stopping conditions hold, and acceptance evidence covers
the connected result and relevant failure cases.
Missing required verification remains a delivery limitation, not a claimed pass.

## 5. Deliver and report

1. Follow [delivery](references/delivery.md) for authorized commits, PRs, reviews,
   and meaningful Linear updates.
   For a Bug, the PR description and an issue comment carry the recap: symptom,
   cause and its evidence, fix, regression test and checks, video evidence when
   step 4 produced it, and remaining uncertainty.
2. Preserve the existing record; link artifacts and evidence rather than creating
   another backlog. Report acceptance, integration, and deployment separately.
3. Return the result, affected files, checks, limitations, and next owner/action.
   When video evidence was produced, include its supported preview or absolute local
   path, the demonstrated scenario and observed result, and any review limitations.
   A newly prepared issue or broader goal needs a separate request, not automatic
   continuation into the next feature.

**Done:** the agreed completion boundary is met and required updates are verified.
Otherwise report the completed local work and exact pending delivery operations.
