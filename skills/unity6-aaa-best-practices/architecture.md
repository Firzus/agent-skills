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
- **DON'T** install **Entities / Collections / Mathematics / Entities Graphics**
  as manual packages on 6.4+ — they ship as **built-in Core packages** with the
  Editor (`Unity.Mathematics` is a built-in module in 6.5). Lower friction means
  Jobs+Burst+Mathematics is a reasonable default for hot paths, not an opt-in.

## Object identity: EntityId, not InstanceID

- **DO** treat **`EntityId`** as the object-identity type going forward (6.4
  deprecates `InstanceID`; 6.5 unifies GameObject + entity identity on a 64-bit
  `EntityId`). It is the bridge type between GameObjects and ECS.
- **DON'T** call the integer `InstanceID` APIs — `Object.GetInstanceID()`,
  `Resources.InstanceIDToObject`, `Selection.instanceIDs` — or cast ids to/from
  `int` or rely on their sign, bit layout, or sort order. These obsolete int
  APIs become **compile errors in 6.5** (the genuinely new break this release).
- **DON'T** use the legacy quick accessors `GameObject.rigidbody` / `.camera` /
  `Component.renderer` or `AddComponent("TypeName")` — long deprecated (gone
  since the Unity 5.x era), with any remaining `[Obsolete]` warnings promoted to
  errors in 6.5; use `GetComponent<T>()` / `AddComponent<T>()`.
- **DO** budget an explicit **`InstanceID` → `EntityId` migration** when moving a
  project to 6.4/6.5; upgrades have surfaced lost component references when this
  identity change is ignored.

## Serialization & domain reload

- **DO** apply `[SerializeField]` to **fields only** — on properties, methods,
  or types it is a **compile error since 6.3**; use `[field: SerializeField]`
  for auto-properties.
- **DO** let the **serialization Roslyn analyzer** (6.5) gate builds: it turns
  silent runtime data loss (missing `[Serializable]`, bad `[SerializeReference]`,
  unsupported collections) into compile-time errors — keep it on as
  build-breaking.
- **DO** design for **disabled domain reload**: prefer the **Editor Lifecycle
  API** (`OnCodeLoaded`/`OnCodeInitializing`) and `[AutoStaticsCleanup]` /
  `OnEnteringPlayMode` attributes (6.5) over event-based `playModeStateChanged`
  and manual static resets — this is the foundation for the reload-free CoreCLR
  Editor and keeps enter-play-mode fast.
- **DON'T** hold un-reset `static` mutable state expecting a domain reload to
  clear it when fast enter-play-mode / reload-free mode is on.

## Related

- Engine-agnostic pattern theory (Component/ECS, State, Event Queue, Service
  Locator trade-offs): see the `game-architecture-patterns` skill.
