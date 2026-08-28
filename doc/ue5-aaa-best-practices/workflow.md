# Workflow — input, audio, version control, CI, testing

## Input (Enhanced Input)

- **DO** model gameplay verbs as **Input Actions** and bind keys in **Input
  Mapping Contexts (IMCs)** added/removed at runtime with priorities
  (gameplay vs vehicle vs menu) — same key, different action per context,
  zero branching.
- **DON'T** create one giant IMC for the whole game or branch on game state
  inside input handlers, and never fall back to legacy
  `BindAxis`/`BindAction` (deprecated since 5.1).
- **DO** use **Triggers** (Pressed, Hold, Tap, Chorded, Combo) and
  **Modifiers** (Dead Zone, Negate, Swizzle, Scalar) on mappings instead of
  reimplementing hold/double-tap/dead-zone logic in event graphs.
- **DO** build remapping on **`UEnhancedInputUserSettings`** (5.3+): register
  IMCs with the settings object, Player Mappable Key Settings, `MapPlayerKey`
  + `SaveSettings`. The pre-5.3 `PlayerMappableInputConfig` path is
  deprecated.
- **DO** manage IMCs per **`ULocalPlayer`**'s
  `EnhancedInputLocalPlayerSubsystem` for local multiplayer — per-player
  subsystems are what make split-screen remapping and device assignment work.
- **DO** keep bindings in `PlayerController`/Pawn C++
  (`BindAction(IA, ETriggerEvent::Triggered, ...)`) with IAs/IMCs as data
  assets designers edit; don't hardcode key checks
  (`IsInputKeyDown(EKeys::F)`) in gameplay code.

## Audio

- **DO** author new sounds as **MetaSounds** (procedural DSP graphs,
  sample-accurate timing); SoundCues are legacy.
- **DO** use MetaSound **presets and composable subgraphs** for variants —
  presets inherit graph changes and override only parameters; don't duplicate
  whole graphs per variation.
- **DO** use the **Audio Modulation plugin** (control buses, parameter
  patches) for runtime mix states instead of legacy SoundClass/SoundMix
  push/pop.
- **DO** design a deliberate **submix hierarchy** (Music/SFX/Dialogue/
  Ambience → Master) with submix effects (EQ, compression, ducking); don't
  route everything to master and scatter volume multipliers in gameplay code.
- **DO** use **Quartz** for beat-accurate musical scheduling — game-thread
  timers drift audibly.
- **DO** set up **sound concurrency** rules and shared attenuation assets;
  unlimited simultaneous voices wreck both perf and mix.
- **DO** evaluate **Wwise/FMOD** honestly for AAA scope (dedicated audio
  team, heavy dialogue/localization, interactive music) and bridge with
  **AudioLink** (5.1+) if mixing both; MetaSounds wins on cost and procedural
  depth for smaller scopes.

## Version control & infrastructure

- **DO** use **Perforce** (streams) as the AAA standard for mixed
  code+binary content at team scale — UGS, Horde, and RoboMerge only support
  P4, and exclusive checkout for unmergeable binaries (BPs, maps) is
  non-negotiable at scale. Git + LFS is acceptable for small/code-heavy
  teams.
- **DO** stand up a **shared DDC** — Zen server as shared DDC (production-
  ready in 5.5), Unreal Cloud DDC for distributed orgs — layered local →
  shared → cloud. It cuts cook/shader times 50-80%: the highest-ROI
  infrastructure investment for a UE team.
- **DO** pin engine versions and distribute editor binaries via
  **UnrealGameSync** for source-built teams — mixed engine versions corrupt
  assets (one-way upcasting).

## CI & builds

- **DO** script CI as **BuildGraph** XML run via **UAT**
  (`RunUAT BuildCookRun ...`), orchestrated by **Horde** (5.4+) or
  Jenkins/GHA for smaller teams; no hand-maintained per-platform bat/sh
  scripts.
- **DO** keep `.Build.cs`/`.Target.cs` disciplined: split gameplay into
  **modules**, prefer `PrivateDependencyModuleNames`, enforce IWYU, keep
  editor-only code in editor modules.
- **DO** cook/package continuously (nightly + per-PR validation cooks) and
  treat cook warnings as build breaks — cook breakage compounds silently;
  continuous cooking keeps the project always-shippable.
- **DO** plan **console certification** early: suspend/resume, user/profile
  handling, save integrity, controller disconnect — cert flows need
  architectural support (async saves, user switching) that is expensive to
  retrofit.

## Testing & quality

- **DO** cover gameplay with the **Automation Framework**: C++
  `IMPLEMENT_SIMPLE_AUTOMATION_TEST` / spec tests, and **Functional Tests**
  (`AFunctionalTest` actors in test maps) run via Session Frontend and CI.
- **DO** use **Gauntlet** for on-device, packaged-build, soak, perf, and
  multiplayer (multi-client/server) scenarios — that's where shipping bugs
  actually live.
- **DO** write **Low-Level Tests** (5.3+, Catch2-based) for
  engine-independent pure logic — they compile minimal module sets and run
  in seconds; don't boot the editor to unit-test a math class.
- **DO** enforce content rules with the **Data Validation plugin**: override
  `IsDataValid`, write `UEditorValidatorBase` validators (naming, references,
  budgets), run on save and as a CI commandlet — humans don't scale to 100k
  assets.
- **DO** use assertion macros by contract: `check` for
  impossible-by-construction invariants (crashes, compiled out of shipping —
  never wrap side effects), `ensure` for recoverable "should not happen"
  paths (fires once, reports in telemetry), `verify` when the expression must
  execute in all builds.
- **DO** respect **UHT/GC constraints**: every UObject pointer member needs
  `UPROPERTY()` for GC visibility — non-UPROPERTY UObject pointers dangle.
- **DO** run MapCheck + redirector fixup + validation commandlets in nightly
  CI and fail on new errors — error debt compounds into cook failures.
