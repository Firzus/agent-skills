# Pitfalls — the 13 classic streaming failure modes

Each: symptom → root cause → prevention. Read before designing; re-read when
debugging a streamed world. The five components are in
[components.md](./components.md), the sub-cell rendering frontier in
[rendering-tech.md](./rendering-tech.md), and procedural/simulation in
[procedural-simulation.md](./procedural-simulation.md).

## 1. Frame hitches on cell load

- **Symptom** — periodic frame spikes as the player crosses cell boundaries.
- **Root cause** — synchronous main-thread work at load completion: bulk
  instantiation and component/physics registration, first-use shader/PSO
  compilation, GC pressure from allocation bursts.
- **Prevention** — time-slice everything (UE: streaming cvars at 1–5 ms,
  pre-packed actors, FastGeo; Unity: `backgroundLoadingPriority`, deferred
  activation + per-frame root activation, pooling). Pre-compile PSOs during
  loading screens. Cap per-cell object counts; profile the worst cell on
  min-spec storage.

## 2. Pop-in / late mips / visible HLOD transition

- **Symptom** — objects appear suddenly; textures sharpen visibly; distant
  proxies "snap" to full geometry.
- **Root cause** — loading range too small for traversal speed; texture
  streaming budget too small (mip thrash); HLOD swap distance inside the
  player's attention range; purely reactive streaming sources.
- **Prevention** — loading range ≥ 2–4× cell size scaled by max speed;
  velocity prediction; texture budget sized to measured demand; cross-fade/
  dither transitions; align HLOD swaps with fog/atmospherics.

## 3. Seams and cracks at cell borders

- **Symptom** — terrain cracks, navmesh gaps, lighting discontinuities at
  cell edges.
- **Root cause** — per-cell independent processing: terrain LOD mismatch
  between neighbors (T-junctions), navmesh baked per cell without border
  tiles, lighting/probes baked per cell.
- **Prevention** — terrain skirts or edge morphing; stitch edge vertices
  exactly; navmesh built with overlapping border tiles; world-level light
  baking or probe blending across borders; one authoritative border-owner
  cell for shared geometry.

## 4. Double-loading / leaks from overlapping requests

- **Symptom** — duplicated meshes, memory climbing during back-and-forth
  movement, objects stuck at the wrong LOD.
- **Root cause** — race between async load and unload of the same cell on
  rapid direction reversal; ref-count mismatches (releasing a different
  handle than acquired).
- **Prevention** — per-cell operation queue/state machine: one in-flight op
  per cell, opposite requests cancel or coalesce; release exactly the handle
  you acquired; assert cell-state invariants in dev builds.

## 5. Unload thrash

- **Symptom** — a cell loads and unloads repeatedly while the player loiters
  near a boundary; sustained IO/CPU churn.
- **Root cause** — load radius == unload radius (no hysteresis); cells too
  small relative to movement jitter.
- **Prevention** — unload radius 1.2–1.5× load radius; grace timer ("don't
  unload anything loaded < N s ago"); LRU cache of recently unloaded cells.

## 6. Gameplay objects despawning visibly / AI freezing at borders

- **Symptom** — NPCs vanish in view; AI stops pathing when its target or
  patrol route crosses into an unloaded cell.
- **Root cause** — gameplay actors bound to render-cell lifetime; AI depends
  on navmesh/targets outside any streaming source's range.
- **Prevention** — separate gameplay residency from render residency: key
  agents always loaded or on a coarser gameplay grid; important NPCs as
  their own streaming sources; despawn only outside view + range; crowds
  degrade to abstract simulation beyond the bubble.

## 7. Physics falling through unloaded collision

- **Symptom** — dynamic objects/vehicles/ragdolls fall through the world
  near streaming edges or right after teleport.
- **Root cause** — body simulated in a region whose collision isn't loaded
  yet (collision streams with render cells; or registration lags visuals).
- **Prevention** — gate simulation on collision residency (sleep bodies in
  non-resident cells); keep a coarse always-loaded collision proxy for the
  whole world; kill-Z + recovery; on spawn/teleport, wait for the
  collision-complete signal before enabling simulation.

## 8. Teleport/fast-travel into unloaded world

- **Symptom** — after teleport the player sees HLODs or void, falls through
  the ground, or hits a multi-second freeze.
- **Root cause** — no load-completion gate: the character moved before
  destination cells streamed; relying on the engine's emergency blocking
  load as the "feature".
- **Prevention** — pre-activate a streaming source at the destination; wait
  for the loaded callback; only then move the player, masked by a
  transition. Same gate for cutscene jumps and respawns.

## 9. Lost object state across unload/reload

- **Symptom** — looted chests reset, moved objects snap back, opened doors
  close when their cell re-streams; saves miss unloaded regions.
- **Root cause** — runtime state lives only on the instance; unload destroys
  it; reload re-instantiates from cooked data.
- **Prevention** — persistent world-state store keyed by stable object IDs,
  decoupled from instance lifetime: serialize deltas on unload, apply deltas
  after re-instantiation; saves read the store, not the scene; define
  explicit persistence categories (always-persist / session / ephemeral).

## 10. Co-op divergence across cells

- **Symptom** — players in different regions see contradictory world state;
  authoritative events behave differently depending on whose cells are
  loaded.
- **Root cause** — simulation tied to client cell residency; server not
  loading the union of all players' regions.
- **Prevention** — server-authoritative: the server streams the union of all
  players' interest regions; never condition authoritative logic on
  client-side residency; abstract/headless simulation for events in cells
  no player has loaded; replicate world-state deltas, not streaming
  timelines.

## 11. Build/cook pipeline failures

- **Symptom** — cells empty in packaged builds but fine in editor; or build
  memory far above editor estimates ("everything resident").
- **Root cause** — (a) cell content not registered in the cook (scenes
  missing from build lists/Addressables groups; HLOD/navmesh not rebuilt in
  CI); (b) **reference leaks**: one hard reference from an always-loaded
  object into cell content pulls entire dependency chains into memory at
  startup.
- **Prevention** — CI runs the offline builders (UE: WP HLOD/nav commandlets;
  Unity: Addressables build in the player build) and fails on warnings;
  audit dependency graphs (UE Reference Viewer/Size Map; Unity Addressables
  Analyze); enforce soft references from persistent code into world content;
  CI memory test: persistent set only, assert below threshold.

## 12. Sub-cell pool thrash (Nanite / virtual texture "never settles")

- **Symptom** — textures stay blurry forever; geometry pops or shimmers
  even on a *static* view; the streaming pool is pinned at 100% with the
  camera not moving; a Nanite scene that fits in editor thrashes in the
  cooked build.
- **Root cause** — the **sub-cell** streaming pool is oversubscribed: too
  many unique Nanite meshes shrink the streaming pool below the working set
  (cache thrashing where streaming never settles), or the virtual-texture
  physical cache / feedback throughput can't satisfy the visible tiles, so
  high mips never arrive.
- **Prevention** — the sub-cell budgets in
  [rendering-tech.md](./rendering-tech.md): size the **Nanite streaming
  pool** and **VT physical cache** as first-class budgets alongside the
  cell budget; reduce unique-mesh count (merge/instance) so root pages don't
  starve the pool; raise VT feedback resolution / upload throughput;
  **prestream** desired pages/tiles (velocity prediction for the sub-cell
  loop); profile a *static* view to confirm streaming actually settles.

## 13. Procedural non-determinism & save bloat

- **Symptom** — a procedurally generated world differs between players or
  platforms (cross-play desync); revisiting a cell regenerates different
  content; the save file balloons to tens of MB and grows every hour;
  cell-edge biomes/terrain mismatch.
- **Root cause** — generation isn't a pure function of (seed, cell coords):
  floating-point non-determinism across CPUs/compilers, load-order-dependent
  RNG, or state baked into the instance; and the save stores the whole
  generated world instead of only the player's delta.
- **Prevention** — the determinism + delta-persistence rules in
  [procedural-simulation.md](./procedural-simulation.md): generation = a
  **pure function of (seed, cell coords)** via a deterministic seed
  hierarchy (integer/fixed-point math, fixed evaluation order, no fast-math,
  or authoritative server-side gen); **save only the delta from the
  generated baseline** (untouched cells regenerate from seed); garbage-
  collect abandoned changes (revert long-untouched cells to baseline);
  "stream the seed, not the geometry" in multiplayer.

## Debugging order

When a streamed world misbehaves, check in this order: (1) cell state
machine invariants (one op per cell?), (2) hysteresis margins, (3) frame
budget adherence (profile the activation slice), (4) the always-loaded set's
actual size (reference leak?), (5) collision vs visual residency offsets,
(6) sub-cell pool occupancy on a static view (Nanite/VT thrash — #12),
(7) regenerate the same cell twice and diff it, then chart save growth per
hour (#13). Most streaming bugs are one of the 13 above wearing a costume.

## Soak testing (non-negotiable)

Handle leaks (one undisposed reference per cell load) and memory creep only
surface after 30+ minutes of traversal. Automate a fly-through of the entire
world at max speed, recording memory and frame time; fail on thresholds. Run
it in CI if possible, and keep a min-spec device in the weekly test loop —
not waiting until alpha.

## Production checklist

```
- [ ] Zero hitches at max traversal speed on min-spec (measured, not felt)
- [ ] Memory under budget with >=15-20% headroom during a full-world soak run
- [ ] Teleport to any waypoint < target seconds (define it), fully async
- [ ] Die-anywhere -> respawn works through the same streaming pipeline
- [ ] Cell debug overlay + streaming stats HUD exist for the whole team
- [ ] World-state store handles: chest, kill + respawn timer, puzzle, door
- [ ] Soak test automated with memory/hitch thresholds that fail the build
- [ ] Cross-cell logic goes through the state store/events with stable IDs,
      never direct object references between cells
- [ ] Sub-cell pools (Nanite streaming pool / VT cache) sized and verified
      to settle on a static view in the cooked build
- [ ] (Procedural) generation deterministic per (seed, cell); save stores
      only the delta; save growth/hour measured and bounded
```
