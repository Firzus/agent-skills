# Engine — TOD lighting, sky, precipitation, performance

The rendering integration for working programmers. Unity 6 (URP/HDRP) and UE5
(5.4+). Version-specific items flagged `[VER]`; uncertain ones `[?]`.

## Dynamic GI under a moving sun

The central TOD lighting problem: a static baked GI can't follow the sun.

- **UE5 Lumen (fully dynamic, no bake)**: amortizes lighting across frames via
  caches. **Local** changes propagate fast; **global** changes (sun movement,
  disabling the sun) take **multiple seconds** to fully propagate — the central
  TOD gotcha. Tune via the PPV `Lumen Scene / Final Gather Lighting Update Speed`
  (engine clamps the effective scale to ~16); CVars
  `r.LumenScene.Radiosity.Temporal 0` (faster, noisier),
  `r.Lumen.ScreenProbeGather.Temporal.MaxFramesAccumulated` (default 10). The
  Directional Light + Sky Light must be **Movable**. **Practical pattern**: fade
  sun intensity/color over seconds rather than snapping, so the propagation
  latency is hidden.
- **Unity HDRP APV Lighting Scenarios (baked + blend)**: bake separate Day/Night
  Lighting Scenario assets into one Baking Set; blend at runtime via
  `ProbeReferenceVolume.instance.BlendLightingScenario(other, factor)` (you must
  animate the factor yourself). **Critical bake caveat**: set Probe Positions =
  "Don't Recalculate" so all scenarios share an identical probe layout. **THE
  caveat**: Lighting Scenarios manage **baked probe data ONLY** — sky, fog,
  directional light, and reflection probes must be **manually scripted** to match
  the transition (Unity's own Oasis sample hand-syncs them).
- **URP**: no Lighting Scenario blending of HDRP caliber — bake static + script
  ambient, or buy a third-party sky.
- **The tradeoff**: Lumen (realtime, true dynamic sun, but propagation latency +
  per-frame cost + noise) vs APV Scenarios (cheap at runtime, but discrete baked
  keyframes + manual non-probe sync).

## Sky & atmosphere

- **UE5**: Sky Atmosphere (physically-based Rayleigh/Mie) + **Sky Light → Real
  Time Capture** (dynamic environment lighting; distributes the cubemap capture
  over **9 frames** by default; Sky Light must be Movable; **Volumetric Fog is NOT
  supported** in RTC); Volumetric Clouds (material-driven); Exponential Height Fog.
  Sun positioning via the **Sun Position Calculator** plugin (ephemeris).
- **Unity HDRP**: Physically Based Sky (ambient probe auto-updates) + Volumetric
  Clouds (Volume override; Temporal Accumulation Factor) + Local Volumetric Fog.
  No first-party ephemeris.
- **URP**: **no built-in sky/atmosphere, no volumetric clouds, no volumetric fog**
  — use OSS ports or assets (Enviro, Azure[Sky]).

## The global param bus (the blend mechanism)

- **Unity Volume framework**: global Volumes with animated **weights** are the
  weather/TOD blend primitive (crossfade post-process, fog, clouds, sky). One
  controller script animates the Volume weight **and** the APV scenario factor
  **and** sky/sun together.
- **UE5 Material Parameter Collections (MPC)**: an asset holding scalar+vector
  params readable by any material; write global `Wetness/Snow/WindDir/Fog` from a
  single persistent manager **once per frame** (far cheaper than touching many
  MIDs). A material references **at most 2** MPCs. The "one writer per frame"
  pattern keeps weather coherent. (Niagara reads MPC via a Niagara Parameter
  Collection, but only syncs during play and only if written in a Tick.)

## TOD asset ecosystems (build vs buy)

| Asset | Engine | Notes |
| --- | --- | --- |
| **Ultra Dynamic Sky** | UE4.10–5.7 | the de-facto standard; one Time-of-Day var drives everything |
| **Day Sequence** | UE5.4+ `[VER]` | first-party plugin; Sequencer-style keyframing + editor preview; native UDS alternative |
| **Enviro 3 / Azure[Sky] / Tenkoku** | Unity | sky+weather+TOD; capabilities vary per version `[?]` |

Buy for fast, art-directable, battle-tested sky+weather; build/Day-Sequence when
you need tight engine integration or a deterministic networked clock.

## Precipitation rendering

- **Particles**: Niagara (UE5) / VFX Graph (Unity) — GPU particles emitted in a
  box around the camera, fast downward velocity + wind, short lifetime. Unity VFX
  Graph **bounds gotcha**: set "Always recompute bounds" or fixed large bounds, else
  the box culls when the camera leaves origin. Collision/splashes via depth-buffer
  collision (cheap) or SDF (precise).
- **Rain occlusion ("don't rain indoors") — the Lagarde technique**: a
  `SceneCapture2D` high above the player faces down (Orthographic), captures scene
  height into an **R32F render target**; the rain material samples it at the
  particle XY and **kills opacity if particle height < captured surface height** →
  no rain under roofs. Reuse the same map for splash placement and wet/dry masking.
- **Wetness / snow accumulation via Runtime Virtual Textures (UE5)**: accumulate
  masks read by many materials cheaply, driven by the global MPC wetness param.
  **THE Nanite caveat**: Nanite meshes **cannot write to RVT** — render a separate
  non-Nanite fallback mesh to the RVT.
- **Wetness BRDF**: darken albedo, raise smoothness/specular, perturb normals;
  lerp by a wetness scalar; puddles via heightmap; let puddles **linger after
  surfaces dry** (`puddleWetness = max(wetness, 1−weatherPct)^0.25`).

## Performance

- **The storm-at-dusk perf cliff**: the worst frame stacks volumetric clouds +
  volumetric/height fog + heavy precipitation + dynamic GI propagation (Lumen / APV
  blend), with the sun also moving (GI reconverging). Budget for this combined
  peak, not the average (pitfalls #12).
- **Temporal upsampling/accumulation is the main lever** (Lumen temporal, HDRP
  cloud Temporal Accumulation Factor, Sky Light RTC 9-frame slice) — at the price
  of latency/ghosting during fast change. Tune accumulation lower during
  transitions, higher when stable. LOD particles by distance.
- **Per-room/per-region PPVs** with tuned Lumen presets rather than one global
  volume; place PPV boundaries at thresholds (doorways/cave mouths).
- **Multiplayer**: server-authoritative clock is non-negotiable; clients derive
  rendering from replicated time + weather enum and interpolate — never replicate
  per-frame visuals. Late-joiners must receive current TOD/weather state.

## Always-loaded managers (streaming lifetime)

- Keep the clock/weather manager **always loaded**: UE5 World Partition
  AlwaysLoaded/Initially Loaded Data Layer (or a non-spatial actor); Unity a
  persistent bootstrap scene.
- **THE leak/dangling-ref trap**: an always-loaded manager holding a **hard
  reference** to a World-Partition-streamed actor either pins it permanently loaded
  (memory waste) or opens unload/reload ordering bugs. Fix: managers don't hold
  direct refs to streamed actors — use soft pointers + a registry subsystem (streamed
  actors register on `BeginPlay`; the manager stores state externally and never
  depends on a live pointer).

## Unity ↔ UE5 mapping

| Concern | Unity 6 | UE5 (5.4+) |
| --- | --- | --- |
| GI under moving sun | APV Lighting Scenarios + `BlendLightingScenario` | Lumen (tune update speed ≤16) |
| Sky/atmosphere | HDRP PBS; URP none (3rd-party) | Sky Atmosphere + Sky Light RTC (9-frame slice) |
| Volumetric clouds | HDRP Volumetric Clouds; URP none | Volumetric Clouds (material) |
| Param bus | Volume framework (animated weights) | Material Parameter Collection |
| Precipitation | VFX Graph (box, depth collision) | Niagara (box, Scene Depth) |
| Rain occlusion | top-down ortho R32F → height compare | `SceneCapture2D` ortho R32F (Lagarde) |
| Wetness/snow accum | decals / masks | Runtime Virtual Textures (Nanite can't write) |
| Sun ephemeris | OSS USunPosition | Sun Position Calculator plugin |
| Always-loaded mgr | bootstrap persistent scene | AlwaysLoaded Data Layer (soft refs only) |

## Flagged gaps — do NOT invent

Lumen ms costs and Azure[Sky]/Tenkoku capability claims are blog/synthesis-sourced
(verify per version) · `r.SkyLight…SkyCloudCubeFacePerFrame` default, Day Sequence
availability, and `wp.Runtime.EnableServerStreaming` are version-bound (5.4–5.7).

## Sources

HDRP docs (Lighting Scenarios, APV, Volumetric Clouds, Local Volumetric Fog) ·
Core RP Library (`BlendLightingScenario`) · Unity 6 GI blog · UE docs (Sky Lights /
Real Time Capture, Volumetric Clouds, Sun Position Calculator, Material Parameter
Collections) · Sébastien Lagarde "Water drop 2a" (rain occlusion) · UE forums
(Lumen update speed, Nanite RVT fallback, World Partition streamed-actor refs) ·
Fab/ultradynamicsky.com (Ultra Dynamic Sky) · Day Sequence docs (5.4+).
