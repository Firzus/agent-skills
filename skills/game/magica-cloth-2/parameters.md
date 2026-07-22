# Parameters & calibration

Magica Cloth is **PBD-style** (position projections with stiffness as a 0–1 blend, scaled by
the simulation frequency — not XPBD/compliance; see pipeline.md). Tuning order matters:
**Angle Restoration dominates motion** — adjust it first, then Inertia, then collision.

All curve params are `CurveSerializeData`: `.SetValue(value)` for a constant, or
`.SetValue(startValue, endValue, ...)` to vary by particle depth.

## Tuning order (official guidance)

1. **Force** (gravity, air drag) — sets the overall pull.
2. **Angle Restoration** — "the majority of movement is determined here."
3. **Inertia** — reduce if cloth over-reacts to run/jump.
4. **Collision** — stop body penetration.
5. Shape restoration (Distance/Tether/Bending) — usually leave at defaults.

## Constraint reference

| Group | Field (SerializeData) | Meaning | Default / start |
| --- | --- | --- | --- |
| Force | `gravity` | magnitude 0–10 | 3–5 cloth, lower for hair (~1.5) |
| Force | `gravityDirection` | world dir (float3) | `(0,-1,0)` |
| Force | `gravityFalloff` | reduce gravity near fixed roots | 0 |
| Force | `damping` | air resistance (curve) | 0.05 |
| Angle Restoration | `angleRestorationConstraint.stiffness` | rotation restored per pass — **main control** | 0.1–0.3 (higher = snappier) |
| Angle Restoration | `.velocityAttenuation` | lower → springier bounce; higher → relaxed | 0.5–0.7 |
| Angle Restoration | `.gravityFalloff` | weakens restore opposing gravity (anti hair-flip) | 0–1 |
| Angle Limit | `angleLimitConstraint.limitAngle` | max bend angle of an edge (curve) | per preset |
| Distance | `distanceConstraint.stiffness` | keep edge rest length | 1.0 |
| Tether | `tetherConstraint.distanceCompression` | % a vertex may shrink toward its root; keeps shape | 0.8+ (lower only in special cases) |
| Triangle Bending | `triangleBendingConstraint.stiffness` | resist adjacent-triangle folding (MeshCloth shape) | 1.0 (no triangles → no effect) |
| Inertia | `inertiaConstraint.*` (world/local/depth/centrifugal, speed limit, smoothing) | how much character motion transfers to cloth | preset; lower to calm |
| Collider Collision | `colliderCollisionConstraint.mode` | `None` / `Point` / `Edge` | **Point** (Edge only if slipping — several× cost) |
| Collider Collision | `.colliderList` | colliders this cloth reacts to | body bones |
| Collider Collision | `.friction` | resistance to sliding on contact | raise to stop sliding |
| Self Collision | `selfCollisionConstraint.selfMode` | cloth-vs-itself (`None`/`FullMesh`) | **None** (very expensive; desktop only) |
| Self Collision | `.surfaceThickness` | contact thickness (both primitives summed); radius is ignored here | 0.005 m start |
| Mutual Collision | `.syncMode` + `.syncPartner` | cloth-vs-another-cloth (e.g. skirt front/back) | set on **one side only** — both sides → build deadlock (pitfall #17) |
| Mutual Collision | `.clothMass` | weight ratio: heavier cloth moves less in the pair | 0 = equal; raise on the cloth that should win |
| Spring | `springConstraint.*` (**BoneSpring only**) | spring power, limit distance, normal-limit ratio, noise | preset |

## Penetration (cloth clips through body on fast motion)

Colliders alone can't stop fast poses. Add a penetration constraint (design-time data):
- **Surface Penetration** — robust general fix; preferred when available.
- **Collider Penetration** — replacement for Surface, for the "leg pops out of skirt" case;
  ties particles to nearest collider with a max penetration distance. Don't forget to fill its
  collider list. Less robust than Surface.

Avoid fixing penetration by cranking collider thickness — high radius causes **jitter**.

## Presets (ship with the plugin, under `Res/Preset/`)

| Preset | For |
| --- | --- |
| `MC2_Preset_Skirt` | skirts (MeshCloth) |
| `MC2_Preset_Tail` | tails / hair chains (BoneCloth) |
| `MC2_Preset_SoftSpring` / Middle / Hard | BoneSpring jiggle |

Start from a preset (`ClothSerializeData.ImportJson` of the preset JSON, or the Inspector
Preset menu), then tune. Presets set sensible Inertia/Angle values per archetype.

## Stylized anime look (tuning recipe)

For cel-shaded / anime characters, the goal is **readable, controlled secondary motion**, not
physical realism: silhouette preserved, snappy stop, bounded swing, no realistic creasing. This
is a deliberate stylistic bias — drive it through the **bone-based** types (BoneCloth/BoneSpring),
not vertex MeshCloth, and tune toward the values below. Magica is PBD-style, so these are empirical
**starting points** (frequency-scaled), not physical constants — tune by eye.

The look is built from four levers: **bounce** (low `velocityAttenuation`), **clean stop** (high
`damping`), **bounded amplitude** (tight `angleLimitConstraint.limitAngle`), and **light, floaty
fall** (low `gravity`). High `angleRestorationConstraint.stiffness` keeps the drawn silhouette.

| Element | Type | gravity | damping | angleRestoration.stiffness | velocityAttenuation | limitAngle | Colliders |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Hair (bangs, side, long) | BoneCloth | ~1.5 (floaty) | ~0.1 | 0.1–0.2 (taper root→tip) | low (~0.3) → springy bounce | moderate (45–90) | head + chest sphere/capsule |
| Skirt — flared | BoneCloth radial / MeshCloth | 3–5 | 0.05–0.1 | 0.05–0.1 | low-mid | wide (60–90) | thigh/hip capsules + Collider Penetration |
| Skirt — pleated / stiff | BoneCloth radial | 3–5 | 0.1 | 0.2–0.3 (holds shape) | mid | tight (30–45) | thigh/hip capsules |
| Cape / streamers / ribbon | BoneCloth | 2–4 | mid | 0.1 | low (marked follow-through) | wide | back/belt anchor |
| Chest / accessories jiggle | BoneSpring | (auto) | — | — | use `SoftSpring`/`MiddleSpring` preset | — | register `collisionBones` |

Supporting tuning:
- **Centrifugal flare:** raise `inertiaConstraint` centrifugal so hair/ribbons "open up" on spins —
  a stylized, exaggerated cue. Cap with the world/local **speed limit** so fast motion stays clean.
- **Smoothing:** `inertia` world smoothing ~0.2–0.4 softens start/stop without killing reactivity.
- **Self-collision:** keep `selfCollisionConstraint.selfMode = None` — the clean, crease-free look
  doesn't need it, and it's expensive/vibration-prone (see pitfalls.md #16).
- **Per-depth stiffness:** use the curve form `.SetValue(rootValue, tipValue, ...)` to keep roots
  stiff and tips loose — this preserves the silhouette while letting ends swing.

**Limits of the engine for this look:** Magica is a physics sim — there is no native "reverse the
motion" / arbitrary stylized animation curve. It nails believable bounce + follow-through, but the
extreme hand-timed snap of authored anime is layered **on top** (hand animation + `Blend Weight`),
not produced by the solver. Also, for a **single long chain** (ponytail, long sleeve), a dedicated
spring-bone system (e.g. VRM SpringBone) can draw a cleaner gravity arc than BoneCloth — a hybrid
setup (spring-bone chains for hair + MeshCloth for the skirt + BoneSpring for jiggle) is legitimate
and common.

## Wind

Cloth reacts only to a `MagicaWindZone` component in the scene (Unity's built-in WindZone does
nothing). Per-cloth influence via `serializeData.wind`. Zone params: Main (m/s), Turbulence,
Direction Angle X/Y, `IsAddition` (additive, up to 3 stacked; otherwise lowest-volume zone wins;
GlobalDirection = volume ∞, lowest priority). Strong wind invites penetration — keep moderate.

## BoneSpring specifics

Spring acts on **fixed** vertices (they sway, unlike BoneCloth where fixed = anchored); moving
child vertices act as a **pendulum** that drives the spring rotation. Limitations: gravity
auto-disabled, connection forced to Line, collision forced to Point, self-collision/backstop/
custom-skinning unavailable, Transform collision off unless registered in `collisionBones`.
