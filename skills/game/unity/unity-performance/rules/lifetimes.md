# Rules: lifetimes

Adapted from CyberAgent's unity-perf-review (MIT); see [NOTICE](../NOTICE.md).

### LT01 CancellationTokenSource without a using
- Level: Warning
- Scope: any
- When: -
- Files: *.cs
- Code: runtime
- Check: `^(?!.*\busing\b).*\bnew\s+CancellationTokenSource\(`
- Reason: A `CancellationTokenSource` holds timers and callback registrations until it is disposed; registered on a long-lived token, it keeps short-lived objects reachable. A missing `Dispose` retains memory only while such a long-lived source stays alive.
- Fix: Use `using var` for a source scoped to a method; for one held in a field, dispose the old instance before replacing it and the last one in `OnDestroy`. See [architecture.md](../../unity-core/architecture.md#async).
- Source: [UniTask and lifetime management of cancellation](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/inada-taketo-1.html)

### LT02 Linked token source without a using
- Level: Warning
- Scope: any
- When: -
- Files: *.cs
- Code: runtime
- Check: `^(?!.*\busing\b).*\bCreateLinkedTokenSource\(`
- Reason: The linked source registers a callback on each source token, so a long-lived token keeps the linked source, and through it the short-lived token's owner, reachable. An already canceled linked source can still be registered on the other token.
- Fix: Declare the result with `using var`, scoped to the operation that uses it. See [architecture.md](../../unity-core/architecture.md#async).
- Source: [UniTask and lifetime management of cancellation](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/inada-taketo-1.html)

### LT03 Token registration never disposed
- Level: Warning
- Scope: any
- When: -
- Files: *.cs
- Code: runtime
- Check: `^(?!.*\busing\b).*(?:[Tt]oken|\bct)\.Register\(`
- Reason: The token's source holds the callback and everything it captures until the registration is disposed or the source cancels.
- Fix: Keep the `CancellationTokenRegistration` and dispose it when the callback's scope ends: `using var` around an await, or the owner's teardown for a field. See [architecture.md](../../unity-core/architecture.md#async).
- Source: [UniTask and lifetime management of cancellation](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/inada-taketo-1.html)

### LT04 Asset load outside the project loader
- Level: Warning
- Scope: any
- When: -
- Files: *.cs
- Code: runtime
- Check: `\.(LoadAssetAsync|LoadAssetsAsync|LoadResourceLocationsAsync)\b|(?<!Object)\.InstantiateAsync\b|(?<!SceneManager)\.LoadSceneAsync\b|\bAssetBundle\.LoadFrom\w*\(`
- Reason: Loads scattered through feature code each own their release, so missed releases leave assets resident. Hits inside the project loader itself are expected.
- Fix: Load through the project loader with the lifetime declared at the call site, or await with `ToAwaitable(destroyCancellationToken)` so cancellation releases the handle. See [assets.md](../../unity-core/assets.md#addressables).
- Source: [Unity Performance Tuning Tips 2026, chapter III.1](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/inada-taketo-2.html)

### LT05 Loader API without a declared lifetime
- Level: Warning
- Scope: any
- When: -
- Files: *Loader*.cs, *AssetProvider*.cs, *AssetManager*.cs, *Lifetime*.cs
- Code: runtime
- Check: MANUAL
- Reason: When a load does not fix its lifetime, release depends on each caller remembering it, and assets stay resident.
- Fix: Make every load take a lifetime (session, scene, screen or dialog, or a game-defined period), as a parameter or one method per lifetime, and release everything registered to a lifetime when it ends. See [assets.md](../../unity-core/assets.md#addressables).
- Source: [Unity Performance Tuning Tips 2026, chapter III.1](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/inada-taketo-2.html)

### LT06 Load that completes after its lifetime ended
- Level: Warning
- Scope: any
- When: -
- Files: *Loader*.cs, *AssetProvider*.cs, *AssetManager*.cs, *Lifetime*.cs
- Code: runtime
- Check: MANUAL
- Reason: An async load still in flight when its screen or scene ends returns a handle nobody releases. An asset shared by several lifetimes needs a reference count.
- Fix: Track each load from its start, and cancel it or release the result on completion when its lifetime has ended; release shared assets on the last user. See [assets.md](../../unity-core/assets.md#addressables).
- Source: [Unity Performance Tuning Tips 2026, chapter III.1](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/inada-taketo-2.html)

### LT07 Lifetime scope component that accepts handles after destroy
- Level: Warning
- Scope: any
- When: -
- Files: *Scope*.cs, *Lifetime*.cs
- Code: runtime
- Check: MANUAL
- Reason: A component that releases its handles in `OnDestroy` leaks any handle added later by a load that completes after the destroy.
- Fix: Set a released flag in `OnDestroy` and dispose handles added after it at once; use one scope component per screen or dialog, not one per asset. See [assets.md](../../unity-core/assets.md#addressables).
- Source: [Unity Performance Tuning Tips 2026, chapter III.1](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/inada-taketo-2.html)

### LT08 Awaitable wait without a cancellation token
- Level: Warning
- Scope: any
- When: -
- Files: *.cs
- Code: runtime
- Check: `\bAwaitable\.(NextFrameAsync|EndOfFrameAsync|FixedUpdateAsync)\(\s*\)|\bAwaitable\.WaitForSecondsAsync\([^,()]*\)`
- Reason: Without a token, the wait resumes after its component is destroyed and keeps the component and everything it references alive until the method ends.
- Fix: Pass `destroyCancellationToken`, or a token scoped to the work. See [architecture.md](../../unity-core/architecture.md#async).
- Source: [architecture.md](../../unity-core/architecture.md#async)

### LT09 Synchronous wait on an async load
- Level: Warning
- Scope: any
- When: -
- Files: *.cs
- Code: runtime
- Check: `\.WaitForCompletion\(\s*\)`
- Reason: The main thread blocks until the load finishes, including any download and dependency loads, which shows as a frame spike.
- Fix: Await the load through `ToAwaitable(destroyCancellationToken)` instead. See [assets.md](../../unity-core/assets.md#addressables).
- Source: [assets.md](../../unity-core/assets.md#addressables)

### LT10 Resources folder load
- Level: Warning
- Scope: any
- When: -
- Files: *.cs
- Code: runtime
- Check: `\bResources\.(Load|LoadAsync|LoadAll)\b`
- Reason: Everything under `Resources/` ships in the player and is indexed at startup whether or not it is used, and loads there have no lifetime the project loader can release.
- Fix: Load through Addressables with an `AssetReference`. See [assets.md](../../unity-core/assets.md#addressables).
- Source: [assets.md](../../unity-core/assets.md#addressables)
