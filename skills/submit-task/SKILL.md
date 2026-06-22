---
name: submit-task
description: >-
  Ship finished work as a pull request. Names a feature branch from the change's
  context (or the issue being implemented), moves the work onto that branch if it
  was done on the default branch, pushes it, and opens a PR targeting main. Then
  kicks off a background automated code review and immediately hands off a QA
  checklist so the user can test while the review runs. The
  natural follow-up to the new-task skill. Stops and asks the user if there is
  nothing to submit, if work would be pushed straight to the default branch, or if
  the remote/PR tooling is missing. Use when the user says "submit", "ship it",
  "open a PR", "send my work", "create a pull request", or is done coding and wants
  their changes reviewed/merged into main.
---

# Submit Work

Use this skill when the user has finished coding and wants to send their work for
review — turn the current changes into a well-named branch and a pull request
against the default branch. This is the counterpart to the `new-task` skill.

## Procedure

Run the steps in order. **Stop at the first failure** and report it.

### 1. Find the default branch and confirm there is work to submit

```bash
# Default branch: prefer the remote HEAD symref
git symbolic-ref --quiet refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'

# What exists to submit
git status --porcelain          # uncommitted changes
git branch --show-current       # current branch
```

If the symref is empty, refresh it with `git remote set-head origin --auto` and
retry; if still empty, probe in order: `main`, `master`, `trunk`, `develop`. If
none resolve, stop and ask the user which branch is the mainline — never proceed
with an empty default-branch name.

If the working tree is clean **and** the current branch has no commits ahead of
the default branch, there is nothing to submit — stop and tell the user.

### 2. Choose the branch name from context

Derive a short, kebab-case branch name from what the work actually does. Prefer,
in order:

1. **The issue** being implemented — `<type>/<issue-number>-<slug>`
   (e.g. `feat/142-jwt-login`). Read the issue number from the user, the branch,
   the commit messages, or `gh issue view` if referenced.
2. **The change context** — infer `<type>` and a `<slug>` from the diff / commit
   messages (e.g. `fix/timezone-report-dates`, `refactor/scene-loader`).

Use the repo's Conventional Commit types (`feat`, `fix`, `refactor`, `docs`,
`chore`, …). Keep the slug 2-5 words. Create the branch directly from the derived
name — no confirmation prompt needed.

### 3. Put the work on the feature branch — never commit to the default branch

**If already on a non-default feature branch:** keep it. Commit any remaining
changes (see step 4).

**If currently on the default branch**, first create the feature branch — this
carries over **both** any uncommitted changes and any local commits, because
`checkout -b` keeps the working tree and points the new branch at the current
`HEAD`:

```bash
git checkout -b <branch-name>
```

Do the commit on the feature branch (step 4) and push it (step 5). In most cases
you are now done with this step — **leave the local default branch as it is.**

**Only if** the user made local commits directly on the default branch and wants
that branch reset to match the remote, handle it as a separate, explicit cleanup
— and only when the working tree is **clean**:

```bash
# Preconditions: already on <branch-name> with all work committed AND pushed,
# and `git status --porcelain` is EMPTY.
git checkout <default-branch>
git status --porcelain            # MUST be empty — if not, STOP, do not reset
git reset --hard origin/<default-branch>   # drops the local-only commits from the default branch
git checkout <branch-name>
```

**Stop** rather than committing or pushing to the default branch directly. The
`reset --hard` is allowed **only** to peel mistaken local commits off the default
branch, **only after** the work is safely committed and pushed on the feature
branch, and **only with a clean working tree** — a dirty tree means `reset --hard`
would silently destroy uncommitted work, so stop instead. If you are unsure the
work is preserved, stop and ask.

### 4. Commit the changes

Stage and commit anything outstanding with a Conventional Commit message that
matches the branch's intent:

```bash
git add -A
git commit -m "<type>(<scope>): <summary>"
```

Do not commit files that may hold secrets (`.env`, credentials). Warn the user if
they ask to.

### 5. Push the branch

```bash
git push -u origin <branch-name>
```

If there is no remote or the push is rejected, stop and report — do not force-push.

### 6. Open the pull request against the default branch

Use `gh` (GitHub CLI). Target the default branch as the base:

```bash
gh pr create --base <default-branch> --head <branch-name> \
  --title "<type>(<scope>): <summary>" \
  --body "$(cat <<'EOF'
## Summary
- <what changed and why>

## Test plan
- [ ] <how it was verified>
EOF
)"
```

- Link the issue in the body (`Closes #142`) when implementing one.
- If `gh` is not installed or not authenticated, stop and give the user the
  branch name and a compare URL so they can open the PR manually.

Report the PR URL when done.

### 7. Kick off an automated code review in the background

Start an automated review of the change, then **immediately** move on to the QA
handoff (step 8). Code review and QA are independent: the review hunts for bugs in
the diff, while QA is manual verification of behavior. The user can run the QA
checklist **while the review runs** — do not block the handoff on it.

Run the review on a **custom review subagent**, not the managed `bugbot` subagent.
Per the Cursor docs, `bugbot` runs its own managed pipeline and ignores a
caller-supplied model, so it cannot be pinned to a specific model. A custom
subagent's model **is** honored, set via the `model:` field in the subagent file's
frontmatter — that is the only supported way to choose the review model.

Launch exactly one review subagent with:

- `subagent_type: "generalPurpose"`
- `description: "Code review"`
- `model: "composer-2.5-fast"` (Cursor Composer 2.5, fast mode)
- `readonly: true`
- `run_in_background: true`

If `composer-2.5-fast` is unavailable, do not silently substitute another model —
tell the user and ask how to proceed.

Compute the diff for the subagent (it has no managed diff pipeline of its own).
Default to **branch changes** — committed, staged, and unstaged vs. the merge-base
with the default branch:

```bash
git diff --merge-base <default-branch>
```

Give the subagent this prompt shape, embedding the diff (or, for a large diff, the
changed-file list plus the relevant hunks):

```text
You are reviewing local code changes for bugs introduced by this diff only.
Report only real bugs — behavior that is incorrect, unsafe, or likely to break
users in production. When unsure, flag it for human review.

Repository: <absolute repository path>
Diff (branch changes vs <default-branch>):
<unified diff>

Return findings as a markdown table sorted by severity (highest first) with
exactly these columns: Severity, Location (file:line), Finding. If there are no
bugs, reply exactly: "No bugs found."
```

If the subagent fails before producing findings, retry once with the same prompt;
if it still fails, stop and tell the user the review could not complete, with the
short error.

Do **not** wait for the review before handing off QA. When the subagent finishes
later, summarize the result separately:

- If the diff was empty, tell the user in one sentence that there was nothing to review.
- If it found no bugs, give a one-line status such as "Review found no bugs".
- If it found issues, print the compact markdown table it returned (Severity,
  Location `file:line`, Finding), sorted by severity (highest first).

Do not fix findings or rerun the review unless the user explicitly asks for that
next step.

### 8. Hand off a QA pass to the user (right after launching the review)

As soon as the review subagent is launched — without waiting for it — act like a QA engineer
handing the build to a tester: give the user a **QA checklist** of what to verify
by hand before merge — the things that were not, or cannot be, covered
automatically. Derive every item from the actual change, not a generic template.
This is independent of the code review, so the user can start QA right away.

Write each item as a testable case, not a vague reminder: **what to do**, **what
to expect**, and any **setup/preconditions**. Cover, where relevant:

- **UI / UX** — screens, flows, and states to click through; check layout,
  responsiveness, empty/loading/error states.
- **Functional behavior** not covered by automated tests — happy path plus edge
  cases, error paths, permissions, and different environments/devices.
- **Regression risk** — nearby features the change could have broken.
- **Side effects** — migrations, config/env changes, external services, or data
  to check after deploy.
- **Anything you flagged as unverified** while coding (assumptions, TODOs, code
  you couldn't run).

Present it as a QA checklist the user can run through, e.g.:

```
QA before merge:
- [ ] Expired-token login → user is redirected through the refresh flow, no error toast
- [ ] Settings page at 375px width → no overflow, all controls reachable
- [ ] Invalid email on signup → inline validation message, request not sent
- [ ] DB migration on a staging copy → runs clean, existing rows intact
```

Note what risk each case guards against if it isn't obvious. If everything
meaningful is already covered by automated tests, say so explicitly instead of
inventing QA steps.

## Hard stops — do not work around these

- Do **not** commit or push directly to the default branch.
- Do **not** `--force` / `--force-with-lease` push.
- Do **not** `reset --hard`, `clean`, or discard to erase the user's actual work
  (the only allowed `reset --hard` is peeling mistaken commits off the *local*
  default branch once they are safe on the feature branch).
- Do **not** invent an issue number or fabricate a PR description — derive them
  from real context or ask.

When you stop, explain why (nothing to submit / would touch the default branch /
no remote / `gh` missing) and hand control back to the user.
