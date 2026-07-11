# agent-skills

> Community-maintained Agent Skills for AI coding assistants.

[![skills.sh](https://skills.sh/b/Firzus/agent-skills)](https://skills.sh/Firzus/agent-skills)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](./LICENSE)

[Install](#install) • [Browse skills](#browse-skills) • [Manual install](#manual-install) • [Skill structure](#skill-structure)

## Overview

`agent-skills` is a registry of 35 Markdown-based skills for AI coding agents — Claude Code, Cursor, Codex, and any assistant that supports local skill folders. Each skill packages task-specific instructions, references, and optional helper scripts behind a single `SKILL.md` entry point, kept focused through progressive disclosure.

> [!NOTE]
> These skills are independent, community-maintained reference material. They are not official products of the vendors or tools they cover.

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

Jump to a category: [Web & app development](#web--app-development) · [Engine best practices](#engine-best-practices) · [Graphics & rendering](#graphics--rendering) · [Game architecture & foundation](#game-architecture--foundation) · [Gameplay & control](#gameplay--control) · [Progression, economy & items](#progression-economy--items) · [World & navigation](#world--navigation) · [Narrative & cinematics](#narrative--cinematics) · [UI, HUD & audio](#ui-hud--audio) · [Multiplayer](#multiplayer)

Install any skill with `npx skills add Firzus/agent-skills --skill <name>`.

### Web & app development

- [`software-architecture`](./skills/software-architecture) — Stack-agnostic architecture for any software (game, desktop, web, service): macro structures, runtime patterns, boundaries, state, cross-cutting concerns.
- [`vite-plus-best-practices`](./skills/vite-plus-best-practices) — Best practices for Vite+ (`vp`): config, migrations, testing, monorepos.
- [`tauri`](./skills/tauri) — Tauri v2+ app development: IPC, capabilities, permissions, mobile-safe structure.
- [`dokploy-best-practices`](./skills/dokploy-best-practices) — Self-hosting on Dokploy (Docker Swarm + Traefik): CI/CD, zero-downtime, hardening.
- [`chrome-devtools`](./skills/chrome-devtools) — Drive a real Chrome via `chrome-devtools-mcp` to debug, test, and profile web apps (console, network, Lighthouse, traces).
- [`image-optimization`](./skills/image-optimization) — Audits and optimizes web images for performance, SEO, and accessibility.
- [`extract-theme`](./skills/extract-theme) — Extracts a website's design tokens into shadcn/ui + Tailwind CSS v4.
- [`shaders`](./skills/shaders) — GPU-accelerated visual effects in React/Next.js with the `shaders` npm package.
- [`swr`](./skills/swr) — SWR v2 data fetching for React/Next.js: cache keys, revalidation, mutations, pagination, and subscriptions.

### Engine best practices

- [`unity6-aaa-best-practices`](./skills/unity6-aaa-best-practices) — Senior Unity 6 DO/DON'T practices across UI, async, rendering, and CI.
- [`ue5-aaa-best-practices`](./skills/ue5-aaa-best-practices) — Senior UE5 DO/DON'T practices: GAS, Subsystems, CommonUI, World Partition.
- [`figma-to-unity`](./skills/figma-to-unity) — Implements Figma designs as Unity UI Toolkit via the Figma MCP.

### Graphics & rendering

- [`stylized-rendering`](./skills/stylized-rendering) — Stylized / NPR cel-shaded rendering with Unity/UE5 mappings.
- [`magica-cloth-2`](./skills/magica-cloth-2) — Code-first cloth/jiggle physics with Magica Cloth 2 in Unity via the Unity MCP.

### Game architecture & foundation

- [`save-persistence`](./skills/save-persistence) — Save systems for single-player and online, with versioning and storage.
- [`scene-flow-manager`](./skills/scene-flow-manager) — Game application flow: state machine, scene composition, gated transitions.
- [`open-world-streaming`](./skills/open-world-streaming) — Open-world streaming: partitioning, async load/unload, HLOD, budgets.

### Gameplay & control

- [`combat-system`](./skills/combat-system) — Action and RPG combat: attack graphs, hit detection, damage pipeline.
- [`character-controller`](./skills/character-controller) — 1st/3rd-person controllers: movement states, jump feel, locomotion.
- [`traversal-system`](./skills/traversal-system) — Traversal verbs (climb/glide/swim/grapple), parkour, mantle/vault, mounts.
- [`camera-system`](./skills/camera-system) — Game cameras: virtual-camera stack, orbit rigs, collision, screen shake.
- [`enemy-ai-framework`](./skills/enemy-ai-framework) — Game AI: FSM/BT/GOAP/utility, perception, navmesh, genre AI.

### Progression, economy & items

- [`inventory-equipment`](./skills/inventory-equipment) — Inventory and equipment with gear RNG and server-authoritative persistence.
- [`loot-drop-system`](./skills/loot-drop-system) — Loot tables, drops, claims, and loot-box compliance.
- [`progression-economy`](./skills/progression-economy) — Progression and economy: stat curves, skill trees, currencies, battle pass.

### World & navigation

- [`world-time-weather`](./skills/world-time-weather) — Time-of-day, weather, and seasons: game clock, weather-as-data, TOD lighting.
- [`teleport-map-unlock`](./skills/teleport-map-unlock) — Fast travel, waypoint networks, map unlocking, and fog of war.
- [`minimap-worldmap`](./skills/minimap-worldmap) — Minimap and world map: bake pipeline, markers, fog of war, multi-layer.
- [`quest-system`](./skills/quest-system) — Quest systems: data model, event-driven runtime, objective tracking.

### Narrative & cinematics

- [`dialogue-system`](./skills/dialogue-system) — Dialogue systems: graph model, runtime sessions, barks, VO/localization.
- [`cinematic-system`](./skills/cinematic-system) — Cutscene systems: timeline model, skip guarantees, cinematography craft.

### UI, HUD & audio

- [`menu-ui-manager`](./skills/menu-ui-manager) — Menu frameworks: router with screen stacks, focus, pause, settings.
- [`hud-system`](./skills/hud-system) — In-game HUDs: event-driven UI, bars/gauges, damage numbers, accessibility.
- [`adaptive-audio`](./skills/adaptive-audio) — Game audio: adaptive music, mix architecture, spatial audio, middleware.

### Multiplayer

- [`coop-session`](./skills/coop-session) — Drop-in co-op (2-4): host's-world session, authority, replication, netcode.

## Manual install

If you do not use the skills CLI, clone the repo and copy a skill folder into your agent's skills directory:

```bash
git clone https://github.com/Firzus/agent-skills.git
cp -r agent-skills/skills/<skill-name> ~/.claude/skills/
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
