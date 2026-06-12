# Rig & collision — vcam model, orbit, occlusion

The third-person core. All numbers are **starting points**. Primary sources:
Nesky *50 Game Camera Mistakes* (GDC 2014), Cinemachine docs.

## The virtual camera model

- **Vcams are declarative configs**, not camera objects: follow/look targets,
  distance, offsets, per-axis damping, FOV, noise profile. One per context.
- **The brain owns the final camera**: picks the live vcam by priority (ties →
  most recently activated), executes blends. An **override stack** (cutscenes)
  trumps priorities — push to take over, pop to return.
- **Camera state is a struct** (position, rotation, FOV, lens, composition):
  blending = interpolating structs; a cut = a zero-length blend. The blend table
  defines curve + duration **per vcam pair** (default Ease In Out, 1.5–2 s).
- **Vcam states**: Live / Standby (tracking but not driving — enables correct
  blends from an up-to-date source) / Disabled.
- **Per-vcam pipeline**: composition → collision/occlusion → noise/shake. The
  shake layer is last, with one global intensity multiplier (accessibility for free).

## The orbit/follow rig

- Pivot at chest/head height (CM +1.0 m) → yaw/pitch orbit → distance along the
  boom (2–4 m explore). **Per-axis damping** (CM: lateral 0.1 s, vertical 0.5 s,
  depth 0.3 s) — "the vertical forgives, the lateral must respond".
- **Screen-space composition**: a **dead zone** (target moves freely), a **soft
  zone** (camera reframes at damped speed), hard limits. The camera reacts to
  *screen* position, not world position (the math is in [math-tech.md](./math-tech.md)).
- **Input**: nonlinear sensitivity (accel ramp 0.2–1 s to ~200–500°/s), stick dead
  zone (~20%), invert X/Y mandatory, aim multiplier ~0.6×.
- **Recentering — the Nesky rules**: softly rotate behind the player while running
  (mistake #22), but **never** while they touch the camera stick (#33), never right
  after they finish framing (#34), and let experts disable it (#35). Wait ~2 s idle,
  recenter over ~2 s.
- **Pitch**: clamp ±85° hard (no pole flip); couple pitch ↔ distance ↔ FOV (closer
  + wider at low angles — Nesky #14–16); CM's three-ring rig encodes this.

## Collision & occlusion (two different problems)

- **Occlusion** = something blocks the line of sight. **Collision** = the camera
  is inside geometry. Different responses.
- **Cast a volume, never a ray**: sphere cast at minimum (CM 0.2 m, UE 0.12 m
  probes); better, the near-frustum face — a zero-width ray lets the near plane see
  through walls. The near-plane corner radius math is in
  [math-tech.md](./math-tech.md).
- **Asymmetric resolve**: snap in immediately (one frame of hidden avatar is worse
  than a jump), return smoothly — and only when the *whole path* back is clear
  (kills pull-in oscillation, pitfalls #2).
- **Hysteresis**: a minimum occlusion time before reacting (ignore fugitive
  occluders), a hold time on the corrected position (pitfalls #4).
- **Whiskers**: a fan of rays anticipating obstacles, biasing yaw/distance
  preemptively; plus one ray *behind* for the backed-into-a-corner case. Nesky
  nuances: don't swing sideways for occluders coming from behind (#11), don't push
  away from an obstacle the player is deliberately steering into (#6), let the
  camera intersect narrow poles rather than zigzag (#9–10).
- **Fades**: dither world geometry that's thin/near the camera; fade the
  **character** below minimum distance — never let the near plane clip into the
  avatar (#12). In tight spaces: raise the pivot, widen FOV slightly, fade, keep a
  hard min-distance.
- **Camera-only collision layer**: simplified volumes, exclude small props/foliage/
  characters; designers place invisible camera blockers.
- The escape hatch: **cut when passing through opaque geometry** (#16) — unless
  you're one-shot (see [combat-contexts.md](./combat-contexts.md)).

## Numbers (sourced anchors)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Pivot height | +1.0 m (CM) | engine docs |
| Distance | 2–4 m explore | engine docs |
| Damping | lateral 0.1 / vertical 0.5 / depth 0.3 s (CM) | engine docs |
| Collision probe | 0.2 m (CM), 0.12 m (UE) | engine docs |
| Pitch limits | clamp ±85° hard | convention |

## Flagged gaps — do NOT invent

CM dead/soft-zone and Deoccluder default values (inspector-only) · GoW/Horizon
gameplay camera distances (no public measurements) · per-context blend durations
(anchor on CM's 2 s / practitioner 1.5 s).

## Sources

Nesky *50 Game Camera Mistakes* (GDC 2014) · Cinemachine 3.x docs (Brain,
composers, Deoccluder) · UE SpringArm source.
