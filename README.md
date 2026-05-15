# agent-skills

> Community-maintained Agent Skills for AI coding assistants.

[![skills.sh](https://skills.sh/b/Firzus/agent-skills)](https://skills.sh/Firzus/agent-skills)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](./LICENSE)

[Overview](#overview) • [Available skills](#available-skills) • [Install](#install) • [Manual install](#manual-install) • [Skill structure](#skill-structure)

## Overview

`agent-skills` is a small registry of Markdown-based skills for agents such as Claude Code, Cursor, Codex, and generic coding assistants. Each skill packages task-specific instructions, references, and optional helper scripts behind a `SKILL.md` entry point.

The repo is distributed through the [skills CLI](https://github.com/vercel-labs/skills) at `Firzus/agent-skills`, but each skill can also be copied into an agent-specific skills folder.

> [!NOTE]
> These skills are independent, community-maintained reference material. They are not official products of the vendors or tools they cover.

## Features

- **Progressive disclosure** — each `SKILL.md` stays focused and links to deeper references only when needed.
- **Multi-agent layout** — skills work with Claude Code, Cursor, Codex, and generic agents that support local skill folders.
- **Install together or separately** — add the whole collection or a single skill with the skills CLI.
- **Practical references** — skills include checklists, examples, and helper scripts where a task benefits from automation.

## Available skills

| Skill | Description |
| ----- | ----------- |
| [`vite-plus-best-practices`](./skills/vite-plus-best-practices) | Best practices for Vite+ (`vp`), including commands, unified `vite.config.ts`, migrations, testing, monorepos, commit hooks, and library packaging. |
| [`imagegen`](./skills/imagegen) | Generates or edits project images with `gpt-image-2` through the local Codex CLI, including mockups, logos, photorealistic scenes, infographics, and transparent-background workflows. |
| [`image-optimization`](./skills/image-optimization) | Audits and optimizes web app images for performance, SEO, accessibility, responsive delivery, LCP handling, and framework-aware markup. |
| [`find-skills`](./skills/find-skills) | Discovers and recommends skills already installed locally, without registry calls, network access, or automatic installs. |
| [`extract-theme`](./skills/extract-theme) | Extracts colors, typography, radius, spacing, and shadows from a public website into shadcn/ui + Tailwind CSS v4 tokens. |
| [`compact-shim`](./skills/compact-shim) | Cursor-only hand-off summary skill for `/compact`, `/condense`, and BYOK-friendly conversation compaction workflows. |

## Install

Install every skill from this repository:

```bash
npx skills add Firzus/agent-skills
```

Install one skill:

```bash
npx skills add Firzus/agent-skills --skill vite-plus-best-practices
```

<details>
<summary>Useful skills CLI flags</summary>

```bash
# List available skills without installing them
npx skills add Firzus/agent-skills --list

# Install globally for Claude Code, non-interactive
npx skills add Firzus/agent-skills \
  --skill vite-plus-best-practices \
  -g -a claude-code -y

# Install all skills, non-interactive
npx skills add Firzus/agent-skills --all -y
```

</details>

## Manual install

If you do not use the skills CLI, clone this repository and copy the skill directory into your agent's skills folder.

```bash
git clone https://github.com/Firzus/agent-skills.git
cp -r agent-skills/skills/vite-plus-best-practices ~/.claude/skills/
```

| Agent | Destination |
| ----- | ----------- |
| Claude Code | `~/.claude/skills/<skill-name>/` |
| Codex CLI | `~/.codex/skills/<skill-name>/` |
| Cursor | `~/.cursor/skills/<skill-name>/` or `.cursor/skills/<skill-name>/` |
| Generic agents | `~/.agents/skills/<skill-name>/` |

## Skill structure

Each skill is a folder with a `SKILL.md` file and optional supporting files:

```text
skills/<skill-name>/
├── SKILL.md          # YAML frontmatter + concise agent instructions
├── topic-a.md        # optional reference loaded on demand
├── references/       # optional longer-form references
└── scripts/          # optional helper scripts
```

A skill folder name should match the `name:` field in `SKILL.md` frontmatter. Keep the description concrete because agents use it to decide when the skill applies.

## Contributing

Add or update skills under `./skills/<skill-name>/`, then keep the table in [Available skills](#available-skills) in sync. Keep each `SKILL.md` concise and move detailed guidance into sibling reference files.

Before opening a pull request, check that:

- [ ] `SKILL.md` has `name` and `description` frontmatter.
- [ ] The skill folder name matches the `name:` value.
- [ ] The root README table includes any added, renamed, or removed skill.
- [ ] No secrets, API keys, or internal URLs are included.

See [AGENTS.md](./AGENTS.md) for repository conventions used by coding agents.
