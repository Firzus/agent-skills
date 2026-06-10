# Architecture — vcams, rig, collision, combat, dialogue, feel

The components of a production third-person camera. All numbers are
**starting points — tune by playtest**. Primary sources: Nesky *50 Game
Camera Mistakes* (GDC 2014), Cinemachine docs, GoW 2018 cinematography
talks (GDC 2019), Eiserloh *Juicing Your Cameras* (GDC 2016).

## The virtual camera model

- **Vcams are declarative configs**, not camera objects: follow/look
  targets, distance, offsets, per-axis damping, FOV, noise profile. One
  per context (explore, combat, aim, dialogue, cutscene, photo).
- **The brain owns the final camera**: picks the live vcam by priority
  (ties → most recently activated), executes blends. An **override
  stack** (used by cutscenes/timeline) trumps priorities — push to take
  over, pop to return.
- **Camera state is a struct** (position, rotation, FOV, lens,
  composition): blending = interpolating structs; a cut = a zero-length
  blend. The blend table defines curve + duration **per vcam pair**
  (default: Ease In Out, 1.5–2 s), with wildcards.
- **Vcam states**: Live / Standby (tracking but not driving — enables
  correct blends from an up-to-date source) / Disabled.
- **Per-vcam pipeline**: composition → collision/occlusion resolution →
  noise/shake/impulse. The shake layer is the last stage, with one
  global intensity multiplier (accessibility hooks for free).

## The orbit/follow rig

- Pivot at chest/head height (CM default: +1.0 m) → yaw/pitch orbit →
  distance along the boom (2–4 m explore).
- **Per-axis damping** (CM defaults: lateral 0.1 s, vertical 0.5 s,
  depth 0.3 s) — "the vertical forgives, the lateral must respond".
- **Screen-space composition** (the composer model): a **dead zone**
  (target moves freely), a **soft zone** (camera reframes at damped
  speed), hard limits. The camera reacts to *screen* position, not
  world position.
- **Input**: nonlinear sensitivity (accel ramp 0.2–1 s to max
  ~200–500°/s), stick dead zone (worn sticks reach ~20%), invert X/Y
  mandatory, aim multiplier ~0.6×.
- **Recentering — the Nesky rules**: softly rotate behind the player
  while running (mistake #22: leaving yaw alone is a mistake); but
  **never** while the player is touching the camera stick (#33), never
  right after they finish framing (#34), and let experts disable it
  (#35). Wait ~2 s idle, recenter over ~2 s.
- **Pitch**: clamp ±85° hard (no pole flip); couple pitch ↔ distance ↔
  FOV (closer + wider at low angles — Nesky #14–16); CM's three-ring
  rig encodes this as top/middle/bottom orbits on a spline.

## Collision & occlusion (two different problems)

- **Occlusion** = something blocks the line of sight. **Collision** =
  the camera is inside geometry. Different responses.
- **Cast a volume, never a ray**: sphere cast at minimum (CM 0.2 m, UE
  0.12 m probes); better, the near-frustum face (or its 4 corner rays)
  — a zero-width ray lets the near plane see through walls.
- **Asymmetric resolve**: snap in immediately (one frame of hidden
  avatar is worse than a jump), return smoothly — and only when the
  *whole path* back is clear, not just the current spot (kills pull-in
  oscillation).
- **Hysteresis**: a minimum occlusion time before reacting (ignore
  fugitive occluders), a hold time on the corrected position.
- **Whiskers**: a fan of rays anticipating obstacles, biasing yaw/
  distance preemptively; plus one ray *behind* for the backed-into-a-
  corner case. Nesky nuances: don't swing sideways for occluders coming
  from behind (#11), don't push away from an obstacle the player is
  deliberately steering into (#6), let the camera intersect narrow
  poles rather than zigzag (#9–10).
- **Fades**: dither world geometry that's thin/near the camera; fade
  the **character** below minimum distance — never let the near plane
  clip into the avatar (#12). In tight spaces: raise the pivot, widen
  FOV slightly, fade, and keep a hard min-distance.
- **Camera-only collision layer**: simplified volumes, exclude small
  props/foliage/characters; designers place invisible camera blockers.
- The escape hatch: **cut when passing through opaque geometry** (#16)
  — unless you're one-shot (below).

## Combat cameras

- **Soft-lock (Genshin/GoW)**: a continuous yaw *bias* of a few degrees
  toward the engaged enemy (weighted by screen angle, distance, aggro),
  always overridden by input — and **always toggleable** (players turn
  off fighting cameras).
- **Hard lock-on (the Z-targeting lineage)**: aim between player and
  target, frame both on a diagonal (thirds — the avatar never occludes
  the target); distance/FOV pull back as they separate; flick-to-switch
  (sorted by screen angle); movement becomes target-relative strafe.
  **Release rules are explicit** (death, range, LoS lost > N s) and the
  rotation to a new target has an angular speed cap — no whiplash.
  Elden Ring's selection heuristic (reverse-engineered): crosshair
  distance + player distance + obstruction + aggression + frontal cone.
- **Group framing**: weighted centroid of engaged enemies (threat,
  distance, attack recency) as a secondary look target; zoom-to-fit
  with **hard limits** (never infinite pull-back). CM TargetGroup +
  GroupFraming is the reference.
- **Big enemies (the GoW troll problem)**: a close camera on a 6 m
  enemy shows knee texture. Pull back by target bounds, raise the pivot
  to torso/head, widen FOV — and accept that camera and encounter
  design are co-dependent (GoW added off-screen enemy arrows + audio
  cues because the close camera reduced awareness).
- **Hit feedback**: trauma-fed shake (below); during hit-stop the shake
  runs on **unscaled time**; directional impulses (kick along the hit
  direction with spring-back) beat isotropic noise.
- **Boss arenas**: camera volumes force distance/yaw/confinement.

## Contextual states & volumes

- Each context = a vcam; transitions = blends from the table. Aim:
  tight shoulder offset, shoulder swap (~0.2 s blend), FOV zoom,
  reduced/stiffer sensitivity. Climb: pitch biased up. Interiors: auto
  distance reduction (volume- or ceiling-raycast-triggered), upper
  pitch clamp.
- **Designer camera volumes** — the standard level-design tool: placed
  volumes overriding settings (distance, pitch, FOV, or a whole vcam)
  with blend in/out. The Uncharted 3 reference: triggers *push* cameras
  onto a priority stack; entering zone B mid-blend blends from the
  current blended state (FIFO of blend timers).
- **Cinematic takeovers** (reveals, pans): push a high-priority vcam,
  then pop — with **snapshot/restore** of the player's yaw/pitch/
  distance (the `scene-flow-manager` cutscene contract; restore by
  blend, never teleport).

## The one-shot constraint (GoW 2018)

Zero cuts for ~30 h. What it costs architecturally: every transition is
a continuous blend (no cut entry in the blend table); cutscenes start
where the gameplay camera is and *put it back down* in a playable spot;
every camera move must be **motivated** (action, a character's gaze);
blends need **valid paths** (waypoints/splines through openings, or
hidden cuts — a character/wall filling the frame for one frame);
dialogue loses shot-reverse-shot and becomes physical choreography.
Worth it for intimate single-character narratives with heavy previz
budgets; for everything else, traditional cuts are the right default.

## Procedural dialogue cameras

The scalable answer to thousands of conversations (the Genshin pattern):

- Generate candidate shots per speaker (close-up, medium, two-shot,
  over-the-shoulder) anchored on head sockets, corrected for height
  differences.
- **Encoded composition rules**: rule of thirds, look-room on the gaze
  side, and the **180° line** (all shots from one side of the
  speaker axis — crossing it flips eyelines and disorients; implement
  as an orbit constrained to a half-space with an explicit "flip"
  command).
- Selection heuristics: alternate reverse shots per speaker; a default
  shot per speaker with per-line overrides (data tags); wide
  establishing shot at open, close-ups as intensity rises.
- **Validate before activating** (raycast the speaker's head, camera
  not in a wall), degrade gracefully: alternate same-type shot →
  wider two-shot → unchanged gameplay camera (always valid).
- Enter with a cut (expected film grammar), exit with snapshot/restore.

## Feel & accessibility

- **The trauma model** (Eiserloh): `trauma ∈ [0,1]`; events add
  (+0.2 small, +0.5 explosion); linear decay (~1.5/s); effective shake
  = trauma² (big hits dominate, small ones stay subtle). **Perlin
  noise, never per-frame random**; one seed per channel (yaw/pitch/
  roll); **rotational-only in 3D** (translation clips into walls);
  amplitude caps (5–10° max). Useful frequencies **0.1–4 Hz** (CM
  docs) — the often-cited 10–25 Hz exceeds what frame rates render.
  Lower amplitude at narrow FOV (telephoto amplifies).
- **Impulses**: directional kicks with decay envelopes, spatial falloff
  from the source — an event bus (sources emit, per-vcam listeners
  receive with gain). One application point.
- **FOV as feel**: sprint +5–10° (in ~0.15 s, out ~0.3 s); aim narrow.
  Never fast FOV shifts (Nesky #41 — a nausea trigger); FOV is part of
  the blended camera state, never a direct set.
- **Motion-sickness baseline (non-negotiable)**: FOV slider, shake
  intensity 0–100% (trivial with the single shake layer), head-bob and
  motion-blur toggles, camera acceleration limits, no un-initiated
  snaps; don't couple the camera to the walk cycle or vertical jump
  (#43–44 — filter the pivot). Comfort is the default; effects are
  opt-in. (XAG 117, Game Accessibility Guidelines.)
- **Photo mode**: a max-priority vcam + snapshot/restore; free cam with
  constraints — measured: GoW's 3.5 m radius was criticized, Horizon
  ~5 m with a cylindrical bound and ~150° tilt limit; be ≥5 m. Roll
  ±90°, FOV/focal/DOF controls, pause + HUD-hide integration.

## Undocumented — do NOT present as fact

GoW/Horizon gameplay camera distances (no public measurements) · CM
dead/soft-zone and Deoccluder default values (inspector-only) · lock-on
flick thresholds, cone angles, Zelda values (only FromSoft's param
*structure* is datamined) · per-context blend durations (anchor on CM's
2 s default and practitioner 1.5 s) · photo-mode movement speeds · FOV
transition deg/s ceilings.

## Sources

Nesky *50 Game Camera Mistakes* (GDC 2014) · Eiserloh *Juicing Your
Cameras With Math* (GDC 2016) · GoW: Arazi *Cinematography of God of
War* + Sheth *Evolving Combat* (GDC 2019) · *The Cameras of Uncharted 3*
(GDC 2012) · Cinemachine 3.x docs (Brain, composers, Deoccluder,
TargetGroup, Impulse, Noise) · UE SpringArm source + Lyra camera modes +
GPC dev diaries (Chabant) · soulsmodding LockCamParam + Elden Ring
lock-on analysis (Jeleniauskas) · hakjak 180° rule · XAG 117 /
gameaccessibilityguidelines.com · TheFourthFocus photo-mode
measurements.
