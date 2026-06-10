---
name: minimap-worldmap
description: >-
  Architecture blueprint for minimap and full-screen world map systems in
  open-world games: map content pipeline (automated orthographic bake with
  stylization pass, tiled zoom pyramid), the single world-to-map transform
  asset, a shared marker registry serving both surfaces (categories,
  zoom-LOD tiers, clustering, pooling), region-based fog of war with reveal
  policies, multi-layer/underground maps, pan/zoom/pin interactions,
  fast-travel integration, and breadcrumb trails (Hero's Path). References:
  Genshin Impact (richest shipped map: 300 pins, multi-layer v4.0) and
  Zelda BotW/TotK (nightly re-bake pipeline, tower reveal). Use when
  designing or building a minimap, world map, fog of war, map markers/pins,
  fast-travel map, or when map markers drift, fog reverts on load, or the
  map tanks performance.
---

# Minimap & World Map

Build the two map surfaces of an open-world game — the HUD minimap and the
full-screen world map — over one shared data core. References: Genshin
Impact (the richest shipped implementation) and Zelda BotW/TotK (the most
elegant pipeline). Excluded (separate skills): the quest tracker HUD
(`hud-system`), the unlock data model and teleport sequence
(`teleport-map-unlock`), streaming mechanics (`open-world-streaming`).

## The two architecture rules

1. **One world↔map transform, owned by one asset.** The bake pipeline
   writes the map texture AND the alignment data (world origin, size,
   north rotation, tile grid, region masks) atomically. Every consumer —
   minimap, world map, fog painting, pin placement, bake tool — reads this
   single asset. Hand-calibrated offsets and per-view copies of
   `worldSize` are how markers drift.
2. **One marker registry, N dumb views.** Minimap and world map are
   renderers over the same registry. Markers are data: `{world position,
   map-space/layer ID, category, icon, priority, zoom range, payload}`.
   Sources (quest system, spawners, player pins, detectors) own
   registration AND removal; views never own marker lifecycle.

## Map spaces, not one map

Model each map as a **map space**: own texture tiles, own world→UV
transform, own bounds, own fog state, own layer ID. Overworld, each
underground layer, interiors, and detached regions (Genshin's Enkanomiya)
are separate spaces sharing the registry. The active space resolves from
player position via volumes — never just height. TotK runs three parallel
spaces (Surface/Sky/Depths) over one XZ footprint.

## Build order (4 shippable tiers)

```
Tier 1 — A working map
- [ ] Bake pipeline: ortho capture -> texture + alignment asset in ONE step
- [ ] Map data asset (transform, bounds, regions); world->UV->screen math
      with a round-trip unit test (world->screen->world at several zooms)
- [ ] Minimap: baked texture + UV scroll, circular mask, player arrow,
      north-up mode
- [ ] World map screen: pan/zoom (bounds-clamped, zoom-to-cursor), the
      same texture at higher tiers
Tier 2 — Markers & reveal
- [ ] Shared marker registry (categories, layer IDs, pooled view widgets)
- [ ] Zoom-LOD tiers (Genshin model: ~3 tiers) + edge clamping with arrows
- [ ] Region-based fog of war: stable region IDs (GUIDs, never indexes),
      reveal events -> save immediately, animated reveal
- [ ] Fast-travel: waypoint markers carry a teleport payload; map raises
      the request, teleport-map-unlock's sequence executes it
Tier 3 — Scale & depth
- [ ] Tiled zoom pyramid (3-5 levels), stream tiles by visible rect
- [ ] Player pins: world coords + layer ID (never map pixels), cap with
      explicit UX (Genshin: 300 + batch management), custom icons
- [ ] Multi-layer maps: layer selector, off-layer quest indicators
      (dotted line + layer badge), auto-switch on transition events only
- [ ] Marker clustering at low zoom (~40-80 px merge radius)
- [ ] Player-up rotation mode (rotate map UV, counter-rotate icons)
Tier 4 — Polish & extras
- [ ] Exploration % per region (weighted counters), filters/legend/search
- [ ] CI re-bake (the BotW nightly model) so the map never lags the world
- [ ] Continuous exploration fog variant if design needs it (R8 mask,
      512-1024 per map, RLE-compressed in saves)
- [ ] Hero's Path breadcrumbs (ring buffer, distance-based sampling)
- [ ] Compass strip alternative/complement (GoW model)
```

## Numbers (starting points — verify against your world)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Minimap screen area | 1–3% of screen (≈15–20% of height) | academic study, N≈66 games |
| Marker update rate | ≤20 Hz throttle or on-change; player arrow per-frame | implementation consensus |
| Zoom pyramid | 3–5 levels (BotW: 4 fixed) | shipped games |
| Map tile size | 256–512 px, ASTC/BC7 compressed | web-map standard + mobile |
| Marker zoom tiers | ~3 (Genshin: zoom-out / ~30% / ~70%) | Genshin wiki |
| Clustering radius | 40–80 px (Supercluster/Leaflet defaults) | reference libs |
| Pin cap | Genshin: 300 (v5.8) + batch delete 50; BotW stamps: 100, TotK: 300 | wikis, versioned |
| Fog mask | R8, 512²–1024² per map (≈10 m/texel on a 10 km world) | implementation consensus |
| Pan inertia | velocity ×0.95/frame @60 fps (≈325 ms time constant) | iOS documented behavior |
| Map open transition | 250–400 ms max; Genshin/BotW favor near-instant | NN/g + observation |
| Reveal animation | 500–800 ms (a deliberate spectacle moment) | inference, flag for test |
| Hero's Path budget | TotK: 256 h ring buffer ≈ 6–7 MB; distance-based sampling | save-format reverse engineering |

Full sourced tables (with confidence levels and the explicit
"not publicly documented — measure, don't invent" list) in
[architecture.md](./architecture.md).

## Engine mapping

| Generic block | Unity 6 (UITK) | UE5 (UMG/CommonUI) |
| --- | --- | --- |
| Minimap view | Baked texture as element background + UV scroll (`generateVisualContent` quad for precise UVs); circular mask via `overflow:hidden` + `border-radius` (needs stencil) or custom disc mesh | Image + **dynamic material** (UV offset/rotation/zoom params, SDF circular mask in-material) — the standard pattern |
| Live capture (only if world is dynamic) | RT camera, low-res, reduced rate | SceneCapture2D: ~fixed ms cost per tick — avoid; `bCaptureEveryFrame=false`, ShowOnlyComponents if forced |
| World map screen | UITK screen + custom `PointerManipulator` (pointer capture for drag; pinch = manual multi-pointer) | CommonUI Activatable Widget + render transforms on a content panel |
| Markers | Absolute-positioned pooled elements moved by `translate` (never left/top) | Pooled UserWidgets on a canvas, manual SetPosition |
| Fog | CPU grid/bitfield → overlay elements or small CPU-updated texture | Bitmask → material params (region masks); painted `UCanvasRenderTarget2D` for continuous fog — CPU grid stays the source of truth |
| Bake tooling | Editor script: ortho camera → PNG + ScriptableObject alignment asset | Editor Utility Widget / commandlet → texture + DataAsset |
| Map input | Dedicated `Map` action map, enabled on open | CommonUI input config on the activatable |

## Failure modes

The 13 classic map bugs (marker drift from transform desync, rotation
pivot errors, RTT cost on mobile, memory spikes on open, marker overload,
**fog reverting after save/load**, multi-layer marker bleed, zoom-state
math errors, pin loss on map updates, out-of-bounds players, stale dynamic
markers, aspect-ratio offsets, save-size creep) are cataloged in
[pitfalls.md](./pitfalls.md) with symptom → root cause → prevention.

## Related skills

- `hud-system` — the minimap lives in the HUD layer system; quest tracker
  consumes the same marker registry.
- `teleport-map-unlock` — owns the unlock *data model* (region flags,
  waypoint registry, teleport sequence); this skill owns the display.
- `quest-system` — quest markers derive from objective state into the
  shared marker registry.
- `save-persistence` — fog-of-war state and pins persist through the
  world-state store (the fog-reverts-on-load bug class).
- `open-world-streaming` — fast-travel requests raised by the map are
  fulfilled by the streaming gate; map tiles stream like world cells.
- `game-architecture-patterns` — Observer (registry events), Type Object
  (marker categories), Spatial Partition (marker indexing) theory.
