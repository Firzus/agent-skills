# Rules: animation

Adapted from CyberAgent's unity-perf-review (MIT); see [NOTICE](../NOTICE.md).

### AN01 Rigged model imported without Optimize Game Objects
- Level: Warning
- Scope: any
- When: -
- Code: any
- Check: EDITOR
- Reason: Every bone stays a GameObject with a Transform that skinning and write-back must update. Measured on a 166-bone character (24 Transforms once optimized; desktop player, IL2CPP): 300 characters cut `MeshSkinning.Update` from 6.23 to about 1.5 ms and removed 36.6 ms of `CalcMatrices` across threads; 600 single-renderer characters cut frame time from 6.797 to 5.991 ms (-11.9%). Frame time does not move when the render thread is the bottleneck.
- Fix: Enable Optimize Game Objects on the Rig tab, expose only the bones scripts read, or call `AnimatorUtility.OptimizeTransformHierarchy` at spawn for a model you cannot reimport. See [performance.md](../../unity-core/performance.md#animation).
- Source: [Character animation](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/saito-shunsuke-1.html)

### AN02 One manual PlayableGraph per character
- Level: Critical
- Scope: any
- When: -
- Files: *.cs
- Code: runtime
- Check: `SetTimeUpdateMode\s*\(\s*DirectorUpdateMode\.Manual\s*\)`
- Reason: A manual graph parallelizes only inside itself, so one graph per character evaluates every `Evaluate()` in series on the main thread. With 600 characters and renderers off, per-character graphs took 8.396 ms against 4.500 ms for one shared graph (desktop player, IL2CPP).
- Fix: Keep characters in the batched update (`Animator` or `DirectorUpdateMode.GameTime`), or drive them from one shared manual graph with one output per character. See [performance.md](../../unity-core/performance.md#animation).
- Source: [Character animation](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/saito-shunsuke-1.html)

### AN03 Animator updated by hand
- Level: Critical
- Scope: frame
- When: -
- Files: *.cs
- Code: runtime
- Check: `\w*[Aa]nimator\w*\.Update\s*\(\s*(?!0(?:\.0*)?f?\s*\))`
- Reason: `Animator.Update(dt)` evaluates synchronously on the main thread and leaves the job-parallel batch. Measured main-thread cost rose from 6.7 to about 15.4 µs per character, so thinning to every second frame saved only 4.1% of frame time, against 33.5% by toggling `Animator.enabled` (600 characters, desktop player, IL2CPP).
- Fix: Thin updates by toggling `Animator.enabled` on a phase-offset schedule, or evaluate one bucketed manual graph per frame. `Update(0f)` right after a reset is fine. See [performance.md](../../unity-core/performance.md#animation).
- Source: [Character animation](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/saito-shunsuke-1.html)

### AN04 Animator toggled without keepAnimatorStateOnDisable
- Level: Critical
- Scope: frame
- When: -
- Files: *.cs
- Code: runtime
- Check: `\w*[Aa]nimator\w*\.enabled\s*=`
- Reason: With the default `keepAnimatorStateOnDisable = false`, each disable rewinds the controller state, so a character thinned by toggling never advances. Confirm the file sets the flag and scales `speed` by the interval.
- Fix: At init, set `keepAnimatorStateOnDisable = true` and `speed` to the update interval; keep close-up characters at full rate. See [performance.md](../../unity-core/performance.md#animation).
- Source: [Character animation](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/saito-shunsuke-1.html)

### AN05 Thinned update with no phase offset
- Level: Warning
- Scope: frame
- When: -
- Files: *.cs
- Code: runtime
- Check: `[Ff]rame\w*\s*%\s*\w+\s*==\s*0\b`
- Reason: When every character tests the same frame counter, all of them update on the same frame and the spike returns every N frames. With 600 characters at 1/4 rate, p95 frame time was 9.470 ms (standard deviation 3.863) without offset and 2.707 ms (0.185) with it (desktop player, IL2CPP).
- Fix: Compare against a per-character slot, `(frame + index) % interval == 0`, so 1/N of the characters update each frame; judge the result on p95 and standard deviation, not the median. See [performance.md](../../unity-core/performance.md#animation).
- Source: [Character animation](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/saito-shunsuke-1.html)

### AN06 Procedural bone work in LateUpdate on many characters
- Level: Warning
- Scope: frame
- When: -
- Files: *.cs
- Code: runtime
- Check: MANUAL
- Reason: IK or look-at code that rewrites bone Transforms in `LateUpdate` runs entirely on the main thread. With 300 characters and 64 Two-Bone IK solves each, `LateUpdate` added 6.498 ms to the frame and an `IAnimationJob` added 0.199 ms (desktop player, IL2CPP). Each job node has a fixed cost (about 2.16 ms for 300 characters), so light work stays cheaper in `LateUpdate`.
- Fix: For heavy per-character bone work, move it into an `IAnimationJob` in an `AnimationScriptPlayable` and bind bones with `BindStreamTransform`. See [performance.md](../../unity-core/performance.md#animation).
- Source: [Character animation](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/saito-shunsuke-1.html)

### AN07 Animation job relying on Burst alone
- Level: Info
- Scope: any
- When: -
- Files: *.cs
- Code: runtime
- Check: `struct\s+\w+\s*:[^{]*\bIAnimationJob\b`
- Reason: An `IAnimationJob` sees one character's stream, its reads and writes chain each iteration, and transcendental math blocks vectorization, so `[BurstCompile]` cut total CPU by only 11% with no frame time change in the measured IK case (300 characters, desktop player, IL2CPP).
- Fix: Expect the gain from leaving the main thread. For more, batch many characters into one parallel job with a SoA layout and branchless math, and confirm vectorization in the Burst Inspector. See [architecture.md](../../unity-core/architecture.md#jobs-burst-ecs).
- Source: [Character animation](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/saito-shunsuke-1.html)

### AN08 Code walking bones of an optimized hierarchy
- Level: Warning
- Scope: any
- When: -
- Files: *.cs, *.fbx.meta
- Code: runtime
- Check: MANUAL
- Reason: With Optimize Game Objects on, bones are no longer GameObjects, so `transform.Find` paths or child walks that reach a bone return nothing and the feature breaks.
- Fix: List the bones the code needs in Extra Transforms to Expose; use `AnimatorUtility.DeoptimizeTransformHierarchy` only to debug. See [performance.md](../../unity-core/performance.md#animation).
- Source: [Character animation](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/saito-shunsuke-1.html)

### AN09 Pooled Animator reset by Rebind
- Level: Warning
- Scope: any
- When: -
- Files: *.cs
- Code: runtime
- Check: `\w*[Aa]nimator\w*\.Rebind\s*\(|Pool<\s*Animator\s*>`
- Reason: A pooled character keeps its previous state, parameters, and pending Triggers. Resetting it with `Rebind`, or deactivating the GameObject so reactivation rebinds, pays the full binding cost on every reuse.
- Fix: Keep the pooled GameObject active, disable its `Animator` and `Renderer` on release, and call `Animator.ResetControllerState(true)` from `actionOnRelease`. See [performance.md](../../unity-core/performance.md#animation).
- Source: [Animator pooling](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/shiotsuka-yuki-1.html)

### AN10 State left behind by ResetControllerState
- Level: Warning
- Scope: any
- When: -
- Files: *.cs
- Code: runtime
- Check: `ResetControllerState\s*\(`
- Reason: The call resets layer states and parameters only. Layer weights set with `SetLayerWeight`, `speed`, `StateMachineBehaviour` fields, and other components keep their old values, and `GetCurrentAnimatorStateInfo` reports the old state until the next evaluation.
- Fix: After the reset, restore layer weights, `speed`, and game state explicitly; call `Update(0f)` when code reads the state info right after reuse. See [performance.md](../../unity-core/performance.md#animation).
- Source: [Animator pooling](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/shiotsuka-yuki-1.html)

### AN12 Fragments animated as separate renderers
- Level: Critical
- Scope: any
- When: -
- Files: *.prefab, *.unity, *.fbx.meta
- Code: any
- Check: MANUAL
- Reason: Each fragment moved by an Animator is its own Transform and draw. A building collapse of 1,315 fragments, 16 copies, on a Pixel 8a (Vulkan) took 154.3 ms of main thread (76.17 ms in `SRPBatcher.Flush`), about 210,000 draws per frame, and 411.8 MB of extra GPU memory; one skinned mesh took 16.5 ms and VAT 12.6 ms with 99 draws and no extra memory. GPU time favored skinning (22.2 ms) over VAT (32.5 ms).
- Fix: Merge the fragments into one mesh: VAT when the main thread or memory is the limit, GPU skinning when the GPU is the limit with many vertex passes. See [performance.md](../../unity-core/performance.md#many-copies-of-a-fixed-animation).
- Source: [VAT](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/tatami-yuuki-1.html)

### AN13 Compressed VAT texture
- Level: Critical
- Scope: any
- When: vat
- Files: *.exr, *.png, *.exr.meta, *.png.meta
- Code: any
- Check: MANUAL
- Reason: VAT textures store vertex positions and rotations; compression destroys the precision and the animation breaks.
- Fix: Import VAT textures uncompressed with the SideFX VAT package's import settings, applied by a preset or `AssetPostprocessor`. See [performance.md](../../unity-core/performance.md#many-copies-of-a-fixed-animation).
- Source: [VAT](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/tatami-yuuki-1.html)

### AN14 VAT Shader Graph used from the package
- Level: Warning
- Scope: any
- When: vat
- Files: *.shadergraph, *.mat
- Code: any
- Check: MANUAL
- Reason: The SideFX package's Shader Graphs are templates; a material on the package graph, or a project copy still referencing the package's Sub Graphs, changes when the package updates.
- Fix: Copy the graphs into the project and repoint the copies' Sub Graph references to the project copies. See [performance.md](../../unity-core/performance.md#many-copies-of-a-fixed-animation).
- Source: [VAT](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/tatami-yuuki-1.html)
