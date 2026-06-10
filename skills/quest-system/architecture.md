# Architecture — data model, runtime, authoring, taxonomy, tracking

The components of a production quest system. All numbers are **starting
points — tune by playtest**; flagged gaps at the bottom. Primary
sources: zeldamods (`QuestProduct`, `GameDataMgr`), the Genshin
quest-config datamines (Grasscutter/GenshinTexts), the official REDkit
and Creation Kit docs, Genshin/Zelda wikis.

## The data model

### The two shipped schools

- **Flag-driven (BotW)** — one config pack for the whole quest
  manager; a quest = `Name`, `Orderer` (quest giver actor), `Type`
  (Main/Sub=shrine/Mini=side), dependency flags, and a `Steps` array.
  Each step: a text **key** (`MessageName` — text referenced, never
  embedded), the **`NextFlag`** whose true-transition advances the
  quest, declared `Actors` (AI-schedule overrides while the step is
  active) and `IndicatorActors` (map markers with world positions and
  an `OffFlag`). All progression logic lives *outside* — event
  scripts and NPC AI set global GameData flags; the quest observes.
  `GameDataMgr` is the single store (bool/int/string/vector flags,
  batched processing, periodic resets by category) that quests,
  world, and the save all share.
- **Condition/exec-driven (Genshin)** — `Chapter → MainQuest →
  SubQuest` (the subquest is the atomic on-HUD objective), typed
  categories (AQ archon / LQ story / WQ world / IQ commission / EQ
  event), a **DAG** of `prev_quest_ids`/`next_quest_ids` above the
  step lists. Each subquest carries `acceptCond[]`, `finishCond[]`,
  `failCond[]` (typed `{type, params, count}` with
  `LOGIC_AND`/`LOGIC_OR` combinators) and `beginExec[]`,
  `finishExec[]`, `failExec[]` (typed actions: refresh a scene group
  suite, set variables, unlock systems). Plus `finishParent` (close
  the MainQuest) and `isRewind` (the safe-resume checkpoint after
  disconnect). Chapter rows carry the act numbering and the
  begin/end subquests that fire the full-screen chapter cards.

Both schools converge on the invariants: **definitions immutable, text
as keys, progression by observed state, world effects declared per
step**. The fail machinery exists in Genshin's schema even though the
game almost never exposes failure — the enum is ready before the
design needs it.

### Taxonomy as policy data

One model, several types — differing only by policy fields:

| Type | Unlock | Lifetime | Reward model |
| --- | --- | --- | --- |
| Main (Archon chapters/acts) | progression rank + previous acts (+ cross-category prerequisites; "quick start" early unlocks) | permanent | per-step drip + act completion |
| Character story | rank + story keys (1 per 8 commissions, max 3 — retired for story quests in 5.4) | permanent | completion |
| World chains | discovery triggers, quest-gated visibility | permanent | per-quest |
| Commissions | rank + intro quest | **perishable** (gone at daily reset) | per-commission + daily bonus |
| Branching hangouts | rank + 2 keys | **replayable** with checkpoints | per-ending |
| Hidden/shrine quests | exploration triggers (read, reach, pick up, talk) | permanent | the reveal IS the reward |

## The runtime

- **Event-driven evaluation**: gameplay systems emit typed events
  (`OnEnemyKilled`, `OnItemCollected`, `OnLocationReached`,
  `OnActorInteracted`, `OnDialogueFinished`); the manager re-evaluates
  only the subscribed conditions (dirty-queue batching for composed
  ones). Polling is reserved for continuous conditions (time windows,
  zone presence) at explicit intervals. BotW's equivalent: systems set
  flags; the manager advances steps whose `NextFlag` flipped —
  evaluation centralized in the store's update.
- **World integration is declarative per step**: NPC schedule
  overrides and map indicators in the step data (BotW); scene group
  *suites* refreshed by exec actions (Genshin — alternative
  spawn-sets of NPCs/gadgets/monsters per quest state, living in
  scene scripts). Witcher 3 makes the same idea graph-native: story
  phase setters (which NPC "casting" is active), show/hide world
  layers per step.
- **The shared-NPC conflict** — the shipped solution is an
  **exclusive lock with explanation**: quest A owns the NPC; quest B
  shows "involved in another quest" with a "?" indicating *which*
  quest blocks; since 4.1, an opt-in **suspension** dialog resolves
  conflicts (an admission that pure locking doesn't scale). NPC
  instancing per quest context is a design *alternative*, not what
  Genshin ships. Priority quests (auto-triggered, blocking teleport
  and co-op until done) are the heavy end of the same lock —
  `teleport-map-unlock` consumes those locks.
- **No-fail and no-abandon**: neither game exposes quest failure;
  time-gated quests just wait (miss the 02:00–05:00 window → skip
  time again). No quest can be deleted from the log — only navigation
  canceled. Exceptions are deliberate: perishable commissions,
  hangout bad-endings (checkpoint retry), expiring event quests.
- **Commissions runtime**: 4/day (0–1 NPC + 3–4 basic) drawn from the
  chosen region's pool at the 04:00 server reset; **cycle system** —
  each NPC commission spawns N times per cycle, removed once done,
  the cycle ends only when exhausted (one observed Sumeru cycle ≈ 30
  NPC commissions → a specific one can take weeks to return);
  multi-day chains with hidden achievements; since 4.4,
  achievement-linked commissions stay prioritized in the pool; some
  commissions only enter the pool after world-quest completion.

## Authoring

### Three schools

| School | Reference | Shape |
| --- | --- | --- |
| Visual graph | Witcher 3 REDkit | quest = signal-flow node graph (Phase sub-graphs, Pause gates, Condition branches, Journal nodes, story-phase setters, show/hide layers) — world integration IS the graph |
| Numbered stages | Skyrim Creation Kit | stages 0–65535, convention: **increments of 10** (insertable later), 0 = pre-quest, 200 = conventional completion; per-stage conditional items + result scripts |
| Condition/exec tables | Genshin, BotW | typed cond/exec lists in config data; no per-quest code; internal tabular tools (inferred) |

Pick by team shape: graphs for narrative-heavy branching, stages for
script-centric teams, tables for live-service scale. The invariants
hold across all three.

### The invariants

- **Text separated from logic, always**: BotW references message
  keys; Genshin references per-language TextMap hashes resolved at
  display — adding a language never touches quest data. Logic
  compares IDs, never localized strings.
- **Debug console built with the runtime** (the Skyrim gold standard:
  `setstage`, `sqs`, `getstage`, `sqv`, `completequest`,
  `resetquest`, `movetoqt` — so robust players use it as a repair
  tool). Corollary: skipping stages skips side effects, so step
  actions must be replayable/forceable cleanly.
- **Live-service patching is additive-only**: new steps/branches,
  never delete or renumber shipped ones. Witcher 3's **deletion
  markers** (a removed node leaves a marker so a mid-quest player's
  signal doesn't die on patch) and Genshin's `isRewind` checkpoints
  are the two shipped safety mechanisms. Quest state is versioned
  with chained migrations tested against saves from every release.

## Hidden quests & world permanence

- **Discovery triggers through a trigger registry**: volumes,
  interaction triggers, item-pickup triggers, time windows. BotW's 42
  shrine quests (the quest IS the riddle; the reveal is the reward);
  Genshin's auto-starting world quests (the source of priority-quest
  complaints — auto-trigger with care).
- **Quests permanently mutate the world through the same flag store
  the save serializes**: Seirai Stormchasers progressively weakens
  then permanently removes the island's storm (the canon
  quest-owned weather-override case — `world-time-weather`);
  Aranyaka (~40 quests, 4 parts, the longest chain) unlocks a
  real/dream world toggle, reveals a statue absent from the map, and
  permanently clears a regional phenomenon. Permanence = flags;
  nothing special-cased.

## Tracking contracts (light)

- **Markers derive from objective state** — never set imperatively.
  BotW makes the contract data-explicit: `IndicatorActors` (position
  + `OffFlag`) published per active step to the marker registry
  (`minimap-worldmap`). Two marker kinds: exact, and **area circles**
  for search objectives.
- **The HUD tracker** (`hud-system`) shows the tracked quest's current
  step description (a text key on the subquest); auto-track on
  accept/advance, cancel-navigation to detach; **one navigated quest
  at a time**, unlimited active.
- **The log**: sorted by category then region; collapsible
  chapters/acts; suspension and blocking indicators surfaced.
- **Navigation handoff**: route to the objective via the nearest
  waypoint — *including the nearest locked one* (Genshin 5.5 Track
  and Guide), cross-scene tracking auto-opens the right map
  (`teleport-map-unlock`).
- Witcher 3 nuance: tracking can be an authored *action* (a Track
  Quest node) — the author may force focus, not only the player.

## Flagged gaps — do NOT invent

Commission pool sizes per region (one community observation only) ·
Genshin quest-ID range conventions ("3xxxx = archon" unverified; the
`mainId*100+index` subquest pattern is observed, not documented) ·
search-circle radii · toast timings · MiHoYo/Nintendo internal
authoring tools (inference) · "Genshin patches additive-only"
(plausible, unsourced — present as recommended practice backed by the
New World/Sky incidents) · a GDC talk dedicated to Witcher 3's
dependency graph (doesn't exist — cite REDkit docs for architecture,
Sasko's GDC 2023 for design) · NPC instancing in Genshin (all evidence
points to exclusive locks).

## Sources

zeldamods (QuestProduct, GameDataMgr, Bquestpack) · Genshin datamines
(GenshinTexts, Grasscutter commits, GC-Resources — Chapter/MainQuest/
SubQuest schema, cond/exec types) · REDkit official docs (quest nodes,
deletion markers) · Creation Kit wiki (stages, setstage) · Genshin
Fandom (Commission, Hangout Event, Archon Quest, Story Key, Version
5.5) · Zelda Dungeon/Game8 (quest counts) · GDC 2017 (any-order
design) · Sasko GDC 2023 (quest design lessons) · USSEP changelogs
(broken-chain catalog) · New World / Sky: CotL incident post-mortems.
