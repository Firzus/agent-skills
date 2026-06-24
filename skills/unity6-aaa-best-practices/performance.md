# Performance & profiling — measure first, zero allocs, GPU-driven

## Profiling workflow

- **DO** profile on **target hardware** with the Profiler, compare captures
  with **Profile Analyzer**, and chase memory with **Memory Profiler**
  snapshots — before optimizing anything.
- **DON'T** optimize from editor-only numbers or gut feeling: the editor adds
  overhead and hides device-specific bottlenecks.

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
- **DO** write custom render passes as **Render Graph** passes — the legacy
  `ScriptableRenderPass.Execute` compatibility path is removed in 6.3+.

## Hot paths

- **DO** move measured hot paths into **Burst-compiled jobs** with
  `NativeArray` / `Unity.Mathematics`, scheduled early and completed late.
- **DON'T** consider job batch sizes irrelevant on `IJobParallelFor`, and
  don't `.Complete()` right after scheduling.
