# Run a project in Linear

A project cannot be planned to its end at once: unknowns surface, results change
the plan, and the user is not always there to decide. It advances in units, from
one current goal to the next, and returns to the project to take stock whenever
what it learned changes the way ahead. The Linear project is its memory; every
session starts from it, never from conversation memory.

## Shape the project

The first session turns an idea into a project and its first units.

1. Search Linear for projects and issues with the same outcome, and reuse them
   rather than duplicate them.
2. Settle with `interview` the decisions that can be taken now. Name the final
   goal and its success criteria first: they fix the scope.
3. Choose the current goal: the furthest observable result reachable with what
   is known now. Unknowns that block it become Research, Prototype, or Interview
   issues; work that can be detailed becomes Task or Bug issues; what cannot be
   phrased as a precise question yet stays in "Not yet specified". Do not detail
   work beyond the current goal.
4. Propose the project record below and the list of issues: for each, its title,
   type, what it delivers or asks, and what blocks it; for a Research issue,
   whether it is a direct lookup or a delegated investigation. Ask whether the
   granularity and the blocking relations are right.
5. On the user's yes, create the project with its Product label and the record
   as its description (not its summary), the issues in Todo with their content
   (see [linear](linear.md#issue-content)), then the blocking relations, and
   read them back.
6. Write "Resume here" with the first unit, and stop: each unit runs in a
   session of its own, as [Drive the project](#drive-the-project) describes.

The yes to the project, and to each later take-stock, also covers the routine
Linear writes of its current goal: claiming and updating its issues and
statuses, result and progress comments, updates to the record, and, inside the
current goal, the Research, Prototype, or Interview issues and blocking
relations an unknown requires, and the split of a unit that turns out too large.
Changing the current goal, adding work beyond it, and canceling or retyping an
issue wait for the next take-stock.

```markdown
## Final goal
What exists at the end, for whom, and why it matters.

## Success criteria
- <Observable signal that the final goal is reached>

## Constraints
Limits of time, resources, platform, or compatibility that every unit respects.

## Current goal
The result the open issues deliver together, how it will be shown, and when it
was set with how many issues.

## Decisions so far
- <Gist of the decision> ([issue or source](link))

## Not yet specified
- <In-scope area or question not precise enough to become an issue yet>

## Out of scope
- <Excluded work, and why>

## Resume here
Where the next session starts, what it waits on, and who must act. Facts verified;
anything inferred is marked as such.
```

A decision lives in one place, its issue or source; "Decisions so far" is an
index that links to it.

## Units

Every issue is one unit, sized as the stack's opinion on units states; a unit
that would exceed it is split before it starts.

| Type | Run it with | Needs the user |
| --- | --- | --- |
| Task, Bug | [Steps 4 to 6](../SKILL.md#4-build-test-first) of the workflow, after reading the context it touches; a Bug whose cause is not established goes through `debug` first. The project's agreement covers its build | For review, shipping, and any human check |
| Research | A direct lookup, or [`../../research/SKILL.md`](../../research/SKILL.md) for a delegated investigation; one the user has not agreed to as delegated waits for their yes | Only to agree a delegated investigation |
| Prototype | [`../../prototype/SKILL.md`](../../prototype/SKILL.md) | For the judgment the experiment defines |
| Interview | [`../../interview/SKILL.md`](../../interview/SKILL.md) | Yes |

Claim a unit before working on it: In Progress, assigned, with a comment naming
its branch, so a parallel session skips it. When a Research or Prototype result
leads to a decision and the user is present, take that decision in the same
session rather than wait for an Interview issue; an Interview issue exists only
for a decision deferred to later or to someone else. Record each result as
[linear](linear.md#results) describes and add each decision to "Decisions so
far". A finished Task or Bug asks to ship in its own session; until the user
answers, it stays In Progress, listed in "Resume here".

## Drive the project

When the user runs `/work` on the project or one of its issues, the session
runs one unit or one take-stock:

1. Reconcile the record with Linear and Git (statuses, merged pull requests,
   open branches, results not yet recorded, Linear updates listed in
   `chore(wip)` commits) and correct it. When a trigger below applies, the
   session takes stock instead of running a unit.
2. Choose the unit: the issue the user named; otherwise an In Progress issue of
   the project, unless the user says another session is working on it;
   otherwise the first issue of the frontier, the project's Todo issues whose
   blockers are all Done, Canceled, or Duplicate, or In Review when you branch
   from the prerequisite as the table below describes. Uncommitted changes in a
   unit's branch or worktree are its unverified work: inspect and verify them
   rather than discard them. Backlog issues, including captured ones, wait for a
   take-stock.
3. Claim the unit and run it as [Units](#units) describes. Parallel work means
   several sessions, each on its own unit, worktree, and branch, only for units
   that share no files and no open decision, and never more at once than the
   user can review.
4. When the unit ends, done or stopped, update its issue, "Decisions so far",
   and "Resume here" with the next unit or the take-stock due, then stop. The
   closing message gathers what the user must act on: decisions, judgments, the
   review and ship request, and the issue to start the next session with.

## Take stock

Taking stock replaces planning the whole project up front. Do it when:

- every issue of the current goal is done;
- a result changes a decision, the approach, or the current goal;
- every remaining unit is blocked;
- the work grows beyond what was agreed;
- the user asks.

Then:

1. Reconcile the record with Linear and Git; report and correct each difference.
2. Gather the results, failed approaches, and decisions since the last
   take-stock.
3. Draft the issues for what is now precise enough, from "Not yet specified" and
   from the results, and list the issues that became obsolete, with the reason.
4. For each captured Need triage issue of the project, propose to rewrite it as
   a typed issue in the format of [linear](linear.md#issue-content), leave it in
   Backlog for later, or cancel it as a duplicate or no longer needed.
5. Report what the current goal cost since it was set (units done and added,
   days elapsed) against the issues it started with, so a project that drags is
   visible.
6. Propose these changes and the next current goal, or the revised one,
   including what happens to the branches and pull requests of canceled work
   (rebase onto the new approach, or close), and make them only after the user's
   yes.
7. Write "Resume here" with the unit the next session starts with, and stop.

## When the way is blocked

| Situation | Response |
| --- | --- |
| An unknown appears inside a Task | Stop only the part that depends on it; create the Research or Prototype issue in the current goal, block the Task on it, and continue the rest |
| A decision the user cannot take now | An Interview issue blocks what depends on it; other units continue |
| An external dependency (access, asset, tool version, another person) | The issue states what it waits on and who must act; no retry loop |
| Every remaining unit is blocked | Stop, list what each block waits on and its owner, and write it in "Resume here" |
| A result invalidates the approach | Record the negative result, pause every unit that depends on that approach, including those branched from its pull requests, and take stock with the user before any new work on that path |
| A unit fails twice without new evidence | Stop it, record what was tried, and take stock |
| A unit turns out larger than one unit | Stop at a coherent point, offer to ship what stands alone, and put the rest in a new issue of the current goal |
| A unit depends on an unmerged pull request | Branch from the prerequisite and say so in the pull request, or wait; ask for merges in dependency order |
| Parallel units collide | Rebase the later one and rerun its checks; stop running those areas in parallel |
| A result needs the user's eyes (feel, visuals, an editor) | Keep the unit small, mark the check as the user's, and gather such checks for them |
| The user changes direction | Take stock: update the final goal and decisions, cancel what no longer applies and move what is postponed to Backlog, each with the reason, and keep history and branches |
| The record disagrees with Linear or Git | Trust what is verified, correct the record, and say what changed |

## Finish or pause

The project is done when each success criterion is met by evidence, not by the
look of the work. Propose the finish at a take-stock: the evidence for each
criterion and what happens to each remaining issue. On the user's yes, close or
cancel those issues with a reason, write the outcome in the record, and mark the
project Completed. Pausing or stopping is proposed the same way; on the user's
yes, write why and where to resume, and set the project status to match.
