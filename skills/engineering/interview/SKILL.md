---
name: interview
description: Resolve open decisions through question rounds until the agreed scope and consequential edge cases are covered, then return accepted decisions to triage or an Interview issue run by implement.
disable-model-invocation: true
---

# Resolve decisions by interview

Explore every decision branch within the agreed scope, including consequential
edge cases, until the user and agent share an understanding. A draftable result
is not evidence that the interview is complete. Return the result to the caller.
`triage` runs it to define new work; `implement` runs it for an Interview issue.
The caller owns drafting, publication, and issue status.

A question is for the user only when it asks a **consequential decision**: a choice
whose answer changes an issue's type, scope, acceptance criteria, structure, or
blocking relations. Facts available in the repository, Linear, linked records, or
documentation are looked up, never asked. Every other choice is routine and stays
with implementation.

## 1. Establish the questions

1. Read the caller's input: open questions, evidence gathered, the issue when there
   is one, and the resume point. Read relevant code, tests, and linked records.
2. Separate discoverable facts from decisions that need the user. Inspect facts
   directly; when useful, delegate a bounded read-only question with required
   evidence and verify the result while continuing independent questions.
3. Map the decisions and their dependencies within the agreed scope. Treat the
   caller's initial questions as a starting point, not a complete inventory. Mark
   branches still to explore and assumptions that could hide a consequential choice.

**Done:** scope, initial decision branches, and evidence gaps are identified.

## 2. Resolve decisions in short rounds

Keep one working record: accepted decisions, explored and unexplored branches,
open questions and prerequisites, consequential assumptions, missing evidence,
exclusions, and resume point. The **frontier** contains questions whose
prerequisites are settled; an empty frontier can mean blocked branches, not completion.

1. Choose the independent frontier questions that could change the agreed work,
   and ask all of them in the same round. There is no minimum or maximum
   number per round; ask one at a time only when the user asks for it. Resolve
   outcome and scope before the behavior and design choices that depend on them.
2. Ask using the style and delivery rules below; wait for answers.
3. Retain partial answers and keep unanswered decisions open. Trace each answer's
   consequences and newly reachable branches, then recompute the frontier. Revisit
   accepted choices only when new evidence affects them.
4. When the user leaves a decision to the agent ("you choose"), choose one option and
   record it as accepted, marked as the agent's recommendation with its reason:
   `Agent recommendation (delegated by the user): <choice>, because <reason>.`
   The mark stays in every record that carries the decision.
5. Before ending, review every in-scope branch using the coverage checks below.
   Turn each newly found consequential gap or assumption into a question and
   continue the rounds. Neither a draftable result nor a fixed number of rounds
   ends the interview.
6. When every in-scope branch has been reviewed and no consequential decision or
   evidence gap remains, summarize the accepted behavior and exclusions and ask
   the user to confirm the shared understanding. If feedback reveals a gap, reopen
   the affected branch and continue. This confirmation does not authorize the
   caller's publication or implementation.

### Coverage before completion

Walk through the normal scenario and relevant edge cases against the accepted
decisions. Use the following prompts where the agreed work makes them relevant,
not as a mandatory questionnaire for every request:

- Who can act, under what conditions, and what inputs or states are valid? What
  happens at empty, missing, invalid, or boundary values?
- What happens when an operation fails, is interrupted, canceled, repeated, or
  overlaps another operation? What is retained, undone, retried, or recoverable?
- How do accepted choices interact with existing behavior, permissions, data,
  external dependencies, and compatibility obligations? Do any choices conflict?
- What observable result distinguishes success from failure in these scenarios?

Look up behavior already established by evidence. Ask only when the remaining
choice meets the consequential-decision rule. Leave routine choices to
implementation and record explicit exclusions as out of scope; neither needs extra
questions. A newly discovered out-of-scope concern is returned as follow-up work,
not silently added to this interview.

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
  cost could change. Ask consequential choices in plain language; leave routine
  choices to implementation.

### Question style

These rules cover questions, choices, and accompanying explanations only:

- Use the user's language, everyday words, and one short question per decision.
  Split distinct choices (such as player experience and platform) into separate
  questions, even when they fit in one sentence.
- Ask about behavior and consequences, keeping implementation mechanisms in analysis.
- Keep choices short and neutral. Add an example or a term explanation when the
  question needs it. Never add a recommendation or mark a preferred option: a
  question the agent could settle by research is a fact to look up, not a decision.
  A recommendation appears only after the user delegates the decision (step 2.4).
- Test contradictions and consequential failures with concrete situations.
- Rephrase an unclear question before advancing.
- Treat user preferences as decisions; silence is not an answer.

Example: "If you delete a task by mistake, should you be able to restore it?"

### Question delivery

Present the questions directly in the conversation. Number independent questions
in one message, then wait for the user's answers. Keep a question whose answer
depends on another unanswered question for a later round. If the user answers
only some, keep the rest open for the next round.

**Done:** all in-scope branches and relevant consequential edge cases are reviewed,
their choices are accepted, and the user confirms the shared understanding.
**Waiting:** a user decision or final confirmation is unanswered.
**Blocked:** an answer needs substantial research or observed behavior; record its
question, prerequisites, and stopping evidence as a need for the caller, and continue
independent questions.
**Stopped by the user:** preserve open branches and the resume point; return the
partial result without claiming completion.

## 3. Return the result

Return to the caller: accepted decisions and their consequences, accepted domain
meanings, remaining open questions, research or observation needs, and follow-up
work identified. `triage` puts them in its draft; `implement` records them in the
Interview issue and carries them into its follow-up work.

**Handoff complete:** each branch has accepted decisions, an explicit open status,
or a returned need. State whether the interview completed, is blocked by evidence,
or was stopped by the user; a partial handoff is not a completed interview.

## Resume

Recover accepted decisions, explored and unexplored branches, open questions,
consequential assumptions, evidence gaps, and the resume point from the caller's
record or conversation. Recompute the frontier and continue there.
