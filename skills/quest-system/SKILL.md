---
name: quest-system
description: >-
  Architecture blueprint for quest systems in open-world games: the quest
  data model (quest, steps, objectives as data; condition/action lists;
  prerequisite DAG; quest taxonomy from main story to daily commissions
  to hidden discovery quests), the event-driven runtime (objective
  evaluation, quest-driven world changes, the shared-NPC conflict, no-fail
  design), designer authoring (graph vs stage vs table schools, debug
  consoles, localization separation, live-service additive patching), and
  tracking contracts with HUD/map systems. References: BotW/TotK
  (datamined flag-driven model) and Genshin Impact (datamined
  condition/exec model), with Witcher 3 REDkit and Skyrim Creation Kit as
  authoring references. Use when designing or building quests, missions,
  objectives, quest logs, daily commissions, branching quests, or when
  quest chains break, flags turn to soup, or saves corrupt mid-quest.
---

# Quest System

Build the quest layer of an open-world game — data model + runtime +
authoring; dialogue is a consumer interface (`dialogue-system`).
References: BotW/TotK (the datamined flag-driven school) and Genshin
Impact (the datamined condition/exec school), with Witcher 3's REDkit
and Skyrim's Creation Kit as authoring references.

## The architecture rule

**Quests are data that observe the world — the world never waits for
the quest.** Definitions are immutable data; runtime state lives
separately, keyed by stable IDs; progression is event-driven.

```
DATA MODEL (immutable definitions)
  taxonomy      main chapters/acts | character stories | world quest
                chains | daily commissions | hidden discovery quests
                — one model, types differ by unlock/lifetime/reward
                policy (data, not code)
  hierarchy     Chapter -> Quest -> Step (the atomic unit: the
                objective shown on the HUD is a step)
  dependencies  a DAG of prev/next quest IDs (multiple parallel
                prerequisites) ABOVE linear-ish step lists — the
                shipped shape of both reference games
  per step      conditions (accept/finish/fail, typed {type, params,
                count} with AND/OR combinators) + actions (begin/
                finish/fail exec lists: spawn group, start dialogue,
                give item, play cutscene, weather override, unlock
                waypoint) + declared world bindings (NPC schedule
                overrides, map indicators) + text KEYS (never text)

RUNTIME (one quest manager service)
  event-driven  gameplay emits typed events (kill/collect/reach/talk/
                interact); objectives subscribe; NO per-frame polling
                (dirty-queue for composed conditions; explicit-interval
                polling only for continuous conditions like timers)
  world writes  through the step's action list into the world-state
                store (the same flag store the save serializes —
                save-persistence); BotW: one GameDataMgr namespace
                shared by quests, world, and save
  state machine Inactive -> Active -> Completed (+ Failed and
                Suspended in the enum FROM DAY ONE, even if unused)

AUTHORING (pick a school, keep the invariants)
  graph (Witcher 3 REDkit) | numbered stages (Skyrim, increments of
  10) | condition/exec tables (Genshin, BotW)
  invariants: text separated from logic; debug console built WITH the
  runtime; additive-only patching of shipped quests
```

## What the datamines prove

- **BotW**: one `QuestProduct` pack; a quest is a flag-driven step
  list — each step advances when its `NextFlag` (a global GameData
  flag) turns true; steps *declare* NPC schedule overrides and map
  indicator positions. The quest is an observer; event scripts and AI
  set the flags. This is why any-order play works: state drives
  quests, never sequence (GDC 2017's "remove the predetermined
  sequence" made data-real).
- **Genshin**: `Chapter → MainQuest → SubQuest` with typed categories
  (AQ/LQ/WQ/IQ/EQ), a prerequisite DAG (`prev/next_quest_ids`), and
  pure-data per-subquest `acceptCond/finishCond/failCond` (+ AND/OR)
  and `beginExec/finishExec/failExec` — all quest logic expressible by
  composing typed conditions and actions, no per-quest code. Plus
  `isRewind`: a per-subquest safe-resume checkpoint after disconnect.
- **No-fail is a design choice both games made**: BotW's step schema
  has no fail field; Genshin exposes failure only in Hangout branches
  (checkpoint retry) and perishable commissions. Decide your fail
  policy globally, day one.

## Build order (4 shippable tiers)

```
Tier 1 — Model and runtime core
- [ ] Quest/step definitions as data assets + runtime state by stable
      ID (definition layer immutable, state layer serialized)
- [ ] Typed world events + objective subscription (kill/collect/
      reach/talk/interact); the dirty-queue evaluator
- [ ] The step lifecycle with transactional advance (actions + flag
      write atomic w.r.t. saves)
- [ ] DEBUG CONSOLE DAY ONE: set-stage, skip, complete, dump state
      (the Skyrim setstage triad — built with the runtime, not after)
Tier 2 — World integration
- [ ] World-state store shared with save-persistence (flags/facts,
      inspectable dump)
- [ ] Step world bindings: NPC schedule overrides, scene group
      spawns/refreshes, area unlocks, weather overrides (the
      world-time-weather override stack with quest-owned handles)
- [ ] Step-entry precondition revalidation ("is the condition ALREADY
      true?" -> auto-complete; referent missing -> fallback)
- [ ] The shared-NPC arbiter: exclusive lock + UI explanation of which
      quest blocks (the Genshin model), suspension as the escape
Tier 3 — Taxonomy and tracking
- [ ] Quest types as policy data (unlock gates, lifetime, repeatable,
      reward model); hidden quests via the trigger registry (volumes,
      interactions, item pickups, time windows)
- [ ] Daily commissions: regional pools, cycles, reset alignment
      (world-time-weather 4 AM pattern), multi-day chains
- [ ] Tracking contracts: quest log (category/region sort), markers
      DERIVED from objective state (exact vs area-circle), HUD
      tracked-quest objective, navigation handoff (teleport-map-unlock)
- [ ] Reward grants idempotent, keyed by quest+step ID
Tier 4 — Branching and live-service
- [ ] Branching quests with checkpoints (the Hangout model: replayable
      graph, reached branches restartable, per-ending rewards)
- [ ] Quest state versioning + migrations; additive-only policy on
      shipped quests (new steps/branches, never renumber/delete)
- [ ] Co-op authority model decided explicitly (host-only progression
      is the shipped-simple answer)
- [ ] Quest item lifecycle derived from quest state (never manual
      flags); localization length budgets tested in tracking UI
```

## Numbers (starting points — sourced anchors)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Content scale | BotW: 15 main + 76 side + 42 shrine = 133 (+19 DLC); TotK: 253 logged quests; Genshin: 608 world quests in 63 named series + ~40 Archon acts + ~18 Hangouts | wiki, multi-confirmed |
| Text scale | Genshin datamine v4.5: 170,202 unique lines, 2,422 speakers, ~27 turns/dialogue; 13 text languages + 4 voice — THE data-driven argument | datamine |
| Step granularity | ~12-15 subquests per Archon act; Skyrim stages 0-65535, convention: increments of 10, 200 = done | wiki/official docs |
| Durations | commission ~2-5 min; Archon act ~2-4 h; longest world chain (Aranyaka) ~10-12 h across 4 parts / ~40 quests | community measured |
| Branching | Hangouts: 5-6 endings, ~2 major decision levels, checkpoint replay | wiki |
| Commissions | 4/day from regional pools (cycle system), reset 04:00 server, chains span days, achievement-linked ones prioritized in the pool (4.4+) | wiki |
| Gates | AR caps at 40 for main story; story keys: 1 per 8 commissions, max 3 | wiki |
| Rewards | commission 10 primogems fixed + 20 daily bonus (Mora/AEXP scale, primos don't) | wiki |
| Tracking | 1 navigated quest at a time; unlimited active quests (both games) | wiki |

Flagged — never invent: commission pool sizes (one ~30/cycle
observation only), Genshin quest-ID range conventions, search-circle
radii, toast timings. Full tables in [architecture.md](./architecture.md).

## Engine mapping

| Generic block | Unity 6 | UE5 (5.4+) |
| --- | --- | --- |
| Definitions | ScriptableObject per quest (immutable; never mutate SOs at runtime — the dirty-asset trap) + POCO runtime state linked by string ID | PrimaryDataAsset per quest (nested structures) or DataTable rows (mass editing) |
| Conditions/actions | Polymorphic `[SerializeReference]` / sub-assets with AND/OR combinators | Typed structs + GameplayTags; tag containers as the fact store (hierarchical: subscribe to parent, receive children) |
| Runtime service | Persistent C# service + typed event bus; dirty-queue evaluation | `UGameInstanceSubsystem` (survives level transitions) + GameplayMessageSubsystem (the Lyra router) |
| Quest flow tool | Unity Behavior is officially pitched for "quest logic" (event-driven, blackboard) — an orchestrator, NOT the data model; custom GraphView editors otherwise | **StateTree** is officially general-purpose and community-proven for quest flows (states/transitions/Failed terminal); the data model stays in DataAssets |
| Text | Localization package: String Tables + Smart Strings; `LocalizedString` in the quest SO (official example) | `FText`/string-table keys in DataAssets |
| Live-service content | Addressables for quest-specific prefabs/scenes | **GameFeature plugins** — Epic's official additive-content pattern (Fortnite-proven): a quest batch as a plugin the base game doesn't know about |
| Ecosystem | Quest Machine (Pixel Crushers) — quest SO → nodes → condition sets + per-state actions | Narrative Pro — nodal state machine, declarative per-task markers |
| Co-op | No first-party pattern either side: replicate state from server authority; decide the model explicitly (pitfall #14) | Same — RepNotify state + RPC events |

## Failure modes

The 14 classic quest bugs (flag soup, polling hell, broken chains,
mid-quest save corruption, shared-NPC conflicts, sequence breaking,
quest item lockout, untestable quests, live-service patching of active
quests, localization breaking logic, marker desync, reward
duplication, the unfailable-quest trap, co-op divergence) are cataloged
in [pitfalls.md](./pitfalls.md) with symptom → root cause → prevention.

## Related skills

- `dialogue-system` — end-of-talk events advance objectives; the
  shared-NPC lock is arbitrated here.
- `save-persistence` — the world-state store, versioned quest state,
  CanSave gates around step actions.
- `world-time-weather` — time-gated quests, the reset scheduler,
  quest-owned weather override handles (Seirai as the canon case).
- `teleport-map-unlock` — priority-quest teleport locks, quest-gated
  waypoint visibility, navigation routing.
- `minimap-worldmap` / `hud-system` — marker and tracker contracts
  (markers derive from objective state).
- `enemy-ai-framework` — NPC schedule overrides per quest step.
- `scene-flow-manager` — quest-triggered scene/cinematic transitions.
