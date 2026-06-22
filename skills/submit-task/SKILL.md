---
name: submit-task
description: >-
  Ship finished work as a pull request. Names a feature branch from the change's
  context (or the issue being implemented), moves the work onto that branch if it
  was done on the default branch, pushes it, and opens a PR targeting main. The
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
# Default branch (same detection as new-task)
git symbolic-ref --quiet refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'

# What exists to submit
git status --porcelain          # uncommitted changes
git branch --show-current       # current branch
```

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

**If currently on the default branch:**

```bash
# Uncommitted work: create the branch and carry the changes over
git checkout -b <branch-name>

# Work already committed onto the default branch locally: move those commits
git checkout -b <branch-name>
git checkout <default-branch>
git reset --hard origin/<default-branch>   # only the LOCAL default branch, to drop the accidental commits
git checkout <branch-name>
```

**Stop** rather than committing or pushing to the default branch directly. The
`reset --hard` above is allowed **only** to peel mistaken local commits off the
default branch after they are safely on the feature branch — never to discard the
user's actual work. If you are unsure the commits are preserved on the branch,
stop and ask.

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

### 7. Hand off a QA pass to the user

After the PR is open, act like a QA engineer handing the build to a tester: give
the user a **QA checklist** of what to verify by hand before merge — the things
that were not, or cannot be, covered automatically. Derive every item from the
actual change, not a generic template.

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
