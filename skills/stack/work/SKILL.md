---
name: work
description: "Use when the user runs /work with a development request: a feature, a fix, a change, a vague idea, a Linear issue, or a Linear project to start or continue."
disable-model-invocation: true
---

# Work from request to shipped change

You own the work from the user's request to a result they can check and choose
to ship. The user owns the product decisions and the keys: shipping, merging,
and deploying.

A Direct request (see [step 2](#2-size-the-work)) needs no Linear and no
agreement round. Read what the request touches, state its size in one sentence
and continue, build it on a branch as step 4 describes, verify and review it as
step 5 requires, and show it as step 6 describes.

## The stack

1. **Understand before building.** Restate the outcome and how both of you will
   know it is done before changing code. Most wasted work comes from building
   the wrong thing confidently.
2. **Ceremony matches the work.** Direct, Issue, or Project, as step 2 sizes
   it: effort follows what the work deserves.
3. **No agreement, no code.** Build only what the user agreed to. A Direct
   request and a ready Linear issue are their own agreement; otherwise agree
   first.
4. **Linear holds the work.** Issue-size work is one Linear issue and Project-size
   work one Linear project, written so that any session can continue from it
   alone.
5. **One unit per session.** A unit is what one session can finish, check, and
   hand over as one change the user can review in one sitting: a few hundred
   changed lines, not counting tests and generated files. A session does one
   unit (a task, a fix, an investigation, an experiment, or an interview), the
   shaping of a project, or one take-stock, then stops at its handoff; the next
   starts from Linear, so each has a fresh context and the user judges one
   result at a time. Larger work is planned only as far as current knowledge
   allows.
6. **Tests first.** Each behavior starts with a failing test at a boundary a
   caller uses, wherever such a boundary exists.
7. **Independent review.** Behavior changes get a review by reviewers who did
   not write them.
8. **Scope stays put.** Work you discover along the way is captured, not
   absorbed. Work the user adds is a new agreement, not a capture.
9. **Nothing the change breaks ships as a limitation.** A defect the change
   introduces is fixed, or the user accepts it knowingly, because a known
   defect listed as a limitation ships unnoticed.

## 1. Understand and route

Read the domain context the request touches, following
[context](references/context.md). Then restate, in the user's terms, what will
change for whom and the check that will show it works.

A Linear project or one of its issues, a standalone issue In Progress or In
Review, or a work branch from an earlier session means a continuation: see
[Resume](#resume). Any other issue is a request, with the issue as its text.

Some requests need a specialist skill first. Read its `SKILL.md` completely, use
it for the part named below, then come back here with its result:

| The request needs | Read | Use it to |
| --- | --- | --- |
| The cause of a bug, failure, or regression | [`../debug/SKILL.md`](../debug/SKILL.md) | Reproduce and find the cause; stop at its "Ready to fix" and bring back the cause and the proposed fix. Without an established cause, nothing is built: report what is ruled out and the evidence still needed, and wait for it |
| A substantial investigation across many outside sources | [`../research/SKILL.md`](../research/SKILL.md) | Answer the question once it is agreed as step 3 describes; announce the planned delegation without estimating its time or tokens |
| A choice that only an observed experiment can settle | [`../prototype/SKILL.md`](../prototype/SKILL.md) | Build and show the experiment once it is agreed as step 3 describes |

`debug` serves the fix of the same session, and `interview` the decisions of
its unit. A delegated investigation or an experiment is a unit of its own: the
session's unit when the request asks for it, otherwise a separate unit, which
makes the work a Project. A unit that answers a question (a Research,
Prototype, or Interview issue) changes no shipped code: once answered, it skips
steps 4 to 6 and closes with its result, as
[linear](references/linear.md#results) describes. When a skill this stack names
is not installed next to this one, say so and treat its step as pending instead
of improvising it.

## 2. Size the work

Tell the user the size in one sentence with its reason, and continue without
waiting for an answer. They can override it.

| Size | When | In Linear | What follows |
| --- | --- | --- | --- |
| Direct | The request says everything that matters, the change is small and easy to undo, and no decision is open | Nothing | Build, verify, show |
| Issue | One unit: fits one session, one check, and one reviewable change | One issue: Task or Bug, or the Research, Prototype, or Interview the request asks for | Settle decisions, agree in one message, build, verify, show |
| Project | More than one unit, or open questions that this session cannot settle before the work can be detailed | One project | Follow [project](references/project.md) |

A bug fix is Direct when its correct behavior is evident and the fix is local; a
fix that changes what users can do, pay, or keep is at least Issue size. Work
that starts from an existing Linear issue is at least Issue size.

Issue and Project sizes need Linear: before any Linear read or write, list the
user's teams. When that fails, stop before any change and tell the user what is
blocked and how to restore access.

## 3. Settle decisions and agree

A ready issue is already agreed: it is in Todo or In Progress, its text holds
what the format of [linear](references/linear.md#issue-content) requires,
whatever its headings, it leaves no decision open, and its work fits one unit.
Tell the user in one short message what you will do and the Linear updates you
will make, then start the work without waiting. Otherwise, settle and agree as
below.

When decisions the user owns are open, read
[`../interview/SKILL.md`](../interview/SKILL.md) and follow it. It returns
accepted decisions; do not reopen them.

Then ask for agreement in one message:

- **Issue:** in a few lines, the outcome and the check that will show it, the
  decisions taken (yours with their reason), any step that departs from this
  stack's usual course, and the Linear updates you will make along the way. The
  issue you create or update holds the full text in the format of
  [linear](references/linear.md#issue-content), keeping an existing issue's
  text under its own heading; show that text only when the user asks for it.
- **Project:** the project and its first issues, as
  [project](references/project.md#shape-the-project) describes.

Only an explicit yes to the latest version is agreement; silence or a yes to an
earlier version is not. Agreement, or a Direct request itself, authorizes, within
its scope: a work branch, local commits on it, file edits, dependency installs
it names, local runs of the project, the Linear writes it lists, and the push of
an agreed prototype's branch. It does not authorize pushing other branches,
other external writes, merging, or deploying.

**Waiting:** the agreement, or a decision it depends on, is unanswered.

## 4. Build test-first

Record the starting commit and any local changes that already existed; they stay
out of this change. Work on a branch, never on the default branch, named as in
[ship](references/ship.md#branch-and-commits), and move the issue, if any, to In
Progress. A fix found through `debug` also follows its step 3. Without Git in
the project, ask before initializing it.

Write each test at a boundary a caller uses and see it fail for the missing
behavior, not for a broken setup, before making it pass. When no such boundary
exists, say why and use the closest real evidence: running the program, a
script, or a measurement. A Direct text correction needs no test: show the
corrected text in place.

While building:

- A decision the user owns pauses only the work that depends on it; settle it
  as in step 3. A change the agreed outcome cannot do without needs a new
  agreement.
- Direct work that meets an open decision, or stops being small and easy to
  undo, becomes Issue size: reach Linear, agree on the issue as in step 3, and
  rename the branch to carry its identifier.
- Work that outgrows one unit, or needs a delegated investigation or an
  experiment, becomes a Project: stop the part that depends on it and propose
  the change of size.
- Capture anything else you notice as
  [linear](references/linear.md#captured-work) describes.

When the session must stop before the unit is done, commit the work in progress
on its branch as `chore(wip): <next step>`, with what is verified, the exact
next step, and any Linear update not yet made in the commit body, and copy that
note to the issue when Linear is reachable.

## 5. Verify and review

1. Exercise the result the way the user will, on a copy of any data the run
   would write, and with no real external effect (an email sent, a payment, a
   call to a paid service) without the user's permission. Keep a server you
   start reachable from this machine only unless the user agrees to open it,
   and stop it once the user no longer needs it.
2. For every change that alters behavior, including a configuration value, read
   [`../code-review/SKILL.md`](../code-review/SKILL.md) and run its independent
   review. Text and documentation that change no behavior skip it; say so in
   the report. Without subagents, run the review yourself, one axis at a time,
   and report that it was not independent; when the policy requires an
   independent reviewer for the change, the review stays pending under
   **Open**.
3. Sort every confirmed defect, whether the review, a check, or your own run
   found it, against the starting commit:
   - **Introduced:** it fails with the change and not before, including a case
     the change creates (a removed name still referenced, a new input left
     unhandled), an agreed requirement is unmet, or the change adds behavior
     the agreement does not cover. Fix it test-first whatever its priority, or
     remove the addition, and have the corrections re-reviewed. A fix that
     needs more than the agreement covers needs a new agreement.
   - **Already there:** it fails the same way on the starting commit. Capture
     it as [linear](references/linear.md#captured-work) describes; it stays out
     of this change.

   Stop a correction path after two attempts without new evidence. The user
   then decides: accept the defect, or keep the work from shipping.
   **Waiting:** that decision is unanswered.

## 6. Show and ship

Lead with the evidence the user can check themselves: the running result, a
screenshot, a recording, or the command output. Report as the policy asks,
with each introduced defect the user accepted among the decisions. Under
**Open**, list only defects already there (each with its captured issue or the
user's refusal to capture it), a pending review, and checks you could not run.
Work that follows starts in a new session with `/work` and its issue or project.

Then ask whether to ship, once every introduced defect is fixed or accepted.
Shipping means pushing the branch and opening a pull request that closes the
issue, if any, following [ship](references/ship.md); the issue moves to In
Review. Merge and deployment each need their own request.

**Done:** the user has the verified result and either shipped it or chose not
to. **Pending:** shipping could not complete; the report names the exact
remaining step.

## Resume

Rebuild the state from Linear (the issue or project, its comments and
relations), the branch and its commits, and the conversation, then continue
from the first unfinished step without reopening settled decisions. An issue of
a project continues under the project, with
[project](references/project.md#drive-the-project); so does the project itself.
A standalone issue already In Progress or In Review, with its work branch,
continues where it stopped, applying any Linear update its last `chore(wip)`
commit lists.
