---
name: unity6-aaa-best-practices
description: >-
  Senior Unity 6 developer guidance: DO/DON'T best practices for building
  production-quality (AAA-level) games with Unity 6 (6000.x line). Covers UI
  Toolkit design systems with USS tokens and MVP/MVVM data binding, Awaitable
  async, assembly definitions, ScriptableObject architecture, Addressables,
  GPU Resident Drawer, zero-allocation discipline, Input System, audio
  middleware decisions, Build Profiles, CI, and testing. Also covers project
  structure (folder layout, asset/file naming, type prefixes,
  namespace-to-folder alignment, GUID-safe renames), the EntityId/ECS Core
  package shift, and multiplayer (Netcode for GameObjects 2.x / Netcode for
  Entities, authority models, dedicated server). Tracks which capability
  shipped in which 6.x release (6.0 through 6.5). Use when developing,
  reviewing, or architecting a Unity 6 project, or when the user mentions
  Unity, UITK, UGUI, Addressables, URP/HDRP, DOTS, ECS, netcode, IL2CPP, or
  Unity-specific performance and build questions.
---

# Unity 6 AAA Best Practices

Act as a senior Unity 6 developer shipping a production game. Apply the
DO/DON'T rules below by default; deviate only with an explicit, stated reason.
These practices target the Unity 6 line (6000.x). Default to **6.3 LTS** as the
conservative production baseline and **6.5** as the latest feature set; assume a
current release unless the project is explicitly locked on an older 6.x. Several
defaults changed across the 6.x cycle: the **unlearn list** below corrects
habits from older Unity versions that are now wrong, and the **version map**
pins each major capability to the release that shipped it (attribution drifts a
lot in older blog posts).

## Version map (when each capability actually shipped)

| Capability | Shipped in | Notes |
| --- | --- | --- |
| Render Graph, GPU Resident Drawer, GPU occlusion, STP, Awaitable, Build Profiles, runtime data binding | **6.0** | Foundations of the Unity 6 era |
| World-space UI Toolkit | **6.2** | Panel Settings → world-space render mode |
| **Render Graph = only path** (URP Compatibility Mode removed), UI Shader Graph + USS filters, UI Test Framework, SVG as core module, `[SerializeField]` fields-only (compile error) | **6.3** (LTS) | First LTS since 6.0; `URP_COMPATIBILITY_MODE` define removed in 6.4 |
| ECS (Entities/Collections/Mathematics/Entities Graphics) as **Core packages**, `EntityId` deprecates `InstanceID`, DirectStorage, PVRTC removed | **6.4** | |
| `EntityId` replaces `InstanceID` (**obsolete int `InstanceID` APIs now compile errors**), Built-in RP + dynamic batching deprecated, Advanced Text Generator = default, Panel Renderer replaces UI Document, on-tile post-processing, WebAssembly 2023 default | **6.5** | Plan the `InstanceID` migration carefully; legacy `.rigidbody`/`.camera` accessors were already gone (5.x), warnings just promoted to errors |

Treat "6.2+ can do X" claims with suspicion: SVG-as-core, the Render-Graph-only
path, and UITK custom shaders are **6.3**, not 6.2.

For implementing Figma designs as UI Toolkit interfaces, use the
`figma-to-unity` skill. This skill covers what is Unity-specific.

## Unlearn list (old habits that are now wrong)

| Old habit (pre-Unity 6) | Do instead |
| --- | --- |
| UGUI for new UI (menus, HUD, world-space) | **UI Toolkit** with a USS-token design system |
| Manual per-frame UI sync (`label.text = ...` in Update) | **Runtime data binding** (`DataBinding`, `[CreateProperty]`) |
| Coroutines by default; raw .NET `Task` in engine code | **`Awaitable`** with `CancellationToken` (or UniTask for advanced flows) |
| `Input.GetAxis` / `Input.GetKey` | **Input System** action maps |
| `Resources/` folder loading | **Addressables** with `AssetReference` |
| Static batching + CPU occlusion as draw-call strategy | **GPU Resident Drawer** + GPU occlusion culling (URP/HDRP) |
| Legacy `ScriptableRenderPass.Execute` custom passes | **Render Graph** passes (only path in 6.3+) |
| One global define list, hand-edited per platform | **Build Profiles** (per-profile settings, defines, scene lists) |
| Hand-rolled object pools | **`UnityEngine.Pool`** (`ObjectPool<T>`, `CollectionPool`) |
| Built-in Render Pipeline for new projects (deprecated in 6.5) | **URP** (cross-platform/stylized) or **HDRP** (high-fidelity PC/console) |
| `GetInstanceID()` / `int` instance ids, `MaterialPropertyBlock` to vary one material | **`EntityId`** (obsolete int APIs are compile errors in 6.5) / **per-renderer RSUV** (`SetShaderUserValue`, GRD-safe) |
| `GameObject.rigidbody` / `.camera` / `AddComponent("Name")` legacy accessors | **`GetComponent<T>()` / `AddComponent<T>()`** (legacy forms gone since 5.x; residual warnings became errors in 6.5) |
| Installing Entities/Collections/Mathematics as packages | **Built-in Core packages** (ship with the Editor since 6.4; `Unity.Mathematics` is a built-in module in 6.5) |
| `[SerializeField]` on properties/methods | **`[field: SerializeField]`** (anything else is a compile error since 6.3) |

## Golden rules

1. **UI = UITK + design system + MVP.** All new UI goes to UI Toolkit —
   screen-space and world-space (world-space since 6.2). Build a design system:
   USS variables (`--token-name`) for colors, spacing, and typography, composed
   into theme TSS files. Display data through
   MVP/MVVM: UXML/USS is the view, a presenter wires queries and runtime
   bindings, models are plain C# / ScriptableObjects. Never put game logic in
   `VisualElement` subclasses. On 6.5+, prefer **Panel Renderer** over UI
   Document and let the **Advanced Text Generator** (default) own text. See
   [ui.md](./ui.md).
2. **Architecture = composition + asmdefs + data-driven.** Plain C# services
   behind thin MonoBehaviour adapters; assembly definitions along
   architectural seams with one-way dependencies; ScriptableObjects for shared
   config and event channels. See [architecture.md](./architecture.md).
   For folder layout, naming, and file conventions, see
   [project-structure.md](./project-structure.md).
3. **Assets = Addressables + presets + additive scenes.** Never `Resources/`.
   Enforce import settings with folder presets committed to VCS. Structure
   levels as bootstrap + persistent managers + additive content scenes. See
   [assets.md](./assets.md).
4. **Performance = measure, then zero allocs + GPU-driven rendering.** Profile
   on target hardware before optimizing. Zero per-frame managed allocations in
   steady state. Pool everything spawned at runtime. Enable GPU Resident
   Drawer on large scenes. See [performance.md](./performance.md).
5. **Pipeline = IL2CPP releases, CI on every PR, tests that gate merges.**
   Git + LFS with text serialization, GameCI or Build Automation with Library
   caching, edit-mode tests as the default. See [workflow.md](./workflow.md).
6. **Multiplayer = pick the netcode stack early, design for authority.** Choose
   Netcode for GameObjects 2.x (general) or Netcode for Entities (DOTS scale),
   decide client/server vs distributed authority up front, and stand up the
   Multiplayer roles / Dedicated Server split from the start. See
   [multiplayer.md](./multiplayer.md).

## Domain index

| Domain | Reference |
| --- | --- |
| UI Toolkit, design tokens, data binding, MVP/MVVM, UGUI cases | [ui.md](./ui.md) |
| ScriptableObjects, asmdefs, Awaitable/UniTask, DOTS/Jobs/Burst | [architecture.md](./architecture.md) |
| Folder layout, naming, type prefixes, namespace↔folder, GUID-safe renames | [project-structure.md](./project-structure.md) |
| Addressables, import presets, scenes, prefab workflows | [assets.md](./assets.md) |
| Profiling, GC discipline, pooling, GPU Resident Drawer, URP/HDRP | [performance.md](./performance.md) |
| Input System, audio/middleware, version control, CI, builds, testing | [workflow.md](./workflow.md) |
| Netcode (NGO 2.x / Netcode for Entities), authority, dedicated server, transport | [multiplayer.md](./multiplayer.md) |

## How to apply

When writing or reviewing Unity code:

```
- [ ] Does any new UI use UGUI without a stated reason? -> UITK + tokens + MVP
- [ ] Any per-frame allocation, Find*, GetComponent, or LINQ in Update? -> fix
- [ ] Any Resources.Load or string-based asset path? -> Addressables
- [ ] Any coroutine/Task where Awaitable fits? -> Awaitable + CancellationToken
- [ ] Any direct device polling? -> Input System action maps
- [ ] Any Instantiate/Destroy churn? -> UnityEngine.Pool
- [ ] New logic testable in edit mode? -> plain C# in its own asmdef + tests
- [ ] Asset/folder naming off-convention or per-type subfolders? -> PascalCase + type prefix, organize by feature
- [ ] File holds multiple types or namespace mismatches its folder? -> one type per file, namespace mirrors path
- [ ] Renaming/moving assets without their .meta (or without git mv)? -> move the pair, keep GUID/LFS intact
- [ ] Any GetInstanceID()/int instance id, or MaterialPropertyBlock on batched objects? -> EntityId / per-renderer RSUV
- [ ] [SerializeField] on a property/method, or legacy .rigidbody/.camera accessors? -> [field: SerializeField] / GetComponent<T>
- [ ] Custom render pass on the removed URP Compatibility path? -> Render Graph (only path since 6.3)
- [ ] Networked feature with no chosen authority model/netcode stack? -> decide early (multiplayer.md)
```

When the user's choice conflicts with these rules, state the rule, the cost of
deviating, and proceed only if they confirm.
