# Pitfalls — the 12 classic movement failure modes

Each: symptom → root cause → prevention. Read before designing; re-read
when a controller "feels wrong" and nobody knows why.

## 1. Jitter on slopes and stairs

- **Symptom** — character vibrates between grounded/airborne going up or
  down slopes; camera stutters.
- **Root cause** — gravity and ground snap fighting over the capsule; or
  the camera reads the simulated transform instead of the interpolated one.
- **Prevention** — when grounded, project velocity on the ground plane (no
  raw gravity component); exactly one ground-stick mechanism (sweep-snap,
  not force); camera on LateUpdate over the interpolated transform; skin
  width ~10% of radius.

## 2. Tunneling through thin colliders

- **Symptom** — at high speed the character passes through walls, fences,
  floors.
- **Root cause** — moving by position set instead of sweep; speed × dt
  exceeds collider thickness.
- **Prevention** — always sweep the displacement (capsule cast); clamp max
  speed or subdivide the move; CCD for rigidbody variants; minimum
  collision geometry thickness.

## 3. Sticking on edges and seams

- **Symptom** — character catches on invisible edges between adjoining
  colliders, walls "grab" the capsule.
- **Root cause** — ghost hits on internal seams (internal-edge normals),
  skin width too small, aggressive depenetration.
- **Prevention** — welded collision meshes / continuous colliders; reject
  internal-edge normals (dot against expected surface normal); soft, capped
  depenetration; correct skin width.

## 4. Sliding off edges the player expected to stand on

- **Symptom** — character slips off ledges it visually stands on; or hovers
  "grounded" over a void on a residual contact (ghost stand).
- **Root cause** — the capsule's rounded bottom: center past the edge →
  slide; rim contact over a void → false grounded.
- **Prevention** — distinguish *ground hit* from *stable ground*: validate
  with a center raycast + ledge detection; define an explicit perch radius
  (UE `PerchRadiusThreshold`; KCC ledge handling).

## 5. Moving platform desyncs

- **Symptom** — character lags, slides, or falls through fast platforms;
  doesn't rotate with them.
- **Root cause** — platform moves after (or in a different loop than) the
  character update; rotation not inherited; platform teleported by
  transform writes.
- **Prevention** — simulate platforms **before** the character in the same
  fixed step (PhysicsMover/based-movement pattern); store base + local
  offset, reapply its delta before the move; platforms are kinematic
  bodies moved by velocity, never teleported; inherit yaw only by default;
  impart base velocity on exit.

## 6. Slope exploits

- **Symptom** — players climb forbidden slopes by jump spam; or a slide
  state never exits.
- **Root cause** — each jump re-enables air control toward the slope;
  slide-exit condition missing hysteresis.
- **Prevention** — on unstable ground, deny jumping (or jump along the
  surface normal, not vertically) and keep the not-grounded tag; project
  input against the steep slope's uphill direction; slide exit = angle AND
  speed condition with hysteresis.

## 7. State machine deadlocks

- **Symptom** — character stuck in climb/swim after the world changed under
  it (ledge destroyed mid-climb, water drained mid-swim).
- **Root cause** — state has no exit for "my preconditions vanished".
- **Prevention** — every state revalidates its preconditions each tick and
  owns a fallback transition to Airborne/Grounded; no terminal state
  without a timeout; world references as validated handles, not raw
  pointers.

## 8. Root motion vs gameplay conflicts

- **Symptom** — mesh and capsule desync during animated moves; canceling an
  animation teleports the character.
- **Root cause** — root motion applied as position writes that
  collide-and-slide then refuses; cancel resyncs capsule to mesh.
- **Prevention** — root motion is a **proposed velocity fed to the solver**
  (KCC root-motion pattern, CMC root-motion sources, Mover layered moves);
  precise alignments via motion warping toward trace-validated targets; on
  cancel, resync mesh onto capsule — never the reverse.

## 9. Frame-rate dependence

- **Symptom** — the game feels different at 30/60/144 fps; jumps reach
  different heights; visible stutter.
- **Root cause** — per-frame `lerp(a,b,k)` damping, accelerations not
  scaled by dt, simulation in the render loop, naive Euler integration.
- **Prevention** — fixed-timestep simulation + render interpolation;
  damping as `1 - exp(-k*dt)`; semi-implicit Euler or better; test at 30
  and 144 fps as a routine check.

## 10. Water/climb boundary oscillation

- **Symptom** — character flickers between swim and ground states at the
  water's edge; climb state thrashes at surface boundaries.
- **Root cause** — single entry/exit threshold (no hysteresis); surface
  invalidated mid-state.
- **Prevention** — hysteresis on volume thresholds (entry depth > exit
  depth); periodic surface revalidation (pitfall 7); on volume change,
  project velocity into the new reference frame.

## 11. Controller ↔ physics world desync

- **Symptom** — props launched across the room on touch; character shoved
  inside geometry by dynamic objects; elevator crush leaves the character
  stuck.
- **Root cause** — kinematic capsule = infinite mass; no depenetration
  after external pushes; crush case undefined.
- **Prevention** — capped simulated impulses via virtual mass (KCC
  interactive-rigidbody pattern); after any external push, run a sweep
  depenetration pass with **bounded** ejection velocity (the Sea of Thieves
  ladder-launch lesson); crush detection (opposing overlaps) with an
  explicit design decision: kill, teleport, or lateral slide.

## 12. Buffered-input misfires

- **Symptom** — a buffered jump fires after the context changed (landed on
  a forbidden slope, entered climb); inputs eaten during state transitions.
- **Root cause** — the buffer stores a raw button, not an intent with
  context; transitions clear the buffer.
- **Prevention** — buffer = **intent + timestamp + required context**,
  revalidated at consumption (TTL ~0.1–0.2 s); transitions revalidate the
  buffer instead of clearing it; coyote time and jump buffering live in the
  state machine, not in input code.

## Debugging order

When movement "feels wrong": (1) verify fixed-timestep + interpolation
(test at two frame rates — most "mysterious" feel bugs are #9), (2) check
ground detection stability (log grounded transitions; flicker = #1/#4),
(3) audit state transition logs (deadlock or thrash = #7/#10), (4) inspect
the solver iteration count and depenetration magnitudes (#2/#3/#11),
(5) only then touch the feel numbers.

## Playtest checklist

```
- [ ] Identical feel at 30 / 60 / 144 fps (measured arcs, not vibes)
- [ ] Walk every slope angle 0-60° up and down: no jitter, no exploit
- [ ] Stairs up/down at all speeds: no bounce, no launch
- [ ] Jump at a ledge edge: coyote works; buffered jump on landing works
- [ ] Ride fast moving platforms (linear + rotating): no lag, momentum
      conserved on jump-off
- [ ] Enter/exit water repeatedly at the shoreline: no state flicker
- [ ] Cancel every animated move mid-flight: mesh and capsule stay synced
- [ ] Push a pile of physics props: nothing launches; get pushed: no clip
- [ ] Stand on a dynamic object that gets destroyed: clean fallback
- [ ] Teleport everywhere (including mid-air): no fall-through, breadcrumb
      recovery works
```
