# Assets: Addressables, Content Directories, import settings, scenes, prefabs

## Addressables

All dynamic runtime loading goes through Addressables, with `AssetReference`
fields in place of string addresses so renames survive and the Editor can
validate the link.

- Await a load through `ToAwaitable(destroyCancellationToken)`: cancelling the token releases the handle, so a load scoped to its component needs no manual release.
- Release every other handle you load (`Addressables.Release`). Reference counting only frees memory when loads and releases pair up.

Pick each group's schema from how its content reaches the player:

| Content | Group schema |
| --- | --- |
| Installed with the player | **Content Directory** (`ContentDirectoryGroupSchema`): asset-level dependencies, automatic de-duplication, granular unloads |
| Remote catalog, DLC, post-install download | **AssetBundles**: groups sized around what loads and unloads together |

Content Directories serve local content only in 7.0. Unity has announced
remote Content Directories for later in the Unity 7 generation, and the 7.0
documentation does not describe them yet; until a release ships them, remote
content stays on AssetBundles. Switching a group's schema changes no loading
code. Keep the two dependency sets disjoint: an asset referenced by both is
built twice.

- Put content that shares dependencies in one Content Directory build. De-duplication works within a build, so two builds each carry their own copy of a shared asset.
- Break circular references between assets: a cycle loads as one unit, logs a warning, and fails the build beyond 64 MB (`circularrefs.json` lists the cycles).
- Keep an asset in one place: referencing it from both built-in scene data and an Addressables group duplicates it on disk and in memory.
- Enable **Extract TypeTree Data** (6.5) on new projects to shrink AssetBundles. It rewrites every bundle, so it is a project-start decision.

### Native Content Directories and `Loadable<T>`

Build Content Directories through Addressables groups. Building them directly
with `BuildPipeline.BuildContentDirectory` and loading through `Loadable<T>`
leaves the project owning the root asset, the build script, the copy into
StreamingAssets, and directory registration, with no loading by address or
label. Where a project already uses `Loadable<T>`:

- Register the content directory with `ContentLoadManager.RegisterContentDirectory`, then load with `LoadAsync()` (an `Awaitable`) and read `Target`.
- Release in `OnDestroy`. Each instance holds one reference, and `Release()` does not release the loadables nested inside the loaded asset.
- Give each independent caller its own `Loadable<T>`, or pass a `LoadableObjectId`: with one shared instance, the first `Release()` unloads the asset for every caller.
- Test unloads in a Player build. In Editor Play Mode, content comes from the AssetDatabase without reference counting, so a missing release only shows in the Player.
- Keep `Loadable<T>` fields out of content built into the Player or into AssetBundles: there the reference is set to null and the build logs an error.

`Resources/` assets are always built into the player and stay resident until
manually unloaded, which is why startup and memory both suffer. Addressables
covers the bootstrap case too.

## Import settings

- Enforce imports with **Presets plus folder-based preset rules** (or an `AssetPostprocessor`), committed to version control, so texture, audio, and mesh settings are deterministic across the team rather than drifting per developer.
- Set platform-correct texture compression — ASTC on mobile, BC on desktop and console.
- Leave Read/Write off on meshes and textures unless the CPU genuinely reads them. Enable it on meshes used by a Particle System Shape, Terrain Detail Mesh, or Mesh Collider; Unity no longer enables it during the build, and a missing required flag fails the build.
- Match audio load types to use: streaming for music and long ambiences, compressed-in-memory for mid-length clips, decompress-on-load for short frequent SFX. Force mono where stereo adds nothing.
- Expect far fewer redundant reimports on 6.4, where a dependent reimports only when its dependency's *result* changes. In custom importers, declare `DependsOnSourceAsset` and `DependsOnArtifact` so the reimports you do need still fire.
- Make an object added in an `AssetPostprocessor` the main object explicitly with `AssetImportContext.SetMainObject`; `AddObjectToAsset` alone leaves the importer's object as the main one.

## Scenes

Structure levels as additive scenes: a minimal bootstrap scene, a persistent
managers scene, and content scenes loaded through
`LoadSceneAsync(..., LoadSceneMode.Additive)`. This is what enables parallel
team workflows, small VCS diffs, and streaming worlds — a monolithic scene gives
up all three.

A persistent managers scene is the home for long-lived systems, in place of
scattering `DontDestroyOnLoad` calls.

Forced GC and asset unload on scene load is opt-in since 6.2
(`EditorSettings.forceAssetUnloadAndGCOnSceneLoad`). With additive streaming,
drive unloads deliberately with `Resources.UnloadUnusedAssets` at moments you
choose.

Process scenes at build time in `AssetPostprocessor.OnProcessScene`: it
registers dependencies through `AssetImportContext` for incremental builds, and
a `BuildFailedException` thrown there fails the build.

## Prefabs

- Reuse content through nested prefabs and prefab variants, so an upstream fix propagates to every variant.
- Break scene content into prefabs, which moves diffs and merges out of large scene files.
- Edit variants and prefab assets in place. Unpacking an instance or cloning a whole prefab severs the link that carries upstream fixes.
