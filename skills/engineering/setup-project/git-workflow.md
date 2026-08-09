# Fragment: git workflow

Compose from the parts that apply. Skip the PR half when the project has no remote.

## Branches

```markdown
## Git workflow

Branch from an up-to-date default branch: `git switch --no-track -c <type>/<subject> origin/main`.

Name branches `<type>/<subject>` — a [Conventional Branch](https://conventional-branch.github.io/) type, then a lowercase ASCII kebab-case subject. Types: `feature`, `bugfix`, `hotfix`, `release`, `chore`.

This list is deliberately narrower than the commit type list: a commit describes one change, a branch describes a delivered unit of work. Keep it as is.

Name the branch after the change, not the tool that produced it — `feature/token-refresh`, never `codex/...` or `claude/...`.
```

Adjust `origin/main` to the repository's actual default branch. Trunk names (`main`, `master`, `develop`) take no prefix and are never created as new branches.

## Commits

```markdown
Write commits to [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/): `<type>[optional scope]: <description>`.

Types: `feat`, `fix`, `build`, `ci`, `docs`, `style`, `refactor`, `perf`, `test`, `revert`, `chore`. Reach for `chore` only when nothing more specific fits.

Mark a breaking change with `!` before the colon (`feat(api)!: ...`) or a `BREAKING CHANGE:` footer. That footer is the one token that must be uppercase.
```

The spec itself mandates only `feat` and `fix`; every other type is convention the project declares. State the list explicitly or the agent will improvise, usually landing on `chore:`.

## Pull requests

```markdown
Open the pull request as a draft when starting: `gh pr create --draft`. Mark it ready when the work is complete: `gh pr ready`.

For an issue-related PR, put `Closes #<issue-number>` in the PR body. Repeat the keyword before each reference — `Closes #10, closes #12` closes both, `Closes #10, #12` closes only the first.

Closing keywords take effect only when the PR targets the default branch. Against any other base they are silently ignored: nothing links, nothing closes, no warning.
```

`gh pr ready` needs no argument while on the task branch. Leave `gh pr ready --undo` out — reverting to draft is plan-dependent, so it cannot be a required step.

GitHub accepts nine keywords — `close`, `closes`, `closed`, `fix`, `fixes`, `fixed`, `resolve`, `resolves`, `resolved` — all equivalent. Cross-repo form is `owner/repo#123`, but it needs push access to the target and is unreliable; prefer same-repo references.

## Sources

- <https://www.conventionalcommits.org/en/v1.0.0/>
- <https://conventional-branch.github.io/>
- <https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue>
- <https://cli.github.com/manual/gh_pr_ready>
