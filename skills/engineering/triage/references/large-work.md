# Prepare large work progressively

## Choose the structure

Choose the smallest structure that fits the work. Reuse existing records; the
structure is part of the draft approved in triage step 3.

| Work shape | Structure |
| --- | --- |
| One outcome that one issue delivers | One issue using the [issue contract](issue-contract.md) |
| One outcome that needs several Task or Bug issues, all of which can be detailed now | A grouping parent with those issues as sub-issues |
| A final goal that needs more than one successive current goal, because some work cannot be detailed until earlier results exist | A project using the [project template](#project-template) |

A new Task or Bug prerequisite and its dependent work belong under one grouping
parent when they serve the same requested outcome and both can be detailed now.
Also record the blocking relation: grouping states the outcome, blocking states
the execution order. Reuse an existing prerequisite without changing its parent.
Add a new issue to an existing grouping parent only when its stated outcome covers it.

A Research or Prototype issue and the Interview issue it blocks are linked by the
blocking relation only; they need no grouping parent.

Use the project's agreed delivery limits to decide whether one Task is too large.
Without an agreed limit, or without code to estimate size, keep one Task per user
story; `implement` reports when a Task exceeds a limit. Files, layers, and tokens
are not size thresholds. A narrow but high-risk change needs stronger acceptance
criteria and verification, not more structure.

## Frame, narrow, and return

1. Establish the final goal, audience, constraints, resources, and long-term
   dependencies, with observable success criteria.
2. Keep the framing in the project description using the project template. Each
   decision has one home: the project description or the issue that owns it. Link
   it from elsewhere rather than copying its rationale.
3. Agree the current goal: the furthest observable outcome reachable with current
   knowledge and progress, delivered by the project's open issues. Open decisions
   and missing evidence set its limit; learning can be useful before production.
   For an experiment, agree question, minimum scope, and judgment in a Prototype
   issue.
4. Write Task issues only for stories inside the current goal. Beyond it, open
   decisions and missing evidence leave no known way to carry the work out, so a
   task would be written blind.

   | Gap | Treatment |
   | --- | --- |
   | Inside the current goal | Research, Prototype, or Interview issue, chosen with [routing](issue-contract.md#choose-the-next-work) |
   | Beyond the current goal | Entry in "Open decisions" of the project; no issue yet |

5. Return findings to the same record, updating affected decisions; the final goal
   changes only by an accepted decision. Use
   [bound missing evidence](issue-contract.md#bound-missing-evidence) for experiments and
   [domain context](domain-context.md) for definitions and pending deltas.
6. Record in "Resume here" where the next run starts. Once the current goal's
   issues are closed, the project continues through
   [continue a project](#continue-a-project).

### Project template

The template is strict, under the same rules as the
[issue templates](issue-contract.md#issue-templates): every section, in this order,
"None" when empty, no added section, headings in the project's artifact language.
Its user stories, in priority order, are the project's specification; each
becomes a Task issue once the current goal covers it.

Use the [project template](../templates/project.md): set its fields, then write the
description sections. The Product label is defined in
[labels, status, and relations](issue-contract.md#labels-status-and-relations).
Change the project's name and summary only when an accepted decision changes the
final goal.

For an AAA game, clarify player experience, resources, and dominant uncertainty
before choosing a playable or learning outcome. One prototype cannot establish
whole-production feasibility.

**Done:** final goal and current goal accepted; the current goal's issues pass their
readiness review or the needed investigation is explicit. This does not make the
whole ambition ready.
**Waiting/blocked:** keep missing decisions, evidence, and the resume point in the draft.

## Continue a project

A project advances one current goal at a time until its final goal is reached. When
its open issues are closed, the user runs `triage` with the project link in a new
conversation. If issues are still open, report them and stop; reframe the current
goal only when the user asks.

1. Read the project description from "Resume here", then the closed issues' results,
   comments, and evidence. Done or Canceled status alone does not prove a result;
   missing evidence leaves that result unknown.
2. Compare the results with the current goal and record them in the project
   description:

   | Finding | Where it goes |
   | --- | --- |
   | Delivered story | Keep it in "User stories" with its issue link |
   | New accepted decision | "Accepted decisions" |
   | Story excluded by a decision | Moved to "Out of scope" with the reason |
   | Unmet part of the current goal | Stays in the next current goal |
   | Success criterion without evidence | Stays unmet; name the missing evidence in "Resume here" |

3. When every success criterion has evidence, report it and propose completing the
   project; changing its Linear status requires approval.
4. Otherwise run `interview` on the open decisions that the next current goal needs,
   agree that goal, then draft its issues and publish them after approval, as in
   [frame, narrow, and return](#frame-narrow-and-return).
