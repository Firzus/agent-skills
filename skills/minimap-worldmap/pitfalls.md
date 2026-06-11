# Pitfalls — the 15 classic map failure modes

Each: symptom → root cause → prevention. Read before designing; re-read
when markers drift or fog reverts. Pipeline/rendering detail is in
[pipeline-render.md](./pipeline-render.md), the registry and fog in
[markers-fog.md](./markers-fog.md), GIS/cartography tech in
[cartography.md](./cartography.md), and cross-genre design in
[genres.md](./genres.md).

## 1. Map/world misalignment

- **Symptom** — markers drift from real positions, worse toward map
  edges.
- **Root cause** — hand-calibrated transform (eyeballed offsets); map
  image re-cropped/re-exported without updating the transform; minimap
  and world map holding divergent copies of `worldSize`/`worldCenter`.
- **Prevention** — the bake pipeline writes texture + alignment asset
  atomically; one shared map data asset for every consumer; an editor
  validation that projects known landmarks and asserts pixel error.

## 2. Minimap rotation bugs

- **Symptom** — markers orbit the wrong way; north flips; the map
  "wobbles" around an off-center point.
- **Root cause** — rotating the map without counter-rotating markers (or
  vice versa); yaw sign/axis convention mismatches; rotation pivot not at
  the player UV (rotate around the player point *after* centering).
- **Prevention** — one canonical `WorldToMinimap(worldPos, playerPos,
  yaw, zoom)` used by map and markers; test against a landmark due
  north; keep north-up mode as the reference behavior.

## 3. Live RTT minimap cost on mobile

- **Symptom** — battery drain, thermal throttling, GPU spikes.
- **Root cause** — a second scene render every frame (UE SceneCapture2D
  has a roughly fixed ms cost per tick regardless of RT size).
- **Prevention** — default to baked texture + UV scroll; if live capture
  is mandatory: layer-culled, low-res, 10–15 Hz, capture-on-demand.

## 4. Memory spike on map open

- **Symptom** — hitch or OOM the moment the map screen opens.
- **Root cause** — one giant full-res map texture (× fog overlays ×
  layers) loaded synchronously and entirely.
- **Prevention** — tiled zoom pyramid, async-load only visible tiles at
  the current zoom, compressed (ASTC/BC7), release on close.

## 5. Marker overload

- **Symptom** — UI tanks with hundreds of quest/collectible/enemy
  markers.
- **Root cause** — one widget per marker, no pooling, no viewport
  culling, no clustering; per-frame layout-dirtying moves.
- **Prevention** — pooled widgets moved by translate/SetPosition; cull to
  the visible rect; cluster by zoom (40–80 px radius, count badges);
  category filters; for extreme counts, render markers as mesh/material
  quads instead of widgets.

## 6. Fog desync across save/load and updates

- **Symptom** — revealed areas revert after load; fog breaks when a
  patch changes regions. (Real precedents: Dawn of War DE mid-mission
  saves, GemRB worldmap persistence, FoundryVTT fog overwrites.)
- **Root cause** — fog lives only in a render target never serialized;
  load order overwrites fresh state with stale; regions keyed by array
  index so inserting one shifts all IDs.
- **Prevention** — CPU-side fog state is the single source of truth
  (views repaint from it on load); **stable region GUIDs, never
  indexes**; save immediately on reveal events; version the payload with
  an explicit migration when region sets change.

## 7. Multi-layer confusion

- **Symptom** — markers from other floors shown on the current layer;
  layer auto-switch fights the player's manual selection.
- **Root cause** — markers lack a layer attribute (2D-only registry);
  auto-detection from player Y re-triggers every frame.
- **Prevention** — layer ID mandatory on every marker and fog state;
  filter by selected layer, render off-layer quest targets distinctly
  (dotted line + layer badge — the Genshin pattern); auto-switch only on
  layer *transition events*, suppressed while the user has manually
  pinned a layer.

## 8. Zoom-state bugs

- **Symptom** — markers misplaced during zoom animation; pins land at
  wrong world coords when zoomed; zoom-to-cursor drifts.
- **Root cause** — markers positioned from a cached zoom while the
  animated value differs (two sources of truth); pin placement not
  inverting the *current* pan/zoom; scaling around a fixed pivot without
  translation compensation.
- **Prevention** — one live transform object read by everything; pin
  placement = full inverse chain screen→panel→UV→world; zoom-to-cursor:
  `offset += contentPoint × (oldScale − newScale)`; unit-test the
  world→screen→world round trip at several zooms.

## 9. Pin data loss & cap UX failures

- **Symptom** — player pins vanish after a map/region update; the pin
  cap silently eats pins.
- **Root cause** — pins stored in map-pixel coordinates (invalidated by
  re-bakes) or tied to renamed region IDs; silent cap handling.
- **Prevention** — pins in **world coords + layer ID**; validate on load
  and quarantine orphans instead of deleting; on cap, block with
  explicit feedback + a manage-pins flow (Genshin: 300 cap, batch-delete
  50) — never silent-drop.

## 10. Player outside mapped bounds

- **Symptom** — player arrow pinned to the map edge or at garbage UVs in
  out-of-bounds/DLC areas.
- **Root cause** — unclamped world→UV math; no concept of "unmapped" in
  the data asset.
- **Prevention** — clamp to bounds with an explicit out-of-bounds visual
  state; design the map data asset as a *set* of map spaces so DLC adds
  an entry instead of resizing the base map.

## 11. Stale state during streaming/teleport + dead markers

- **Symptom** — map opened mid-teleport shows the old area; dead enemies
  and completed quests still show markers.
- **Root cause** — map snapshots positions at open time; registry relies
  on objects to unregister themselves and death/complete paths skip it.
- **Prevention** — the map subscribes to position/streaming events;
  registry uses weak handles + a validity sweep; sources pair every
  registration with a guaranteed unregister (destroy hook + explicit
  state-change events).

## 12. Aspect ratio / resolution offsets

- **Symptom** — map stretched at ultrawide; pins offset at non-16:9; the
  circular minimap becomes an ellipse.
- **Root cause** — map scaled by UI stretch-fill while marker math
  assumes native aspect; positions computed against a reference
  resolution.
- **Prevention** — letterbox/contain the map at its intrinsic aspect;
  compute marker positions in normalized UV and convert *after* layout;
  test at 21:9 and 4:3.

## 13. Save-size creep

- **Symptom** — saves balloon to megabytes; slow cloud sync.
- **Root cause** — per-texel fog bitmaps and unbounded breadcrumb trails
  serialized raw, multiplied per layer.
- **Prevention** — prefer region-based fog (bytes per map); grid fog at
  coarse resolution, bit-packed + RLE; breadcrumbs in a capped ring
  buffer with distance-threshold decimation; budget fog save size per
  layer up front.

## 14. Precision breakdown far from origin

- **Symptom** — markers and the player arrow jitter or land slightly off
  in distant corners of a huge world; pins placed far out drift; the map
  shimmers at the edges but is fine near spawn.
- **Root cause** — the world→map UV is computed from raw float32 world
  coordinates. Float32 keeps ~7 significant digits, so past ~1000 units
  precision is a coarse grid (catastrophic cancellation when subtracting
  two large numbers); the further from origin, the worse.
- **Prevention** — do `world − origin` (or `world − camera`) in
  **double**, *then* cast to float for the UV; keep authoritative
  positions in 64-bit double and derive the map from the same
  origin-relative space the renderer uses; for very large worlds use
  per-tile local origins. The precision math is in
  [cartography.md](./cartography.md).

## 15. Minimap that makes the world ornamental

- **Symptom** — playtesters stare at the corner, not the world; the
  beautiful environment goes unnoticed; players "follow an icon, not a
  path"; immersion complaints; nobody learns the landmarks.
- **Root cause** — a high-contrast persistent minimap + a centered GPS
  waypoint line does all the navigating, so the world's environmental
  cues (roads, horizon landmarks, signage) become decorative. The
  designer leaned on the minimap instead of legible space.
- **Prevention** — decide the navigation philosophy deliberately
  ([genres.md](./genres.md)): consider a diegetic compass / guiding-wind
  (GoW, Ghost of Tsushima) or minimal markers (Elden Ring); at minimum
  ship a **HUD toggle** so players can hide the minimap; design legible
  environmental wayfinding (a "weenie" every ≤30 s) so the world, not
  the corner, leads. Don't use the minimap to excuse an unreadable
  world.

## Debugging order

When the map misbehaves: (1) project a known landmark and measure pixel
error (#1), (2) face due north and check the arrow/map agreement (#2),
(3) profile a map open (#4) and an idle minimap frame (#3/#5), (4)
save/load and diff the fog state (#6), (5) place a pin at max zoom and
teleport to it (#8/#9), (6) run the aspect matrix (#12), (7) project a
landmark in the far corner of the world and measure error vs near spawn
(#14).

## Ship checklist

```
- [ ] Landmark projection test passes (pixel-level world<->map agreement)
- [ ] Round-trip world->screen->world unit test at 3+ zoom levels
- [ ] Fog: save/load/patch-migration cycle preserves reveal state
- [ ] Pins survive a map re-bake; cap UX explicit; batch management
- [ ] Multi-layer: no marker bleed, off-layer indicators, sane auto-switch
- [ ] Mid-teleport map open shows fresh state; no dead-entity markers
- [ ] Map open: no hitch, tiles stream, memory within budget
- [ ] 21:9 / 4:3 / Deck matrix passes; minimap stays circular
- [ ] Marker burst (200+) holds frame rate (pool + cluster + cull)
- [ ] Save size: fog + breadcrumbs within budget after a long session
- [ ] Far-corner precision: landmark error in the farthest world corner
      matches near-spawn (double-precision world->map transform)
- [ ] Navigation philosophy is deliberate; HUD/minimap toggle ships
```
