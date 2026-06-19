# Pitfalls (symptom → cause → fix)

Failure modes seen authoring Magica Cloth via the Unity MCP, plus the documented traps.

## Tooling / MCP

1. **Unity crashes during inspection.**
   Cause: dumping heavy serialized data — `Unity_ManageGameObject` `get_components` on a
   SkinnedMeshRenderer, or a giant `Unity_RunCommand` log. Fix: log **type names / small
   fields only**; never serialize mesh/bone arrays. Page large reads.

2. **`NullReferenceException` reading a loaded prefab.**
   Cause: calling runtime methods (e.g. collider `GetSize()`) on objects from
   `PrefabUtility.LoadPrefabContents` — they're not initialized. Fix: read serialized **fields**
   instead (center is public; size via the serialized field), or inspect on a Play-mode instance.

3. **`BuildAndRun()` does nothing / throws.**
   Cause: called in **edit mode**. Fix: it's Play-only. In edit mode just set `SerializeData` and
   let `Start()` auto-build at Play; or enter Play then build.

4. **Scene capture fails.**
   `Unity_Camera_Capture` by camera ID → "Failed to render scene preview" under URP. Fix: use
   `Unity_SceneView_CaptureMultiAngleSceneView`. In Play mode it errors "No active Scene View" —
   first `ExecuteMenuItem("Window/General/Scene")` + `SceneView.lastActiveSceneView.Focus()`.

5. **Edits vanish after pressing Play.**
   Cause: entering Play reverts unsaved scene/prefab edits, and Play-mode param changes never
   persist. Fix: `SaveScene`/`SaveAsPrefabAsset` **before** Play; redo tuning in edit mode.

## Setup / simulation

6. **MeshCloth does nothing (no movement).**
   Cause: no selection data — MeshCloth auto-fills every vertex `Invalid`. Fix: supply selection
   (copy from identical mesh, paint map, or `vertexAttributeList`); set `selectionData.userEdit=true`.
   BoneCloth/BoneSpring don't have this problem.

7. **Cloth ignores colliders / passes through body (Collider Collision).**
   Causes: (a) non-uniform **global** scale on the collider or a parent bone → collision silently
   off; (b) collider not in `colliderCollisionConstraint.colliderList`; (c) mode = `None`;
   (d) collider `size` is zero (e.g. `SetSize` never called after a script-created collider).
   Note: a `JsonUtility` copy **drops `NULL` entries** from `colliderList`, so a source with broken
   (null) collider refs lands as an **empty list** on the copy → silent no-collision.
   Fix: uniform scale, re-register the real colliders by name, set mode `Point`/`Edge`, verify
   `GetSize()` is non-zero.

8. **Copied setup runs but cloth is dead / wrong renderer.**
   Cause: after `JsonUtility` copy, Unity.Object refs still point at the **source**. Fix: re-target
   `sourceRenderers` and `colliderList` to the destination by name (see mcp-authoring.md §4).
   Verify `GetSerializeData2().selectionData.IsValid()`.

9. **Selection didn't transfer between two meshes.**
   Cause: selection is keyed to vertex order; the meshes aren't identical. Fix: only copy selection
   between a true duplicate (same topology); otherwise author fresh selection.

10. **Unexplained jitter / oscillation.**
    Cause: update-mode mismatch — character animates in Animate Physics (FixedUpdate) but cloth is
    `Normal` (or vice-versa). Fix: set `AnimatorLinkage` (or match the Animator's mode). See
    pipeline.md.

11. **Cloth jitters near the body.**
    Cause: collider radius too large / overlapping particles. Fix: lower collider thickness; don't
    fix penetration with huge radii — use Surface/Collider Penetration instead (parameters.md).

12. **Leg pops out of skirt on big poses.**
    Cause: fast animation outruns collision. Fix: add **Collider Penetration** (or Surface
    Penetration); ensure its collider list is filled.

13. **Cloth too stiff or too floppy after changing iterations elsewhere.**
    Cause: expecting XPBD-style iteration-invariance — Magica is PBD-style, stiffness is empirical
    and frequency-scaled. Fix: tune `angleRestorationConstraint.stiffness` directly; don't chase a
    "physical" value.

14. **Cloth laggy under load.**
    Cause: frame rate below the 90 Hz substep target with `maxSimulationCountPerFrame=3` → steps
    dropped. Fix: optimize (Point collision, fewer proxy verts, camera culling), or raise the cap
    (linear cost). Profile in a **build**, not the editor.

15. **Runtime param change has no effect.**
    Cause: forgot to flush. Fix: `cloth.SetParameterChange()` after editing `SerializeData` at
    runtime; `collider.UpdateParameters()` after editing a live collider. Never change `[NG]`
    fields (`clothType`, `sourceRenderers`, `rootBones`, `connectionMode`) after build.

16. **Two cloths self-penetrate each other (Self vs Collider Collision confusion).**
    Cause: Collider Collision only resolves cloth ↔ registered colliders; it does **nothing** for
    cloth ↔ cloth or cloth ↔ itself. `selfCollisionConstraint.selfMode` defaults to `None`.
    Fix: set `selfMode = FullMesh` for self-collision; for two cloths (e.g. skirt front/back) set
    **Mutual Collision** via `syncMode = FullMesh` + `syncPartner`. Self-collision is beta,
    **very expensive** (∝ proxy vertex count) and vibration-prone — reserve for high-end targets,
    keep proxy meshes low.

17. **`[MC2] Sync timeout! Is there a deadlock between synchronous cloths?` at Play.**
    Cause: Mutual Collision set on **both** sides (A.syncPartner=B *and* B.syncPartner=A). Each waits
    for the other's build to finish (`ClothProcess.RuntimeBuildAsync`) → deadlock → 2 s timeout, then
    the sync is dropped (mutual collision silently lost). Fix: set `syncPartner` on **one side only**;
    the solver applies the pair to both teams via `syncTeamId`. Verify in Play: the driving cloth's
    `SyncCloth` points at the partner, the partner's is `null`.

## Verification checklist (before declaring done)

- [ ] Each cloth `IsValid() == true` in Play mode
- [ ] Visual capture compared (tilt-gravity test proves motion in bind pose)
- [ ] No body penetration in representative poses
- [ ] Update mode matches the Animator (`AnimatorLinkage`)
- [ ] `Unity_ReadConsole` `Types:["Error","Warning","Log"]` — no `error CS` / `Exception`
- [ ] Scene/prefab saved; Play-mode-only experiments reverted
