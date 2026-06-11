# Pipeline & rendering — bake, transform, map spaces, minimap

The content pipeline and the two rendering surfaces. All numbers are
**starting points — verify against your world** (confidence flagged;
the "not documented — measure, don't invent" list is at the bottom).
Cartography/GIS tech detail (tiling math, SDF labels, compression,
precision) lives in [cartography.md](./cartography.md).

## Map content pipeline

Three shipped approaches:

- **Baked orthographic capture** — top-down ortho camera renders world
  geometry into tiles. Cheapest to keep in sync; reads as "debug view"
  without an art pass (Sleeping Dogs baked one world texture, then a
  build tool chopped it into per-chunk tiles).
- **Generated + stylized (the BotW model — the one to copy)** — the map
  is regenerated **nightly from world geometry** by an automated capture
  tool, with stylization in the *processing step*, never per-tile art.
  BotW: 120 dynamically-loadable sections × 4 zoom levels (≈2,344
  screens) — impossible to author manually (CEDEC 2017). Genshin's
  painted map is the same idea: artist-stylized over an accurate ortho
  base, per-region tiles added per version.
- **Hybrid bake → artist pass** — the de facto AAA middle.

**Rules:** tiled zoom pyramid (each level = 4× tiles of the previous,
3–5 levels; 256–512 px tiles, ASTC/BC7); SDF/vector for roads/borders/
contours (crisp at any zoom — see [cartography.md](./cartography.md));
**CI re-bake** so the map never lags level design; the bake writes
texture + alignment asset **atomically**.

**The ortho bake, concretely:** a top-down orthographic camera over
world geometry → render to texture → persist as the static base. Use a
**custom unlit shader** for the bake (avoids URP/Lit pulling a long
shader-variant build and lets you inject flat lighting). Bake the
relief shading + painted/parchment look **into** the texture so runtime
pays nothing (the bake-relief-into-art trick — see cartography). `[RE]`

## The transform (and map spaces)

```
mapUV = (worldXZ - origin) * scale        // affine; store as a 2x3 matrix
screen = view(mapUV, pan, zoom)           // per-view
```

- Three spaces: world → map UV → screen. The world→UV part lives in the
  **map data asset**, written by the bake (derived, not calibrated:
  `scale = textureSize / orthoWidth`).
- **Map space = {texture tiles, transform, bounds, fog state, layer ID}.**
  One per overworld/underground layer/interior/detached region. Active
  space resolved from player position via volumes, not height.
- Precision: float32 UV is fine to tens of km; do `world − origin` in
  **double** then cast to float past that (see precision in
  [cartography.md](./cartography.md)); per-tile local origins beyond.
- **Unit-test the round trip** world→screen→world at several zoom
  levels; validate in-editor by projecting known landmarks and asserting
  pixel error.

## Minimap rendering

- **Default: baked texture + UV scroll.** Player position drives the UV
  offset, zoom drives the sampled rect. Concretely:
  `uv = (worldXZ − WorldCenter)/WorldSize + 0.5`, then
  `uvRect.offset = playerUV − 0.5·zoom`, `uvRect.size = zoom`. Zero
  per-frame render cost — what Genshin (mobile-first) and BotW ship.
  Keep `WorldSize/WorldCenter` in one shared asset (divergent copies are
  pitfall #1). `[RE]`
- **Live render-to-texture only when the world visibly changes**
  (destruction, construction, RTS). It's a second scene render: low-res,
  layer-culled, 10–15 Hz, never full-rate on mobile. Rule of thumb:
  live camera for dynamic/destructible scenes, baked UV-scroll for big
  static worlds.
- **Compass strip (GoW/Skyrim)**: the immersion-first alternative —
  bearing strip covering roughly the camera FOV, markers fade out when
  their world anchor becomes visible on screen. Cheap; pairs with
  "no minimap" designs; space route waypoints widely or the strip
  oscillates. (See the [genres.md](./genres.md) anti-minimap section.)
- **Rotation modes**: north-up (map static, arrow rotates) vs player-up
  (rotate the sampled UV around the player point, counter-rotate icon
  glyphs): `uv' = R(θ)·(uv − 0.5) + 0.5`. Offer both as a setting; one
  canonical `WorldToMinimap(worldPos, playerPos, yaw, zoom)` used by map
  AND markers. Aspect fix for a non-square RawImage: `scale=(1/aspect,1)`,
  `offset=(0.5·(1−1/aspect),0)`.
- **Masking** is presentation only: a UI Mask sprite, or in-shader
  `mask = 1 − smoothstep(r−e, r+e, dot(d,d)·4)` for a cheap antialiased
  disc; SDF generalizes to any shape. Add a radial edge fade.
- **Elevation**: a 2D map can't show height directly → bake relief
  shading / hypsometric tint into the art (free); markers on other
  layers get up/down chevrons, faded by ΔY sign. `[?]`
- Village/interior contextual zoom (BotW tightens scale + shows shop
  icons on entering towns) is a per-volume zoom override.

## Full-screen map interactions

- **Pan/zoom**: bounds-clamped with margin; **zoom-to-cursor** (after
  scaling, translate so the point under the cursor stays fixed:
  `offset += contentPoint * (oldScale - newScale)`); flick inertia
  (velocity ×0.95/frame @60 fps); discrete zoom thresholds drive the
  marker LOD bands. Double-tap = +1 zoom level (mobile convention).
- **Fast-travel**: waypoint markers carry a `teleportTarget` payload; the
  map raises the request (1-tap confirm panel, Genshin style); the
  streaming gate does the rest (`open-world-streaming`). The map never
  knows about streaming.
- **Quest tracking**: select → track → the quest system owns tracking
  state; map and HUD tracker are both views of it.
- **Region progress**: per-region weighted counters (waypoints/statues
  heaviest, then collectibles, then chests — Genshin's formula is not
  public; expose your weights as design data) surfaced at high zoom.

## Performance

- Stream map tiles by zoom level + visible rect; never load the whole
  world's full-res map (the Sleeping Dogs trick: swap HUD textures out
  to fit the map texture in, on pause). Quadtree streaming + LRU evict +
  mip-tail resident — detail in [cartography.md](./cartography.md).
- Full-screen map = separate screen: pause or throttle the world while
  open (frees budget, masks tile streaming). If co-op can't pause, treat
  it as an overlay over a reduced-LOD world.
- Static POIs never tick; pooled widgets; cull to viewport.
- Mobile: no live RTT; ASTC tiles; map UI within a ~10–30 MB texture
  budget.

## Not publicly documented — measure, don't invent

Genshin: exact minimap screen size and world radius, Treasure Compass
range (~170 m is unverified community), official exploration % formula,
icon px sizes, map texture memory budget. Zelda: Hero's Path sample
granularity, reveal mask resolution, reveal animation durations.
Generic: a quantified "max markers before clutter" (treat via zoom tiers
+ clustering). For these, ship a range + a measurement method (1080p
captures, frame counting) — never a fabricated number.

## Sources

Nintendo CEDEC 2017 map/UI talks (translation gist) · Stamen's
cartographic review of BotW · Sleeping Dogs minimap fundamentals
(Estey) · Genshin wiki Map/Change History + HoYoverse dev discussions
(multi-layer v4.0) · Malbers Minimap UI / Unity "cheap minimap" shaders
(UV scroll, mask, rotation, aspect fix) · GDC 2025 *DS2 Voxel 3D UI Map*
· devcom 2025 *Map Rendering in UE* (Aesir) · NN/g animation durations ·
iOS scroll physics (documented deceleration). GIS/cartography sources in
[cartography.md](./cartography.md).
