# Pitfalls — the 14 classic loot/drop failure modes

Each: symptom → root cause → prevention, with real incidents where
documented. Read before designing; re-read when a rare drop vanishes
unseen or the community proves your RNG biased.

## 1. Client-side rolling

- **Symptom** — memory editing or packet forging changes loot; server
  economies corrupted.
- **Root cause** — the client computes the drop and announces it.
- **Prevention** — the server rolls, the client renders (even
  Genshin's kernel anti-cheat exists explicitly to protect its RNG
  structures). Solo equivalent: roll-at-spawn vs roll-at-open is the
  save-scum decision (see #4).

## 2. The 99%-miss streak read as a bug

- **Symptom** — "drops are broken" tickets while the RNG is correct:
  a 10% drop missing 30 times in a row *happens* (~4% of players on
  any given window).
- **Root cause** — pure RNG with no floor; rates uncommunicated.
- **Prevention** (within the no-pity scope) — table-level features:
  **guaranteed slots** (PoE 2 ships official "drop protection" —
  guaranteed rares on unique bosses), quantity floors per N kills,
  published rates. Perception is part of the system.

## 3. Table drift across content

- **Symptom** — every new region hand-builds its tables; the economy
  goes inconsistent (wood worth 2× more in region B).
- **Root cause** — no shared sub-tables.
- **Prevention** — layered tables: common sub-tables referenced by
  many parents, thin regional overrides (UE5 Composite DataTables do
  exactly this). New region = new overrides, not new tables.

## 4. Save-scum farming (solo)

- **Symptom** — save before chest/kill, reload until the good roll.
- **Root cause** — roll-at-open + RNG reseeded on load.
- **Prevention** — roll-at-spawn (content decided at generation) and/
  or RNG state serialized in the save (`progression-economy`). Or
  accept it explicitly: **BotW is save-scummable by design**
  (Lurelin gambling and amiibo drops reroll on reload — documented,
  widespread, accepted as a solo trade-off Nintendo made). A service
  game cannot make that trade.

## 5. The despawned rare

- **Symptom** — a rare item drops, the player doesn't notice, it
  despawns or falls through the floor.
- **Root cause** — a uniform despawn timer + unvalidated physics.
- **Prevention** — no despawn above a rarity threshold (Diablo II's
  graded 10/30-min timers are the precedent), beam VFX by rarity,
  minimap ping, a position-validation raycast at settle. The Destiny
  2 Postmaster counter-lesson: a safety net with silent FIFO
  eviction (20 slots, exotics overwritten) recreates the loss.

## 6. Respawn on screen

- **Symptom** — a node or enemy pops back into view; immersion dies.
- **Root cause** — timer-only respawn without a visibility test.
- **Prevention** — the never-on-screen invariant, structural: BotW's
  RevivalRandom only rolls while the player is in a *different map
  area*; the blood moon goes further and ritualizes mass respawn
  into fiction (a midnight cutscene — the reset becomes lore).

## 7. One-time flag leaks

- **Symptom** — (a) chest opened, crash before the flag write →
  duplicate claim on reload; (b) flag written, reward not granted →
  permanent loss and a support ticket.
- **Root cause** — flag and grant not atomic.
- **Prevention** — claim+grant in one transaction (the
  `progression-economy` idempotent discipline applied to chests);
  if not transactional, **grant first, flag second** — a rare dupe
  is cheaper than a permanent loss.

## 8. Co-op loot griefing/desync

- **Symptom** — shared drops ninja'd; or a guest consumes the host's
  one-time reward.
- **Root cause** — the instanced-vs-shared decision never made
  explicitly per category.
- **Prevention** — the verified Genshin matrix as the template:
  one-time = host-only (guests *can't* interact — loss is
  impossible), enemy drops and ore = instanced per player,
  plants/specialties = shared first-come, energy-gated claims =
  instanced (each player's own resin; respawn waits for the last
  claim). Decide every cell; never let it emerge.

## 9. The farming-bot economy hole

- **Symptom** — unbounded overworld drops + bots → server economy
  inflation.
- **Root cause** — no structural bound on per-account loot
  throughput.
- **Prevention** — **claim gating** is the structural answer: the
  kill is free, the claim costs a time-regenerated resource — bots
  gain nothing past the quota. Layer daily caps (Genshin: 400
  elites/day then zero drops, 100 investigations). The inverse
  lesson: Diablo 3's 2013 gold dupe (integer overflow, billions
  duplicated, 415 bans, no rollback) — shared economies need bounds
  AND audits.

## 10. Drop physics chaos

- **Symptom** — 100 simulated drops = a perf spike, plus items
  rolling off cliffs and into water.
- **Root cause** — full permanent physics on every pickup.
- **Prevention** — impulse caps, **settle-then-freeze** (kinematic
  after rest), no-physics zones near edges, and an explicit water
  policy: BotW's is per-material (wood floats, metal sinks but
  Magnesis recovers it) — the game ships recovery *tools*; without
  one, float-or-teleport-ashore is the guard.

## 11. The invisible drop budget

- **Symptom** — areas accumulate hundreds of pickups → performance
  (and in co-op, replication bandwidth) death.
- **Root cause** — no cap on live drops.
- **Prevention** — the budget exists in shipped data: BotW's
  ActorLimiter (10 dropped items / 10 discarded weapons / 20 enemy
  drops, oldest evicted, `PriorityMaterial` exempt). Resolve the
  eviction-vs-rarity conflict explicitly: merge commons into stacks,
  evict commons before rares. In UE5 every replicated drop costs
  network — the cap is also a net budget.

## 12. Mid-event table edits

- **Symptom** — a drop table changed mid-event while players farm →
  inconsistent results, support tickets.
- **Root cause** — no versioning on drop data.
- **Prevention** — the `progression-economy` data-version handshake:
  rolls carry their table version; deploy at session boundaries or
  force a re-fetch.

## 13. The notification flood

- **Symptom** — a mass kill → 50 stacked pickup toasts; unreadable
  UI.
- **Root cause** — one UI event per pickup, no aggregation.
- **Prevention** — an aggregation window (~1–2 s) merging "Iron
  Chunk ×5"; pooled toasts; a bounded-depth queue with collapse
  (`hud-system` contract).

## 14. Weighted-selection bias

- **Symptom** — certain combinations near-impossible; zero-weight
  entries drawn; invisible bias shipping for years.
- **Root cause** — off-by-one in cumulative scans, float boundary
  errors, or structural sampler bias.
- **Prevention** — **integer weights** (Vose documents the float
  alias-method instability), exhaustive distribution tests (10⁶
  rolls, chi-squared tolerance) **on the real sampler output, not
  the config**, and an explicit fallback for empty/all-false tables.
  The canonical incident: **Destiny 2 "Weightgate" (2024)** —
  adjacent perks in the table dropped together far too often; Bungie
  first denied it ("each perk is weighted equally" — true of the
  *data*; the bug was in the *code*), the community proved it by
  mass data-crunching, fix + compensation followed. Test the output
  distribution.

## Debugging order

When loot misbehaves: (1) run the distribution test on the live
sampler (#14), (2) audit shared sub-table references across regions
(#3), (3) kill 30 enemies and watch the drop budget evict (#11),
(4) drop rares near cliffs and water (#5, #10), (5) crash between
open and flag-write on a chest (#7), (6) run the co-op matrix cell by
cell with a guest (#8), (7) save-reload around a chest open (#4),
(8) stand in the area and wait out a respawn timer (#6).

## Ship checklist

```
- [ ] Integer weights; null entries explicit; distribution tests on
      sampler output green (10^6 rolls)
- [ ] Shared sub-tables; regional overrides thin; zero hand-copied
      tables
- [ ] Server rolls (or solo roll-at-spawn decision documented)
- [ ] One-time claims atomic (grant-then-flag order if not
      transactional)
- [ ] Per-node timestamps delay-insensitive; reset policy per
      category written
- [ ] Never-on-screen check before every respawn
- [ ] Live-drops budget with rarity exemption; rare-drop guards
      (no despawn / beam / ping)
- [ ] Physics: settle-then-freeze, edge zones, water policy
- [ ] Co-op matrix decided per category and tested with guests
- [ ] Daily caps + claim gating bound the farm
- [ ] Pickup toasts aggregated; chest ceremony non-blocking
- [ ] Table version handshake; no mid-session table swaps
```
