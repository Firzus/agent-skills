# Performance — profile first, then allocations and GPU-driven rendering

## Profiling

Measure on target hardware before changing anything: the Editor adds overhead
and hides device-specific bottlenecks, so Editor numbers point at the wrong
problem.

- Compare captures with **Profile Analyzer**; chase memory with **Memory Profiler** snapshots.
- Read pass merging on player builds with the on-device **Render Graph Viewer** (6.3).
- The redesigned **Rendering Statistics** window (6.4) breaks down SRP Batcher, GPU Resident Drawer, BatchRendererGroup, and instancing.

## Allocations

Hold steady-state gameplay at zero per-frame managed allocations — GC spikes are
frame hitches, and incremental GC moves the cost rather than removing it.

- Cache component references at init; reuse collections and `StringBuilder`s.
- Use the non-alloc physics query overloads.
- Keep `Update()` clear of string concatenation, list allocation, LINQ, closures, boxing, and `GetComponent`.
- Pool runtime spawns with `UnityEngine.Pool` — `ObjectPool<T>`, `CollectionPool` — with collection checks on in dev builds. Projectiles and VFX churning through `Instantiate`/`Destroy` are the usual source of hitches.

## Rendering

URP is the pipeline. HDRP is the one supported step off that row, for
high-fidelity PC and console work — pick before production, since pipelines are
not interchangeable mid-project. The Built-In pipeline is deprecated as of 6.5
and maintained only through the 6.7 LTS lifecycle; Unity 6 performance features
are SRP-based.

- Enable **GPU Resident Drawer** (Instanced Drawing) with GPU occlusion culling on large scenes: SRP Batcher on, BatchRendererGroup variants "Keep All", Forward+, static batching off. It auto-instances through BatchRendererGroup and cuts draw calls and CPU time.
- Re-profile after enabling it. It shifts load to the GPU, so GPU-bound low-end mobile can lose from it — that measurement decides.
- Keep shaders and materials SRP Batcher-compatible (per-material CBUFFER layout), and use GPU instancing for repeated meshes GRD does not cover.
- Vary per-instance data through **per-renderer shader user value** (6.3): `SetShaderUserValue` plus `unity_RendererUserValue` feeds colour or atlas index through one material while staying GRD-compatible. `MaterialPropertyBlock` silently drops objects out of the SRP Batcher and GRD paths.
- Write custom passes as **Render Graph** passes. Compatibility Mode was removed in 6.3 and the `URP_COMPATIBILITY_MODE` define in 6.4, so Render Graph is the only path.

## Rendering levers by version

- **Mesh LOD** (6.2) generates LODs at import into a single mesh — less memory than external LOD tools, and compatible with Entities Graphics in 6.5.
- **On-tile post-processing** and Tile-Only Mode (6.5) run HDR, tone mapping, colour grading, and vignette in one GPU-tile pass with no system-memory readback. Large bandwidth and thermal wins on Vulkan and Metal.
- The **GPU Lightmapper** with xAtlas packing is the baking default for new scenes from 6.3 — faster bakes, less VRAM and disk.
- **DirectStorage** (6.4, PC and Xbox) cuts load times for textures, meshes, and ECS data on NVMe. The Windows `AsyncReadManager` rewrite (6.5) extends that to custom reads.
- Target ASTC on mobile and BC on desktop and console. PVRTC was removed in 6.4.
