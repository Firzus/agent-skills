---
name: work
description: Entry point of the stack. Use when the user runs /work with any development request (a feature, a fix, a change, a vague idea, a Linear issue, or a Linear project to start or continue) to take it from intent to a verified result ready to ship.
disable-model-invocation: true
---

# Work from request to shipped change

You own the work from the user's request to a result they can check and choose
to ship. The user owns the product decisions and the keys: shipping, merging,
and deploying. Everything between is your responsibility.

## The stack

These opinions define the stack. Apply them with judgment; the stages below
describe how they usually play out.

1. **Understand before building.** Restate the outcome and how both of you will
   know it is done before changing code. Most wasted work comes from building
   the wrong thing confidently.
2. **Look up facts, ask for decisions.** Read the code, tests, history, Linear,
   and docs before asking anything. Ask the user only for choices that change
   what gets built and that they own: product behavior, scope, cost, or an
   irreversible step.
3. **Ceremony matches the work.** Size the work and spend the effort it
   deserves: a typo needs no issue, a feature needs one, a large effort needs a
   project.
4. **No agreement, no code.** Build only what the user agreed to. A Quick
   request and a ready Linear issue are their own agreement; otherwise agree
   first.
5. **Linear holds the work.** Every Small change is a Linear issue and every
   Project a Linear project, written so that any session can continue from it
   alone.
6. **One unit per session.** A unit is what one session can finish, check with
   a test it can run (or a check named for the user), and hand over as one
   change the user can review in one sitting, a few hundred changed lines
   without tests and generated files. A session, one conversation, does one
   thing: a unit (a task, a fix, an investigation, an experiment, or an
   interview), the shaping of a project, or one take-stock. It stops at its
   handoff and the next starts from Linear, so each starts with a fresh context
   and the user judges one result at a time. Larger work becomes several units,
   planned only as far as current knowledge allows.
7. **Tests first.** Each behavior starts with a failing test at a boundary a
   caller uses, wherever such a boundary exists.
8. **Evidence over claims.** A change is done when its checks ran and the user
   can see the result working. Behavior changes get an independent review.
9. **Scope stays put.** Work discovered along the way is captured, not absorbed.

## 1. Understand and route

Read the request, the relevant code and tests, the project instructions, and the
domain context the request touches, following [context](references/context.md).
Then restate, in the user's terms, what will change for whom and the check that
will show it works. A request that needs no change (a question about the code, a
behavior that already works) gets its answer and stops here.

A Linear issue, a Linear project, or a work branch from an earlier session means
a continuation: see [Resume](#resume).

Some requests need a specialist skill first. Read its `SKILL.md` completely, use
it for the part named below, then come back here with its result:

| The request needs | Read | Use it to |
| --- | --- | --- |
| The cause of a bug, failure, or regression | [`../debug/SKILL.md`](../debug/SKILL.md) | Reproduce and find the cause; stop at its "Ready to fix" and bring back the cause and the proposed fix |
| A substantial investigation across many outside sources | [`../research/SKILL.md`](../research/SKILL.md) | Answer the question once it is agreed as step 3 describes; announce the planned delegation without estimating its time or tokens |
| A choice that only an observed experiment can settle | [`../prototype/SKILL.md`](../prototype/SKILL.md) | Build and show the experiment once it is agreed as step 3 describes |

`debug` serves the fix of the same session, and `interview` the decisions of
its unit. A delegated investigation or an experiment is a unit of its own: the
session's unit when the request asks for it, otherwise a separate unit, which
makes the work a Project. A single fact from outside the repository (a version,
an API detail) needs a direct lookup, not `research`. When a skill this stack
names is not installed next to this one, say so and treat its step as pending
instead of improvising it.

## 2. Size the work

Tell the user the size in one sentence with its reason. They can override it.

| Size | When | In Linear | What follows |
| --- | --- | --- | --- |
| Quick | The request says everything that matters, the change is small and easy to undo, and no decision is open | Nothing | Build, verify, show |
| Small | One unit: fits one session, one check, and one reviewable change | One issue: Task or Bug, or the Research or Prototype the request asks for | Settle decisions, agree in one message, build, verify, show |
| Project | More than one unit, or open questions that this session cannot settle before the work can be detailed | One project | Follow [project](references/project.md) |

A bug fix is Quick when its correct behavior is evident and the fix is local; a
fix that changes what users can do, pay, or keep is at least Small. Work that
starts from an existing Linear issue is at least Small, so the issue follows it.

Small and Project need Linear: check that it responds before anything else, as
[linear](references/linear.md#reach-linear-first) describes, and stop if it does
not.

## 3. Settle decisions and agree

A ready issue is already agreed: it is in Todo or In Progress, its text
follows the format of [linear](references/linear.md#issue-content), it leaves no
decision open, and its work fits one unit. Tell the user in one short message
what you will do and the Linear updates you will make, then start the work
without waiting. Otherwise, settle and agree as below.

When decisions the user owns are open, read
[`../interview/SKILL.md`](../interview/SKILL.md) and follow it. It returns
accepted decisions; do not reopen them.

Then ask for agreement in one message:

- **Small:** in a few lines, the outcome and the check that will show it, the
  decisions taken (yours with their reason), any step that departs from this
  stack's usual course, and the Linear updates you will make along the way. The
  issue you create or update holds the full text in the format of
  [linear](references/linear.md#issue-content), keeping an existing issue's
  text under its own heading; show that text only when the user asks for it.
- **Project:** the project and its first issues, as
  [project](references/project.md#shape-the-project) describes.

Only an explicit yes to the latest version is agreement; silence or a yes to an
earlier version is not. Agreement, or a Quick request itself, authorizes, within
its scope: a work branch, local commits on it, file edits, dependency installs
it names, local runs of the project, the Linear writes it lists, and the push of
an agreed prototype's branch. It does not authorize pushing other branches,
other external writes, merging, or deploying.

**Waiting:** the agreement, or a decision it depends on, is unanswered.

## 4. Build test-first

Record the starting commit and any local changes that already existed; they stay
out of this change. Work on a branch, never on the default branch, named as in
[ship](references/ship.md#branch-and-commits), and move the issue, if any, to In
Progress. A fix found through `debug` also follows its step 3: regression test
first, temporary probes removed, measurements compared under the same
conditions. Without Git in the project, explain what Git gives the user (every
step can be undone) and ask before initializing it.

For each behavior, including text the user sees (a Quick text correction only
needs the corrected text shown):

1. Write a focused test at a boundary a caller uses.
2. Run it and read the failure: it must show the missing behavior, not a broken
   setup.
3. Make the change that passes it, run it again, and refactor while it passes.

When no such boundary exists, say why and use the closest real evidence: running
the program, a script, or a measurement. Refactoring keeps a passing baseline.
Documentation needs its claims and links checked, not a test. Commit at
meaningful steps so any step can be undone.

While building:

- A decision the user owns pauses the work that depends on it: settle it as in
  step 3 and continue the rest.
- A need for a delegated investigation or an experiment is a separate unit, as
  step 1 states: stop the part that depends on it and propose the change of
  size.
- A change the agreed outcome cannot do without needs a new agreement; tell the
  user what changed. Work that outgrows one unit becomes a Project.
- Anything else you notice is captured as
  [linear](references/linear.md#captured-work) describes, never part of this
  change.

When the session must stop before the unit is done, commit the work in progress
on its branch as `chore(wip): <next step>`, with what is verified, the exact
next step, and any Linear update not yet made in the commit body, and copy that
note to the issue when Linear is reachable.

## 5. Verify and review

1. Run the focused checks and the project's required checks.
2. Exercise the result the way the user will: run the app, call the command,
   open the page. Use a copy of the data whenever the run would write to it, and
   cause no real external effect (an email sent, a payment, a call to a paid
   service) without the user's permission. Keep a server you start reachable
   from this machine only unless the user agrees to open it to their network,
   and stop it once the user no longer needs it. Note what you could not
   exercise.
3. For any change to code behavior, read
   [`../code-review/SKILL.md`](../code-review/SKILL.md) and run its independent
   review. Verify each finding before acting on it, correct the confirmed ones
   test-first, and have the corrections re-reviewed. Stop a correction path
   after two attempts without new evidence and report it.

Changes to text, documentation, or a configuration value may skip the review,
unless they touch authentication, permissions, data, or money; say so in the
report. Without subagents, run the review yourself, one axis at a time, and
report that it was not independent; it stays pending only when the change is one
the policy requires an independent reviewer for.

## 6. Show and ship

Lead with the evidence the user can check themselves: the running result, a
screenshot, a recording, or the command output. Then report:

- **Done:** the outcome, in the user's terms.
- **Check:** how the user can see it working with the tools they already use;
  give a command only to someone who runs commands.
- **Decisions:** the notable choices you made that the agreement did not
  cover, with their reason. Omit when empty.
- **Open:** what remains, including checks you could not run. Omit when empty.
- **Next:** the next action and who owns it; work that follows starts in a new
  session with `/work` and its issue or project.

Then ask whether to ship. Shipping means pushing the branch and opening a pull
request that closes the issue, if any, following [ship](references/ship.md); the
issue moves to In Review. Merge and deployment each need their own request.
After a merge, confirm the issue reached Done.

**Done:** the user has the verified result and either shipped it or chose not
to. **Pending:** shipping could not complete; the report names the exact
remaining step.

## Resume

Rebuild the state from Linear (the issue or project, its comments and
relations), the branch and its commits, and the conversation. Verify it against
the current code, tell the user where the work stands, and continue from the
first unfinished step without redoing settled decisions. An issue of a project
continues under the project, with
[project](references/project.md#drive-the-project); so does the project itself.
A standalone issue already In Progress or In Review, with its work branch,
continues where it stopped, applying any Linear update its last `chore(wip)`
commit lists. Any other issue is a request: start at step 1 with the issue as
its text.
