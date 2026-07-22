# Inventory UI — layouts, filters, sorting, compare, loadouts

The presentation layer. Cross-game patterns from ARPGs, looter-shooters,
survival, and MMOs. All numbers are **starting points / conventions**.

## Layouts & capacity models

Three paradigms (most games hybridize):

- **Slot-based** — simplest; fixed slots, one stack each. Genshin, most JRPGs.
- **Grid / spatial-footprint (Tetris)** — items occupy a W×H cell footprint;
  the top-left occupied cell is the primary reference for drag/drop/rotation.
  **Rotation** swaps W↔H (Tarkov rotates; Diablo II does not — decide early, it
  ~doubles placement-validation complexity). Diablo II canonical grid: main 10×4,
  Horadric Cube 3×4, belt 4–16 by type. Keep multiplayer grids ≤ ~8×10 for perf.
- **Weight / encumbrance** — single scalar vs capacity; check `current_weight +
  item_weight·qty ≤ max` before add. A **wide weight spread (0.1–50)** makes
  every pickup a decision; a narrow one (all 1–5) makes players ignore weight.

**Stack management**: stack-first add — fill existing non-full stacks up to
`max_stack`, then spill into empty slots; emit change events for the UI.

## Loot filters (drop-time filtering)

When acquisition outpaces curation, filter at the *drop*, not just in the bag.
Two documented DSL designs:

- **Path of Exile** — text DSL: ordered `Show`/`Hide`/`Minimal` blocks,
  **top-to-bottom, first-match-wins then stop**; all conditions in a block AND
  together; `Continue` keeps matching. Conditions: `Rarity`, `Class`,
  `ItemLevel`, `Sockets`, `LinkedSockets`, `AreaLevel`… Actions set font size,
  colors, **map icons, beams, drop sounds**. A trailing empty `Hide` hides
  everything not shown. The NeverSink/FilterBlade ecosystem layers a web GUI over
  tagged rules.
- **Last Epoch** — in-game GUI (no text file), Shift+F, up to **75 rules**, each
  Show/Hide/Recolor + conditions (Rarity, Type, Affix + tier, Level, Class).
  Same top-down first-match. Level-dependency auto-disables rules past thresholds.

**Lesson**: keep a high-priority "always show Uniques/Mythics" rule above any
Hide-All — itemization patches repeatedly break filters that hide too eagerly.

## Search, sort, filter (post-pickup)

- **Stable sorting**: the default chain (Quality > Level > Set > Location > Affix
  count) must end with a **deterministic tiebreaker = instance ID**, never a
  timestamp (bulk grants collide). Replicated list order is not guaranteed
  (`FFastArraySerializer`) — the UI sort is the only order the player sees
  (pitfalls #5).
- **Search syntax (DIM, Destiny)**: a boolean DSL — `and`/`or`/`not`, implicit-AND
  adjacency, `-`/`not:` negation, parens, ranges (`stat:range:>=50`,
  `power:<1900`), predicates (`is:handcannon`, `is:dupelower`, `tag:junk`,
  `is:inloadout`). Bulk ops run on a search result (tag/lock/compare).
- **Filter + lock-plan rule engine**: the Genshin chronology (2-affix filters →
  state filters → multi-set filters + 3-affix sort + **auto-lock plans** with
  per-set criteria, lock-at-acquisition, retroactive scans → Lock Assistance).
  Filters and lock plans **share the same criteria model** — build one rule
  engine for both.
- **Tagging**: DIM's 5 fixed tags (Favorite/Keep/Junk/Infuse/Archive) drive Smart
  Moves and optional auto-lock. Free-form notes with `#hashtags` act as
  pseudo-tags.

## Comparison & tooltips

- **Equipped-vs-hover compare** is universal: hovering a candidate shows deltas
  vs the currently equipped item of that slot. Color-coded: green up-arrow =
  increase, red down = decrease (Diablo, Borderlands since 2009).
- **D4 explicit compare**: hover + Shift/Triangle/Y shows side-by-side tooltips;
  an Advanced setting shows full gained/lost properties and skill changes vs
  primary-stat-only.
- **The caveat designers must note**: arrow deltas reflect raw stat diffs only —
  they **don't model build synergy** (conditional bonuses, legendary aspects), a
  known source of player misvaluation. Genshin still lacks a final-stat
  before/after diff after years — **beat the reference**: full character-stat diff
  on hover.

## Loadouts, transmog, wardrobe

- **Two loadout models, choose explicitly**:
  - *Pin-by-instance*: a preset = instance ID list; needs a per-slot fallback
    when a piece is taken/dissolved (skip+warn / steal-with-confirm / clone-warn).
  - *Clone-by-rule* (Genshin 5.7, Destiny DIM Optimizer): a preset = a saved
    **query** (main affix per piece, set(s), substat priorities) resolved at apply
    time — churn-immune, but can't pin exact pieces (a documented complaint).
- **Destiny 2**: 10 in-game loadout slots/character storing weapons, armor, mods,
  subclass, cosmetics; can pull from the Vault but doesn't return items to it.
- **FFXIV**: Gear Sets (job-swap) + Glamour (transmog) are separate; Glamour
  Plates (~20) link to a Gear Set to auto-apply a look on job swap.
- **WoW (Midnight)**: slot-based appearances (new gear inherits the slot's look),
  up to 50 Outfit slots, Situations auto-swap by trigger (location/movement/spec).

## Controller vs mouse & bulk safety

- **Mouse/KB**: grab stack = LMB; pick single = RMB; split half = Shift+click;
  shift-click = quick-move between containers; Ctrl+click = multiselect.
- **Controller**: grid nav via d-pad (grid-step) + stick; context menu on A with
  the most-used action as default top entry; radial/quick-wheels map stick angle
  to wedge for eyes-free selection.
- **Mass-salvage safety** is the critical destructive-op guard: lock/favorite
  blocks salvage AND sell at the model level; scope bulk ops to the active tab;
  ideally a confirm prompt on destroying high rarity. D4's S4 "Salvage All now
  destroys unfavorited Legendaries" is the cautionary tale.

## Performance

Virtualized grids (only visible widgets exist) + soft-referenced icons + async
loading + placeholders. UITK has no native GridView (rows-of-cells pattern); UMG
TileView pools entry widgets. Sorts/filters/tabs are 100% client-side on a cached
mirror — only mutations hit the server (pitfalls #10, #11).

## Engine mapping

| Generic block | Unity 6 | UE5 (5.4+) |
| --- | --- | --- |
| Grid | UITK ListView (FixedHeight; rows-of-cells; drag = custom PointerManipulator) | UMG ListView/TileView (pooled); CommonUI controller nav |
| Icons | Addressables async + placeholder | `TSoftObjectPtr<UTexture2D>` + StreamableManager, or `UCommonLazyImage` |
| Compare | data-bound diff panel | bound widget reading both instances |

## Sources

pathofexile.com/item-filter + poewiki (filter DSL) · lastepochtools / LE forums
(in-game filter, 75 rules) · DIM Wiki (search syntax, tags, Loadout Optimizer) ·
Polygon/dotesports/GamesRadar (Destiny 2 loadouts) · FFXIV Wiki (Glamour Plates,
Armoire) · WoW.com / Icy Veins (Midnight transmog) · GamerGuides / Arreat Summit
(D2 grid) · gamepressure / vhpg (D4 compare tooltips) · Dexerto / dotesports (D4
favorite-protect, Salvage-All) · SlashSkill / GamesByHyper (layout paradigms) ·
Foofarawr (input conventions).
