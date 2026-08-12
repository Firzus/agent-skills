# Architecture — composition, asmdefs, async, jobs, performance

## Code structure

- Build gameplay from plain C# services, with MonoBehaviours as thin adapters over them. Logic that never touches `UnityEngine` types is logic you can test in edit mode.
- Resolve references through serialized fields, dependency injection, or a registry populated at init. `FindAnyObjectByType` belongs to initialization at most; per-frame `Find*` calls scan the scene.
- Split code into **assembly definitions** along architectural seams — Core, Gameplay, UI, Infrastructure, one per major system — with one-way dependencies. Asmdefs enforce module boundaries and shrink incremental compile scope.
- Aim for one asmdef per major system. Dozens of micro-asmdefs slow reload; leaving everything in `Assembly-CSharp` removes boundaries and blocks tests, since test assemblies cannot reference it.
- Draw asmdef boundaries where the code changes: two systems that always change together belong in one assembly, and folders organize files for humans while asmdefs cut compile units — mirroring the folder tree one-to-one serves neither.
- In an existing project, introduce asmdefs one at a time, starting from the most stable code. A cycle surfacing as a compile error is design feedback: the responsibility split needs adjusting, and the whitelist just made that concrete.
- An asmdef reference list is a whitelist, so a forbidden dependency is a compile error rather than a review comment. Adding a reference means editing the `.asmdef` — `.csproj` and `.sln` are regenerated from it and hand edits are wiped.
- Asmdef references are non-transitive: an assembly sees only what its own list names, never what its dependencies pull in. Name every dependency directly — the missing-type compile error after a refactor is usually this.
- Reference assemblies by GUID (`Use GUIDs` in the inspector), so renaming an assembly breaks nothing.
- Dependencies point one way: features depend on shared foundations, never on each other, never back upward.
- Put an asmdef (or `.asmref`) inside every `Editor/` folder that sits under a runtime asmdef. An asmdef in a parent folder overrides the `Editor/` special-folder rule, so without one those scripts compile into the runtime assembly and break player builds.
- Use an `.asmref` (assembly definition reference asset) to compile scripts from a distant folder into an existing assembly, keeping the folder where it belongs.
- Set `noEngineReferences: true` on domain logic to make an assembly pure C#, with the compiler forbidding any `UnityEngine` access. It is the cleanest way to keep that logic testable outside the Editor.
- Set `autoReferenced: false` to stop leftover code in `Assembly-CSharp` from reaching into a module without declaring it.
- When unsure where a script compiles, select it in the Project window: the inspector's information section names its assembly and owning asmdef.
- Code under `Packages/` is ignored entirely unless it carries an asmdef.

## ScriptableObjects

Use them for shared config, event channels, and designer-authored data — they
decouple systems without singletons. They are assets: see
[runtime.md](./runtime.md) for why per-run state belongs elsewhere.

## Async

`Awaitable` is the default: pooled, near zero-allocation, and PlayerLoop-aware.

- Async means keeping the main thread responsive, and most async code stays on it. Reach for a background thread only when the work is measurably heavy — pure computation such as procedural generation or data preprocessing.
- On a background thread, run pure C# only: Unity APIs, scene objects, and components belong to the main thread, and touching them off it throws or corrupts state.
- Switch threads coarsely — one `BackgroundThreadAsync`, one meaningful chunk of work, one `MainThreadAsync` to apply results. Each switch schedules through the PlayerLoop and costs up to a frame, so a switch inside a tight loop pays that price per iteration.
- Reach for `Awaitable.NextFrameAsync`, `WaitForSecondsAsync`, `BackgroundThreadAsync`, and `MainThreadAsync`.
- `WaitForSecondsAsync` follows `Time.timeScale`, so a paused game pauses the wait — game-time behavior that `Task.Delay`, on wall-clock time, never gives.
- Pass a `CancellationToken` on every call — `destroyCancellationToken` scopes the work to its component, so a destroyed object cancels its own pending work.
- Await each `Awaitable` instance once. Instances return to a pool after awaiting, so a stored one is a use-after-free.
- Adopt **UniTask** where you need `WhenAll`/`WhenAny`, PlayerLoopTiming control, async LINQ, or leak tracking. It is the one supported step off this row.
- Keep coroutines for trivial fire-and-forget sequencing. Raw .NET `Task` continues on the thread pool with no PlayerLoop awareness, which is why engine work stays on `Awaitable`.

## Jobs, Burst, ECS

- Move measured hot paths — pathfinding, procedural generation, mass transform updates — into Burst-compiled jobs over `NativeArray` and `Unity.Mathematics`. Burst alone often pays 5–10x on a hot loop.
- Allocate native containers once at init and reuse scratch buffers across runs; a job that only reads and writes pre-allocated containers is what makes the hot path zero-allocation.
- Native containers live outside the GC, so every one you create needs a matching `Dispose` — guard with `IsCreated` in `OnDestroy`, and pick the `Allocator` that matches the data's lifetime (`Temp`, `TempJob`, `Persistent`).
- Match the container to the data size: `NativeParallelHashSet`/`NativeParallelHashMap` pay for hashing, buckets, and thread safety, so on a handful of items a plain `NativeArray` with a linear scan wins on both speed and cache locality — even under Burst, the data structure decides the outcome.
- Schedule early and complete late, chaining `JobHandle`s. Calling `.Complete()` straight after scheduling runs the job synchronously and discards the parallelism.
- Size `IJobParallelFor` batches to the work per item: large batches for cheap items, small for expensive ones.
- Entities, Collections, Mathematics, and Entities Graphics ship with the Editor as core packages since 6.4 (`Unity.Mathematics` is a built-in module in 6.5) and track Editor releases. Jobs, Burst, and Mathematics are therefore a default tool for hot paths, not an opt-in dependency.
- Reserve **full ECS** for genuine scale — RTS hordes, large simulations, thousands of active entities — used hybrid alongside GameObjects. It costs iteration speed and ecosystem compatibility, which is the trade the scale has to justify.

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
