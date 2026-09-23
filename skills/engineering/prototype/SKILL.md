---
name: prototype
description: Resolve a bounded design or feasibility question through an observable experiment. Use for authorized interface, logic, or technical exploration, including prepared Prototype issues; not settled implementation or source-only research.
---

# Prototype a decision

Build the smallest experiment that answers the question, in a representative
environment. A prototype produces evidence for a decision, not a production feature.

## 1. Resume and bound the experiment

1. Read the request, project instructions, and existing issue or interview record,
   including accepted choices, prerequisites, and evidence. Reuse settled framing.
2. Follow project conventions to consult relevant domain definitions, pending accepted
   changes, and system contracts. Resolve consequential conflicts; distinguish
   experimental assumptions from accepted meanings and implemented behavior.
   Missing conventions call for targeted clarification, not automatic project setup.
3. Establish question, scope/exclusions, scenarios, constraints, decision owner,
   stopping evidence, and where the interview resumes. Distinguish a measured fact
   from a preference requiring the owner's judgment.
4. Verify execution authorization, access, and representative inputs. A prepared
   brief or a ready label alone does not authorize building or external writes.

| Request | Action |
| --- | --- |
| Choice requires observing behavior | Prepare/run the bounded experiment within authorization |
| Only source evidence is missing | Return a research prerequisite rather than build a demonstration |
| Behavior already settled | Propose implementation; do not reopen design for ceremony |
| Preparation only, read-only mode, or unmet prerequisite | Retain the experiment brief and name what is pending |

**Done:** question, stopping condition, owner, and execution scope established.
**Blocked:** preserve the missing decision/evidence and continue only independent,
authorized preparation.

## 2. Choose the environment and isolate the work

1. Inspect runtime, assets, inputs, components, and verification tools. Reuse the
   smallest environment preserving the behavior under test; isolated logic cannot
   establish real physics, rendering, device interaction, or production performance.
2. Before building, follow [retention and handoff](references/retention-and-handoff.md)
   to establish the dedicated branch and preserve the prepared checkout.
3. Identify simulated data, temporary resources, and persistent effects. Isolate the
   experiment from ordinary use; preserve security and access controls.
4. Select only the procedures needed:

   | Question | Reference |
   | --- | --- |
   | Appearance, organization, interaction | [Interface comparison](references/interface.md) |
   | Rules, data shape, state transitions | [Logic scenarios](references/logic.md) |
   | Integration, physics, capacity, performance | [Technical evidence](references/feasibility.md) |

**Done:** representative environment, isolation, branch, and experimental limits clear.
Unavailable tools or unsafe conditions remain blockers, not invented capabilities.

## 3. Build and exercise the experiment

1. Build only the accepted scope, with the minimum variants needed to answer the
   question. One model can suffice; comparisons need meaningful alternatives.
2. Record entry point, dependencies/configuration, initial data, actions, reset,
   expected observations, and limitations with the experiment.
3. Run startup, representative scenarios, reset/selection where relevant, and
   isolation checks yourself before presenting it.
4. Use focused tests or measurements when they protect the question. Neither a full
   production suite nor a blanket ban on tests is appropriate for every prototype.

**Done:** another person can repeat the demonstrated steps and inspect the evidence.
**Unresolved:** observations are missing or inconclusive; name the gap rather than
claim the question answered. Negative results are valid evidence.

## 4. Review the evidence and obtain the decision

1. Provide the runnable artifact or supported review surface and keep it available.
   Screenshots or video supplement interaction, not replace it when interaction is
   the question. Label simulation, assumptions, measured facts, and untested claims.
2. Present observations and trade-offs to the decision owner. Ask only for open
   judgments; do not ask the user to decide an already measured fact.
3. Record accepted/rejected behavior and remaining uncertainty against the reviewed
   version. Later changes require renewed validation of affected conclusions.

**Done:** the question is answered by evidence and any required judgment is accepted.
**Waiting:** owner judgment remains open; preserve the artifact and resume point.
A demonstrated failure may conclude the experiment without authorizing a new design.

## 5. Preserve and return

Follow [retention and handoff](references/retention-and-handoff.md) for the reviewed
commit, authorized remote publication, and updates to the existing Linear record.

Return the result, artifact/version, decision or unresolved question, limitations,
and next action to the interview or originating task. Stop exploration at its
evidence target. Product implementation needs its own request and ordinary verification;
prototype approval does not establish production reliability.

**Done:** evidence retained, required publication verified, and handoff usable.
**Pending:** distinguish accepted decision, local artifact, remote availability, and
tracker synchronization; name exact remaining operations instead of claiming completion.
