# AGENTS.md

## Project

This repository publishes agent skills as `Firzus/agent-skills`. Each skill lives in `skills/<section>/<name>/`, where the section is `engineering`, `web`, or `game`. Two skills rely on an application kept in its own workspace: `mcp/tauri-agent-kit/` (Windows diagnostics for the `tauri` skill) and `mcp/reverse-engineer/` (MCP server for the `reverse-engineer` skill).

## Skills

- Write and revise skills with `skills/engineering/writing-for-agents/SKILL.md`. Its approval gate also applies to changes to this file.
- When adding, renaming, moving, or removing a skill, update together its folder, its section's group in `.claude-plugin/marketplace.json`, and its row in the matching section of the `README.md` "All skills" catalog. Edit "Choose by task" or "Requirements" only when the skill changes them.
- `README.md` serves newcomers: choosing, installing, and prerequisites. Keep maintenance details out of it.

## Applications under `mcp/`

- Keep each application's manifests, lockfile, dependencies, build, and tests inside its `mcp/<name>/` workspace, with generated output, dependencies, and logs untracked. Install dependencies only when the task works on that application.
- Tauri agent kit: publish only generic fixture evidence. Private application captures, logs, and integration backups stay outside the repository and release artifacts. Before native-input tests, reserve the Windows desktop and target only fixture processes you launched; a dispatch acknowledgement or a safe rejection does not prove an observed UI effect.
- Merging a version change to `main` publishes the application through `.github/workflows/<name>-publish.yml`, so change a version only with explicit approval. After a failed run, use **Re-run all jobs**: each publication step publishes only what is missing.

## Boundaries

- README installation commands (`npx skills add`, `npx skills update`) are for end users. Do not run them from this repository: they change the agent's installed skills and check nothing here.
- Testing or editing a skill does not authorize its side effects, such as image generation, nested Codex runs, or network installs.

## Validation

| Changed area | Required checks |
| --- | --- |
| Skills and documentation | Affected claims, local links and anchors (excluding code examples), frontmatter, line counts, and folder, marketplace, and README consistency. Run `git diff --check` and review the diff, including untracked files. |
| MCP server in `mcp/<name>/` | From that folder, the step sequence of `.github/workflows/<name>-check.yml`, with the prerequisites from its README or `CONTRIBUTING.md`. Run steps that download tools only with network authorization. Preserve regression assertions rather than weaken them to pass. |
| Other helper scripts | Safe checks exposed by the owning skill, after confirming inputs and effects. |
