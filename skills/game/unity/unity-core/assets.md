# Assets: Addressables, Content Directories, import settings, scenes, prefabs

## Addressables

All dynamic runtime loading goes through Addressables, with `AssetReference`
fields in place of string addresses so renames survive and the Editor can
validate the link.

- Await a load through `ToAwaitable(destroyCancellationToken)`: cancelling the token releases the handle, so a load scoped to its component needs no manual release.
- Release every other handle you load (`Addressables.Release`). Reference counting only frees memory when loads and releases pair up.
- Decide each load's lifetime at the call site: the session, the scene, a screen or dialog, or a period the game defines such as a battle. Route loads through one project loader that takes that lifetime and releases everything registered to it when the lifetime ends; destroying a GameObject releases nothing it loaded. A load that completes after its lifetime ended is released on completion. [Chapter](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/inada-taketo-2.html)
- Check releases with Memory Profiler snapshots before and after the same transition, repeated several times on a player build: assets or handles that keep growing are the leak. An asset that stays is not one by itself; read its referrers first.

Build every group with the **Content Directory** schema
(`ContentDirectoryGroupSchema`): asset-level dependencies, automatic
de-duplication, and granular unloads. It is the only group schema to use.

Content Directories serve content installed with the player. Unity has
announced remote Content Directories without shipping them yet; until a
release does, deliver post-install content (a remote catalog, DLC) through a
project-specific system behind one loader interface, so moving to remote
Content Directories later changes one module.

- Give groups whose content shares dependencies the same Catalog Id. Each Catalog Id builds as one Content Directory and de-duplication works within it, so two catalogs each carry their own copy of a shared asset.
- Break circular references between assets: a cycle loads as one unit, logs a warning, and fails the build beyond 64 MB (`circularrefs.json` lists the cycles).
- Keep an asset in one place: referencing it from both built-in scene data and an Addressables group duplicates it on disk and in memory.

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
- Keep `Loadable<T>` fields in Content Directory content only: in content built into the Player the reference is set to null and the build logs an error.

### Settings needed before the first scene

`Resources/` assets are always built into the player and stay resident until
manually unloaded, which is why startup and memory both suffer. Addressables
covers the bootstrap case too, except for settings read before the first scene
loads: a synchronous Addressables load is discouraged there, and WebGL has none.

Deliver such a settings asset through the Preloaded Assets, as Unity
Localization and the Input System do. The player loads them at startup, so the
asset is available from `AfterAssembliesLoaded`.

- Register the asset as an `EditorBuildSettings` config object, so Editor code and tests find it without a path.
- Add it to the `PlayerSettings` Preloaded Assets in `IPreprocessBuildWithReport` and remove it in `IPostprocessBuildWithReport`. `SetPreloadedAssets` marks PlayerSettings dirty: when they were clean before, clear the flag after each edit, or the next project save writes the temporary list into `ProjectSettings.asset`.
- Record in `SessionState`, which survives a domain reload, that the build added the asset: a failed build skips the postprocess and leaves it in the list, and the next build removes it. Leave PlayerSettings dirty after that removal, so a list saved in the meantime is rewritten clean.
- Keep the asset to plain values and Addressables keys such as `AssetReference`. A preloaded asset that references an asset also in an Addressables group ships that asset twice, each copy with its own identity.

## Import settings

- Enforce imports with **Presets plus folder-based preset rules** (or an `AssetPostprocessor`), committed to version control, so texture, audio, and mesh settings are deterministic across the team rather than drifting per developer.
- Back import rules with a check before each build (an edit-mode test or a CI step) on maximum texture size, compression, and mesh vertex count, and print the measured values in the build log. Assets that arrive with an existing `.meta` skip import-time defaults, and an over-budget asset nobody sees gets shipped. The [`unity-performance`](../unity-performance/SKILL.md) Editor audit reads these values.
- Set platform-correct texture compression — ASTC on mobile, BC on desktop.
- Leave Read/Write off on meshes and textures unless the CPU genuinely reads them. Enable it on meshes used by a Particle System Shape, Terrain Detail Mesh, or Mesh Collider; Unity does not enable it during the build, and a missing required flag fails the build.
- Match audio load types to use: streaming for music and long ambiences, compressed-in-memory for mid-length clips, decompress-on-load for short frequent SFX. Force mono where stereo adds nothing.
- A dependent asset reimports only when its dependency's *result* changes. In custom importers, declare `DependsOnSourceAsset` and `DependsOnArtifact` so the reimports you do need still fire.
- Make an object added in an `AssetPostprocessor` the main object explicitly with `AssetImportContext.SetMainObject`; `AddObjectToAsset` alone leaves the importer's object as the main one.

## Scenes

Structure levels as additive scenes: a minimal bootstrap scene, a persistent
managers scene, and content scenes loaded through
`LoadSceneAsync(..., LoadSceneMode.Additive)`. This is what enables parallel
team workflows, small VCS diffs, and streaming worlds — a monolithic scene gives
up all three.

A persistent managers scene is the home for long-lived systems, in place of
scattering `DontDestroyOnLoad` calls.

Forced GC and asset unload on scene load is opt-in
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
