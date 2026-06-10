---
name: inventory-equipment
description: >-
  Architecture blueprint for inventory and equipment systems in
  open-world games: the instance-vs-count data model (equipment with
  level/exp/lock/rolled-affix state vs stackable materials), category
  tabs with per-tab caps, the datamined gear RNG pipeline (weighted main
  stat pools per slot, weighted substat selection, equiprobable roll
  tiers, upgrade rolls every +4), constrained-guarantee protections
  (strongbox recycling, defined crafting), unified enhancement (one
  service, per-type tables, 80% fodder recycling, lock protection as a
  model invariant), inventory UI (stable sorting, filters, batch
  operations), and equipment (type-locked slots, set counting, hot-swap,
  declarative loadouts). References: Genshin Impact (Grasscutter GameItem
  schema, leaked server RE of artifact generation) and BotW (the
  slot-scarcity counterpoint). Use when designing or building
  inventories, gear generation, item enhancement, equipment screens, or
  when players feed their god roll, sets double-apply, or sorts jump.
---

# Inventory & Equipment

Build the inventory/equipment layer of a live-service game — data
model, gear RNG, unified enhancement, UI, and equipment. References:
Genshin Impact (the Grasscutter `GameItem` schema + the leaked-server
reverse engineering of artifact generation — the best public source on
a AAA loot generator) and BotW (the slot-scarcity counterpoint; weapon
durability out of scope).

## The architecture rule

**One item model, two families: instances carry state, materials carry
counts — and every protection is a model invariant, not a UI rule.**

```
DATA MODEL (the Grasscutter-proven schema)
  definition (static table)   type, rarity, stack limit, equip type,
                              curve references (progression-economy)
  instance (equipment)        stable GUID + level/exp/promoteLevel/
                              refinement/locked/mainPropId/
                              appendPropIdList/equipCharacter
  count (materials)           itemId + count, clamped to stackLimit
  tabs                        ItemType -> polymorphic tab: equip tabs
                              hold instance lists, material tabs hold
                              id->stack maps; per-tab caps as config
  the invariant example       isDestroyable() = !locked && !equipped
                              — fodder protection lives in the MODEL

GEAR RNG (the datamined 4-draw pipeline; server rolls)
  slot -> weighted MAIN STAT pool per slot (leaked weight tables)
       -> initial substat count by source (20%/34% four-liners)
       -> each substat: weighted pick from the remaining pool
          (weights 6 flat / 4 percent-EM-ER / 3 crit)
       -> value: 4 equiprobable ROLL TIERS (70/80/90/100% of max)
  upgrade every +4: new line if <4, else equiprobable line upgrade
  the encoding insight: an artifact IS its (set, slot, mainPropId,
  appendPropIdList) — each affix ID encodes stat AND tier; fully
  reconstructible, compact to save and replicate
  the contrast: weapons are DETERMINISTIC (refinement by duplicate
  counting) — two generation policies, one equipment interface

ENHANCEMENT (one service, per-type tables)
  feed(target, fodder[]) -> exp, mora cost, leftover refund,
  level-ups, roll events at thresholds
  per-type policies: artifact rolls at +4s; weapon ore refunds;
  both: 80% recycling of invested exp on enhanced fodder

EQUIPMENT
  type-locked slots from the DEFINITION; one wearer per instance
  (equip = atomic reassignment with swap confirmation)
  set bonuses = data-driven affixes from equipped-only, per-character
  counting; loadouts as DECLARATIVE QUERIES resolved at apply time
  (the Genshin 5.7 model) vs pinned instance lists — choose
```

## The constrained-guarantee funnel

Anti-frustration never breaks the core RNG — it **shrinks the search
space**, version by version (the shipped chronology): guaranteed 5★
per domain run (AR45) → strongbox recycling (3→1, chosen set, +34%
four-liners) → defined crafting (set + piece + main stat + 2 chosen
substats, 5.0) → guaranteed upgrades on chosen substats (5.5). Design
the funnel's *stages* into the data model from day one even if they
ship later.

## Build order (4 shippable tiers)

```
Tier 1 — Model and tabs
- [ ] Definition/instance/count split; stable GUIDs on instances
      (never engine object IDs); save integration
- [ ] Polymorphic tabs with per-tab caps; the new-item flag
- [ ] The lock invariant (isDestroyable = !locked && !equipped)
- [ ] Cap behavior decided: block-acquire with message + the
      cap-check-before-grant contract (progression-economy overflow)
Tier 2 — Generation and enhancement
- [ ] The 4-draw pipeline as weighted data tables (server-side roll;
      solo: roll-at-spawn from loot-drop-system)
- [ ] Affix-ID encoding (stat+tier per ID; instance = ID list)
- [ ] The unified enhancement service with per-type tables, 80%
      recycling, exp-overflow refunds, batch fodder (cap ~15) with
      locked-excluded and high-value confirmation
- [ ] The deterministic track (refinement by duplicates) alongside
Tier 3 — UI
- [ ] Virtualized grid + detail panel; async icon loading with
      placeholders
- [ ] Stable sort with deterministic tiebreakers (instance ID last);
      per-tab sort keys; filter system (sets, states, affixes)
- [ ] Batch operations: multi-select dissolve (cap ~100), auto-add
      rules mirroring lock plans
- [ ] Equip flows: equipped-by indicator, swap confirmation, the
      compare panel (beat the reference: full before/after stats)
Tier 4 — Equipment depth
- [ ] Set counting service: equipped-only, per-character; bonuses as
      data-driven affixes; re-resolve effects on change (not just
      count)
- [ ] Loadouts: pick pin-by-instance (with skip/steal/clone-warn
      fallbacks) or clone-by-rule (the Genshin choice — robust to
      churn, can't pin exact pieces); document the trade
- [ ] The recycle-into-value loop (strongbox) + defined crafting
- [ ] Equip locks during activities (combat/instance) + stat
      recompute events (progression-economy pipeline)
```

## Numbers (starting points — sourced anchors)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Caps | weapons 2,000; artifacts repeatedly raised 1,000→1,500→1,800→2,100 (5.3; one source reports a further 2,400 — flagged); 2,000 material TYPES; stacks 9,999 general / 99,999 ores-exp | wiki |
| Main stat pools | sands 26.68/26.66/26.66/10/10% (HP%/ATK%/DEF%/ER/EM); goblet 19.25/19.25/19.00 + 8×5% DMG + 2.5% EM; circlet 3×22 + 3×10 + 4% (leaked server weights: 1334/1333/1333/500/500…) | datamine |
| Substat weights | flat 6 / %-EM-ER 4 / crit 3 (pool total 44); four-liner start: 20% domains / 34% boss-strongbox | datamine/KQM |
| Roll tiers | 4 equiprobable: 70/80/90/100% of max (5★ CD max/roll 7.77%, flat HP 298.75); upgrade slot equiprobable | datamine |
| Enhancement | 5★ +20 = 270,475 EXP and Mora (1:1); fodder 420/840/1,260/2,520/3,780; recycling base + 80% invested; exp crit 90/9/1% (×1/×2/×5); batch ~15 | wiki |
| Guarantees | ≥1 5★ per AR45 domain run (mean ~1.07); strongbox 3→1 chosen set; elixir defines set+piece+main+2 subs (piece-dependent cost) | wiki/KQM |
| Perfect odds | community-computed only, criteria-dependent (a specific max-CD piece ≈ 1/20M) — always cite the criterion | community |
| BotW pouches | weapons 8→19(+1), bows 5→13(+1), shields 4→20 via 208/73/160 koroks; materials 999; meals 60 fixed — slot caps AS progression | wiki |

Flagged — never invent: the exact elixir costs for sands/goblet
(sources diverge), the boss-material 2,000 stack, over-cap domain-drop
behavior, grid sizes per platform, the main-stat pity semantics
(plausible RE interpretation). Full tables in
[architecture.md](./architecture.md).

## Engine mapping

| Generic block | Unity 6 | UE5 (5.4+) |
| --- | --- | --- |
| Model | SO definitions + serializable instance classes linked by ID; custom GUIDs (never `GetInstanceID()` — session-unstable); never serialize the SO itself | **Lyra is the first-party reference**: `ItemDefinition` (const, data-only) + `ItemInstance` (runtime) + `ItemFragments` (composition: SetStats, EquippableItem…); InventoryManager on Controller, EquipmentManager on Pawn |
| Equipment stats | Hand-rolled recompute pipeline | Equip = **infinite GameplayEffect** (removal guaranteed by handle); set bonuses via tag-count requirements (componentized GEs 5.3+); never SetNumericAttributeBase directly |
| Replication | Mirror/NGO ownership | Registered subobject lists (5.1+, the Iris-compatible method) + **FFastArraySerializer** for item lists (delta; order NOT guaranteed client/server — hence stable UI sorts); REPNOTIFY_Always trap on subobjects |
| UI grid | UITK ListView virtualization (FixedHeight; **no native GridView** — rows-of-cells pattern); runtime data binding for details; drag-and-drop = custom PointerManipulator (Drag events are Editor-only) | UMG ListView/TileView (pooled entry widgets); CommonUI for controller nav; `UCommonLazyImage` for async icons |
| Icons | Addressables async + placeholder | `TSoftObjectPtr<UTexture2D>` + StreamableManager async |
| Backend | UGS Cloud Code rolls + Economy writes (deny client Write); PlayFab v2: per-instance StackId, DisplayProperties ≤1000 bytes, IdempotencyId | No first-party economy (custom/PlayFab); the authoritative-but-cached mirror pattern for UI |

## Failure modes

The 14 classic inventory bugs (instance identity loss, duplication
races, fodder eating the god roll, the 99.9%-trash flood, sort
instability, stat recompute drift, set-counting edge cases, loadout
fallback holes, cap-hit reward loss, icon loading hitches, hidden
server roundtrips, lying enhancement previews, equip races in
activities, the schema migration trap) are cataloged in
[pitfalls.md](./pitfalls.md) with symptom → root cause → prevention
and real incidents (the Diablo IV 2023 trade dupe).

## Related skills

- `progression-economy` — curve tables for item stats, the stat
  aggregation pipeline, idempotent transactions, overflow-to-mail.
- `loot-drop-system` — where instances come from (roll-at-spawn),
  claim gating.
- `save-persistence` — instance GUIDs, versioned schemas, migration
  on load.
- `menu-ui-manager` — inventory screens, focus, batch-select UX.
- `hud-system` — pickup/enhancement toasts.
