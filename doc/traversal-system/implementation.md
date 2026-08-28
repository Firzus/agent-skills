# Implementation — discovery, presentation, and movement requirements

Use this reference for detection, candidate construction, warping/IK presentation,
and movement-model requirements. `character-controller` owns Unreal physical
execution, Mover integration, collision, and Network Prediction. Version-specifics
are flagged `[VER]`; uncertainty `[?]`.

## Mantle/vault/climb detection (the trace cascade)

The canonical multi-trace recipe:

1. **Forward trace** from chest/center along the forward vector to find a blocking
   wall face → capture hit location + normal (reject too-steep/shallow normals).
2. **Up-and-over trace(s)**: from above the forward hit, trace **downward** onto
   the obstacle top → the **front ledge**. (A forward eye-height trace that *misses*
   means open air above → you've cleared the ledge.)
3. **Downward landing trace** past the ledge → the **back floor** (vault target),
   confirm walkability.
4. **Capsule-fit validation**: sweep the character capsule into the candidate stand
   position to confirm clearance ("HasRoom") — the gate that rejects mantles into
   low ceilings.

**Two-trace** (forward + down) is cheap for simple step/vault; **multi-trace** adds
the back-floor and a **ray fan** (GASP/UE5ParkourSystem draw ~5 increasing forward
rays) to classify obstacle depth and pick vault vs mantle. Classification:
`ObstacleHeight` (front-ledge Z − feet Z) and `ObstacleDepth` (front → back).

**UE5 GASP detect→eval→warp pipeline** (Game Animation Sample, 5.4+): `TryTraversalAction`
runs the cascade and fills `S_TraversalCheckResult` → a **Chooser Table** maps
traversal type + dimensions to a montage → Motion Warping aligns the root motion.

> **Gotchas** `[?, community-reported]`: the GASP standing-still mantle bug (attach
> bone pinned at 1.0 m → floating) on obstacles <1 m while idle (5.5/5.7); GASP
> ships **without Foot IK** by default (lower-body distortion on high mantles, and
> Foot Placement is heavy). Trace **simple** collision broadly; flip to **complex**
> only for the precision ledge probe.

## Motion warping (align canned anim → real geometry)

The problem: a mantle authored for a 1.2 m ledge looks broken on 0.9/1.5 m. Warping
scales/skews root motion so one clip serves a height band.

- **UE5 Motion Warping**: add `UMotionWarpingComponent`; in the montage add
  `AnimNotifyState_MotionWarping` *windows* (a notify *state* with duration) with a
  RootMotionModifier (**Skew Warp** most common). Set the target at detection time:
  `AddOrUpdateWarpTargetFromLocation/…FromComponent` (with `bFollowComponent` to
  track a moving platform); the notify's Root Motion Target Name must match.
  Multiple warps per montage (Valley of the Ancient's `GA_Vault` sets FrontEdge +
  BackEdge + BackFloor). **The hard requirement**: the animation must have root
  motion during the warp window.
- **Unity**: `Animator.MatchTarget(pos, rot, bodyPart, mask, startNorm, endNorm)`
  (one active at a time); Animation Rigging + scripted root-motion adjustment.
- **IK vs warping**: warping repositions the whole root/body (gross alignment); IK
  fine-tunes end-effectors (contact). Standard stack: **warp first → IK blends in
  to polish**. They're complementary.

## Procedural climbing / IK

- **Two-bone arm IK** (shoulder → elbow → hand) with a pole/hint for elbow
  direction: UE5 Control Rig **FBIK** or `TwoBoneIK`; Unity Animation Rigging
  `TwoBoneIKConstraint` (+ Hint).
- **Raycast-driven effector loop** (AC/Uncharted style): raycast from each hand
  toward the surface → set the hand IK target to the hit, orient palm to the normal
  → **blend IK weight 0→1** over a few frames as the character nears. Dynamic pole
  vector or the elbow pops through the wall.
- **Effector-driven procedural rigs** (climb-anything): a 5-effector model
  (`R/L_HAND`, `R/L_FOOT`, `ROOT`) with LAST/CURRENT/NEXT states; ROOT *derived*
  from the hands; hand-holds validated (reach/clearance) before becoming NEXT and
  streamed on-demand. **Reach clamping** is mandatory (never exceed limb length).
- The pragmatic split: animation carries the gross pose; warping does world
  alignment; IK does contact; fully-procedural effector systems only when geometry
  is too varied to author clips — most shipped systems are **mostly animation + IK
  polish**.

## Surface probing at scale

- **Ray fan** (cheap, classifies depth, misses narrow ledges) vs **shape sweep**
  (`SweepMulti…` capsule, robust against gaps, needed for capsule-fit).
- **Complex vs simple collision (the key optimization)**: probe simple collision
  broadly; refine to complex only on the final ledge/contact probe. Complex = exact
  render triangles = "very heavy".
- **Normal aggregation & hysteresis**: average wall normals across probe points so
  a bumpy triangle doesn't jitter the orientation; different enter/exit thresholds
  to stop oscillation (pitfalls #2).
- **Probe only near candidacy**: gate the expensive cascade on player intent
  (jump/traverse pressed) + a proximity broadphase, then run it for that window.
  Foot IK at scale is brutal (50 chars × 2 traces × 60 fps = 6,000 traces/s) — use
  temporal LOD (every 2nd/3rd frame for distant chars), disable IK >30–40 m, cache
  when stationary, two-bone instead of FBIK.

## Wall-run & grapple physics

- **Wall-run**: traversal supplies a semantic request and stable wall-contact frame.
  A project-owned Mover mode projects captured intent onto the wall plane
  (`V − (V·N)N`), applies the declared gravity/contact policy, and emits the exit
  outcome when contact becomes invalid. Traversal never calls movement-mode setters.
- **Grapple/swing as a constrained pendulum**: raycast to pick the anchor; the
  dominant solve is **position-based Verlet + a distance constraint** (integrate,
  then if `dist(player, anchor) > tetherLength` pull back onto the radius — Verlet
  ≈ conserves energy, so the pendulum neither decays nor explodes). The correction
  must run **through the Mover-owned collision path** so the swung body still collides
  (pitfalls #9). Real constraint swings decay → inject the player's input energy
  near the bottom of the arc to feel like Spider-Man. Render the rope decoupled
  (UE Cable Component / a Verlet chain); snapshot nearby colliders once per frame,
  reuse across iterations.

## Mover execution and networking

- This repository's Unreal controller contract is Mover-only. Map semantic
  traversal modes and influences to capabilities verified in the installed engine.
- Capture the accepted request, candidate revision, resolved field values, and
  lease state in the appropriate Mover Input/Sync/Aux representation.
- Keep resimulation self-contained: read captured state rather than traversal,
  GAS, volumes, anchors, camera, or mutable world policy.
- Let Mover own collision-resolved displacement and return typed outcomes.
  Traversal/gameplay commit persistent effects only from confirmed, deduplicated
  outcomes.
- Route authored root motion through the verified Mover integration path.
- If the installed Mover version lacks a required capability, stop the build branch
  and report the gap; keep CMC outside this contract.

## Unity ↔ UE5 mapping

| Concern | UE5 | Unity |
| --- | --- | --- |
| Movement base | Project-owned Mover modes/layered moves | Kinematic Character Controller + state machine |
| Custom submodes | Semantic mode IDs mapped to verified Mover types | hand-rolled enum |
| Align anim→geometry | **Motion Warping** (`AddOrUpdateWarpTarget*`, Skew Warp) | `Animator.MatchTarget` + Animation Rigging |
| Limb IK | Control Rig FBIK, `TwoBoneIK`, Foot Placement | Animation Rigging `TwoBoneIKConstraint`, FinalIK (3rd-party) |
| Anim selection | Chooser Table + Motion Matching | Animator state machine + blend trees |
| Ledge probe | `LineTrace*`/`SweepMulti*` (`bTraceComplex`) | `Raycast`/`CapsuleCast`/`SphereCast` |
| Rope/swing | Verlet/distance constraint; Cable Component for render | Verlet or Configurable Joint; LineRenderer |
| Net prediction | Mover Input/Sync/Aux state on Network Prediction | manual / DOTS NetCode |
| Reference project | **GASP** (Game Animation Sample), Valley of the Ancient | Starter Assets + community KCC samples |

## Flagged gaps — do NOT invent

GASP mantle/float bugs and the "swap to walk montage" fix are community-reported,
not Epic-documented · installed Mover APIs and root-motion hooks are
version-sensitive — run the capability gate rather than projecting a timeline ·
FBIK/Foot Placement perf numbers are single-report anecdotes.

## Sources

Epic — Valley of the Ancient docs (Motion Warping notify states);
`UMotionWarpingComponent` and installed Mover documentation/source · UE forums
(GASP mantle bug) ·
GitHub `peilunnn/UE5ParkourSystem`, `Pavel-Konarik/ReplicatedMovementWallrun` ·
MoCap Online (climbing trace cascade, animation LOD) · UpRoom Games (procedural
climbing 5-effector) · Unity Animation Rigging docs · Elliot Couvignou (client-
predicted custom movement) · moonjump/toqoz.fyi (Verlet rope).
