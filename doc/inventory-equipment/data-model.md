# Data model — instance vs count, GUIDs, tabs, caps

The founding decisions. Primary source: the Grasscutter `GameItem`/`InventoryTab`
schema (the reference open implementation), with the BotW slot-scarcity
counterpoint. All numbers are **starting points**.

## Instance vs count — the founding decision

Grasscutter's `GameItem` is the reference schema: one class, two families.

- **Stackables** carry `itemId + count` (clamped to the definition's
  `stackLimit` at construction).
- **Equipment** carries `level, exp, totalExp, promoteLevel, locked,
  refinement, affixes` (weapon) or `mainPropId, appendPropIdList` (artifact),
  plus `equipCharacter` (at most one wearer).
- Each item is a database document with an indexed owner and a per-player
  transient GUID for the client protocol.

### Definition vs instance

The static **definition** (type, rarity, stack limit, equip type, curve
references) lives in tables; the **instance** stores only mutable state — stat
values recompute from the `progression-economy` curve tables, never persisted.

- **Stable GUIDs** are the only valid key for equips and loadouts across saves.
  Engine object IDs (`GetInstanceID()` in Unity, pointers, list indices) are
  session-unstable — never reference them. In online games the server generates
  the GUID; a pseudorandom unique id is also the basis for dupe-scanning (see
  [networking.md](./networking.md)).
- **Never serialize the SO/definition itself** — only the instance state + a
  definition id.

### Tabs are polymorphic

`ItemType → InventoryTab`: equip tabs hold instance lists, material tabs hold
`itemId → stack` maps, each with a configurable cap. The new-item badge is a
server-side flag set when the tab lacks the id.

### Invariants live in the model

`isDestroyable() = !locked && !equipped` — fodder/destruction protection is
structural, not a UI checkbox. This is the single most important pattern in the
corpus: every protection (lock, equip, soulbound, favorite) is a model
invariant the mutation path enforces, not a button the UI hides.

## Caps as policy — two philosophies

### Warehouse model (Genshin)

Weapons 2,000; artifacts raised four times (1,000 → 1,500 (2.2) → 1,800 (4.0)
→ 2,100 (5.3); one source reports 2,400 — flagged); 2,000 unique material
*types* (the cap counts slots, not quantities); stacks 9,999 general, 99,999
for ores/EXP materials. Acquisition blocks at cap with a message — pair with
the cap-check-before-grant and overflow-to-mail contracts
(`progression-economy`). Here the friction is **curation** (sorting/dissolving),
not scarcity.

### Scarcity model (BotW) — the cap *is* the progression

Per-category pouches with hard slot caps (weapons 8→19+1, bows 5→13+1, shields
4→20) expanded by korok seeds at escalating costs (208/73/160 — 441 total) —
**the cap itself is the gameplay mechanic**. Materials stack 999 with no
practical type cap; meals are 60 fixed slots.

### ARPG stash-at-scale (PoE) — specialized containers

When item volume explodes, the answer is **specialized tabs that exceed normal
stack limits**: a Currency tab holds thousands per type; a Fragment tab 5,000
per item; a Map tab 72 of each (PoE2 Waystone tab: 576 per tier). **Affinities**
auto-route Ctrl-click by item type; a highlight search bar filters; league-end
items move to a "Remove-Only" stash. Items are exposed as structured JSON via a
public stash API — the basis for trade indexers. See [inventory-ui.md](./inventory-ui.md)
for the UI side.

**Choose deliberately**: scarcity (the cap is gameplay) vs warehouse (huge caps,
friction is curation) vs specialized-stash (volume is the design problem).

## Persistence integration

- The instance is **fully reconstructible** from its definition id + state; stat
  values are recomputed, never stored.
- Affix-ID encoding (see [gear-generation.md](./gear-generation.md)) makes an
  instance a compact ID list — cheap to save, replicate, and audit.
- Schema version every instance; chain pure migrations on load (the
  `save-persistence` contract).
- Online: the authoritative store is server-side; the client keeps a cached
  mirror for UI (see [networking.md](./networking.md) and pitfalls #11).

## Engine mapping

| Generic block | Unity 6 | UE5 (5.4+) |
| --- | --- | --- |
| Model | SO definitions + serializable instance classes linked by ID; custom GUIDs (never `GetInstanceID()`); never serialize the SO | **Lyra**: `ItemDefinition` (const, data-only) + `ItemInstance` (runtime) + `ItemFragments` (composition: SetStats, EquippableItem…); InventoryManager on Controller, EquipmentManager on Pawn |
| Tabs | typed collections keyed by enum; per-tab cap config | fragment-driven; inventory list as `FFastArraySerializer` |
| Stable id | `System.Guid` stored on the instance | server-assigned id; replicated subobject identity |

## Flagged gaps — do NOT invent

The current artifact cap (2,100 per the versioned change history; 2,400 reported
by one source — verify per version) · grid sizes per platform/resolution · the
boss-material stack semantics. Full flagged list in
[gear-generation.md](./gear-generation.md).

## Sources

Grasscutter source (`GameItem`, `InventoryTab`, new-item flags) · Genshin Fandom
(Inventory, Artifact change history) · Zelda Dungeon/Polygon/GameFAQs (korok
pouches, counted BotW caps) · poewiki (Stash, Premium Stash Tab, Affinities
announce) · Lyra official docs + x157 (ItemDefinition/Instance/Fragments).
