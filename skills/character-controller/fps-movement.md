# FPS & momentum movement — Quake/Source, movement shooters, vehicles

The third-person kinematic default ([solver-states.md](./solver-states.md))
is one camp. This is the **rigidbody-momentum** camp — Quake/Source FPS
physics, movement-shooter momentum tech, first-person camera concerns,
advanced ground mechanics, vehicle/mounted controllers, and fast-movement
netcode. `→` marks a connection back to the core skill. `[?]` = uncertain/
version-specific.

## The Quake/Source movement model

Velocity is a **persistent integrated state** that friction and
acceleration nudge each tick — the opposite of the skill's "stop exactly
here" kinematic default. This is the "momentum-trading design" justified
exception, built as integrated velocity (not a floating-capsule spring).

**Friction (ground only, before acceleration):**
```
speed   = |velocity|
control = max(speed, sv_stopspeed)        # floors the drop at low speed
drop    = control * sv_friction * dt
velocity *= max(speed - drop, 0) / speed  # scales the whole vector
```
`sv_friction` ≈ 1–5, `sv_stopspeed` ≈ 100 (a crisp stop, not an asymptotic
crawl). Friction is applied **only grounded** — air preserves momentum.
This single asymmetry is the engine of all the tech below.

**Acceleration — the projection cap:**
```
currentspeed = dot(velocity, wishdir)     # project current vel onto wishdir
addspeed     = wishspeed - currentspeed
if addspeed <= 0: return                   # already at the cap IN THIS DIR
accelspeed   = min(accel * wishspeed * dt, addspeed)
velocity    += wishdir * accelspeed
```
**The key insight**: the cap is enforced on the *projection of velocity
onto `wishdir`*, not on `|velocity|`. You can exceed `wishspeed` overall as
long as your speed *along the current wishdir* is under it.

- **Air strafing / strafe-jumping**: airborne, point `wishdir` ~**perpendicular**
  to velocity → `dot(v, wishdir) ≈ 0` → `addspeed ≈ wishspeed` (large) → the
  full `accelspeed` is added nearly orthogonally, lengthening total speed.
  Sync mouse-turn + strafe key to gain continuously (max near 90°; zero when
  aligned). Source caps the air wish at ~30 hu/s (`AirSpeedCap`) — why air
  gains are slow and skillful.
- **Bunnyhopping**: chain jumps to never touch ground → never trigger
  friction → strafe-gains accumulate. → directly *conflicts* with the
  skill's ground-snapping (which exists to *prevent* bunny-hopping
  downhill) — these games deliberately invert it (`sv_edge_fix`, predictive
  ground categorization to *avoid* snapping).
- **Surf**: on steep ramps the player isn't grounded → no friction; the
  solver projects gravity-driven velocity along the ramp plane
  (`v -= n·dot(v,n)` — *the exact slide projection in the core solver*) and
  air-accel steers along it. Surf is literally the skill's plane projection,
  never letting the player enter the grounded state.
- Constants (Quake/HL2): gravity 800 u/s², `sv_maxspeed` 320, air wish cap
  30 hu/s. `[?]` exact air-accel values vary by title.

Praised: deep, expressive, a 25-year skill ceiling. Criticized: opaque to
new players, frame-rate-coupled timing, emergent-from-bugs.

## Movement shooters — momentum as a resource

- **Titanfall/Apex** (modified Source): **wall-running** (stick to a wall,
  reduced/redirected gravity, tangent velocity preserved), **slide-hopping**
  (slide from sprint → jump to keep momentum; **no air friction** so
  horizontal speed is fully carried; downhill can *accelerate*), the
  **lurch/tap-strafe** (a mid-air momentum redirect on a digital direction
  press within ~400 ms of a jump — `[?]` controller-impossible, a live
  fairness controversy). `[?]` certain **FPS ranges magnetize you to the
  floor** and break slide-hops — a textbook violation of the skill's
  *fixed-timestep, frame-rate-independent* rule (exactly what "test at
  30/144 fps" catches). Zipline/platform velocity becomes relative to the
  platform and is "stored" on exit — the skill's "impart base velocity on
  exit" rule, weaponized.
- **Tribes (skiing)**: hold jump to avoid ground friction while descending
  → convert slope + gravity into huge horizontal speed; projectiles inherit
  player velocity (leading shots = momentum math). Momentum *is* the
  gameplay.
- **Doom Eternal**: double-jump + **dash** (2 charges, recharge on landing)
  + grapple — thesis "NEVER STOP MOVING". → dash/double-jump as composable
  **movement verbs** with charges living outside the verb (the skill's
  Capabilities model).
- **Mirror's Edge / Warframe**: first-person parkour (wall-run, vault,
  coil) and bullet-jump, all tuned to **preserve momentum** and reward
  chaining ("flow state"). Mirror's Edge ships a full first-person *body*.

## First-person concerns (the camera IS the controller)

- **Camera = controller**: the view sits at a **head/eye anchor** on the
  capsule; crouch/stand changes view height — **interpolate it (spring, not
  linear)** so the eye glides. → the controller still owns the capsule; the
  camera reads an interpolated transform on LateUpdate and *never writes
  it* — FP just makes the eye offset part of state.
- **Head bob**: vertical sine + horizontal cosine at half frequency
  (figure-8), amplitude scaled by speed (separate per walk/run/crouch — bob
  that reads right at walk is nauseating at sprint). **The #1 motion-
  sickness culprit** → always ship a reduce/disable toggle
  ([animation-feel.md](./animation-feel.md)).
- **First-person body**: "floating gun/arms" (a separate viewmodel mesh,
  rendered with its own ~70–75° FOV to avoid hand distortion) vs **full
  body** (harder: feet must match the capsule + IK).
- **View-punch / landing dip**, **FOV-on-sprint** (+10–20° to feel speed,
  capped and disableable — the speed/sickness tradeoff), the **ADS movement
  penalty** (accuracy-vs-mobility coupling → `combat-system`), and
  **leaning/peeking** (raises peeker's-advantage netcode). The
  **FP mantle/ladder problem**: without a body it reads as "floaty camera
  on rails" — ease the eye to the ledge target, don't snap (the skill's
  mantle cascade applies identically, just camera-eased).

## Crouch / slide / prone & advanced ground mechanics

- **The slide** — momentum slide (Apex, speed-preserving/boosting) vs
  slowdown slide (CoD); slide+jump = **slide-hop**.
- **Crouch-jump (Source)** — jump then crouch mid-air raises the hull's
  bottom, clearing higher ledges. → dynamic capsule resize mid-air must
  **re-validate head/floor clearance on un-crouch** (a pitfalls-class
  hazard).
- **Slide-cancel** (interrupt the slide to reset sprint and snap to full
  speed — an exploit-turned-meta), **prone/dolphin-dive**, **tactical
  sprint** (fastest but worst ADS-ready — a speed-vs-readiness knob),
  **mantle vs vault** (climb up vs momentum-preserving over a low obstacle).

## Vehicle & mounted controllers

The other controller types — usually **rigidbody + raycast wheels** (the
opposite of the kinematic player):

- **Raycast suspension** — per wheel: `F = (restLength − currentLength)/
  restLength · stiffness − velAlongSpring · damper`, applied along
  **world-up** (not vehicle-up — prevents slope sliding) at the wheel point.
  **Tire forces**: forward (engine/brake) + lateral grip (arcade = a simple
  counter-force to side-velocity; sim = a Pacejka slip model). **Drift** =
  deliberately reduce lateral grip past a slip threshold, then counter-steer.
- **Mounted/horse (RDR2, BotW)** — a hybrid of **"follow the path"**
  (waypoint + cinematic camera → auto-gallop on roads) and **free-roam**
  (manual steering, tap-to-cycle gaits) — a steered momentum controller with
  authored assists (the same family as Genshin's steered floating-capsule).
- **The controller-swap / possession problem** — on-foot ↔ vehicle ↔ mount
  needs an enter/exit handshake: disable the player controller, hand input
  authority to the vehicle, reparent the camera, seat the avatar; on exit
  re-enable at a validated dismount point and **impart vehicle velocity**.
  → the skill's one-directional `input → intent → state machine → solver`
  pipeline makes this clean: swap the state machine + solver behind a stable
  intent struct; the snapshotable state makes the handoff serializable.

## Network movement for fast FPS

(Connects to `coop-session/netcode-models.md`.)

- **Client prediction + server reconciliation** — the client simulates
  locally from numbered inputs immediately; the server (authoritative)
  returns state tagged with the last-processed input #; the client rewinds
  and replays buffered inputs, blending the visual correction over N frames.
  → this is *exactly* the skill's three day-one decisions (deterministic
  `simulate(state, input, dt)`, input→intent separation, snapshotable
  state) — they exist precisely to make this possible.
- **Why fast movement stresses netcode** — high speed = large positional
  error per ms of latency → bigger, more frequent corrections →
  **rubber-banding**; wall-run/grapple/tap-strafe amplify divergence.
- **Custom verbs don't reconcile for free** — UE's CMC auto-replays
  standard locomotion, but **wall-run/dash/grapple need you to extend
  `FSavedMove_Character`** or the server can't validate them (the catch
  behind "CMC gives prediction free if you respect its saved-move cycle").
- **Speed-cap enforcement / anti-cheat** — never trust client position;
  send **inputs**, server re-simulates with the same physics and rejects
  impossible trajectories (speed caps, air-time vs geometry); validate the
  **tick**, not client timestamps; bound lag-comp leeway (~15% of ping) to
  stop fake-ping exploits.
- **The determinism tension** `[?]`: the frame-rate-coupled movement tech
  above (Apex magnetization, 1-frame superglides) is fundamentally **at odds
  with** the determinism prediction/rollback needs — a known source of
  inconsistency.

## Cross-skill map

- **Kinematic vs rigidbody** — Quake/Source/Tribes/Apex/vehicles are the
  rigidbody-momentum camp (the skill's justified exception); the slide-
  projection solver `v -= n·dot(v,n)` is *shared* (surf = the skill's plane
  projection without grounding).
- **Ground snapping** — the skill snaps to *prevent* bunny-hops; movement
  shooters deliberately *avoid* snapping to *enable* them (same mechanism,
  inverted goal).
- **HSM/verbs** — wall-run, dash, slide, bullet-jump, grapple are movement
  verbs; charges/cooldowns are shared resources outside the verb.
- **Network day-one trio** — deterministic tick + intent separation +
  snapshotable state are *prerequisites* for fast-FPS prediction and
  anti-cheat re-simulation.

## Sources

Flafla2 (Biagioli) *Bunnyhopping from the Programmer's Perspective* · Quake
`pmove.c` / Source `gamemovement.cpp` · ProjectBorealis PBCharacterMovement
(HL2-faithful UE reference) · momentum-mod `mom_gamemovement.cpp` · Apex
Legends Wiki + apexmovement.tech (lurch/tap-strafe/FPS-magnetization) ·
floodyberry *Tribes 1 Physics* · GDC *Mirror's Edge First-Person Movement*
(DICE) · Warframe Wiki *Maneuvers* · Unity WheelCollider docs + raycast-car
tutorials · RDR2/BotW horse-control guides · Unity Netcode for Entities
prediction · AccelByte *Server-Authoritative Game Logic* (`FSavedMove`,
speedhack). Flags: Apex lurch cap (~1150–1300 hu/s) and FPS-magnetization
ranges are community-measured and patch-variable; CoD slide-cancel changes
per title; Source `accelspeed × surface_friction` rationale is debated.
