# Workflow — input, audio, version control, CI, testing

## Input

Define all input in **Input Action assets**, with one action map per context —
Gameplay, UI, Vehicle, Menus — and switch maps when context changes. Action maps
are what make rebinding, control schemes, and device pairing work; device polling
in gameplay code bypasses all three.

- Wire single-player through the generated C# wrapper class or action references, enabling and disabling explicitly.
- Use `PlayerInput` for component-level wiring, and `PlayerInputManager` with a player prefab for local multiplayer — it handles device pairing, join-by-button, and split-screen.
- Dispatch `PlayerInput` events through C# events. Its Broadcast Messages mode routes by string through `SendMessage`, which is slow and invisible to refactoring.
- Read per-player actions from that player's own `PlayerInput`, which holds a filtered copy. `InputSystem.actions` is the project-wide singleton and is not player-scoped.
- Build rebinding on `PerformInteractiveRebinding()`, persist with `SaveBindingOverridesAsJson()` / `LoadBindingOverridesFromJson()`, and `Dispose()` the operation when it completes.
- Define control schemes (KBM, Gamepad, Touch) and swap UI glyphs on scheme change, rather than hardcoding prompts per platform.
- Route UI input through the Input System UI module. On 6.4 the `OnMouseDown`/`Drag`/`Up` callbacks work with the Input System package, which eases migration off legacy input.

## Audio

Built-in audio — `AudioSource` plus **AudioMixer** groups, snapshots, sends and
ducking, exposed parameters — covers most game mixing.

- Drive audio through a thin service layer with an event-style API, so a later middleware swap touches one module.
- Budget voice counts per platform (priorities, max real and virtual voices) and add instance limiting or cooldowns for stacking SFX.
- Reach for the **scriptable audio pipeline** (Burst-compiled C# signal units, 6.3) and `AudioClip.CreateInstance` generators (6.5) for adaptive sequencing, blending, and looping in-engine.
- Enable the **Enhanced Audio Foundation** (6.3, opt-in through 6.5) to move device enumeration and start off the main thread, removing audio-related frame hitches on Windows and macOS.
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
- Ship releases with **IL2CPP** — required on iOS and consoles, faster, and harder to reverse. Configure `link.xml` or `[Preserve]` for reflection-reached code so stripping keeps it. Mono stays for fast dev iteration until 6.8 removes it.
- Run IL2CPP jobs on runners matching the target OS, since it needs that platform's native toolchain.
- Configure per-target settings, defines, and scene lists in **Build Profiles**, and script them with the `CreateBuildProfile` API (6.5), which auto-installs platform packages for reproducible CI setup.
- Manage conditional compilation through asmdef Define Constraints and build profiles, keeping `#if` blocks out of gameplay code as a feature-flag system.
- Set explicit graphics APIs, development-build flags, and company and product names in shipping configs.
- When bumping CI to 6.5, update build scripts, ProGuard config, and plugin namespaces for the platform default shifts: WebAssembly 2023 on by default (Emscripten 4), Android minimum API 26 with AGP 9 / Gradle 9.1, and x86-64 removed. `Editor.log` also becomes per-project, which breaks CI scripts reading the old path.

### Managed code variants

Set the variant explicitly in every Build Profile and CI job.

| Build need | Variant |
| --- | --- |
| Shipping | **Release** |
| Optimized profiling | **Instrumented** |
| Assertions and safety checks | **Checked** |
| Unoptimized debugger stepping | **Debug** |

Development Build is independent and selects no variant. Use `Debug.Assert` for
invariants; its availability follows the variant.

## Testing

**Unity Test Framework**, a core package since 6.2, with separate test asmdefs.
Edit-mode tests are the default — they run in milliseconds. Play-mode tests are
for behaviour that genuinely needs the player loop, physics, or scene lifecycle.

- Keep production code in custom asmdefs. Test assemblies cannot reference `Assembly-CSharp`, which is the single most common reason a codebase "can't be tested".
- Write `[Test]` unless the case must skip frames, which is what `[UnityTest]` is for.
- Run tests headless in CI on every PR (`-runTests`, GameCI test-runner) and gate merges on them.
- Automate UI Toolkit interaction tests with the **UI Test Framework** (6.3) — clicks, keyboard, and scroll against UXML — which closes the coverage gap on presenters and views.
- Keep play-mode tests deterministic with fixed seeds, controlled `Time.timeScale`, and scene fixtures, so CI results mean something.
- Measure coverage with the **Code Coverage** package on critical assemblies rather than chasing a headline total.
- Enforce **Roslyn analyzers** (Microsoft.Unity.Analyzers with `.editorconfig` severities) as build-breaking, to catch Unity footguns mechanically — allocations in `Update`, null-comparison on `UnityEngine.Object`. Keep the serialization analyzer build-breaking too (see [runtime.md](./runtime.md)).
- Run **Project Auditor** (in the Editor since 6.4, Window → Analysis) in review and CI for performance, memory, and obsolete-API findings. Its rules ship in `com.unity.project-auditor-rules`.
- Log through a leveled wrapper and strip verbose logs from release builds. A per-frame `Debug.Log` allocates a string and captures a stack trace even with the console closed.
