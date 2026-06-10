# Architecture — pipeline, transform, markers, fog, interactions

The components of a production map system. All numbers are **starting
points — verify against your world** (confidence levels flagged; the
"not documented — measure, don't invent" list is at the bottom).

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
contours (crisp at any zoom); **CI re-bake** so the map never lags level
design; the bake writes texture + alignment asset **atomically**.

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
- Precision: float32 UV is fine to tens of km; per-tile local origins
  beyond that.
- **Unit-test the round trip** world→screen→world at several zoom levels;
  validate in-editor by projecting known landmarks and asserting pixel
  error.

## Minimap rendering

- **Default: baked texture + UV scroll.** Player position drives the UV
  offset, zoom drives the sampled rect. Zero per-frame render cost —
  what Genshin (mobile-first) and BotW ship.
- **Live render-to-texture only when the world visibly changes**
  (destruction, construction, RTS). It's a second scene render: low-res,
  layer-culled, 10–15 Hz, never full-rate on mobile.
- **Compass strip (GoW/Skyrim)**: the immersion-first alternative —
  bearing strip covering roughly the camera FOV, markers fade out when
  their world anchor becomes visible on screen. Cheap; pairs with
  "no minimap" designs; space route waypoints widely or the strip
  oscillates.
- **Rotation modes**: north-up (map static, arrow rotates) vs player-up
  (rotate the sampled UV around the player point, counter-rotate icon
  glyphs). Offer both as a setting; one canonical
  `WorldToMinimap(worldPos, playerPos, yaw, zoom)` used by map AND
  markers.
- Circular vs rectangular mask is presentation only; add a radial edge
  fade. Elevation: bake relief shading into the art (free); markers on
  other layers get up/down chevrons.
- Village/interior contextual zoom (BotW tightens scale + shows shop
  icons on entering towns) is a per-volume zoom override.

## The marker registry

```
Marker {
  worldPos, mapSpaceId/layerId        // layer ID is MANDATORY
  category                            // drives icon, filtering, zoom tier
  zoomRange                           // LOD band (appear/disappear)
  priority                            // clutter culling order
  payload                             // teleportTarget, questId, ...
}
```

- **Sources own lifecycle**: static POIs load with region data; dynamic
  entities (enemies/NPCs) register on spawn and are *guaranteed*
  unregistered on death/despawn (event path + validity sweep with weak
  handles); quest markers follow quest state; player pins persist in
  saves; detector pings expire on TTL.
- **Zoom-LOD tiers** (Genshin: statues/domains at full zoom-out;
  waypoints/pins/bosses at ~30%; urban POIs at ~70%): each category
  declares its band. At zoom-out, show region names + exploration %
  instead of icon soup.
- **Clustering**: merge same-category markers closer than 40–80 px
  (Supercluster/Leaflet defaults); show a count badge; expand on zoom.
  KD-tree for static, quadtree for moving markers.
- **Edge clamping** (minimap): ray-vs-bounds from center gives the
  clamped position and the arrow angle; circular maps clamp to the
  inner circle.
- **Pooling + throttling**: pooled view widgets; dynamic markers update
  ≤20 Hz or on-change, only inside the visible rect + margin; the player
  arrow stays per-frame.

## Fog of war

**Region-based reveal (the AAA standard):**

- Authored region polygons/masks; an unlock trigger (statue/tower) flips
  the region's bit and plays a reveal animation (500–800 ms — a designed
  spectacle moment, cf. BotW's "download drip").
- **Three reveal policies on the same architecture** — make it a flag:
  BotW reveals *topography only* (players pin what they scout); Genshin
  reveals art + auto-populates discovered waypoints; AC reveals
  everything including icons.
- Implementation: low-res region-ID mask sampled by the map shader;
  unrevealed = silhouette/grid treatment (BotW shows faint outlines, not
  black — "incompleteness that begs discovery").
- **Persistence rules (the bug magnet)**: fog state is a CPU-side
  bitfield keyed by **stable region GUIDs (never array indexes)**; saved
  immediately on reveal events; views repaint from it on load; version
  the payload with a migration step when regions change.

**Continuous exploration fog (variant):** per-cell visited bitmask
(R8 mask 512²–1024² per map ≈ 10 m/texel on a 10 km world; CPU grid is
the source of truth, GPU mask is a projection), brush-erased at the
player position, softened by noise/smoothstep; RLE-compress in saves
(1024² 1-bit = 128 KB raw). Minimap samples the same mask; the registry
suppresses markers in unrevealed regions.

## Full-screen map interactions

- **Pan/zoom**: bounds-clamped with margin; **zoom-to-cursor** (after
  scaling, translate so the point under the cursor stays fixed:
  `offset += contentPoint * (oldScale - newScale)`); flick inertia
  (velocity ×0.95/frame @60 fps); discrete zoom thresholds drive the
  marker LOD bands. Double-tap = +1 zoom level (mobile convention).
- **Pins**: stored as **world coords + layer ID** — never map pixels
  (survives re-bakes). Genshin's model: icon picker + custom name,
  cap 300 (v5.8) with batch-delete 50 by region/category (v5.6); on cap,
  block with explicit feedback and a manage flow — never silent-drop.
  BotW: typed stamps (100; TotK 300) + one temporary beacon.
- **Fast-travel**: waypoint markers carry a `teleportTarget` payload; the
  map raises the request (1-tap confirm panel, Genshin style); the
  streaming gate does the rest (`open-world-streaming`). The map never
  knows about streaming.
- **Quest tracking**: select → track → the quest system owns tracking
  state; map and HUD tracker are both views of it.
- **Multi-layer UI (Genshin v4.0)**: docked layer selector appearing
  contextually when the centered area has layers; current-layer pins
  highlighted; **dotted-line indicators + layer badges for off-layer
  targets**; teleporters to layered areas carry destination-layer
  sub-icons. Auto-switch the layer on player transition *events* only,
  and never while the user has manually pinned a layer.
- **Region progress**: per-region weighted counters (waypoints/statues
  heaviest, then collectibles, then chests — Genshin's formula is not
  public; expose your weights as design data) surfaced at high zoom.

## Hero's Path / breadcrumbs (optional)

Ring buffer of quantized positions (16-bit per axis vs map bounds +
layer ID), sampled on a timer or distance threshold, **open-world time
only** (menus/cutscenes excluded). TotK: 256 h FIFO ≈ 6–7 MB. Playback =
animated polyline. Doubles as a "where haven't I been" completion tool.

## Performance

- Stream map tiles by zoom level + visible rect; never load the whole
  world's full-res map (the Sleeping Dogs trick: swap HUD textures out
  to fit the map texture in, on pause).
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
(multi-layer v4.0, pin batch v5.6) · Zelda wikis (towers, stamps,
Hero's Path) + taricorp save-format reverse engineering · MDPI minimap
study (screen area) · Mapbox Supercluster / Leaflet.markercluster ·
Gemserk/Lexdev/Keesing fog-of-war implementations · GDC 2025 *DS2 Voxel
3D UI Map* · devcom 2025 *Map Rendering in UE* (Aesir) · NN/g animation
durations · iOS scroll physics (documented deceleration).
