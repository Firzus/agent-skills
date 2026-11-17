# Performance: animation, particles, stripping, LTO, iOS memory

Rules for the costs that show up on device: many animated characters,
particle fast-forwards, managed code stripping, link-time optimization, and
iOS memory limits. The
measurements behind them come from CyberAgent's *Unity Performance Tuning Tips
2026*; each section links its chapter. Numbers there were taken on specific
devices and earlier engine releases: re-measure before quoting a gain.

## Measure on device first

- On iOS, triage on a release-like build before adding a Development Build: Metal Performance HUD (Settings → Developer) for a live overlay and its `metal-HUD:` log lines, and **Performance Trace** in Lookback mode, which keeps CPU, GPU, frame rate, and memory history on the device and opens in Instruments. Move to the Unity Profiler or Instruments once the triage names a screen. [Chapter](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/yamazaki-masahiro-1.html)
- Judge a smoothing change on mean frame time plus p95, p99, and standard deviation. A median hides the periodic spike that thinned updates create.
- A CPU saving that only grows `Semaphore.WaitForSignal` moved the wait, not the frame: the render thread is the critical path. Confirm in the Timeline view before cutting more main-thread work.

## Animation

[Chapter: character animation](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/saito-shunsuke-1.html)

- Enable **Optimize Game Objects** on the Rig tab of every character model that appears in numbers, and list only the bones scripts read (weapon sockets, look targets) in Extra Transforms to Expose. For a model you cannot reimport, call `AnimatorUtility.OptimizeTransformHierarchy(root, exposedBoneNames)` at spawn. Code that walks bone Transforms breaks on an optimized hierarchy, so expose what it needs.
- Keep many characters in Unity's batched animation update: `Animator`, or Playables in `DirectorUpdateMode.GameTime`. A manual PlayableGraph per character runs every `Evaluate()` serially on the main thread; drive them from one shared manual graph with one `AnimationPlayableOutput` per character instead.
- Never thin updates by disabling the Animator and calling `Animator.Update(dt)` yourself: it evaluates synchronously on the main thread.
- Thin distant characters by toggling `Animator.enabled` on a schedule, with `keepAnimatorStateOnDisable = true` and `speed` scaled by the interval, or by evaluating one bucketed manual graph per frame. Always offset the phase (`index % interval`), or every character updates on the same frame and the spike returns. Keep close-up characters at full rate.
- Move procedural bone work for many characters (IK, look-at) from `LateUpdate` into an `IAnimationJob` in an `AnimationScriptPlayable`, binding bones with `BindStreamTransform`. The gain is moving off the main thread; `[BurstCompile]` alone adds little until the data is laid out for SIMD across characters.
- Pool animated characters by disabling their `Animator` and `Renderer` components, not the GameObject, which rebinds on reactivation. On release, call `Animator.ResetControllerState(true)`, then restore what it leaves alone: layer weights, `speed`, `StateMachineBehaviour` fields, and the character's other components. Call `Update(0f)` after the reset when code reads `GetCurrentAnimatorStateInfo` right after reuse. [Chapter](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/shiotsuka-yuki-1.html)

### Many copies of a fixed animation

Destruction, crowds, and background props that play a predetermined animation
without per-instance control are a fit for a **Vertex Animation Texture**:
positions baked per frame into a texture, decoded in the vertex shader, drawn
with GPU instancing. [Chapter](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/tatami-yuuki-1.html)

- Never animate hundreds of separate MeshRenderer fragments with an Animator. Merge them into one mesh first: skinned, or VAT.
- Choose VAT when the main thread or memory is the limit. Choose GPU skinning when the GPU is the limit and many passes (shadow cascades, depth) draw the mesh: skinning deforms once per frame, VAT decodes again in every pass.
- Keep VAT textures uncompressed and follow the import settings of the SideFX VAT package; compression destroys the position precision. Copy its Shader Graphs into the project rather than referencing the package's.

## Particles

`ParticleSystem.Simulate(t, …)` fast-forwards synchronously on the calling
frame, and its cost grows with `t`. With the Noise module, a 20-second
fast-forward measured a spike of about 50 ms. Do not fast-forward Noise systems
by more than a fraction of a second at runtime; cap the duration or Max
Particles, and wrap the call in a Profiler sample to measure it.
[Chapter](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/kato-yuya-1.html)

## Managed code stripping

UnityLinker strips IL2CPP builds (Android, iOS, Web) from the Minimal level by
default, and CoreCLR builds once their level is raised from Disabled, their
default. It keeps only what is statically reachable at build time, so code
reached only through reflection or only from AssetBundle content disappears
from the player while working in the Editor.
[Chapter](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/mukai-yuichiro-2.html)

- Before raising the Managed Stripping Level, list every reflection entry point: `Type.GetType` with a non-constant name, `Activator.CreateInstance`, `GetMethod`, assembly scans, and DI containers that construct through reflection. Preserve or replace each, then test a player build.
- Preserve narrowly. `[Preserve]` on a type keeps it and its default constructor, not its methods; on a method it keeps that method, not the constructor. Reflection that creates and invokes needs both.
- Use `[RequireImplementors]` on an interface and `[RequireDerived]` on a base class when a framework discovers implementations, `link.xml` at type or member scope for code you cannot edit, and `IUnityLinkerProcessor` when the preserved set depends on the build target or content.
- Keep `preserve="all"` on a whole assembly for diagnosis only.
- Prefer a Source Generator that emits a static registry over runtime reflection discovery: dependencies become static, and a missing or duplicate registration fails at compile time.

## Link-time optimization on Android

IL2CPP emits many small functions spread across translation units, which the
C++ compiler cannot inline across. ThinLTO fixes that for `libil2cpp.so` only;
real titles measured a few percent of main-thread CPU, so adopt it only when
scripting is a large share of the frame. [Chapter](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/kim-minhyuk-1.html)

- Keep the Release C++ configuration and add ThinLTO from the build script: save `PlayerSettings.GetAdditionalIl2CppArgs()`, append `--compiler-flags=-flto=thin --linker-flags=-flto=thin`, build, and restore the saved value in `finally`.
- Prefer that over the Master configuration with its IL2CPP LTO Mode: Master measured the same CPU gain with a larger `libil2cpp.so` and a longer build. Never pick Full: on the largest measured project the link ran out of memory.
- Leave the Android **Link Time Optimization** build setting at None. It optimizes engine code only and requires Strip Engine Code off, whose larger APK and resident memory outweigh the gain.
- Leave iOS without ThinLTO: the Xcode link took about nine times longer for a gain within noise. Xcode's `LLVM_LTO` setting does not reach IL2CPP code.
- A successful build proves nothing about LTO. Check that `-flto=thin` appears in the compile and link commands of `Library/Bee/Player*.dag.json`, and that a generated `.o` starts with the bitcode bytes `42 43 c0 de`.
- ThinLTO barely helps interface and virtual calls; mark hot types `sealed` and call concrete types on hot paths.

## iOS memory limits

iOS kills a process past its memory footprint limit (a jetsam report) and fails
allocations past its virtual address space (an ordinary crash report). Two
entitlements raise each limit. [Chapter](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/kim-minhyuk-2.html)

- Add `com.apple.developer.kernel.increased-memory-limit` and `com.apple.developer.kernel.extended-virtual-addressing` from a `[PostProcessBuild]` under `#if UNITY_IOS`, through `ProjectCapabilityManager` (`AddIncreasedMemoryLimit`, `AddExtendedVirtualAddressing`, `WriteToFile`). `PBXProject.AddCapability` alone writes no entitlement key.
- Both need an explicit App ID with the capability enabled and a regenerated provisioning profile; Extended Virtual Addressing also needs a paid developer membership.
- The game must still run without the raised limit: 3 GB iPhones gain nothing from it.
- Verify the signed app with `codesign --display --entitlements :- Payload/<App>.app`, then on device read `task_info(TASK_VM_INFO)`: limit = `limit_bytes_remaining + phys_footprint`. `os_proc_available_memory()` reports current headroom, not the limit.
- Neither entitlement reduces memory use: texture and RenderTexture peaks, asset residency, and native allocations still need cutting.
