# Workflow: input, audio, version control, CI, testing

## Input

Define all input in **Input Action assets**, with one action map per context —
Gameplay, UI, Vehicle, Menus — and switch maps when context changes. Action maps
are what make rebinding, control schemes, and device pairing work; device polling
in gameplay code bypasses all three.

The Input System is a core package (6.7) whose version follows the Editor; it
needs no version pin of its own.

- Wire single-player through the generated C# wrapper class or action references, enabling and disabling explicitly.
- Use `PlayerInput` for component-level wiring, and `PlayerInputManager` with a player prefab for local multiplayer — it handles device pairing, join-by-button, and split-screen.
- Dispatch `PlayerInput` events through C# events. Its Broadcast Messages mode routes by string through `SendMessage`, which is slow and invisible to refactoring.
- Read per-player actions from that player's own `PlayerInput`, which holds a filtered copy. `InputSystem.actions` is the project-wide singleton and is not player-scoped.
- Build rebinding on `PerformInteractiveRebinding()`, persist with `SaveBindingOverridesAsJson()` / `LoadBindingOverridesFromJson()`, and `Dispose()` the operation when it completes.
- Define control schemes (KBM, Gamepad, Touch) and swap UI glyphs on scheme change, rather than hardcoding prompts per platform.
- Check device capability with `Mouse.isSupported`, `Pen.isSupported`, and `Touchscreen.isPressureSupported`, which report what the platform supports rather than whether a device is connected. Read compass and orientation through `CompassSensor` and `DeviceOrientationSensor`.
- Route UI input through the Input System UI module. The `OnMouseDown`/`Drag`/`Up` callbacks work with the Input System.

## Audio

Built-in audio — `AudioSource` plus **AudioMixer** groups, snapshots, sends and
ducking, exposed parameters — covers most game mixing.

- Drive audio through a thin service layer with an event-style API, so a later middleware swap touches one module.
- Budget voice counts per platform (priorities, max real and virtual voices) and add instance limiting or cooldowns for stacking SFX.
- Reach for the **scriptable audio pipeline** (Burst-compiled C# signal units, 6.3) and `AudioClip.CreateInstance` generators (6.5) for adaptive sequencing, blending, and looping in-engine. Since 6.7 it adds Scriptable Effects, seeking in processors and generators, and real-time messaging through `ControlContext`.
- Select the **Enhanced Audio Foundation** in the project's audio settings (Classic stays the default) to move device enumeration and start off the main thread, removing audio-related frame hitches on Windows and macOS.
- **FMOD or Wwise** is the supported step off this row: take it for genuinely adaptive music, parameter-driven sound design, or a dedicated sound-designer workflow — and decide before production, since the integration reaches into every audio call site.

## Version control

- Git with **Git LFS** tracking textures, models, audio, and video; commit `.meta` files.
- Set Visible Meta Files and Force Text serialization, and configure UnityYAMLMerge for scenes and prefabs.
- Use the standard Unity `.gitignore`, excluding `Library/`, `Temp/`, `Logs/`, and `obj/`.
- Commit an asset and its `.meta` together. The `.meta` alone carries the GUID every referencing scene and prefab stores, so shipping one without the other silently breaks references in every other clone.
- Duplicate and delete assets inside the Editor. Copying an asset with its `.meta` creates a duplicate GUID that Unity resolves by regenerating one — that asset loses every inbound reference.
- A line-based merge of a scene or prefab produces a file that parses but is structurally corrupt, and it fails at runtime rather than at merge time. That is what UnityYAMLMerge is for.
- Commit `Assets/` and `ProjectSettings/`. `Library/`, `Temp/`, `obj/`, `Build/` and `Logs/` are regenerated.

## CI and builds

- Build on every PR (GameCI `unity-builder` on GitHub Actions, or Unity Build Automation), caching `Library/` and the Bee cache (`BEE_CACHE_DIRECTORY`) — that cache is the difference between a ten-minute and a ninety-minute build.
- Ship releases with **IL2CPP**: the only backend on mobile, consoles, and the Web, faster, and harder to reverse. Configure `link.xml` or `[Preserve]` for reflection-reached code so stripping keeps it. Desktop development builds can use the CoreCLR player for faster iteration.
- Run IL2CPP jobs on runners matching the target OS, since it needs that platform's native toolchain.
- Configure per-target settings, defines, scene lists, and output paths (Build Destination Override, 6.7) in **Build Profiles**. Script them with `BuildProfile.CreateBuildProfile` (6.5), which auto-installs platform packages for reproducible CI setup; its `onProfileReady` callback must be static or live on a serialized `UnityEngine.Object`, because the package install reloads code. Pass per-build extra defines through `BuildPlayerWithProfileOptions` (6.7).
- Manage conditional compilation through asmdef Define Constraints and build profiles, keeping `#if` blocks out of gameplay code as a feature-flag system.
- Set explicit graphics APIs, development-build flags, and company and product names in shipping configs.
- Read build size and per-step timing in the **Build Analysis** window (Window → Analysis → Build Analysis, 6.6), which keeps a build history.
- Scope warnings-as-errors gates to the project's own assemblies: compiler warnings from registry packages appear in the Console and `Editor.log`. `Editor.log` is per project.

Build hosts and targets for 7.0:

| Area | Requirement |
| --- | --- |
| Editor hosts | Windows 10 21H1, macOS 13 on Apple silicon, Ubuntu 22.04 (the build backend needs glibc 2.35) |
| Apple targets | iOS and tvOS 16 with Xcode 26; arm64 devices and Apple silicon simulators |
| Android | API 26, ARMv7 or ARM64, OpenGL ES 3.1 or Vulkan (the default for new projects), AGP 9.1 |
| Web | WebAssembly 2023 (Emscripten 4) by default |

### Managed code variants

Set the variant explicitly in every Build Profile and CI job.

| Build need | Variant |
| --- | --- |
| Shipping | **Release** |
| Optimized profiling | **Instrumented** |
| Assertions and safety checks, including `Native*`/`Unsafe*` collection checks | **Checked** |
| Unoptimized debugger stepping | **Debug** |

Development Build is independent and selects no variant. Use `Debug.Assert` for
invariants; its availability follows the variant.

Gate variant-specific code on `UNITY_ENABLE_CHECKS`, `UNITY_INCLUDE_INSTRUMENTATION`,
or `Debug.isDebugBuild`, not on `DEVELOPMENT_BUILD`.

## Testing

**Unity Test Framework**, a core package since 6.2, with separate test asmdefs.
Edit-mode tests are the default — they run in milliseconds. Play-mode tests are
for behaviour that genuinely needs the player loop, physics, or scene lifecycle.

- Declare `com.unity.test-framework` explicitly in the manifest rather than relying on another package to pull it in.
- Keep production code in custom asmdefs. Test assemblies cannot reference `Assembly-CSharp`, which is the single most common reason a codebase "can't be tested".
- Write `[Test]` unless the case must skip frames, which is what `[UnityTest]` is for.
- Run tests headless in CI on every PR (`-runTests`, GameCI test-runner) and gate merges on them.
- Automate UI Toolkit interaction tests with the **UI Test Framework** (6.3) — clicks, keyboard, and scroll against UXML — which closes the coverage gap on presenters and views.
- Keep play-mode tests deterministic with fixed seeds, controlled `Time.timeScale`, and scene fixtures, so CI results mean something.
- Measure coverage with the **Code Coverage** package on critical assemblies rather than chasing a headline total; it covers the CoreCLR Editor and players and IL2CPP builds.
- Guard performance-critical paths with **Performance Testing** (`Unity.PerformanceTesting`, a core package) in CI, and mark custom spans with `TestRunProfiler` (6.7).
- Enforce **Roslyn analyzers** (Microsoft.Unity.Analyzers with `.editorconfig` severities) as build-breaking, to catch Unity footguns mechanically — allocations in `Update`, null-comparison on `UnityEngine.Object`. Keep the serialization analyzer build-breaking too (see [runtime.md](./runtime.md)).
- Run **Project Auditor** (Window → Analysis → Project Auditor) in review, and in CI through batch mode (`-batchmode -quit -executeMethod` calling `new ProjectAuditor().Audit()`), for performance, memory, and obsolete-API findings. Its rules ship in `com.unity.project-auditor-rules`.
- Log through a leveled wrapper and strip verbose logs from release builds. A per-frame `Debug.Log` allocates a string and captures a stack trace even with the console closed.
