# Rendering: pipeline, lighting, GPU-driven drawing

URP is Unity 7's render pipeline, on every target from mobile to high-end PC
and console. Unity's rendering work lands there: Surface Cache GI, Screen Space
Reflections, GTAO, and the URP lighting additions of the 7.x cycle.

Set the pipeline at project start. Pipelines are not interchangeable
mid-project: materials, shaders, lighting setup, and custom passes are all
pipeline-specific, so a switch is a re-authoring pass across the project's
entire visual content.

## Render Graph

Write custom passes as **Render Graph** passes; it is URP's only custom-pass
path. Reset pooled pass data through `IRenderGraphPassData.Reset`, and read
texture orientation with `GetTextureUVOrigin` rather than assuming it. Read
pass merging on player builds with the on-device **Render Graph Viewer** (6.3),
which jumps from a pass to its source.

## Lighting

Pick the lighting model from how much the scene moves.

| Scene | Reach for |
| --- | --- |
| Static geometry and lights | Baked lightmaps + **Adaptive Probe Volumes** |
| Moving lights, destructible or procedural geometry, day/night | **Surface Cache GI** (6.7) |
| Specular, under either | Reflection Probes, or **SSR** (6.7) |
| Ambient occlusion | **GTAO** (6.7) |

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
day/night cycles. It ships with 6.7 (release targeted for 6.7 LTS) and 7.0;
Unity publishes no maturity label for it yet.

- Set Project Settings → Graphics → **Default Mesh Buffer Target → Raw**; SCGI requires it.
- SCGI uses hardware ray tracing where Unity supports it and a compute path elsewhere. Metal and Vulkan run the compute path, and Unity has not committed to a mobile minimum spec: measure on the weakest target device.
- SCGI covers **diffuse indirect only**. Pair it with Reflection Probes or SSR for specular, or the scene reads flat.
- Keep baked lighting on scenes that do not change: baking wins on quality and cost where nothing moves.
- Debug it in the Rendering Debugger's Surface Cache Global Illumination panel, whose Albedo and Emission view modes show what bounce lighting reads from each surface.
- Measure temporal noise, light-response latency, artifacts, and memory on target hardware before committing a production scene to it.

### Screen-space effects

- **SSR** needs both its renderer feature on the URP Renderer and its Volume override. It reflects only what is on screen and falls back to Reflection Probes and the skybox, without ray tracing.
- **GTAO** is a mode of URP's SSAO, selected in the SSAO Volume override; Volume overrides win at runtime. Its temporal filter needs motion vectors, and the advanced filters need the compute path.
- Tonemap with Neutral, ACES, or **AgX** (6.7), which adds Contrast and Mid Gray controls for SDR and HDR output.

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
- Vary per-instance data through **per-renderer shader user value** (6.3): `SetShaderUserValue` with `unity_RendererUserValue` feeds colour or atlas index through one material while staying GRD-compatible. `MaterialPropertyBlock` silently drops objects out of the SRP Batcher and GRD paths.
- The **Rendering Statistics** window (6.4) breaks down SRP Batcher, GRD, BatchRendererGroup, and instancing.

## Shaders

- Author in Shader Graph or URP HLSL. Shader Graph sets stencil and depth overrides per material (6.7) and targets Light 2D, Shadow 2D, and UI Toolkit filters.
- Configure shader compilation per Build Profile in its Graphics settings: **Fast Build** turns keywords into dynamic branching for iteration builds, and DXC is selectable for Direct3D 12 (FXC remains its default).

## Levers by version

- **Mesh LOD** (6.2) generates LODs at import into a single mesh: less memory than external LOD tools, and compatible with Entities Graphics in 6.5. Particle Systems, VFX Graph, and static batching always draw LOD0.
- **On-tile post-processing** with Tile-Only Mode (6.5) runs colour grading, tonemapping, vignette, dithering, and film grain in one GPU-tile pass with no system-memory readback, on the forward and (6.7) deferred renderers. It requires URP's integrated post-processing disabled. Large bandwidth and thermal wins on Vulkan and Metal.
- Upscale through URP's **Upscaler Priority List** (6.7) when rendering below native resolution: DLSS on NVIDIA GPUs, FSR on AMD GPUs, the platform's own upscaler on console, and **STP** (Spatial-Temporal Post-Processing) everywhere else and as the fallback. Unity announced DLSS 4.5 and FSR for URP in 6.7, but the 7.0 alphas expose only STP and FSR1: ship STP until a 7.0 release lists them, and do not unlock them through hidden scripting defines.
- **WebGPU** (supported since 6.6) unlocks GRD, GPU occlusion culling, STP, VFX Graph, APV, and compute skinning on the Web. Choose it when a Web build needs those: disable Auto Graphics API and order WebGPU above WebGL2, which stays the default; the page must be served over HTTPS.
- **DirectStorage** (6.4, PC and Xbox) cuts load times for textures, meshes, and ECS data on NVMe. The Windows `AsyncReadManager` rewrite (6.5) extends that to custom reads.
- Target **ASTC** on mobile and **BC** on desktop and console.
