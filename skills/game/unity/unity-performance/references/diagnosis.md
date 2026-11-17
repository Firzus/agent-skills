# Profiler diagnosis

Read this when a static finding needs a measurement to confirm it, or when the user brings a Profiler capture, a Frame Debugger view, or a device trace to interpret.

Adapted from CyberAgent's unity-perf-review (MIT); see [NOTICE](../NOTICE.md).

Numbers below come from specific devices and counts; treat them as orders of magnitude, not targets.

## Confirm before concluding

- A wait marker is not a diagnosis. `Semaphore.WaitForSignal` and `Gfx.WaitForPresentOnGfxThread` are generic sync points that also cover GPU and VSync waits; open the Timeline view and follow what the main thread waits on.
- Take pass/fail numbers without the Profiler attached; an attached capture runs slightly heavier.
- Spikes (thinned updates, `Simulate`, PSO compiles) hide in the mean and the median. Report p95, p99, and standard deviation.
- Call an A/B change real only when the runs separate completely (worst of one better than best of the other); overlapping runs mean noise.
- Measure on the lowest target device: the costliest shader function and the size of a gain change by device generation. See [Measure on device first](../../unity-core/performance.md#measure-on-device-first) and [Profiling](../../unity-core/architecture.md#profiling).
- Do not take a memory snapshot in the same session as a Profiler capture: the snapshot freezes frames for seconds (a fake spike) and the Profiler buffers show up in the snapshot.

## Animation and skinning

| Symptom | Likely cause | What to do |
|---|---|---|
| Large `MeshSkinning.Update` on main thread, large `MeshSkinning.CalcMatrices` across threads | Bone hierarchy exists as GameObjects; skinning matrices and Transform write-back run every frame | Optimize Game Objects or `AnimatorUtility.OptimizeTransformHierarchy`; `CalcMatrices` can drop to zero. Clip sampling and blending unaffected [AN01]. See [Animation](../../unity-core/performance.md#animation) |
| Skinning CPU high, GPU skinning off | Skinning on CPU | Enable GPU skinning in Player Settings |
| Large main-thread `Evaluate` with manual Playables, most job workers idle | One manual graph per character, evaluated serially | One shared manual graph, one output per character; healthy captures show `Animator.ProcessGraph` spread evenly over workers [AN02] |
| Update thinning (animation LOD) barely lowers frame time | Manual `Animator.Update()` evaluates synchronously and loses job parallelism (about 15 vs 7 µs per character) | Toggle `Animator.enabled` or use one manual graph per phase bucket [AN03] |
| Comb-shaped CPU chart: near-zero frames, then a spike of about 10 ms | Thinned updates without phase offset; every character updates on the same frame | Spread by slot `index % interval`; judge on p95, p99, standard deviation [AN05] |
| CPU grows with animated object count, `SRPBatcher.Flush` dominates | One Renderer per part (fragments), culling and draw setup per part | Merge into one mesh (Flush 76 ms to 0.02 ms, 16 objects, Pixel 8a); VAT also moves the Animator update to the GPU [AN12]. See [Many copies of a fixed animation](../../unity-core/performance.md#many-copies-of-a-fixed-animation) |
| GPU time worse after moving to VAT than with GPU skinning | VAT decodes in every vertex pass (shadow, depth); skinning deforms once and passes reuse it | Keep VAT where few passes draw the mesh; compare against skinning otherwise (4 shadow cascades: 7.4 ms skinning vs 16.0 ms VAT) |
| Pooled character starts mid-state or fires a stale transition | State and parameters (especially Triggers) carried over | `Animator.ResetControllerState(true)` on release; restore layer weights, `speed`, `StateMachineBehaviour` fields yourself [AN09-AN10] |
| Playables replaced Animator for speed, no gain | Simple control costs the same either way (600 characters: 5.00 vs 5.09 ms) | Use Playables for job insertion and graph control, not speed |
| IK moved to an Animation Job costs more total CPU | Fixed cost per `AnimationScriptPlayable` node (about 2.2 ms for 300 characters) | Keep light work in `LateUpdate`; move to jobs when per-character work is heavy |

## Render thread and Render Graph

| Symptom | Likely cause | What to do |
|---|---|---|
| CPU cut, frame time unchanged, `Semaphore.WaitForSignal` or `Gfx.WaitForPresentOnGfxThread` grows | Possibly render thread on the critical path; confirm in Timeline (see above) | Once confirmed, cut rendering work first; CPU savings show only after |
| Render Graph CPU markers grow with pass count | Long chain of unmergeable raster passes | Collapse into one unsafe pass (about 1.8 µs per pass, Editor) [RP03]. See [Choose the pass type](../../unity-rendering/render-graph.md#choose-the-pass-type) |
| Plain full-screen copy (FinalBlitPass) at the end in Frame Debugger or Render Graph Viewer | Intermediate texture without post-processing, custom pass after post-processing, or a capture | `SwitchActiveTexturesToBackbuffer()` in the last pass, then handle Y flip and sRGB [RP05, RP06, RP07]. See [Skip the final blit](../../unity-rendering/render-graph.md#skip-the-final-blit) |
| FPS collapses when many renderers update parameters each frame, worse with GPU Resident Drawer | Each material edit re-uploads the whole material (iPhone 12, 10,000 objects: 11.1 FPS, 8.1 with GRD) | Renderer Shader User Value [RP09-RP10]. See [GPU-driven drawing](../../unity-rendering/SKILL.md#gpu-driven-drawing) |
| Draw count high in occluded scenes | No occlusion culling | GPU occlusion culling through GRD |
| Many cameras in Frame Debugger, some drawing nothing visible | Cameras left enabled [GR09] | Disable unused cameras |

## GPU load and bandwidth

| Symptom | Likely cause | What to do |
|---|---|---|
| 60 FPS at first, frame rate sinks after minutes of play | Bandwidth raises power and heat, then thermal throttling lowers clocks | Cut loads and stores (access flags, merged passes, framebuffer fetch, memoryless). Budget each pass in Render Graph Viewer: 1080p RGBA8 is about 7.9 MB per load or store [RP15-RP23]. See [Declare attachments for tile memory](../../unity-rendering/render-graph.md#declare-attachments-for-tile-memory) |
| No `(RP n:m)` merges in the Editor Frame Debugger | Native render pass merging needs Vulkan or Metal | Switch the Editor to Vulkan or attach to a device build |
| Passes expected to merge do not | Compute or unsafe pass in between, non-adjacent recording, size or MSAA mismatch, `UseTexture` of the previous output, more than 8 attachments, global textures | Read Pass Break Reasoning in Render Graph Viewer first [RP16, RP17, RP19, RP23] |
| Framebuffer fetch saves no bandwidth, or device differs from Editor | Unsupported platform falls back to a texture read silently | Check the input buffer store is DontCare in Render Graph Viewer; measure on device |
| MSAA buffer stored at full sample count, not memoryless | Custom pass reads the MSAA buffer as a texture, or Opaque Texture misconfigured | Restore Resolve store and memoryless MSAA [RP21] |
| Rendering breaks after removing a store | The store feeds a later sample (shadow map) | Remove only stores with no later reader, such as an unused Depth Texture [RP20] |
| Tile optimizations help on some Adreno scenes only | Adreno can switch to direct (non-tiled) rendering by content | Check the rendering mode in a vendor GPU profiler |
| High-poly scene slow on a tiled GPU | Binning writes per-tile primitive lists to memory, in proportion to vertices | Reduce vertex count |
| High fragment time at native resolution | No resolution scaling [GR01] | Lower `renderScale` per tier. See [Device tiers](../../unity-rendering/SKILL.md#device-tiers) |
| Fragment time high, heavy overdraw in overdraw view | Stacked transparent layers [GR04] | Cut transparent layers and their screen coverage |
| Shadow pass dominates GPU | Shadow resolution or distance too high [GR05], many real-time lights [GR06] | Lower per tier; bake what does not move |
| Post-processing passes dominate GPU | Duplicated or heavy effects [GR07], high MSAA [GR08] | Drop duplicates, lower per tier |
| GPU time rises though the expensive branch never runs | Transcendental functions raise register pressure by being present (older devices: about +0.5 ms for one `sin`) | Strip unused paths with variants [SH09]. See [Shaders](../../unity-rendering/SKILL.md#shaders) |
| Approximating `sin` or `tan` gains nothing | Too few calls; register pressure dominates | Apply approximations to hot loops only |

## Shader compilation hitches

Markers that split a first-draw hitch:

- Main thread `Shader.CreateGPUProgram`: GPU program creation.
- Render thread `GpuProgramMetal.GetCachedPipeline` (iOS) or `CreateGraphicsPipelineImpl` (Android): PSO creation, the main cost on Metal and Vulkan (tens of ms each on Vulkan).
- Any PSO creation marker during play means a warmup gap [AS16]. See [Shader warmup](../../unity-rendering/SKILL.md#shader-warmup).

| Symptom | Likely cause | What to do |
|---|---|---|
| `variant not found` in warmup log, no runtime compile | Variant stripped from the build | Check Shader Stripping; retrace after variant-affecting changes |
| `variant not found`, runtime compile still happens | Variant recorded with zero graphics states | Fix the trace scenario so the content actually draws |
| `WarmUp may be inaccurate due to ... mismatch` | Collection traced on another platform, API, or Quality Level | Retrace on the target device [SH04] |
| iOS: `GetCachedPipeline` with no `CreateGPUProgram` and no error | Shader built into several Content Directory catalogs, so several instances | Shared shaders under one Catalog Id, or one collection per catalog [SH05] |
| iOS: PSO compiles in play despite a clean warmup | Shaders drawn inside a subpass (native render pass) do not warm up | Avoid the subpass for them, or pre-render once during loading [SH06] |

## Memory and lifetime

| Symptom | Likely cause | What to do |
|---|---|---|
| Assets stay after a screen or scene change | Missing release, no central load and release entry point | Memory Profiler snapshots before and after, repeat the transition, watch growth; read referrers before calling a leak; confirm on a device player build [LT04-LT07]. See [Addressables](../../unity-core/assets.md#addressables) |
| Async work keeps waiting or holds references after its owner is destroyed | `CancellationTokenSource` not disposed, especially `CreateLinkedTokenSource`, held from a long-lived token | `using` on every source and linked source [LT01-LT03] |
| Larger native library read as higher resident memory | Most of the growth is clean mapped pages the OS can drop | Android `dumpsys meminfo`: compare Private Dirty and Private Clean separately |
| iOS jetsam or allocation failure | Footprint limit or address space limit | See [iOS memory limits](../../unity-core/performance.md#ios-memory-limits) |

## GC

| Symptom | Likely cause | What to do |
|---|---|---|
| Periodic GC spikes, `GC.Alloc` in gameplay frames | Per-frame managed allocations | Zero steady-state allocations. See [Allocations](../../unity-core/architecture.md#allocations) |
| Allocation profile differs between desktop and mobile | Desktop players run CoreCLR (generational GC), Android, iOS, Web run IL2CPP (Boehm GC) | Profile on the backend you ship |
| Need per-frame GC numbers in an automated capture | Raw capture GC field reads zero | Read `GC Allocated In Frame` through `ProfilerRecorder` each frame |

## Loading and spikes

| Symptom | Likely cause | What to do |
|---|---|---|
| One huge spike when a particle effect starts mid-way | `ParticleSystem.Simulate` fast-forward; with Noise, 20 s ran `NoiseJob` about 2,000 times, about 50 ms | Wrap the call in `Profiler.BeginSample`; check Noise and the duration [US11]. See [Particles](../../unity-core/performance.md#particles) |
| One long frame during shader warmup | `WarmUp` runs every state in one frame | `WarmUpProgressively` across loading frames |
| Physics runs several times per frame | Fixed timestep too small [PH03] | Raise the timestep to what gameplay needs |
| Physics time high with many triggers | Trigger colliders overused [PH07] | Fewer triggers, or queries |
| Physics time spent with no physics in the scene | Auto simulation left on | Turn auto simulation off where unused |

## Player builds and native code

| Symptom | Likely cause | What to do |
|---|---|---|
| Feature broken only in the player after raising the Managed Stripping Level | UnityLinker removed code unreachable from roots | Dump types and methods with Mono.Cecil, diff two levels; preserve with `link.xml`, `[Preserve]`, Require attributes [BD12]. See [Managed code stripping](../../unity-core/performance.md#managed-code-stripping) |
| `Type.GetType` returns null in the player only | Type reached only through a non-constant name string | Preserve it; better, a Source Generator registry [BD12] |
| `MissingMethodException: Default constructor not found` (DI resolve) | Type kept, constructor used only by reflection removed | Preserve the constructor or use source-generated injection [BD13, BD16] |
| `The referenced script (X) on this Behaviour is missing!` from content loaded at runtime, any level | Types used only by that content are not roots | Load through Content Directory groups; for content loaded another way, `link.xml` or `IUnityLinkerProcessor` [BD14] |
| `[Preserve]` added, reflection call still fails | On a type it keeps the default constructor; on a method, that method only | Mark both type and method; `[RequireImplementors]` or `[RequireDerived]` for patterns [BD16] |
| Android Link Time Optimization setting has no effect | Falls back to None unless IL2CPP, Strip Engine Code off, non-Development | Grep `LinkTimeOptimization` in `Library/Bee/Player*-inputdata.json` [BD11] |
| CPU A/B of a few percent lost in noise | Session clock frequency drifts about 5% | Android: compare cycles from `/proc/<pid>/task/*/time_in_state`; reinstall each session |
| Interface or virtual calls dominate a hot path | IL2CPP dispatches them at runtime; LTO cannot devirtualize | `sealed`, concrete types, generic static dispatch |

## iOS triage without a Development Build

| Symptom | Likely cause | What to do |
|---|---|---|
| Problem appears only after long play or on a tester's device | Attached profiling only sees sessions you can reproduce | Performance Trace in Lookback mode; the tester shares the `.atrc` for Instruments or `metalperftrace` |
| Trace shows when the frame rate dropped, not what the game was doing | Metal metrics carry no game state | Report screen and quality through `StateReporter`; aggregate with `metalperftrace overview --aggregate` |
| Need rough GPU and memory numbers on a release-like build | Unity Profiler needs a Development Build | Metal Performance HUD and its `metal-HUD:` log lines |
| Cannot attach to a distribution-signed build | `get-task-allow` is false | Instruments Activity Monitor template (no attach) |
