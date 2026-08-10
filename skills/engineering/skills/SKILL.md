---
name: skills
description: Install, update, remove and author Agent Skills with the `skills` CLI (skills.sh, vercel-labs/skills). Use when adding a skill from a repo, sharing skills across agents, choosing project vs global scope, publishing a skill repo, or debugging a skill the agent never fires.
---

# skills CLI

`skills` (npm `skills`, repo `vercel-labs/skills`, index at [skills.sh](https://skills.sh)) installs `SKILL.md` folders from any git source into the skill directory of ~70 coding agents — Claude Code, Codex, Cursor, OpenCode and the rest. One canonical copy, symlinked into each agent, so a skill written once is available everywhere.

Run it with `npx skills <command>`. The CLI's own `--help` is the source of truth for flags; this document carries what `--help` does not confess.

## Commands

| Command | What it does |
| --- | --- |
| `add <source>` | Install skills from a source (see below) |
| `use <source>` | Print a prompt for one skill without installing; `--agent` starts that agent with it |
| `list` (`ls`) | List installed skills |
| `find [query]` | Search the ecosystem; `--owner <org>` scans every repo of an org |
| `update [skills...]` | Pull the latest version of installed skills |
| `remove [skills...]` (`rm`) | Uninstall from agents |
| `init [name]` | Scaffold a `SKILL.md` template |

Common flags on `add`: `-s, --skill <names...>` (quote names containing spaces, `'*'` for all), `-a, --agent <ids...>`, `-l, --list` to inspect a repo without installing, `-g, --global`, `-y, --yes`, `--all`, `--copy`.

```bash
npx skills add vercel-labs/agent-skills --list
npx skills add vercel-labs/agent-skills --skill frontend-design -g -a claude-code -y
npx skills use owner/repo@some-skill | claude
```

## Sources

`add`, `use` and `find` resolve the same source formats: GitHub shorthand (`owner/repo`), full GitHub or GitLab URL, a `tree/` URL pointing straight at one skill folder, any git URL (`git@…`, `ssh://…`), a local path (`./my-skills`), or a direct download URL to a lone `SKILL.md` or a `.zip`/`.tar`/`.tar.gz` archive.

Private repos use the same command as public ones: the CLI reuses the git credentials already configured for that URL — credential helper first, then `gh repo clone`, then SSH. `GITHUB_TOKEN` / `GH_TOKEN` are optional and only widen API access (private downloads, update checks). Setting a token is the fix when update checks fail on a private repo that installs fine.

## Scope and method

- **Project** (default) — `./<agent>/skills/`, committed with the repo, shared with the team. Pick this for anything the codebase itself depends on.
- **Global** (`-g`) — `~/<agent>/skills/`, follows you across projects. Pick this for personal workflow skills.

**Symlink** (default) points every agent at one canonical copy — a single source of truth, and `update` touches one file. **`--copy`** gives each agent an independent copy: reach for it only where symlinks break (Windows without developer mode, some CI checkouts, sandboxes that refuse to follow links), and accept that edits then have to be repeated per agent.

Agent ids and their paths vary per agent (`claude-code` → `.claude/skills/`, `codex` → `.agents/skills/` project-side but `~/.codex/skills/` globally). Read the support table in the CLI's README rather than guessing a path.

## Authoring a skill repo

A skill is a directory holding `SKILL.md` with YAML frontmatter — `name` (lowercase, hyphens) and `description` (what it does *and* when to fire it). Everything about writing the body well lives in the `writing-for-agents` reference; what the CLI adds is discovery.

Discovery walks known container directories — repo root if it holds `SKILL.md`, then `skills/`, `skills/.curated/`, `skills/.experimental/`, `skills/.system/`, plus each agent's own directory — up to three levels deep. Both `skills/<name>/SKILL.md` and the catalog layout `skills/<category>/<name>/SKILL.md` are found. A `SKILL.md` at a shallower level **shadows everything nested below it**, so a stray `SKILL.md` at a category root hides that whole category. `--full-depth` extends discovery outside the container directories (`examples/`, `tests/`).

Hide a work-in-progress skill with `metadata.internal: true` in the frontmatter; it then installs only when `INSTALL_INTERNAL_SKILLS=1` is set.

```markdown
---
name: my-skill
description: What this skill does and when to use it
metadata:
  internal: true
---
```

## Debugging

Work through these in order when a skill misbehaves:

1. **Repo lists nothing** — the skill sits outside a discovery container or deeper than three levels, or a shallower `SKILL.md` shadows it. Confirm with `npx skills add <source> --list`, and retry with `--full-depth`.
2. **Installed but never fires** — the agent has it; the `description` is the pointer that failed. Sharpen its trigger wording, not the body.
3. **Edits do not reach the agent** — a `--copy` install, so each agent holds a stale independent copy; reinstall as symlinks or repeat the edit per agent.
4. **`update` reports nothing on a private repo** — API access, not git access: export `GITHUB_TOKEN` or `GH_TOKEN`.

Archive limits (10 MiB download, 25 MiB extracted, 1000 files) are overridable via `SKILLS_DOWNLOAD_MAX_BYTES`, `SKILLS_EXTRACT_MAX_BYTES` and `SKILLS_EXTRACT_MAX_FILES` — raise them only for a source you trust.
