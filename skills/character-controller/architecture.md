# Architecture — solver, states, ground, feel, animation

The components of a production character controller, with shipped-game
evidence. All numbers are **starting points — tune by playtest**.

## Collide-and-slide (the solver)

The canonical kinematic algorithm (PhysX CCT, Unity CharacterController,
UE `SafeMoveUpdatedComponent`, Godot `move_and_slide`, Fauerby 2003):

```
1. Depenetrate: resolve existing overlaps (iterative, capped)
2. Sweep the capsule along displacement; stop skin_width short of the hit
3. Move to hit point; collect contact plane(s)
4. Project remaining velocity on the plane: v -= n * dot(v, n)
   (two planes constraining -> slide along the crease: cross(n1, n2))
5. Iterate 2-4 until displacement exhausted or max iterations (3-5)
```

- **Capsule** is the default shape: no yaw snagging, the spherical bottom
  smooths steps, sweeps are cheap. Boxes snag; spheres are too short.
- **Skin width**: ≥ 0.01 m and ~10% of radius (Unity official rule). Too
  small → stuck; too large → jitter and visible hover.
- **Bound depenetration impulses** — uncapped ejection velocity is how Sea
  of Thieves' "ladder launching" exploit happened.

## Movement state machine

Hierarchical: top-level modes (Grounded, Airborne, Climb, Swim, Glide),
sub-states inside modes (sprint, crouch, dash inside Grounded). This is the
structure UE's CMC formalizes (`Walking/Falling/Swimming/Flying/Custom`,
each owning its own physics update, with entry/exit hooks doing transition
bookkeeping — entering Walking re-runs floor detection and flattens
vertical velocity).

**Transition authoring:** candidate states test entry conditions in
**priority order** each tick (climb > mantle > jump > fall > ground) —
prioritized claims, not a free-for-all edge graph. Each state declares what
can interrupt it (Celeste's readable shipped example: integer states +
begin/update/end function triples, dash preempts nearly everything).

**Every state validates its preconditions every tick** (does the climb
surface still exist? is the water volume still there?) and has a fallback
transition to Airborne/Grounded. No terminal states without timeouts.

## Ground handling

- **Detection by shape cast, not a single ray** — a downward capsule/sphere
  sweep plus a line trace (UE `FindFloor` does both: a sweep resting on an
  edge reports misleading normals). Maintain a floor-result struct:
  walkable?, distance, normal, base object.
- **Perch handling**: rim rays distinguish "perched on an edge" from
  "grounded" (UE `PerchRadiusThreshold`). Distinguish **ground hit** from
  **stable ground** — a residual contact on the capsule's round bottom can
  claim grounded over a void.
- **Slope limit** 45–50°: above it, deny ground state and force
  gravity-aligned slide (project gravity on the surface plane). Optionally
  scale move speed by ground angle via a designer curve (Genshin-style)
  instead of a hard binary.
- **Step-up** (three-phase: up by step height → forward → down; accept only
  if landing is walkable): 25–45 cm typical.
- **Ground snapping**: when grounded and the floor drops away (downhill,
  stairs), sweep down and snap rather than entering falling — otherwise the
  character bunny-hops down slopes. Suppress snapping the frame a jump
  fires. UE keeps the capsule floating ~2 cm above the floor and re-adjusts
  every frame.
- **Moving platforms — basing, not parenting**: record the floor object +
  local offset, apply the base's delta transform (position + yaw only)
  before the character's own move; simulate platforms **before** the
  character in the same fixed step. On leaving the base, **impart its
  velocity** (jumps off moving platforms conserve momentum — Celeste even
  stores lift momentum a few frames after the platform stops).

## Jump & air control

Parametrize by design intent (Pittman, *Building a Better Jump*, GDC):

```
g  = 2h / t²        v0 = 2h / t        (h = jump height, t = time to apex)
```

- **Asymmetric arcs**: fall gravity 1.5–2× rise gravity (piecewise
  parabola) — symmetric parabolas read floaty.
- **Variable jump**: cut upward velocity ×0.4–0.6 on release, or
  hold-to-sustain (Celeste sustains 0.2 s).
- **Apex hang**: reduced gravity in a small window around apex (Celeste:
  half gravity while |v_y| < threshold and jump held).
- **Terminal velocity**: clamp fall speed (readability + tunneling safety);
  state-dependent (wall-slide lower, fast-fall higher).
- **Air control**: ground accel × factor (UE5 template 0.35; 20–50% for 3P
  action). Keep horizontal/vertical components separate.
- **Forgiveness is part of the design**: coyote time (~100–200 ms in 3P)
  and jump buffering (~120 ms), per Thorson's "Celeste & Forgiveness" —
  every window widened slightly in the player's favor, kept below conscious
  perception (≤ ~150 ms).

## Traversal states

- **Climbing, two schools**: authored/cinematic (Uncharted 4 — annotated
  holds, reach system, hand IK; top fidelity, not systemic) vs systemic
  any-surface (BotW/Genshin — climb as a full mode sticking to arbitrary
  collision within slope bounds, ray fans finding the surface normal,
  stamina as governor). The ledge/mantle cascade is standard either way:
  forward cast (wall?) → down cast from above (ledge top?) → walkability →
  capsule clearance → snap + mantle animation + hand IK.
- **Swimming**: split surface (2D on the water plane, buoyancy spring to a
  target submersion) from underwater (3D, gravity 0 + drag, pitch from
  camera). Volume-driven transitions with **hysteresis** (entry depth >
  exit depth) to prevent boundary oscillation.
- **Gliding**: a falling sub-state with clamped sink rate (strong drag
  toward target descent ~1–2 m/s), reduced gravity, steering = air control.
  BotW's paraglider is the designed answer to "you climbed up — how do you
  get down".
- **Stamina economy** (the traversal governor, BotW/Genshin model):
  one resource consumed by sprint/climb/glide/swim, regenerating when
  grounded/idle. Starting points: cap 100; sprint 15–20/s; climb 8–12/s +
  20–25 per climb-jump; glide 3–5/s; swim 5–8/s; regen 20–30/s after
  1–1.5 s delay. Genshin ships: sprint 18/s, glide 3/s, regen 25/s after
  1.5 s, cap 100→240. Design the failure state (BotW slides you down the
  wall on empty stamina; don't just drop the player). Stamina converts
  traversal into route planning — it's the knob that gates an open world
  without invisible walls.

## Modular movement verbs

A monolithic FSM accretes N² transition edges. Shipped solutions converge
on **composition**:

- Each verb (glide, grapple, dash, region-specific traversal) is a
  self-contained unit: own state, activation/deactivation predicates, tick
  (Hazelight's "Capabilities", GDC 2025 — how It Takes Two/Split Fiction
  ship hundreds of one-off mechanics).
- **Composition rules**: (1) verbs never write position — they output
  desired velocity/state requests into the shared solver; (2) a single
  arbitration point (priority list or blocking tags) decides the active
  set; (3) shared resources (stamina, air charges) live outside the verbs;
  (4) every verb declares its interrupt contract as data.
- The controller core (collide-and-slide, ground handling, gravity) is
  *engine*; the verb set is *content* (Genshin's per-region traversal,
  ability-gated movement).

## Animation interface

- **Code drives motion; animation visualizes it.** The controller publishes
  speed, local-space direction, grounded flag, vertical velocity, state id,
  turn rate. Foot sliding is fixed visually (stride warping, IK) — never by
  giving animation authority over position.
- **Root motion** is reserved for committed, contact-rich actions (melee,
  mantles, knockbacks): treat it as a **proposed velocity fed into the
  solver**, never a position set. On animation cancel, resync the mesh to
  the capsule — not the capsule to the mesh.
- For precise alignments (mantle/vault onto geometry), use motion-warping
  toward trace-validated targets (UE motion warping; the same idea
  hand-rolled in Unity).
- **IK boundary**: the controller provides targets and facts (ground
  height/normal per foot, hand target points on ledges); pose solving stays
  in the animation layer. Animation events flow back only for cosmetics and
  timing windows — never displacement.
- Modern fidelity options keep the same contract: motion matching (TLOU2,
  For Honor) is a smarter clip selector — the controller still owns the
  trajectory.

## Simulation & frame-rate independence

- **Fixed timestep + render interpolation** (Unity: simulate in
  FixedUpdate, interpolate visuals, camera on LateUpdate reading the
  interpolated transform; UE CMC ticks per-frame but substeps at
  `MaxSimulationTimeStep` 0.05 s).
- All exponential damping as `1 - exp(-k*dt)`, never per-frame `lerp(a,b,k)`.
- Use semi-implicit Euler (or better) — naive integration gives different
  jump heights at different frame rates.
- **Test at 30 and 144 fps systematically.**

## Character–world interaction

- **Pushing rigidbodies**: a kinematic capsule is infinite mass — intercept
  hits and apply a capped, tuned impulse (virtual mass), not real mass
  exchange.
- **Being pushed**: kinematic characters ignore forces — implement
  push-back in the intent layer (separation steering) or as a "shoved"
  state. Character-vs-character collision is soft (slide-around).
- **Crush detection** (opposing overlaps, e.g. elevator + ceiling): an
  explicit design decision — kill, teleport, or slide out.
- **Streaming edges** (see `open-world-streaming`): never simulate over
  missing collision — hold the character in a no-physics state until the
  destination cell confirms loaded; keep kill-Z + last-safe-position
  breadcrumbs (validated grounded positions) as recovery.

## Sources

Pittman *Building a Better Jump* (GDC) · Thorson *Celeste & Forgiveness* +
Celeste shipped source · UE CharacterMovementComponent docs/source ·
Unity CharacterController manual + KCC (St-Amand) · PhysX CCT docs ·
Fauerby *Improved Collision Detection and Response* · Naughty Dog Uncharted
4 climbing + Gregory state scripts (GDC 2009) · *Breaking Conventions with
BotW* (GDC 2017) · Hazelight *Capabilities* (GDC 2025) · Toyful Games
floating-capsule deep dive · Genshin stamina wiki/KQM (community).
