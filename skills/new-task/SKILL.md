---
name: new-task
description: >-
  Start a new task from a clean, up-to-date main branch. Checks out the
  repository's default branch (main/master/trunk), fetches, and fast-forwards it
  to the remote so the next branch starts from the latest code. Stops
  immediately and asks the user if the working tree is dirty, the default branch
  has diverged, or the update would conflict — it never merges, rebases, stashes,
  resets, or discards work to force the update through. Use when the user says
  "start a new task", "new task", "fresh branch", "sync main before I begin", or
  otherwise wants a clean starting point on the main branch before doing new work.
---

# New Task

Use this skill to put the repo on a clean, current default branch before starting
new work — so the next feature branch is cut from the latest mainline code.

The contract is strict: **prepare the starting point, or stop and report.** Never
destroy, hide, or rewrite work to make the update succeed. If anything is unsafe,
halt and hand control back to the user with a clear explanation.

## Procedure

Run the steps in order. **Stop at the first failure** and report it — do not
continue to a later step or attempt a workaround.

### 1. Confirm this is a git repository

```bash
git rev-parse --is-inside-work-tree
```

If this fails, stop: there is no repository to prepare.

### 2. Check for uncommitted work — STOP if the tree is dirty

```bash
git status --porcelain
```

If the output is **non-empty**, the working tree has uncommitted changes
(modified, staged, or untracked files). **Stop all actions.** Do not stash, do not
reset, do not discard. Tell the user what is dirty and let them decide (commit,
stash themselves, or discard) before re-running.

### 3. Identify the default branch

Prefer the remote's published default; fall back to common names:

```bash
# Most reliable: the remote HEAD symref
git symbolic-ref --quiet refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'
```

If that is empty, refresh it with `git remote set-head origin --auto`, then retry.
If there is still no answer, probe in order: `main`, `master`, `trunk`,
`develop`. If none exist, stop and ask the user which branch is the mainline.

### 4. Checkout the default branch

```bash
git checkout <default-branch>
```

If checkout fails (e.g. it would overwrite local changes), stop and report — this
should not happen after step 2 passed, so treat it as a signal something changed.

### 5. Fetch the latest remote state

```bash
git fetch origin --prune
```

### 6. Fast-forward only — STOP on divergence or conflict

Update the local default branch to match the remote **without ever creating a
merge or rewriting history**:

```bash
git merge --ff-only origin/<default-branch>
```

- **Success (fast-forward or already up to date):** the branch now matches the
  remote. The repo is ready for a new task.
- **Failure (`--ff-only` refused):** the local default branch has commits the
  remote does not, or histories have diverged. **Stop immediately.** Do **not**
  run a non-ff merge, rebase, or `reset --hard`. Report the divergence and let the
  user resolve it.

## Hard stops — never do these to force the update

- Do **not** `git stash`, `git reset --hard`, `git clean`, or `git checkout -- .`
  to clear a dirty tree.
- Do **not** run a plain `git merge` / `git pull` (non-ff), `git rebase`, or
  `--force` anything to resolve divergence.
- Do **not** delete or recreate the local default branch.

When you stop, say **why** (dirty tree / diverged branch / conflict), show the
relevant `git status` or error output, and ask the user how to proceed. Surfacing
the blocker is the correct outcome — not an error to work around.

## After a clean update

The default branch is checked out and matches the remote — the repo is ready for
a new task. Stop here; do not create a branch or start work as part of this skill.
