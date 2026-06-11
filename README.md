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
| [`stylized-rendering`](./skills/stylized-rendering) | Engine-agnostic blueprint for stylized / non-photoreal (NPR) cel-shaded rendering in the Genshin Impact / Honkai: Star Rail / Guilty Gear Xrd / BotW lineage: half-lambert + ramp/step lighting and the ILM channel-packed control map, inverted-hull and post-process outlines with smoothed normals (plus Xrd UV-beam inner lines), SDF face shadow maps driven by light angle, eyes-through-hair, anisotropic Kajiya-Kay hair and MatCap, stepped specular and light-masked rim, environment-vs-hero contrast, neutral-tonemap/bloom/AA discipline for flat palettes, the art-direction calibration dial, detailed Unity 6 (URP/HDRP) and UE5 (post-process / custom shading model / Overlay Material, Nanite/Lumen caveats) mappings, and a 14-entry pitfalls catalog. Sourced from GDC talks (Guilty Gear Xrd 2015, Genshin 2021, Hi-Fi Rush 2024, BotW 2017) and Valve NPAR 2007, with community reverse-engineering flagged. |
| [`tauri`](./skills/tauri) | Guides Tauri v2+ app development, IPC, capabilities, plugin permissions, mobile-safe structure, and automated desktop debugging workflows. |
| [`workflow`](./skills/workflow) | UltraCode-style highest-effort mode for large or interconnected tasks: deep upfront reasoning plus dynamic orchestration of parallel sub-agents, with result synthesis and git checkpoints. |
| [`figma-to-unity`](./skills/figma-to-unity) | Implements Figma designs as Unity UI Toolkit interfaces via the Figma MCP server: UXML hierarchy, USS styles mapped to project design tokens, exported sprite assets with correct import settings, a minimal C# controller, and screenshot-based visual validation — with a full Figma→USS property mapping reference. |
| [`unity6-aaa-best-practices`](./skills/unity6-aaa-best-practices) | Senior Unity 6 developer DO/DON'T best practices for production-quality games: UI Toolkit design systems with USS tokens and MVP data binding, Awaitable async, Addressables, GPU Resident Drawer, zero-allocation discipline, Input System, Build Profiles, CI, and testing. |
| [`ue5-aaa-best-practices`](./skills/ue5-aaa-best-practices) | Senior Unreal Engine 5 developer DO/DON'T best practices for production-quality games: C++ foundation / Blueprint leaf doctrine, GAS, Subsystems, CommonUI + MVVM, Enhanced Input, MetaSounds, soft references, World Partition, Nanite/Lumen decisions, tick discipline, Perforce/DDC/CI, and the automation test stack. |
| [`game-architecture-patterns`](./skills/game-architecture-patterns) | Applies battle-tested game architecture patterns (Game Loop, Update Method, Component/ECS, State, Observer, Event Queue, Command, Object Pool, Spatial Partition, and more) with a symptom→pattern table, solution shapes, costs, and anti-usages. Backbone: Robert Nystrom's _Game Programming Patterns_. |
| [`inventory-equipment`](./skills/inventory-equipment) | Architecture blueprint for inventory and equipment across gacha, ARPG/looter, and online/MMO games: the instance-vs-count data model (Grasscutter GameItem schema, stable GUIDs, caps as policy, protections as model invariants), gear generation (the datamined Genshin 4-draw RNG pipeline plus ARPG affix systems and the deterministic↔random crafting spectrum — PoE currency orbs, D4 tempering/masterworking, Last Epoch forging potential, runewords, smart-loot, the constrained-guarantee funnel), unified enhancement (per-type tables, 80% recycling, lock protection), inventory UI (grid/list/Tetris layouts, loot-filter DSLs, DIM search syntax, stable sorts, filter/lock rule engines, compare tooltips, loadouts/transmog, mass-salvage safety), networked persistence (server-authoritative ownership, duplication prevention via 2-phase-commit trades + escrow + idempotency + append-only ledgers, real dupe postmortems), sourced numbers, Unity 6 / UE5 mappings (Lyra as the first-party reference), and a 16-entry pitfalls catalog. |
| [`loot-drop-system`](./skills/loot-drop-system) | Architecture blueprint for loot tables, drops, claims, drop perception, and loot-box compliance across open-world, ARPG, looter-shooter, and MMO games: layered weighted tables (shared sub-tables, null entries, guaranteed slots, recursive treasure classes, NoDrop player-scaling, ilvl/mlvl gating, magic find, conditionality via table selection and actor substitution), world distribution and respawn (one-time flags, per-node timestamps, the three revival policies, the never-on-screen invariant, the max-live-drops budget), claim gating and multiplayer loot distribution (kill-then-claim, the verified co-op matrix, personal vs FFA vs need-greed vs master-looter/loot-council, loot locks, idempotent claims), drop perception (the gambler's fallacy and drought math, pseudo-random distribution, shuffle-bags, drop ceremony, near-miss ethics, transparency), and regulatory compliance (China/Korea odds disclosure, Apple/Google policy, loot-box gambling law, server-authoritative anti-cheat, the Nexon drop-rate-lie fine), sourced numbers (bdrop/ActorLimiter datamines, Grasscutter, Diablo/PoE/Destiny/Warframe), Unity 6 / UE5 mappings, and a 16-entry pitfalls catalog with real incidents (Weightgate, D3 gold dupe, Nexon). |
| [`progression-economy`](./skills/progression-economy) | Systems architecture blueprint for progression and economy across live-service and single-player games: stat curve tables (base×curve[level] as shared data) and the XP-curve families (Pokémon experience groups, RuneScape's geometric curve, D&D thresholds, prestige/paragon infinite progression), skill trees and soft caps / diminishing returns, the stat aggregation contract, multi-currency wallets and the live-ops economy discipline (faucets vs sinks, inflation control and real cases, the in-house economist, player-driven markets, wealth concentration and luxury sinks), energy gating with timestamp regen, battle-pass and season models across the industry (net-positive currency earn-back, FOMO-expiry vs never-expires, retroactive entitlements, idempotent rollover, the Dota 2 revenue evidence), server-authoritative transactions (idempotency keys, int64 currencies), sourced numbers (Genshin datamines via Grasscutter, EVE/WoW/RuneScape/Fortnite), Unity 6 / UE5 mappings (UGS/PlayFab, GAS ScalableFloat), and a 16-entry pitfalls catalog with real incidents (WoW int32 gold cap, D3 RMAH inflation, Lost Ark DST). |
| [`dialogue-system`](./skills/dialogue-system) | Architecture blueprint for dialogue systems across open-world, RPG, and narrative games: graph data model (flow/text/conditions as three separate stores, Ashwell's branching-structure patterns, storylet/quality-based and salience-based narrative), runtime session scope (staging as data, voice-end advancing, interruption policies), barks with the Valve fact-matching model, narrative-design mechanics (skill-check and dice-roll dialogue, dialogue wheels vs full-text and the paraphrase backlash, reactivity budgets, delayed consequence, timed/real-time conversation, internal-voice systems), presentation (typewriter, auto/skip, backlog, deep subtitle accessibility), and the authoring/VO/localization pipeline (Ink/Yarn/articy tooling, line IDs, RTL/CJK, ICU plural/gender, lip-sync, AI/LLM-driven NPCs and the SAG-AFTRA constraints), sourced numbers (Genshin/BotW datamines, Disco Elysium/BG3, Netflix/BBC/Xbox standards), Unity 6 / UE5 mappings, and a 16-entry pitfalls catalog. References: BotW/TotK, Genshin, Disco Elysium, BG3, Witcher 3, Oxenfree. |
| [`quest-system`](./skills/quest-system) | Engine-agnostic architecture blueprint for quest systems: data model (quest→steps→objectives, condition/action lists, prerequisite DAG, taxonomy as policy data), event-driven runtime (objective evaluation, quest-driven world changes, shared-NPC arbitration, no-fail design), authoring schools (graph/stages/tables, debug consoles, localization separation, additive live-service patching), tracking contracts, sourced numbers (zeldamods + Genshin datamines), Unity 6 / UE5 mappings, and a 14-entry pitfalls catalog. References: BotW/TotK and Genshin, with REDkit and Creation Kit as authoring references. |
| [`teleport-map-unlock`](./skills/teleport-map-unlock) | Engine-agnostic architecture blueprint for fast travel, waypoint networks, and map unlocking: region unlock model (terrain vs POI layers, multi-state icons), waypoint registry (stable IDs, designated spawn + facing, map layers, player-placed waypoints), the atomic teleport sequence (residency gates, physics-safe placement, state restoration), fast travel policy (earned-only, restriction matrix, density dials), sourced numbers, Unity 6 / UE5 mappings, and a 14-entry pitfalls catalog. References: BotW/TotK and Genshin. |
| [`world-time-weather`](./skills/world-time-weather) | Engine-agnostic architecture blueprint for time-of-day + weather systems: central game clock service (monotonic accumulator, dual day divisions, pause rules, script-pilotable modes), weather as data (climate profiles, pre-rolled regional schedules, override stack with handles), systemic weather consumed by traversal/combat/AI/audio (the BotW chemistry-engine model), event scheduler (blood-moon-style resets, respawn policies, time-skip catch-up), persistence, sourced numbers (zeldamods datamine), Unity 6 / UE5 mappings, and a 14-entry pitfalls catalog. References: BotW/TotK and Genshin. |
| [`traversal-system`](./skills/traversal-system) | Engine-agnostic architecture blueprint for open-world traversal: world traversability data (climbable-by-default markup, surface probing, volumes, anchors) + composable verbs with declared contracts (systemic climbing, glide, swim/dive, grapple, mounts, regional verbs), stamina as the world governor (upgrade curves, regional pools), assists and vault/mantle windows, design valves against trivialization, sourced numbers, Unity 6 / UE5 mappings, and a 13-entry pitfalls catalog. References: BotW/TotK and Genshin. |
| [`save-persistence`](./skills/save-persistence) | Engine-agnostic architecture blueprint for save systems: versioned store decoupled from runtime (stable-ID deltas, the world-state store), the four save models (checkpoint, save-anywhere, continuous souls-style, server-authoritative), schema migrations with golden-save testing, atomic writes and corruption defense, autosave rotation against death loops, cloud sync conflicts, cross-platform saves, the tamper ladder, sourced numbers and public platform quotas, Unity 6 / UE5 mappings, and a 14-entry pitfalls catalog. |
| [`camera-system`](./skills/camera-system) | Engine-agnostic architecture blueprint for third-person cameras: virtual-camera stack with a single blending brain, orbit rigs with screen composition, collision vs occlusion (whiskers, asymmetric pull-in, fades), combat cameras (soft-lock, lock-on, group framing), camera volumes, procedural dialogue cameras (180° rule), trauma-model screen shake, motion-sickness accessibility baseline, photo mode, sourced numbers, Unity 6 (Cinemachine 3) / UE5 mappings, and a 14-entry pitfalls catalog. |
| [`enemy-ai-framework`](./skills/enemy-ai-framework) | Engine-agnostic architecture blueprint for enemy AI in action games: designer-authorable decision architectures (HSM + decision trees + utility), the brain-to-intent separation (AI drives the same controller/combat systems as the player), perception and alert ladders, threat with ratio hysteresis, attack tokens as the pacing/difficulty regulator, leash and respawn lifecycle, 3-tier AI LoD, group coordination, sourced numbers (Genshin GDC 2021), Unity 6 / UE5 mappings, and a 14-entry pitfalls catalog. |
| [`menu-ui-manager`](./skills/menu-ui-manager) | Engine-agnostic architecture blueprint for menu frameworks: central router with layered screen stacks and declarative contracts, hub-and-spoke navigation with shortcut wheels, multi-input focus management, refcounted pause with audio ducking, data-driven settings (apply/revert, 15s display confirm, rebinding), promise-style modal API, localization/cert basics, Unity 6 (UITK) / UE5 (CommonUI/Lyra) mappings, and a 14-entry pitfalls catalog. |
| [`minimap-worldmap`](./skills/minimap-worldmap) | Engine-agnostic architecture blueprint for minimap and world map systems: automated map bake pipeline with a single world-to-map transform asset, shared marker registry (zoom-LOD tiers, clustering, pooling), region-based fog of war with stable IDs, multi-layer maps, pan/zoom/pin interactions, fast-travel integration, breadcrumb trails, sourced numbers, Unity 6 / UE5 mappings, and a 13-entry pitfalls catalog. References: Genshin Impact and Zelda BotW/TotK. |
| [`hud-system`](./skills/hud-system) | Engine-agnostic architecture blueprint for in-game HUDs: event-driven read-only UI (MVP/MVVM, zero polling), layout grammar, dynamic visibility rules, pooled damage numbers, notification channels, bars/gauges (ghost drain, radial cooldowns), interaction prompts with glyph switching, accessibility and safe areas, sourced numbers (text sizes, timings, perf budgets), Unity 6 (UITK) / UE5 (UMG/CommonUI) mappings, and a 12-entry pitfalls catalog. |
| [`coop-session`](./skills/coop-session) | Engine-agnostic architecture blueprint for drop-in co-op (2-4 players): the host's-world-as-server-instance session model (join/leave/kick flows, world-level gates, late-join state snapshots, the graceful host-leave protocol), the authority spectrum (server-hard persistence, client-trusted ephemera — the datamined Genshin hybrid), replication at architecture level (prediction, interpolation, relevance), the co-op content matrix as structural anti-grief (host-only/instanced/shared), enemy scaling lessons, topology trade-offs, Unity 6 (NGO 2.x/N4E/Multiplayer Services) / UE5 (CMC/GAS/EOS) mappings, and a 14-entry pitfalls catalog with retrofit postmortems. |
| [`adaptive-audio`](./skills/adaptive-audio) | Engine-agnostic architecture blueprint for game audio: adaptive music (vertical layers, horizontal re-sequencing, the music state machine with quantized transition matrices), mix architecture (bus hierarchy, ducking matrix as data, mix-state stacks, ASWG-R001 loudness compliance), voice management (per-category concurrency, priority grids, loop-aware virtualization), spatial audio (raycast occlusion, reverb volumes, weather-driven ambient beds), the native-first middleware decision (MetaSounds/Quartz vs Unity DSP-clock patterns vs Wwise/FMOD), sourced numbers, and a 14-entry pitfalls catalog. References: BotW/TotK (CEDEC 2017) and Genshin (Wwise datamine). |
| [`cinematic-system`](./skills/cinematic-system) | Engine-agnostic architecture blueprint for cutscene systems: the universal timeline model (typed tracks, director-resolved role bindings — the schema Unity Timeline, UE Sequencer, and BotW's BFEVFL converge on), realtime vs pre-rendered decision matrix (Bink/Sofdec, overlay subtitles, the seam protocol), the datamined bdemo transition contract (preload gates, world staging, exit positions), skip with the all-events-fire guarantee, replay galleries and the context problem, the full production pipeline (previz, mocap economics, dailies, binary versioning), Unity 6 / UE5 mappings, and a 14-entry pitfalls catalog. |
| [`scene-flow-manager`](./skills/scene-flow-manager) | Engine-agnostic architecture blueprint for game application flow: explicit context state machine (boot/title/login/world/cinematic), declarative scene composition (bootstrap + persistent managers + additive content), atomic gated transitions with honest progress, the full online flow (auth, server select, enter-world handshake, queues, reconnection), returning flows and cutscene state restore, sourced numbers with cert ceilings, Unity 6 / UE5 mappings, and a 14-entry pitfalls catalog. |
| [`combat-system`](./skills/combat-system) | Engine-agnostic architecture blueprint for action-game melee combat: data-driven attack graphs (combo strings, cancel windows), animation-driven hit detection, damage pipeline (motion values, damage caps), stagger/stun gauges and boss break cycles, dodge/guard/parry kit, skills layer, sourced feel numbers (hit-stop, i-frames, buffers), Unity 6 / UE5 mappings, and a 12-entry pitfalls catalog. Primary reference: Granblue Fantasy Relink. |
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
