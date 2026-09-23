# AGENTS.md

## Project and scope

This repository distributes agent skills through `Firzus/agent-skills`. It is documentation-first, with one application exception: the technical Canvas reader. These instructions apply throughout the repository; check for closer instructions before editing.

## Sources of truth

- `README.md` is the newcomer-facing guide: choose a skill, install it, understand its prerequisites, and find the full catalog. Keep maintenance details out of the getting-started path.
- `skills/<section>/<name>/SKILL.md` owns each skill's public workflow. Supporting references and scripts belong in the same folder.
- `.claude-plugin/marketplace.json` owns installation groups. Add or remove a skill there and in the README together; keep each skill in its appropriate section.
- `doc/<subject>/overview.md` introduces a documentary corpus. Corpora are not skills: they have no `SKILL.md` and are excluded from the marketplace.

## Editing constraints

- Write repository documentation, code, comments, and Git text in English. Preserve the Canvas requirement to write generated technical reports in the user's conversation language.
- When authoring skills or project instructions, use `skills/engineering/writing-for-agents/SKILL.md`. Present the complete proposed project-instruction text or diff for approval before applying it.
- Preserve other contributors' intent and unrelated local work. Keep one authoritative explanation; retain operational references, not authoring research logs or historical evaluation reports inside skills.
- Keep `SKILL.md` below 500 lines, with `name` and `description` in YAML frontmatter. The folder name must match `name`; preserve explicit invocation settings unless changing them is in scope.
- Place runtime helpers only under a skill's `scripts/`. Do not introduce a build system or package manager outside the Canvas reader exception.
- The Canvas exception is `skills/engineering/canvas/scripts/reader/`: React, TypeScript, Tailwind CSS, Vite, npm dependencies, lockfile, configuration, and tests are permitted there. Keep generated output, dependencies, and logs untracked.
- Never commit secrets, credentials, license keys, private service URLs, or end-user data. Do not change `LICENSE`.

## Execution boundaries

- Do not run `npx skills add` or `npx skills update` from this repository. README installation commands are for end users, not maintenance checks.
- Normal repository edits do not authorize image generation, nested Codex runs, or network installs. Dependency installation is allowed for authorized Canvas reader work only.
- Editing `setup-codex` does not authorize changing the active user profile. Use isolated temporary profiles for installer tests.
- Do not create or update external issues, push, open pull requests, merge, or deploy as a side effect of documentation work. Respect the approved delivery scope.

## Validation

For documentation changes, check affected claims, local links and anchors, frontmatter, line counts, and consistency between README entries, skill folders, and the marketplace. Exclude code examples from literal link checks. Verify each documentary corpus has its overview. Run `git diff --check` and inspect the scoped diff, including untracked files.

| Changed area | Required checks | Working directory / prerequisite |
| --- | --- | --- |
| Canvas reader | `npm test` and `npm run build`; browser checks for affected visible behavior | `skills/engineering/canvas/scripts/reader/`; Node and installed dependencies |
| Codex setup installer or embedded policy | `python skills/engineering/setup-codex/scripts/test_setup_codex.py` | Repository root; Python and PowerShell 7; temporary profiles only |
| Other helper scripts | Relevant safe checks exposed by the owning skill and script | Confirm inputs and effects before execution |

Documentary checks do not prove agent behavior or host loading. Report untested runtime boundaries and distinguish a local change from an installed or published skill.
