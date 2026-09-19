---
name: work-tracking
description: Triage requests and maintain accepted work, ownership, status, blockers, handoffs, and contributor feedback in the project's agreed record. Use for tracking and coordination requests or meaningful work-state changes; not creating a project strategy or forcing a tracker onto a small task.
---

# Maintain one authoritative work record

Use the project's AGENTS.md agreement for tracker, location, native states, roles, intake channel, completion boundary, and permitted updates. With no agreed tracker, use the current task record; choosing a service is a project decision, not a global solo/group rule.

## 1. Locate and classify

Read the current record before creating or changing anything. Identify the intended outcome and existing duplicates. Give incoming requests a disposition: ready, deferred with a reason, duplicate linked to its owner, or declined with an explanation. Preserve the reporter's intent and channel privacy.

Keep implementation, tests, documentation, and verification as steps of one coherent outcome. Propose separation only for independent ownership, real dependencies, or independently reviewable results; it does not authorize creating new conversations or external issues.

**Done when:** the authoritative record and disposition are known, without a competing backlog.

## 2. Maintain state and responsibility

Reuse existing context and fields rather than add a form. Clarify only missing scope, owner, reviewer, acceptance evidence, delivery conditions, and next action. One person may hold implementation and review roles.

Map the project's native states to these meanings rather than rename its workflow:

| Meaning | Required evidence |
| --- | --- |
| Ready | Outcome, prerequisites, responsibility, and completion boundary are clear |
| In progress | Work has actually started |
| Review | The result and verification evidence are available to the reviewer |
| Done | Required acceptance and delivery conditions are satisfied |

The implementer maintains progress and evidence; the designated reviewer accepts the result. Keep acceptance, integration, and release as separate facts. Non-code work uses its agreed artifact and review evidence, not an artificial PR.

A blocker retains the current phase and records cause, resolution owner, and next action. Cancellation is distinct from successful completion. A closed duplicate is not an implemented outcome.

**Done when:** recorded state and responsibility reflect observed work, with missing conditions explicit.

## 3. Update through the authorized route

Update on meaningful changes, not every tool call. Use an available supported interface and stay within approved destinations and actions. Re-read before writing to preserve concurrent changes, then verify the result.

If access is missing or the write fails, report the last confirmed state and pending update. Keep that as a pending operation, not a second authoritative tracker or a synchronization claim.

**Done when:** each intended update is verified or reported pending with its reason.

## 4. Preserve continuity and close feedback

Before a pause or handoff, preserve the objective, completed work, artifact and check evidence, unresolved decisions or blockers, and next action in the existing record. On resumption, reconcile the checkpoint with current artifacts and state. Continue in the same task unless a real boundary requires separation.

Return the known disposition or outcome through the approved intake channel in the reporter's terms. Protect private implementation details. A plan, draft PR, or automated closure does not override unmet completion conditions.

**Done when:** the next owner can resume from the record and the reporter has the authorized outcome, or the unsent update is explicitly pending.
