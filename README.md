# agent-skills

> Community-maintained Agent Skills for AI coding assistants.

[![skills.sh](https://skills.sh/b/Firzus/agent-skills)](https://skills.sh/Firzus/agent-skills)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](./LICENSE)

[Global instructions](#global-instructions) • [Install](#install) • [Browse skills](#browse-skills) • [Manual install](#manual-install) • [Skill structure](#skill-structure)

## Overview

`agent-skills` is a registry of 29 Markdown-based skills for AI coding agents — Claude Code, Cursor, Codex, and any assistant that supports local skill folders. Each skill packages task-specific instructions, references, and optional helper scripts behind a single `SKILL.md` entry point, kept focused through progressive disclosure. The repository also hosts 24 game-system documentary corpora under [`doc/`](./doc/README.md); these are source material, not installable skills.

> [!NOTE]
> These skills are independent, community-maintained reference material. They are not official products of the vendors or tools they cover.

## Global instructions

How the agent talks to you, and how it handles version control — the two things that stay the same in every repository. Copy the block into your harness's top-level instruction file — `~/.codex/AGENTS.md` for Codex, `~/.claude/CLAUDE.md` for Claude Code, or the equivalent for your tool.

Keep global instructions small and non-redundant. Git conventions live here because they apply across repositories, while project-specific architecture, commands, and validation belong in the project.

Anything genuinely project-specific — the stack's testing policy, architecture and code standards — belongs to the project; the [`setup-project`](./skills/engineering/setup-project) skill sets that up for you.

```markdown
# Global working agreements

## Communication

- Reply in French. Write code, comments, commits, branches, pull requests, issues, and documentation in English.
- Use a table or Mermaid diagram when it communicates structure more clearly than prose.

## Git delivery

- Keep the branch or worktree prepared by the task environment. When a user-facing branch must be created, name it `<type>/<kebab-case-subject>`, where `<type>` is `feature`, `bugfix`, `hotfix`, `release`, or `chore`.
- Use Conventional Commits. Mark breaking changes with `!` or a `BREAKING CHANGE:` footer.
- Open pull requests as drafts and mark them ready only after the requested work and focused validation are complete.
- In pull requests targeting the default branch, repeat `Closes #<number>` for every issue that should close.

## Git safety

- Preserve uncommitted work before any operation that rewrites the working tree. Never discard it without explicit approval.
- Preview file cleanup before deletion. Do not delete ignored local settings, credentials, or environment files.
- Force-push only with `--force-with-lease --force-if-includes`.
```

Adapt the language pairing and Git conventions to your workflow. Keep model behavior, project commands, architecture, and validation rules in their respective instruction layers rather than duplicating them here.

## Install

Add the whole collection:

```bash
npx skills add Firzus/agent-skills
```

Add a single skill — replace `<skill-name>` with any name from [Browse skills](#browse-skills):

```bash
npx skills add Firzus/agent-skills --skill <skill-name>
```

<details>
<summary>More CLI options</summary>

```bash
# List available skills without installing them
npx skills add Firzus/agent-skills --list

# Install globally for Claude Code, non-interactive
npx skills add Firzus/agent-skills --skill <skill-name> -g -a claude-code -y

# Install all skills, non-interactive
npx skills add Firzus/agent-skills --all -y
```

</details>

## Browse skills

Jump to a category: [Web & app development](#web--app-development) · [Game development](#game-development)

Install any skill with `npx skills add Firzus/agent-skills --skill <name>`.

### Web & app development

- [`setup-project`](./skills/engineering/setup-project) — Writes a project's `AGENTS.md` (overview, guardrails, project decisions), configures the repository, and installs the skills matching the stack.
- [`setup-codex`](./skills/engineering/setup-codex) — Installs a Codex operating policy and its minimal user-level configuration with backups and idempotent updates.
- [`skills`](./skills/engineering/skills) — Installs, updates, and authors Agent Skills with the `skills` CLI (`skills.sh`): sources, project vs global scope, symlink vs copy, discovery rules, debugging.
- [`gamification`](./skills/engineering/gamification) — Gamification design grounded in motivation science: design process, mechanics catalog (points, badges, leaderboards, streaks), anti-patterns, ethics gate.
- [`vite-plus-best-practices`](./skills/web/vite-plus-best-practices) — Best practices for Vite+ (`vp`): config, migrations, testing, monorepos.
- [`tauri`](./skills/web/tauri) — Tauri v2+: owned IPC, capabilities-first permissions, CDP shell debugging, mobile-safe structure.
- [`chrome-devtools`](./skills/engineering/chrome-devtools) — Drives and inspects Chrome via the official chrome-devtools-mcp server: uid-snapshot interaction, performance traces with insights, network/console debugging, emulation.
- [`dokploy-best-practices`](./skills/web/dokploy-best-practices) — Self-hosting on Dokploy (Docker Swarm + Traefik): CI/CD, zero-downtime, hardening.
- [`web-assets-optimization`](./skills/web/web-assets-optimization) — Optimizes all web assets: images, video, GIF replacement, fonts, SVG, plus per-asset delivery strategy (LCP, lazy loading).
- [`web-extension`](./skills/web/web-extension) — Builds, ports, tests, and packages WebExtensions for Chromium, Firefox, and Safari with explicit compatibility, permission, lifecycle, and store gates.
- [`imagegen`](./skills/engineering/imagegen) — Generates and edits images with `gpt-image-2` via Codex CLI (ChatGPT subscription), with a chroma-key pipeline for transparent cutouts.
- [`extract-theme`](./skills/web/extract-theme) — Extracts a website's design tokens into shadcn/ui + Tailwind CSS v4.
- [`figma-to-code`](./skills/web/figma-to-code) — Implements a Figma design in the project's stack (or as a standalone review page) via the Figma MCP: tokens, committed assets, and a geometry-diff + screenshot loop until pixel-accurate.
- [`frontend-design`](./skills/web/frontend-design) — Router over the frontend-design pipeline: design-system → greyboxing → real-content, handing off through `DESIGN.md` and `PAGES.md`.
- [`design-system`](./skills/web/design-system) — Turns a brief into a validated design system: design read, dials, tokens, multi-surface themes, recorded in `DESIGN.md`.
- [`greyboxing`](./skills/web/greyboxing) — Greyboxes a site's pages from `DESIGN.md`: per-page loop with prototype variants, motion theses, and a screenshot-verified review.
- [`real-content`](./skills/web/real-content) — Replaces a greyboxed site's placeholders with real copy, imagery, and data, closed by a copy self-audit.
- [`shaders`](./skills/web/shaders) — GPU-accelerated visual effects in React/Next.js with the `shaders` npm package.
- [`nextjs`](./skills/web/nextjs) — Next.js 16+ App Router: server/client boundary, dynamic-by-default caching (`use cache`), Server Actions, generated route types, view transitions, and the 15 → 16 migration.
- [`swr`](./skills/web/swr) — SWR v2 data fetching for React/Next.js: cache keys, revalidation, mutations, pagination, and subscriptions.
- [`payload-cms`](./skills/web/payload-cms) — Payload CMS 3.x: config-as-schema, opt-in access control, hooks, Local API and transactions, plus the official MCP plugin.
- [`astryx`](./skills/web/astryx) — Astryx (`@astryxdesign`), Meta's agent-ready React + StyleX design system: setup, CLI discovery loop, xstyle, tokens, theming, migration.
- [`adsense`](./skills/web/adsense) — AdSense publisher monetization: policy gate, RPM/coverage metrics, placement and Auto ads, revenue levers, ad-caused CWV damage, revenue-drop diagnostics.

### Game development

- [`unity`](./skills/game/unity) — Routes each Unity need to one chosen tool, and keeps projects CoreCLR-ready.
- [`figma-to-unity`](./skills/game/figma-to-unity) — Implements Figma designs as Unity UI Toolkit via the Figma MCP.
- [`magica-cloth-2`](./skills/game/magica-cloth-2) — Code-first cloth/jiggle physics with Magica Cloth 2 in Unity via the Unity MCP.

## Documentary knowledge base

The 24 game-system corpora in [`doc/`](./doc/README.md) are Markdown source material for future documentation and skills. They are deliberately absent from the skills marketplace and have no `SKILL.md` entry point.

## Manual install

If you do not use the skills CLI, clone the repo and copy a skill folder into your agent's skills directory:

```bash
git clone https://github.com/Firzus/agent-skills.git
cp -r agent-skills/skills/<section>/<skill-name> ~/.claude/skills/
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

The folder name matches the `name:` field in `SKILL.md` frontmatter. Keep each description concrete — agents use it to decide when the skill applies.
