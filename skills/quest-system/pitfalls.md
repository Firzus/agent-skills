# Pitfalls — the 16 classic quest-system failure modes

Each: symptom → root cause → prevention. Read before designing;
re-read when a quest chain silently stops advancing or QA asks for a
two-hour replay to test step 12. Deep dives:
[data-model.md](./data-model.md), [runtime.md](./runtime.md),
[emergent.md](./emergent.md), [scripting.md](./scripting.md),
[tracking.md](./tracking.md).

## 1. Flag soup

- **Symptom** — hundreds of uncoordinated booleans; illegal states
  reachable; "why won't this NPC talk anymore?" is undebuggable.
- **Root cause** — no single source of truth; every feature adds its
  own bools; possible states explode as 2^n while legal states stay
  few.
- **Prevention** — one structured world-state store: an explicit
  state machine per quest + a named, queryable fact store
  (GameplayTags containers, or BotW's single GameDataMgr). BotW *is*
  massively flag-based and works — because the store is unique,
  generated, typed, and tooled. Structured flags ≠ flag soup.

## 2. Polling objectives

- **Symptom** — CPU cost grows linearly with active quests; every
  quest re-tests its conditions every frame.
- **Root cause** — conditions written in update ticks for convenience.
- **Prevention** — objectives subscribe to typed events; a
  dirty-queue batches re-evaluation of composed conditions; polling
  reserved for continuous conditions (timers, zone presence) at
  explicit intervals.

## 3. The broken quest chain

- **Symptom** — a step never advances; its trigger can no longer
  occur. Skyrim's USSEP catalog: the Thieves Guild chain dead if one
  NPC dies; *Kindred Judgment* blocked **even via console** once
  corpses get culled.
- **Root cause** — world state changed outside the quest's control:
  referent NPC dead/despawned/moved, object already collected.
- **Prevention** — step-entry preconditions (revalidate referents
  exist); revalidation on load; fallback advancement (trigger
  impossible → advance or fail cleanly); protect critical referents
  (essential flags) during the window the quest needs them.

## 4. Mid-quest save corruption

- **Symptom** — on reload, a step's action re-executes or is skipped;
  the quest reports completed but still runs with live references
  (a documented USSEP case).
- **Root cause** — a save lands between a step's action execution and
  its flag write; step actions aren't atomic.
- **Prevention** — the transactional step: actions + state write
  atomic with respect to saves (or: write the flag first with
  idempotent, replayable actions); CanSave=false during scripted
  action runs (`save-persistence`); versioned quest state tested
  against historical saves.

## 5. Shared-NPC conflicts

- **Symptom** — quest A moves the NPC while quest B's dialogue
  expects them elsewhere; content locked with no explanation.
- **Root cause** — no ownership arbitration between concurrent quests.
- **Prevention** — the shipped solution (Genshin): an **exclusive
  lock with a UI explanation** of which quest blocks, plus opt-in
  conflict suspension (added in 4.1 — locking alone didn't scale).
  Alternatives: NPC state stacks with priorities, per-quest
  instancing. The lesson: conflict is inevitable at scale — you need
  an arbiter AND a player-facing explanation.

## 6. Sequence breaking

- **Symptom** — the player reaches content out of order (traversal,
  teleport, boss killed before the quest asks) → stuck step or
  absurd dialogue.
- **Root cause** — implicit linear assumptions ("they'll pass A
  before B").
- **Prevention** — the BotW answer, confirmed in both GDC 2017 and
  the data: state-driven steps (flags), not sequence-driven; every
  step checks "is the condition *already* true?" on activation (boss
  already dead → auto-complete). Design for any order; the quest
  observes.

## 7. Quest item lockout

- **Symptom** — undroppable quest items polluting inventory forever
  after completion (Skyrim's Elder Scrolls/Finn's Lute); or a
  required item already sold/consumed.
- **Root cause** — item lifecycle managed ad hoc per quest (a begin
  script sets the flag; some completion branch forgets the removal).
- **Prevention** — a systemic quest-item lifecycle derived from quest
  state: "quest item" = "an active quest references this item",
  never a manual flag; auto-release on completion/failure; protect
  or re-source required consumables.

## 8. The untestable quest

- **Symptom** — QA replays two hours to test step 12; late steps ship
  untested.
- **Root cause** — no debug tooling; quest states reachable only by
  playing.
- **Prevention** — the Skyrim gold standard built *with* the runtime:
  set-stage, show-stages, complete, reset, dump-state — robust enough
  that players use it as a repair tool. Corollary: jumping stages
  skips side effects, so step actions must be individually forceable
  and replayable.

## 9. Patching live quests

- **Symptom** — after an update, mid-quest players are stuck or lose
  the quest entirely (New World's expansion: a dozen main quests
  unplayable, quests vanishing from in-progress journals; Sky: CotL
  0.26.5: legacy and new quest systems live simultaneously — 72 h of
  daily-quest failures).
- **Root cause** — the quest *structure* changed while serialized
  active states reference the old one; no state versioning.
- **Prevention** — versioned quest states with chained migrations
  tested on saves from each release; **additive-only** on shipped
  quests (new steps/branches, never delete/renumber); Witcher 3's
  deletion markers (a removed node still forwards a mid-quest
  player's signal) as the graph-school safety; GameFeature-style
  plugins to ship new content without touching the old.

## 10. Localization breaking logic

- **Symptom** — a quest works in English, breaks in German; objective
  text overflows the tracker UI.
- **Root cause** — string comparisons on localized text; text
  embedded in logic definitions.
- **Prevention** — logic references only IDs/keys; text lives in
  string tables (both reference games datamined-confirmed: message
  keys / TextMap hashes); per-language length budgets tested in the
  tracking UI.

## 11. Marker/objective desync

- **Symptom** — the marker points at the previous step's location;
  never cleared after completion; an area circle where an exact
  marker is expected.
- **Root cause** — markers set/removed imperatively by step actions:
  two sources of truth diverging at the first forgotten branch.
- **Prevention** — the strict contract: **markers derive from
  objective state** (the map queries "active objectives → target
  positions"); BotW declares `IndicatorActors` per step in data —
  declarative all the way down. The marker registry consumes
  (`minimap-worldmap`); it is never written to directly.

## 12. Reward duplication/loss

- **Symptom** — a reward granted twice (step re-entry; crash between
  grant and flag write) or lost (inventory full at grant time).
- **Root cause** — non-idempotent, non-transactional grants; the
  "delivery can fail" case unplanned.
- **Prevention** — idempotent grants keyed by quest+step ID, recorded
  atomically with the grant; a persistent retrieval queue (mailbox)
  when delivery can fail — never a silent drop.

## 13. The unfailable-quest trap

- **Symptom** — the whole pipeline assumes quests only advance; one
  timed/escort quest ships late in production and nothing handles
  Failed (UI, saves, dependents, partial rewards).
- **Root cause** — the state machine froze as Inactive→Active→
  Completed; the no-fail decision was implicit, never made.
- **Prevention** — decide the fail policy globally on day one: Failed
  (and Suspended — Genshin added it in 4.1) exist in the enum from
  the start even if unused; define contractually what Failed implies
  (items returned? dependents? retry?). Genshin's schema ships
  failCond/failExec while barely using them — the machinery precedes
  the need.

## 14. Co-op quest divergence

- **Symptom** — host and guest quest states diverge; guests see
  world changes from the host's quests that make no sense for their
  progression.
- **Root cause** — quest-mutable world state + players at different
  progressions in one replicated world = structural conflict.
- **Prevention** — the shipped-radical answer (Genshin, verified):
  **only the host progresses** — guests fight but get no quest
  credit; story quests block co-op outright; NPC dialogues and item
  hand-ins are inoperable for guests. Generic rule: decide the
  authority model before the first co-op feature, not after.

## 15. Radiant filler fatigue

- **Symptom** — an infinite procedural-quest generator spams the player
  with repetitive "go to the nearest dungeon" busywork that crowds out
  the authored content. The canonical case: Fallout 4's "Another
  settlement needs your help".
- **Root cause** — radiant/template quests with no pacing curve, no cap,
  and too little variety; the alias system fills the same skeleton
  forever; the CK docs themselves admit it "cannot create large,
  complicated, or particularly interesting quests".
- **Prevention** — treat procedural as **filler over an authored
  backbone**, never the backbone ([emergent.md](./emergent.md)): cap the
  active count per type, pace the offer rate, vary the templates, and
  reserve stakes/twists/payoff for authored quests. Budget the real cost
  of emergent systems — tuning/QA/tagging (Census) and reliability (the
  A-Life shipping failure).

## 16. The player can't find the objective

- **Symptom** — with markers off (or in an anti-marker game) players get
  lost and stuck; or, with markers on, the world becomes ornamental and
  players "follow the arrow" through everything.
- **Root cause** — the tracking layer was an afterthought: either no
  organic guidance to replace markers, or auto-track-on-accept implying
  importance and removing player agency, or markers set imperatively and
  desyncing.
- **Prevention** — pick a marker philosophy deliberately
  ([tracking.md](./tracking.md)): full markers / area-search radius /
  diegetic guidance (Ghost of Tsushima's "something calls every ≤30 s") /
  player-authored log (the Elden Ring counter-proposal) — and offer a
  toggle. Keep the contract: **markers derive from objective state**.
  Provide organic cues (landmarks, environmental signposting) before
  removing markers.

## Debugging order

When quests misbehave: (1) dump the world-state store and diff
against expected flags (#1), (2) check the stuck step's referents
exist (#3), (3) save-reload across the step boundary (#4), (4) check
which quest holds the NPC lock (#5), (5) trigger the step with its
condition already satisfied (#6), (6) force-complete via console and
watch side effects (#8), (7) re-enter the completed step and count
rewards (#12).

## Ship checklist

```
- [ ] One world-state store; full dump inspectable; zero ad-hoc bools
- [ ] No per-frame condition polling (event audit)
- [ ] Every step revalidates referents on entry and on load
- [ ] Steps transactional w.r.t. saves; CanSave gated during actions
- [ ] NPC conflicts: lock + which-quest explanation + suspension path
- [ ] Every step auto-completes if its condition is already true
- [ ] Quest items derive from quest state; none survive completion
- [ ] Debug console: set-stage/skip/complete/dump shipped with runtime
- [ ] Quest state versioned; migrations tested on previous-release
      saves; shipped quests patched additive-only
- [ ] Logic references text keys only; lengths tested per language
- [ ] Markers derive from objective state (no imperative set/clear)
- [ ] Reward grants idempotent (crash-loop tested)
- [ ] Failed/Suspended in the enum; the fail policy documented
- [ ] Co-op authority model decided and enforced
- [ ] Emergent/radiant content (if any) capped, paced, varied, over an
      authored backbone
- [ ] Marker philosophy chosen + toggle; organic cues before removing
      markers; objective findable with markers off
```
