# Keep the work in Linear

Linear is the memory of all Issue-size and Project-size work: a session that
starts from an issue or a project, with no conversation history, must find there
what was agreed, what was learned, and what comes next.

## Reach Linear first

Before reading or writing Linear for Issue-size or Project-size work, check that its tools
respond by listing the user's teams. When they do not, stop before any change
and tell the user what is blocked and how to restore access (connect or
authenticate the Linear integration). Direct work continues without Linear. When
access fails in the middle of a unit, commit the local work, stop, and list the
Linear updates still to make.

## Workspace conventions

Read the team, labels, and statuses from Linear rather than assuming them, and
take the team and product from the project instructions or existing projects.

| Record | Labels |
| --- | --- |
| Issue | Exactly one label of the Type group: Task, Bug, Research, Prototype, or Interview |
| Project | Exactly one Product label, from the project-label group, resolved from the repository and existing projects |
| Captured work | Need triage, the Type that marks work not yet sorted; sorting replaces it with the issue's type |

Use labels that exist and are active; a missing label or group is a workspace
change to propose to the user, not to create silently. Write issues in the
language of the team's existing issues.

## Issue content

Write for a reader who has neither this conversation nor the current code in
mind. Describe behavior, not procedure: no file paths or line numbers, which go
stale while the issue waits; name the types, interfaces, and contracts instead.
A snippet from a prototype may stay when it states a decision more precisely
than prose (a schema, a state machine); say where it came from.

Task or Bug:

```markdown
## Current behavior
What happens now: the faulty behavior for a Bug, the starting point for a Task.

## Expected behavior
What happens after the change, including edge cases and errors.

## Decisions and key interfaces
- <Decision or interface>: <choice>, because <reason>. (<user / agent>)

## Acceptance criteria
- [ ] <Independently verifiable criterion>

## Out of scope
- <Excluded behavior or work>
```

Research, Prototype, or Interview:

```markdown
## Question
The one question this issue answers.

## Decision it informs
The decision or the work waiting on the answer.

## How the answer is judged
Research: the evidence that would settle it. Prototype: the scenarios to observe
and the threshold or the user's judgment that ends it. Interview: the inputs the
decision needs and who takes it.
```

## Statuses and relations

You keep the statuses current:

| Moment | Status |
| --- | --- |
| Issue created for later | Todo |
| Work starts on it | In Progress, assigned to the user |
| Pull request opened | In Review |
| Merged, or the question answered | Done |
| Postponed by the user | Backlog, with a comment giving the reason and where its work stands |
| No longer needed | Canceled, with a comment giving the reason |
| Covered by another issue | Duplicate of it |

A prerequisite is a native blocking relation. A blocked issue keeps its status,
and a comment says what it waits on and who must act. Create issues before
wiring their relations, so each relation points at a real identifier.

## Results

A Research, Prototype, or Interview issue closes with a result comment, then
Done:

- **Answer:** the decision or finding, in one or two sentences.
- **Evidence:** what supports it, readable by anyone with access to Linear and
  the repository. Summarize a local research dossier rather than link its local
  path; give a prototype's pushed branch and exact commit, how to run it, and
  what was observed, and say when the branch stayed local and why.
- **Remaining uncertainty:** what is still unknown or untested.
- **Consequences:** the issues created, changed, or unblocked by the answer.

A negative result is a valid answer: record what was tried and why it failed, so
no later session repeats it.

## Captured work

Work noticed outside the agreed scope is never built in the current change. Ask
the user whether to capture it; on their yes, create an issue in Backlog with
the Need triage type, stating what was observed, where in the product, and
why it may matter. Inside a project, captured issues belong to it and are sorted
at the next [take-stock](project.md#take-stock); elsewhere, list them for the
user to sort.

## Writes

The agreement message lists the Linear writes it covers: issues to create or
update, statuses, relations, comments. The user's yes covers those and nothing
else; a project's agreement also covers the routine writes of its current goal
that [project](project.md#shape-the-project) lists. When a decision taken during
the work changes what an issue states, update its text before handing over the
change, so the issue describes what ships. Re-read an item before
updating it, keep other people's content, and read it back after writing. After
an uncertain write, check what happened before retrying. Never delete an issue
or a project; cancel it with a reason.
