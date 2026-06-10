# Architecture — model, gear RNG, enhancement, UI, equipment

The components of a production inventory/equipment system. All numbers
are **starting points — tune by playtest**; flagged gaps at the
bottom. Primary sources: the Grasscutter `GameItem`/`InventoryTab`
source, the hope1ess leaked-server reverse engineering (artifact
generation — the best public source on a AAA loot generator), the
Genshin Fandom/KQM datamine-relayed tables, Lyra's official docs,
Zelda wikis.

## The data model

### Instance vs count — the founding decision

Grasscutter's `GameItem` is the reference schema: one class, two
families. Stackables carry `itemId + count` (clamped to the
definition's `stackLimit` at construction); equipment carries
`level, exp, totalExp, promoteLevel, locked, refinement, affixes`
(weapon) or `mainPropId, appendPropIdList` (artifact), plus
`equipCharacter` (at most one wearer). Each item is a database
document with an indexed owner and a per-player transient GUID for
the client protocol.

- **Definition vs instance**: the static definition (type, rarity,
  stack limit, equip type, curve references) lives in tables; the
  instance stores only mutable state — stat values recompute from
  the `progression-economy` curve tables, never persisted.
- **Stable GUIDs** are the only valid key for equips and loadouts
  across saves (engine object IDs are session-unstable).
- **Tabs are polymorphic**: `ItemType → InventoryTab` — equip tabs
  hold instance lists, material tabs hold `itemId → stack` maps,
  each with a configurable cap. The new-item badge is a server-side
  flag set when the tab lacks the id.
- **Invariants live in the model**: `isDestroyable() = !locked &&
  !equipped` — fodder/destruction protection is structural, not a UI
  checkbox.

### Caps as policy

Genshin: weapons 2,000; artifacts raised four times (1,000 → 1,500
(2.2) → 1,800 (4.0) → 2,100 (5.3); one source reports 2,400 —
flagged); 2,000 unique material *types* (the cap counts slots, not
quantities); stacks 9,999 general, 99,999 for ores/EXP materials.
Acquisition blocks at cap with a message — pair with the
cap-check-before-grant and overflow-to-mail contracts
(`progression-economy`).

### The BotW counterpoint: scarcity as progression

Per-category pouches with hard slot caps (weapons 8→19+1, bows
5→13+1, shields 4→20) expanded by korok seeds at escalating costs
(208/73/160 — 441 total) — **the cap itself is the progression
mechanic**. Materials stack 999 with no practical type cap; meals are
60 fixed slots. Two models: *scarcity* (the cap is gameplay) vs
*warehouse* (Genshin: huge caps, the friction is sorting/dissolving).
Choose deliberately.

## Gear RNG — the datamined pipeline

The leaked-server RE (hope1ess) + the wiki tables document the full
generator. Four weighted draws, all data:

1. **Slot** — from the source's drop table.
2. **Main stat** — weighted pick over the per-slot pool
   (`weightSelectOne` on leaked tables): flower/plume fixed (HP/ATK
   flat 100%); sands 1334/1333/1333/500/500 (≈26.7% HP%/ATK%/DEF%,
   10% ER/EM); goblet 770/770/760 + 8×200 elemental/phys DMG + 100 EM
   (the Dendro addition in 3.0 rebalanced HP%/ATK% from 21.25 to
   19.25% — pools are *versioned data*); circlet 3×1100 + 3×500 +
   200. The RE also surfaces a **main-stat pity** (per-depot pity
   counts forcing a stat after N misses) — plausible interpretation,
   flagged.
3. **Initial substat count** — by source: 20% four-liners from
   domains, 34% from bosses/strongbox, the rest three-liners (the
   community "25%" is obsolete).
4. **Each substat** — weighted pick from the remaining pool
   (main stat and present substats excluded): flat HP/ATK/DEF = 6,
   percentages/EM/ER = 4, crit rate/DMG = 3 (pool total 44).
   **Value** = one of 4 equiprobable roll tiers (70/80/90/100% of
   max; server data: 4 `propValue` entries per stat with equal
   random weights).

**Upgrades every +4**: below 4 lines → new weighted line; at 4 →
equiprobable line upgrade with a fresh tier roll (upgrade weights all
equal in the data). Max +20 (5★).

**The encoding insight**: an artifact is fully reconstructible from
`(setId, slot, mainPropId, appendPropIdList)` — each affix ID encodes
*which stat at which tier*. The instance is a compact ID list: cheap
to save, replicate, and audit. Copy this encoding.

**The deterministic track**: weapons roll nothing — fixed base +
secondary from curves; refinement R1–R5 consumes duplicates
(cumulative — a fed R2 counts its history). Two generation policies
behind one equipment interface.

### The constrained-guarantee funnel

Protections never break the core RNG; they shrink the search space,
shipped incrementally: guaranteed 5★ per AR45 domain run (mean
~1.065–1.07) → **strongbox** (3×5★ → 1×5★ of a *chosen set*, 34%
four-liners, batch 39→13) → **defined crafting** (elixir: set +
piece + main stat + 2 chosen initial substats; piece-dependent cost,
flower/plume = 1, others diverge across sources — flagged; 1
definition per set per cycle) → guaranteed upgrades on chosen
substats (≥2 by +20, since 5.5). Each stage is a data feature over
the same generator — design the hooks early.

The famous "perfect artifact" odds are community-computed and
criteria-dependent (a specific max-rolled CD piece ≈ 1/20M; an
on-set triple-crit-EM plume ≈ 1/440 drops) — cite the criterion with
the number, never a bare figure.

## Unified enhancement

One service, per-type tables — Grasscutter ships exactly this (one
`InventorySystem` carrying weapon and reliquary upgrade paths,
emitting item-change packets and a level event):

```
EnhanceService.feed(target, fodder[]) ->
  { expGained, moraCost, leftoverRefund, levelUps[], rollEvents[] }
```

- **Artifact tables**: fodder by rarity 420/840/1,260/2,520/3,780
  EXP; 5★ +0→+20 = 270,475 EXP at 1 Mora per EXP; recycling = base +
  **80% of invested EXP** (the 20% tax), recycled EXP costs no Mora;
  an EXP crit (90% ×1 / 9% ×2 / 1% ×5 — mean ×1.13) as RNG delight in
  a deterministic system; EXP books 2,500/10,000; salvage converts
  leveled 5★ back into books at 100% (remainder carried).
- **Weapon tables**: same recycling rate (80%), but **overflow
  refunds as ores** (artifacts just lose it — per-type policy);
  1 Mora per 10 EXP; ascension caps interleave
  (`progression-economy`).
- **Batch QoL chronology** (the shipped curve): auto-add ≤4★ (1.1) →
  15-item batches + enhance-to-next-tier + optional 5★ fodder (4.3)
  → press-and-hold (4.7). Locked/equipped items are excluded at the
  *model* level; add a confirmation on high-value fodder (max
  rarity, leveled, premium substats).
- **Dissolve loop**: batch destroy up to 100 (level +0, 1–4★ only,
  5★ indestructible); auto-add rules mirror the lock plans
  (auto-mark as the inverse of auto-lock).

## Inventory UI

- **Structure**: category tab bar; virtualized grid left + detail
  panel right; equipped-by icon on tiles; new-item badges.
- **Stable sorting**: the default chain is documented (Quality >
  Level > Set > Location > Affix count) — always end with a
  **deterministic tiebreaker (instance ID)**, never a timestamp
  (bulk collisions). Replicated list order is not guaranteed
  (FFastArraySerializer) — the UI sort is the only order.
- **The filter chronology** (what scale demands, in shipped order):
  2-affix filters (2.5) → state filters locked/max/equipped (3.3) →
  the 4.3 overhaul (multi-set filters, 3-affix sort with secondary
  rules, **auto-lock plans**: per-set main/substat criteria,
  auto-lock at acquisition, retroactive scans) → Lock Assistance +
  Marked status (5.2) → set compare (5.7). Filters and lock plans
  share the same criteria model — build one rule engine for both.
- **Compare**: Genshin lacked it for years (roll counters 5.3,
  Check Alternatives 5.7 — still no final-stat before/after diff).
  Beat the reference: full character-stat diff on hover.
- **Equip flows**: from character screen and from inventory detail;
  equipping a piece worn by another character = swap confirmation +
  atomic reassignment (one `equipCharacter` per instance).
- Icons load async (soft refs + placeholders); grids virtualize
  (UITK has no native GridView — rows-of-cells; UMG TileView pools).

## Equipment: slots, sets, loadouts

- **Slots are definition data**: `EquipType` on the item; the
  character validates on equip. One weapon slot (type-locked per
  character) + 5 position-locked artifact slots.
- **Set counting**: `count(set) = pieces equipped on THIS character`
  — equipped-only, per-character, recomputed on every equipment
  change. Bonuses are **data-driven affixes** (the set's effects
  live in config, not per-set code). The KQM-documented runtime
  nuance: some set buffs persist briefly after unequip, others drop
  instantly — *re-resolve effects* on change, don't just diff the
  count.
- **Loadouts — two models, choose explicitly**:
  - *Pin-by-instance*: a preset = instance ID list; needs a fallback
    policy per slot when pieces are taken/dissolved (skip + warn /
    steal with confirmation / clone-warn).
  - *Clone-by-rule* (the Genshin 5.7 choice): a preset = a saved
    **query** (main affix per piece, set(s) for 4pc or 2+2, up to 3
    substat priorities, unequipped-only option) resolved against the
    inventory at apply time — structurally immune to churn, but
    can't pin exact pieces (the documented player complaint). 2
    plans per character.
- **Stat recomputation**: equip events trigger the
  `progression-economy` aggregation pipeline + UI refresh packets —
  one recompute path, idempotent effects (see pitfalls #6).
- **Equip locks**: mutations refused during combat (the documented
  "Cannot equip during combat" error) and instanced activities —
  context gates on the mutation path, not the UI.

## Flagged gaps — do NOT invent

The current artifact cap (2,100 per the versioned change history;
2,400 reported by one source — verify per version) · exact elixir
costs for sands/goblet (sources diverge; only flower/plume = 1 is
safe) · a 2,000 boss-material stack (general rule is 9,999) ·
over-cap behavior during domain drops · the main-stat pity semantics
(plausible RE reading) · client badge rendering details · grid sizes
per platform/resolution · the 15-fodder batch cap (community-sourced
only) · canonical perfect-artifact odds (criteria-dependent) · the
3★ cumulative EXP divergence (prefer 52,275).

## Sources

Grasscutter source (GameItem, InventoryTab, InventorySystem upgrade
paths, new-item flags) · hope1ess (leaked official server RE —
artifact generation, weight tables, roll tiers) · Genshin Fandom
(Inventory, Artifact + /Stats /Distribution /Change History, Artifact
EXP, Weapon EXP, Refinement, Sanctifying Elixir) · KQM (artifact
guide, TCL set-bonus nuances) · HoYoLAB official announcements (4.0
cap, 4.3 overhaul) · Game8/Siliconera (5.7 loadouts) · Lyra official
docs + x157 (ItemDefinition/Instance/Fragments) · Epic docs
(subobject replication, FFastArraySerializer, CommonUI) · Unity docs
(UITK virtualization, runtime binding, PointerManipulator) ·
Microsoft Learn (PlayFab Economy v2) · Zelda Dungeon/Polygon (korok
pouches) · GameFAQs (counted BotW caps).
