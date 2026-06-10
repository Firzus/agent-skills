# Architecture — components, data flow, budgets

The five components of a streaming system, with shipped-game evidence and
sourced numbers. All numbers are **starting points — profile to confirm**.

## 1. Partitioning

Divide the world into cells; assign every world object to a cell (or to the
always-loaded set) at build time.

**Schemes and when each wins:**

| Scheme | When | Shipped examples |
| --- | --- | --- |
| **Uniform grid** (default) | Homogeneous density, fast traversal, simple math | Horizon Zero Dawn (512 m tiles, 3×3 resident), Spider-Man (128 m, ~800 tiles), Ghost of Tsushima (200 m, ~2 MB/tile) |
| **Nested multi-resolution grid** | Large far-visible structures must outlive detail cells | Elden Ring (256 m props / 512 m / 1024 m large structures) |
| **Hand-authored sectors** | Irregular density, dense cities, designer control over co-loading | Cyberpunk 2077 (interior + exterior sector sets), Sunset Overdrive (hex zones, 10–11 resident) |
| **Per-asset distance rings** | Sparse worlds, extreme draw distances | GTA V (grid + deep per-asset LOD chains) |

**Cell size drivers:** traversal speed (Spider-Man's 128 m chosen for
swing speed: ~1 tile/s at top speed), density (smaller cells = finer memory
control, more overhead), and IO seek behavior (HDD era favored small
sequential tiles).

**Starting points:** 64–128 m dense city · 128–256 m mixed (UE5 default
128 m; Fortnite ships 128 m) · 256–512 m sparse countryside. Sources: Epic
World Building Guide (Fortnite Ch.6: 128 m cells / 256 m range / ~100k
actors; City Sample: 128 m / 128 m + aggressive HLOD), GDC 2017 Horizon
traversal talk, GDC 2019 Spider-Man postmortem.

**Derive, don't copy:** `cell_size ≈ max_traversal_speed ×
load_time_on_min_spec × safety(≈2)`. Example: 12 m/s sprint-glide × 8 s
min-spec load × 2 → ~200 m cells with a 400 m load radius. Copying another
game's cell size without its traversal speed, IO tier, and density is the
"cell size dogma" pitfall.

**What lives in a cell:** placed entities, meshes/materials/textures
(via dependency graph), collision, foliage placements, spawn data, local
audio. What does NOT: player, key NPCs, global managers, quest state — the
always-loaded set (keep it small; every always-loaded object is permanent
memory).

## 2. Streaming sources

A source = position + velocity + radius profile. The union of all sources'
demands decides cell residency.

- **Default source:** the player (or camera if they separate, e.g. photo
  mode, drone).
- **Extra sources:** cinematic cameras before a cut, teleport destinations
  before the warp, projectiles/scripted vehicles if they outrun the player.
- **Velocity prediction:** bias the loaded set toward the movement direction
  (load ahead, unload behind). Spider-Man and GTA V's vehicle streaming are
  the canonical cases; UE5 exposes velocity-weighted cell sorting.
- **Speed gating:** if max speed × load time outruns the lookahead, cap the
  speed (mounts, vehicles) or drop LOD while fast (GTA V flight, BotW's
  load balancer dropping draw distance to 0.7×).

**The worked example** (from the Spider-Man GDC 2019 postmortem): 128 m
tiles, top swing speed consumes ~1 tile/s, worst-case HDD 25 MB/s → tile
budget ~20–33 MB compressed, loaded in 0.8–1.33 s. Run this math for your
own game: it dimensions everything.

## 3. Cell lifecycle manager

The heart of the system. Per cell, a state machine:

```
Unloaded → Loading → Loaded(data) → Activating → Active
   ↑                                                |
   └──────────── Unloading ←────────────────────────┘
```

**Non-negotiable rules:**

- **One in-flight operation per cell.** A new request against a cell with a
  pending opposite operation cancels or coalesces — never overlaps. This
  kills the double-load/leak race (see pitfalls).
- **Hysteresis.** Unload radius 1.2–1.5× load radius, and/or a grace timer
  ("never unload a cell loaded < 2 s ago" — UE's streaming volumes default
  to a 2 s unload hysteresis). Prevents thrash at radius boundaries.
- **Priorities.** Collision/gameplay-critical > near visual > far visual >
  audio luxury. The engine must be able to block (briefly) on
  gameplay-critical data if the player somehow outruns it, and never block
  on visual data.
- **Load is urgent, unload is lazy.** Load as soon as demanded; unload on a
  delay, batched, with destruction amortized (incremental GC).

## 4. Async pipeline

```
demand → IO dispatch → decompress → deserialize → [main thread] activate
         (IO thread)   (workers)    (workers)       (time-sliced)
```

- **No file IO on the main thread, ever.**
- **Activation is the modern bottleneck**, not IO (on SSD targets).
  Instantiation, component registration, physics body creation, and script
  initialization happen on the main thread — time-slice them:

| Budget | Value | Source |
| --- | --- | --- |
| UE async loading slice | 5 ms/frame default; Epic ships Fortnite at ~1 ms | `CoreSettings.cpp`, Epic World Building Guide |
| UE actor registration slice | 5 ms default, 1 ms shipped (Fortnite) | same |
| Unity main-thread integration | `backgroundLoadingPriority`: Low = 2 ms, BelowNormal = 4 ms (default), Normal = 10 ms | Unity docs |
| Incremental GC purge | ~2 ms/frame quantum (UE) | Epic GC primer |
| Total streaming work | **1–5 ms/frame at 60 fps**, time-boxed by ms not object counts | derived |

- **Spread instantiation across frames** (activate N roots per frame until
  budget is hit). ~500 raw actors spawning in one frame = visible hitch.
  Prefer instanced/packed representations (ISM/prefab packing); UE 5.6
  FastGeo streams static geometry without actor registration entirely.
- **Pre-warm shaders/PSOs** during loading screens — first-use compilation
  in the world is a classic hitch.

## 5. Distant representation

Everything beyond loading range still needs pixels:

- **HLOD rings:** full detail inside loading range → merged/simplified proxy
  per cell-group out to ~2 km → impostors/skyline beyond. Shipped configs:
  Fortnite HLOD0 256 m cells/512 m range, HLOD1 512 m cells/2048 m range,
  tree impostors always loaded.
- **Always-resident low-detail world:** Sunset Overdrive keeps proxy meshes
  for the entire city resident (~500 MB, 1/10 of RAM) and cross-fades.
  Proxies don't need to mirror dynamic changes — nobody notices.
- **Virtual texturing** for terrain at scale (Far Cry 4 AVT: 10×10 km at
  ~220 MB resident); UE5 SVT/RVT continue this lineage.
- **Transitions:** cross-fade/dither HLOD↔full swaps and align them with fog
  to hide them.

## Layered streaming

Different systems need different radii. Collision and gameplay data load
further than visual detail (cheap, and prevents physics/AI failure at the
frontier); audio has its own (smaller) radius; AI simulation degrades by
distance (full sim near, light sim far, abstract beyond — Genshin runs
distant AI at 5 fps with animation skipped).

Practical per-class visual distances (community UE5 practice): landmarks
2000 m+, buildings 500–1000 m, medium props 200–500 m, clutter 50–200 m.

## Memory budgets

| Platform | Usable by game | Note |
| --- | --- | --- |
| PS4 / Switch | ~5 GB / ~3.2 GB | The historical floors |
| Series S | ~8 GB | The current-gen constraint platform |
| PS5 / Series X | ~12.5–13.5 GB | |
| Mobile (2–4 GB devices) | ~1.5–2.5 GB before OS kill | Many small bundles to minimize peak |

- Set **hard budgets per category** (textures, meshes, audio, gameplay) and
  enforce per cell at build time; a rough planning sketch on current-gen
  console: ~60% geometry+textures, ~25% gameplay/CPU, ~5% audio, rest pools.
- Keep **≥ 15–20% headroom** below the platform budget so eviction fires
  *before* the cap, and limit concurrent in-flight cell loads (2–4) to avoid
  IO saturation.
- **Eviction:** LRU within category, biased by distance and screen
  contribution; drop top mips first under pressure (Ghost of Tsushima drops
  1–2 mip levels invisibly).
- **Pool streamed entities** (peds, vehicles, props) instead of
  allocate/free churn; watch fragmentation on fixed-memory platforms (use
  fixed-size arenas per category sized to the streaming unit).
- **CI memory test:** load only the persistent set and assert resident
  memory below threshold — catches reference leaks pulling the world in.

## IO throughput context

| Tier | Effective throughput | Design consequence |
| --- | --- | --- |
| HDD (PS4 era) | ~25 MB/s worst-case design floor | Small cells, data duplicated on disk to kill seeks, speed caps |
| SATA SSD | ~0.5–1 GB/s | Comfortable Tier 2-3 |
| PS5 / NVMe + DirectStorage | 5.5 GB/s raw, 8–9+ compressed | ~200× HDD: larger cells OK, sub-asset streaming (mips, animation frames, geometry pages), activation becomes the bottleneck |

Modern trend (2023+): streaming granularity is shrinking below the cell —
virtualized geometry pages (Nanite), animation frame streaming (Spider-Man 2
keeps every 3rd-4th frame resident), GPU-feedback-driven texture tiles. The
cell remains the gameplay/logic granularity.

## Fast travel & teleports

1. Activate a streaming source at the destination.
2. Wait for the gameplay-critical set (collision + spawn data) completion
   callback — **never** a fixed timer.
3. Move the player; mask with fade/animation.
4. Deactivate the origin source; let unload run lazily.

Same gate for cutscene camera jumps and respawns. Ghost of Tsushima's
seconds-fast travel works because tiles are tiny and only deltas load.

## Sources

Epic World Building Guide (Fortnite/City Sample shipped configs) · GDC 2019
*Marvel's Spider-Man Technical Postmortem* (the speed↔bandwidth worked
example) · GDC 2017 *Player Traversal in Horizon Zero Dawn* · GDC 2021 *Zen
of Streaming: Ghost of Tsushima* · GDC 2015 *Streaming in Sunset Overdrive*
· CEDEC 2022 Elden Ring · Cyberpunk 2077 GDC + modding docs · SIGGRAPH 2021
*Nanite: A Deep Dive* · UE `CoreSettings.cpp` · Unity Entities streaming
docs.
