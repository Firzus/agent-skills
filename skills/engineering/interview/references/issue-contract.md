# Produce an executable brief

Use the project's Linear template, or the template below. Link authoritative
definitions, decisions, and evidence; omit empty optional sections.

## Choose the next work

- Keep short questions and direct fact lookups inside the interview.
- Every bounded work item selected for later execution gets an issue, even a small
  implementation. Reuse existing issues; inline clarification needs no extra issue.
- Separate a Decision issue only for independent ownership or follow-up.
- Use [large work](large-work.md) for broad ambitions; publication requires approval.

| What must happen next | Work type | Expected result | Resume skill |
| --- | --- | --- | --- |
| Resolve a preference or domain choice | Decision | An accepted choice and its consequences | `interview` |
| Investigate a question through substantial source research | Research | A sourced answer and remaining uncertainty | `deep-research` |
| Build and observe an experiment to answer a question | Prototype | Observations supporting a design or feasibility decision | `prototype` |
| Deliver defined behavior or documentation | Implementation | A verified, integrated change at the agreed delivery boundary | `implement` |

Choose the missing result, not size, risk, or UI presence. Prepare prerequisites
first, keeping later work conditional; these are alternatives, not mandatory stages.

| Type versus readiness | Rule |
| --- | --- |
| Research / Prototype | Can be ready to answer a question while product implementation remains blocked on it |
| Decision | Needs a clear question, owner, and available inputs, not an already accepted answer |
| Resume skill / access unavailable | Report the gap rather than silently replacing the required capability |

## Issue template

```markdown
# <Outcome-oriented title>

## Problem and outcome
<Who needs what, why, and the observed starting point.>

## Scope
- <Behavior to deliver.>

## Out of scope
- <Boundary that prevents scope drift.>

## Accepted decisions
- <Relevant domain meaning, behavior, public contract, constraint, or rationale.>

## Context changes — Accepted, not integrated
- <Target document or section, accepted addition/change/removal, and rationale;
  or a link to the owning issue's delta. Omit this section if unchanged.>
- <Delivery requirements from the domain-context reference.>

## Acceptance criteria
- [ ] <Observable successful result.>
- [ ] <Consequential adverse case, when applicable.>

## Verification
- <Existing caller-facing test or other evidence demonstrating each criterion.>

## Dependencies and readiness
- Work type: <Decision, Research, Prototype, or Implementation.>
- Resume skill: <Selected from the routing table.>
- Readiness: <Ready, blocked, or unknown, with the reason or missing evidence.>
- Blocked by: <Verified prerequisite or named issue, or none.>
- Milestone: <Approved project milestone, when applicable; otherwise omit.>
- Open decisions: <Unresolved question, or none.>

## Evidence and delivery
- <Source, context, decision, or approved prototype link.>
- Completion boundary: <What counts as delivered for this issue.>
```

## Authoring rules

- Express acceptance as behavior, not files to edit.
- Use verified code locations as navigation hints. A small prototype fragment may
  clarify an accepted contract; identify its provenance and experimental status.
- Carry the defect's reproduction record; distinguish symptoms from unproven causes.
- Redact secrets, personal data, and private details. Replace inaccessible evidence
  links with safe summaries or approved shared artifacts; brief publication does
  not authorize uploading private files.

## Readiness review

Read the draft without chat history, checking the selected work's scope:

- [ ] The outcome and protected existing behavior are clear.
- [ ] Consequential domain, behavior, and interface decisions are accepted.
- [ ] [Integrated context and relevant pending deltas](domain-context.md) have
  been checked; accepted changes have an accessible owner and delivery requirements.
- [ ] Facts, accepted choices, and remaining uncertainty are distinguishable.
- [ ] Success and relevant failure cases can be verified independently of the implementation.
- [ ] Prerequisites and the delivery boundary are explicit.

**Ready:** checks pass for the selected work, not necessarily the whole feature.
Otherwise name the gap and prepare its prerequisite using the routing table.
Routine internal choices stay with the implementer when outcome/contracts are unchanged.

## Split only when justified

1. Propose additional issues only for independently verifiable outcomes,
   separate ownership, or real dependencies.
2. Prefer end-to-end slices, each including its tests and necessary documentation.
   For a broad compatibility refactor, use a safe sequence instead: add the
   compatible form, migrate callers, then retire the old form. State where
   integration verification is required.
3. Present a numbered breakdown: **title, outcome, acceptance evidence, blocked by**.
4. Obtain approval for the breakdown through the main skill's review step.
5. Once publication provides real identifiers, verify approved native dependency
   relationships. If unsupported, describe the dependencies in the issues and
   report the native-link limitation. Preserve the existing parent issue.
