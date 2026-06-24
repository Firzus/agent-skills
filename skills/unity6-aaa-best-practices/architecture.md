# Gameplay architecture — composition, asmdefs, async, DOTS

## Code structure

- **DO** prefer composition + plain C# services over `MonoBehaviour`
  inheritance trees; keep MonoBehaviours as thin adapters over testable plain
  C# logic.
- **DON'T** use `GameObject.Find` / `FindObjectOfType` in runtime gameplay
  code (`FindAnyObjectByType` only at init if unavoidable) — slow and fragile.
- **DO** split code into **assembly definitions** along architectural seams
  (Core, Gameplay, UI, Infrastructure, one per major system) with one-way
  dependencies. asmdefs enforce module boundaries and cut incremental compile
  scope.
- **DON'T** create dozens of micro-asmdefs per feature, and don't leave
  everything in `Assembly-CSharp` — both extremes hurt (domain reload time vs
  no boundaries, and test assemblies can't reference `Assembly-CSharp`).

## ScriptableObject architecture

- **DO** use ScriptableObjects for shared config/data, event channels, and
  runtime "variable" assets — they decouple systems and enable designer-driven
  data without singletons.
- **DON'T** store mutable per-run state in SOs expecting it to reset: SO data
  persists across play sessions in-editor and is shared between consumers.
  SOs are assets, not save-game state.

## Async: Awaitable first

- **DO** use Unity 6 **`Awaitable`** as the default async tool:
  `Awaitable.NextFrameAsync`, `WaitForSecondsAsync`, `BackgroundThreadAsync` /
  `MainThreadAsync`, always with a `CancellationToken` (use
  `destroyCancellationToken` for component-scoped work). Pooled, near-zero
  alloc, PlayerLoop-aware.
- **DON'T** await the same `Awaitable` instance twice or store it for reuse —
  instances are pooled and recycled.
- **DO** adopt **UniTask** when you need `WhenAll`/`WhenAny`, PlayerLoopTiming
  control, async LINQ, or leak tracking; keep `Awaitable` for dependency-free
  code.
- **DON'T** build complex async flows on coroutines (fine only for trivial
  fire-and-forget sequencing), and don't use raw .NET `Task` for engine work
  (thread-pool continuations, no PlayerLoop awareness).

## DOTS, Jobs, Burst

- **DO** use **Jobs + Burst** for measured hot paths (pathfinding, procedural
  generation, mass transform updates) even without full ECS — Burst alone
  often yields 5–10x on hot loops.
- **DO** reserve **full DOTS/ECS** for genuine massive scale (RTS hordes, big
  simulations, thousands of active entities), used hybrid with GameObjects.
- **DON'T** rewrite a normal game in ECS for ideology — it costs iteration
  speed and ecosystem compatibility. AAA teams apply DOTS selectively.
- **DON'T** call `.Complete()` immediately after scheduling a job — schedule
  early, complete late (`JobHandle` chaining), or you discard the parallelism.
