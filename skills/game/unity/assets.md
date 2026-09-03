# Assets — Addressables, import presets, scenes, prefabs

## Addressables

All dynamic runtime loading goes through Addressables, with `AssetReference`
fields in place of string addresses so renames survive and the Editor can
validate the link.

- Release every handle you load (`Addressables.Release`). Reference counting only frees memory when loads and releases pair up.

| Content | Build system |
| --- | --- |
| Installed with the player | **Content Directory** — asset-level dependencies, automatic de-duplication, granular unloads |
| Remote catalog, DLC, post-install download | **AssetBundles** — groups sized around what loads and unloads together |

Keep the two dependency sets disjoint. An asset referenced by both is built twice.

- Keep an asset in one place: referencing it from both built-in scene data and an Addressables group duplicates it on disk and in memory.
- Enable **Extract TypeTree Data** (6.5) on new projects to shrink AssetBundles. It rewrites every bundle, so it is a project-start decision.

`Resources/` assets are always built into the player and stay resident until
manually unloaded, which is why startup and memory both suffer. Addressables
covers the bootstrap case too.

## Import settings

- Enforce imports with **Presets plus folder-based preset rules** (or an `AssetPostprocessor`), committed to version control, so texture, audio, and mesh settings are deterministic across the team rather than drifting per developer.
- Set platform-correct texture compression — ASTC on mobile, BC on desktop and console.
- Leave Read/Write off on meshes and textures unless the CPU genuinely reads them. Enable it on meshes used by a Particle System Shape, Terrain Detail Mesh, or Mesh Collider; Unity no longer enables it during the build, and a missing required flag fails the build.
- Match audio load types to use: streaming for music and long ambiences, compressed-in-memory for mid-length clips, decompress-on-load for short frequent SFX. Force mono where stereo adds nothing.
- Expect far fewer redundant reimports on 6.4, where a dependent reimports only when its dependency's *result* changes. In custom importers, declare `DependsOnSourceAsset` and `DependsOnArtifact` so the reimports you do need still fire.

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

## Prefabs

- Reuse content through nested prefabs and prefab variants, so an upstream fix propagates to every variant.
- Break scene content into prefabs, which moves diffs and merges out of large scene files.
- Edit variants and prefab assets in place. Unpacking an instance or cloning a whole prefab severs the link that carries upstream fixes.
