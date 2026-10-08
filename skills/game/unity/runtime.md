# Runtime: CoreCLR, static state, serialization, identity

Unity 7 runs the Editor and the desktop players (Windows, macOS on Apple
silicon, Linux) on **CoreCLR**; CoreCLR is the default there. Every other
platform builds with **IL2CPP**, which also stays the release target on
desktop. IL2CPP builds use the .NET 10 class libraries on Windows, macOS,
Linux, and iOS, with the remaining platforms following, and keep the Boehm GC.

7.0 targets parity with 6.7 LTS; runtime, JIT, and GC optimisation is planned
for the LTS after it.

## Static state

Unity 7 reloads code through AssemblyLoadContext. A code change reloads every
project assembly: statics restart from their initializers, and
`[InitializeOnLoad]` static constructors run again. Entering or leaving Play
Mode reloads nothing, so statics keep the values the previous session left.
Keep it that way: leave **Reload Domain** off in Enter Play Mode Options (the
default) and own the lifecycle explicitly:

- Give every type that declares static fields, auto-properties, or events `[AutoStaticsCleanup]` or `[NoAutoStaticsCleanup]` (namespace `Unity.Scripting.LifecycleManagement`); the analyzer warns (UAL0010) on a type with neither. With `[AutoStaticsCleanup]`, Unity restores every non-readonly static field to its initializer on each Play Mode entry, or to its default without one, clears readonly collections, and disposes values with an accessible `Dispose`.
- Declare that type and every containing type `partial`; the analyzer reports UAL0012 otherwise.
- Keep reset logic out of static constructors: the cleanup never reruns them (UAL0014 flags explicit ones). Put the value in the field initializer, or reset it in a hook.
- Exempt a field that must survive with `[NoAutoStaticsCleanup]`: ID counters, cached `GUIStyle` and `GUIContent`.
- Reset by hand where the automatic cleanup cannot (UAC0036 reports those fields), in a lifecycle hook: `[OnEnteringPlayMode]`, `[OnExitingPlayMode]`, `[OnEnteringEditMode]`, `[OnExitingEditMode]`. Runtime code can use `[RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]`, which runs before scene load on every Play Mode entry. Code that also runs in Edit mode resets on entering Play Mode, not on leaving it.
- Pair every registration with its teardown through matching hooks: `[OnCodeLoaded]` with `[OnCodeUnloading]`, `[OnCodeInitializing]` with `[OnCodeDeinitializing]`. Static event subscriptions, `EditorApplication` callbacks, and static `IDisposable`s are released in the teardown hook.
- Keep assemblies with `noEngineReferences` free of static state. Where one needs it, expose a re-initialization method and call it from a lifecycle hook in an engine-referencing assembly.

A static, or pooled storage such as a custom stack or a `MemoryPool<T>`
buffer, that still references a type from a reloaded assembly keeps the old
AssemblyLoadContext alive. Clear pooled storage when an item returns to the
pool, and fix any leak Unity reports through its assembly load context leak
report.

The bar: entering Play Mode a second time behaves exactly like the first. Run it
twice and compare; a discrepancy is un-reset static state, every time.

## Code that behaves differently on CoreCLR

| Area | What to do |
| --- | --- |
| `BinaryFormatter` | Serialize with JSON, `MessagePack`, or explicit readers and writers |
| Listing loaded assemblies | `UnityEngine.Assemblies.CurrentAssemblies.GetLoadedAssemblies()`, not `AppDomain.GetAssemblies` |
| Loading an assembly at run time | `CurrentAssemblies.LoadFromPath`, `CurrentAssemblies.LoadFromBytes`, or `Assembly.Load(AssemblyName)` |
| An assembly's file path | `Assembly.GetLoadedAssemblyPath()`; `Assembly.Location` is empty |
| Static constructors | They run on first access to static data, possibly on a background thread. Force one with `RuntimeHelpers.RunClassConstructor` or a lifecycle hook |
| Direct calls to non-public members | Raise `MethodAccessException` at run time, typically from precompiled assemblies; reflection over private members still works |
| `string.GetHashCode` | Randomized per process: never persist or transmit it; hash with a stable algorithm |
| Culture names | RFC 4646 names such as `fr-FR` |
| Pointer-sized conversions | Checked: `IntPtr.ToInt32` throws on 64-bit; convert to `long` |
| Text encodings | Only ASCII and Unicode are registered; call `Encoding.RegisterProvider(CodePagesEncodingProvider.Instance)` for others |
| Native helper libraries | `MonoPosixHelper` and similar libraries are not shipped; P/Invoke your own native plug-ins instead |
| Burst function pointers | Delegate types public or internal (UAC2016); never let a managed exception cross a Burst or native frame |
| Debugger API | `System.Diagnostics.Debugger`; attach the standard .NET debugger, mixed mode on Windows |
| Floating-point | CoreCLR results can differ from IL2CPP and from Burst with `FloatMode.Strict`. Compare with epsilons, and never hash float output computed on one backend to check it on another |
| Pointer width | `IntPtr.Size`, not a `UNITY_64` define |

Run **Project Auditor** (Window → Analysis → Project Auditor) in review: its
Code issues find these mechanically. Validate on the CoreCLR desktop player and
on each IL2CPP target.

## Serialization

- `[SerializeField]` applies to fields only; auto-properties take `[field: SerializeField]`. Anything else is a compile error from 6.3.
- Keep the serialization Roslyn analyzer (6.5) build-breaking: it turns silent runtime data loss (missing `[Serializable]`, malformed `[SerializeReference]`, unsupported collections) into compile errors.
- Serialize dictionaries directly as `[SerializeField] Dictionary<TKey, TValue>`; both types follow Unity's serialization rules.
- Collections are valid dictionary values, not keys. Wrap a dictionary nested directly inside a list or array in a serializable type.
- Treat ScriptableObjects as assets: config and shared data, not per-run state. Their values persist across Play Mode sessions in the Editor and are shared by every consumer.

## Object identity: `EntityId`

`EntityId` is the 64-bit identity type unifying GameObjects and entities, and
the foundation of Unity's "ECS for All" direction.

- Store and pass identity as `EntityId`: `GetEntityId()` to read it, `EntityIdToObject` to resolve it.
- Treat it as opaque: no casting to `int`, no reliance on its sign, bit layout, or sort order.

`EntityId` is **not** the ECS `Entity` struct. It is the engine-wide object
identity type; `Entity` remains the ECS handle. The changelog wording invites
that confusion.

## Language level

Unity 7.0 exposes C# 9 and .NET Standard 2.1. Write to that level until the
project's Editor exposes more: Unity plans .NET 10 and C# 14 within the 7.0
cycle, without a public date.

- Keep precompiled plug-ins on `netstandard2.1`. Once Unity moves to .NET 10, that becomes the only target framework: `net10.0` assemblies do not load before then, and assemblies built for .NET Framework may break after.
- Leave the experimental MSBuild compilation setting off in production projects; asmdefs remain the source of the compilation layout.
