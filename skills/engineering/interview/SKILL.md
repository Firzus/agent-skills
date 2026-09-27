---
name: interview
description: Resolve open decisions through short rounds of questions and return the accepted decisions to the calling workflow, triage or an Interview issue run by implement.
disable-model-invocation: true
---

# Resolve decisions by interview

Ask the questions that settle open decisions, then return the result to the caller.
`triage` runs it to define new work; `implement` runs it for an Interview issue.
The caller owns drafting, publication, and issue status.

## 1. Establish the questions

1. Read the caller's input: open questions, evidence gathered, the issue when there
   is one, and the resume point. Read relevant code, tests, and linked records.
2. Separate discoverable facts from decisions that need the user. Inspect facts
   directly; when useful, delegate a bounded read-only question with required
   evidence and verify the result while continuing independent questions.

**Done:** the decisions that need the user are identified.

## 2. Resolve decisions in short rounds

Keep one working record: accepted decisions, open questions and prerequisites,
missing evidence, exclusions, and resume point. The **frontier** contains questions
whose prerequisites are settled.

1. Choose the independent frontier questions that could change the caller's next
   result. Ask them in the same round; use one when only one is ready or the user
   prefers a slower pace. Resolve outcome/scope before dependent behavior/design choices.
2. Ask using the style and delivery rules below; wait for answers.
3. Retain partial answers, keep unanswered decisions open, and recompute the frontier.
   Revisit accepted choices only when new evidence affects them.
4. Before another round, check whether the caller's next result can be drafted. Ask
   only what could change scope, evidence, feasibility, or readiness; leave routine
   execution details to implementation.

### Domain meaning

- Establish what the project does, for whom, and the relevant concepts. Resolve an
  ambiguous meaning with a scenario: does closing an account end access, billing, or both?
- Separate current behavior from intended behavior; resolve conflicting pending
  changes with the user.
- Keep one accepted term per concept **within its context**; preserve distinct meanings
  across contexts and public names/contracts. Terminology agreement does not authorize
  code renaming.

### Design choices

- Trace callers, responsible modules, dependencies, and tests. Describe caller-facing
  contracts: inputs, results, errors, ordering, invariants, in project vocabulary.
- Prefer small interfaces containing complexity; justify a new abstraction by a
  concrete variation or constraint.
- Compare alternatives only when outcome, compatibility, testability, or reversal
  cost could change. Obtain consequential choices in plain language; leave routine
  internals to implementation.

### Question style

These rules cover questions, choices, and accompanying explanations only:

- Use the user's language, everyday words, and one short question per decision.
  Split distinct choices (such as player experience and platform) into separate
  questions, even when they fit in one sentence.
- Ask about behavior and consequences, keeping implementation mechanisms in analysis.
- Keep choices short; add an example, necessary term explanation, or justified
  recommendation only when helpful.
- Test contradictions and consequential failures with concrete situations.
- Rephrase an unclear question before advancing.
- Treat user preferences as decisions; silence is not an answer.

Example: "If you delete a task by mistake, should you be able to restore it?"

### Question delivery

Present the questions directly in the conversation. Number independent questions
in one message, then wait for the user's answers. Keep a question whose answer
depends on another unanswered question for a later round. If the user answers
only some, keep the rest open for the next round.

**Done:** consequential choices for the caller's next result are accepted.
**Waiting:** a user decision is unanswered.
**Blocked:** an answer needs substantial research or observed behavior; record its
question, prerequisites, and stopping evidence as a need for the caller, and continue
independent questions.

## 3. Return the result

Return to the caller: accepted decisions and their consequences, accepted domain
meanings, remaining open questions, research or observation needs, and follow-up
work identified. `triage` puts them in its draft; `implement` records them in the
Interview issue and carries them into its follow-up work.

**Done:** each question has an accepted answer, an explicit open status, or a returned need.

## Resume

Recover accepted decisions, open questions, and the resume point from the caller's
record or conversation, and continue there.
