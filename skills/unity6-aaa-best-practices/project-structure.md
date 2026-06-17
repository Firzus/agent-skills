# Project structure — folders, file & naming conventions

A consistent, machine-checkable convention for where assets and code live and
how they are named. This is the layer that keeps a growing AAA project
navigable, reviewable, and refactor-safe. Commit it as a style guide
(`docs/asset-and-code-conventions.md`) referenced from `AGENTS.md` so it is the
single source of truth in review.

## Naming rules (all assets & folders)

- **DO** name everything in **PascalCase**, English, ASCII only — no spaces, no
  accents, no special characters. Spaces and casing drift break tooling, CLI
  globbing, and cross-platform (case-insensitive) filesystems.
- **DO** zero-pad numbered variants: `_01`, `_02`, … (never `Rock 1`,
  `Plan04-5-6`). Padding keeps sort order stable.
- **DON'T** ship typos or doubled separators (e.g. `Collumn`, `M_Wall__Base`) —
  they fragment search and invite duplicates.
- **DO** make the filename equal to the concept it holds (`filename == type`
  for code, `filename == asset` for content).

## Asset type prefixes

Prefix every asset by its **type** so kind is obvious in any flat list, search,
or reference picker. The prefix replaces the need for a per-type folder.

| Prefix | Asset type | Prefix | Asset type |
| --- | --- | --- | --- |
| `SM_` | Static mesh | `AC_` | Animator controller |
| `SK_` | Skeletal mesh | `A_` | Animation clip |
| `T_` | Texture | `VFX_` | Visual effect |
| `M_` | Material | `PS_` | Particle system |
| `MI_` | Material instance | `P_` | Prefab |
| `S_` / `SG_` | Shader / Shader Graph | `VP_` | Volume profile |
| `SFX_` / `MUS_` / `AMB_` | Audio (sfx / music / ambience) | | |

## Texture suffixes

Suffix textures by the channel/map they carry so packing intent is explicit and
import rules can key off the suffix:

| Suffix | Map | Suffix | Map |
| --- | --- | --- | --- |
| `_BC` | Base color / albedo (not `_Diffuse`) | `_MS` | Metallic + smoothness |
| `_N` | Normal | `_R` | Roughness |
| `_AO` | Ambient occlusion | `_E` | Emissive |
| `_M` | Mask | `_ORM` | Packed occlusion/roughness/metallic |

Example set: `T_Cliff_BC`, `T_Cliff_N`, `T_Cliff_ORM`.

## Organize by feature, not by type

- **DO** group assets by **feature/domain** (`Player/`, `Boss/`, `MainMenu/`),
  keeping each feature's meshes, materials, textures, and shaders side by side.
- **DON'T** create per-type subfolders (`Material/`, `Mesh/`, `Texture/`,
  `ShaderGraphs/`) inside a feature — they are **redundant with the type
  prefix**. Flatten them and let `SM_`/`M_`/`T_` carry the kind.
- **DO** tolerate type grouping only for very large shared source sets under a
  `Sources/` root (raw authoring assets), not for game-ready content.

## Scene naming

- **DO** name scenes `<Context>_<Layer>` in PascalCase, matching the additive
  layering model (`Forest_Environment`, `MainMenu_UserInterface`,
  `Boss_Gameplay`). The layer suffix maps to the bootstrap / persistent /
  content split (see [assets.md](./assets.md)).
- **DON'T** ship ambiguous scene names (`Boss`, `Map`, `World_Rework`) — the
  layer suffix tells reviewers and tooling what the scene loads as.

## Placeholders & throwaway

- **DON'T** leave placeholder names in the tree: `Test`, `Demo`, `Sandbox`,
  `Tmp`, `Fake`, `New`, `delete`, `_output`, `_rework`.
- **DO** quarantine genuine throwaway work under a single `Assets/_Sandbox/`
  root (or delete it) — never scattered through feature folders. Promote it to
  a real, prefixed name when it ships.

## Don't touch vendor & generated assets

- **DON'T** rename or reorganize **third-party/vendor** folders (asset-store
  packs, plugins) — match their upstream layout so updates stay clean.
- **DON'T** rename **generated** artifacts (lightmaps, NavMesh, APV data, TMP
  `… SDF.asset`, baked/`Generated/` output) — they are reproduced by their
  tooling and carry tool-owned names.

## C# code conventions

- **DO** keep **one public type per file**, with `filename == type name`. Move
  satellite enums/structs/DTOs into their own files.
- **DO** make the **namespace mirror the folder path** (`Code/Combat/Weapons/`
  → `Project.Combat.Weapons`). Folder and namespace must not drift.
- **DO** name each `.asmdef` **file** after its internal `name` field, and name
  a test assembly after the runtime assembly it targets
  (`Project.Combat.Weapons` → `Project.Combat.Weapons.Tests`).
- **DON'T** mix flattened and nested namespaces within one subsystem — pick
  niche-by-subfolder and apply it uniformly. Acronyms may stay uppercase
  (`HUD`, `VFX`, `HSM`).
- **DO** keep **Editor-only code** under `Editor/` folders or Editor asmdefs;
  runtime code touches `UnityEditor` only inside `#if UNITY_EDITOR`. No
  placeholder/`Fake`/`Demo` types in runtime assemblies.

## Move/rename safety (GUID discipline)

Renaming is a frequent, high-risk operation; do it mechanically so references
survive.

- **DO** move/rename an asset **together with its `.meta` file** — Unity
  references by **GUID stored in the `.meta`**, not by path, so the pair must
  travel together. Same rule for a folder and its `Folder.meta`.
- **DO** use `git mv` so history is preserved and LFS tracking
  (`.gitattributes` for `png`/`fbx`/`wav`/`tif`…) stays intact; renames then
  show as renames in the diff, not delete+add.
- **DO** after each batch: refresh Unity, read the console (errors + warnings),
  and iterate to zero new issues before the next batch. For C# renames/splits,
  require a green compile before moving on.

## Apply this in order (least → most risky)

References are GUID-based, so content moves are low-risk; code moves can break
compilation. Sequence accordingly, one checkpoint commit + console check per
step:

```
1. Art assets   — flatten by feature, apply prefixes + texture suffixes
2. Audio/Data/Prefabs/Scenes — prefix, depluralize, sandbox placeholders
3. C# low-risk  — asmdef file/test names, runtime placeholders
4. Folder↔namespace alignment
5. Subsystem namespace homogenization
6. One-type-per-file splits (highest volume/risk)
7. Final pass   — clean console, reviewed rename diff, EditMode tests
```
