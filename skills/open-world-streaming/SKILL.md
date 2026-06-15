---
name: open-world-streaming
description: >-
  Architecture blueprint for open-world streaming: world partitioning, cells,
  streaming sources, async load/unload, hysteresis, layered streaming, memory and
  frame budgets, HLOD, fast-travel gates, virtualized geometry/textures,
  large-world rendering, procedural generation, and living-world simulation. Use
  when designing open worlds, level streaming, chunk loading, seamless worlds,
  procedural terrain, or diagnosing hitches, pop-in, memory issues, pool thrash,
  or non-determinism.
---

# Open-World Streaming

Build a world larger than memory by loading only what surrounds the player —
the cell-level streaming system, the sub-cell rendering frontier underneath
it, and the procedural-generation/living-world layers around it. This skill
is the engine-agnostic architecture blueprint: components, data flow,
budgets, build order, and failure modes. Engine tooling specifics live in
the engine mapping section and the dedicated engine skills
(`unity6-aaa-best-practices`, `ue5-aaa-best-practices`).

## The core invariant

Everything in a streaming system serves one inequality:

```
lookahead_distance ≥ max_speed × (t_io + t_decompress + t_activate) + margin
```

The player must never reach a cell before it's ready. When the inequality
fails you have exactly six levers, all used by shipped games: cap traversal
speed (Spider-Man PS4), reduce LOD at high speed (GTA V flight), widen
lookahead in the movement direction (velocity prediction), shrink per-cell
payload (Ghost of Tsushima's 2 MB tiles), improve IO (SSD-first pipelines),
or hide the load behind a transition (fast-travel fade).

## System anatomy

A streaming system is five components; build them in this order
(see [components.md](./components.md) for each in detail):

1. **Partitioning** — the world divided into cells (uniform grid by default:
   128 m dense city, 256 m mixed, 512 m sparse) with content assigned per
   cell at build time.
2. **Streaming sources** — points of interest (player, cinematic camera,
   teleport destination) whose position + velocity decide which cells should
   be resident.
3. **Cell lifecycle manager** — a per-cell state machine
   (`Unloaded → Loading → Loaded → Activating → Active → Unloading`) with one
   in-flight operation per cell, priorities, and hysteresis (unload radius >
   load radius).
4. **Async pipeline** — IO dispatch → decompression → deserialization off the
   main thread; activation (instantiation, registration) time-sliced on the
   main thread (1–5 ms/frame).
5. **Distant representation** — HLOD proxies/impostors covering everything
   beyond loading range, so the unloaded world is still visible.

## Reference map

| File | Covers |
| --- | --- |
| [components.md](./components.md) | The five components in detail: partitioning (schemes, cell-size drivers), streaming sources & velocity prediction, the cell lifecycle state machine, the async pipeline & activation budgets, distant representation/HLOD, layered streaming, memory budgets, the IO throughput tiers, fast travel |
| [rendering-tech.md](./rendering-tech.md) | The sub-cell frontier: virtualized geometry (Nanite clusters/geometry pages/streaming pool), virtual texturing (page table + feedback cache), GPU-driven rendering & culling, the DirectStorage/PS5-IO-complex storage tier, world-scale rendering (large-world coordinates, terrain clipmaps, Lumen at scale), HLOD/impostors and dithered transitions |
| [procedural-simulation.md](./procedural-simulation.md) | Procedural generation (noise/biome/erosion terrain, scatter, UE5 PCG, Houdini, WFC), infinite chunk worlds (Minecraft/No Man's Sky), runtime-PCG↔streaming integration, large-scale simulation (simulation-LOD, the bubble, NPC schedules, the Nemesis system), persistence at scale (delta-from-seed), determinism & seeds |
| [pitfalls.md](./pitfalls.md) | 13 failure modes (symptom → cause → prevention) with debugging order, soak testing, and production checklist |

## Build order (4 shippable tiers)

```
Tier 1 — Walking skeleton
- [ ] Uniform grid; cells as separate scenes/levels with content assigned
- [ ] Distance-based load/unload around the player (synchronous is OK here)
- [ ] Debug overlay: cell states, resident count, memory in use
Tier 2 — Production loop
- [ ] Async load + time-sliced activation (no main-thread file IO, ever)
- [ ] Hysteresis (unload radius 1.2-1.5x load radius) + per-cell op queue
- [ ] Priorities: collision/gameplay > near visual > far visual > audio
- [ ] Velocity-based prediction (bias loading toward movement direction)
Tier 3 — Scale & polish
- [ ] HLOD/proxy meshes beyond loading range (+ cross-fade transitions)
- [ ] Layered radii: gameplay/collision loads further than visual detail
- [ ] Memory budgets per category + eviction policy + load-test worst cell
- [ ] Frame budget enforcement: streaming work capped at 1-5 ms/frame
Tier 4 — Advanced
- [ ] Fast travel: pre-activate source at destination, gate on completion
- [ ] Seamless interiors (separate interior cell set or data layers)
- [ ] Vertical/underground layers (per-layer grids if 2D cells break down)
- [ ] Persistent world-state store for object state across unload/reload
```

Each tier is shippable. A small game can stop at Tier 2; stop where your
world size and traversal speed stop demanding more.

## Starting-point numbers

Sourced from shipped games and engine defaults — **starting points, profile
to confirm** (full tables with sources in
[components.md](./components.md)):

| Parameter | Starting point |
| --- | --- |
| Cell size | 128 m (dense) / 256 m (mixed) / 512 m (sparse) |
| Loading range | ≥ 2× cell size on foot; 3–4× for vehicles/flight |
| Hysteresis | unload radius 1.2–1.5× load radius, or ≥ 2 s unload delay |
| Streaming frame budget | 1–5 ms/frame at 60 fps (activation + IO dispatch + GC) |
| Per-cell actor count | keep low (hundreds, instanced); ~500 raw actors = visible hitch |
| Worst-case IO design floor | HDD ~25 MB/s; SATA SSD ~0.5 GB/s; PS5/NVMe 5.5+ GB/s raw |

## Engine mapping

| Generic concept | UE5 (5.4+) | Unity 6 |
| --- | --- | --- |
| Partitioning | **World Partition** runtime grid (one grid; cell size + loading range per grid) | Additive scenes as cells + **Addressables**; custom grid manager (no native equivalent) |
| Streaming sources | `WorldPartitionStreamingSource` (velocity-aware sorting) | Custom (track player + velocity in the cell manager) |
| Async pipeline | Async loading time-slice cvars (`s.AsyncLoadingTimeLimit` 5 ms, tighten to ~1 ms), FastGeo (5.6) for actor-less static geometry | `Addressables.LoadSceneAsync` + `activateOnLoad=false` + time-sliced activation; `Application.backgroundLoadingPriority`, async upload pipeline |
| Layered streaming | Multiple runtime grids (sparingly) + **Data Layers** | Per-layer scenes / addressable label sets (custom) |
| Distant representation | **HLOD** layers (built per cell, CI commandlets) | No production built-in: third-party impostors, manual proxy meshes, always-loaded far scene |
| Vertical/interiors | Data Layers, Level Instances; 2D cells contain full vertical columns | Separate scene sets per layer (custom) |
| Large worlds (>5 km) | Large World Coordinates built in | Floating-origin shift is DIY |
| ECS path | — | Entities **subscenes + scene sections** stream async (closest to a real cell system) |

UE5 gives you Tiers 1–3 out of the box: **configure World Partition, don't
hand-roll it** (multiple grids = the layer split; Data Layers = conditional
content). Unity 6 gives you the loading layer only; the cell manager,
hysteresis, prediction, and HLOD are yours to build — author the world in a
master scene and write an editor tool that splits it into cell scenes early
(hand-maintaining cell scenes doesn't scale), and keep the streaming manager
engine-agnostic C# so it's testable in edit mode. Full mapping detail in
[components.md](./components.md).

## Failure modes

The 13 classic streaming bugs (hitches on load, pop-in, seams at borders,
double-load races, unload thrash, AI freezing at borders, physics falling
through unloaded collision, fast-travel into void, lost object state,
co-op divergence, cook/reference leaks, **sub-cell pool thrash (Nanite/VT)**,
and **procedural non-determinism & save bloat**) are cataloged with
symptom → root
cause → prevention in [pitfalls.md](./pitfalls.md). Read it before designing;
re-read it when debugging.

## Related skills

- `teleport-map-unlock` — fast travel is a streaming jump: it awaits the
  residency gates defined here.
- `scene-flow-manager` — context transitions (boot/title/world) around
  this in-world spatial streaming; fast-travel loading screens.
- `save-persistence` — the persistent world-state store for object state
  across unload/reload (Tier 4); the delta-from-seed persistence for
  procedural worlds ([procedural-simulation.md](./procedural-simulation.md)).
- `world-time-weather` — procedural terrain/biome generation and the
  living-world simulation share the deterministic-seed discipline.
- `character-controller` / `enemy-ai-framework` — the simulation side of
  streaming guards (never simulate over missing collision, AI residency
  at cell borders).
- `game-architecture-patterns` — Spatial Partition, Object Pool, Dirty Flag
  theory behind these systems.
- `unity6-aaa-best-practices` / `ue5-aaa-best-practices` — engine-wide
  practices this skill assumes (Addressables discipline, World Partition
  hygiene, zero-alloc, profiling workflow).
