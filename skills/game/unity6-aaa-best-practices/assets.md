# Assets & content — Addressables, import presets, scenes, prefabs

## Addressables (never Resources/)

- **DO** use **Addressables** for all dynamic runtime loading, with
  `AssetReference` fields instead of string addresses where possible.
- **DON'T** use the `Resources/` folder — its assets are always built into the
  player, stay resident until manually unloaded, and slow startup. (At most,
  tiny bootstrap config — and ideally not even that.)
- **DO** release every handle you load (`Addressables.Release`); ref-counted
  memory management only works when loads and releases pair up.
- **DO** plan group/bundle granularity around what loads and unloads together.
- **DON'T** reference the same asset both from built-in scene data and from
  Addressables groups — it duplicates the asset on disk and in memory.
- **DO** enable **Extract TypeTree Data** (separate TypeTree files, 6.5) on
  **new** projects to shrink AssetBundles — it rewrites all bundles, so adopt it
  at project start, not mid-production.

## Import settings

- **DO** enforce import settings with **Presets + folder-based preset rules**
  (or an `AssetPostprocessor`), committed to version control, so texture,
  audio, and mesh imports are deterministic across the team.
- **DO** set platform-correct texture compression (ASTC mobile, BC
  desktop/console), disable Read/Write on meshes/textures unless needed, and
  match audio load types to use (see [workflow.md](./workflow.md) audio
  section).
- **DON'T** ship default-imported 4K textures, uncompressed audio, or let
  per-asset import settings drift per developer.
- **DO** enable texture **Read/Write explicitly** when you need CPU readback —
  on 6.5 it is no longer auto-enabled at build time, and a build now **fails
  with a warning** if a CPU-read texture lacks the flag.
- **DO** expect far fewer redundant reimports on 6.4 (**narrowed artifact
  dependencies**: a dependent reimports only when the dependency's *result*
  changes). In **custom importers**, declare `DependsOnSourceAsset` /
  `DependsOnArtifact` explicitly so needed reimports still trigger.

## Scene organization

- **DO** structure levels via **additive scene loading**: a minimal bootstrap
  scene, a persistent managers scene, and content scenes loaded/unloaded with
  `LoadSceneAsync(..., LoadSceneMode.Additive)`. This enables parallel team
  workflows, fewer VCS conflicts, and streaming worlds.
- **DON'T** build giant monolithic scenes, and don't make `DontDestroyOnLoad`
  the home of every manager — a persistent managers scene is the recommended
  replacement.
- **DO** be aware that **forced GC + asset unload on scene load is opt-in** since
  6.2 (`EditorSettings.forceAssetUnloadAndGCOnSceneLoad` / *Force GC on Scene
  Loads*). With additive streaming, manage unloads deliberately
  (`Resources.UnloadUnusedAssets`) rather than relying on the old implicit
  collection.

## Prefab workflows

- **DO** lean on **nested prefabs + prefab variants** for content reuse; a
  variant inherits upstream fixes automatically.
- **DO** break scene content into prefabs so diffs/merges happen at the prefab
  level, not in giant scene files.
- **DON'T** unpack prefabs to tweak instances, and don't clone-and-modify a
  whole prefab where a variant would do.
