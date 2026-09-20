---
name: prototype
description: Resolve a bounded conception question with a runnable prototype of an interface, logic or state model, or technical feasibility. Use for requested exploration or choices that require observation; not a settled implementation or a source-only factual lookup.
---

# Prototype a decision

Build only the experiment needed to decide. Use the product's environment rather than prescribing a web page, engine, or file format.

## 1. Bound the question

Record the primary objective, the unresolved question, relevant constraints, representative scenarios, stopping evidence, and return point in the existing task record. Identify who decides and whether the question needs user judgment or measured evidence.

Read the relevant domain definitions in root CONTEXT.md and contracts in docs/systems before designing scenarios that depend on them. Keep experimental assumptions separate from accepted terminology and implemented behavior.

A settled correction belongs to implementation. Do not reopen an approved choice merely to generate alternatives.

**Done when:** the experiment can answer a specific question and has an observable stopping condition.

## 2. Select the representative environment

Inspect runtime, assets, inputs, existing components, and verification tools. Use the smallest environment that preserves the behavior being studied. Isolated logic cannot establish engine physics, device interaction, rendering, or production performance.

Choose the applicable reference, combining branches only when the question requires it:

| Question | Procedure |
| --- | --- |
| Appearance, organization, or interaction | [Interface comparison](references/interface.md) |
| Rules, data shape, or state transitions | [Logic scenarios](references/logic.md) |
| Integration, physics, capacity, or performance feasibility | [Technical evidence](references/feasibility.md) |

Identify simulated data, temporary resources, and persistent effects. Reuse project conventions; isolate writes and keep exploratory resources out of delivery. Preserve security and access controls.

**Done when:** the selected environment and branch fit the question, and their limits and isolation are explicit.

## 3. Execute the comparison or scenarios

Build the bounded experiment. Record its entry point, required environment, configuration, initial data, actions, and expected observations. Run those steps yourself before presenting it: startup, selection or reset, representative cases, and isolation from ordinary use.

Use checks or measurements when they protect the question being tested; neither a full production test suite nor a blanket ban on tests fits every prototype.

**Done when:** the question has observed evidence or explicit missing evidence, and someone else can repeat the demonstrated steps.

## 4. Obtain the decision and return

Provide the runnable artifact or supported review surface and keep it available. Screenshots and recordings supplement execution, not interactive review when interaction is the question. Label prototype, simulation, assumptions, measured facts, and untested expectations.

Present the evidence to the decision owner. Ask only for unresolved choices requiring judgment; do not ask the user to decide an already measured fact. Record the accepted behavior, rejected alternatives, and uncertainty, then stop exploration.

Preserve useful evidence in the existing record before previewing removal of task-owned temporary artifacts. Production implementation requires its own authorized scope and ordinary verification; prototype approval does not prove production correctness.

**Done when:** the bounded question is answered or its blocker is reported, the decision and evidence are retained, and work returns to the primary objective.
