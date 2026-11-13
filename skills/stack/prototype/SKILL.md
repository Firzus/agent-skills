---
name: prototype
description: Use when a design or feasibility decision needs observed behavior, such as comparing interface variants, exercising domain rules, or measuring a technical limit. Not for building the settled feature or for a question that sources can answer.
---

# Prototype a decision

Build the smallest experiment that answers one question in a representative
environment. A prototype produces evidence for a decision, not a production
feature, and its approval says nothing about production reliability.

## 1. Bound the question

State the question, the decision it informs, the scenarios to observe, and the
evidence that will end the experiment. Separate what can be measured, which you
settle yourself, from what needs the user's judgment, such as which variant feels
clearer. If source evidence alone would answer it, research instead; if the
behavior is already settled, show the evidence and stop.

## 2. Build it where it counts

Reuse the real product, components, and data shape as far as the question needs:
isolated logic cannot show real rendering, device interaction, or performance.
Work on a dedicated branch, `prototype/<subject>`. Run it on a copy of the data
or on fixtures, with external services simulated, and label every simulated
dependency.

| Question about | Build and observe |
| --- | --- |
| Appearance, organization, interaction | Variants that differ in structure or primary interaction, in the real surroundings with representative content, compared under the same data; include empty, error, and narrow-screen states |
| Rules, data, state transitions | A small harness with a reset, a normal scenario, a scenario that could break the model (ordering, repetition, boundary), and a rejected operation |
| Integration, capacity, performance | A measurable claim with a threshold set before measuring, a baseline, one changed variable, and repeated runs with their spread |

## 3. Show and record

Show the experiment running, with how to start and reset it, present the
observations and trade-offs, and ask only for the judgments the experiment
defines. A negative result is a valid answer.

Commit the reviewed version. Push its branch, so the recorded commit can be
reached from any session, only when `/work`'s agreement covers the push or the
user says yes to the push itself, never as a pull request; otherwise the branch
stays local and the record says so. Record the question, the exact commit, how
to run it, what was observed, the user's judgment, and what remains untested.
When `/work` runs it as a Linear issue, return this record and `/work` posts it
on the issue.
Keep the prototype branch after the decision; the implementation reuses parts of
it deliberately, never by merging it whole.

**Done:** the question is answered by observed evidence and the judgments it needed
are given. **Waiting:** the user's judgment is open; keep the experiment running.
