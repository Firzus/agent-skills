---
name: interview
description: Prepare approved Linear work briefs through a continuous interview, with progressive framing for large goals.
disable-model-invocation: true
---

# Interview before implementation

Prepare the next useful work, reusing accepted answers and existing artifacts.

| Boundary | Rule |
| --- | --- |
| Product implementation or bug fix | Requires a separate execution request |
| Research or prototype during preparation | Requires explicit scope; return findings to this interview |
| Repository context | Prepare changes in the issue; deliver them during implementation |
| Read-only or planning mode | Keep drafts in the conversation; defer all writes |

## 1. Establish the starting point

1. Read the request, project instructions, relevant code/tests, and existing work.
   Include linked issues' comments and evidence; reuse equivalent capabilities,
   issues, and decisions.
2. Read [domain context](references/domain-context.md) to reconcile integrated
   definitions with relevant accepted changes still pending.
3. Identify audience, problem, outcome, exclusions, current behavior, and unknowns.
   Resolve repository and Linear destination from evidence; ask only for gaps.
   With no existing code, label technical assumptions unverified.
4. For a defect, run safe existing checks against the reported steps. Record
   reproduction steps, expected/actual behavior, checked conditions, and verdict: reproduced,
   not reproduced here, or insufficient evidence. An unsuccessful reproduction
   leaves the report open; propose bounded diagnosis rather than guessing a cause.
5. For multiple outcomes or delivery/review limits that may be exceeded, use
   [large work](references/large-work.md) before drafting an execution issue.

**Done:** starting point and existing work identified; missing facts separated
from user decisions. Inaccessible evidence blocks only dependent preparation.

## 2. Resolve decisions in short rounds

Keep one working record: accepted decisions, open questions and prerequisites,
missing evidence, exclusions, and resume point. The **frontier** contains questions
whose prerequisites are settled.

1. Choose the independent frontier questions that could change the next result.
   Ask them in the same round; use one when only one is ready or the user prefers
   a slower pace. Resolve outcome/scope before dependent behavior/design choices.
2. Inspect discoverable facts. When useful, delegate a bounded read-only question
   with required evidence; verify the result while continuing independent questions.
   Without delegation, inspect directly and report actual access limits.
3. Ask using the style and delivery rules below; wait for answers.
4. Retain partial answers, keep unanswered decisions open, and recompute the frontier.
   Revisit accepted choices only when new evidence affects them.
5. Before another round, check whether the next result can be drafted. Ask only
   what could change scope, evidence, feasibility, or readiness; leave routine
   execution details to implementation.

| Additional need | Reference |
| --- | --- |
| Changed domain meaning or durable rationale | [Domain context](references/domain-context.md) |
| Broad goal, Linear structure, milestones | [Large work](references/large-work.md) |
| Design, research, prototype, access prerequisite | [Design and uncertainty](references/design-and-uncertainty.md) |

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
Final artifacts retain technical precision and the project's artifact language.

### Question delivery

Present the questions directly in the conversation. Number independent questions
in one message, then wait for the user's answers. Do not include a question whose
answer depends on another unanswered question in that round. If the user answers
only some, keep the rest open for the next round.

**Done:** consequential choices for the selected preparation result are accepted.
**Waiting:** a user decision is unanswered.
**Blocked:** evidence or an experiment is needed; record its question, prerequisites,
stopping evidence, and return point. Prepare that investigation or continue independent
questions. A ready experiment need not have answered its own research question.

## 3. Draft and obtain approval

1. Synthesize settled answers without restarting the interview.
2. Use [routing and the issue contract](references/issue-contract.md#choose-the-next-work)
   for the next bounded work; use [large-work framing](references/large-work.md)
   for a broad goal. Write for someone without this chat. A valid result may be
   an investigation brief, not a ready product implementation.
3. Present the draft, readiness, and proposed structure. Obtain approval of content,
   publication action, destination, and any project, document, issues, or milestones.
4. Apply feedback only to affected decisions and passages.

**Done:** content and breakdown approved. Otherwise retain the draft. An investigation
can be approved independently of the blocked implementation it informs.

## 4. Publish and hand over

1. Check approval, destination, write permissions, and actual Linear tool schemas.
2. Re-read existing records before updates; preserve concurrent and unrelated content.
   Use verified team states/labels. Create approved work in Backlog unless it is
   selected for near-term execution with prerequisites resolved; then use Todo.
   Preparation does not authorize issue closure.
3. Publish approved containers/documents, then issues and relationships using returned
   identifiers. Verify content, destination, memberships, and relations.
4. After a partial or uncertain write, inspect before retrying; retain confirmed IDs
   and name pending operations.
5. Return named links, readiness/blockers, pending context changes, and the selected
   resume skill. Stop before executing handed-off work: publication grants no execution
   authorization. Authorized research/prototypes may return to this interview.

**Done:** publication verified and handoff usable.
**Pending publication:** return the approved draft and exact remaining operation;
retain Linear as the destination rather than creating another backlog.

## Resume

Recover accepted decisions, evidence, open questions, and the resume point from
the existing authorized record or conversation. Continue there; a new conversation
is optional.
