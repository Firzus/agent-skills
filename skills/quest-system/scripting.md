# Scripting — the engineering of quest systems

The runtime architecture for working programmers. Concrete API names and
trade-offs. Uncertainty flagged `[?]`.

## Control flow: state machine, not behavior tree

**A quest is a small program** — a tiny state machine whose transitions are gated
by gameplay conditions and whose state-entry runs side-effecting actions. This is
the dominant production view.

- **State machine / HSM (the recommended default)**: quest phases = states
  (Inactive → Objective1 → Objective2 → Complete/Failed); multi-stage quests use
  **hierarchical** states (a parent "RanOutOfTime"/failure state inherited by
  children). Cheap and predictable — you only evaluate transitions *out of the
  current state*, not the whole graph.
- **Behavior trees are a poor fit**: a BT re-evaluates the whole tree every tick
  (designed for reactive AI, not linear/branching progression). Reserve BTs for
  micro-behaviors; use an HSM for quest flow.
- **UE5 StateTree** = a hierarchical state machine with composable **Tasks +
  Evaluators**, a **per-state data model** + explicit **bindings** between states
  (NOT a shared blackboard, deliberately, to reduce hidden coupling). Selection is
  depth-first to the first valid leaf; transitions fire leaf→root, first success
  wins, with priority tie-breaks; trigger via `StateTree Send Event` (GameplayTag)
  or `Request Transition`. Multi-objective-within-one-state: an "Objective Manager"
  Task that binds to child objective tasks and finishes only when all report done.
  (Use 5.4+; version advice is community consensus `[?]`.)
- **Unity quest-graph patterns**: a node-based graph editor over ScriptableObject
  quest/objective/condition assets; nodes = states, edges = prerequisites.

## The event bus

**Pub/sub over direct references**: gameplay systems broadcast typed events;
objectives subscribe only to what they need, so adding a quest never touches
gameplay code.

- **Unity**: a `GameEvents` singleton holding `Dictionary<string, Action>`, or
  signal-based managers.
- **UE5 Lyra `GameplayMessageSubsystem`**: channel = a **GameplayTag**, payload =
  any `USTRUCT`. `BroadcastMessage(ChannelTag, Struct)` /
  `RegisterListener(ChannelTag, this, &Callback)`. **Synchronous, local-client-only**
  (NOT replicated — complements GAS `GameplayEvent` which is networked). The
  listener `MatchType` allows **hierarchical tag subscription** (subscribe to
  `Quest.Kill` and catch `Quest.Kill.Wolf`).
- **GameplayTags as a fact store**: tag containers on actors act as a queryable
  global blackboard; a parent-state watcher observes tag changes and feeds child
  enter-conditions.

**Evaluation strategy** — event-driven vs polling vs dirty-flag:

- **Event-driven**: evaluate only when a relevant event fires (best for discrete
  facts — kill/pickup/flag). Risk: double-fire / double-reward if you forget to
  unsubscribe on completion.
- **Polling**: check each tick — fine for a *few* continuous conditions
  (distance/timer); avoid for huge counts.
- **Dirty-flag / dirty-queue (the sweet spot)**: an event marks the objective
  dirty → batch `ProcessAll()` in `Update()`. Debounces high-frequency events and
  coalesces redundant re-evals (claimed 1000+ simultaneous quests).

## Dependency graphs & prerequisites

Model prerequisites as a **DAG**; a cycle is unsatisfiable. **Topological sort** to
(a) detect cycles (fail fast in CI) and (b) compute "what's unlockable now". Kahn's
algorithm (repeatedly pick in-degree-0 nodes) is the standard. **Fan-in** (a quest
needs several prereqs) and **fan-out** (one unlocks many) fall out as
degrees. **Revalidate on load**: re-derive availability by replaying prereq
predicates against restored facts, never trust a stored "available" bool (it
drifts). Express prereqs as GameplayTags ("Quest.Main.Prologue.Completed") rather
than hardcoded references. Graph health checks: single start node, no unreachable
stages, no un-finishable nodes.

## Condition / action systems

The unit is a **typed condition** exposing `StartChecking/StopChecking/SetTrue/
Recheck`. Compose with AND/OR/NOT via a composite, and prefer a **k-of-n** group
(All / Any / Min-N) — a superset of plain AND/OR.

- **Unity polymorphism**: `[SerializeReference]` on `List<Condition>` gives true
  polymorphic serialization (needs a custom PropertyDrawer to pick the concrete
  type) — use for *inline, per-quest* logic; ScriptableObject subassets when you
  need *shared, referenceable* logic.
- **UE / GAS-style**: `GameplayTagRequirements` (required + blocked tag
  containers), StateTree enter-conditions + Evaluators.
- **Actions** mirror conditions: typed, polymorphic side-effect objects on state
  entry.

## Save/load & versioning

- **Definition-vs-state split (the cardinal rule)**: definitions are content,
  never serialized; serialize only **runtime state** (active/done, progress counts,
  flags), referencing definitions by **stable string ID** resolved on load via a
  registry. Never serialize SO/object pointers.
- **Stable IDs, not positional indices**: a mission list is static within a run but
  *not* across saves (patches add/reorder) — store the ID alongside the value.
- **Envelope**: `{ saveVersion, schema, checksum, payload }`; atomic write +
  backup rotation.
- **Schema migration = chained pure functions**: `while v < CURRENT: data =
  Migrate(v, data); v++` (one migration per version bump). Reject newer-than-current
  saves. **Additive-only patching**: add fields with defaults; deprecate-with-default
  for one release before deleting.
- **Golden-save testing**: keep fixture saves from each milestone; CI loads them
  through the full migration chain. Mid-quest corruption causes: skipping stages so
  side-effecting scripts never run (the Skyrim lesson), non-idempotent event replay
  (use idempotency tokens), positional-index saves after a content patch, stored
  stale "available" booleans.

## Debug tooling & telemetry

- **The Skyrim `setstage` gold standard**: `setstage <id> <stage>` (advance/repair),
  `sqs` (list stages + done state), `SetObjectiveCompleted`, `resetquest`,
  `movetoqt`. The critical lesson: prefer `setstage` **one stage at a time** over
  `completequest` — stages trigger scripts that mutate world state; jumping skips
  them and *breaks downstream quests*. Make every meaningful transition
  reachable/forceable via console.
- **Automated tests**: headless deterministic-seed clients run scripted
  playthroughs of critical paths; a pure-C# core (no engine deps) enables fast unit
  tests. Property/scenario tests + graph checks verify "can every quest complete
  from any state".
- **Telemetry**: record `quest_start/step/complete/fail_reason/reopen_count`; the
  funnel (unique players per sequential step) spots where players get stuck —
  "often bugs masquerading as design". Soft-lock detection monitors state drift and
  lifecycle-duration spikes.

## Unity ↔ UE5 mapping

| Concern | Unity | UE5 |
| --- | --- | --- |
| Flow control | SO quest graph / FSM; `[SerializeReference]` state lists | **StateTree** (HSM): States + Tasks + Evaluators |
| Event bus | `GameEvents` singleton; signals | **GameplayMessageSubsystem** (tag channels, local); GAS GameplayEvent (networked) |
| Fact store | tags/flags in a blackboard SO | GameplayTag containers + `GameplayTagQuery` (hierarchical) |
| Typed condition | `IConditionInstance`, Quest Machine `QuestCondition` | StateTree enter conditions; `GameplayTagRequirements` |
| AND/OR/Min-N | `ConditionGroup` (All/Any/Min-N) | nested conditions; tag query Any/All/None |
| Polymorphic authoring | `[SerializeReference]` + PropertyDrawer, or SO subassets | instanced subobjects; `TInstancedStruct` |
| Save state | DTO + stable ID + registry; JsonUtility | `USaveGame` + versioning; serialize by stable ID/tag |
| Debug tooling | Quest Debugger window | console exec cmds (Skyrim `setstage` = the reference) |
| Ecosystem | Quest Machine, unity-quest-core | Narrative Pro |

## Key trade-offs

- **StateTree/HSM > BT** for quests: evaluate only current-state transitions.
- **Event-driven + dirty-queue > pure polling** at scale; polling fine for a few
  continuous conditions.
- **`[SerializeReference]`** for inline per-quest logic; **ScriptableObject** for
  shared/referenceable logic.
- **Definition/state split + stable IDs + chained migrations** is non-negotiable;
  positional indices and stored derived/availability flags are the classic
  corruption vectors.
- **`setstage` one-at-a-time** (runs each stage's scripts) is the canonical
  soft-lock avoidance.

## Flagged gaps — do NOT invent

StateTree version advice and soft/hard-dependency terminology are community
consensus, not official doctrine · SLO/percentage figures are illustrative from
QA blogs · UE Mass-for-quests is uncommon in practice.

## Sources

Epic Dev Community (StateTree) · UE Community Wiki (GameplayMessageSystem) · Unity
`SerializeReference` docs · Game Programming Patterns (Dirty Flag) · Bitsquid
(Managing Coupling) · GameDeveloper.com (puzzle dependency graphs) · UESP
(Skyrim:Console) · Heroic Labs (funnel analysis) · Pixel Crushers Quest Machine /
Narrative Pro docs · mechaniqe/unity-quest-core.
