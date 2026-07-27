# Architecture — composition, asmdefs, async, jobs

## Code structure

- Build gameplay from plain C# services, with MonoBehaviours as thin adapters over them. Logic that never touches `UnityEngine` types is logic you can test in edit mode.
- Resolve references through serialized fields, dependency injection, or a registry populated at init. `FindAnyObjectByType` belongs to initialization at most; per-frame `Find*` calls scan the scene.
- Split code into **assembly definitions** along architectural seams — Core, Gameplay, UI, Infrastructure, one per major system — with one-way dependencies. Asmdefs enforce module boundaries and shrink incremental compile scope.
- Aim for one asmdef per major system. Dozens of micro-asmdefs slow reload; leaving everything in `Assembly-CSharp` removes boundaries and blocks tests, since test assemblies cannot reference it.

## ScriptableObjects

Use them for shared config, event channels, and designer-authored data — they
decouple systems without singletons. They are assets: see
[runtime.md](./runtime.md) for why per-run state belongs elsewhere.

## Async

`Awaitable` is the default: pooled, near zero-allocation, and PlayerLoop-aware.

- Reach for `Awaitable.NextFrameAsync`, `WaitForSecondsAsync`, `BackgroundThreadAsync`, and `MainThreadAsync`.
- Pass a `CancellationToken` on every call — `destroyCancellationToken` scopes the work to its component, so a destroyed object cancels its own pending work.
- Await each `Awaitable` instance once. Instances return to a pool after awaiting, so a stored one is a use-after-free.
- Adopt **UniTask** where you need `WhenAll`/`WhenAny`, PlayerLoopTiming control, async LINQ, or leak tracking. It is the one supported step off this row.
- Keep coroutines for trivial fire-and-forget sequencing. Raw .NET `Task` continues on the thread pool with no PlayerLoop awareness, which is why engine work stays on `Awaitable`.

## Jobs, Burst, ECS

- Move measured hot paths — pathfinding, procedural generation, mass transform updates — into Burst-compiled jobs over `NativeArray` and `Unity.Mathematics`. Burst alone often pays 5–10x on a hot loop.
- Schedule early and complete late, chaining `JobHandle`s. Calling `.Complete()` straight after scheduling runs the job synchronously and discards the parallelism.
- Size `IJobParallelFor` batches to the work per item: large batches for cheap items, small for expensive ones.
- Entities, Collections, Mathematics, and Entities Graphics ship with the Editor as core packages since 6.4 (`Unity.Mathematics` is a built-in module in 6.5) and track Editor releases. Jobs, Burst, and Mathematics are therefore a default tool for hot paths, not an opt-in dependency.
- Reserve **full ECS** for genuine scale — RTS hordes, large simulations, thousands of active entities — used hybrid alongside GameObjects. It costs iteration speed and ecosystem compatibility, which is the trade the scale has to justify.
