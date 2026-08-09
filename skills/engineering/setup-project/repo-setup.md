# Fragment: repository setup — one-time

This is an **action**, not a rule. It runs once when the repository is created and never appears in `AGENTS.md` — a permanent instruction describing a setting that is already applied is a copy that goes stale.

Run it only when the project has a GitHub remote, and only after the user confirms. These settings change how everyone merges, so they are not a safe default to apply silently.

## Merge behaviour

```bash
gh repo edit \
  --enable-squash-merge \
  --squash-merge-commit-message pr-title \
  --enable-merge-commit=false \
  --enable-rebase-merge=false \
  --delete-branch-on-merge \
  --allow-update-branch
```

Squash-only keeps one commit per pull request on the default branch, which is what makes the branch history readable and lets Conventional Commits describe delivered units of work rather than intermediate steps.

`--squash-merge-commit-message pr-title` takes the commit subject from the PR title. Tell the user that the PR title becomes the permanent commit message, so it must follow the commit convention.

`--delete-branch-on-merge` removes the head branch on merge, so the branch list stays a picture of open work.

## Protecting the default branch

`gh ruleset` only reads rulesets, so creation goes through the API. Build the payload as a JSON file — `gh api -f` flattens nested rule parameters incorrectly and returns a 422.

```bash
cat > ruleset.json <<'JSON'
{
  "name": "protect-default-branch",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "required_linear_history" },
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": true,
        "allowed_merge_methods": ["squash"]
      }
    }
  ]
}
JSON

gh api --method POST /repos/{owner}/{repo}/rulesets --input ruleset.json
```

What each rule buys:

| Rule | Effect |
|---|---|
| `pull_request` | Direct pushes to the default branch are refused; changes arrive through a PR |
| `required_linear_history` | No merge commits on the default branch |
| `non_fast_forward` | Force-pushes to the default branch are refused |
| `deletion` | The default branch cannot be deleted |

Three details that decide whether this works:

- **`required_approving_review_count` is 0 for a solo project.** GitHub does not let you approve your own pull request, so any value above zero locks the author out of their own repository. Raise it only when there is a second maintainer.
- **All five `pull_request` parameters must be sent together.** Omitting some returns a 422 on `rule/0`.
- **`required_linear_history` takes no `parameters` key at all.** Sending one, even empty, is the usual cause of a 422 on that rule.

`allowed_merge_methods` must agree with the repository settings above. Requiring a method the repository has disabled blocks every merge.

## Verify

```bash
gh ruleset list
gh ruleset check --default
```

`gh ruleset check` shows the rules that would apply to a branch, which is how you confirm the ruleset actually targets the default branch rather than nothing.

## Sources

- `gh repo edit --help`, `gh ruleset --help` (verified locally)
- <https://docs.github.com/en/rest/repos/rules>
- <https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/managing-rulesets-for-a-repository>
