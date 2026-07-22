---
name: magica-cloth-2
description: >-
  Author and tune cloth physics with Magica Cloth 2 in Unity, code-first via the
  Unity MCP (Unity_RunCommand) — BoneCloth / MeshCloth / BoneSpring setup, capsule/
  sphere/plane colliders, constraint parameters, runtime build, and in-editor visual
  testing. Use when adding or fixing cloth/jiggle on a character (skirt, hair, cape,
  tail, chest, accessories), when cloth clips through the body, jitters, feels too
  stiff/floppy, penetrates on fast motion, or when the user mentions Magica Cloth,
  MagicaCloth, cloth simulation, or dynamic bones in a Unity project.
---

# Magica Cloth 2 (code-first authoring via Unity MCP)

Set up and tune cloth simulation on a Unity character **without clicking the
Inspector** — by running C# in the Editor through the Unity MCP `Unity_RunCommand`
tool. Magica Cloth 2 exposes its entire config as a public `ClothSerializeData`
plus a `BuildAndRun()` entry point, so every Inspector action is reproducible from
script. This is validated ground truth on **v2.8.0** (full C# source under
`Assets/Plugins/MagicaCloth2/`).

The look lives in **authored data** (cloth type, vertex/bone selection, collider
placement, constraint curves), not in code. Plan the data first; the solver is fixed.

## Prerequisites (verify, else stop)

1. **Magica Cloth 2 present.** `Assets/Plugins/MagicaCloth2/` (or a UPM package). Check
   the version in `.../Editor/EditorExtension/AboutMenu.cs` — feature gating depends on it.
2. **Unity MCP connected.** `Unity_RunCommand`, `Unity_ManageEditor`, `Unity_ReadConsole`
   available. If not, stop and tell the user.
3. **Target character** with a humanoid/skeleton rig and SkinnedMeshRenderer(s). For
   MeshCloth, the source mesh must be **Read/Write ON** and **Optimize GameObjects OFF**.

## Decision: pick the cloth type first

Everything downstream depends on this. See [pipeline.md](./pipeline.md) for internals.

| Type | Simulates | Use for | Selection data | Cost |
| --- | --- | --- | --- | --- |
| **BoneCloth** | Transform chains | hair, tails, cords, skirts **with bones** | auto (root=Fixed, rest=Move) | low |
| **MeshCloth** | mesh vertices (proxy) | skirts/capes **without bones**, on the skinned mesh | **mandatory** (else nothing moves) | high — desktop/console |
| **BoneSpring** | spring on Transforms | chest/butt jiggle, soft secondary motion | auto | low |

**The #1 gotcha:** MeshCloth auto-selection fills every vertex `Invalid` → the cloth
does nothing. You **must** supply selection data (paint, paint map, or attribute array).
BoneCloth/BoneSpring auto-generate a usable selection. Prefer **BoneCloth** for new
elements when bones exist; reserve MeshCloth for boneless geometry on the body mesh.

## Quick start — BoneCloth from script (runtime build)

Run via `Unity_RunCommand` (class **must** be `internal CommandScript : IRunCommand`).
Build (`BuildAndRun`) only runs in **Play mode**; in edit mode just set data and let
`Start()` auto-build at play. Full MCP recipes (edit-mode authoring that persists,
copying an existing setup, colliders, re-targeting) are in
[mcp-authoring.md](./mcp-authoring.md).

```csharp
using MagicaCloth2; using UnityEngine; using Unity.Mathematics;
internal class CommandScript : IRunCommand {
  public void Execute(ExecutionResult result) {
    var go = GameObject.Find("Character/Hair");
    var cloth = go.AddComponent<MagicaCloth>();
    var sd = cloth.SerializeData;
    sd.clothType = ClothProcess.ClothType.BoneCloth;          // [NG] runtime: set before build
    sd.rootBones.Add(GameObject.Find("hair_root_L").transform);
    sd.gravity = 3.0f;
    sd.damping.SetValue(0.05f);
    sd.angleRestorationConstraint.stiffness.SetValue(0.15f, 1.0f, 0.15f, true);
    sd.colliderCollisionConstraint.mode = ColliderCollisionConstraint.Mode.Point;
    result.RegisterObjectCreation(go);                         // undo tracking
    // cloth.BuildAndRun(); // only in Play mode; otherwise Start() auto-builds
  }
}
```

## Workflow

1. **Inspect.** Read the rig, renderers, existing cloth/colliders with a *lightweight*
   `Unity_RunCommand` (component type names only — never dump SkinnedMeshRenderer data,
   it crashes Unity). See [pitfalls.md](./pitfalls.md).
2. **Choose type** (table above). Confirm Read/Write for MeshCloth.
3. **Colliders first.** Add `MagicaCapsuleCollider`/`MagicaSphereCollider` on body bones
   (thighs, hips, head, chest). **Uniform global scale only** or collision fails.
4. **Author the cloth.** Set `SerializeData`; for MeshCloth also supply selection data.
   Register colliders in `colliderCollisionConstraint.colliderList`.
5. **Parameters.** Start from a preset, then tune Angle Restoration first (it dominates
   motion), then Inertia, then collision. Calibration table in [parameters.md](./parameters.md).
   For a stylized cel-shaded / anime look (readable, bounded, snappy secondary motion), use the
   bone-based types and the tuning recipe in [parameters.md](./parameters.md#stylized-anime-look-tuning-recipe).
6. **Build & test.** Enter Play (`Unity_ManageEditor` Play), confirm each cloth
   `IsValid()==true`, capture the scene, compare. See [mcp-authoring.md](./mcp-authoring.md).
7. **Verify console** (mandatory): `Unity_ReadConsole` with `Types:["Error","Warning","Log"]`,
   grep `error CS` / `Exception`. Fix before declaring done.

## Runtime-change rule

- `[NG]` fields (set **before** build, never after): `clothType`, `sourceRenderers`,
  `rootBones`, `connectionMode`.
- `[OK]` fields (gravity, radius, damping, constraints): after changing at runtime, call
  `cloth.SetParameterChange()`. After changing a live collider, call `collider.UpdateParameters()`.

## Reference map

| File | Covers |
| --- | --- |
| [mcp-authoring.md](./mcp-authoring.md) | `Unity_RunCommand` patterns, edit-mode persist via `LoadPrefabContents`, copy+re-target an existing setup, collider creation, selection-data generation, Play-mode testing & scene capture |
| [parameters.md](./parameters.md) | Every constraint (Force, Angle Restoration/Limit, Distance/Tether/Bending, Inertia, Collision, Self-Collision, Spring), calibration numbers, presets, **stylized anime-look recipe**, penetration fixes, wind |
| [pipeline.md](./pipeline.md) | How the solver works (PBD-style, 90 Hz substeps, constraint order), update modes, culling, pre-build, **v2.8.0 feature gating** |
| [pitfalls.md](./pitfalls.md) | Failure modes (symptom → cause → fix): Unity crashes, MeshCloth dead, clipping, jitter, scale, update-mode oscillation |

## Version note

This skill is validated on **2.8.0**. Absent before later versions: **distance culling**
(2.10), **collider symmetry** `ColliderSymmetryMode` (2.15), **batch jobs** (2.14). Camera
culling, self-collision, and pre-build are present. Check `AboutMenu.cs` and confirm an API
exists before using it; see [pipeline.md](./pipeline.md).
