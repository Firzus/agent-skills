# Prepare large work progressively

## Size the outcome, not the file count

A request is too large for one execution issue when delivery requires multiple
distinct commitments of outcome, validation, or coordination, or exceeds the
project's agreed implementation and review limits.

| Signal | Response |
| --- | --- |
| Ambiguous success or behavior | Run `interview` or gather bounded evidence |
| Distinct acceptance or ownership commitments | Propose a breakdown |
| Broad ambition with uncertain future work | Frame it and select the next useful outcome |
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

1. Establish ambition, audience, constraints, resources, and long-term dependencies.
2. Keep the framing in the project description using the project template. Index
   decisions rather than duplicating rationale; each decision has one home in the
   project description or owning issue.
3. Agree the next observable outcome: learning can be useful before production.
   For an experiment, agree question, minimum scope, and judgment in a Prototype
   issue.
4. Detail that outcome only; keep distant areas coarse. Use
   [routing](issue-contract.md#choose-the-next-work) for issues and their types.
5. Return findings to the same record, updating affected decisions and next outcome.
   Use [bound missing evidence](issue-contract.md#bound-missing-evidence) for experiments and
   [domain context](domain-context.md) for definitions and pending deltas.

### Project template

The template is strict, under the same rules as the
[issue templates](issue-contract.md#issue-templates): every section, in this order,
"None" when empty, no added section, headings in the project's artifact language.
Its user stories, in priority order, are the project's specification; each
becomes a Task issue when it is detailed.

Use the [project template](../templates/project.md): set its fields, then write the
description sections. The Product label is defined in
[labels, status, and relations](issue-contract.md#labels-status-and-relations).

For an AAA game, clarify player experience, resources, and dominant uncertainty
before choosing a playable or learning outcome. One prototype cannot establish
whole-production feasibility.

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

**Done:** framing and next outcome accepted; bounded work passes its readiness review
or the needed investigation is explicit. This does not make the whole ambition ready.
**Waiting/blocked:** preserve missing decisions/evidence and the resume point in the draft.
