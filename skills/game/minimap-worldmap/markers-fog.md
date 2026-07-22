# Markers & fog — the registry, reveal, pins, breadcrumbs

The shared data core both surfaces render. The registry and fog state
are the source of truth; minimap and world map are dumb views. All
numbers are **starting points — verify against your world**. Rendering
and transform detail is in [pipeline-render.md](./pipeline-render.md).

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
  saves; detector pings expire on TTL. Views never own marker lifecycle.
- **Zoom-LOD tiers** (Genshin: statues/domains at full zoom-out;
  waypoints/pins/bosses at ~30%; urban POIs at ~70%): each category
  declares its band. At zoom-out, show region names + exploration %
  instead of icon soup. This is the cartographic visual-hierarchy rule
  (see [cartography.md](./cartography.md)) applied to markers.
- **Clustering**: merge same-category markers closer than 40–80 px
  (Supercluster/Leaflet defaults); show a count badge; expand on zoom.
  KD-tree for static, quadtree for moving markers.
- **Collision / priority** (the label-placement problem): each marker
  carries a priority + collision box; on overlap, hide the lower
  priority; re-run on pan/zoom *settle*, not per frame (PFLP is NP-hard
  — [cartography.md](./cartography.md)).
- **Edge clamping** (minimap): ray-vs-bounds from center gives the
  clamped position and the arrow angle; circular maps clamp to the
  inner circle.
- **Pooling + throttling**: pooled view widgets moved by translate/
  SetPosition (never layout-dirtying left/top); cull to the visible rect
  + margin; dynamic markers update ≤20 Hz or on-change; the player arrow
  stays per-frame. For extreme counts render markers as mesh/material
  quads (SDF icon atlas) instead of widgets.

## Fog of war

**Region-based reveal (the AAA standard):**

- Authored region polygons/masks; an unlock trigger (statue/tower) flips
  the region's bit and plays a reveal animation (500–800 ms — a designed
  spectacle moment, cf. BotW's "download drip").
- **Three reveal policies on the same architecture** — make it a flag:
  BotW reveals *topography only* (players pin what they scout); Genshin
  reveals art + auto-populates discovered waypoints; AC reveals
  everything including icons. (The genre spectrum from full-reveal to
  no-map-at-all is in [genres.md](./genres.md).)
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
suppresses markers in unrevealed regions. Implementation patterns: a
fog camera rendering vision stencils to an RT, or a compute-shader mask
with radius + mesh removers; a **smooth-reveal** trick keeps prev/curr
textures and lerps over time to hide the low-res mask. `[RE]`

## Pins (player-authored markers)

- Stored as **world coords + layer ID** — never map pixels (survives
  re-bakes). Genshin's model: icon picker + custom name, cap 300 (v5.8)
  with batch-delete 50 by region/category (v5.6); on cap, block with
  explicit feedback and a manage flow — never silent-drop. BotW: typed
  stamps (100; TotK 300) + one temporary beacon.
- Player-authored annotation is a consistently praised cross-genre
  pattern (Elden Ring's 100 wax-stamp markers, Valheim pin groups,
  Subnautica named beacons — see [genres.md](./genres.md)).

## Multi-layer UI

- Docked layer selector (Genshin v4.0) appearing contextually when the
  centered area has layers; current-layer pins highlighted; **dotted-line
  indicators + layer badges for off-layer targets**; teleporters to
  layered areas carry destination-layer sub-icons.
- Auto-switch the layer on player transition *events* only, and never
  while the user has manually pinned a layer. Layer ID is mandatory on
  every marker and every fog state (multi-layer bleed is pitfall #7).

## Hero's Path / breadcrumbs (optional)

Ring buffer of quantized positions (16-bit per axis vs map bounds +
layer ID), sampled on a timer or distance threshold, **open-world time
only** (menus/cutscenes excluded). TotK: 256 h FIFO ≈ 6–7 MB. Playback =
animated polyline. Doubles as a "where haven't I been" completion tool.

## Sources

Genshin wiki Map/Change History + HoYoverse dev discussions (multi-layer
v4.0, pin batch v5.6) · Zelda wikis (towers, stamps, Hero's Path) +
taricorp save-format reverse engineering · Mapbox Supercluster /
Leaflet.markercluster · Gemserk/Lexdev/Keesing fog-of-war
implementations · Unity "Cheap Fog of War" / StratKit (fog camera,
compute mask, smooth reveal). Cross-genre pin/marker design in
[genres.md](./genres.md); label-collision theory in
[cartography.md](./cartography.md).
