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
| [`code-review`](./skills/code-review) | Reviews pull requests, git diffs, branches, and code changes for bugs, regressions, repository guideline violations, and high-confidence risks before merge. |
| [`vite-plus-best-practices`](./skills/vite-plus-best-practices) | Best practices for Vite+ (`vp`), including commands, unified `vite.config.ts`, migrations, testing, monorepos, commit hooks, and library packaging. |
| [`imagegen`](./skills/imagegen) | Generates or edits project images with `gpt-image-2` through the local Codex CLI, including mockups, logos, photorealistic scenes, infographics, and transparent-background workflows. |
| [`image-optimization`](./skills/image-optimization) | Audits and optimizes web app images for performance, SEO, accessibility, responsive delivery, LCP handling, and framework-aware markup. |
| [`extract-theme`](./skills/extract-theme) | Extracts colors, typography, radius, spacing, and shadows from a public website into shadcn/ui + Tailwind CSS v4 tokens. |
| [`shaders`](./skills/shaders) | Builds GPU-accelerated visual effects in React/Next.js with the `shaders` npm package (shaders.com): composition, masking, dynamic prop drivers, shape/SDF effects, SSR safety, and performance budget. |
| [`tauri`](./skills/tauri) | Guides Tauri v2+ app development, IPC, capabilities, plugin permissions, mobile-safe structure, and automated desktop debugging workflows. |
| [`workflow`](./skills/workflow) | UltraCode-style highest-effort mode for large or interconnected tasks: deep upfront reasoning plus dynamic orchestration of parallel sub-agents, with result synthesis and git checkpoints. |
| [`unity6-aaa-best-practices`](./skills/unity6-aaa-best-practices) | Senior Unity 6 developer DO/DON'T best practices for production-quality games: UI Toolkit design systems with USS tokens and MVP data binding, Awaitable async, Addressables, GPU Resident Drawer, zero-allocation discipline, Input System, Build Profiles, CI, and testing. |
| [`ue5-aaa-best-practices`](./skills/ue5-aaa-best-practices) | Senior Unreal Engine 5 developer DO/DON'T best practices for production-quality games: C++ foundation / Blueprint leaf doctrine, GAS, Subsystems, CommonUI + MVVM, Enhanced Input, MetaSounds, soft references, World Partition, Nanite/Lumen decisions, tick discipline, Perforce/DDC/CI, and the automation test stack. |
| [`game-architecture-patterns`](./skills/game-architecture-patterns) | Applies battle-tested game architecture patterns (Game Loop, Update Method, Component/ECS, State, Observer, Event Queue, Command, Object Pool, Spatial Partition, and more) with a symptom→pattern table, solution shapes, costs, and anti-usages. Backbone: Robert Nystrom's _Game Programming Patterns_. |
| [`character-controller`](./skills/character-controller) | Engine-agnostic architecture blueprint for third-person character controllers: kinematic collide-and-slide solver, hierarchical movement states (ground/air/climb/swim/glide), ground handling, jump parametrization and sourced game-feel numbers (coyote time, buffering, gravity multipliers), stamina economy, modular movement verbs, animation interface, network-ready structure, Unity 6 / UE5 mappings, and a 12-entry pitfalls catalog. |
| [`open-world-streaming`](./skills/open-world-streaming) | Engine-agnostic architecture blueprint for open-world streaming: world partitioning into cells, streaming sources with velocity prediction, async load/unload lifecycle with hysteresis, layered radii, memory and frame-time budgets, HLOD/distant representation, fast-travel gates, sourced AAA starting-point numbers, Unity 6 / UE5 mappings, and an 11-entry pitfalls catalog. |

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
