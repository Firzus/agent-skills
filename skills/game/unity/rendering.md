# Rendering — pipeline, lighting, GPU-driven drawing

URP is the pipeline, on every target from mobile to high-end PC and console.
Unity's rendering work now lands there: Surface Cache GI, Screen Space
Reflections, and GTAO are URP features. The Built-In pipeline is deprecated as
of 6.5 and maintained only through the 6.7 LTS lifecycle, and Unity 6 rendering
features are SRP-based.

Set the pipeline at project start. Pipelines are not interchangeable
mid-project: materials, shaders, lighting setup, and custom passes are all
pipeline-specific, so a switch is a re-authoring pass across the project's
entire visual content.

## Render Graph

Write custom passes as **Render Graph** passes. Compatibility Mode was removed
in 6.3 and the `URP_COMPATIBILITY_MODE` define in 6.4, so Render Graph is the
only path. Read pass merging on player builds with the on-device **Render Graph
Viewer** (6.3).

## Lighting

Pick the lighting model from how much the scene moves.

| Scene | Reach for |
| --- | --- |
| Static geometry and lights | Baked lightmaps + **Adaptive Probe Volumes** |
| Moving lights, destructible or procedural geometry, day/night | **Surface Cache GI** (6.7) |
| Specular, under either | Reflection Probes, or **SSR** (6.7) |

### Adaptive Probe Volumes

APV places probes automatically from scene geometry and supplies baked indirect
lighting to dynamic objects, characters, and static meshes that skip lightmaps.
It is the default probe system for large URP scenes, and it stays supported for
baked workflows alongside SCGI.

- Enable it on the URP Asset: Lighting → Light Probe Lighting → Light Probe System → **Adaptive Probe Volumes**.
- Add `GameObject → Light → Adaptive Probe Volume`, Global to cover the scene or Local for one area.
- Set static environment renderers to **Contribute Global Illumination**, and receivers to **Receive Global Illumination → Light Probes**.
- Set contributing lights to Mixed or Baked; realtime lights still supply direct lighting and shadows.
- Bake through Window → Rendering → Lighting → Adaptive Probe Volumes, as a Single Scene or a Baking Set.
- Tighten probe spacing around detailed geometry, interiors, doorways, and stairs, using local volumes with Override Probe Spacing where density matters.
- Fix light leaks with a Probe Adjustment Volume, Virtual Offset, or Dilation, and keep probes out of walls and off thin geometry.
- Raise the URP Asset's APV memory budget when cells fail to load or detail is short.
- Inspect with Window → Analysis → Rendering Debugger → Probe Volume: Display Probes, Bricks, Cells, and Debug Probe Sampling.
- Plan a rebake when moving off Light Probe Groups: they do not convert into APVs.

### Surface Cache GI

SCGI is fully dynamic real-time global illumination for URP, with no baking.
Indirect light responds to moving and destroyed geometry, changing lights, and
day/night cycles. It uses hardware ray tracing where present and falls back to
a compute-shader path elsewhere, targeting broad hardware rather than peak
fidelity — Unity demonstrated one scene running on PC and on a Galaxy S26 at
60 fps full resolution.

It is **preview in the 6.7 Alpha**, with broad availability planned for
**6.7 LTS**, carrying into the Unity 7 generation. SSR and GTAO ship on the same
track.

- SCGI covers **diffuse indirect only**. Pair it with Reflection Probes or SSR for specular, or the scene reads flat.
- Keep baked lighting on scenes that do not change: baking wins on quality and cost where nothing moves.
- Measure temporal noise, light-response latency, artifacts, and memory on target hardware before committing a production scene to it, while it is still experimental.
- SCGI is what replaced the abandoned Dynamic APV direction. Standard APV is unaffected.

## GPU-driven drawing

- Enable **GPU Resident Drawer** (Instanced Drawing) with GPU occlusion culling on large scenes: SRP Batcher on, BatchRendererGroup variants "Keep All", Forward+, static batching off. It auto-instances through BatchRendererGroup and cuts draw calls and CPU time.
- Re-profile after enabling it. It shifts load to the GPU, so GPU-bound low-end mobile can lose from it — that measurement decides, not the default.
- Keep shaders and materials SRP Batcher-compatible (per-material CBUFFER layout), and use GPU instancing for repeated meshes GRD does not cover.
- Vary per-instance data through **per-renderer shader user value** (6.3): `SetShaderUserValue` with `unity_RendererUserValue` feeds colour or atlas index through one material while staying GRD-compatible. `MaterialPropertyBlock` silently drops objects out of the SRP Batcher and GRD paths.
- The **Rendering Statistics** window (6.4) breaks down SRP Batcher, GRD, BatchRendererGroup, and instancing.

## Levers by version

- **Mesh LOD** (6.2) generates LODs at import into a single mesh — less memory than external LOD tools, and compatible with Entities Graphics in 6.5.
- **On-tile post-processing** with Tile-Only Mode (6.5) runs HDR, tone mapping, colour grading, and vignette in one GPU-tile pass with no system-memory readback. Large bandwidth and thermal wins on Vulkan and Metal.
- The **GPU Lightmapper** with xAtlas packing is the baking default for new scenes from 6.3 — faster bakes, less VRAM and disk.
- **DirectStorage** (6.4, PC and Xbox) cuts load times for textures, meshes, and ECS data on NVMe. The Windows `AsyncReadManager` rewrite (6.5) extends that to custom reads.
- Target **ASTC** on mobile and **BC** on desktop and console. PVRTC was removed in 6.4.
