---
name: loot-drop-system
description: >-
  Architecture blueprint for loot tables, world drop distribution, and
  claim gating in open-world games: layered weighted tables (shared
  sub-tables, null entries, guaranteed slots, conditionality via table
  selection and actor substitution), world distribution (one-time placed
  containers, per-node respawn timestamps, the three revival policies),
  the drop execution pipeline (scatter, pickup classes, despawn rules,
  the max-live-drops budget), and claim gating (kill-then-claim with
  energy validation, per-player co-op instancing, idempotent claims).
  References: Genshin Impact (Grasscutter drop data, verified co-op
  rules) and BotW/TotK (datamined bdrop tables, ActorLimiter, revival
  policies). Use when designing or building enemy drops, chests,
  gathering nodes, respawn systems, loot distribution, or when rare
  drops despawn unseen, weighted selection biases silently, or co-op
  players grief one-time rewards.
---

# Loot & Drop System

Build the loot layer of an open-world game — layered tables, world
distribution/respawn, and claim gating. Scope: simple rates (no pity /
bad-luck protection — see `progression-economy` for deterministic
economies) and no rolled item generation (artifact substats live
elsewhere). References: Genshin Impact (server model, Grasscutter drop
data, officially verified co-op rules) and BotW/TotK (datamined bdrop
tables, ActorLimiter, revival policies).

## The architecture rule

**Tables are layered data, drops are budgeted world objects, and a
claim is a transaction.**

```
TABLES (layered, weighted, shared)
  entries = {item | sub-table ref}, INTEGER weight, quantity range,
  plus the NULL entry (nothing drops) as a first-class weighted row
  guaranteed slots (always-roll tables) stack ALONGSIDE chance slots —
  BotW tiers don't raise percentages, they ADD guaranteed tables
  shared sub-tables (CommonOres, RegionalHerbs) referenced by many
  parents; thin regional overrides — never hand-copied tables
  conditionality by THREE mechanisms, prefer the last two:
    (a) condition fields in entries (industry default)
    (b) TABLE SELECTION by context — BotW: the death mode picks the
        table (Normal / Iced / Burnout / per-ammo-type)
    (c) ACTOR SUBSTITUTION — BotW tiers are different actors with
        their own tables; Genshin ships multiple monster IDs to cut
        drops in quest contexts
  scaling shifts entities across reward tiers; it never edits tables
  (Genshin: probability and material tier scale with enemy level —
  quantity does not)

WORLD DISTRIBUTION (placed vs spawned)
  one-time placed (chests, koroks): persistent flags, NEVER respawn
  resource nodes: per-node timestamps (delay-insensitive — late
  harvesting doesn't shift the rhythm), real-time independent of
  daily resets
  enemies/weapons: a reset policy per category — event-driven (blood
  moon), probabilistic (1%/60 s off-area), daily, never
  the invariant: NOTHING respawns on screen

EXECUTION (drops are budgeted)
  on-death: evaluate the selected table, spawn with data-driven
  position/impulse; settle-then-freeze physics
  pickup classes: auto-by-contact (currency, orbs) vs interact
  despawn: placed-idle persists, dropped despawns on unload;
  the MAX-LIVE-DROPS budget with oldest-eviction and a
  priority/rarity exemption tag (BotW ships this literally:
  10/10/20 caps + PriorityMaterial)

CLAIM (a transaction, not a pickup)
  kill-then-claim: victory spawns a CLAIMABLE WORLD OBJECT; the
  claim validates the energy cost server-side (nothing drops on
  death itself)
  one-time claims: atomic flag+grant (the progression-economy
  idempotent discipline); per-player claim state in co-op
```

## The co-op matrix (verified)

Decide instanced-vs-shared **per category, explicitly** — the shipped
Genshin model is complete:

| Category | Rule |
| --- | --- |
| One-time world rewards (chests, oculi, investigation) | **host-only** (guests can't interact — no loss possible) |
| Enemy drops, ore | **instanced per player** (each sees their copy) |
| Plants/specialties | **shared** (first-come; one harvest per session) |
| Energy-gated claims (bosses, ley lines) | **instanced per player** — each claims with own resin; the boss respawns only after the LAST player claims (HoYoverse-confirmed) |

## Build order (4 shippable tiers)

```
Tier 1 — Tables and rolling
- [ ] Layered table assets: weighted entries (integer weights),
      null rows, quantity ranges, sub-table refs, guaranteed slots
- [ ] Seeded per-system RNG stream (deterministic, serializable)
- [ ] Distribution unit tests: 10^6-roll chi-squared on REAL output
      (test the sampler, not the config — the Weightgate lesson)
- [ ] Fallback for empty/all-conditions-false tables (never silent
      null)
Tier 2 — World distribution
- [ ] One-time containers: persistent ID flags; atomic open
      (grant-then-flag if not transactional)
- [ ] Resource nodes: per-node timestamps in the save,
      delay-insensitive cycles
- [ ] Reset policies per category + the never-on-screen check
      (area/frustum test before any respawn)
- [ ] Conditionality via table selection + actor substitution
Tier 3 — Execution pipeline
- [ ] Drop spawn: data-driven scatter (position mode + impulse),
      settle-then-freeze, water/edge recovery policy
- [ ] Pickup classes (auto radius vs interact) + magnetism
- [ ] The live-drops budget: caps with oldest-eviction + rarity
      exemption; rare-drop guards (no despawn for high rarity,
      beam VFX, minimap ping)
- [ ] Pickup feedback contract: aggregated toasts ("x5"), chest
      ceremony, claim UI (hud-system)
Tier 4 — Claims and co-op
- [ ] Kill-then-claim: claimable world objects, server-validated
      energy spend, per-player claim state
- [ ] The co-op matrix implemented per category
- [ ] Anti-farm bounds: daily interaction caps, claim gating as the
      structural bot answer
- [ ] Solo: roll-at-spawn + RNG-state-in-save (anti save-scum), or
      accept it explicitly (the BotW stance)
```

## Numbers (starting points — sourced anchors)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Table formats | BotW bdrop: RepeatNumMin/Max + items with probabilities **summing to 100.0** per table; Grasscutter: weight windows on a 0-10,000 scale + min/maxCount | datamine |
| Live-drops budget | BotW ActorLimiter: 10 dropped items / 10 player-discarded weapons / 20 enemy drops / 15 amiibo, oldest evicted, `PriorityMaterial` exempt | datamine |
| Respawn policies | BotW: blood moon (~168 min active play) for enemies/weapons; RevivalRandom 1%/60 s off-area for materials **and ore** (not blood moon — guides are wrong); Genshin: plants 48 h, crystals/fishing 72 h, commons 12-24 h, elites daily 04:00, bosses ~5 s post-claim | datamine/wiki |
| Drop scaling | probability + tier scale, quantity doesn't (masks 16.8%→42% by level; boss materials mean 1.62→2.56 WL0→WL8); tier thresholds at levels 40+/60+ | wiki |
| Chest tiers | 0-2 / 2-5 / 5-10 / 10-40 primogems (Common→Luxurious), region-parameterized; **never respawn** | wiki |
| Claim values | ley line mora 12k→60k (capped at WL6), 20 resin; boss 40; weeklies 30 first 3 then 60 | wiki |
| Anti-farm caps | 400 elites/day (then zero drops), 100 investigations/day; chest one-time; resin as the structural bound | wiki |
| Despawn | BotW: idle-placed persists, dropped despawns on area unload; D2's graded timers (10/30 min by rarity) as the historical rare-guard | community/datamine |

Flagged — never invent: Genshin pickup radii and despawn timer
(~10-15 min community only), the auto-pickup class boundary, toast
timings, generic engine pickup budgets (ActorLimiter is the only
anchor). Full tables in [architecture.md](./architecture.md).

## Engine mapping

| Generic block | Unity 6 | UE5 (5.4+) |
| --- | --- | --- |
| Tables | ScriptableObject entries (`[SerializeReference]` for item-vs-subtable polymorphism), `OnValidate` weight totals | DataTable rows + `FDataTableRowHandle` refs; **Composite DataTables** for regional overrides; DataRegistry; Instanced Structs (5.5) for row polymorphism |
| Sampling | Linear cumulative scan fine to ~100 entries; alias method (Walker/Vose) O(1) for huge tables — **integer weights** (float alias instability is documented) | Same algorithms; server rolls, client renders |
| RNG | `Unity.Mathematics.Random` — seedable struct, per-system streams, Burst-compatible (the save-state option); exclusive upper bounds gotcha | `FRandomStream` — seedable, thread-safe; replicate results not streams (call-order desync trap) |
| Drop spawning | `UnityEngine.Pool.ObjectPool<T>` (first-party, main-thread); impulse scatter; trigger vs OverlapSphere pickup; MoveTowards magnetism | **No first-party actor pooling** (subsystem + OnAcquire/OnRelease pattern or plugins); GAS is NOT the loot domain; Mass = overkill |
| Co-op instancing | Mirror/NGO ownership filtering | Replicated pickup actors (budget the network cost: relevancy distance, low NetUpdateFrequency, dormancy); `COND_OwnerOnly` has documented dynamic-toggle traps — the robust pattern: server-side loot list + per-client RepNotify visibility |
| Streaming | Drops parented to cell lifetime | **Runtime-spawned actors are NOT unloaded by World Partition** (Epic guidance: manual lifetime — destroy on cell unload, respawn via in-cell spawners) |
| Persistence | Node timestamps + flag sets in the save | SaveGame + per-node timestamps |

## Failure modes

The 14 classic loot bugs (client-side rolling, perceived-broken RNG
streaks, table drift across regions, save-scum farming, the despawned
rare, respawn-on-screen, one-time flag leaks, co-op griefing, the
farming-bot economy hole, drop physics chaos, the invisible drop
budget, mid-event table edits, notification floods, weighted-selection
bias — Weightgate) are cataloged in [pitfalls.md](./pitfalls.md) with
symptom → root cause → prevention and real incidents.

## Related skills

- `progression-economy` — idempotent grants, RNG-state-in-save,
  data-version handshakes, energy (resin) as the claim currency.
- `save-persistence` — one-time flags, per-node timestamps, atomic
  claim writes.
- `world-time-weather` — daily resets, the per-node real-time clocks.
- `enemy-ai-framework` — tier substitution via the spawn director.
- `coop-session` — the host-only/instanced/shared matrix is the loot
  side of its content rules.
- `inventory-equipment` — rolled instances (roll-at-spawn) land in its
  item model.
- `open-world-streaming` — drop lifetime vs cell lifecycle.
- `hud-system` — aggregated pickup toasts, claim UI, rarity beams.
