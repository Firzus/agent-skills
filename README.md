# agent-skills

> Community-maintained Agent Skills for AI coding assistants.

[![skills.sh](https://skills.sh/b/Firzus/agent-skills)](https://skills.sh/Firzus/agent-skills)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](./LICENSE)

[Overview](#overview) • [Available skills](#available-skills) • [Install](#install) • [Manual install](#manual-install) • [Skill structure](#skill-structure)

> [!TIP]
> Looking for a specific skill? Jump to a category: [Agent workflow & tooling](#agent-workflow--tooling) · [Web & app development](#web--app-development) · [Engine best practices](#engine-best-practices) · [Graphics & rendering](#graphics--rendering) · [Game architecture & foundation](#game-architecture--foundation) · [Gameplay & control](#gameplay--control) · [Progression, economy & items](#progression-economy--items) · [World & navigation](#world--navigation) · [Narrative & cinematics](#narrative--cinematics) · [UI, HUD & audio](#ui-hud--audio) · [Multiplayer](#multiplayer)

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

34 skills, grouped by domain. Click a category to jump to it.

| Category | Skills |
| -------- | ------ |
| [Agent workflow & tooling](#agent-workflow--tooling) | `code-review`, `workflow`, `imagegen` |
| [Web & app development](#web--app-development) | `vite-plus-best-practices`, `tauri`, `image-optimization`, `extract-theme`, `shaders` |
| [Engine best practices](#engine-best-practices) | `unity6-aaa-best-practices`, `ue5-aaa-best-practices`, `figma-to-unity` |
| [Graphics & rendering](#graphics--rendering) | `stylized-rendering` |
| [Game architecture & foundation](#game-architecture--foundation) | `game-architecture-patterns`, `save-persistence`, `scene-flow-manager`, `open-world-streaming` |
| [Gameplay & control](#gameplay--control) | `combat-system`, `character-controller`, `traversal-system`, `camera-system`, `enemy-ai-framework` |
| [Progression, economy & items](#progression-economy--items) | `inventory-equipment`, `loot-drop-system`, `progression-economy` |
| [World & navigation](#world--navigation) | `world-time-weather`, `teleport-map-unlock`, `minimap-worldmap`, `quest-system` |
| [Narrative & cinematics](#narrative--cinematics) | `dialogue-system`, `cinematic-system` |
| [UI, HUD & audio](#ui-hud--audio) | `menu-ui-manager`, `hud-system`, `adaptive-audio` |
| [Multiplayer](#multiplayer) | `coop-session` |

### Agent workflow & tooling

| Skill | Description |
| ----- | ----------- |
| [`code-review`](./skills/code-review) | Reviews PRs, diffs, branches, and changes for bugs, regressions, guideline violations, and high-confidence risks before merge. |
| [`workflow`](./skills/workflow) | UltraCode-style highest-effort mode for large or interconnected tasks: deep reasoning plus orchestration of parallel sub-agents with git checkpoints. |
| [`imagegen`](./skills/imagegen) | Generates or edits project images with `gpt-image-2` via the local Codex CLI: mockups, logos, photorealistic scenes, infographics, transparent backgrounds. |

### Web & app development

| Skill | Description |
| ----- | ----------- |
| [`vite-plus-best-practices`](./skills/vite-plus-best-practices) | Best practices for Vite+ (`vp`): commands, unified `vite.config.ts`, migrations, testing, monorepos, commit hooks, library packaging. |
| [`tauri`](./skills/tauri) | Tauri v2+ app development: IPC, capabilities, plugin permissions, mobile-safe structure, automated desktop debugging. |
| [`image-optimization`](./skills/image-optimization) | Audits and optimizes web images for performance, SEO, accessibility, responsive delivery, LCP handling, framework-aware markup. |
| [`extract-theme`](./skills/extract-theme) | Extracts colors, typography, radius, spacing, and shadows from a public website into shadcn/ui + Tailwind CSS v4 tokens. |
| [`shaders`](./skills/shaders) | GPU-accelerated visual effects in React/Next.js with the `shaders` npm package: composition, masking, prop drivers, SDF effects, SSR safety. |

### Engine best practices

| Skill | Description |
| ----- | ----------- |
| [`unity6-aaa-best-practices`](./skills/unity6-aaa-best-practices) | Senior Unity 6 DO/DON'T practices: UI Toolkit + USS tokens, MVP binding, Awaitable, Addressables, GPU Resident Drawer, zero-alloc, Input System, CI. |
| [`ue5-aaa-best-practices`](./skills/ue5-aaa-best-practices) | Senior UE5 DO/DON'T practices: C++/Blueprint doctrine, GAS, Subsystems, CommonUI + MVVM, Enhanced Input, soft references, World Partition, Nanite/Lumen. |
| [`figma-to-unity`](./skills/figma-to-unity) | Implements Figma designs as Unity UI Toolkit via the Figma MCP: UXML hierarchy, USS tokens, exported sprites, a C# controller, visual validation. |

### Graphics & rendering

| Skill | Description |
| ----- | ----------- |
| [`stylized-rendering`](./skills/stylized-rendering) | Stylized / NPR cel-shaded rendering (Genshin / HSR / Guilty Gear Xrd / BotW): half-lambert + ramp lighting, ILM maps, outlines, SDF face shadows, Unity/UE5 mappings. |

### Game architecture & foundation

| Skill | Description |
| ----- | ----------- |
| [`game-architecture-patterns`](./skills/game-architecture-patterns) | Battle-tested patterns (Game Loop, Update, Component/ECS, State, Observer, Event Queue, Command, Object Pool, Spatial Partition) with a symptom→pattern table. |
| [`save-persistence`](./skills/save-persistence) | Save systems for single-player and online: versioned store, the four save models, serialization/storage engineering, MMO persistence, cross-progression UX. |
| [`scene-flow-manager`](./skills/scene-flow-manager) | Game application flow: context state machine, declarative scene composition, gated transitions, online flow, loading/lifecycle tech, FTUE design. |
| [`open-world-streaming`](./skills/open-world-streaming) | Open-world streaming: world partitioning, predictive streaming sources, async load/unload, budgets, HLOD, Nanite/virtual texturing, procedural generation. |

### Gameplay & control

| Skill | Description |
| ----- | ----------- |
| [`combat-system`](./skills/combat-system) | Action combat (melee + ranged): attack graphs, hit detection, damage pipeline, stagger gauges, dodge/guard/parry, gunplay, plus RPG/turn-based balance. |
| [`character-controller`](./skills/character-controller) | Character controllers (3rd + 1st person): collide-and-slide solver, movement states, jump feel, stamina, FPS momentum model, locomotion animation, accessibility. |
| [`traversal-system`](./skills/traversal-system) | Traversal layer: traversability data, composable verbs (climb/glide/swim/grapple), parkour/momentum, mantle/vault detection, mounts, stamina governor. |
| [`camera-system`](./skills/camera-system) | Game cameras across genres: virtual-camera stack, orbit rigs, collision/occlusion, combat cameras, genre cameras, camera math, screen shake, photo mode. |
| [`enemy-ai-framework`](./skills/enemy-ai-framework) | Game AI: FSM/BT/GOAP/HTN/utility decision matrix, perception/alert ladders, attack tokens, navmesh/avoidance, genre AI, AI believability. |

### Progression, economy & items

| Skill | Description |
| ----- | ----------- |
| [`inventory-equipment`](./skills/inventory-equipment) | Inventory and equipment (gacha/ARPG/MMO): instance-vs-count model, gear generation RNG, enhancement, inventory UI, server-authoritative persistence and dupe prevention. |
| [`loot-drop-system`](./skills/loot-drop-system) | Loot tables, drops, claims, drop perception, loot-box compliance: weighted tables, world distribution/respawn, multiplayer loot distribution, regulatory disclosure. |
| [`progression-economy`](./skills/progression-economy) | Progression and economy: stat curves, XP-curve families, skill trees, multi-currency wallets, faucets/sinks, energy gating, battle-pass/season models. |

### World & navigation

| Skill | Description |
| ----- | ----------- |
| [`world-time-weather`](./skills/world-time-weather) | Time-of-day, weather, seasons, climate: central game clock, weather-as-data + simulation, systemic weather, event scheduler, TOD lighting/rendering. |
| [`teleport-map-unlock`](./skills/teleport-map-unlock) | Fast travel, waypoint networks, map unlocking: region-unlock/map-reveal, fog of war, waypoint registry, atomic teleport sequence, fast-travel design policy. |
| [`minimap-worldmap`](./skills/minimap-worldmap) | Minimap and world map: automated bake pipeline, shared marker registry, fog of war, multi-layer maps, cartography/GIS rendering tech, cross-genre UX. |
| [`quest-system`](./skills/quest-system) | Quest systems: quest→steps→objectives data model, event-driven runtime, emergent/procedural generation, scripting engineering, objective-tracking UX. |

### Narrative & cinematics

| Skill | Description |
| ----- | ----------- |
| [`dialogue-system`](./skills/dialogue-system) | Dialogue systems: graph data model, runtime session scope, barks, narrative-design mechanics, presentation, authoring/VO/localization pipeline. |
| [`cinematic-system`](./skills/cinematic-system) | Cutscene systems: universal timeline model, realtime vs pre-rendered, transition contract, skip guarantees, cinematography craft, interactive-cinematic design. |

### UI, HUD & audio

| Skill | Description |
| ----- | ----------- |
| [`menu-ui-manager`](./skills/menu-ui-manager) | Menu frameworks: central router with screen stacks, hub-and-spoke navigation, focus management, refcounted pause, data-driven settings, UI patterns, accessibility. |
| [`hud-system`](./skills/hud-system) | In-game HUDs: event-driven read-only UI, layout grammar, visibility rules, pooled damage numbers, bars/gauges, HUD design taxonomy, accessibility, world-space HUD. |
| [`adaptive-audio`](./skills/adaptive-audio) | Game audio: adaptive music, mix architecture, voice management, spatial audio, middleware decision, the DSP/synthesis layer, the sound-design craft. |

### Multiplayer

| Skill | Description |
| ----- | ----------- |
| [`coop-session`](./skills/coop-session) | Drop-in co-op (2-4 players): host's-world session model, authority spectrum, replication, anti-grief content matrix, netcode landscape, co-op design craft. |

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
