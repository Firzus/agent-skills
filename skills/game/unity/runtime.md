# Runtime — CoreCLR readiness, static state, serialization, identity

6.7 LTS is the last Mono release. 6.8 removes Mono and moves the Editor and
desktop player to CoreCLR on .NET 10 / C# 14, targeting parity first —
the optimisation work lands in the 2027 LTS. Code written **CoreCLR-ready**
today crosses that boundary, and Unity 7, without a port.

IL2CPP stays: it remains the release build target and picks up the .NET 10
libraries. CoreCLR replaces Mono, not IL2CPP.

## Static state

Domain reload is what used to reset your statics between Play Mode entries. Fast
Enter Play Mode is the default for new projects and the only model in 6.8, so
that reset is gone.

Own the lifecycle explicitly:

- Reset every mutable static in `[RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]`, which runs before scene load on every Play Mode entry.
- Use the Editor Lifecycle API — `[AutoStaticsCleanup]`, `[OnEnteringPlayMode]`, `[BeforeCodeUnloading]` — over `playModeStateChanged` event wiring.
- Unsubscribe static events and dispose static `IDisposable`s in the matching teardown.

The bar: entering Play Mode a second time behaves exactly like the first. Run it
twice and compare — a discrepancy is un-reset static state, every time.

## APIs that change under CoreCLR

| Area | What to do |
| --- | --- |
| `BinaryFormatter` | Serialize with JSON, `MessagePack`, or explicit readers/writers |
| Removed .NET Framework APIs | Move to their .NET 10 equivalents |
| `Assembly.Load` variants | Load through supported overloads, or resolve types statically |
| `ManagedDebugger` | Removed — use the standard debugger attach path |
| Type accessibility | Reflection honours accessibility more strictly; make intended targets public or use documented accessors |
| Floating-point | Results shift slightly; compare with epsilons and re-bake anything that hashes float output |

Run **Project Auditor** (Window → Analysis, in the Editor since 6.4) with its
Domain Reload checks before a version bump — it finds these mechanically. Then
validate desktop builds against the experimental CoreCLR player in 6.7.

## Serialization

- `[SerializeField]` applies to fields only; auto-properties take `[field: SerializeField]`. Anything else is a compile error from 6.3.
- Keep the serialization Roslyn analyzer (6.5) build-breaking — it turns silent runtime data loss (missing `[Serializable]`, malformed `[SerializeReference]`, unsupported collections) into compile errors.
- Serialize dictionaries directly as `[SerializeField] Dictionary<TKey, TValue>`; both types follow Unity's serialization rules.
- Collections are valid dictionary values, not keys. Wrap a dictionary nested directly inside a list or array in a serializable type.
- Treat ScriptableObjects as assets: config and shared data, not per-run state. Their values persist across Play Mode sessions in the Editor and are shared by every consumer.

## Object identity: `EntityId`

`EntityId` is the 64-bit identity type unifying GameObjects and entities, and
the foundation of Unity's "ECS for All" direction. The `int` InstanceID APIs
are obsolete.

- Store and pass identity as `EntityId`.
- Treat it as opaque: no casting to `int`, no reliance on its sign, bit layout, or sort order.

`EntityId` is **not** the ECS `Entity` struct. It is the engine-wide object
identity type; `Entity` remains the ECS handle. The changelog wording invites
that confusion.

## Language level

C# 14 and .NET 10 arrive with 6.8. Until the project is on it, write against the
baseline's language version and keep new code free of the APIs listed above, so
the bump is a version change rather than a refactor.
