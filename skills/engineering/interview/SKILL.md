---
name: interview
description: Resolve open decisions through question rounds until the agreed scope and consequential edge cases are covered, then return accepted decisions to triage, or to implement for an Interview issue or the issue it executes.
disable-model-invocation: true
---

# Resolve decisions by interview

Explore every decision branch within the agreed scope, including consequential
edge cases, until the user and agent share an understanding. A draftable result
is not evidence that the interview is complete. Return the result to the caller.
`triage` runs it to define new work; `implement` runs it for an Interview issue or
for a decision inside the issue it executes. The caller records the result and owns
issue status; only `triage` drafts executable issues.

A question is for the user only when it asks a **consequential decision**: a choice
whose answer changes an issue's type, scope, acceptance criteria, structure, or
blocking relations. Facts available in the repository, Linear, linked records, or
documentation are looked up, never asked. Every other choice is routine and stays
with implementation.

## 1. Establish the questions

1. Read the caller's input: open questions, evidence gathered, the issue when there
   is one, and the resume point. Read relevant code, tests, and linked records.
2. Separate discoverable facts from decisions that need the user. Inspect facts
   directly, or delegate a bounded lookup when useful, while continuing
   independent questions.
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
2. Ask them as described in [Questions](#questions); wait for answers.
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
questions. A newly discovered out-of-scope concern is returned as an out-of-scope
finding, not silently added to this interview.

### Domain meaning

- Establish what the project does, for whom, and the relevant concepts. Resolve an
  ambiguous meaning with a scenario: does closing an account end access, billing, or both?
- Separate current behavior from intended behavior; resolve conflicting pending
  changes with the user.
- Keep one accepted term per concept **within its context**. When the project has
  several contexts, establish which one each term belongs to. A term that means
  something else in another context keeps both meanings; how they meet at the
  boundary between the two contexts is a decision.
- Preserve public names and contracts. Terminology agreement does not authorize
  code renaming.

### Design choices

- Trace callers, responsible modules, dependencies, and tests. Describe caller-facing
  contracts: inputs, results, errors, ordering, invariants, in project vocabulary.
- Prefer small interfaces containing complexity; justify a new abstraction by a
  concrete variation or constraint.
- Compare design alternatives only when outcome, compatibility, testability, or
  reversal cost could differ; these differences become the options' tradeoffs.
  Leave routine choices to implementation.

### Questions

Put the independent questions of a round in one message, inside a single `text`
code block, with lines wrapped at about 80 characters so the block reads without
horizontal scrolling, then wait for the user's answers. Keep a question whose
answer depends on another unanswered question for a later round. If the user
answers only some, keep the rest open for the next round.

Write each question as three parts:

1. `<n>.` then one short question, numbered within the round.
2. `Context:`, labeled in the user's language, then a plain explanation, free of
   technical terms, that lets someone outside the project understand the subject
   and what is at stake: what each option provides and what it costs the user or
   the project, such as effort, speed, maintenance, compatibility, reversal cost,
   or the choices it closes. Add a concrete example when it makes the stakes
   clearer. Omit the context only when the option labels make their consequences
   evident.
3. The options as a lettered list of short labels (a, b, c), so the user can
   answer with references such as `1b` (question 1, option b).

These rules apply to what the user reads: questions, context, and options.

- Use the user's language, everyday words, and one question per decision. Split
  distinct choices (such as player experience and platform) into separate
  questions, even when they fit in one sentence.
- Ask about behavior and consequences, keeping implementation mechanisms in analysis.
- Base each consequence on the evidence gathered and mark an uncertain one as such.
- Describe the options at the same depth and leave the choice to the user without
  ranking them: an option the agent could prove best by research makes the question
  a fact to look up, not a decision. A recommendation appears only after the user
  delegates the decision (step 2.4).
- Test contradictions and consequential failures with concrete situations.
- Rephrase an unclear question before advancing.
- Treat user preferences as decisions; silence is not an answer.

Example:

```text
1. If you delete a task by mistake, should you be able to restore it?

Context: Restoring makes a mistake cost nothing, but deleted tasks stay stored and
need a place in the interface where they can be found. Permanent deletion keeps
the interface simple and frees the data at once, but a mistake is final.

a. Allow restoring deleted tasks
b. Delete tasks permanently
```

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
meanings, remaining open questions, research or observation needs, follow-up work
the decisions inform, and out-of-scope findings kept apart from that follow-up
work. `triage` puts the decisions and needs in its draft and reports out-of-scope
findings as candidate requests. `implement` records them in the issue it executes
and, for an Interview issue, in the existing issues they inform; it leaves work
that no issue covers to a later `triage` run.

**Handoff complete:** each branch has accepted decisions, an explicit open status,
or a returned need. State whether the interview completed, is blocked by evidence,
or was stopped by the user; a partial handoff is not a completed interview.

## Resume

Recover accepted decisions, explored and unexplored branches, open questions,
consequential assumptions, evidence gaps, and the resume point from the caller's
record or conversation. Recompute the frontier and continue there.
