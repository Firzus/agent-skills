---
name: code-review
description: >-
  Reviews pull requests, git diffs, branches, and code changes for bugs,
  regressions, repository guideline violations, and high-confidence risks. Use
  when the user asks for a code review, PR review, pull request review, review
  of changes, review this diff, or wants automated review feedback before
  merge. For GitHub pull requests, requires the GitHub CLI (`gh`) authenticated
  in the target repository.
---

# Code Review

Use this skill to review changed code with a senior-engineer stance: find real
bugs and risks introduced by the change, avoid noise, and lead with actionable
findings.

## Scope

Review only the changed behavior unless the user explicitly asks for a broader
audit. Do not treat pre-existing issues as findings unless the change makes
them newly reachable or worse.

For GitHub PRs, require `gh` to be installed and authenticated. Use `gh` for PR
metadata, PR diffs, previous PR comments, and posting comments when requested.
Use `git` for local diffs, branch history, `blame`, and full commit SHAs.

Do not run builds, typechecks, linters, or test suites as part of review unless
the user asks. CI should catch compiler, formatter, import, and basic lint
failures.

## Workflow

1. Identify the review target:
   - GitHub PR: inspect it with `gh pr view` and `gh pr diff`.
   - Local branch or diff: compare against the requested base branch, merge
     base, or staged/unstaged changes.
   - If the target is unclear, ask one concise clarifying question.

2. Check whether review should proceed:
   - Skip closed or draft PRs unless the user explicitly asks.
   - Skip trivial generated or automated changes unless the user asks.
   - If you already reviewed the same PR and no relevant changes were added,
     say so instead of posting duplicate feedback.

3. Gather repository guidance:
   - Read relevant `AGENTS.md`, `CLAUDE.md`, Cursor rules, contribution docs,
     and review guidelines that apply to the modified files.
   - Use guidance only when it is specific enough to support a finding.

4. Review through five independent lenses. Use parallel subagents when the
   runtime supports them; otherwise perform separate passes yourself:
   - **Guideline compliance**: check changed code against applicable repo
     instructions.
   - **Obvious bugs**: look for correctness issues, broken edge cases,
     regression risks, resource leaks, bad error handling, and unsafe state.
   - **Historical context**: use `git blame`, recent commits, and file history
     to understand why nearby code exists.
   - **Prior PR context**: when available, inspect previous PRs or comments
     touching the same files with `gh`.
   - **Local contracts**: verify changes respect nearby comments, invariants,
     tests, API contracts, and documented assumptions in modified files.

5. Score each potential issue before reporting it:
   - `0`: false positive, pre-existing issue, or unsupported speculation.
   - `25`: possible issue, but not verified.
   - `50`: real issue, but minor or unlikely to matter in practice.
   - `75`: important and likely real, with strong evidence.
   - `100`: certain, reproducible, and directly caused by the change.

For automated PR comments, report only issues scored `80` or higher. In chat,
lead with high-confidence findings and put uncertain observations under open
questions or residual risk.

## False Positives To Filter

Do not report:

- Pre-existing issues not introduced or worsened by the change.
- Pedantic style nits, formatting, imports, or issues a linter/typechecker
  should catch.
- General quality concerns not tied to a concrete risk.
- Missing tests unless the absence creates a clear regression risk for changed
  behavior.
- Intentional behavior changes that match the PR goal.
- Guideline issues where the relevant instruction does not explicitly apply.
- Problems on untouched lines, unless the changed lines make them newly fail.

## Output

Follow the host agent's normal response conventions. Do not add vendor-specific
signatures, attribution footers, or emoji unless the user asked for that format.

Lead with findings, ordered by severity. For each finding include:

- The affected file or code location.
- The bug or risk in one concise sentence.
- Why it matters and what condition triggers it.
- The relevant evidence: changed code, guideline text, history, or prior PR
  context.
- A concrete fix direction when it is not obvious.

After findings, include open questions or assumptions. Keep summaries brief and
secondary. If no issues are found, say that clearly and mention any review gaps
such as unavailable PR metadata, missing `gh` authentication, or tests not run.

When posting a GitHub PR comment with `gh pr comment`, keep it concise and use
full commit SHAs in code links. GitHub links must use this shape:

```text
https://github.com/owner/repo/blob/<full-sha>/path/to/file.ext#L10-L15
```
