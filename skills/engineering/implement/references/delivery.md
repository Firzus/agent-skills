# Deliver without overstating completion

## Establish the boundary

Resolve repository, remote/base branch, Linear issue, reviewer, and completion
boundary from project evidence. Ask only for material gaps. Local preparation does
not imply permission to commit, push, open a PR, change Linear, merge, or deploy; confirm
the destination and action when existing authorization does not cover them.

| Evidence | What it establishes |
| --- | --- |
| Local implementation and passing checks | Verified only to the extent of those checks |
| PR and review evidence | Reviewable work; acceptance depends on the designated reviewer |
| Confirmed merge/integration | Integrated change, not automatically accepted or deployed |
| Release/deployment evidence | Deployed only to the verified environment/version |

## Prepare Git delivery

1. Preserve the task's branch/worktree and unrelated changes. If a new user-facing
   branch is needed, use `<type>/<kebab-case-subject>` with feature, bugfix, hotfix,
   release, or chore. Keep implementation separate from retained prototype branches.
2. Inspect the diff and staged paths. Commit only within the approved delivery
   scope, using Conventional Commits; mark breaking changes with `!` or a
   `BREAKING CHANGE:` footer. Without commit approval, preserve the local changes
   and verification evidence and report Git delivery as pending.
3. Within authorized publication scope, push and open a non-draft PR once work and
   required checks are complete; use a draft only if the user or project requests it.
   Include outcome, scope, checks, limitations, and the existing Linear reference
   using project conventions. If targeting the default branch, repeat
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

| Transition | Required evidence |
| --- | --- |
| In Progress | Work actually started |
| In Review | A linked PR opened, including a draft PR |
| Blocker (record in the issue, not an invented status) | Cause, resolution owner, required outcome, and next action |
| Done | The linked PR merged; for work without a PR, its agreed completion boundary was met |

1. Confirm write authorization, then re-read the affected record to preserve
   concurrent and unrelated content.
2. Link the PR and check/review evidence in the existing issue. Record implemented,
   accepted, integrated, and deployed as separate facts. A PR opening moves the
   issue to In Review, not Done; a linked PR merge moves it to Done. Check the
   actual status before writing when an integration may have already updated it.
3. Verify the returned or re-read state. After an uncertain write, inspect for
   partial success before retrying; avoid duplicate comments or records.
4. On failure, preserve last confirmed state, intended update, evidence, and next
   action in the current task. Report synchronization pending, not completed.

If automation advances a status without the corresponding event, report the mismatch
and reconcile only within authorized scope. Cancellation is not successful delivery.
An issue's completion does not automatically accept its milestone or whole project.

**Done:** required updates verified, or exact remaining operations reported.

## Handoff or resume

Keep objective, completed work, artifact/check evidence, remaining blockers, owner,
and next action in the existing authorized record or conversation. Reconcile that
checkpoint with current code and tracker state when resuming.

Return a concise result in the user's terms. Protect private details; redact secrets
and sensitive data before external publication, and do not upload private artifacts
without approval. Stop at the agreed boundary rather than starting the next issue.
