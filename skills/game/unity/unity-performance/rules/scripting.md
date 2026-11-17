# Rules: scripting

Adapted from CyberAgent's unity-perf-review (MIT); see [NOTICE](../NOTICE.md).

### CS01 LINQ on a per-frame path
- Level: Critical
- Scope: frame
- When: -
- Files: *.cs
- Code: runtime
- Check: `\.(Where|Select|SelectMany|OrderBy|OrderByDescending|GroupBy|Distinct|ToList|ToArray|ToDictionary|Any|All|First|FirstOrDefault|Last|Count|Aggregate)\(`
- Reason: Each call allocates an enumerator and delegates, and boxes value types through interfaces; one benchmark in the book measured a LINQ version about 19 times slower than the equivalent loop. At 60 FPS the garbage turns into GC hitches.
- Fix: Loop over a cached collection, or move the work to init. See [architecture.md](../../unity-core/architecture.md#allocations).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### CS02 String building on a per-frame path
- Level: Warning
- Scope: frame
- When: -
- Files: *.cs
- Code: runtime
- Check: `\$"|\bstring\.(Format|Concat|Join)\(|"\s*\+\s*\w|\w\s*\+\s*"`
- Reason: Every interpolation, format, or concatenation that involves a variable allocates a new string. Concatenating two literals is folded at compile time and costs nothing.
- Fix: Update UI text through the non-allocating `TextElement.SetText` overloads, see [unity-ui](../../unity-ui/SKILL.md#performance); elsewhere reuse a `StringBuilder` or format into a `Span<char>`.
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### CS03 Task-based async where Awaitable is the default
- Level: Warning
- Scope: any
- When: -
- Files: *.cs
- Code: runtime
- Check: `\basync\s+(Task|ValueTask)\b|\bTask\.(Run|Delay|Yield)\(`
- Reason: A `Task` method that suspends boxes its state machine and allocates a task on every call, so a frequent or per-frame async path produces steady garbage. `Task.Delay` runs on wall-clock time and ignores `Time.timeScale`, and `Task.Run` leaves the PlayerLoop.
- Fix: Return `Awaitable` with a `CancellationToken`, and use `BackgroundThreadAsync` for off-thread work; use UniTask only where the project adopted it. See [architecture.md](../../unity-core/architecture.md#async).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### CS04 Override in a class that could be sealed
- Level: Info
- Scope: any
- When: -
- Files: *.cs
- Code: runtime
- Check: `\b(public|protected|internal)\s+override\s`
- Reason: A virtual call on a sealed type, or on a `sealed override`, can compile to a direct call. IL2CPP and the CoreCLR JIT already devirtualize some calls on their own, so the gain is small and only shows on hot calls.
- Fix: Seal the class when nothing derives from it, or mark the member `sealed override`.
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### CS05 Value type boxed to object
- Level: Warning
- Scope: frame
- When: -
- Files: *.cs
- Code: runtime
- Check: `\(object\)\s*\w|\bEquals\(object\b`
- Reason: Converting a struct to `object` copies it to the heap. A struct without `IEquatable<T>` boxes on every `Equals` and dictionary lookup through `Equals(object)`.
- Fix: Implement `IEquatable<T>` on structs used as keys or compared, and constrain generics with `where T : IEquatable<T>`. See [architecture.md](../../unity-core/architecture.md#allocations).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### CS06 Lambda passed as an argument
- Level: Warning
- Scope: frame
- When: -
- Files: *.cs
- Code: runtime
- Check: `(?:[(,]|[^=!<>]=)\s*(?:\([^()]*\)|\w+)\s*=>`
- Reason: A lambda that captures a local, a parameter, or `this` allocates a closure and a delegate each time the enclosing method runs. Passing a method group also allocates a delegate per call with the C# 9 compiler.
- Fix: Keep the lambda capture-free and pass state as an argument, or create the delegate once in a field at init. See [architecture.md](../../unity-core/architecture.md#allocations).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### CS07 params array method
- Level: Warning
- Scope: any
- When: -
- Files: *.cs
- Code: runtime
- Check: `\bparams\s+[\w.<>]+\[\]`
- Reason: Every call allocates an array for the arguments, which matters when the method is called on a frequent path.
- Fix: Add overloads for the common argument counts, or take a `ReadOnlySpan<T>`.
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### CS08 Collection allocated without reuse or capacity
- Level: Warning
- Scope: frame
- When: -
- Files: *.cs
- Code: runtime
- Check: `\bnew\s+(List|Dictionary|HashSet|Queue|Stack)<.+?>\(`
- Reason: A collection created on a per-frame path is garbage on the next frame. Without an initial capacity, each growth copies into a new buffer and leaves the old one to the GC.
- Fix: On a per-frame path reuse a field or rent from `CollectionPool` / `ListPool<T>` in `UnityEngine.Pool`; elsewhere pass a capacity when the size is known. See [architecture.md](../../unity-core/architecture.md#allocations).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### CS09 Collection exposed through an interface type
- Level: Info
- Scope: any
- When: -
- Files: *.cs
- Code: runtime
- Check: `\b(IEnumerable|ICollection|IList|IReadOnlyList|IReadOnlyCollection)<[\w.<>, ]+>\s+\w+\s*[,)=;{]`
- Reason: `foreach` over a `List<T>` or an array uses a struct enumerator and allocates nothing; over the same list typed as an interface it boxes the enumerator on every loop. A custom collection without a struct enumerator allocates the same way.
- Fix: Type the variable or parameter as the concrete collection on per-frame paths, or loop with `for` over `IReadOnlyList<T>` by index.
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### CS10 Small temporary array on the heap
- Level: Info
- Scope: frame
- When: -
- Files: *.cs
- Code: runtime
- Check: `\bnew\s+(byte|sbyte|short|ushort|int|uint|long|ulong|float|double|char|bool)\[\s*\d+\s*\]`
- Reason: A fixed-size scratch array allocated per call is garbage every frame, while stack memory costs nothing to free.
- Fix: Use `Span<T> buffer = stackalloc T[n];` for small buffers (a few hundred bytes), or a field allocated once.
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### CS11 Static collection that grows
- Level: Warning
- Scope: any
- When: -
- Files: *.cs
- Code: runtime
- Check: `\bstatic\s+(readonly\s+)?(List|Dictionary|HashSet|Queue|Stack|ConcurrentDictionary)<`
- Reason: A static collection is a GC root: whatever it holds stays alive until it is cleared, and without Domain Reload it keeps the previous Play Mode session's entries. A fixed, read-only cache is fine.
- Fix: Clear it when its owner shuts down, and give the type `[AutoStaticsCleanup]`. See [runtime.md](../../unity-core/runtime.md#static-state).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### CS12 Exception thrown on a per-frame path
- Level: Warning
- Scope: frame
- When: -
- Files: *.cs
- Code: runtime
- Check: `\bthrow\s+new\s+[\w.]*Exception\(`
- Reason: Throwing allocates the exception, captures a stack trace, and unwinds the stack. Argument validation on a cold path is fine.
- Fix: On per-frame paths test first and use a `Try` method that returns a bool.
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### CS13 ToString on a per-frame path
- Level: Warning
- Scope: frame
- When: -
- Files: *.cs
- Code: runtime
- Check: `\.ToString\(`
- Reason: Every call allocates a string; on an enum or a struct that does not override `ToString` it also boxes.
- Fix: Cache the strings, or pass numbers straight to the non-allocating `TextElement.SetText` overloads. See [unity-ui](../../unity-ui/SKILL.md#performance).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### CS14 Enum helper that allocates
- Level: Info
- Scope: frame
- When: -
- Files: *.cs
- Code: runtime
- Check: `\.HasFlag\(|\bEnum\.(GetValues|GetNames|GetName|Parse|TryParse|IsDefined)\b`
- Reason: `Enum.GetValues` and `GetNames` allocate a new array per call, and parsing allocates. `HasFlag` is a plain bit test on CoreCLR; whether it boxes under IL2CPP depends on the version, so measure on the device.
- Fix: Cache enum arrays and names at init, and test flags with `(flags & Flag) != 0`.
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### CS15 Mutable struct declaration
- Level: Info
- Scope: any
- When: -
- Files: *.cs
- Code: runtime
- Check: `^\s*(?:(?:public|internal|private|protected|unsafe|partial)\s+)*struct\s+\w+`
- Reason: A struct copies on every assignment and by-value pass, which adds up past 16 bytes. Passing a non-readonly struct with `in` makes the compiler insert defensive copies.
- Fix: Declare value types `readonly struct` where possible, and pass large ones by `in` or `ref`.
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### US01 Empty or unneeded Unity message
- Level: Warning
- Scope: any
- When: -
- Files: *.cs
- Code: runtime
- Check: `\bvoid\s+(Update|LateUpdate|FixedUpdate|OnGUI)\s*\(\s*\)`
- Reason: Unity calls each message from native code on every instance every frame, even when the body is empty.
- Fix: Delete messages with an empty or template body.
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### US02 GetComponent on a per-frame path
- Level: Critical
- Scope: frame
- When: -
- Files: *.cs
- Code: runtime
- Check: `\b(Try)?GetComponents?(InChildren|InParent)?\s*(<|\(\s*typeof)`
- Reason: Each call crosses into native code and searches the GameObject's component list by type; the plural forms also allocate an array.
- Fix: Cache the reference in `Awake` or a serialized field. See [architecture.md](../../unity-core/architecture.md#allocations).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### US03 Scene search at runtime
- Level: Critical
- Scope: frame
- When: -
- Files: *.cs
- Code: runtime
- Check: `\bGameObject\.Find(WithTag|GameObjectsWithTag)?\(|\bFind(AnyObjectByType|FirstObjectByType|ObjectsByType|ObjectOfType|ObjectsOfType)\b`
- Reason: These calls scan the loaded scenes, so their cost grows with object count. A single call during initialization is tolerable; per-frame or frequent calls are not.
- Fix: Resolve references through serialized fields, injection, or a registry filled at init. See [architecture.md](../../unity-core/architecture.md#code-structure).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### US04 Tag compared as a string
- Level: Warning
- Scope: frame
- When: -
- Files: *.cs
- Code: runtime
- Check: `\.tag\s*[!=]=|[!=]=\s*[\w.]+\.tag\b|\.tag\.Equals\(`
- Reason: Reading `GameObject.tag` allocates a new string on each access.
- Fix: Use `CompareTag("Name")`.
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### US05 Verbose log shipped in release
- Level: Warning
- Scope: frame
- When: -
- Files: *.cs
- Code: runtime
- Check: `\bDebug\.Log(Format|Warning|WarningFormat)?\(`
- Reason: `Debug.Log` runs in release players: it builds its string and captures a stack trace even with logging disabled or the console closed. One call inside the project's log wrapper is the expected exception.
- Fix: Log through the project's leveled wrapper, whose verbose methods carry `[Conditional]` so release builds strip the call and its arguments. See [workflow.md](../../unity-core/workflow.md#testing).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### US06 Instantiate or Destroy at runtime
- Level: Warning
- Scope: frame
- When: -
- Files: *.cs
- Code: runtime
- Check: `\b(Instantiate|Destroy|DestroyImmediate)\s*[<(]`
- Reason: Creating and destroying objects costs native setup, allocations, and later GC work; projectiles and effects spawned this way are a common source of hitches.
- Fix: Spawn from an `ObjectPool<T>` in `UnityEngine.Pool`. See [architecture.md](../../unity-core/architecture.md#allocations).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### US07 Coroutine where Awaitable is the default
- Level: Warning
- Scope: any
- When: -
- Files: *.cs
- Code: runtime
- Check: `\bStartCoroutine\(|\byield\s+return\s+new\s+Wait`
- Reason: `StartCoroutine` allocates the iterator and a `Coroutine` object, and each `yield return new WaitForSeconds` allocates again. `Awaitable` instances are pooled.
- Fix: Write the sequence as an `async Awaitable` method with `Awaitable.WaitForSecondsAsync` or `NextFrameAsync` and `destroyCancellationToken`. See [architecture.md](../../unity-core/architecture.md#async).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### US09 SendMessage
- Level: Critical
- Scope: any
- When: -
- Files: *.cs
- Code: runtime
- Check: `\b(SendMessage|SendMessageUpwards|BroadcastMessage)\(`
- Reason: The call finds its target method by name through reflection on every component, and the string name defeats static checks and code stripping.
- Fix: Call through an interface or a C# event.
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### US10 Animator or shader property set by name
- Level: Warning
- Scope: frame
- When: -
- Files: *.cs
- Code: runtime
- Check: `\.(SetFloat|SetBool|SetTrigger|SetInteger|GetFloat|GetBool|GetInteger|ResetTrigger|Play|CrossFade|CrossFadeInFixedTime|SetVector|SetColor|SetTexture|SetMatrix|SetBuffer|SetGlobalFloat|SetGlobalVector|SetGlobalColor|SetGlobalTexture)\(\s*"`
- Reason: The string overloads hash the name on every call.
- Fix: Hash once into `static readonly int` fields with `Animator.StringToHash` or `Shader.PropertyToID`, and pass the ID.
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### US11 ParticleSystem.Simulate over a long duration
- Level: Warning
- Scope: any
- When: -
- Files: *.cs
- Code: runtime
- Check: `^(?!.*[Pp]hysics).*\.Simulate\(`
- Reason: `Simulate` fast-forwards synchronously on the calling frame, and cost grows with the duration. With the Noise module, `Simulate(20f, false, false)` called the Noise job about 2,000 times and caused a spike of about 50 ms (device not stated). Critical when the system uses Noise.
- Fix: Keep the duration short or avoid it on Noise systems, and profile the call. See [performance.md](../../unity-core/performance.md#particles).
- Source: [Long ParticleSystem Simulate causes a huge spike](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/kato-yuya-1.html)
