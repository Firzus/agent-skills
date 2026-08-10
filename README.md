# agent-skills

> Community-maintained Agent Skills for AI coding assistants.

[![skills.sh](https://skills.sh/b/Firzus/agent-skills)](https://skills.sh/Firzus/agent-skills)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](./LICENSE)

[Global instructions](#global-instructions) • [Install](#install) • [Browse skills](#browse-skills) • [Manual install](#manual-install) • [Skill structure](#skill-structure)

## Overview

`agent-skills` is a registry of 50 Markdown-based skills for AI coding agents — Claude Code, Cursor, Codex, and any assistant that supports local skill folders. Each skill packages task-specific instructions, references, and optional helper scripts behind a single `SKILL.md` entry point, kept focused through progressive disclosure.

> [!NOTE]
> These skills are independent, community-maintained reference material. They are not official products of the vendors or tools they cover.

## Global instructions

How the agent talks to you, and how it handles version control — the two things that stay the same in every repository. Copy the block into your harness's top-level instruction file — `~/.codex/AGENTS.md` for Codex, `~/.claude/CLAUDE.md` for Claude Code, or the equivalent for your tool.

Git lives here rather than per project for two reasons: the workflow is identical everywhere, and the guardrails protect against irreversible loss, so they must be loaded before any task rather than fetched on demand.

Anything genuinely project-specific — the stack's testing policy, architecture and code standards — belongs to the project; the [`setup-project`](./skills/engineering/setup-project) skill sets that up for you.

```markdown
## Communication

Talk to me in French. Everything that outlives the conversation is English — code, comments, commits, branches, PRs, issues, docs.

Each message stands on its own. I read them between several parallel sessions, knowing nothing about the domain, the repo, or the file you just opened. Every proper noun, identifier, abbreviation, file name and document reference gets a gloss in the same sentence — what it is, and why it matters here. Write "ADR-0001 (the decision to keep the domain free of engine types)", never "ADR-0001".

Be concise and concrete. Lead with what is at risk and what changes for me, and add the mechanism only where it helps me decide.

Make a question answerable in one reply with nothing open in front of me: what you found, what is blocking you, the concrete choices.

When a decision is mine, put the options as a practical trade-off — what each one gives up — then your recommendation and the reason behind it.

Mermaid diagrams render on my side. Reach for one, or a table, wherever the shape of the idea carries better than prose.

## Git workflow

Branch from an up-to-date default branch: `git switch --no-track -c <type>/<subject> origin/main`.

Name branches `<type>/<subject>` — a [Conventional Branch](https://conventional-branch.github.io/) type, then a lowercase ASCII kebab-case subject. Types: `feature`, `bugfix`, `hotfix`, `release`, `chore`.

This list is deliberately narrower than the commit type list: a commit describes one change, a branch describes a delivered unit of work. Keep it as is.

Name the branch after the change, not the tool that produced it — `feature/token-refresh`, never `codex/...` or `claude/...`.

Write commits to [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/): `<type>[optional scope]: <description>`.

Types: `feat`, `fix`, `build`, `ci`, `docs`, `style`, `refactor`, `perf`, `test`, `revert`, `chore`. Reach for `chore` only when nothing more specific fits.

Mark a breaking change with `!` before the colon (`feat(api)!: ...`) or a `BREAKING CHANGE:` footer. That footer is the one token that must be uppercase.

Open the pull request as a draft when starting: `gh pr create --draft`. Mark it ready when the work is complete: `gh pr ready`.

For an issue-related PR, put `Closes #<issue-number>` in the PR body. Repeat the keyword before each reference — `Closes #10, closes #12` closes both, `Closes #10, #12` closes only the first.

Closing keywords take effect only when the PR targets the default branch. Against any other base they are silently ignored: nothing links, nothing closes, no warning.

## Git guardrails

Preserve uncommitted work: run `git stash push -u` before any operation that rewrites the working tree. `git reset --hard` is one of the very few commands that genuinely destroys data — the reflog tracks reference updates only, so it can recover a commit but never an uncommitted edit.

Clean with `git clean -nd` first to see what would go, then `git clean -fdX` to remove ignored files only. The lowercase `-x` also deletes `.env`, local credentials and editor settings — files that are gitignored precisely because they are local and irreplaceable.

Force-push with `--force-with-lease --force-if-includes`. Passed alone, `--force-if-includes` is a silent no-op: it looks careful and protects nothing.

## Comments

No inline commentary; a module header where the file carries a decision.

Write every comment in English, including in a file whose existing comments are in another language. A file that switches language mid-way is the residue of translating only the line being touched.

Open a file with a module header when it carries a decision a reader cannot recover from the code: a constraint, a rejected alternative, a trap that is still reachable. State it in the present tense, as the current state of the world.

Inside the body, fix the code rather than explain it — a clearer name, a named constant, a narrower type. Reach for a comment only where no amount of naming would carry the reason.

Document what a signature cannot say: what a function panics or throws on, and which edge cases it deliberately does not handle.

Write the comment as the current state. "Now returns null" and "previously fell back to an empty list" force the reader to know a version of the code they have never seen.

Define the vocabulary you use, or drop it. A reference to "finding C" or "ticket T2" that resolves nowhere is noise to every reader who was not in the room.

Update the comment in the same change as the code. When you rename or change a function, search for comments elsewhere that name it — a comment rots without its own file ever being touched.

One carve-out on the current-state rule: a comment describing a past bug stays when the reader can still fall into that hole, however historical it sounds. It is a live warning about a trap the code still permits. Once the trap is gone, it belongs to the commit history.
```

Swap the first line for your own language pairing, and `origin/main` for your default branch name. The rest is language-agnostic.

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
- [`babysitting-pr`](./skills/engineering/babysitting-pr) — Monitors an open GitHub PR, fixes branch-related CI and review blockers, and keeps it merge-ready.
- [`setup-project`](./skills/engineering/setup-project) — Writes a project's `AGENTS.md` (overview, guardrails, project decisions), configures the repository, and installs the skills matching the stack.
- [`skills`](./skills/engineering/skills) — Installs, updates, and authors Agent Skills with the `skills` CLI (`skills.sh`): sources, project vs global scope, symlink vs copy, discovery rules, debugging.
- [`gamification`](./skills/engineering/gamification) — Gamification design grounded in motivation science: design process, mechanics catalog (points, badges, leaderboards, streaks), anti-patterns, ethics gate.
- [`vite-plus-best-practices`](./skills/web/vite-plus-best-practices) — Best practices for Vite+ (`vp`): config, migrations, testing, monorepos.
- [`tauri`](./skills/web/tauri) — Tauri v2+: owned IPC, capabilities-first permissions, CDP shell debugging, mobile-safe structure.
- [`agent-browser`](./skills/engineering/agent-browser) — Drives a real browser from the CLI (CDP, a11y snapshots + refs): interaction, screenshots, emulation, vitals, and CDP attach to Tauri/Electron shells.
- [`dokploy-best-practices`](./skills/web/dokploy-best-practices) — Self-hosting on Dokploy (Docker Swarm + Traefik): CI/CD, zero-downtime, hardening.
- [`web-assets-optimization`](./skills/web/web-assets-optimization) — Optimizes all web assets: images, video, GIF replacement, fonts, SVG, plus per-asset delivery strategy (LCP, lazy loading).
- [`web-extension`](./skills/web/web-extension) — Builds, ports, tests, and packages WebExtensions for Chromium, Firefox, and Safari with explicit compatibility, permission, lifecycle, and store gates.
- [`imagegen`](./skills/engineering/imagegen) — Generates and edits images with `gpt-image-2` via Codex CLI (ChatGPT subscription), with a chroma-key pipeline for transparent cutouts.
- [`extract-theme`](./skills/web/extract-theme) — Extracts a website's design tokens into shadcn/ui + Tailwind CSS v4.
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

### Engine best practices

- [`unity`](./skills/game/unity) — Routes each Unity need to one chosen tool, and keeps projects CoreCLR-ready.
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
