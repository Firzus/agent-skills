# Prepare large work progressively

## Size the outcome, not the file count

A request is too large for one execution issue when delivery requires multiple
distinct commitments of outcome, validation, or coordination, or exceeds the
project's agreed implementation and review limits.

| Signal | Response |
| --- | --- |
| Ambiguous success or behavior | Interview or gather bounded evidence |
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
| Broad goal needing durable framing and staged outcomes | Project, Markdown framing document, and sufficiently understood issues |

An existing initiative may provide context; portfolio hierarchy is optional.
A project is not automatically one repository. Markdown preserves reasoning, not
automatically links, attachments, history, or native relationships.

## Frame, narrow, and return

1. Establish ambition, audience, constraints, resources, and long-term dependencies.
2. Keep one framing document using the template below. Index decisions rather than
   duplicating rationale; each decision has one home in the document or owning issue.
3. Agree the next observable outcome: learning can be useful before production.
   For an experiment, agree question, minimum scope, and judgment; check execution
   prerequisites separately from accepting its framing.
4. Detail that outcome only; keep distant areas coarse. Use
   [routing](issue-contract.md#choose-the-next-work) for issues and their types.
5. Return findings to the same record, updating affected decisions and next outcome.
   Use [design and uncertainty](design-and-uncertainty.md) for experiments and
   [domain context](domain-context.md) for definitions and pending deltas.

### Framing document

```markdown
# <Goal>

## Destination and constraints
<Outcome/experience, audience, resources, constraints.>

## Accepted decisions
- <Decision and rationale, or named link to its authoritative record.>

## Open decisions
- <Question, prerequisite, decision owner, evidence needed.>

## Not yet specified
- <In-scope area still too uncertain to detail.>

## Out of scope
- <Exclusion and reason.>

## Next useful outcome
<Bounded result, demonstration, acceptance owner.>
- <Links to approved issues and any milestone.>

## Resume here
<Next question or required evidence.>
```

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
