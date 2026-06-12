# Cartography — tiling, vector/SDF rendering, map design, precision

The rendering-tech foundation under the map system: how web-map / GIS
practice maps onto a game's baked-ortho pipeline. Most of this is
**transferable math, not literal GIS** — a game world is flat and
Cartesian, so you skip the projection and keep the quadtree. `[DOC]` =
documented spec/paper, `[RE]` = reverse-engineered/community, `[?]` =
synthesized/uncertain.

## Tiling & the zoom pyramid (the transferable part)

The **slippy-map / XYZ scheme** (Google Maps 2005 → OSM, Leaflet,
Mapbox) is the model for any tiled zoom pyramid `[DOC]`:

- Tile address is `z/x/y` (zoom, column, row). X increases west→east;
  Y increases **north→south** in the dominant XYZ/Google convention —
  TMS flips Y, a classic footgun. Pick one and assert it in a test.
- `z=0` is one tile covering the whole map; each zoom subdivides every
  tile into 4 → a **quadtree**. A level has `2^z × 2^z = 4^z` tiles;
  **tile count quadruples per level** (the "4× rule"). Pixel grid width
  = `tileSize · 2^z`.
- For a flat game world, the world→tile mapping is **linear**:
  `tileX = floor((worldX − originX)/worldWidth · 2^z)` (and Z for Y).
  No Mercator. `[?]`

**Why projections mostly don't apply:** Web Mercator (EPSG:3857) is
*conformal* (preserves local shape, good for rotation) but massively
**area-distorting** (Greenland looks ≈ Africa; really 1/14 the size),
clamped at ±85.0511° so the world is square `[DOC]`. A game world is
already flat — you only need Mercator if mimicking real geography or
reusing GIS tooling. The **quadtree/tiling math transfers; the
projection does not**. `[?]`

**Raster vs vector tiles** `[DOC]`:

- **Raster**: pre-rendered images per `z/x/y`. Cheap to display, heavy
  to store, **pixelates on over-zoom**, no interaction. This is what a
  baked-ortho game map ships.
- **Mapbox Vector Tiles (MVT)**: `.pbf` (protobuf), geometry as integer
  grid coords, default `extent = 4096` per tile, features can spill past
  the extent (a render *buffer* for cross-tile labels). Still **one tile
  set per zoom** — over-zooming a `z10` tile to `z15` collapses
  resolution to `4096/2^5 = 128` → blurry. Tool: **Tippecanoe** drops/
  coalesces features per zoom. Relevant if your map has dynamic vector
  overlays (roads, borders, region outlines) rather than a flat bake.

## SDF labels & icons (crisp at any zoom)

The **signed-distance-field** text/icon path is why map labels stay
sharp while you zoom and rotate (origin: Valve, **Chris Green, SIGGRAPH
2007**; refinement: **Gustavson, OpenGL Insights**) `[DOC]`:

- Each glyph is rasterized once into an 8-bit SDF: texel value = distance
  to the nearest glyph edge. Mapbox packs as uint8 and treats 192–255 as
  "inside". Glyphs go in a **glyph atlas**, served by Unicode range on
  demand.
- Fragment shader: `alpha = smoothstep(buff − γ, buff + γ, dist)`, with
  edge gamma `γ` scaling by `1/fontScale × devicePixelRatio`.
  Antialiasing is automatic at *any* scale — one atlas, crisp
  everywhere, rotation-safe.
- **Halos/outlines almost free**: widen `buff` and blur `γ` (Mapbox's
  halo path shifts `buff` by `halo_width/SDF_PX`). The same SDF path
  drives icons and can stroke roads/borders. Use it for the marker icon
  atlas so pins stay crisp on a player-up rotating minimap.

## Label placement & collision ("don't overlap labels")

**Point-Feature Label Placement (PFLP) is NP-hard** (Marks & Shieber
1991; Christensen-Marks-Shieber, *ACM TOG* 14(3) 1995) `[DOC]` — there
is no exact poly-time solution. Ship a heuristic:

- **Greedy / first-come-wins by priority** — fast, local, the common
  shipping choice; good at high label density.
- **Simulated annealing** — best quality given time; cost =
  #overlaps + a position-preference penalty (a label prefers
  upper-right of its point).
- Mapbox runs **collision detection ~every 300 ms**: each label carries
  a collision box; lower-priority labels hide when boxes intersect
  `[DOC]`. For a game map: give each marker a priority + collision box,
  cull low-priority labels on overlap, and re-run only on pan/zoom
  settle — not per frame. This is the clustering problem's sibling.

## Cartographic design (what to show, and the painted look)

- **Visual hierarchy / progressive disclosure**: coastlines, major
  roads, big labels at low zoom; streets, POIs, detail at high zoom.
  MVT layers literally drop features at low `z`. Map this to your
  **zoom-LOD marker tiers** (see [markers-fog.md](./markers-fog.md)).
- **Figure-ground**: make the focus area (land) pop from the surround
  (water) via contrast, desaturated surroundings, a coast halo/vignette.
- **Line simplification — Douglas-Peucker** (Ramer 1972; DP 1973)
  `[DOC]`: recursively keep the vertex of max perpendicular distance to
  the chord; discard points within tolerance `ε` (raise `ε` at lower
  zoom for coarser lines). Naive `O(n²)`; Hershberger-Snoeyink path-hull
  is `O(n log n)`. Use a topology-preserving variant so rings don't
  self-intersect. Visvalingam-Whyatt is often better for organic
  coastlines. `[?]`
- **Relief shading (hillshade)** — ESRI/Horn formula `[DOC]`:
  `Hillshade = 255·[cos(Zenith)·cos(Slope) + sin(Zenith)·sin(Slope)·cos(Azimuth − Aspect)]`,
  conventionally **azimuth 315° (NW), altitude 45°** (the human
  light-from-upper-left bias). A **z-factor** sets vertical
  exaggeration and must scale with map scale or relief flattens. Blend a
  **hypsometric tint** (elevation→color ramp) under the hillshade
  (Multiply, ~60–80%) for the classic terrain look.
- **The bake-relief-into-art trick** (game-relevant): precompute
  hillshade + tint + the painted/parchment treatment **into the static
  map texture** so runtime pays nothing — exactly what the baked-ortho
  pipeline wants. `[?]`
- **Painted/parchment runtime shader** (the Civ-style look): a post
  shader blends the baked color tile, a hand-drawn variant, Perlin
  noise, and a paper background; a `_Cutoff` hard-switches realistic↔
  stylized at fog edges; center→edge tint darkens. `[RE]` (Lexdev Civ
  FoW case study)

## Large-world precision & compression

- **Float32 ≈ 7 significant digits**; precision is a grid that coarsens
  with distance from origin (Minecraft's "Far Lands"). Past ~1000 units
  you keep ~3 decimals → jitter, Z-fighting `[DOC]`.
- **World→map transform at scale**: do `world − origin` (or
  `world − camera`) in **double**, *then* cast to float for the map UV.
  Never compute UVs from raw huge world coords (catastrophic
  cancellation). Keep authoritative positions in 64-bit double and
  derive the map from the same origin-relative space the renderer uses.
  This is the map side of floating-origin / world rebasing. `[?]`
- **Streaming map tiles**: same quadtree — load only tiles intersecting
  the viewport + a border ring, LRU-evict distant ones, keep low-res
  mips resident and stream hi-res by zoom. Virtual/sparse texturing
  (DX12 Tiled Resources / UE5 VT, 128² tiles of a 16K texture) cuts
  VRAM ~40–60%. `[DOC]`
- **Compression** `[DOC]`: **BC7** desktop (8 bpp, GPU-decoded, encode
  10–50× slower than BC1) and **ASTC** mobile (128-bit blocks,
  8.0→0.89 bpp by block size, LDR+HDR). Both are block-based, fixed-
  ratio, lossy, GPU-native (no CPU decode). Layer LZ/ZIP on top for
  on-disk/on-wire, decompress to the GPU format on load.

## Sources

Green, *Improved Alpha-Tested Magnification*, SIGGRAPH 2007 ·
Gustavson, *OpenGL Insights* (SDF) · Mapbox vector-tile-spec 2.1 +
GL-native Text-Rendering wiki + `sdf-glyph-foundry` · OSM
Slippy_map_tilenames · Cesium quadtree cheatsheet · Christensen-Marks-
Shieber, *ACM TOG* 14(3) 1995 (PFLP) · ESRI "How Hillshade works"
(Horn 1981) · Wikipedia Ramer-Douglas-Peucker + UBC TR-92-07
(O(n log n)) · Lexdev Civ FoW case study · Aras-p "Texture Compression
in 2020" · ARM astc-encoder docs · sv-journal virtual texturing ·
frozenfractal / Netherlands3D floating-origin. Flags: Mercator rarely
needed for flat game worlds (tiling transfers, projection doesn't);
Visvalingam-Whyatt likely > DP for coastlines (not separately sourced);
~300 ms Mapbox collision cadence and ~500 KB/tile budgets are from dev
docs and may drift by version.
