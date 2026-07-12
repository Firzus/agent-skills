---
name: babysitting-pr
description: >-
  Monitor an open GitHub pull request until it is merge-ready by checking CI,
  diagnosing and fixing branch-related failures, addressing actionable review
  feedback, resolving safe merge conflicts, pushing fixes, and re-checking the
  result. Use when the user asks to babysit, watch, monitor, or keep an open PR
  green and ready to merge.
---

# Babysit a pull request

Keep an open pull request merge-ready. Continue monitoring after each push until
the PR is merged or closed, all blockers are cleared, or user input is required.

## Guardrails

- Confirm `gh auth status` succeeds and identify the target PR before changing
  anything.
- Preserve unrelated work in the working tree. Do not discard user changes.
- Never force-push, merge the PR, close it, or mark a draft ready unless the user
  explicitly authorized that action.
- Do not weaken tests, lint rules, type checks, security checks, or branch
  protections merely to make CI pass.
- Treat credentials, infrastructure changes, destructive migrations, dependency
  trust decisions, and ambiguous design feedback as user decisions.
- Retry a likely flaky CI failure at most three times. Do not repeatedly rerun a
  deterministic failure without changing the branch.

## 1. Establish the PR context

Accept a PR number or URL when supplied. Otherwise, resolve the PR associated
with the current branch.

```bash
gh pr view <pr> --json number,title,url,state,isDraft,headRefName,headRefOid,baseRefName,mergeable,mergeStateStatus,reviewDecision,statusCheckRollup
git status --short
git branch --show-current
```

Stop successfully if the PR is merged or closed. If the local checkout is not the
PR head branch, check it out before making fixes:

```bash
gh pr checkout <pr>
```

Record the current head SHA after every push so that check results are not
mistaken for results from an older revision.

## 2. Inspect all blockers

Check CI and collect machine-readable results:

```bash
gh pr checks <pr> --json name,state,bucket,workflow,link
```

Inspect review feedback, including inline comments. Prefer a GitHub integration
that exposes review-thread resolution. When only `gh` is available, fetch reviews
and comments, then verify which comments are still actionable in their surrounding
code context:

```bash
gh pr view <pr> --json reviewDecision,reviews,comments
gh api repos/{owner}/{repo}/pulls/{pr}/comments --paginate
```

Interpret `mergeable` and `mergeStateStatus` together. GitHub can temporarily
report an unknown merge state; poll again before diagnosing a conflict.

## 3. Diagnose before changing code

For each failed GitHub Actions check, identify its workflow run from the check URL
or list runs for the PR head SHA, then read only the failed-step logs:

```bash
gh run list --commit <head-sha> --json databaseId,name,status,conclusion,url
gh run view <run-id> --log-failed
```

Reproduce the failure locally with the repository's documented command whenever
possible. Read repository instructions before editing. Determine whether the
failure is caused by the PR branch, a flaky check, or external infrastructure.

- Fix branch-related lint, type, test, build, and security failures at their root
  cause.
- Retry a check only when evidence indicates a transient failure:

  ```bash
  gh run rerun <run-id> --failed
  ```

- Report external or permission-related failures instead of changing unrelated
  code.

## 4. Address review feedback

Process each unresolved actionable thread:

1. Read the comment, diff hunk, and current implementation.
2. Apply clear correctness, naming, documentation, safety, or maintainability
   fixes.
3. Run focused validation for the affected area.
4. Leave ambiguous product or architecture decisions for the user, with the
   relevant tradeoff summarized.

Do not claim a thread is resolved unless the requested change is implemented or a
maintainer explicitly accepted the response.

## 5. Resolve branch conflicts safely

Fetch the base branch and use the repository's preferred update strategy. If none
is documented, merge the remote base into the PR branch to avoid rewriting shared
history:

```bash
git fetch origin <base-branch>
git merge origin/<base-branch>
```

Resolve conflicts only when intent is clear from both sides and surrounding tests.
Escalate ambiguous conflicts. Validate the combined behavior after resolution.

## 6. Commit, push, and re-check

Review the diff, run proportionate local checks, and create a focused Conventional
Commit. Stage only intended files.

```bash
git diff --check
git status --short
git push
gh pr checks <pr> --watch
```

After checks settle, refresh PR metadata, review threads, mergeability, and the
head SHA. A green CI result alone does not mean the PR is merge-ready.

Repeat the inspect-diagnose-fix-push cycle while the PR remains open and meaningful
progress is possible. Pause only while checks are pending; resume when they finish.

## Stop conditions

Stop monitoring and report when one of these conditions is true:

| Condition | Result |
| --- | --- |
| Checks pass, required reviews are satisfied, no actionable threads remain, and no conflict exists | Report the PR as merge-ready |
| PR is merged or closed | Report the terminal state |
| A blocker requires user authority or a design decision | Report the exact decision needed |
| The same flaky failure persists after three retries | Report the evidence and exhausted retries |
| A deterministic failure cannot be reproduced or fixed safely | Report diagnostics and the remaining blocker |

## Final report

Summarize:

- PR URL and current head SHA
- CI failures diagnosed, fixes applied, and commands run
- Review comments addressed or still awaiting a decision
- Merge conflicts resolved or remaining
- Current checks, review decision, and mergeability
- Any action required from the user

Adapted from
[`babysitting-pr`](https://github.com/spencerpauly/awesome-cursor-skills/tree/main/resources/babysitting-pr).
