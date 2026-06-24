# Performance & profiling — measure first, zero allocs, GPU-driven

## Profiling workflow

- **DO** profile on **target hardware** with the Profiler, compare captures
  with **Profile Analyzer**, and chase memory with **Memory Profiler**
  snapshots — before optimizing anything.
- **DON'T** optimize from editor-only numbers or gut feeling: the editor adds
  overhead and hides device-specific bottlenecks.
- **DO** use the newer instrumentation: the **Render Graph Viewer on-device**
  (6.3) for pass merging on player builds, the **redesigned Rendering Statistics
  window** (6.4, shows SRP Batcher / GRD / BRG / instancing breakdown), and
  Profiler **Captures List** + Highlights detail (6.3).

## Allocation discipline

- **DO** enforce **zero per-frame managed allocations** in steady-state
  gameplay: cache component references, reuse collections and StringBuilders,
  use non-alloc physics queries.
- **DON'T** concatenate strings, allocate lists, use LINQ/closures/boxing, or
  call `GetComponent` inside `Update()` — GC spikes are frame hitches, and
  incremental GC doesn't excuse the discipline.
- **DO** pool everything spawned at runtime with **`UnityEngine.Pool`**
  (`ObjectPool<T>`, `CollectionPool`; enable collection checks in dev builds).
- **DON'T** `Instantiate`/`Destroy` projectiles or VFX per shot, and don't
  hand-roll pools the engine provides.

## Rendering (Unity 6 specifics)

- **DO** choose the pipeline up front: **URP** for mobile/XR/cross-platform
  and most stylized games; **HDRP** for high-fidelity PC/console. Pipelines
  are not interchangeable mid-project.
- **DON'T** start new Unity 6 projects on the Built-in Render Pipeline —
  Unity 6 performance features (Render Graph, GPU Resident Drawer, STP
  upscaling) are SRP-based.
- **DO** enable **GPU Resident Drawer** (Instanced Drawing) + **GPU occlusion
  culling** for large scenes: SRP Batcher on, BatchRendererGroup variants
  "Keep All", Forward+, static batching off. It auto-instances via
  BatchRendererGroup and slashes draw calls/CPU time.
- **DON'T** enable GRD blindly on GPU-bound low-end mobile (it shifts load to
  the GPU), and re-profile after enabling.
- **DO** keep shaders/materials **SRP Batcher-compatible** (per-material
  CBUFFER layout); use GPU instancing for repeated meshes not covered by GRD.
- **DON'T** vary material properties per-renderer via `MaterialPropertyBlock`
  on objects you want batched — it silently breaks SRP Batcher/GRD paths.
- **DO** use **per-renderer shader user value (RSUV)** instead (6.3):
  `MeshRenderer/SkinnedMeshRenderer.SetShaderUserValue` + `unity_RendererUserValue`
  feeds per-renderer data (color, atlas index) through **one** material while
  staying **GPU Resident Drawer-compatible** — the supported way to vary
  instances without breaking batching.
- **DO** write custom render passes as **Render Graph** passes. The URP
  **Compatibility Mode is removed in 6.3** (Render Graph is the only path) and
  the `URP_COMPATIBILITY_MODE` escape define is gone in 6.4.
- **DON'T** start new projects on the **Built-in Render Pipeline** (deprecated
  in 6.5) or rely on **dynamic batching** (deprecated in 6.5).

## Rendering: newer levers (6.2–6.5)

- **DO** enable **Mesh LOD** (auto LOD generation at import, all LODs in one
  Mesh — 6.2) instead of external LOD tools; it cuts memory and is compatible
  with Entities Graphics (6.5).
- **DO** turn on **on-tile post-processing** + **Tile-Only Mode** on mobile
  (6.5): HDR, tone mapping, color grading, and vignette run in a single GPU-tile
  pass with no system-memory readback — major bandwidth/thermal wins on
  Vulkan/Metal.
- **DO** prefer the **GPU Lightmapper** and **xAtlas** packing — the new baking
  defaults for fresh scenes/projects in 6.3 (faster bakes, less VRAM/disk).
- **DO** consider **DirectStorage** (6.4, PC & Xbox) for texture/mesh/ECS data
  on NVMe — large load-time reductions; the Windows `AsyncReadManager` rewrite
  (6.5) extends fast I/O to custom reads.
- **DON'T** target **PVRTC** (removed in 6.4) — use ASTC (mobile) or BC
  (desktop/console).

## Hot paths

- **DO** move measured hot paths into **Burst-compiled jobs** with
  `NativeArray` / `Unity.Mathematics`, scheduled early and completed late.
- **DON'T** consider job batch sizes irrelevant on `IJobParallelFor`, and
  don't `.Complete()` right after scheduling.

## Engine-agnostic theory

For when to apply Data Locality, Dirty Flag, Object Pool, and Spatial
Partition (and when not to), see the `game-architecture-patterns` skill's
optimization reference.
