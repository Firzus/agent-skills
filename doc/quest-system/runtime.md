# Runtime — evaluation, the shared-NPC conflict, no-fail, co-op

The live quest machinery. All numbers are **starting points**. Primary sources:
the Genshin datamines, zeldamods, HoYoverse support.

## Event-driven evaluation

Gameplay systems emit typed events (`OnEnemyKilled`, `OnItemCollected`,
`OnLocationReached`, `OnActorInteracted`, `OnDialogueFinished`); the manager
re-evaluates only the subscribed conditions (dirty-queue batching for composed
ones). Polling is reserved for continuous conditions (time windows, zone presence)
at explicit intervals. BotW's equivalent: systems set flags; the manager advances
steps whose `NextFlag` flipped — evaluation centralized in the store's update. See
[scripting.md](./scripting.md) for the event-bus engineering.

## World integration is declarative per step

NPC schedule overrides and map indicators in the step data (BotW); scene group
*suites* refreshed by exec actions (Genshin — alternative spawn-sets of
NPCs/gadgets/monsters per quest state). Witcher 3 makes the same idea graph-native:
story phase setters (which NPC "casting" is active), show/hide world layers per
step. The world-state store is the same flag store the save serializes
(`save-persistence`).

## The shared-NPC conflict

The shipped solution is an **exclusive lock with explanation**: quest A owns the
NPC; quest B shows "involved in another quest" with a "?" indicating *which* quest
blocks; since 4.1, an opt-in **suspension** dialog resolves conflicts (an admission
that pure locking doesn't scale). NPC instancing per quest context is a design
*alternative*, not what Genshin ships. Priority quests (auto-triggered, blocking
teleport and co-op until done) are the heavy end of the same lock —
`teleport-map-unlock` consumes those locks.

## No-fail and no-abandon

Neither reference game exposes quest failure; time-gated quests just wait (miss the
02:00–05:00 window → skip time again). No quest can be deleted from the log — only
navigation canceled. Exceptions are deliberate: perishable commissions, hangout
bad-endings (checkpoint retry), expiring event quests. **Decide the fail policy
globally on day one** — keep Failed and Suspended in the enum even if unused
(pitfalls #13).

## Daily commissions runtime

4/day (0–1 NPC + 3–4 basic) drawn from the chosen region's pool at the 04:00 server
reset; **cycle system** — each NPC commission spawns N times per cycle, removed once
done, the cycle ends only when exhausted (one observed Sumeru cycle ≈ 30 NPC
commissions → a specific one can take weeks to return); multi-day chains with
hidden achievements; since 4.4, achievement-linked commissions stay prioritized;
some commissions only enter the pool after world-quest completion. The reset
aligns with the `world-time-weather` 4 AM scheduler.

## Co-op authority

The shipped-radical answer (Genshin, verified): **only the host progresses** —
guests fight but get no quest credit; story quests block co-op outright; NPC
dialogues and item hand-ins are inoperable for guests. There is no first-party
co-op-quest pattern on either engine — replicate state from server authority and
**decide the model explicitly before the first co-op feature** (pitfalls #14). See
`coop-session`.

## Flagged gaps — do NOT invent

Commission pool sizes (one community observation) · the exact non-combat scope of
priority-quest locks · co-op quest-credit edge cases beyond the host-only rule.

## Sources

Genshin datamines (Grasscutter, GC-Resources) · Genshin Fandom (Commission,
Hangout, Archon Quest, Version 5.5) · HoYoverse Help Center (co-op) · zeldamods
(time-gated quest behavior) · GDC 2017 (any-order design).
