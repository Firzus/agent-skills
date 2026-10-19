# AGENTS.md

## Project and scope

This repository distributes agent skills through `Firzus/agent-skills`. It is documentation-first. A skill that relies on its own application, such as an MCP server, keeps it in a self-contained workspace under `tools/<name>/`: `tools/tauri-agent-kit/` (Windows, covered by the Tauri agent kit section below) and `tools/reverse-engineer/`.

## Sources of truth

- `README.md` is the newcomer-facing guide: choose a skill, install it, understand its prerequisites, and find the full catalog. Keep maintenance details out of the getting-started path.
- `skills/<section>/<name>/SKILL.md` owns each skill's public workflow. Supporting references and scripts belong in the same folder.
- `.claude-plugin/marketplace.json` owns installation groups. Add or remove a skill there and in the README together; keep each skill in its appropriate section.
- `doc/<subject>/overview.md` introduces a documentary corpus, and `doc/README.md` indexes the corpora. Add or remove a corpus and its index entry together. Corpora are not skills: they have no `SKILL.md` and are excluded from the marketplace.
- `tools/tauri-agent-kit/CONTRIBUTING.md` owns the kit's prerequisites and development checks, `tools/tauri-agent-kit/docs/releasing.md` owns its publication gates, and `.github/workflows/tauri-agent-kit-check.yml` is its complete CI check sequence.
- `tools/reverse-engineer/README.md` owns the reverse-engineer server's usage and development checks, and `.github/workflows/reverse-engineer-check.yml` is its CI check sequence.

## Editing constraints

- When authoring skills or project instructions, follow `skills/engineering/writing-for-agents/SKILL.md`, including its approval gate for project instructions.
- Preserve other contributors' intent and unrelated local work.
- Keep `SKILL.md` below 500 lines, with `name` and `description` in YAML frontmatter. The folder name must match `name`; preserve explicit invocation settings unless changing them is in scope.
- Place runtime helpers under the skill's `scripts/`. Keep authoring research logs and historical evaluation reports out of skill folders.
- Keep each application's manifests, lockfiles, dependencies, builds, and tests inside its `tools/<name>/` workspace, with generated output, dependencies, and logs untracked. Install dependencies only for authorized work on that application.
- Never commit secrets, credentials, license keys, private service URLs, or end-user data. Do not change the root `LICENSE`.

## Tauri agent kit

- Keep its fixtures and release tooling under `tools/tauri-agent-kit/`, and private fixture data untracked.
- Publish only generic fixture evidence. Keep private application captures, logs, and integration backups outside the repository and release artifacts.
- Before native-input tests, reserve the Windows desktop and target only owned fixture processes. A dispatch acknowledgement or safe native rejection does not prove an observed UI effect.
- Registry publication requires explicit approval. npm and crates.io publication is not atomic: inspect partial results before resuming, as described in `docs/releasing.md`.

## Execution boundaries

- Do not run `npx skills add` or `npx skills update` from this repository. README installation commands are for end users, not maintenance checks.
- Repository edits do not authorize image generation, nested Codex runs, or network installs.
- Commits, pushes, pull requests, external issue updates, merges, and deployments each require explicit authorization; an editing task does not grant them.

## Validation

For documentation changes, check affected claims, local links and anchors, frontmatter, line counts, and consistency between README entries, skill folders, and the marketplace, and between `doc/README.md` and corpus folders. Exclude code examples from literal link checks. Run `git diff --check` and inspect the scoped diff, including untracked files.

| Changed area | Required checks | Working directory / prerequisite |
| --- | --- | --- |
| Tauri agent kit | The step sequence in `.github/workflows/tauri-agent-kit-check.yml`, from `vp install` through the packaging checks. Preserve regression assertions rather than weakening them to pass CI. | `tools/tauri-agent-kit/`; prerequisites in `CONTRIBUTING.md`; reserve the desktop before native-input tests |
| Reverse-engineer server | The step sequence in `.github/workflows/reverse-engineer-check.yml`: `vp install`, `vp check`, `vp test`, `vp pack`. Real-target tests are opt-in, as described in its README. | `tools/reverse-engineer/`; Node.js 20+ |
| Other helper scripts | Relevant safe checks exposed by the owning skill and script | Confirm inputs and effects before execution |

Documentary checks do not prove agent behavior or host loading. Report untested runtime boundaries and distinguish a local change from an installed or published skill.
