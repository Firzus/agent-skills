# Data model — schools, taxonomy, conditions, hidden quests

The immutable definition layer. All numbers are **starting points**. Primary
sources: zeldamods (`QuestProduct`, `GameDataMgr`), the Genshin quest-config
datamines, REDkit and Creation Kit docs.

## The two shipped schools

- **Flag-driven (BotW)** — one config pack for the whole quest manager; a quest =
  `Name`, `Orderer` (quest giver), `Type` (Main/Sub=shrine/Mini=side), dependency
  flags, and a `Steps` array. Each step: a text **key** (`MessageName`), the
  **`NextFlag`** whose true-transition advances the quest, declared `Actors`
  (AI-schedule overrides while active) and `IndicatorActors` (map markers +
  `OffFlag`). All progression logic lives *outside* — event scripts and NPC AI set
  global GameData flags; the quest observes. `GameDataMgr` is the single store
  (bool/int/string/vector flags, batched processing, periodic resets) that quests,
  world, and save all share.
- **Condition/exec-driven (Genshin)** — `Chapter → MainQuest → SubQuest` (the
  subquest is the atomic on-HUD objective), typed categories (AQ archon / LQ story
  / WQ world / IQ commission / EQ event), a **DAG** of
  `prev_quest_ids`/`next_quest_ids` above the step lists. Each subquest carries
  `acceptCond[]`, `finishCond[]`, `failCond[]` (typed `{type, params, count}` with
  `LOGIC_AND`/`LOGIC_OR`) and `beginExec[]`, `finishExec[]`, `failExec[]` (typed
  actions). Plus `finishParent` and `isRewind` (safe-resume checkpoint).

Both schools converge on the invariants: **definitions immutable, text as keys,
progression by observed state, world effects declared per step**. The fail
machinery exists in Genshin's schema even though the game almost never exposes
failure — the enum is ready before the design needs it.

## Taxonomy as policy data

One model, several types — differing only by policy fields:

| Type | Unlock | Lifetime | Reward model |
| --- | --- | --- | --- |
| Main (Archon chapters) | rank + previous acts + cross-category prereqs | permanent | per-step drip + act completion |
| Character story | rank + story keys | permanent | completion |
| World chains | discovery triggers, quest-gated visibility | permanent | per-quest |
| Commissions | rank + intro quest | **perishable** (gone at daily reset) | per-commission + daily bonus |
| Branching hangouts | rank + keys | **replayable** with checkpoints | per-ending |
| Hidden/shrine quests | exploration triggers (read, reach, pick up, talk) | permanent | the reveal IS the reward |

## The prerequisite DAG

Model quest prerequisites as a **directed acyclic graph** (an edge u→v means "u
must complete before v"). A cycle is unsatisfiable ("key locked inside the box it
opens"). Use a **topological sort** to detect cycles in CI and compute "what's
unlockable now". Fan-in (a quest needs several prereqs) and fan-out (one
completion unlocks many) fall out as in-degree/out-degree. Soft vs hard deps: hard
= must be `Completed` to unlock; soft = influences availability/content but isn't
strictly required (model as predicates over tags, not graph edges). On load,
**re-derive** availability by replaying prereq predicates against restored facts —
never trust a stored "available" bool (it drifts). See [scripting.md](./scripting.md).

## Conditions & actions

The unit is a **data-driven typed condition**: `KillN(tag, count)`,
`ReachLocation(x, r)`, `HaveItem(id, qty)`, `FlagSet(key)`, `TimeElapsed(t)`.
Compose with **AND/OR/NOT** combinators via a composite node — and prefer a
**k-of-n** combinator (All / Any / Min-N), a superset of plain AND/OR. **Actions**
mirror conditions: typed, polymorphic side-effect objects run on state entry
(spawn a scene group, set a flag, start dialogue, give item, override weather,
unlock a waypoint). Both reference games express *all* logic this way — no
per-quest code. Authoring trade-off: visual graph (designer-readable, hard to
diff) vs data tables (diffable, weak at branching) vs code (max power, min designer
access); most shipping systems use tables for the catalog + a small condition
expression-tree for logic.

## Hidden quests & world permanence

- **Discovery triggers through a trigger registry**: volumes, interaction
  triggers, item-pickup triggers, time windows. BotW's 42 shrine quests (the quest
  IS the riddle); Genshin's auto-starting world quests (auto-trigger with care —
  the source of priority-quest complaints).
- **Quests permanently mutate the world through the same flag store the save
  serializes**: Seirai Stormchasers permanently removes an island's storm (the
  canon quest-owned weather-override case — `world-time-weather`); Aranyaka (~40
  quests, the longest chain) unlocks a real/dream toggle and permanently clears a
  regional phenomenon. Permanence = flags; nothing special-cased.

## Flagged gaps — do NOT invent

Commission pool sizes per region · Genshin quest-ID range conventions · the
`mainId*100+index` subquest pattern (observed, not documented) · NPC instancing in
Genshin (all evidence points to exclusive locks, not instancing).

## Sources

zeldamods (QuestProduct, GameDataMgr, Bquestpack) · Genshin datamines
(GenshinTexts, Grasscutter — Chapter/MainQuest/SubQuest schema, cond/exec types) ·
REDkit official docs · Creation Kit wiki (stages, aliases) · GameDeveloper.com
(puzzle dependency graphs).
