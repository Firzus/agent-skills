# agent-skills

> Community-maintained Agent Skills for AI coding assistants.

[![skills.sh](https://skills.sh/b/Firzus/agent-skills)](https://skills.sh/Firzus/agent-skills)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](./LICENSE)

[Install](#install) • [Browse skills](#browse-skills) • [Manual install](#manual-install) • [Skill structure](#skill-structure)

## Overview

`agent-skills` is a registry of 47 Markdown-based skills for AI coding agents — Claude Code, Cursor, Codex, and any assistant that supports local skill folders. Each skill packages task-specific instructions, references, and optional helper scripts behind a single `SKILL.md` entry point, kept focused through progressive disclosure.

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

- [`reverse-engineer`](./skills/engineering/reverse-engineer) — Reverse engineers how an app implements a mechanism (from source, installed build, and external sources) and writes design notes to replicate it.
- [`simplify`](./skills/engineering/simplify) — Simplifies recently modified code for clarity and consistency without changing behavior.
- [`babysitting-pr`](./skills/engineering/babysitting-pr) — Monitors an open GitHub PR, fixes branch-related CI and review blockers, and keeps it merge-ready.
- [`software-architecture`](./skills/engineering/software-architecture) — Stack-agnostic architecture for any software (game, desktop, web, service): macro structures, runtime patterns, boundaries, state, cross-cutting concerns.
- [`gamification`](./skills/engineering/gamification) — Gamification design grounded in motivation science: design process, mechanics catalog (points, badges, leaderboards, streaks), anti-patterns, ethics gate.
- [`vite-plus-best-practices`](./skills/web/vite-plus-best-practices) — Best practices for Vite+ (`vp`): config, migrations, testing, monorepos.
- [`tauri`](./skills/web/tauri) — Tauri v2+: owned IPC, capabilities-first permissions, CDP shell debugging, mobile-safe structure.
- [`agent-browser`](./skills/engineering/agent-browser) — Drives a real browser from the CLI (CDP, a11y snapshots + refs): interaction, screenshots, emulation, vitals, and CDP attach to Tauri/Electron shells.
- [`dokploy-best-practices`](./skills/web/dokploy-best-practices) — Self-hosting on Dokploy (Docker Swarm + Traefik): CI/CD, zero-downtime, hardening.
- [`web-assets-optimization`](./skills/web/web-assets-optimization) — Optimizes all web assets: images, video, GIF replacement, fonts, SVG, plus per-asset delivery strategy (LCP, lazy loading).
- [`artefact`](./skills/engineering/artefact) — Visualizes a concept as a self-contained HTML document, written to the OS temp dir and opened in the browser.
- [`imagegen`](./skills/engineering/imagegen) — Generates and edits images with `gpt-image-2` via Codex CLI (ChatGPT subscription), with a chroma-key pipeline for transparent cutouts.
- [`extract-theme`](./skills/web/extract-theme) — Extracts a website's design tokens into shadcn/ui + Tailwind CSS v4.
- [`frontend-design`](./skills/web/frontend-design) — Router over the frontend-design pipeline: design-system → greyboxing → real-content, handing off through `DESIGN.md` and `PAGES.md`.
- [`design-system`](./skills/web/design-system) — Turns a brief into a validated design system: design read, dials, tokens, multi-surface themes, recorded in `DESIGN.md`.
- [`greyboxing`](./skills/web/greyboxing) — Greyboxes a site's pages from `DESIGN.md`: per-page loop with prototype variants, motion theses, and a screenshot-verified review.
- [`real-content`](./skills/web/real-content) — Replaces a greyboxed site's placeholders with real copy, imagery, and data, closed by a copy self-audit.
- [`shaders`](./skills/web/shaders) — GPU-accelerated visual effects in React/Next.js with the `shaders` npm package.
- [`swr`](./skills/web/swr) — SWR v2 data fetching for React/Next.js: cache keys, revalidation, mutations, pagination, and subscriptions.
- [`astryx`](./skills/web/astryx) — Astryx (`@astryxdesign`), Meta's agent-ready React + StyleX design system: setup, CLI discovery loop, xstyle, tokens, theming, migration.
- [`adsense`](./skills/web/adsense) — AdSense publisher monetization: policy gate, RPM/coverage metrics, placement and Auto ads, revenue levers, ad-caused CWV damage, revenue-drop diagnostics.

### Engine best practices

- [`unity`](./skills/game/unity) — Senior Unity DO/DON'T practices across UI, async, rendering, and CI.
- [`ue5-aaa-best-practices`](./skills/game/ue5-aaa-best-practices) — Senior UE5 DO/DON'T practices: GAS, Subsystems, CommonUI, World Partition.
- [`figma-to-unity`](./skills/game/figma-to-unity) — Implements Figma designs as Unity UI Toolkit via the Figma MCP.

### Graphics & rendering

- [`stylized-rendering`](./skills/game/stylized-rendering) — Stylized / NPR cel-shaded rendering with Unity/UE5 mappings.
- [`magica-cloth-2`](./skills/game/magica-cloth-2) — Code-first cloth/jiggle physics with Magica Cloth 2 in Unity via the Unity MCP.

### Game architecture & foundation

- [`save-persistence`](./skills/game/save-persistence) — Save systems for single-player and online, with versioning and storage.
- [`scene-flow-manager`](./skills/game/scene-flow-manager) — Game application flow: state machine, scene composition, gated transitions.
- [`open-world-streaming`](./skills/game/open-world-streaming) — Open-world streaming: partitioning, async load/unload, HLOD, budgets.

### Gameplay & control

- [`combat-system`](./skills/game/combat-system) — Action and RPG combat: attack graphs, hit detection, damage pipeline.
- [`character-controller`](./skills/game/character-controller) — Unreal Mover controllers: action-RPG locomotion, rollback, traversal, and combat movement.
- [`mount-system`](./skills/game/mount-system) — Unreal creature mounts: lifecycle, Mover locomotion, safe dismount, co-op replication, and persistence.
- [`traversal-system`](./skills/game/traversal-system) — Traversal verbs (climb/glide/swim/grapple), parkour, mantle/vault, and world affordances.
- [`camera-system`](./skills/game/camera-system) — Game cameras: virtual-camera stack, orbit rigs, collision, screen shake.
- [`enemy-ai-framework`](./skills/game/enemy-ai-framework) — Game AI: FSM/BT/GOAP/utility, perception, navmesh, genre AI.

### Progression, economy & items

- [`inventory-equipment`](./skills/game/inventory-equipment) — Inventory and equipment with gear RNG and server-authoritative persistence.
- [`loot-drop-system`](./skills/game/loot-drop-system) — Loot tables, drops, claims, and loot-box compliance.
- [`progression-economy`](./skills/game/progression-economy) — Progression and economy: stat curves, skill trees, currencies, battle pass.

### World & navigation

- [`world-time-weather`](./skills/game/world-time-weather) — Time-of-day, weather, and seasons: game clock, weather-as-data, TOD lighting.
- [`teleport-map-unlock`](./skills/game/teleport-map-unlock) — Fast travel, waypoint networks, map unlocking, and fog of war.
- [`minimap-worldmap`](./skills/game/minimap-worldmap) — Minimap and world map: bake pipeline, markers, fog of war, multi-layer.
- [`quest-system`](./skills/game/quest-system) — Quest systems: data model, event-driven runtime, objective tracking.

### Narrative & cinematics

- [`dialogue-system`](./skills/game/dialogue-system) — Dialogue systems: graph model, runtime sessions, barks, VO/localization.
- [`cinematic-system`](./skills/game/cinematic-system) — Cutscene systems: timeline model, skip guarantees, cinematography craft.

### UI, HUD & audio

- [`menu-ui-manager`](./skills/game/menu-ui-manager) — Menu frameworks: router with screen stacks, focus, pause, settings.
- [`hud-system`](./skills/game/hud-system) — In-game HUDs: event-driven UI, bars/gauges, damage numbers, accessibility.
- [`adaptive-audio`](./skills/game/adaptive-audio) — Game audio: adaptive music, mix architecture, spatial audio, middleware.

### Multiplayer

- [`coop-session`](./skills/game/coop-session) — Drop-in co-op (2-4): host's-world session, authority, replication, netcode.

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
