---
name: minimap-worldmap
description: >-
  Architecture blueprint for minimap and full-screen world map systems:
  content baking, tiled zoom pyramids, world-to-map transforms, shared marker
  registries, clustering, label collision, fog of war, multi-layer maps,
  pan/zoom/pins, fast travel, breadcrumbs, tile rendering, and cross-genre UX.
  Use when designing minimaps, world maps, markers, fog reveal, diegetic
  compasses, or when markers drift, fog reverts, precision breaks, or maps hurt
  performance.
---

# Minimap & World Map

Build the two map surfaces of a game — the HUD minimap and the full-screen
world map — over one shared data core, with the cartography rendering tech
underneath and the cross-genre UX choices around it. References: Genshin
Impact (the richest shipped open-world map), Zelda BotW/TotK (the most
elegant pipeline), Mapbox (tiling/SDF tech), and the genre canon (StarCraft,
LoL, CoD, Far Cry 2, Ghost of Tsushima, Elden Ring, Subnautica). Excluded
(separate skills): the quest tracker HUD (`hud-system`), the unlock data
model and teleport sequence (`teleport-map-unlock`), streaming mechanics
(`open-world-streaming`).

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

## Reference map

| File | Covers |
| --- | --- |
| [pipeline-render.md](./pipeline-render.md) | Map content pipeline (ortho bake, BotW nightly model, hybrid), the world↔map transform + map spaces, minimap rendering (baked UV-scroll vs live RTT, compass strip, rotation, masking), full-screen pan/zoom/fast-travel, performance |
| [markers-fog.md](./markers-fog.md) | The shared marker registry (categories, zoom-LOD tiers, clustering, label collision, edge clamping, pooling), region-based + continuous fog of war, player pins, multi-layer UI, Hero's Path breadcrumbs |
| [cartography.md](./cartography.md) | The rendering-tech foundation: slippy-map quadtree tiling, raster vs vector tiles (MVT), SDF labels/icons, label-placement collision (PFLP), hillshade/hypsometric relief, the painted-map shader, large-world double-precision, BC7/ASTC compression |
| [genres.md](./genres.md) | Minimap UX across genres (RTS command surface, MOBA macro game + ping wheels, FPS UAV/radar info-warfare, tac-shooter drones), the anti-minimap/diegetic movement, survival/no-map designs, the cross-genre UX toolbox |
| [pitfalls.md](./pitfalls.md) | 15 failure modes (symptom → cause → prevention) with debugging order and ship checklist |

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
[pipeline-render.md](./pipeline-render.md).

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

The 15 classic map bugs (marker drift from transform desync, rotation
pivot errors, RTT cost on mobile, memory spikes on open, marker overload,
**fog reverting after save/load**, multi-layer marker bleed, zoom-state
math errors, pin loss on map updates, out-of-bounds players, stale dynamic
markers, aspect-ratio offsets, save-size creep, **precision breakdown far
from origin**, and **a minimap that makes the world ornamental**) are
cataloged in [pitfalls.md](./pitfalls.md) with symptom → root cause →
prevention.
