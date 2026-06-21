---
name: quest-system
description: >-
  Architecture blueprint for quest systems in open-world, RPG, and live-service
  games: quest/step/objective data, conditions/actions, prerequisite DAGs,
  event-driven runtime, world changes, shared-NPC conflicts, procedural quests,
  scripting, save migration, debug tools, telemetry, journals, markers, and
  authoring workflows. Use when designing quests, missions, objectives, logs,
  markers, commissions, branching quests, or when chains break, flags sprawl,
  saves corrupt, or players cannot find objectives.
---

# Quest System

Build the quest layer of a game — data model, runtime, the scripting
engineering, emergent options, tracking UX, and authoring. Dialogue is a consumer
interface (`dialogue-system`). References: BotW/TotK (the datamined flag-driven
school) and Genshin (the datamined condition/exec school), with Witcher 3's
REDkit and Skyrim's Creation Kit as authoring references, and Shadow of
Mordor/Outer Wilds/Elden Ring for emergent and tracking models.

## The architecture rule

**Quests are data that observe the world — the world never waits for the quest.**
Definitions are immutable data; runtime state lives separately, keyed by stable
IDs; progression is event-driven. **A quest is a small program** — a tiny state
machine whose transitions are gated by gameplay conditions and whose state-entry
runs side-effecting actions.

```
DATA MODEL  taxonomy (types differ by policy) | Chapter→Quest→Step hierarchy |
            a DAG of prerequisites | per-step conditions + actions + world
            bindings + text KEYS (never text)
RUNTIME     gameplay emits typed events; objectives subscribe; NO per-frame
            polling (dirty-queue); world writes through the step's action list
            into the shared world-state store; Inactive→Active→Completed
            (+ Failed + Suspended from day one)
AUTHORING   graph (Witcher 3) | numbered stages (Skyrim) | condition/exec tables
            (Genshin, BotW); invariants: text separated from logic, debug console
            built WITH the runtime, additive-only patching
```

## Reference map

| File | Covers |
| --- | --- |
| [data-model.md](./data-model.md) | The two shipped schools (BotW flags, Genshin condition/exec), taxonomy as policy data, the prerequisite DAG, conditions/actions and combinators, hidden quests and world permanence |
| [runtime.md](./runtime.md) | Event-driven evaluation, the shared-NPC conflict and arbitration, declarative world integration, no-fail/no-abandon design, daily commissions, co-op authority |
| [emergent.md](./emergent.md) | Radiant/template quests (the alias system), the Nemesis system, storyteller vs AI-director pacing, simulation-driven emergence (Dwarf Fortress/Qud/A-Life), ambient encounters, the authored-backbone hybrid and its real maintenance cost |
| [scripting.md](./scripting.md) | The engineering: state machine vs behavior tree (UE5 StateTree), the event bus / GameplayMessageSubsystem, dependency graphs and topological sorting, condition/action systems and polymorphic serialization, save/load and schema migration, debug tooling and telemetry |
| [tracking.md](./tracking.md) | Quest-log/journal structures, objective markers and waypoints, the anti-marker philosophy (Elden Ring/BotW/Ghost of Tsushima), map integration, tracking interaction at scale, special models (Outer Wilds ship log, Obra Dinn deduction, Disco Elysium thought cabinet) |
| [pitfalls.md](./pitfalls.md) | 16 failure modes (symptom → cause → prevention) with real incidents (USSEP catalog, New World, "another settlement needs your help"), debugging order, ship checklist |

## What the datamines prove

- **BotW**: a quest is a flag-driven step list — each step advances when its
  `NextFlag` turns true; steps *declare* NPC schedule overrides and map indicator
  positions. The quest is an observer; event scripts and AI set the flags. This is
  why any-order play works: state drives quests, never sequence.
- **Genshin**: `Chapter → MainQuest → SubQuest` with typed categories, a
  prerequisite DAG, and pure-data per-subquest `acceptCond/finishCond/failCond` +
  `beginExec/finishExec/failExec` — all logic by composing typed conditions and
  actions, no per-quest code. Plus `isRewind`: a safe-resume checkpoint.
- **No-fail is a design choice both games made**: BotW's schema has no fail field;
  Genshin exposes failure only in Hangout branches and perishable commissions.
  Decide your fail policy globally, day one.

## Build order (4 shippable tiers)

```
Tier 1 — Model and runtime core
- [ ] Quest/step definitions as data + runtime state by stable ID
- [ ] Typed world events + objective subscription; the dirty-queue evaluator
- [ ] The step lifecycle with transactional advance
- [ ] DEBUG CONSOLE DAY ONE: set-stage, skip, complete, dump state
Tier 2 — World integration
- [ ] World-state store shared with save-persistence
- [ ] Step world bindings (NPC overrides, spawns, area unlocks, weather)
- [ ] Step-entry precondition revalidation ("already true?" → auto-complete)
- [ ] The shared-NPC arbiter: lock + UI explanation + suspension escape
Tier 3 — Taxonomy and tracking
- [ ] Quest types as policy data; hidden quests via the trigger registry
- [ ] Daily commissions: regional pools, cycles, 4 AM reset
- [ ] Tracking contracts: markers DERIVED from objective state; the log;
      navigation handoff; pick a marker philosophy (full / area / anti-marker)
- [ ] Reward grants idempotent, keyed by quest+step ID
Tier 4 — Branching, emergent, live-service
- [ ] Branching quests with checkpoints
- [ ] Emergent layer if used (radiant templates / director) over an authored backbone
- [ ] Quest state versioning + migrations; additive-only patching
- [ ] Co-op authority model decided explicitly
```

## Key numbers (starting points — sourced anchors)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Content scale | BotW 133 quests (+19 DLC); TotK 253; Genshin 608 world quests + ~40 Archon acts | wiki |
| Step granularity | Skyrim stages 0–65535, convention increments of 10, 200 = done | official docs |
| Commissions | 4/day from regional pools, reset 04:00 server | wiki |
| Skyrim debug | `setstage` one stage at a time (jumping stages skips side-effects) | UESP |
| StateTree | UE5 HSM: evaluate only current-state transitions (cheap vs BT retick) | Epic docs |
| Radiant | template + aliases filled by conditions + Story Manager events | CK docs |
| Ghost of Tsushima | "Weenies" landmark taxonomy: something calls the player every ≤30 s | GDC |
| Tracking | 1 navigated quest at a time; unlimited active (both reference games) | wiki |

Full sourced tables (with flagged "do-not-invent" gaps) in each reference file.

## Engine mapping (summary)

| Generic block | Unity 6 | UE5 (5.4+) |
| --- | --- | --- |
| Definitions | ScriptableObject per quest (immutable) + POCO runtime state by string ID | PrimaryDataAsset / DataTable rows |
| Flow control | SO quest graph / FSM; `[SerializeReference]` state lists | **StateTree** (HSM): States + Tasks + Evaluators, per-state bindings |
| Event bus | `GameEvents` singleton + typed bus; dirty-queue | **GameplayMessageSubsystem** (tag channels, local) + GAS GameplayEvent (networked) |
| Conditions/actions | polymorphic `[SerializeReference]` with AND/OR/Min-N combinators | typed structs + GameplayTags as the fact store (hierarchical subscription) |
| Live-service content | Addressables for quest prefabs/scenes | **GameFeature plugins** (Epic's additive-content pattern) |
| Ecosystem | Quest Machine (Pixel Crushers) | Narrative Pro |

Full detail in [scripting.md](./scripting.md).
