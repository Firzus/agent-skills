# Assets & content — naming, references, Asset Manager, World Partition

## Naming & folders

- **DO** enforce prefix naming (`BP_`, `SM_`, `SK_`, `M_`, `MI_`,
  `T_..._D/_N`, `WBP_`, `ABP_`, `L_`, `DA_`, `NS_`) per the widely adopted
  style guides (Allar/ue5-style-guide lineage, Epic's recommended
  conventions). Prefixes make Content Browser filtering, reference auditing,
  and validator rules possible at 100k-asset scale.
- **DO** structure folders by **feature/domain** under a single project root
  (`/Game/ProjectName/Characters/Hero/...`), with `Core` and `Developers/`
  sandbox folders.
- **DON'T** mirror asset-type folders at top level (`/Meshes`, `/Textures`)
  or allow freeform names ("finalMesh2_new").

## References: soft by default

- **DO** use **`TSoftObjectPtr`/`TSoftClassPtr` + async loading**
  (`FStreamableManager`, `AsyncLoadPrimaryAsset`) for anything not always
  needed — one hard-reference chain from a character BP can pull hundreds of
  MB into memory at load.
- **DON'T** hard-reference everything via `UPROPERTY` object pointers and
  `TSubclassOf` chains.
- **DO** register gameplay-defining data as **Primary Assets** with the
  **Asset Manager** (scan rules, cook rules, asset bundles): ID-based
  querying, chunk assignment, explicit cooking. Unregistered soft refs can
  resolve to null in cooked builds.

## Data-driven content

- **DO** use **Data Assets** (`UPrimaryDataAsset`) for structured per-item
  definitions and **Data Tables / Curve Tables** for bulk tabular balancing
  data imported from CSV.
- **DON'T** encode item/ability/config data inside Blueprint class defaults —
  data in BP defaults requires checking out logic assets to tune numbers,
  and doesn't diff cleanly.

## World structure

- **DO** build open worlds on **World Partition**: automatic grid streaming,
  streaming sources, Data Layers, HLOD generation. Classic level streaming
  remains correct for hub-and-instance, same-3D-space overlays, or small
  disconnected maps.
- **DON'T** manually divide open worlds into sublevels with streaming
  volumes — that's the UE4 workflow World Partition replaces.
- **DO** keep **OFPA (One File Per Actor)** enabled for collaborative level
  work (mandatory in WP levels): it eliminates level-file lock contention,
  is editor-only, and embeds actors back at cook.
- **DON'T** disable OFPA "so there are fewer files".

## Hygiene

- **DO** fix up redirectors regularly and validate references before
  deleting or moving assets.
- **DON'T** move or rename assets in the OS file explorer — Unreal tracks
  references via package paths; out-of-editor moves silently break the
  reference graph.
