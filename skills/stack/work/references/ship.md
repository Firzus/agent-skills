# Ship a change

Shipping needs the user's yes for this change; agreement on the plan is not
enough.

## Branch and commits

- Start the branch subject with the Linear issue identifier (for example
  `fix/fir-31-double-charge`) so Linear links the branch. Direct work has no issue
  and uses a plain subject.
- Before shipping, check that the diff and the commits hold only this change.
- A rewritten history needs the user's agreement and is pushed with
  `--force-with-lease --force-if-includes`.

## Pull request

Push the branch and open a pull request:

- **Title:** the outcome, as a Conventional Commit subject.
- **Body:** the problem in the user's terms, what changed, how it was verified
  (checks run, review outcome, what could not be exercised), and the closing
  reference of each Linear issue it resolves (for example `Fixes FIR-31`).

Without a remote or a way to open a pull request, keep the branch, give the
exact commands that would ship it, and report shipping as pending. When the user
works alone and has no remote, offer the local alternative: merging the branch
into the default branch, which they approve like any merge.

## Merge and deploy

Merge only when the user asks, after the required checks and reviews pass.
Deploy only when the user asks. A merged change is not a deployed change;
report each separately.
