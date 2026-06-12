# Locomotion animation, game feel & movement accessibility

Deepens the animation interface: blend trees, motion matching, procedural/
physics animation, the game-feel layer, and movement accessibility. The
contract holds throughout — **code drives motion; animation visualizes
it** — every technique here is a smarter *visualizer* or a *feel/comfort
layer*, never a position-writer. The solver/HSM is in
[solver-states.md](./solver-states.md). `↔` marks a connection back to the
core contract. `[?]` = uncertain.

## Locomotion animation (the classic stack)

- **Blend tree / blend space** — 1D (speed) or 2D (`speed × direction`,
  barycentric interpolation of the nearest samples). ↔ Fed by the
  controller's published `speed`, `local-direction`, `grounded` — the
  blendspace consumes facts, never decides them. **Pitfall — foot skating**:
  blending clips with different strides desyncs foot contacts; fix with
  same-stride authoring, **sync groups/markers** (phase-lock the blend),
  playrate-scaling, or IK pinning, and *stable, low-noise* blend params.
  **Modern reduction (Lyra)**: 4 cardinal clips + **orientation warping**
  (rotate the lower body for diagonals) instead of 8+ clips.
- **State machine vs blendspace** — orthogonal: the state machine picks
  *which* set is active, the blendspace interpolates *within* it. ↔ The
  anim state graph is a **slaved visualization** of the movement HSM, not a
  second source of truth.
- **Foot-locking / foot IK** — animated stride ≠ capsule ground speed →
  feet skate; fix with speed-matching + **foot IK** (pin the planted foot to
  the ground point, adjust to height/normal, dip the pelvis). ↔ Exactly the
  skill's **IK boundary**: the controller supplies ground height/normal per
  foot; the anim layer solves the pose.
- **Stride warping** (UE5 Pose Warping) — dynamically scale foot spacing to
  match capsule speed (`StrideScale = movementSpeed / rootMotionSpeed`,
  clamped), *after* the blendspace.
- **Turn-in-place & the pivot** — play a turn clip and counter-rotate the
  mesh so feet don't pivot-skate; the planted-foot reversal is best driven
  by distance matching (below).
- **Start/stop animations** — distinct start (lean-in) and stop (settle,
  foot plant) clips give weight; without them characters "ice-skate" or
  stop on a dime. **Distance Matching** (Delayen, Nucl.ai 2016) drives the
  clip by **distance-to-target** rather than time — predict the stop/pivot/
  landing point and set the frame whose distance curve matches → no foot
  slide. For Honor accepts a ~1 m stopping delay as the cost. ↔ The anim
  mirror of the controller's accel/decel curves (time-to-max-speed
  0.2–0.4 s).
- **Additive layering** — aim sway, lean, breathing, flinches as deltas
  from a reference pose, added on top of base locomotion. **Upper/lower
  split** (aim while running): the lower body runs the locomotion
  blendspace, the upper body an aim-offset masked from the spine up — two
  independent visualizers, one capsule.

## Motion matching (the modern standard)

**What it is** (Clavet, "Motion Matching and the Road to Next-Gen
Animation", GDC 2016, For Honor): every few frames, search the **whole
mocap database** for the pose best matching (a) the current pose and (b) the
desired future trajectory; jump there and blend (~0.25 s). "A ridiculously
brute-force approach… jumping at the best place, every frame."

- **Trajectory prediction** — gameplay sends a `Goal`: a desired future
  path sampled at a few horizons (0.1/0.3/0.6/1.0 s). ↔ This is literally
  the controller's proposed velocity / spring-damper on desired velocity —
  "code decides the trajectory, animation is a cosmetic detail on top." The
  *same one-directional pipeline* the skill insists on.
- **Cost function** — `cost = poseCost + responsivity · trajectoryCost`.
  Pose cost matches a *handful* of bones (mostly **feet**, plus the weapon
  in For Honor); trajectory cost diffs the candidate's future root path vs
  the goal. The **`responsivity` slider** trades responsiveness (snaps to
  input, more skating) vs fidelity (preserves mocap, more lag) — the central
  designer knob, and the same snappy-vs-realistic tradeoff as root-motion-
  vs-code-velocity.
- **Data** — a curated mocap DB ("dance cards": starts, stops, plants,
  turns, accel/decel); memory scales linearly (hundreds of MB possible).
- **Vs blend trees** — better naturalism + far less hand-authored transition
  logic, but costs memory + runtime search + lots of clean mocap + harder
  precise control.
- **In Unreal** — the **Pose Search** + **Motion Trajectory** plugins (+
  **Chooser** to swap databases by context), built on the **Game Animation
  Sample Project** (500+ free anims).
- **Learned Motion Matching** (Holden et al., SIGGRAPH 2020) — replaces the
  DB + search with 3 neural nets (Decompressor/Stepper/Projector); reported
  ~590 MB → ~8.5 MB, decompress ~20 µs/frame. `[?]` paper-reported numbers,
  not generalized shipping figures.

## Procedural & physics animation

- **Procedural locomotion (IK-driven)** — few/no clips: Overgrowth
  (procedurally-blended keyframes + IK + procedural hand/foot placement),
  spider/quadruped procedural leg placement (raycast foot targets, step
  past a threshold, two-bone/FABRIK plant, gait from phase offsets), Rain
  World ("AI *is* animation" — locomotion-AI places limbs from the
  environment). ↔ The same sim-proposes / cosmetic-visualizes separation
  the skill demands.
- **Active ragdoll / powered ragdoll** — Gang Beasts / Human: Fall Flat
  (the skill's rigidbody-as-gameplay exception): a physics ragdoll
  ("slave") tracks a hidden kinematic skeleton ("master") via **PD
  controllers** on joints (`force = Kp·(targetPos−pos) + Kd·(targetVel−vel)`,
  clamped by maxForce). A **balance controller** keeps it upright;
  **weaken-on-impact** drops joint strength on collision for believable hit
  reactions.
- **Procedural secondary motion** — cloth/hair/jiggle as spring-bone chains
  (`1 − exp(−k·dt)` damping ↔ the skill's damping rule), driven by skeleton
  motion, never feeding back.
- **Full-body IK** — two-bone IK (analytic, knees/elbows), FABRIK
  (iterative, spines/tails), UE5 FBIK. ↔ The skill already cites hand IK on
  ledges and foot IK on ground.
- **The tradeoff** — procedural = reactive, low memory, but can look floaty;
  authored = high fidelity but rigid/combinatorial. Production reality is
  **hybrid**: authored base + IK/warp/additive corrections (every shipping
  AAA rig).

## Game feel & juice for movement

- **Definition** (Swink, *Game Feel*): real-time control of a virtual
  object *with polish* — polish (anim/particles/shake/sound) is what sells
  weight. ↔ The skill's "feel without touching physics".
- **Squash/stretch** on jump/land, **landing impact** (camera dip + dust +
  shake scaled to fall speed — small trauma so it stays subtle ↔
  `camera-system` trauma²), **anticipation frames** (crouch-before-jump),
  and the **accel/decel curve shape** *as* feel ("floaty" vs "tight" is
  largely the curve + air control).
- **Responsiveness** — Swink's **100 ms** input-to-response threshold;
  above it control stops feeling direct, and **consistency beats speed** (a
  steady 100 ms beats a jittery 80 ms). Mitigate long committed anims with
  input buffering, animation canceling, short interrupt frames. ↔ The
  skill's buffer 100–150 ms / coyote 100–200 ms; on cancel, **resync the
  mesh to the capsule, not the capsule to the mesh**.
- **"Weight"** is communicated by accel/decel rates, anticipation/settle
  clips, camera-dip magnitude, and footstep cadence/audio — *not* by literal
  mass (a kinematic character is infinite mass).
- **Camera feel** — FOV kick on sprint (+5–10° in ~0.15 s); never *fast*
  FOV shifts (a nausea trigger — `camera-system`). **Rumble/haptics** for
  footfalls and landings. **Movement audio** — footsteps keyed to foot-plant
  anim events, surface-typed (↔ `adaptive-audio`; the canonical cosmetic
  anim event).

## Movement accessibility

- **Motion-sickness / comfort (flat-screen)** — the non-negotiable
  baseline: **head-bob toggle**, **FOV slider** (the single most-requested
  option), **camera-shake 0–100%**, **motion-blur toggle**, **vignette-on-
  movement**. Comfort is the *default*; effects opt-in.
- **VR comfort (stricter)** — the root cause is **vection**. Offer
  **teleport AND smooth** locomotion; **snap turn** (30–45° increments,
  "surprisingly comfortable") vs smooth; **vignette/tunneling** (darken
  periphery during movement, defined in degrees, triggered on movement/
  rotation/acceleration); fixed-velocity movement and a consistent
  framerate. Ship Recommended / Comfortable / Advanced presets.
- **Input accessibility** — **toggle-vs-hold** for sprint/crouch/aim (the
  highest-frequency hold case), **auto-run / always-sprint**, **auto-jump**,
  full in-game remapping with per-axis invert, and one-handed / adaptive-
  controller schemes.
- **Platforming assist (the Celeste model)** — granular, toggleable anytime:
  **game speed 50–100%** (10% steps), **infinite stamina**, **air dashes**
  (default/two/infinite), **invincibility**, **dash assist** (aim in
  slow-mo), **assist skip** — playable *entirely* in assist mode, "nothing
  kept away". `[?]` don't add options beyond this verified set. **The lesson
  is framing**: Celeste rewrote its assist preamble after disabled-player
  feedback (the old "difficulty is essential" wording made players feel
  "othered") — **presentation matters as much as the toggles**. Expose the
  forgiveness windows (coyote/buffer) as sliders for an accessibility tier.
- **Navigation/wayfinding** — objective markers, breadcrumb trails,
  auto-path/auto-run-to-marker, high-contrast traversable-surface
  highlighting (↔ `minimap-worldmap`, `hud-system`).

## Connections back to the core

- **code-drives-motion** — every technique here is a visualizer; motion
  matching makes it explicit ("animation is a cosmetic detail on top").
- **Root motion as proposed velocity** — distance matching & motion warping
  consume the predicted trajectory; they never set position. On cancel, the
  mesh resyncs to the capsule.
- **IK boundary** — foot IK / stride warp / hand-on-ledge / FBIK: the
  controller supplies *facts*, the anim layer solves the *pose*.
- **Feel numbers** — Swink's 100 ms ↔ buffer/coyote windows; accel/decel
  curves ↔ time-to-max-speed; landing shake ↔ trauma²; FOV kick ↔ the
  feel-accessibility FOV rules.

## Sources

Clavet *Motion Matching and the Road to Next-Gen Animation* (GDC 2016) +
Zadziuk (dance cards) · Holden et al. *Learned Motion Matching* (SIGGRAPH
2020) · Delayen *Distance Matching* (Nucl.ai 2016) · UE5 Motion Matching /
Pose Search / Pose Warping docs + Game Animation Sample Project · Rosen *An
Indie Approach to Procedural Animation* (GDC 2014, Overgrowth) · Jakobsson &
Therrien *The Rain World Animation Process* (GDC 2016) · Unity Configurable
Joint / active-ragdoll PD refs · Swink *Game Feel* (2009) · Nijman *The Art
of Screenshake* · Eiserloh *Juicing Your Cameras* (GDC 2016) · Celeste
Assist Mode (Thorson) + HalfCoordinated preamble interview · Game
Accessibility Guidelines + XAG 107 + Accessible Games Initiative · Meta
Horizon Locomotion comfort docs + Oculus *Lessons from the Frontlines*.
Flags: LMM numbers are paper-reported; the For Honor "1 m stop" is
anecdotal; PD gains / stride clamps / VR degree values are example/platform
defaults — tune by playtest.
