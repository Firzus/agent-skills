# Performance & profiling — bracket first, then discipline

## Profiling workflow

- **DO** profile before optimizing: **Unreal Insights** for traces
  (game/render/GPU threads); `stat unit` → `stat game` / `stat gpu` →
  `ProfileGPU` to bracket which thread gates the frame; always on **target
  hardware**.
- **DON'T** optimize from intuition or editor-only framerate — the frame is
  gated by exactly one of game thread / render thread / GPU, and fixing the
  wrong one yields zero.

## Nanite & Lumen are choices, not defaults

- **DO** enable **Nanite** for dense, static, opaque geometry (environments,
  kitbash, photogrammetry) and validate with Nanite visualization view modes.
- **DON'T** Nanite-ize everything: translucent/masked-heavy materials,
  complex WPO foliage, tiny low-poly props, or skinned meshes without
  profiling (skinned support is experimental in 5.5+). Nanite has fixed
  per-frame overhead and degrades with masked/WPO/aggregate geometry.
- **DO** choose lighting intentionally: **Lumen** for dynamic GI/reflections
  on high-end targets (pair with Nanite + Virtual Shadow Maps); **baked
  lighting** for fixed-budget 60 fps, mobile, or static scenes.
- **DON'T** default to Lumen on every project — it costs several ms/frame;
  baked lighting is still the right AAA answer for static worlds with tight
  GPU budgets.
- **DO** manage **Virtual Shadow Maps**: minimize overlapping movable
  shadow-casting lights, disable shadows on insignificant objects, watch the
  light-complexity view mode.
- **DON'T** spam overlapping dynamic shadow-casting lights ("fake GI bounce
  lights") — VSM page cost scales with light/pixel overlap.

## Geometry & LOD

- **DO** set LODs/fallback meshes on non-Nanite assets and generate **HLOD**
  for World Partition worlds.
- **DO** verify complex collision isn't using the full-detail mesh — Nanite
  meshes with careless collision setups can silently produce full-resolution
  collision hulls.

## Tick discipline

- **DO** disable tick by default (`PrimaryActorTick.bCanEverTick = false`);
  use timers, delegates, and tick intervals; move per-frame logic that must
  exist to C++.
- **DON'T** let every actor and Blueprint tick every frame at full rate —
  thousands of unnecessary Blueprint ticks is the most common game-thread
  killer. Tick isn't banned; *uncontrolled* tick is.

## Spawning & scale

- **DO** object-pool projectiles, impact VFX, decals, and frequently spawned
  actors; use Niagara pooling modes.
- **DON'T** `SpawnActor`/`DestroyActor` per bullet — spawn/destroy churn
  causes hitches in firefights.
- **DO** scale per-entity work with the **Significance Manager** (anim rate,
  tick rate, VFX fidelity by distance/visibility), and consider MassEntity
  for crowds — significance-driven LODing of *logic* is how shipped titles
  keep 100+ characters in budget.
- **DON'T** run full anim/AI/VFX fidelity on every distant or off-screen
  agent.

## Engine-agnostic theory

For when to apply Object Pool, Dirty Flag, Spatial Partition, and Data
Locality (and when not to), see the `game-architecture-patterns` skill's
optimization reference.
