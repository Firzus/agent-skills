# Unity 6.6 research report for the Unity skill

Research date: 2026-09-03

## Executive summary

Unity 6.6 is the current Supported release before Unity 6.7 LTS. The Unity skill
intentionally targets **6.7 LTS**, so this report evaluates which 6.6 contracts
remain useful at that baseline. Unity's release announcement confirms the
sequencing: [Unity 6.6 is now available](https://discussions.unity.com/t/unity-6-6-is-now-available/1735357).

The most consequential 6.6 changes for the skill are not Editor conveniences.
They are changes to build diagnostics, serialization, content builds, ECS data,
rendering defaults, and platform compatibility:

1. **Managed Code Variant is now an explicit per-platform build decision.** A
   Development Build no longer implies the old diagnostic configuration.
   `DEVELOPMENT_BUILD` and `UNITY_64` are deprecated, with removal announced for
   6.8. This invalidates two existing statements in `workflow.md` and requires a
   CI rule. [Managed code variants](https://docs.unity3d.com/6000.6/Documentation/Manual/managed-code-variants.html),
   [6.6 programming upgrade guide](https://docs.unity3d.com/6000.6/Documentation/Manual/UpgradeGuideUnity66.html#programming).
2. **Native `Dictionary<TKey,TValue>` serialization is production-usable.** New
   code no longer needs parallel-list wrappers, but existing data must not be
   migrated implicitly. [Dictionary serialization](https://docs.unity3d.com/6000.6/Documentation/Manual/script-serialization-dictionaries.html).
3. **Content Directories are the local-content successor to AssetBundles and are
   integrated with Addressables.** They do not support remote delivery, so they
   refine rather than replace the skill's Addressables default.
   [Content Directories](https://docs.unity3d.com/6000.6/Documentation/Manual/content-directories-introduction.html),
   [Addressables content build systems](https://docs.unity3d.com/Packages/com.unity.addressables@4.0/manual/content-build-systems.html).
4. **Managed ECS components are deprecated.** New ECS components should be
   unmanaged, using `UnityObjectRef<T>`, `FixedString`, buffers, and blob assets.
   [Entities 6.6 upgrade guide](https://docs.unity3d.com/Packages/com.unity.entities@6.6/manual/upgrade-guide.html).
5. **Rendering guidance changes materially.** Dynamic batching is obsolete,
   Progressive CPU Light Baker is deprecated, Unity Compute Light Baker is the
   modern SRP baker, and new shader/profile controls reduce variants and memory
   bandwidth. [Unity 6.6 graphics changes](https://docs.unity3d.com/6000.6/Documentation/Manual/WhatsNewUnity66.html#graphics).
6. **Android and Apple support floors moved.** Android now requires GLES 3.1,
   only Adaptive icons are supported, and the legacy chained signal handler is
   removed. Intel macOS and x86_64/Universal Apple simulator support are
   deprecated. [6.6 platform upgrade guide](https://docs.unity3d.com/6000.6/Documentation/Manual/UpgradeGuideUnity66.html#platforms),
   [6.6 platform changes](https://docs.unity3d.com/6000.6/Documentation/Manual/WhatsNewUnity66.html#platforms).

## Maintainer decisions

| Adopt | Leave out |
| --- | --- |
| Managed Code Variant; native dictionary serialization; local Content Directories and remote AssetBundles; Unity Compute Light Baker as the sole baker; dynamic batching obsolescence; current `EntityId`, mesh readability, and Graph Toolkit contracts | ECS managed-component guidance; Android, macOS, and WebGPU guidance |

The skill keeps its 6.7 LTS baseline and names multiplayer packages without
pinning versions. The sections below preserve the complete research assessment;
this table is the implementation decision for the current change.

## Assessed skill delta

### P0: correct existing guidance

| Target | Current state | Required change |
| --- | --- | --- |
| `SKILL.md` baseline | Declares 6.7 LTS as its baseline. | Keep 6.7 LTS and the CoreCLR-readiness guidance. |
| `workflow.md` build diagnostics | Treats development-build flags as the diagnostic switch and says `Debug.Assert` compiles out of non-development builds. | Make `ManagedCodeVariant` explicit in every Build Profile and CI job. Use `Release` for shipping, `Instrumented` for optimized profiling, `Checked` for assertions/safety checks, and `Debug` for unoptimized debugger stepping. `UNITY_ASSERTIONS`, not the native Development Build flag alone, controls Unity assertions. [Official variant matrix](https://docs.unity3d.com/6000.6/Documentation/Manual/managed-code-variants.html#managed-code-variant). |
| `runtime.md` compile symbols | Does not cover the 6.6 symbol migration. | Replace validation uses of `DEVELOPMENT_BUILD` with `UNITY_ENABLE_CHECKS`, profiling/diagnostic uses with `UNITY_INCLUDE_INSTRUMENTATION`, true runtime Development Build checks with `Debug.isDebugBuild`, and `UNITY_64` with `IntPtr.Size`. Never gate sensitive production logs on `UNITY_ENABLE_CHECKS`, because a non-development Player can be Checked. [Migration details](https://docs.unity3d.com/6000.6/Documentation/Manual/UpgradeGuideUnity66.html#programming). |
| `runtime.md` .NET compatibility table | Gives broad advice such as “use supported overloads” without the 6.6 analyzer's exact replacements. | Record the actionable replacements: `AppDomain.GetAssemblies()` -> `CurrentAssemblies.GetLoadedAssemblies()`, AppDomain lifecycle events -> Unity lifecycle attributes, `Assembly.Location` -> `GetLoadedAssemblyPath()`, and `Assembly.LoadFile/LoadFrom` -> `CurrentAssemblies.LoadFromPath()`. [Incompatible .NET API reference](https://docs.unity3d.com/6000.6/Documentation/Manual/dotnet-incompatible-api.html). |
| `runtime.md` object identity | Says obsolete `int` InstanceID APIs are compile errors in 6.5. | Correct this to deprecation/obsolete diagnostics in 6.6, while retaining the skill policy that warnings should fail CI. The release notes migrate broad Core, AssetDatabase, Physics, GI, and Scene APIs to `EntityId`. [Final 6.6 release notes, API Changes](https://unity.com/releases/editor/whats-new/6000.6.0f1). |
| `assets.md` mesh readability | Attributes the change to 6.5 and says a CPU-read texture causes the failure. | Correct it to 6.6 and to meshes required by Particle System Shape, Terrain Detail Mesh, or Mesh Collider. Unity no longer enables mesh Read/Write at build time; a missing required flag now fails the build. [Assets and media changes](https://docs.unity3d.com/6000.6/Documentation/Manual/WhatsNewUnity66.html#assets-and-media). |
| `workflow.md` audio | Calls `AudioClip.CreateInstance` generators a 6.5 feature. | Distinguish the existing generator API from the 6.6 addition that allows `AudioClip` as a scriptable generator. [Final 6.6 release notes](https://unity.com/releases/editor/whats-new/6000.6.0f1). |
| `multiplayer.md` package pins | Pins NGO, Multiplayer Services, Dedicated Server, Multiplayer Play Mode, and Netcode for Entities versions. | Remove package versions; the project manifest is the source of truth. |

### P0: add durable rules

#### Runtime and serialization

- Add native serialized dictionaries to `runtime.md`. A dictionary field is
  opt-in even when public and needs `[SerializeField]`; `[SerializeReference]`
  is invalid on dictionary fields. Keys and values must be Unity-serializable,
  collections are allowed as values but not keys, and directly nesting a
  dictionary inside a list or array still requires a serializable wrapper.
  Custom key types need correct equality and hashing; `IEquatable<T>` avoids
  boxing. [Dictionary rules](https://docs.unity3d.com/6000.6/Documentation/Manual/script-serialization-dictionaries.html#supported-types).
- Do not auto-migrate existing wrapper or parallel-list solutions. Unity keeps
  them working, but moving data to the new native field requires an Editor
  migration that keeps both fields until the copied data is verified.
  [Upgrade behavior](https://docs.unity3d.com/6000.6/Documentation/Manual/UpgradeGuideUnity66.html#programming).
- Preserve the current explicit-static-reset discipline. Add the 6.6 lifecycle
  APIs (`AutoStaticsCleanup`, `NoAutoStaticsCleanup`, entering/exiting Play Mode
  hooks) and require Project Auditor's Domain Reload report. Domain reload is
  off by default in new 6.6 projects. [Enter Play Mode without domain reload](https://docs.unity3d.com/6000.6/Documentation/Manual/domain-reloading.html),
  [Domain Reload analyzer](https://docs.unity3d.com/6000.6/Documentation/Manual/project-auditor/domain-reloading-issues.html).

#### Content and builds

- Keep **Addressables** as the authoring/loading abstraction, but add a build
  system choice in `assets.md`: use its **Content Directory schema** for local
  content in new 6.6 projects; keep AssetBundles for remote catalogs, DLC, or
  post-install downloads. Content Directories offer asset-level dependency
  tracking, implicit de-duplication within one build, incremental builds, and
  `Loadable<T>` references, but only local distribution. Mixing both systems
  duplicates shared dependencies, so use both only for a deliberate local vs
  remote split. [Content Directory comparison and limitations](https://docs.unity3d.com/6000.6/Documentation/Manual/content-directories-introduction.html).
- Add Build History to `workflow.md`: Player and Content Directory builds create
  a report directory under `Library/BuildHistory` with the build report,
  summary, JSONL log, and supporting data. Publish the entire directory as a CI
  artifact because `Library/` is not versioned, and compare builds in Build
  Analysis or through `BuildHistory`. [Build History structure](https://docs.unity3d.com/6000.6/Documentation/Manual/build-history.html).
- Add the YAML migration note: word wrapping is always disabled,
  `Reduce Version Control Noise` is removed, and an upgrade can create a large
  mechanical diff. Coordinate one `AssetDatabase.ForceReserializeAssets` pass
  rather than letting contributors generate piecemeal noise.
  [Editor upgrade changes](https://docs.unity3d.com/6000.6/Documentation/Manual/UpgradeGuideUnity66.html#editor).
- Add `Library/DataStore` replacing `Library/Artifacts` for new projects as a
  reason never to script against internal `Library` paths.
  [Assets and media changes](https://docs.unity3d.com/6000.6/Documentation/Manual/WhatsNewUnity66.html#assets-and-media).

#### ECS and DOTS

- Add a 6.6 migration block to `architecture.md`: managed `IComponentData` and
  managed shared components are deprecated. Prefer unmanaged structs;
  `UnityObjectRef<T>` for Unity objects, `FixedString` for text, and dynamic
  buffers/blob assets for collections. The temporary `EA0017` suppression is a
  migration aid, not a permanent configuration.
  [Entities component migration](https://docs.unity3d.com/Packages/com.unity.entities@6.6/manual/upgrade-guide.html#convert-managed-components-to-unmanaged-components).
- Add the other breaking ECS migrations: `EntityCommandBuffer.PlaybackPolicy`
  is deprecated in favor of one-shot playback; recorded `CreateEntity` and
  `Instantiate` references are no longer negative placeholder entities; and
  `PostLoadCommandBuffer` moves to `RequestSceneLoaded.ImportEntity` or
  `SceneSystem.LoadParameters.ImportEntity`.
  [Entities 6.6 upgrade guide](https://docs.unity3d.com/Packages/com.unity.entities@6.6/manual/upgrade-guide.html).
- Replace managed companion access with `CompanionComponent<T>` and
  `EntityManager.GetCompanion<T>`. Baking still supports Unity component types
  without ECS equivalents. [Managed components](https://docs.unity3d.com/Packages/com.unity.entities@6.6/manual/components-managed.html).
- Add one CI validation rule for critical SubScenes using
  `EntitySceneImporterDeterminismChecker.Check`, and use the new Entities memory
  labels in Memory Profiler. Non-deterministic bakers enlarge patches and
  content builds. [Entities changes](https://docs.unity3d.com/6000.6/Documentation/Manual/WhatsNewUnity66.html#entities).

#### Rendering

- Use **Unity Compute Light Baker** as the sole SRP light-baking backend.
  [Light baking changes](https://docs.unity3d.com/6000.6/Documentation/Manual/WhatsNewUnity66.html#graphics).
- State that dynamic batching is obsolete, not merely inferior. Retain the
  existing GRD/SRP Batcher guidance, static batching incompatibility, and
  `MaterialPropertyBlock` warning. [Draw-call method matrix](https://docs.unity3d.com/6000.6/Documentation/Manual/optimizing-draw-calls-choose-method.html).
- Add Shader Constant Defines per Build Profile for numeric choices known at
  build time, instead of creating keywords and variants. They are not a runtime
  switch. [Shader constant defines](https://docs.unity3d.com/6000.6/Documentation/Manual/shader-variant-stripping.html#constant-defines).
- Add DXC as the default for Windows DX12-only builds when the target supports
  it. Do not present it as a universal compiler default: DX11 forces a second
  FXC shader set, and Vulkan/Metal DXC support is experimental.
  [DXC compiler guidance](https://docs.unity3d.com/6000.6/Documentation/Manual/shader-dxc-compiler.html).
- For depth effects on tile-based GPUs, prefer URP depth input attachments over
  sampling a depth texture when supported. This is limited to URP on DX12 and
  Vulkan and requires capability checks.
  [URP depth input attachment](https://docs.unity3d.com/6000.6/Documentation/Manual/urp/read-depth-input-attachment.html).
- Expand the rendering validation sequence to: Project Auditor URP Settings
  Analyzer, Rendering Profiler GRD telemetry, Frame Debugger constant-buffer
  values, and target-device measurement.
  [Graphics diagnostics](https://docs.unity3d.com/6000.6/Documentation/Manual/WhatsNewUnity66.html#graphics).
- Add upgrade blockers for advanced SRP users: Render Pipeline Core no longer
  pulls Terrain implicitly, and legacy Rendering Debugger `DebugState*` and
  `DebugUIDrawer` APIs are hard-obsolete. Add `com.unity.modules.terrain`
  explicitly when needed and migrate debug settings to
  `ISerializedDebugDisplaySettings` plus UI Toolkit `DebugUI.Widget.Create()`.
  [Graphics upgrade guide](https://docs.unity3d.com/6000.6/Documentation/Manual/UpgradeGuideUnity66.html#graphics).

#### UI

- Add UI Toolkit `backdrop-filter` and `drop-shadow` to the existing USS-first
  visual-effects guidance. Document the limits: backdrop filters are
  screen-space only, do not animate through USS transitions, and custom filters
  are not accepted there. [Backdrop filters](https://docs.unity3d.com/6000.6/Documentation/Manual/ui-systems/backdrop-filter.html),
  [built-in filters](https://docs.unity3d.com/6000.6/Documentation/Manual/ui-systems/built-in-filters.html).
- Add programmable UI vertices and mesh modifiers as the high-performance path
  for deformation and per-element GPU effects. Enable only the needed extra
  vertex channels because each adds memory and changing the set rebuilds the
  render chain. [Custom vertex data](https://docs.unity3d.com/6000.6/Documentation/Manual/ui-systems/custom-vertex-data.html).
- Make the new `UI Toolkit` and `UI Toolkit Details` Profiler modules the
  standard way to inspect binding/layout cost, event count, batches, geometry,
  and batch-break reasons. [Profile UI Toolkit](https://docs.unity3d.com/6000.6/Documentation/Manual/ui-systems/profile-ui.html).
- Add the 6.6 upgrade blockers: UXML Factory/Traits is removed in favor of
  `[UxmlElement]` and `[UxmlAttribute]`; remove
  `UIToolkitInputConfiguration.SetRuntimeInputBackend` without replacement.
  [UI Toolkit upgrade guide](https://docs.unity3d.com/6000.6/Documentation/Manual/UpgradeGuideUnity66.html#ui-toolkit).
- Keep the current 6.6 keyframe-animation text, but verify the feature-status
  sentence whenever the baseline moves. The final 6.6 release notes contain
  additional animatable style properties, not Animator Controller or Timeline
  parity. [Final 6.6 release notes](https://unity.com/releases/editor/whats-new/6000.6.0f1).

#### Platform workflow

- Android migration checklist: Adaptive icons only; GLES 3.1 minimum; remove
  `PlayerSettings.openGLRequireES31`; remove
  `-androidChainedSignalHandlerBehavior legacy`; and test devices that lacked
  Vulkan because GLES 3.0-only devices no longer run the app.
  [Android upgrade details](https://docs.unity3d.com/6000.6/Documentation/Manual/UpgradeGuideUnity66.html#platforms).
- Use **Profileable Shell** for profiling a release-like Android Player, then
  disable it before distribution. [Android build settings](https://docs.unity3d.com/6000.6/Documentation/Manual/android-build-settings.html).
- For Web, prefer WebGPU with WebGL2 fallback and a tested Device Filter. Treat
  Wasm64 as an escape hatch for workloads exceeding 4 GB, not a default: it
  raises the limit to 16 GB but costs load time and Safari does not support it.
  Enable Progressive Asset Loading for large multi-scene applications after
  testing server compression and time-to-first-interaction.
  [Web changes](https://docs.unity3d.com/6000.6/Documentation/Manual/WhatsNewUnity66.html#platforms),
  [WebGPU device filtering](https://docs.unity3d.com/6000.6/Documentation/Manual/webgpu-intro-device-filter-asset.html),
  [Web publishing settings](https://docs.unity3d.com/6000.6/Documentation/Manual/class-PlayerSettingsWebGL.html#Publishing).
- Prepare Apple CI and hardware matrices for Apple silicon. Intel macOS Editor
  and standalone Player support, plus iOS/tvOS x86_64 and Universal simulator
  choices, are deprecated. Do not make the Swift Xcode project layout the
  default while Unity still marks it experimental.
  [Apple platform changes](https://docs.unity3d.com/6000.6/Documentation/Manual/WhatsNewUnity66.html#platforms).

### P1: add when the associated domain is in scope

| Domain | Recommendation | Why it belongs below the default stack |
| --- | --- | --- |
| Cinemachine | Note that Cinemachine 3 is now core and projects on Cinemachine 2 are automatically upgraded to the incompatible v3 API/data format. Point to the official migration guide and require a backup/validation pass. [Cinemachine upgrade](https://docs.unity3d.com/Packages/com.unity.cinemachine@3.1/manual/CinemachineUpgradeFrom2.html). | Important migration trap, but the skill has no camera/cinematic reference today. |
| Animation/Timeline | Note that Animation Rigging and Timeline are core. Prefer non-allocating `AnimationEventInfo` in hot callbacks, while avoiding its string accessors on hot paths. [Animation changes](https://docs.unity3d.com/6000.6/Documentation/Manual/WhatsNewUnity66.html#animation), [AnimationEventInfo](https://docs.unity3d.com/6000.6/Documentation/ScriptReference/AnimationEventInfo.html). | Durable when animation is covered; otherwise too specialized for `SKILL.md`. |
| Audio | Add second/third-order ambisonics for spatial-audio work, with the hard caveat that Unity does not decode it by default and requires a third-party or custom decoder. [Ambisonic audio](https://docs.unity3d.com/6000.6/Documentation/Manual/AmbisonicAudio.html). | Conditional production path, not a replacement for AudioMixer. |
| 2D | If 2D is meant to be first-class, create one small `2d.md`: Rendering Layer filtering and shader stripping for 2D lights; GPU-skinned sprite shadows; Delaunay sprite meshes as a fill-rate/vertex-cost trade; and the 2D Animation, Tilemap, and 2D Graphics Profiler modules. [2D changes](https://docs.unity3d.com/6000.6/Documentation/Manual/WhatsNewUnity66.html#2d). | The current skill has no 2D seam; scattering isolated notes would turn references into a changelog. |
| Physics 2D | Cover buoyancy, wind, and `PhysicsSpace` only in a low-level 2D section. Benchmark the contact-recycling/SIMD gains rather than promising the release-note best case. [Final 6.6 release notes](https://unity.com/releases/editor/whats-new/6000.6.0f1). | These do not replace normal Rigidbody2D/Collider2D gameplay. |
| Navigation | Use the job-friendly `Unity.AI.Navigation.LowLevel` query types for custom or large-scale queries; keep NavMeshAgent/NavMeshSurface for ordinary gameplay. [Final 6.6 release notes, AI API Changes](https://unity.com/releases/editor/whats-new/6000.6.0f1). | Specialized performance escape hatch. |
| XR | Use OpenXR Adaptive Performance for frame-timing-driven quality scaling on untethered XR, and test Meta Quest shader optimizations and their variant cost. [Untethered XR optimization](https://docs.unity3d.com/6000.6/Documentation/Manual/xr-untethered-device-optimization.html), [Meta Quest shader optimization](https://docs.unity3d.com/6000.6/Documentation/Manual/xr-meta-quest-graphics-optimization.html). | No XR section exists today. |
| Shader/VFX authoring | Use Shader Graph directives rather than Custom Function nodes used only to inject pragmas; deprecate obsolete subgraphs so they disappear from search while existing references warn; use VFX-compatible Shader Graph creation and promoted properties. [Shader Graph settings](https://docs.unity3d.com/Packages/com.unity.shadergraph@17.6/manual/Graph-Settings-Tab.html), [VFX Graph integration](https://docs.unity3d.com/Packages/com.unity.visualeffectgraph@17.6/manual/sg-working-with.html). | Useful library-author practice, not a project-wide default. |
| Package authoring | Sign distributable UPM packages with standalone `upm pack` in CI and verify `.unitypackage` signatures. [UPM CLI](https://docs.unity3d.com/6000.6/Documentation/Manual/upm-cli.html), [asset package signatures](https://docs.unity3d.com/6000.6/Documentation/Manual/AssetPackagesSignatures.html). | Relevant only to package producers. |

### Multiplayer and AI package delta

- Keep NGO as the default, update it to 2.13.2, and state that NGO 2.13 supports
  Fast Enter Play Mode without domain reload. It also refuses runtime
  `NetworkObject` instances with `GlobalObjectIdHash == 0`; profile rather than
  assuming its allocation fixes eliminate every hot-path allocation.
  [NGO 2.13 changelog](https://docs.unity3d.com/Packages/com.unity.netcode.gameobjects@2.13/changelog/CHANGELOG.html).
- Keep Netcode for Entities as the ECS-only escape hatch. Add a coordinated
  client/server upgrade warning: 6.6 snapshots use Unity Transport's unreliable
  sequenced pipeline and are incompatible with earlier snapshot protocol
  versions. Add protocol gating and rolling-deployment tests.
  [Final 6.6 Netcode for Entities changes](https://unity.com/releases/editor/whats-new/6000.6.0f1).
- Update Multiplayer Services to 2.3.1. For prototypes and Inspector-authored
  flows, the new Session and Session Connector assets can create/join sessions,
  expose events, and automatically leave on Play Mode exit. Keep the service API
  for advanced orchestration. Do not reintroduce removed Multiplay Hosting
  integration. [Multiplayer Services 2.3 changelog](https://docs.unity3d.com/Packages/com.unity.services.multiplayer@2.3/changelog/CHANGELOG.html).
- If the skill adds an AI package matrix, use only supported package versions:
  AI Navigation 2.0, Behavior 1.0, ML-Agents 4.1, and Sentis/AI Inference 2.6.
  Record the ML-Agents Python migration from `gym` to `gymnasium`; do not make AI
  Assistant 2.19 a runtime default because its available version is pre-release.
  [Unity 6.6 released packages](https://docs.unity3d.com/6000.6/Documentation/Manual/pack-safe.html),
  [ML-Agents 4.1 changelog](https://docs.unity3d.com/Packages/com.unity.ml-agents@4.1/changelog/CHANGELOG.html),
  [AI Inference 2.6 changelog](https://docs.unity3d.com/Packages/com.unity.ai.inference@2.6/changelog/CHANGELOG.html).

### Graph Toolkit: adjust, do not reverse the current recommendation

The current skill is still correct that Graph Toolkit provides no execution
backend. Unity 6.6 adds runtime/edit-time **visualization** of an external
backend: animated/custom wires, node progress, port previews, log markers, and
stable element identifiers. It also adds multi-capacity ports and connection
validation. This justifies Graph Toolkit for debugging a graph-shaped domain;
it does not make a node canvas the default authoring model.
[Graph Toolkit changes](https://docs.unity3d.com/6000.6/Documentation/Manual/WhatsNewUnity66.html#graph-toolkit).

Model ports without data as `DataType == typeof(Untyped)`. Define valid
connections through `Graph.IsConnectionAllowed` and capacity through
`IPortBuilder.WithCapacity`.
[Graph Toolkit 6.6 type/connection changes](https://docs.unity3d.com/6000.6/Documentation/Manual/WhatsNewUnity66.html#graph-toolkit).

## Complete disposition of the What's New areas

The table below accounts for every area and feature group on the canonical 6.6
What's New page. “Do not add” means the item was examined but does not change a
durable agent decision in this general-purpose skill.

| Official area | Feature groups reviewed | Disposition for the Unity skill |
| --- | --- | --- |
| 2D | Sprite Editor hover/zoom/source-file locks/bone color; Tile Palette filtering and target locks; Grid Brush previews; tilemap diagnostics; Rendering Layers and shader stripping for 2D lights; GPU-skinned shadows; three 2D Profiler modules; Delaunay sprite mesh | Add only through a coherent 2D section. Do not add Editor convenience bullets individually. |
| Animation | Animation property search; Animation Rigging core; Timeline core | Add core-package/migration notes only when introducing animation/cinematic coverage. |
| Assets and media | Content Directories; Build Analysis/History; mesh Read/Write failure; higher-order ambisonics; `Library/DataStore` | Add all as scoped rules; ambisonics remains conditional. |
| Cameras | Cinemachine core | Add the automatic Cinemachine 2 -> 3 migration warning, not merely “core package.” |
| Editor and workflow | Selection history; Vivox installer; custom-window Editor Tools; native plug-in Define Constraints; new Hierarchy default; Gizmo shortcut | Add custom-window Editor Tools, native Define Constraints, and Hierarchy compatibility. Do not add navigation shortcuts or installer convenience. |
| Entities | integrated Hierarchy; Systems window; debug lifecycle callbacks; memory labels; bake determinism; managed-component deprecation | Add migrations and CI diagnostics. Treat callbacks as diagnostics only, since Unity omits them from release Players. |
| Graph Toolkit | visualization, progress, port previews, markers, identifiers, USS nodes, capacity, connection validation, `Untyped`, toolbar actions, option mutation | Add the `Untyped` migration and visualization exception; retain “no execution backend.” |
| Graphics | dynamic batching obsolete; URP Project Auditor; GRD Profiler; shader constants; DXC; constant buffers; depth input attachment; Compute Light Baker; VFX/Shader Graph improvements | Add the durable rendering and validation rules; keep VFX/Shader authoring details scoped. |
| Optimization | no-domain-reload analyzer; Performance Testing core; JSONL logging; code-size modes/LTO; Profiler screenshots/pinning | Add Managed Code Variant/domain analysis, Build History/log artifacts, and Profiler workflow. LTO remains a measured build-profile choice. |
| Package Manager | standalone signing CLI; `.unitypackage` signatures | Add only for package-authoring/CI workflows. |
| Platforms | Android, iOS Swift project, Intel macOS deprecation, QNX LTO/window APIs, WebGPU/Wasm64/filtering/progressive loading | Add Android/Web/Apple migration and decision rules. Leave QNX details out unless that target is requested. |
| Programming | domain reload default; Burst built-in; .NET API analyzer; Managed Code Variant; dictionary serialization | Add or correct all five because they alter core coding/build rules. |
| UI | uGUI SafeArea/layout bounds/copanar fitting/TMP span; UI Toolkit backdrop/drop-shadow/programmable vertices/Profiler | Add UI Toolkit items. Keep uGUI additions in a short compatibility escape hatch because UI Toolkit remains the default. |
| XR | OpenXR Adaptive Performance; automatic Meta Quest graphics optimizations | Add only if XR becomes an explicit skill scope. |

Canonical source: [New in Unity 6.6](https://docs.unity3d.com/6000.6/Documentation/Manual/WhatsNewUnity66.html).

### Additional final-release feature screening

The final release notes contain durable additions that are not all promoted on
the Manual's curated What's New page. These groups were screened separately.

| Release-note group | Additional 6.6 items | Disposition |
| --- | --- | --- |
| Audio and networking | `AudioClip` as a scriptable generator; TLS 1.3 negotiation in `UnityWebRequest`; iOS/visionOS gRPC | Correct the existing generator chronology. TLS 1.3 is automatic and the Apple transport additions are capability notes, so no standing rule is needed. |
| Build pipeline and logging | Build JSONL log, `BuildPlayerTEP.json`, structured `Editor.jsonl`, cross-platform Bee mutex | Add Build History artifacts and machine-readable Editor logs to CI guidance. Do not expose Bee implementation details. |
| Core and scripting | Dictionary serialization, unused Tetgen stripping, Managed Code Variant | Add dictionary and variant rules; automatic stripping needs no instruction. |
| Editor tooling | Project Auditor mesh metrics/obsolete-API detection, native plug-in constraints, custom-window tools, selection wireframes, Hierarchy changes | Add validation and extensibility contracts; omit cosmetic/selection conveniences. |
| Graphics and shaders | Hardware Profiles, Mesh LOD instancing, shadow-cascade small-mesh culling, shader constants, compiler selection, constant-buffer inspection | Add shader constants/DXC/diagnostics. Keep Hardware Profiles and cascade tuning in advanced, target-specific work. |
| Physics 2D and Physics APIs | Buoyancy, wind, `PhysicsSpace`, contact recycling/SIMD work, richer collision velocity/body access, broad `EntityId` replacements | Add only to a coherent 2D/physics reference. Use the API deprecations to reinforce the existing `EntityId` rule. |
| Profiler | Screenshot module, four pinned modules, Hide 0ms Samples, object/string marker context | Add screenshots and contextual markers to the profiling workflow. Treat hiding 0 ms rows as a display filter, not evidence that work is free. |
| Multiplayer | Transport adapters, Netcode for Entities smoothing/variant overrides/protocol change, NGO and Multiplayer Services patch updates | Add the package pins and protocol migration described above. Keep specialized ghost-authoring details in multiplayer reference material only. |
| Package Manager | Sample browser improvements and signature UX | Add signing for package producers; omit sample-browser UI conveniences. |
| Version Control | Unity Version Control branch/shelve/folder UI improvements | Do not add. The skill deliberately chooses Git/Git LFS and UnityYAMLMerge. |
| Specialized platforms | Full/Thin LTO for QNX, Linux, and Embedded Linux; Swift Xcode project; Wasm64; Web plug-in filters | Add only the broadly actionable Web/Apple caveats. Keep specialized LTO and experimental Swift details on demand. |
| Packages and AI | Core-package transitions plus patch releases for NGO, MPS, Character Controller, Addressables, AI Navigation, Behavior, ML-Agents, and AI Inference | Update only package choices already present in the skill. Add an AI matrix only if AI becomes explicit scope. |

Primary source: [Final Unity 6000.6.0f1 release notes](https://unity.com/releases/editor/whats-new/6000.6.0f1).

## Items that should not enter the skill

- Selection-history buttons, Animation search, Gizmo shortcut, Package Manager
  sample-list conveniences, and similar UI affordances are discoverable Editor
  UX, not agent architecture or validation rules.
- QNX window extensions, Embedded Linux/QNX LTO, Simulation Pro target changes,
  Kerberos license proxy support, and localized platform details should remain
  on-demand unless those targets become explicit scope.
- The 1,900-plus fixes in the cumulative final release notes should not be copied
  into the skill. They were screened for migration or durable contract changes;
  individual crash and regression fixes belong to release notes and issue
  diagnosis, not a standing best-practices contract.
- Do not make Wasm64, Swift Xcode projects, Profileable Shell in distributed
  builds, Content Directories for remote delivery, low-level Physics 2D, or AI
  Assistant defaults. Each has a documented scope or maturity limit.
- Do not add every package patch version to the default stack. Pin versions only
  where the stack already makes a package decision; distinguish core packages,
  whose version tracks the Editor, from released packages selected through UPM.
  [Core packages](https://docs.unity3d.com/6000.6/Documentation/Manual/pack-core.html),
  [released packages](https://docs.unity3d.com/6000.6/Documentation/Manual/pack-safe.html).

## Already covered accurately

- `runtime.md` and the review checklist already enforce explicit static reset and
  the “enter Play Mode twice” validation. 6.6 makes that more important; it does
  not invalidate it.
- `ui.md` already labels native UI Toolkit keyframe animation as experimental in
  6.6 and keeps USS transitions/C# as the production path.
- `multiplayer.md` already identifies Netcode for Entities 6.6.0 as the ECS-scale
  escape hatch rather than the GameObject default.
- `rendering.md` already prefers URP, Render Graph, GRD, APV, and target-device
  profiling. 6.6 strengthens these decisions.
- `editor-tools.md` already uses `[UxmlElement]`/`[UxmlAttribute]`, so the removed
  Factory/Traits workflow is a migration warning rather than a redesign.

## Sources examined

### Release-wide primary sources

- [New in Unity 6.6](https://docs.unity3d.com/6000.6/Documentation/Manual/WhatsNewUnity66.html)
- [Unity 6.6 upgrade guide](https://docs.unity3d.com/6000.6/Documentation/Manual/UpgradeGuideUnity66.html)
- [Final Unity 6000.6.0f1 release notes](https://unity.com/releases/editor/whats-new/6000.6.0f1)
- [Unity 6.6 release announcement](https://discussions.unity.com/t/unity-6-6-is-now-available/1735357)
- [Core package list](https://docs.unity3d.com/6000.6/Documentation/Manual/pack-core.html)
- [Released package list](https://docs.unity3d.com/6000.6/Documentation/Manual/pack-safe.html)

### Engine and workflow documentation

- [Managed code variants](https://docs.unity3d.com/6000.6/Documentation/Manual/managed-code-variants.html)
- [Incompatible .NET API reference](https://docs.unity3d.com/6000.6/Documentation/Manual/dotnet-incompatible-api.html)
- [Domain reload](https://docs.unity3d.com/6000.6/Documentation/Manual/domain-reloading.html)
- [Project Auditor domain-reload issues](https://docs.unity3d.com/6000.6/Documentation/Manual/project-auditor/domain-reloading-issues.html)
- [Dictionary serialization](https://docs.unity3d.com/6000.6/Documentation/Manual/script-serialization-dictionaries.html)
- [Content Directories](https://docs.unity3d.com/6000.6/Documentation/Manual/content-directories-introduction.html)
- [Build History](https://docs.unity3d.com/6000.6/Documentation/Manual/build-history.html)
- [UPM CLI](https://docs.unity3d.com/6000.6/Documentation/Manual/upm-cli.html)
- [Asset package signatures](https://docs.unity3d.com/6000.6/Documentation/Manual/AssetPackagesSignatures.html)
- [Android build settings](https://docs.unity3d.com/6000.6/Documentation/Manual/android-build-settings.html)
- [WebGPU enablement and device filtering](https://docs.unity3d.com/6000.6/Documentation/Manual/webgpu-intro-device-filter-asset.html)
- [Web Player settings](https://docs.unity3d.com/6000.6/Documentation/Manual/class-PlayerSettingsWebGL.html)

### Rendering, UI, ECS, and package documentation

- [Draw-call optimization methods](https://docs.unity3d.com/6000.6/Documentation/Manual/optimizing-draw-calls-choose-method.html)
- [Shader constant defines](https://docs.unity3d.com/6000.6/Documentation/Manual/shader-variant-stripping.html#constant-defines)
- [DXC compiler](https://docs.unity3d.com/6000.6/Documentation/Manual/shader-dxc-compiler.html)
- [URP depth input attachment](https://docs.unity3d.com/6000.6/Documentation/Manual/urp/read-depth-input-attachment.html)
- [UI Toolkit backdrop filters](https://docs.unity3d.com/6000.6/Documentation/Manual/ui-systems/backdrop-filter.html)
- [UI Toolkit built-in filters](https://docs.unity3d.com/6000.6/Documentation/Manual/ui-systems/built-in-filters.html)
- [UI Toolkit custom vertex data](https://docs.unity3d.com/6000.6/Documentation/Manual/ui-systems/custom-vertex-data.html)
- [UI Toolkit profiling](https://docs.unity3d.com/6000.6/Documentation/Manual/ui-systems/profile-ui.html)
- [uGUI SafeArea](https://docs.unity3d.com/Packages/com.unity.ugui@2.6/manual/script-SafeArea.html)
- [Entities 6.6 upgrade guide](https://docs.unity3d.com/Packages/com.unity.entities@6.6/manual/upgrade-guide.html)
- [Entities managed components](https://docs.unity3d.com/Packages/com.unity.entities@6.6/manual/components-managed.html)
- [NGO 2.13 changelog](https://docs.unity3d.com/Packages/com.unity.netcode.gameobjects@2.13/changelog/CHANGELOG.html)
- [Multiplayer Services 2.3 changelog](https://docs.unity3d.com/Packages/com.unity.services.multiplayer@2.3/changelog/CHANGELOG.html)
- [Shader Graph 17.6 settings](https://docs.unity3d.com/Packages/com.unity.shadergraph@17.6/manual/Graph-Settings-Tab.html)
- [VFX Graph 17.6 Shader Graph workflow](https://docs.unity3d.com/Packages/com.unity.visualeffectgraph@17.6/manual/sg-working-with.html)
- [AI Navigation 2.0 changelog](https://docs.unity3d.com/Packages/com.unity.ai.navigation@2.0/changelog/CHANGELOG.html)
- [Behavior 1.0 changelog](https://docs.unity3d.com/Packages/com.unity.behavior@1.0/changelog/CHANGELOG.html)
- [ML-Agents 4.1 changelog](https://docs.unity3d.com/Packages/com.unity.ml-agents@4.1/changelog/CHANGELOG.html)
- [AI Inference 2.6 changelog](https://docs.unity3d.com/Packages/com.unity.ai.inference@2.6/changelog/CHANGELOG.html)

## Limits and confidence

- Only Unity-owned primary sources were used. Unity Discussions is included only
  for Unity's own release/deprecation announcements, not community claims.
- The canonical English final release-notes URL intermittently failed to render
  in the research crawler. The same official Unity release page was accessible
  through Unity's localized route and contained the English final notes; package
  changelogs and the 6.6 manual were used to verify the consequential claims.
- Release notes are cumulative and contain thousands of fixes and API entries.
  The full feature, improvement, change, deprecation, API-change, package-change,
  and known-issue sections were screened. This report intentionally records only
  items that change the Unity skill's default choice, implementation procedure,
  migration safety, or validation rule.
- “Unity Compute Light Baker as default” is a recommendation for this skill,
  inferred from Unity's deprecation of Progressive CPU and its positioning of
  the Compute baker. Unity lets projects choose Compute or Progressive.
- Package versions are the versions in the final 6000.6.0f1 release notes. Patch
  releases can change them; re-check package changelogs when the skill is edited.
