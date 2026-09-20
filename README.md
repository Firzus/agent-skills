# agent-skills

> Community-maintained Agent Skills for AI coding assistants.

[![skills.sh](https://skills.sh/b/Firzus/agent-skills)](https://skills.sh/Firzus/agent-skills)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](./LICENSE)

[Global instructions](#global-instructions) • [Install](#install) • [Browse skills](#browse-skills) • [Manual install](#manual-install) • [Skill structure](#skill-structure)

## Overview

`agent-skills` is a registry of 38 Markdown-based skills for AI coding agents — Claude Code, Cursor, Codex, and any assistant that supports local skill folders. Each skill packages task-specific instructions, references, and optional helper scripts behind a single `SKILL.md` entry point, kept focused through progressive disclosure. The repository also hosts 26 documentary corpora under [`doc/`](./doc/README.md); these are source material, not installable skills.

> [!NOTE]
> These skills are independent, community-maintained reference material. They are not official products of the vendors or tools they cover.

## Global instructions

Keep instruction ownership explicit. The [workflow V2 guide](./skills/engineering/setup-codex/workflow.md) describes the global policy, personal preferences, project agreements, and four on-demand method skills.

Universal behavior and Git conventions belong in the [global operating policy](./skills/engineering/setup-codex/codex-operating-policy.md). Project-specific rules, documentary entry points, and Linear context belong in the project's `AGENTS.md`; use [`manage-project`](./skills/engineering/manage-project) when defining those agreements.

Personal instructions contain language and presentation preferences only. For example, use this block in your user-level instruction file, such as `~/.codex/AGENTS.md`:

```markdown
# Global working agreements

## Communication

- Reply in French. Write code, comments, commits, branches, pull requests, issues, and documentation in English.
- Use a table or Mermaid diagram when it communicates structure more clearly than prose.
```

Adapt these preferences to the user. Tool definitions, model availability, and session paths come from the environment, not permanent copies.

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

- [`manage-project`](./skills/engineering/manage-project) — Plans outcomes and tracks work in Linear, links GitHub delivery, and maintains project agreements and domain vocabulary.
- [`prototype`](./skills/engineering/prototype) — Tests interface, logic, and feasibility choices in a representative environment with bounded experiments.
- [`implement`](./skills/engineering/implement) — Delivers authorized changes with integrated TDD and current system documentation.
- [`setup-codex`](./skills/engineering/setup-codex) — Installs the four workflow skills and the Codex operating policy from an approved checkout, with conflict checks, backups, and repeatable setup.
- [`skills`](./skills/engineering/skills) — Installs, updates, and authors Agent Skills with the `skills` CLI (`skills.sh`): sources, project vs global scope, symlink vs copy, discovery rules, debugging.
- [`deep-research`](./skills/engineering/deep-research) — Requires a background research subagent, with traceable evidence, reusable research dossiers, and main-agent verification; reports a blocker when delegation is unavailable.
- [`youtube-transcript`](./skills/engineering/youtube-transcript) — Extracts YouTube captions, routes audio transcription, and produces chapter-based learning reports with visual evidence, targeted review, and claim verification.
- [`gamification`](./skills/engineering/gamification) — Gamification design grounded in motivation science: design process, mechanics catalog (points, badges, leaderboards, streaks), anti-patterns, ethics gate.
- [`canvas`](./skills/engineering/canvas) — Renders standalone analytical artifacts (reviews, audits, reports, dashboards) as self-contained HTML canvases opened beside the chat, in any agent environment.
- [`improve-architecture`](./skills/engineering/improve-architecture) — Scans a codebase for deepening opportunities, presents them on a live canvas, then delegates each approved refactor to a bounded sub-agent with verified, tracked progress.
- [`slop-audit`](./skills/engineering/slop-audit) — Audits a codebase for dead code and AI slop, clears every suspect against the legitimate reason it exists, and removes only what a verification ladder supports.
- [`vite-plus`](./skills/web/vite-plus) — Vite+ (`vp`): setup, migrations, checks, testing, packaging, and workspace tasks, validated with reproducible smoke tests.
- [`tauri`](./skills/web/tauri) — Tauri 2 development, scoped permissions, desktop/mobile validation, and Windows runtime inspection with tauri-agent-kit.
- [`video-report`](./skills/engineering/video-report) — Records and verifies focused video evidence with FFmpeg after visual bug fixes or on request, across web pages, native applications, and games.
- [`dokploy-best-practices`](./skills/web/dokploy-best-practices) — Self-hosting on Dokploy (Docker Swarm + Traefik): CI/CD, zero-downtime, hardening.
- [`web-assets-optimization`](./skills/web/web-assets-optimization) — Optimizes all web assets: images, video, GIF replacement, fonts, SVG, plus per-asset delivery strategy (LCP, lazy loading).
- [`web-extension`](./skills/web/web-extension) — Builds, ports, tests, and packages WebExtensions for Chromium, Firefox, and Safari with explicit compatibility, permission, lifecycle, and store gates.
- [`imagegen`](./skills/engineering/imagegen) — Generates and edits images via Codex CLI (ChatGPT account), targeting Images 2.5 with native transparency only.
- [`extract-theme`](./skills/web/extract-theme) — Extracts a website's design tokens into shadcn/ui + Tailwind CSS v4.
- [`figma-to-code`](./skills/web/figma-to-code) — Implements a Figma design in the project's stack (or as a standalone review page) via the Figma MCP: tokens, committed assets, and a geometry-diff + screenshot loop until pixel-accurate.
- [`frontend-design`](./skills/web/frontend-design) — Router over the frontend-design pipeline: design-system → greyboxing → real-content, handing off through `DESIGN.md` and `PAGES.md`.
- [`design-references`](./skills/web/design-references) — Delegates focused design research using a bundled catalog, prioritizing user-approved designs and relevant product surfaces; distinguishes visual, motion, and behavioral evidence and keeps exploration read-only.
- [`design-system`](./skills/web/design-system) — Turns a brief into a validated design system: design read, dials, tokens, multi-surface themes, recorded in `DESIGN.md`.
- [`greyboxing`](./skills/web/greyboxing) — Greyboxes a site's pages from `DESIGN.md`: per-page loop with prototype variants, motion theses, and a screenshot-verified review.
- [`real-content`](./skills/web/real-content) — Replaces a greyboxed site's placeholders with real copy, imagery, and data, closed by a copy self-audit.
- [`shaders`](./skills/web/shaders) — GPU-accelerated visual effects in React/Next.js with the `shaders` npm package.
- [`nextjs`](./skills/web/nextjs) — Next.js 16+ App Router: server/client boundaries, caching, Server Actions, generated route types, view transitions, and migration; Next.js 16.3+ workflows for Cache Components adoption, instant navigation, runtime verification, and Partial Prefetching.
- [`swr`](./skills/web/swr) — SWR v2 data fetching for React/Next.js: cache keys, revalidation, mutations, pagination, and subscriptions.
- [`tanstack-store`](./skills/web/tanstack-store) — Version-aware client state: immutable updates, derived stores, selectors, framework adapters, scoped SSR state, and legacy API migrations.
- [`zod`](./skills/web/zod) — Version-aware schema validation: boundary parsing, coercion, refinements, errors, codecs, JSON Schema, and Zod migrations.
- [`payload-cms`](./skills/web/payload-cms) — Payload CMS 3.x: config-as-schema, opt-in access control, hooks, Local API and transactions, plus the official MCP plugin.
- [`astryx`](./skills/web/astryx) — Astryx (`@astryxdesign`), Meta's agent-ready React + StyleX design system: setup, CLI discovery loop, xstyle, tokens, theming, migration.
- [`adsense`](./skills/web/adsense) — AdSense publisher monetization: policy gate, RPM/coverage metrics, placement and Auto ads, revenue levers, ad-caused CWV damage, revenue-drop diagnostics.

### Game development

- [`unity`](./skills/game/unity) — Routes each Unity need to one chosen tool, and keeps projects CoreCLR-ready.
- [`figma-to-unity`](./skills/game/figma-to-unity) — Implements Figma designs as Unity UI Toolkit via the Figma MCP.

## Documentary knowledge base

The 26 corpora in [`doc/`](./doc/README.md) — 24 game systems plus an agent-tooling review and a dead-code and AI-slop evidence base — are Markdown source material for future documentation and skills. They are deliberately absent from the skills marketplace and have no `SKILL.md` entry point.

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
