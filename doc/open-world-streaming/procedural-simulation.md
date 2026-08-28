# Procedural & simulation — generating and living the world

The content-creation and living-world layers the core overview omits: how a
world is *generated* (not just loaded), how it *simulates* off-screen, and
how its state *persists* at scale. The key inversion: for a procedural
world the cell's "load" step is **generate**, not read from disk, and the
world is `f(seed)` — free to regenerate, so you save only the **delta**.
`[P]` praised, `[C]` criticized, `[?]` art-directed/uncertain. → marks a
hook back to the core overview.

## Procedural content generation (PCG)

- **Noise-based terrain** — gradient noise (Perlin/Simplex) gives coherent
  fields that tile seamlessly across chunks; **fBm** sums N octaves
  (`lacunarity ≈ 2`, `gain ≈ 0.5`) for multi-scale roughness; **ridged**
  and **derivative fBm** make sharp ridgelines and fake erosion cheaply;
  **domain warping** (feed noise output back as another pass's input
  coordinates) makes organic, non-grid terrain. **2D heightmap** = surface
  only; **3D density field** (`density > 0 = solid`) enables caves and
  overhangs (Minecraft moved to 3D density in 1.18). `[?]` octave/lacunarity
  values are art-directed.
- **Biomes** — the **Whittaker diagram** classifies by **temperature ×
  moisture** (lookup → desert/grassland/taiga/…); **never hard-cut at
  borders** (partition-of-unity weight blending of neighboring presets).
  Biomes must be a pure function of position + seed so they agree across
  chunk boundaries (the cell-edge consistency constraint).
- **River / erosion** — **particle/droplet hydraulic erosion** (droplets
  move downhill carrying sediment ∝ velocity × slope, erode/deposit by
  capacity), **D8 flow accumulation** to carve rivers. The realistic order:
  `fBm + ridged + domain warp → hydraulic erosion → D8 rivers → slope-aware
  placement`. `[C]` full droplet sims are expensive → usually **pre-baked
  offline**, not runtime.
- **Scatter** — **Poisson-disk sampling** (points with a minimum distance r
  → natural non-clumped scatter; Bridson's O(n)) modulated by a **density
  map** (dense forest → sparse desert). → scatter results *are* the per-cell
  foliage placements the core overview loads.
- **Tools/frameworks** — **UE5 PCG** (a graph operating on point clouds +
  attributes, production-ready in 5.7, runtime `Generate` from Blueprint;
  `[C]` early 5.2 runtime nodes froze packaged builds). **Houdini Engine**
  (ship HDAs in-editor; Far Cry 5 regenerated its *entire world nightly* on
  build machines, each tool's mask feeding the next — `[P]` the AAA gold
  standard for procedural-*assisted* worlds). **Wave Function Collapse**
  (a constraint solver — observe lowest-entropy cell → collapse → propagate
  adjacency — for *structured* content; Townscaper, Caves of Qud; `[C]`
  backtracking cost, hard global structure).

## Infinite & chunk-based procedural worlds

- **Minecraft** — a **chunk** (16×16 column, 384 tall since 1.18) *is* the
  core overview's cell, but the load step is **generate**, not read. A single
  **64-bit seed** drives all noise; "Minecraft stores the instructions, not
  the world". Generation stages: heightmap → carving (3D caves) → surface →
  ores → structures. `[?]` not 100% deterministic (load *direction* can vary
  slightly; versions change details).
- **No Man's Sky** — **"everything from a seed"**: a 64-bit per-planet seed
  defines terrain, flora, fauna via deterministic math, no load times
  ("planets are computer-generated"). `[?]` the **superformula** is a
  persistent myth — Murray publicly stated NMS does *not* use it. `[P]` a
  technical marvel from a tiny team; `[C]` launch variety felt *samey* — the
  canonical "procedural breadth, authored depth" complaint.
- **The procedural↔authored tradeoff** — procedural: tiny install/save,
  infinite scale, cheap variety, but risks sameness and weak set-pieces;
  authored: handcrafted memorability but fixed-size and costly. **The
  shipping norm is hybrid**: a procedural base + **authored set-pieces**
  stamped in (Minecraft villages, NMS tuned rules, Far Cry 5's nightly base
  + artist edits). **"Generate then cache"** — generate once on first visit,
  persist the result so it's stable and editable.

## Runtime PCG ↔ streaming integration

- **Generate-on-cell-load vs pre-bake** — pre-bake (Far Cry 5: heavy sim
  baked offline → cell load = a plain async read, the core pipeline,
  predictable cost, larger disk) vs generate-on-load (Minecraft/NMS: the
  cell **procedurally populates during activation** → tiny disk, but
  generation competes for the **same 1–5 ms/frame activation budget**).
- **The determinism requirement** — generation must be a **pure function of
  (seed, cell coords)** so it (a) needn't be saved (regenerate on demand),
  (b) **replicates** (every client generates the same world), (c) yields the
  identical cell on revisit. The "procedural but consistent" problem.
- **Cost budget** — generation is extra CPU/GPU work on top of streaming;
  mitigate by spreading across frames (→ time-slice activation), moving
  noise/erosion to **GPU compute**, and generating coarse LOD first then
  refining (→ mirrors the HLOD ring strategy and the simulation-LOD below).
- **Caching** — once generated, cache to memory then disk (Minecraft region
  files) so you don't pay generation twice; evict like any streamed asset
  (→ reuse the core LRU/eviction). The cache + the player-edit delta = the
  save.

## Large-scale world simulation (the "living world")

- **Simulation-LOD / level-of-simulation** — full sim near the player,
  **statistical/abstract sim far** (the core overview already notes Genshin
  runs distant AI at ~5 fps with animation skipped). Generalize it: physics/
  AI/economy each get a falloff.
- **The "bubble" of active simulation** — a radius where entities fully tick;
  outside it, agents are despawned and represented **statistically**
  (counts, aggregate state), re-instantiated on approach — the *simulation*
  analog of the streaming load radius/hysteresis (same thrash risk at the
  boundary).
- **Offline NPC schedules** — RDR2's 1,000+ NPCs with persistent daily
  routines (commute → job → home → saloon → sleep), reacting to reputation,
  remembering past interactions. `[P]` the living-world benchmark; `[C]`
  goals are *fixed* — deterministic loops, "illusion" not autonomy.
- **Persistent simulation** — Dwarf Fortress runs a **zero-player history
  sim** for centuries (civilizations, wars) before play, then persists the
  world (a retired fortress survives into future games). `[P]` the deepest
  emergent sim (it influenced Minecraft); `[C]` output is often "boring"
  without curation.
- **The Nemesis system** (Shadow of Mordor) — a procedural *social* sim: a
  hierarchy of orc captains that remember player encounters and **resolve
  off-screen "turns"** (missions auto-resolve → promotion/death) even
  unwatched → the power balance shifts organically. `[P]` landmark emergent
  narrative; `[C]` WB patented it.
- **Crowd simulation** — ambient population via **spawn/despawn pools**
  (→ the core overview's "pool streamed entities, avoid alloc/free churn"),
  density by zone + time; GTA V is high-density but **minimal persistence**
  (NPCs reset) — the scale-vs-authenticity axis. **Economy/ecology** runs
  statistical off-screen, agent-based in the bubble.

## Persistence at scale

(Connects to `save-persistence`.)

- **Persist the delta from the generated baseline** — for a procedural/
  streamed world, **never save the whole world**; it's `f(seed)`, free to
  regenerate. **Only store what the player altered** (Minecraft saves
  *modified* chunks; untouched chunks regenerate). The exact generalization
  of the save reference's rule: *save only authoritative state that cannot be
  deterministically reconstructed; recompute the rest.*
- **Per-cell state** — the save reference's world-state store (stable-ID flags
  per region, each carrying its reset policy), keyed by **(seed-derived cell
  ID + object ID)** for procedural worlds.
- **The persistent-object problem** — a dropped item / looted entity in a
  cell that **unloads** must survive: its state moves into the world-state
  store on unload, restored on reload — and must reconcile the authored/
  generated baseline against the saved delta. Serialize component deltas
  keyed by **stable GUIDs**, never live scene objects.
- **Save-size explosion** (the failure mode) — deltas accumulate forever
  (every block change, every moved item). Mitigate by **garbage-collecting
  abandoned changes** (revert cells untouched for N visits to seed baseline
  — the BotW reset-policy model), pruning on every save, and measuring
  growth per play-hour. Anchors: flag-model saves 1–5 MB vs world-delta
  5–30 MB.
- → **Fast travel** over a procedural world: activate a source at the
  destination, regenerate-or-load its cells, **then apply saved deltas**
  before revealing — the same gate as the core overview's "wait for
  gameplay-critical set," with a generate step inserted.

## Determinism, seeds & replication

- **Seed-based determinism** = the reproducible world: it's `f(seed)`, so
  geometry needn't be stored or transmitted.
- **The seed hierarchy** — derive child seeds deterministically
  (`world seed → region seed → cell seed → object seed`, e.g.
  `hash(world_seed, cellX, cellY)`) so any cell/object is reproducible
  **independently and in any order** (critical for out-of-order chunk
  loads). `[?]` exact hash schemes are implementation-specific.
- **Why it matters**: (1) save size (store deltas, regenerate the rest);
  (2) **multiplayer — "stream the seed, not the geometry"** (send a 64-bit
  seed, every client generates the identical world → a massive bandwidth
  win); (3) consistency (revisiting/multiple observers agree).
- **The float-determinism caveat** `[?]` — FP results differ across CPUs/
  compilers/SIMD/order, so a "deterministic" generator can **desync** across
  platforms. Mitigate with integer/fixed-point math, fixed evaluation order,
  no fast-math, or authoritative server-side generation. A real,
  frequently-underestimated risk.
- → Determinism is what lets a procedural world plug into the core overview's
  **async load** (regenerate instead of read), the **world-state store**
  (delta vs baseline), and the **always-loaded set** (the seed + global
  config is the tiny always-resident "world definition").

## Sources

No Man's Sky GDC 2017 *Building Worlds Using Math(s)* (Sean Murray) +
Gamescom dev blog · Minecraft Wiki *World generation* / *Chunk* + Game
Developer *How Minecraft Generates Worlds* · Zenodo *Multi-Stage Procedural
Terrain Pipeline with Hydraulic Erosion* + de Carpentier terrain report ·
Red Blob Games *Whittaker/Voronoi* + Dev.Mag *Poisson Disk Sampling*
(Bridson) · UE5 PCG 5.7 notes + GDC 2018 *Procedural World Generation of
Far Cry 5* (Carrier) · `mxgmn/WaveFunctionCollapse` (Gumin) · GDC 2018
*Helping Players Hate (or Love) Their Nemesis* (Hoge) + RDR2 schedule
analyses + Dwarf Fortress Q&A (Tarn Adams) · this repo's `save-persistence`
overview.md + store-model.md. Flags: octave/erosion numbers are art-directed;
seed-hierarchy hashes are implementation-specific; FP non-determinism is a
real desync risk; the NMS "superformula" is a myth (NMS denies it).
