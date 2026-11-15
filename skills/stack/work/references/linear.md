# Keep the work in Linear

## Workspace conventions

Read the team, labels, and statuses from Linear rather than assuming them, and
take the team and product from the project instructions or existing projects.

| Record | Labels |
| --- | --- |
| Issue | Exactly one label of the Type group: Task, Bug, Research, Prototype, or Interview |
| Project | Exactly one Product label, from the project-label group, resolved from the repository and existing projects |
| Captured work | Need triage, the Type that marks work not yet sorted; sorting replaces it with the issue's type |

A project's name states its outcome without its Product label, which Linear
already shows beside it: "UI runtime chain of Core", not "Studio: UI runtime
chain of Core".

Use labels that exist and are active; a missing label or group is a workspace
change to propose to the user, not to create silently. Write issues and
projects in the language of the team's existing issues, section headings
included; this stack names sections by their English headings. Reuse the
headings the team's records already use, so each section keeps one name.

## Issue content

Write a Task or Bug from [task-or-bug](../templates/task-or-bug.md), and a
Research, Prototype, or Interview issue from [question](../templates/question.md).
Drop a section that does not apply, such as Reproduction for a Task or an empty
Agent notes.

- Describe behavior above Agent notes: name the types, interfaces, and contracts,
  so the person who agrees to the issue can judge it. A snippet from a prototype
  may stay when it states a decision more precisely than prose (a schema, a state
  machine); say where it came from.
- Each acceptance criterion names the test, command, or scenario that shows it,
  so the build session can check it rather than stop when the work looks done.
- Agent notes, the collapsible section at the end, holds starting points that a
  session would otherwise spend time finding: a module, a symbol, a file path, a
  test, or a command. They are hints the session checks before relying on them,
  since paths move while the issue waits; no line numbers, and no criterion or
  decision depends on them.

## Statuses and relations

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
and a comment says what it waits on and who must act.

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

Capture work noticed outside the agreed scope, including defects already
there, without asking: create an issue in Backlog with the Need triage type,
stating what was observed, where in the product, and why it may matter, unless
an open issue already covers it. Inside a project, captured issues belong to it
and are sorted at the next [take-stock](project.md#take-stock); elsewhere, the
final report names them for the user to sort. In Direct work, or when Linear is
unreachable, the final report names each item as not captured instead.

## Writes

The user's yes covers the Linear writes its agreement lists and the captures
above, and nothing else; a project's agreement also covers the routine writes of its current goal that
[project](project.md#shape-the-project) lists.

An issue's text is never rewritten, so it keeps what was agreed: an update only
adds to it, such as a result or a decision taken during the work, and any other
change to what it states goes into a new issue, of which the original becomes a
Duplicate. Keep other people's content, and never delete an issue or a project:
cancel it with a reason.
