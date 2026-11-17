---
name: unity-rendering
description: >-
  Use when choosing or configuring a Unity render pipeline (URP, HDRP,
  Built-In), writing custom render passes with Render Graph, setting up
  lighting, light baking, Adaptive Probe Volumes, Surface Cache GI, the GPU
  Resident Drawer, occlusion culling, shaders, shader warmup, or per-device
  quality tiers, or investigating GPU rendering performance.
---

# Rendering: pipeline, lighting, GPU-driven drawing

Load the [`unity-core`](../unity-core/SKILL.md) skill with this one: its default
stack and review pass apply here.

URP is Unity's render pipeline, on every target from mobile to high-end PC.
Unity's rendering work lands there: Surface Cache GI, Screen Space
Reflections, GTAO, and URP's lighting additions.

Set the pipeline at project start. Pipelines are not interchangeable
mid-project: materials, shaders, lighting setup, and custom passes are all
pipeline-specific, so a switch is a re-authoring pass across the project's
entire visual content.

## Render Graph

Write custom passes as **Render Graph** passes; it is URP's only custom-pass
path. Reset pooled pass data through `IRenderGraphPassData.Reset`, and read
texture orientation with `GetTextureUVOrigin` rather than assuming it. Read
pass merging on player builds with the on-device **Render Graph Viewer**,
which jumps from a pass to its source.

Before writing or reviewing a pass, read [render-graph.md](./render-graph.md):
attachment declarations that keep mobile GPUs in tile memory, when an unsafe
pass is justified, and how a final custom pass skips URP's extra blit.

## Lighting

Pick the lighting model from how much the scene moves.

| Scene | Reach for |
| --- | --- |
| Static geometry and lights | Baked lightmaps + **Adaptive Probe Volumes** |
| Moving lights, destructible or procedural geometry, day/night | **Surface Cache GI** |
| Specular, under either | Reflection Probes, or **SSR** |
| Ambient occlusion | **GTAO** |

### Adaptive Probe Volumes

APV places probes automatically from scene geometry and supplies baked indirect
lighting to dynamic objects, characters, and static meshes that skip lightmaps.
It is the default probe system for large URP scenes, and it stays supported for
baked workflows alongside SCGI.

- Enable it on the URP Asset: Lighting → Light Probe Lighting → Light Probe System → **Adaptive Probe Volumes**.
- Add `GameObject → Light → Adaptive Probe Volume`, Global to cover the scene or Local for one area.
- Set static environment renderers to **Contribute Global Illumination**, and receivers to **Receive Global Illumination → Light Probes**.
- Set contributing lights to Mixed or Baked; realtime lights still supply direct lighting and shadows.
- Bake through Window → Rendering → Lighting → Adaptive Probe Volumes, as a Single Scene or a Baking Set. Script Baking Sets through the scene-GUID overloads.
- Tighten probe spacing around detailed geometry, interiors, doorways, and stairs, using local volumes with Override Probe Spacing where density matters.
- Fix light leaks with a Probe Adjustment Volume, Virtual Offset, or Dilation, and keep probes out of walls and off thin geometry.
- Raise the URP Asset's APV memory budget when cells fail to load or detail is short.
- Inspect with Window → Analysis → Rendering Debugger → Probe Volume: Display Probes, Bricks, Cells, and Debug Probe Sampling.
- Plan a rebake when moving off Light Probe Groups: they do not convert into APVs.

### Surface Cache GI

SCGI is fully dynamic real-time global illumination for URP, with no baking.
Indirect light responds to moving and destroyed geometry, changing lights, and
day/night cycles. Unity publishes no maturity label for it yet.

- Set Project Settings → Graphics → **Default Mesh Buffer Target → Raw**; SCGI requires it.
- SCGI uses hardware ray tracing where Unity supports it and a compute path elsewhere. Metal and Vulkan run the compute path, and Unity has not committed to a mobile minimum spec: measure on the weakest target device.
- SCGI covers **diffuse indirect only**. Pair it with Reflection Probes or SSR for specular, or the scene reads flat.
- Keep baked lighting on scenes that do not change: baking wins on quality and cost where nothing moves.
- Debug it in the Rendering Debugger's Surface Cache Global Illumination panel, whose Albedo and Emission view modes show what bounce lighting reads from each surface.
- Measure temporal noise, light-response latency, artifacts, and memory on target hardware before committing a production scene to it.

### Screen-space effects

- **SSR** needs both its renderer feature on the URP Renderer and its Volume override. It reflects only what is on screen and falls back to Reflection Probes and the skybox, without ray tracing.
- **GTAO** is a mode of URP's SSAO, selected in the SSAO Volume override; Volume overrides win at runtime. Its temporal filter needs motion vectors, and the advanced filters need the compute path.
- Tonemap with Neutral, ACES, or **AgX**, which adds Contrast and Mid Gray controls for SDR and HDR output.

## Light baking

Set Project Settings → Graphics → **Default Light Baker → Unity Compute Light
Baker** (`EditorGraphicsSettings.defaultLightBaker` from scripts) and use it
for every lightmap, Light Probe, and Adaptive Probe Volume bake. It is opt-in:
a project bakes with Progressive GPU until the setting changes. It has no
interactive lightmap preview, so judge a bake from its result.

## GPU-driven drawing

- Reduce draw calls through the SRP Batcher, GPU Resident Drawer, and GPU instancing.
- Enable **GPU Resident Drawer** (Instanced Drawing) on large scenes: SRP Batcher on, BatchRendererGroup variants "Keep All", the Forward+ or Deferred+ path, static batching off, Enlighten Realtime GI off. It auto-instances through BatchRendererGroup and cuts draw calls and CPU time. It needs a compute-capable graphics API, which excludes OpenGL ES and visionOS.
- Cull occlusion with **GPU occlusion culling**, which runs through GRD; no baked occlusion data is authored.
- Re-profile after enabling GRD. It shifts load to the GPU, so GPU-bound low-end mobile can lose from it; that measurement decides, not the default.
- Keep shaders and materials SRP Batcher-compatible (per-material CBUFFER layout), and use GPU instancing for repeated meshes GRD does not cover.
- Vary per-instance data through **per-renderer shader user value**: `SetShaderUserValue` with `unity_RendererUserValue` feeds colour or atlas index through one material while staying GRD-compatible. `MaterialPropertyBlock` silently drops objects out of the SRP Batcher and GRD paths. Duplicated materials cost memory and a full upload on every change: on an iPhone 12, 10,000 renderers with their own material ran at 8 FPS when edited every frame, against 60 FPS with the user value. Past 32 bits, store records in a structured `GraphicsBuffer` set globally and pass each renderer's index through the user value. [Chapter](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/seto-noboru-1.html)
- The **Rendering Statistics** window breaks down SRP Batcher, GRD, BatchRendererGroup, and instancing.

## Shaders

- Author in Shader Graph or URP HLSL. Shader Graph sets stencil and depth overrides per material and targets Light 2D, Shadow 2D, and UI Toolkit filters.
- Configure shader compilation per Build Profile in its Graphics settings: **Fast Build** turns keywords into dynamic branching for iteration builds, and DXC is selectable for Direct3D 12 (FXC remains its default).
- Count transcendental functions (`sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `exp`, `pow`, `log`) in mobile fragment shaders: each expands into many instructions and raises register pressure, and `tan` and `atan` cost the most. In a hot loop with a bounded input, replace `sin` with the parabola `(4/π)x − (4/π²)x·|x|` (valid for |x| ≤ π, error about 0.06) and `tan` with the Padé form `x(15 − x²)/(15 − 6x²)` (valid for |x| < π/2). Measured savings ranged from about 6% to 50% depending on the device. [Chapter](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/nagatome-ryouhei-1.html)
- Keep global values out of the `UnityPerMaterial` constant buffer, which must stay identical across a shader's materials for the SRP Batcher.

### Shader warmup

The first draw of a shader variant in a new render state compiles a pipeline
state object (PSO) in the driver, tens of milliseconds each on Vulkan and Metal.
`ShaderVariantCollection` cannot prevent it, since it records no render state.
Warm up with **`GraphicsStateCollection`** (`UnityEngine.Rendering`).
[Chapter](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/amano-takuro-1.html)

- Trace on the target device and graphics API, once per Quality Level, since MSAA and HDR change the PSO: `BeginTrace`, render the content, `EndTrace`, `SaveToFile`. Script the trace (load each scene, spawn each model and effect, play each Timeline) rather than playing by hand, and retrace after shader or asset changes.
- At runtime, load the collection matching the current Quality Level after the shaders it references are loaded, and spread the work with `WarmUpProgressively(count)` across loading frames; `WarmUp` does it all in one spike.
- End the loop when the requested count reaches `totalGraphicsStateCount`, not on `isWarmedUp`, which a warmup error can leave false forever.
- Read the warmup log: `variant not found` means stripping removed the variant; a platform, graphics API, or Quality Level mismatch warning means the collection was traced elsewhere, and only a retrace on the target fixes it.
- On iOS, keep shared shaders under a single Content Directory Catalog Id. A shader built into separately built content loads as several instances, and the warmup covers only the one the collection names; that was measured outside Content Directories, so confirm it in the Profiler (next item) before restructuring catalogs.
- Hitches that persist show in the Profiler as `Shader.CreateGPUProgram` on the main thread, or as `GpuProgramMetal.GetCachedPipeline` (iOS) and `CreateGraphicsPipelineImpl` (Android) on the render thread.

## Device tiers

One rendering configuration for every phone crashes or overheats the low end and
wastes the high end. [Chapter](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/sakuma-naoki-1.html)

- Make each tier a Quality Level bound to its own URP asset, and switch with `QualitySettings.SetQualityLevel`. Set individual URP fields (`renderScale`, shadow cascades, shadow resolution, additional lights) at runtime only for player-facing options.
- Tier iOS devices by `SystemInfo.deviceModel` and `graphicsDeviceName`, which follow consistent naming. Tier Android devices by `SystemInfo.systemMemorySize`, a table of known models, or a startup benchmark; model strings do not compare across vendors.
- Give every custom renderer feature a low-tier path: smaller or lower-precision temporary targets, fewer blits, a cheaper shader variant.

## Platform and performance levers

- **Mesh LOD** generates LODs at import into a single mesh: less memory than external LOD tools, and compatible with Entities Graphics. Particle Systems, VFX Graph, and static batching always draw LOD0.
- **On-tile post-processing** with Tile-Only Mode runs colour grading, tonemapping, vignette, dithering, and film grain in one GPU-tile pass with no system-memory readback, on the forward and deferred renderers. It requires URP's integrated post-processing disabled. Large bandwidth and thermal wins on Vulkan and Metal.
- Upscale through URP's **Upscaler Priority List** when rendering below native resolution: DLSS on NVIDIA GPUs, FSR on AMD GPUs, and **STP** (Spatial-Temporal Post-Processing) everywhere else and as the fallback. Unity announced DLSS 4.5 and FSR for URP, but the Editor exposes only STP and FSR1: ship STP until a release lists the others, and do not unlock them through hidden scripting defines.
- **WebGPU** unlocks GRD, GPU occlusion culling, STP, VFX Graph, APV, and compute skinning on the Web. Choose it when a Web build needs those: disable Auto Graphics API and order WebGPU above WebGL2, which stays the default; the page must be served over HTTPS.
- **DirectStorage** (Windows) cuts load times for textures, meshes, and ECS data on NVMe. The Windows `AsyncReadManager` rewrite extends that to custom reads.
- Target **ASTC** on mobile and **BC** on desktop.
