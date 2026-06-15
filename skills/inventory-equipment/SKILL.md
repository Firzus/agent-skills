---
name: inventory-equipment
description: >-
  Architecture blueprint for inventory and equipment systems across gacha,
  ARPG/looter, and online/MMO games: instance-vs-count items, stable IDs, caps,
  gear RNG, affixes, crafting, enhancement, lock invariants, inventory UI,
  loadouts, transmog, trades, and dupe-safe persistence. Use when designing
  inventories, gear generation, crafting, equipment screens, trade flows, or
  when players destroy rare items, sets double-apply, sorts jump, or items dupe.
---

# Inventory & Equipment

Build the inventory/equipment layer of a game — data model, gear generation,
crafting, enhancement, UI, equipment, and (for online games) dupe-safe
networked persistence. The skill spans three traditions and tells you which
patterns are shared and which are mode-specific:

- **Gacha / live-service** (Genshin via the Grasscutter `GameItem` schema +
  leaked-server RNG RE — the best public source on a AAA loot generator).
- **ARPG / looter** (Diablo II/III/IV, Path of Exile 1/2, Last Epoch, Grim
  Dawn, Borderlands — affix systems, the deterministic↔random crafting dial).
- **Online / MMO** (WoW, EVE, Albion, Lost Ark — server-authoritative
  ownership and the duplication-prevention playbook).

## The architecture rule

**One item model, two families: instances carry state, materials carry counts
— and every protection is a model invariant, not a UI rule.** In online games,
add a third: **the server owns item state; the client sends intent, never
state.**

```
definition (static table)  type, rarity, stack limit, equip type, curves
instance (equipment)       stable GUID + level/exp/lock/rolled-affix state
count (materials)          itemId + count, clamped to stackLimit
tabs                       ItemType -> polymorphic tab (lists vs id->stack maps)
the invariant example      isDestroyable() = !locked && !equipped
```

## Reference map

| File | Covers |
| --- | --- |
| [data-model.md](./data-model.md) | Instance/count split, stable GUIDs, polymorphic tabs, caps as policy (warehouse vs scarcity), the BotW counterpoint, definition-vs-instance, persistence integration |
| [gear-generation.md](./gear-generation.md) | The Genshin 4-draw RNG pipeline (weighted pools, roll tiers, affix-ID encoding), ARPG affix systems (prefix/suffix, ilvl-gated tiers, weights, mutual exclusion), the deterministic↔random crafting spectrum (PoE orbs, D4 tempering/masterworking, LE forging potential, runewords, smart-loot), the constrained-guarantee funnel |
| [enhancement.md](./enhancement.md) | The unified enhancement service, per-type tables, 80% recycling, exp-overflow refunds, batch QoL, dissolve/salvage loops, recycle-into-value |
| [inventory-ui.md](./inventory-ui.md) | Layouts (grid/list/Tetris-weight), loot-filter DSLs (PoE/Last Epoch), search syntax (DIM), stable sorts + filters + lock plans, compare tooltips, loadouts/transmog/wardrobe, controller vs mouse, mass-salvage safety |
| [networking.md](./networking.md) | Server-authoritative ownership, the duplication root-cause catalog with real incidents, 2-phase-commit trades + escrow + row locks + idempotency, append-only ledgers / event sourcing, reconciliation, anti-cheat, sharding/account-stash consistency |
| [pitfalls.md](./pitfalls.md) | 16 failure modes (symptom → cause → prevention) with real incidents (D4 trade dupe, D3 integer-overflow gold dupe, D2 SoJ economy), debugging order, ship checklist |

## Build order (4 shippable tiers)

```
Tier 1 — Model and tabs
- [ ] Definition/instance/count split; stable GUIDs (never engine object IDs)
- [ ] Polymorphic tabs with per-tab caps; the new-item flag
- [ ] The lock invariant (isDestroyable = !locked && !equipped)
- [ ] Online: server-authoritative mutation path; client sends intent only
Tier 2 — Generation and enhancement
- [ ] Generation as weighted data tables (gacha 4-draw, or ARPG affix pools
      with ilvl gating); affix-ID encoding (stat+tier per ID)
- [ ] The crafting layer placed on the determinism dial (chosen deliberately)
- [ ] Unified enhancement service: per-type tables, recycling, batch with
      locked-excluded + high-value confirmation
Tier 3 — UI
- [ ] Virtualized grid/list + detail panel; async icons with placeholders
- [ ] Stable sort with instance-ID tiebreakers; filter + lock-plan rule engine
- [ ] Loot filter (drop-time) if acquisition outpaces curation
- [ ] Equip flows + compare panel (full before/after stats); mass-salvage
      gated by favorite/lock
Tier 4 — Equipment depth & online
- [ ] Set counting: equipped-only, per-character; bonuses as data affixes
- [ ] Loadouts: pin-by-instance vs clone-by-rule (choose + document fallback)
- [ ] Trade: 2-phase commit + escrow + row locks + idempotency + hash-chained
      log; soulbound gating on the most valuable items
- [ ] Persistence: ACID over an append-only ledger; reconciliation job
```

## Key numbers (starting points — sourced anchors)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Genshin main-stat pools | sands 1334/1333/1333/500/500 weights; substat weights flat 6 / %·EM·ER 4 / crit 3 | leaked server datamine |
| Genshin roll tiers | 4 equiprobable: 70/80/90/100% of max; upgrade every +4 | datamine |
| PoE rare mod cap | 3 prefix + 3 suffix = 6; T1–T2 need ilvl ~82–86 | poewiki |
| D2 gamble odds | Unique 0.05% / Set 0.10% / Rare 10% / Magic ~89.85%; ilvl clvl−5..+4 | Arreat Summit |
| D3 smart loot | ~85% class-tailored / ~15% random | D3 2.0.1 notes |
| D4 (post-2.5) | 4 base affixes; tempering deterministic pick; masterwork max Quality 20 | Blizzard 2.5.0 |
| Last Epoch | forging potential ~20–40 (rare→exalted); craftable cap T5 | community |
| Enhancement | 5★ +20 = 270,475 EXP; fodder recycling = base + 80% invested | Genshin wiki |
| BotW pouches | weapons 8→19(+1), bows 5→13(+1), shields 4→20 (slot caps AS progression) | wiki |

Full sourced tables (with flagged "do-not-invent" gaps) live in each
reference file.

## Engine mapping (summary)

| Generic block | Unity 6 | UE5 (5.4+) — Lyra is the first-party reference |
| --- | --- | --- |
| Model | SO definitions + serializable instances linked by custom GUID (never `GetInstanceID()`) | `ItemDefinition` (const) + `ItemInstance` (runtime) + `ItemFragments` (composition) |
| Equipment stats | hand-rolled recompute pipeline | equip = infinite GameplayEffect (handle-guaranteed removal); set bonuses via tag-count |
| Replication | Mirror/NGO ownership | registered subobject lists + `FFastArraySerializer` (order NOT guaranteed → stable UI sorts) |
| UI grid | UITK ListView virtualization (no native GridView → rows-of-cells) | UMG ListView/TileView (pooled); CommonUI for controller nav |
| Backend | UGS Cloud Code rolls + Economy writes (deny client Write) | custom/PlayFab v2 (per-instance StackId, IdempotencyId) |

Full detail in [networking.md](./networking.md) and the reference files.

## Related skills

- `progression-economy` — curve tables for item stats, the stat aggregation
  pipeline, idempotent transactions, overflow-to-mail.
- `loot-drop-system` — where instances come from (roll-at-spawn), claim gating.
- `coop-session` — replicated inventories follow its server-hard authority rule
  (persistence is never client-trusted).
- `save-persistence` — instance GUIDs, versioned schemas, migration on load.
- `menu-ui-manager` — inventory screens, focus, batch-select UX.
- `hud-system` — pickup/enhancement toasts.
