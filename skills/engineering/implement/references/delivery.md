# Deliver without overstating completion

## Establish the boundary

Resolve repository, remote/base branch, Linear issue, reviewer, and completion
boundary from project evidence. Ask only for material gaps. Invoking `implement` on
a Linear issue authorizes commits and Linear updates for that issue. For a Task or
Bug, the push and PR wait for the user's validation at the end of the work. Merge
and deployment always need separate authorization.

| Evidence | What it establishes |
| --- | --- |
| Local implementation and passing checks | Verified only to the extent of those checks |
| PR and review evidence | Reviewable work; acceptance depends on the designated reviewer |
| Confirmed merge/integration | Integrated change, not automatically accepted or deployed |
| Release/deployment evidence | Deployed only to the verified environment/version |

## Prepare Git delivery

1. Preserve the task's branch/worktree and unrelated changes. If a new user-facing
   branch is needed, use `<type>/<kebab-case-subject>` with feature, bugfix, hotfix,
   release, or chore. For a Linear issue, start the subject with its identifier,
   such as `bugfix/fir-31-market-sidebar-ad-slot`, so Linear links the branch.
   Keep implementation separate from retained prototype branches.
2. Inspect the diff and staged paths. Commit only within the approved delivery
   scope, using Conventional Commits; mark breaking changes with `!` or a
   `BREAKING CHANGE:` footer. Without commit approval, preserve the local changes
   and verification evidence and report Git delivery as pending.
3. Once work and required checks are complete, present the result and ask the user
   to validate opening the PR. After validation, push and open a non-draft PR; use a
   draft only if the user or project requests it.
   Include outcome, scope, checks, limitations, and `Fixes <issue-id>` (for example
   `Fixes FIR-31`) so Linear treats the PR as closing the issue. A Markdown link
   alone does not. If targeting the default branch, repeat
   `Closes #<number>` for each intended GitHub issue closure.
4. Verify the PR state. Mark a draft ready only after work and required checks are
   complete and the action is authorized; report missing runtime checks.

Merge and deploy only within their separately authorized scope. Preserve prototype
branches; never discard unrelated work. Force-push only with both
`--force-with-lease --force-if-includes` when history rewriting is authorized.

**Done:** artifacts satisfy the agreed boundary, or the exact pending Git action is named.

## Update Linear at meaningful transitions

Use current tools/schemas and actual team states; do not invent labels or rename
the team's workflow. The implementer maintains evidence; the designated reviewer
accepts the result. One person may hold both roles. Status tracks the workflow;
record acceptance, integration, and deployment as separate facts.

| Transition | Trigger | Set by |
| --- | --- | --- |
| In Progress | `implement` starts on the issue | `implement` |
| In Review | A linked PR opened, including a draft PR | Linear Git automation; `implement` sets it if the status did not change |
| Done (Task, Bug) | The linked closing PR merged | Linear Git automation |
| Done (Research) | Research completed; answer, remaining uncertainty, and dossier link recorded in the issue | `implement` |
| Done (Prototype, Interview) | The user validated the result, recorded in the issue | `implement` |
| Blocker (recorded in the issue, not an invented status) | A prerequisite stops progress; record cause, resolution owner, required outcome, and next action | `implement` |

1. Re-read the affected record to preserve concurrent and unrelated content.
2. Link the PR and check/review evidence in the existing issue. Record implemented,
   accepted, integrated, and deployed as separate facts. After opening the PR,
   re-read the status; if it is not In Review, set it and report that the team's
   Git automation may be off.
3. Verify the returned or re-read state. After an uncertain write, inspect for
   partial success before retrying; avoid duplicate comments or records.
4. On failure, preserve last confirmed state, intended update, evidence, and next
   action in the current task. Report synchronization pending, not completed.

If automation advances a status without the corresponding event, report the mismatch
and reconcile only within authorized scope. Cancellation is not successful delivery.
An issue's completion does not automatically accept its project.

**Done:** required updates verified, or exact remaining operations reported.

## Handoff or resume

Keep objective, completed work, artifact/check evidence, remaining blockers, owner,
and next action in the existing authorized record or conversation. Reconcile that
checkpoint with current code and tracker state when resuming.

Return a concise result in the user's terms. Protect private details; redact secrets
and sensitive data before external publication, and do not upload private artifacts
without approval. Stop at the agreed boundary rather than starting the next issue.
