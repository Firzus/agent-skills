---
name: unity6-aaa-best-practices
description: >-
  Senior Unity 6 developer guidance: DO/DON'T best practices for building
  production-quality (AAA-level) games with Unity 6 (6000.x line). Covers UI
  Toolkit design systems with USS tokens and MVP/MVVM data binding, Awaitable
  async, assembly definitions, ScriptableObject architecture, Addressables,
  GPU Resident Drawer, zero-allocation discipline, Input System, audio
  middleware decisions, Build Profiles, CI, and testing. Also covers project
  structure: folder layout, asset/file naming conventions, type prefixes,
  namespace-to-folder alignment, and GUID-safe renames. Use when developing,
  reviewing, or architecting a Unity 6 project, or when the user mentions
  Unity, UITK, UGUI, Addressables, URP/HDRP, DOTS, IL2CPP, or Unity-specific
  performance and build questions.
---

# Unity 6 AAA Best Practices

Act as a senior Unity 6 developer shipping a production game. Apply the
DO/DON'T rules below by default; deviate only with an explicit, stated reason.
These practices target the Unity 6 line (6000.x) **at its current release** —
assume the latest Unity 6 version (6.2+: world-space UITK, SVG, Render Graph
only path...) unless the project is explicitly locked on an older 6.x. Several
defaults changed in Unity 6: the **unlearn list** below corrects habits from
older Unity versions that are now wrong.

For engine-agnostic architecture patterns (State, Object Pool, Event Queue,
ECS theory...), use the `game-architecture-patterns` skill; for implementing
Figma designs as UI Toolkit interfaces, use the `figma-to-unity` skill. This
skill covers what is Unity-specific.

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
| Built-in Render Pipeline for new projects | **URP** (cross-platform/stylized) or **HDRP** (high-fidelity PC/console) |

## Golden rules

1. **UI = UITK + design system + MVP.** All new UI goes to UI Toolkit —
   screen-space and world-space (6.2+). Build a design system: USS variables
   (`--token-name`) for colors, spacing, and typography, composed into theme
   TSS files. Display data through
   MVP/MVVM: UXML/USS is the view, a presenter wires queries and runtime
   bindings, models are plain C# / ScriptableObjects. Never put game logic in
   `VisualElement` subclasses. See [ui.md](./ui.md).
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

## Domain index

| Domain | Reference |
| --- | --- |
| UI Toolkit, design tokens, data binding, MVP/MVVM, UGUI cases | [ui.md](./ui.md) |
| ScriptableObjects, asmdefs, Awaitable/UniTask, DOTS/Jobs/Burst | [architecture.md](./architecture.md) |
| Folder layout, naming, type prefixes, namespace↔folder, GUID-safe renames | [project-structure.md](./project-structure.md) |
| Addressables, import presets, scenes, prefab workflows | [assets.md](./assets.md) |
| Profiling, GC discipline, pooling, GPU Resident Drawer, URP/HDRP | [performance.md](./performance.md) |
| Input System, audio/middleware, version control, CI, builds, testing | [workflow.md](./workflow.md) |

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
```

When the user's choice conflicts with these rules, state the rule, the cost of
deviating, and proceed only if they confirm.
