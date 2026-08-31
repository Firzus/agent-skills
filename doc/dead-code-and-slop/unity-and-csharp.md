# Dead Code and Slop: Unity and C#

**Research date:** 2026-08-31
**Question:** When an agent flags C# code as dead or as AI slop in a Unity project, which signals are trustworthy and which are structurally guaranteed false positives?

## Executive stance

C# plus Unity is the worst-case environment for automated dead-code detection, and both vendors document why. Roslyn's unused-member rules are scoped to `private` members only, so they never evaluate cross-assembly API. Unity states that its linker's static analysis "only includes code that exists at build time because code generated at runtime doesn't exist when Unity performs the static analysis" ([Managed code stripping](https://docs.unity3d.com/Manual/ManagedCodeStripping.html)). Microsoft's trimming documentation enumerates the patterns that defeat static reachability, and its prescribed remedy is annotation, not deletion ([Fixing trim warnings](https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/fixing-warnings)).

**In a Unity project, an "unused" diagnostic is a question, never an answer.** The engine invokes methods nothing references, the native serializer writes fields the compiler never sees assigned, and scenes and prefabs bind types by GUID and methods by name string. Deleting on the strength of `CS0169`, `IDE0051`, or a reference count breaks shipped behavior silently, and the failure surfaces at runtime in a player build rather than at compile time.

*Slop* is the opposite failure: empty `Update()` bodies costing a per-frame managed-to-native call, defensive null checks on serializer-guaranteed fields, single-implementer interfaces, regenerated near-duplicate `MonoBehaviour`s. That waste is real but invisible to the tooling that produces the false positives above. The two problems demand different evidence and must never be conflated.

## Layer 1: what the C# toolchain reports

| ID | Meaning | Scope limitation |
| --- | --- | --- |
| [CS0169](https://learn.microsoft.com/en-us/dotnet/csharp/misc/cs0169) | "The private field 'class member' is never used" | **Private fields only.** Reported only on explicit Build/Rebuild, not from IntelliSense, so the error list goes stale |
| [CS0414](https://learn.microsoft.com/en-us/dotnet/csharp/misc/cs0414) | "The private field 'field' is assigned but its value is never used" | **Private fields only.** Same build-only caveat |
| [CS0168](https://learn.microsoft.com/en-us/dotnet/csharp/misc/cs0168) | "The variable 'var' is declared but never used" | Method-local — reliable |
| [CS0219](https://learn.microsoft.com/en-us/dotnet/csharp/misc/cs0219) | "The variable 'variable' is assigned but its value is never used" | Method-local, and **only when the value is a compile-time constant**. Microsoft exempts non-constant expressions because keeping them aids debugger observation and keeps results reachable |

`CS0168` and `CS0219` are method-local, where the compiler has complete information; act on them freely. `CS0169` and `CS0414` are field-scoped, where the compiler is complete *only if nothing outside the C# type system touches the field*. In Unity, the serializer touches the field. That is where false positives begin.

| ID | What it flags | Limitation an agent must internalize |
| --- | --- | --- |
| [IDE0051](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/style-rules/ide0051) | "Remove unused private member" — unused **private** methods, fields, properties, events with no read or write references | **Private only.** Microsoft's own example annotates `internal readonly int FieldInternal;` with "No IDE0051". `public`, `internal`, `protected` are never flagged |
| [IDE0052](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/style-rules/ide0052) | "Remove unread private member" — **private** fields/properties with write references but no read references | Private only. This is the rule that fires on `[SerializeField]` fields consumed only by the Inspector |
| [IDE0060](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/style-rules/ide0060) | "Remove unused parameter" | Skips parameters named with the discard symbol `_` (and `_1`, `_2`…). Microsoft says this reduces noise on parameters "needed for signature requirements, for example, a method used as a delegate, a parameter with special attributes, or a parameter whose value is implicitly accessed at runtime by a framework but is not referenced in code" — a description of Unity callbacks. Tunable via `dotnet_code_quality_unused_parameters` |

**The single most important fact here:** IDE0051 and IDE0052 cover *private* members exclusively. An agent must never report "the analyzer found no unused public API" as evidence that public API is used. The analyzer never looked.

Severity is per-rule in EditorConfig (`dotnet_diagnostic.IDE0051.severity = none`, or `dotnet_analyzer_diagnostic.category-CodeQuality.severity = none` for a whole category), with `#pragma warning disable/restore` and `[SuppressMessage]` as the in-source forms ([How to suppress code analysis warnings](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/suppress-warnings), [configuration option format](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/configuration-options)).

**Read suppressions as evidence, not noise.** A `#pragma warning disable CS0649` or `[SuppressMessage]` beside a "dead" member is a prior engineer's recorded finding that the compiler is wrong there. Deleting suppressed code overrides a human decision the agent has not read.

`dotnet format analyzers` applies analyzer fixes for rules configured in EditorConfig ([dotnet format](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-format)). **Never run it unscoped on a Unity project** — it will delete `[SerializeField]` and Inspector-only members wherever those rules are enabled at warning severity.

## Layer 2: why .NET static reachability is structurally incomplete

The trimmer solves exactly the "is this reachable" problem an agent attempts, and Microsoft documents where it fails. Trim warnings split into **code incompatible with trimming**, marked [`RequiresUnreferencedCode`](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.codeanalysis.requiresunreferencedcodeattribute) because it "fundamentally can't be made analyzable (for example, dynamic assembly loading or complex reflection patterns)," and **code with requirements**, annotated [`DynamicallyAccessedMembers`](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.codeanalysis.dynamicallyaccessedmembersattribute), where reflection targets compile-time-known types ([Fixing trim warnings](https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/fixing-warnings)). [`DynamicDependencyAttribute`](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.codeanalysis.dynamicdependencyattribute) declares "a dependency that one member has on another… that is otherwise not evident purely from metadata and IL, for example, a member relied on via reflection" — the platform conceding that IL reference analysis is insufficient.

[Known trimming incompatibilities](https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/incompatibilities) enumerates the defeating patterns: **reflection-based serializers** (`Newtonsoft.Json`, `ConfigurationManager`, `BinaryFormatter` — "many of these uses can't be made analyzable at build time"); **runtime code generation via JIT** such as `System.Reflection.Emit`; **dynamic assembly loading** via APIs like `LoadFrom(String)`, since "trimming relies on seeing all assemblies at build time"; **built-in COM marshalling**, where "trimming analysis can't always predict what .NET code needs to be preserved"; and **WPF**, where "almost no WPF apps are runnable after trimming."

The prescribed workflow is ordered — eliminate reflection → annotate → mark `RequiresUnreferencedCode` → suppress as last resort. **Deletion is not on the list.** Microsoft also recommends a dedicated trimming test app alongside `IsTrimmable`, because "trimming a test app is more work, but shows all warnings" ([Prepare .NET libraries for trimming](https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/prepare-libraries-for-trimming)).

Distilled triggers that defeat reference counting: reflection (`Type.GetMethod`, `Activator.CreateInstance`), attribute-driven runtime discovery, serialization of any kind, DI container registration, dynamic assembly or plugin loading, generic instantiation over runtime types, and interface dispatch resolved at runtime.

## Layer 3: Unity-specific false positives

### Engine-invoked message methods

Unity calls MonoBehaviour event functions by convention; nothing in C# references them. The lifecycle is documented in [Event function execution order](https://docs.unity3d.com/Manual/ExecutionOrder.html), which covers "the execution sequence for event functions that run during the lifecycle of a MonoBehaviour script component" and points to the Messages section of the [MonoBehaviour API reference](https://docs.unity3d.com/ScriptReference/MonoBehaviour.html).

Treat all of these as engine-referenced despite zero call sites: `Awake`, `Start`, `Update`, `FixedUpdate`, `LateUpdate`, `OnEnable`, `OnDisable`, `OnDestroy`, `OnTriggerEnter/Stay/Exit`, `OnCollisionEnter/Stay/Exit`, `OnValidate`, `OnDrawGizmos`, `OnDrawGizmosSelected`, `Reset`, `OnApplicationPause`, `OnApplicationFocus`, `OnApplicationQuit`, `OnGUI`, `OnBecameVisible/Invisible`, `OnAnimatorMove`, `OnAnimatorIK`, plus 2D equivalents.

Attribute-driven entry points are the same problem with a different trigger. [`[RuntimeInitializeOnLoadMethod]`](https://docs.unity3d.com/ScriptReference/RuntimeInitializeOnLoadMethodAttribute.html) gives "a callback when the runtime is starting up and loading the first scene," ordered by [`RuntimeInitializeLoadType`](https://docs.unity3d.com/ScriptReference/RuntimeInitializeLoadType.html) (`SubsystemRegistration` → `AfterAssembliesLoaded` → `BeforeSplashScreen` → `BeforeSceneLoad` → `AfterSceneLoad`). [`[InitializeOnLoad]`](https://docs.unity3d.com/ScriptReference/InitializeOnLoadAttribute.html) runs static constructors on domain reload: project load, script modification with Auto Refresh, and entering Play mode. [`[InitializeOnLoadMethod]`](https://docs.unity3d.com/ScriptReference/InitializeOnLoadMethodAttribute.html), [`[MenuItem]`](https://docs.unity3d.com/ScriptReference/MenuItem.html), and [`[ContextMenu]`](https://docs.unity3d.com/ScriptReference/ContextMenu.html) are invoked from Editor menus. A `[MenuItem]` method has zero call sites by design; its call site is a menu entry.

### `[SerializeField]` and serialization rules

[`SerializeField`](https://docs.unity3d.com/ScriptReference/SerializeField.html) exists to "force Unity to serialize a private field." Unity "only serializes public fields by default," and this "serialization is done with an internal Unity serialization system; not with .NET's serialization functionality."

That last clause is the whole problem: assignment happens in Unity's native serializer, not in C#, so the compiler sees an unassigned private field and the analyzer sees an unread one — yielding `CS0649`/`CS0414`-class warnings and `IDE0052` on values authored in the Inspector and stored in scene or prefab YAML.

The [serialization rules](https://docs.unity3d.com/6000.5/Documentation/Manual/script-serialization-rules.html) require that a field "is `public`, or has a `[SerializeField]` attribute." Related behavior:

- Unity "supports the standard .NET/C# `[Serializable]` and `[NonSerialized]` attributes, but their behavior in Unity is subject to additional Unity-specific considerations."
- `[Serializable]` is mandatory for structs/classes not derived from `UnityEngine.Object`, and "is not automatically inherited by subclasses and must be applied to all classes in a class hierarchy."
- `[NonSerialized]` "also prevents the Inspector from serializing or displaying that field"; `[HideInInspector]` hides without preventing serialization.
- "Serializers in Unity work directly on the fields of your C# classes rather than their properties."
- [`[SerializeReference]`](https://docs.unity3d.com/ScriptReference/SerializeReference.html) "marks a field to be serialized as a reference instead of as a value," making polymorphic subclasses reachable purely through serialized data. **A class with no `new` expression anywhere in the codebase can still be constructed by the deserializer.**
- [`ISerializationCallbackReceiver`](https://docs.unity3d.com/ScriptReference/ISerializationCallbackReceiver.html) methods are invoked by the serializer, never by user code.

### UnityEvent and Inspector-wired methods

[`UnityEvent`](https://docs.unity3d.com/ScriptReference/Events.UnityEvent.html) is "a zero-argument event callback that persists with the Scene and allows the registration of runtime and persistent listeners… You can use this class to add runtime listeners or **define persistent listeners in the Unity Editor**."

Persistent listeners are data, not code. The API confirms the storage model: `GetPersistentEventCount`, `GetPersistentTarget`, and [`GetPersistentMethodName(int index)`](https://docs.unity3d.com/ScriptReference/Events.UnityEventBase.GetPersistentMethodName.html), which returns "the target method name of the listener at index index" — **a string**. Because the binding is an object reference plus a method *name string* serialized into the prefab or scene, renaming or deleting the method produces no compile error; C# compiles cleanly and the wiring is simply gone. A `public void OnButtonPressed()` with zero call sites is the most convincing false positive in any Unity UI codebase.

### String-based and asset-side references

| Mechanism | How the reference is stored | Source |
| --- | --- | --- |
| `SendMessage(string methodName)` | Method name string; "Calls the specified method on every MonoBehaviour attached to the GameObject" | [GameObject.SendMessage](https://docs.unity3d.com/ScriptReference/GameObject.SendMessage.html) |
| `Invoke("Name", t)` / `StartCoroutine("Name")` | Method/coroutine name string | [Invoke](https://docs.unity3d.com/ScriptReference/MonoBehaviour.Invoke.html), [StartCoroutine](https://docs.unity3d.com/ScriptReference/MonoBehaviour.StartCoroutine.html) |
| Animation Events | Function chosen in the Animation window; "Animation Events only support methods with a single parameter" of type `float`, `int`, `string`, object reference, or `AnimationEvent` | [Animation Events](https://docs.unity3d.com/Manual/script-AnimationWindowEvent.html) |
| `Resources.Load(path)` | Case-insensitive path string without extension, relative to any `Resources` folder | [Resources.Load](https://docs.unity3d.com/ScriptReference/Resources.Load.html) |
| Addressables | String address or label key resolved at runtime | [Addressables](https://docs.unity3d.com/Packages/com.unity.addressables@2.3/manual/index.html) |
| Input System actions | Action and map names authored in an asset | [Input System](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.11/manual/index.html) |
| Scene/prefab component binding | `.meta` GUID + `fileID`; Unity "assigns a unique ID to the asset," stores it in the `.meta` file, and those files "must stay with the asset file they relate to" | [Asset metadata](https://docs.unity3d.com/Manual/AssetMetadata.html) |

The GUID mechanism is why a `MonoBehaviour` can look entirely unreferenced in C# while being attached to hundreds of prefabs: scenes reference the `MonoScript` by GUID, and that GUID lives in a hidden `.meta` file most search tooling excludes by default.

### Managed code stripping and IL2CPP

Unity's linker documentation is the engine vendor stating that its own static analysis over-removes. Builds "remove unused or unreachable code through a process called managed code stripping"; the linker "performs a static analysis of the code in your project's assemblies," and critically **"this analysis only includes code that exists at build time because code generated at runtime doesn't exist when Unity performs the static analysis"** ([Managed code stripping](https://docs.unity3d.com/Manual/ManagedCodeStripping.html)).

Stripping "can strip… Entire C# Unity objects such as MonoBehaviour and ScriptableObject instances… Regular C# structures and classes… Portions of classes (for example, methods that aren't used)… Entire Unity modules, such as AI or Physics, if no type from that module is referenced," and the effect "appears in the Player as **null reference exceptions, missing type errors, or crashes**" ([How code stripping affects content](https://docs.unity3d.com/Manual/managed-code-stripping-content.html)).

Levels ([Configure managed code stripping](https://docs.unity3d.com/Manual/managed-code-stripping-configure.html)): **Disabled** removes nothing (Mono only, default there); **Minimal** searches only `UnityEngine` and .NET class libraries with **no user code removed** (IL2CPP default, "least likely to cause unexpected runtime behavior"); **Low** adds user assemblies only if none of their types are referenced in included scenes, and is "marked for future deprecation"; **Medium** partially searches all assemblies and "does increase the risk of unintended consequences"; **High** is the most aggressive.

The escape hatch is annotation in two forms ([Preserving code](https://docs.unity3d.com/Manual/managed-code-stripping-preserving.html)): **root annotations**, where the linker "doesn't strip any code marked as a root" (simple, over-preserves), and **dependency annotations**, which declare connections between code elements. Unity notes annotations "are especially useful when your code references other code through reflection, because the Unity linker can't always detect uses of reflection."

[`[Preserve]`](https://docs.unity3d.com/ScriptReference/Scripting.PreserveAttribute.html) "prevents byte code stripping from removing a class, method, field, or property… sometimes you want some code to not be stripped, **even if it looks like it is not used**. This can happen for instance if you use reflection to call a method, or instantiate an object of a certain class." It works for Mono and IL2CPP, and the stripper "will consider any attribute with the exact name `PreserveAttribute` as a reason not to strip the thing it is applied on, regardless of the namespace or assembly." `link.xml` is the file-based equivalent ([XML formatting reference](https://docs.unity3d.com/Manual/managed-code-stripping-xml-formatting.html)).

**Treat `[Preserve]`, any `PreserveAttribute`, or a `link.xml` entry as a hard stop.** They are recorded declarations that code is needed despite appearing unused; deleting them deletes the answer to the question being asked.

### Assembly definitions and conditional compilation

[Assembly definitions](https://docs.unity3d.com/Manual/ScriptCompilationAssemblyDefinitionFiles.html) split a project into separate managed assemblies to "reduce unnecessary recompilation time" and manage dependencies. The consequence is direct: every `public` member becomes API surface consumable by any referencing assembly, and IDE0051/IDE0052 — private-only by design — never evaluate it. Cross-assembly analysis requires whole-solution search including Editor and test assemblies.

[Platform-dependent compilation](https://docs.unity3d.com/Manual/PlatformDependentCompilation.html) uses directives "handled during the compilation process, rather than at runtime," so excluded code "is omitted entirely" from that build. Symbols include `UNITY_EDITOR`, `UNITY_STANDALONE_WIN`, `UNITY_ANDROID`, `UNITY_IOS`, `DEVELOPMENT_BUILD`. A method referenced **only** inside `#if UNITY_ANDROID` is invisible to Editor-scoped analysis. Every reference query is implicitly scoped to one define set; state which platform the analysis reflects, or search raw text instead of the semantic model.

## The false-positive matrix

| Unity pattern | Why static analysis marks it dead | Required verification before deletion |
| --- | --- | --- |
| MonoBehaviour message (`Update`, `OnTriggerEnter`, `OnValidate`…) | Engine-invoked by convention; zero C# call sites | Match against [MonoBehaviour Messages](https://docs.unity3d.com/ScriptReference/MonoBehaviour.html) and [execution order](https://docs.unity3d.com/Manual/ExecutionOrder.html). A match means not dead — stop |
| `[SerializeField] private` field | Assigned by the native serializer, not C#; triggers `CS0649`/`IDE0052` | Grep `.unity`/`.prefab`/`.asset` for the field name; open a prefab and confirm the authored value |
| `[SerializeReference]` subclass with no `new` | Constructed by the deserializer from serialized type data | Grep scene/prefab/asset YAML for the assembly-qualified type name |
| `public void OnClick()` wired in Inspector | UnityEvent stores a method **name string** as a persistent listener | Grep all `.prefab`/`.unity`/`.asset` for the method name; renaming breaks silently |
| `MonoBehaviour` with no C# reference | Scenes/prefabs bind the `MonoScript` by GUID from a hidden `.meta` file | Read the `.meta` GUID, then grep all YAML assets for it |
| `SendMessage`/`Invoke`/`StartCoroutine("Name")` target | Call site is a string literal | Grep the solution for the method name in quotes |
| Animation Event target | Function name stored in the clip | Grep `.anim`/`.controller` and FBX metadata for the method name |
| `Resources.Load` / Addressables asset | Path or address is a runtime string | Grep for the path fragment and Addressables group/label definitions |
| `[MenuItem]`, `[ContextMenu]`, `[InitializeOnLoad(Method)]` | Entry point is a menu or domain reload | Attribute presence is proof of use — stop |
| `[RuntimeInitializeOnLoadMethod]` | Invoked during engine startup | Attribute presence is proof of use — stop |
| `[Preserve]` / `link.xml` entry | An engineer already recorded that it survives only by annotation | Never delete without an explicit human decision |
| `public` member in an `.asmdef` assembly | IDE0051/IDE0052 are private-only and never evaluate it | Whole-solution search across runtime, Editor, and test assemblies |
| Code inside `#if UNITY_ANDROID` | Excluded from the current define set | Re-run per target platform, or use raw text search |
| Reflection / DI / `Activator.CreateInstance` target | Documented as unanalyzable by .NET's own trimmer | Grep the type name as a string; check container registrations and [trimming incompatibilities](https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/incompatibilities) |
| `ISerializationCallbackReceiver` implementation | Called by the serializer | Interface implementation is proof of use — stop |

## What an agent can actually verify

Each check proves something bounded. State which check ran and what it establishes; never let a weaker check pose as a stronger one.

**1. Whole-tree textual search.** Search all of `Assets/`, not just `.cs`:

```bash
grep -rn --include='*.cs' --include='*.unity' --include='*.prefab' \
        --include='*.asset' --include='*.controller' --include='*.anim' \
        --include='*.playable' --include='*.mat' --include='*.shader' \
        --include='*.inputactions' \
        'PlayerHealthController' Assets/ ProjectSettings/
```

*Proves:* the identifier appears nowhere as text. *Does not prove:* absence of GUID or computed-string references.

**2. GUID reachability** for any `UnityEngine.Object`-derived type:

```bash
grep -m1 'guid:' Assets/Scripts/PlayerHealthController.cs.meta
grep -rn '<the-guid>' Assets/ ProjectSettings/
```

*Proves:* no scene, prefab, or asset instantiates the component. Decisive for `MonoBehaviour` types and unskippable, because scenes never store the class name.

**3. String-literal search** for `SendMessage`, `Invoke`, `StartCoroutine`, `Resources.Load`, Addressables keys, and reflection: `grep -rn --include='*.cs' '"ApplyDamage"' Assets/`. *Proves:* no literal string invocation. *Does not prove:* absence of composed names (`"Apply" + verb`) or names read from a data table.

**4. Annotation and suppression audit.** Search the member and its type for `[Preserve]`, any `PreserveAttribute`, `link.xml` entries, `#pragma warning disable`, `[SuppressMessage]`, and EditorConfig `severity = none`. *Proves:* whether a human already adjudicated this exact question.

**5. Per-platform compilation** for every shipped platform, not just the Editor define set. *Proves:* the member is unreferenced under those defines.

**6. A player build at the project's real stripping level.** *Proves:* the change compiles and links under the shipping configuration. It does **not** prove runtime correctness — stripping failures appear as null reference exceptions, missing type errors, or crashes, which requires *running* the build.

**7. Play-mode exercise** of the affected scenes and prefabs. *Proves:* Inspector wiring and serialized data still resolve. This is the only check that catches a broken UnityEvent persistent listener, because that failure is silent at every earlier stage.

Unity documents the asymmetry: content can work "when testing in Play mode, or on builds with minimal code stripping," while "errors or crashes occur in a Player built with code stripping enabled" ([How code stripping affects content](https://docs.unity3d.com/Manual/managed-code-stripping-content.html)). Play mode and a stripped player build are not substitutes; a confident deletion needs both.

## Separating slop from false positives

Dead-code tooling asks "is this reachable?" Slop review asks "should this exist?" Conflating them is the most common analytical error. Genuine slop is established by *reading* code: an empty `Update()` or `Start()` body (a per-frame native-to-managed call for zero behavior), two near-identical `MonoBehaviour`s differing by a constant, a single-implementer interface with no test double and no `[SerializeReference]` or DI role, or a comment restating the line below it. By contrast, an unreferenced `public` method in an `.asmdef` is **unknown, not slop**, and a `[SerializeField]` field flagged by IDE0052 is **almost certainly a false positive**. Never present a reachability conclusion as if it were a slop conclusion.

## Never delete Unity C# code without all of the following

1. **The name is not a MonoBehaviour message**, verified against [MonoBehaviour Messages](https://docs.unity3d.com/ScriptReference/MonoBehaviour.html) and [execution order](https://docs.unity3d.com/Manual/ExecutionOrder.html).
2. **No engine-invocation attribute** — none of `[SerializeField]`, `[SerializeReference]`, `[RuntimeInitializeOnLoadMethod]`, `[InitializeOnLoad]`, `[InitializeOnLoadMethod]`, `[MenuItem]`, `[ContextMenu]`, `[Preserve]`, or any `PreserveAttribute` from any namespace.
3. **No engine-invoked interface**, notably `ISerializationCallbackReceiver`.
4. **Whole-tree text search found the identifier nowhere** in `.cs`, `.unity`, `.prefab`, `.asset`, `.controller`, `.anim`, `.playable`, `.mat`, `.shader`, `.inputactions`, or `ProjectSettings/`.
5. **For any `UnityEngine.Object`-derived type, its `.meta` GUID appears in no serialized asset.**
6. **No matching string literal anywhere**, covering `SendMessage`, `Invoke`, `StartCoroutine`, Animation Events, `Resources.Load`, Addressables keys, and reflection.
7. **No `link.xml` entry, `#pragma warning disable`, `[SuppressMessage]`, or EditorConfig suppression** references it — and if one does, a human has been asked.
8. **Unreferenced under every shipped platform define set**, not only the Editor's.
9. **For anything `public` in an `.asmdef` assembly**, a whole-solution search across runtime, Editor, and test assemblies came back empty. IDE0051/IDE0052 do not count; they are private-only.
10. **A player build at the project's actual stripping level succeeds and the affected content was exercised** in a run, not merely compiled.

If any one of these cannot be established, report the finding as a candidate with its unresolved check — do not delete.

