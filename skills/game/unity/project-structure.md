# Project structure — folders, naming, safe renames

A machine-checkable convention for where assets and code live. Commit it as
`docs/asset-and-code-conventions.md` and reference it from `AGENTS.md`, so
review has one source of truth to point at.

## Naming

- PascalCase, English, ASCII only. Spaces, accents, and casing drift break tooling, CLI globbing, and case-insensitive filesystems.
- Zero-pad numbered variants — `_01`, `_02` — so sort order stays stable.
- Spell names exactly and use single separators: `M_Wall_Base`, not `M_Wall__Base`. Typos fragment search and breed duplicates.
- Name a file after the thing it holds: `filename == type` for code, `filename == asset` for content.

## Asset prefixes

Prefix by type, so kind is visible in any flat list, search, or reference
picker. The prefix is what removes the need for per-type folders.

| Prefix | Type | Prefix | Type |
| --- | --- | --- | --- |
| `SM_` | Static mesh | `AC_` | Animator controller |
| `SK_` | Skeletal mesh | `A_` | Animation clip |
| `T_` | Texture | `VFX_` | Visual effect |
| `M_` | Material | `PS_` | Particle system |
| `MI_` | Material instance | `P_` | Prefab |
| `S_` / `SG_` | Shader / Shader Graph | `VP_` | Volume profile |
| `SFX_` / `MUS_` / `AMB_` | Audio (sfx / music / ambience) | | |

## Texture suffixes

Suffix by the map carried, so packing intent is explicit and import rules can
key off it.

| Suffix | Map | Suffix | Map |
| --- | --- | --- | --- |
| `_BC` | Base colour / albedo | `_MS` | Metallic + smoothness |
| `_N` | Normal | `_R` | Roughness |
| `_AO` | Ambient occlusion | `_E` | Emissive |
| `_M` | Mask | `_ORM` | Packed occlusion/roughness/metallic |

A full set reads `T_Cliff_BC`, `T_Cliff_N`, `T_Cliff_ORM`.

## Organise by feature

- Group assets by feature or domain — `Player/`, `Boss/`, `MainMenu/` — keeping each feature's meshes, materials, textures, and shaders side by side.
- Let the type prefix carry the kind, and keep feature folders flat. Per-type subfolders inside a feature (`Material/`, `Mesh/`, `Texture/`) restate what `SM_`, `M_`, and `T_` already say.
- Type grouping earns its place only under a `Sources/` root for large shared authoring sets, not for game-ready content.

## Scenes

Name scenes `<Context>_<Layer>` in PascalCase, matching the additive layering
model: `Forest_Environment`, `MainMenu_UserInterface`, `Boss_Gameplay`. The
layer suffix maps to the bootstrap / persistent / content split in
[assets.md](./assets.md), and tells a reviewer how the scene loads.

## Keep the tree shippable

- Give every asset its real, prefixed name when it lands. Names like `Test`, `Demo`, `Tmp`, `New`, or `_rework` say nothing about content and outlive their author's memory of them.
- Quarantine genuine throwaway work under a single `Assets/_Sandbox/` root, and promote it to a real name when it ships.
- Match third-party and vendor folders to their upstream layout, so updates stay clean.
- Leave generated artifacts under their tool-owned names — lightmaps, NavMesh, APV data, TMP `… SDF.asset`, and anything under `Generated/`. Their tooling reproduces those names.

## C# conventions

- One public type per file, `filename == type name`. Satellite enums, structs, and DTOs get their own files.
- Mirror the folder path in the namespace: `Code/Combat/Weapons/` → `Project.Combat.Weapons`.
- Name each `.asmdef` file after its internal `name` field, and a test assembly after the assembly it targets — `Project.Combat.Weapons.Tests`.
- Pick one namespace depth per subsystem and apply it uniformly. Acronyms stay uppercase: `HUD`, `VFX`, `HSM`.
- Give every `Editor/` folder its own Editor-type asmdef. Assembly definitions take priority over Unity's special folder names, so inside an asmdef folder an `Editor/` subfolder is an ordinary folder and its scripts compile into the runtime assembly — silently, all the way into the player build. On a project without asmdefs, the bare `Editor/` folder still works. Runtime code reaches `UnityEditor` only inside `#if UNITY_EDITOR`.

## Renames and GUIDs

Unity references assets by the GUID stored in the `.meta` file, not by path, so
renaming is safe exactly as long as the pair travels together.

- Move or rename an asset **with its `.meta`**, and a folder with its `Folder.meta`.
- Use `git mv`, so history is preserved, LFS tracking stays intact, and the diff reads as a rename rather than delete-plus-add.
- After each batch, refresh Unity and clear the console to zero new errors and warnings before the next one. C# renames need a green compile before moving on.

Sequence a large restructure from least to most risky, one checkpoint commit and
console check per step — content moves are GUID-safe, code moves break
compilation:

```
1. Art assets   — flatten by feature, apply prefixes + texture suffixes
2. Audio/Data/Prefabs/Scenes — prefix, depluralize, sandbox placeholders
3. C# low-risk  — asmdef file/test names
4. Folder <-> namespace alignment
5. Subsystem namespace homogenization
6. One-type-per-file splits (highest volume/risk)
7. Final pass   — clean console, reviewed rename diff, EditMode tests
```
