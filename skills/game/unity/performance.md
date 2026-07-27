# Performance — profile first, then allocations

## Profiling

Measure on target hardware before changing anything: the Editor adds overhead
and hides device-specific bottlenecks, so Editor numbers point at the wrong
problem.

- Compare captures with **Profile Analyzer**; chase memory with **Memory Profiler** snapshots.
- For rendering-side instrumentation — Render Graph Viewer, Rendering Statistics — see [rendering.md](./rendering.md).

## Allocations

Hold steady-state gameplay at zero per-frame managed allocations — GC spikes are
frame hitches, and incremental GC moves the cost rather than removing it.

- Cache component references at init; reuse collections and `StringBuilder`s.
- Use the non-alloc physics query overloads.
- Keep `Update()` clear of string concatenation, list allocation, LINQ, closures, boxing, and `GetComponent`.
- Pool runtime spawns with `UnityEngine.Pool` — `ObjectPool<T>`, `CollectionPool` — with collection checks on in dev builds. Projectiles and VFX churning through `Instantiate`/`Destroy` are the usual source of hitches.

## CPU hot paths

Move measured hot paths into Burst-compiled jobs — see
[architecture.md](./architecture.md). Pipeline choice, lighting, GPU-driven
drawing, and the per-version rendering levers live in
[rendering.md](./rendering.md).
