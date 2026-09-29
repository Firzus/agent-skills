# Prepare large work progressively

## Size the outcome, not the file count

A request is too large for one execution issue when delivery requires multiple
distinct commitments of outcome, validation, or coordination, or exceeds the
project's agreed implementation and review limits.

| Signal | Response |
| --- | --- |
| Ambiguous success or behavior | Run `interview` or gather bounded evidence |
| Distinct acceptance or ownership commitments | Propose a breakdown |
| Broad ambition with uncertain future work | Frame its final goal and agree its current goal |
| Narrow but high-risk change | Strengthen safeguards and verification, not hierarchy |
| Missing decision, access, or result | Identify required outcome and owner; block dependent work |

Use agreed project limits. Otherwise explain the concrete concern and agree a
manageable next outcome. Files, layers, tokens, and arbitrary time limits are not
universal thresholds: a mechanical edit may stay one issue, while a small payment
change needs substantial safeguards.

## Choose the smallest useful Linear structure

Reuse existing records; obtain publication approval before creating structure.

| Work shape | Structure |
| --- | --- |
| One bounded outcome | One issue using the [issue contract](issue-contract.md) |
| Bounded group with separately tracked outcomes/decisions | Parent and justified sub-issues |
| Broad goal needing durable framing and staged outcomes | Project using the [project template](#project-template) and sufficiently understood issues |

An existing initiative may provide context; portfolio hierarchy is optional.

## Frame, narrow, and return

1. Establish the final goal, audience, constraints, resources, and long-term
   dependencies, with observable success criteria.
2. Keep the framing in the project description using the project template. Index
   decisions rather than duplicating rationale; each decision has one home in the
   project description or owning issue.
3. Agree the current goal: the furthest observable outcome reachable with current
   knowledge and progress, delivered by the project's open issues. Open decisions
   and missing evidence set its limit; learning can be useful before production.
   For an experiment, agree question, minimum scope, and judgment in a Prototype
   issue.
4. Write Task issues only for stories inside the current goal. Beyond it, open
   decisions and missing evidence leave no known way to carry the work out, so a
   task would be written blind. Keep those stories coarse in the project and route
   their gaps to Research, Prototype, or Interview work with
   [routing](issue-contract.md#choose-the-next-work).
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

For an AAA game, clarify player experience, resources, and dominant uncertainty
before choosing a playable or learning outcome. One prototype cannot establish
whole-production feasibility.

## Continue a project

A project advances one current goal at a time until its final goal is reached. When
its open issues are closed, the user runs `triage` with the project link in a new
conversation:

1. Read the project description from "Resume here", then the closed issues' results,
   comments, and evidence.
2. Compare the results with the current goal. Record findings and decisions in the
   project description; an unmet part stays in the next current goal.
3. When the success criteria are met, report the evidence and propose completing
   the project; changing its Linear status requires approval.
4. Otherwise run `interview` on the open decisions to agree the next current goal,
   then draft its issues and publish them after approval, as in
   [frame, narrow, and return](#frame-narrow-and-return).

While issues remain open, report them; reframe the current goal only when the user
asks.

## Milestones

Use optional milestones for significant intermediate outcomes, not ordinary questions.

1. Reuse existing milestones; name observable results such as "Playable demo",
   rather than technical layers that provide no useful result alone.
2. State demonstration, acceptance owner, and prerequisite decisions.
3. Detail the next milestone; keep later ones coarse and revise with evidence.
   Dates are optional and require agreement.
4. Include milestones and memberships in publication approval; verify project,
   descriptions, and memberships afterward.

Completed counts indicate progress, not acceptance. For Done or Canceled prerequisites,
verify the required decision/result and evidence. Missing evidence leaves readiness unknown.

**Done:** final goal and current goal accepted; bounded work passes its readiness review
or the needed investigation is explicit. This does not make the whole ambition ready.
**Waiting/blocked:** preserve missing decisions/evidence and the resume point in the draft.
