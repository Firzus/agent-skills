# Workflow — input, audio, version control, CI, builds, testing

## Input (Input System package)

- **DO** define all input in **Input Action assets** with **action maps per
  context** (Gameplay, UI, Vehicle, Menus); switch maps on context change.
- **DON'T** poll devices directly (`Keyboard.current.spaceKey...`) in gameplay
  code, and don't keep the legacy Input Manager ("Both" mode) enabled
  long-term.
- **DO** use the generated C# wrapper class (or action references) with
  explicit enable/disable for single-player; use **`PlayerInput`** for
  component-level wiring and **`PlayerInputManager`** + a player prefab for
  local multiplayer (auto device pairing, join-by-button, split-screen).
- **DON'T** use `PlayerInput`'s Broadcast Messages behavior in production —
  prefer C# events; string-based SendMessage is slow and refactor-hostile.
- **DON'T** read `InputSystem.actions` (the project-wide singleton) in
  per-player code — each `PlayerInput` holds a private filtered copy.
- **DO** build rebinding on `PerformInteractiveRebinding()`, persist with
  `SaveBindingOverridesAsJson()` / `LoadBindingOverridesFromJson()`, and
  `Dispose()` the rebind operation.
- **DO** define **control schemes** (KBM, Gamepad, Touch) and swap UI glyphs
  on control-scheme change instead of hardcoding prompts per platform.

## Audio

- **DO** use built-in audio (AudioSource + **AudioMixer** groups, snapshots,
  sends/ducking, exposed parameters) for small/mid scope — it covers most
  game-mixing needs.
- **DO** adopt **FMOD or Wwise** when you need genuinely adaptive music,
  complex parameter-driven sound, or a dedicated sound-designer workflow —
  and decide **early**, not mid-production. Pattern: Wwise = AAA scale,
  FMOD = indie/AA, built-in = simple scope.
- **DO** drive audio through a thin **audio service layer** (event-style API)
  so a later middleware swap touches one module.
- **DON'T** scatter `AudioSource.PlayOneShot` across gameplay scripts, and
  don't attempt complex interactive music (vertical layering / horizontal
  resequencing) on raw AudioSources at scale.
- **DO** budget voice counts (priorities, max real/virtual voices per
  platform) and implement instance limiting/cooldowns for stacking SFX.
- **DO** match load types: Streaming for music/long ambiences,
  Compressed-In-Memory for mid-length, Decompress-On-Load only for short
  frequent SFX; force mono where stereo adds nothing.

## Version control

- **DO** use **Git + Git LFS** (track textures, models, audio, video; commit
  `.meta` files) with Visible Meta Files + **Force Text** serialization, and
  the standard Unity `.gitignore` (`Library/`, `Temp/`, `Logs/`, `obj/`
  excluded). Configure UnityYAMLMerge as merge tool for scenes/prefabs.
- **DO** consider Unity Version Control (Plastic) for very large art-heavy
  teams.

## CI & builds

- **DO** run CI builds on **every PR** (GameCI `unity-builder` on GitHub
  Actions, or Unity Build Automation), with aggressive caching of `Library/`
  and the Bee cache (`BEE_CACHE_DIRECTORY`) — the difference between
  10-minute and 90-minute builds.
- **DO** ship releases with **IL2CPP** (mandatory on iOS/consoles, faster,
  harder to reverse) and keep Mono for fast dev iteration. Configure
  `link.xml` / `[Preserve]` for reflection-used code under stripping.
- **DO** use Unity 6 **Build Profiles** for per-target settings, defines, and
  scene lists instead of hand-editing global Build Settings per platform.
- **DON'T** sprinkle `#if` blocks across gameplay code as a feature-flag
  system; manage defines through asmdef Define Constraints and build
  profiles.
- **DON'T** leave "Auto Graphics API", development-build flags, or default
  company/product names in shipping configs.
- **DO** run IL2CPP CI jobs on runners matching the target OS — IL2CPP needs
  the target platform's native toolchain.

## Testing & quality

- **DO** use the **Unity Test Framework** with separate test asmdefs:
  **edit-mode tests as the default** for logic (milliseconds per run),
  play-mode tests only for behavior needing the player loop/physics/scene
  lifecycle.
- **DO** keep production code in custom asmdefs — test assemblies cannot
  reference `Assembly-CSharp`; this constraint is the #1 reason teams "can't
  test".
- **DO** prefer `[Test]` over `[UnityTest]` unless you must skip frames.
- **DO** run tests headless in CI on every PR (`-runTests`, GameCI
  test-runner) — tests that don't gate merges decay.
- **DO** measure with the **Code Coverage package** on critical assemblies
  (not a vanity total), and enforce **Roslyn analyzers**
  (Microsoft.Unity.Analyzers + `.editorconfig` severities as build-breaking)
  to mechanically catch Unity footguns (allocs in Update, null-comparison on
  UnityEngine.Object...).
- **DO** keep logging disciplined: leveled logger wrapper, verbose logs
  stripped from release, `Debug.Assert` for invariants (compiled out of
  non-dev builds).
- **DON'T** ship per-frame `Debug.Log` (string alloc + stack trace, even with
  the console hidden), and don't write timing-dependent play-mode tests that
  flake in CI — fixed seeds, controlled `Time.timeScale`, scene fixtures.
