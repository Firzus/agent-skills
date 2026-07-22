# Pitfalls — the 16 classic camera failure modes

Each: symptom → root cause → prevention. Read before designing; re-read
when the camera jitters or players report nausea. Deep dives:
[rig-collision.md](./rig-collision.md),
[combat-contexts.md](./combat-contexts.md), [genres.md](./genres.md),
[cinematography.md](./cinematography.md), [math-tech.md](./math-tech.md),
[feel-accessibility.md](./feel-accessibility.md).

## 1. Camera jitter (the #1 camera bug)

- **Symptom** — the world or the character trembles, especially while
  moving.
- **Root cause** — clock aliasing: the camera samples on one clock
  (LateUpdate) a target moving on another (FixedUpdate) without
  interpolation, or vice versa.
- **Prevention** — one rule: **everything on the same clock**. Unity:
  Rigidbody Interpolate + Brain on LateUpdate/SmartUpdate (or everything
  FixedUpdate); never raw `transform.position` on a rigidbody. UE: camera
  evaluates after the movement tick. Anything depending on the final pose
  subscribes to the camera-updated event. Cross-reference the
  `character-controller` interpolation contract.

## 2. Collision pull-in oscillation

- **Symptom** — the camera pumps in and out when geometry grazes the
  line of sight.
- **Root cause** — a feedback loop: the collision correction changes the
  position, which changes next frame's raycast result.
- **Prevention** — asymmetric damping (fast in, slow out), a hold time on
  the corrected position, and return only when the **entire path** back
  is clear.

## 3. Clipping into the character

- **Symptom** — in tight spaces the pull-in pushes the camera inside the
  player model.
- **Root cause** — no minimum distance and no fade strategy below it.
- **Prevention** — hard min-distance + character fade/dither below the
  threshold (the AAA standard); camera probe radius > near plane;
  penetration resolution (Decollider-style) separate from occlusion.

## 4. Occlusion flicker

- **Symptom** — the camera rapidly toggles between occluded and clear
  positions (poles, foliage, crowds).
- **Root cause** — a binary occlusion decision re-evaluated every frame
  with no hysteresis.
- **Prevention** — minimum occlusion time before acting; minimum hold on
  the corrected position; transparent layers for foliage/small props;
  shot-quality evaluation (whiskers) instead of a single ray.

## 5. The wall-peek exploit

- **Symptom** — in competitive contexts, collision pull-in positions the
  camera to reveal information behind walls.
- **Root cause** — the resolver optimizes the player's line of sight with
  no information constraint.
- **Prevention** — prefer aggressive pull-in + character fade over
  distance preservation; validate the corrected position never sees what
  the character can't; server-side info clamps where it matters.

## 6. Gimbal lock / pole flip

- **Symptom** — a violent flip or parasitic roll near vertical extremes.
- **Root cause** — Euler composition at pitch ±90°, degenerate up
  vector.
- **Prevention** — clamp pitch below the extreme (~±85°); store
  orientation as a quaternion, convert to Euler only at the edges
  (input/UI); explicit up vector near the poles.

## 7. Auto-behaviors fighting input (Nesky's cardinal sin)

- **Symptom** — recentering or auto-framing pulls the camera while the
  player is aiming it; the camera feels like a wrestling match.
- **Root cause** — automatic and manual systems writing the same axis
  simultaneously.
- **Prevention** — every automatic behavior suspends on input and
  resumes after an idle delay; manual input always wins; no recentering
  right after the player finishes framing; experts can disable
  assistance entirely.

## 8. Blends through geometry

- **Symptom** — during a blend between vcams, the interpolated camera
  passes through a wall.
- **Root cause** — blends interpolate poses with no path validation
  (true of Cinemachine blends and `SetViewTargetWithBlend` alike).
- **Prevention** — cut instead of blending when the two shots aren't
  mutually visible; spherical/arc blend hints; keep the collision
  resolver active **during** blends (post-process the blended pose);
  validate the path by raycast and shorten/cut when blocked.

## 9. Lock-on whiplash

- **Symptom** — instant target switches snap the camera; dead or
  off-screen targets keep the lock.
- **Root cause** — target switch = look-at teleport without blending; no
  release criteria.
- **Prevention** — blend the point of interest (weighted target group or
  damped switch); explicit release rules (death, range, LoS lost > N s);
  max angular speed on rotation toward the new target.

## 10. Shake accumulation

- **Symptom** — chained explosions stack shakes to nausea levels.
- **Root cause** — linear amplitude addition with no cap.
- **Prevention** — the trauma model (0–1 value, shake ∝ trauma²,
  continuous decay) instead of amplitude addition; hard amplitude cap at
  the listener; spatial falloff per source; **one** application point
  (the shake layer) — never direct shakes on the final transform.

## 11. FOV pops

- **Symptom** — a visual jolt on state changes (sprint, ADS, vehicle).
- **Root cause** — FOV written instantly outside the blend system.
- **Prevention** — FOV is part of the camera state and blends like
  everything else; any FOV-changing state goes through a dedicated
  vcam/mode, never a direct set.

## 12. Camera-relative input inversion mid-motion

- **Symptom** — "forward" on the stick flips the character's direction
  when the camera crosses over the player or during fast blends/orbits.
- **Root cause** — the camera-relative input basis is resampled every
  frame; when the camera crosses sides, the projection inverts under the
  player's fingers.
- **Prevention** — latch the input basis while the stick is held
  (re-project only on release or below a deflection threshold); never
  recompute the basis during a cut/blend. Cross-reference
  `character-controller` (the input reframe problem).

## 13. Cutscene camera not restoring

- **Symptom** — after a cinematic: wrong camera position, inherited
  FOV/distance, dead input.
- **Root cause** — the cinematic mutated global camera state instead of
  pushing a reversible override.
- **Prevention** — the snapshot/restore contract (see
  `scene-flow-manager`): cutscenes **push** a high-priority vcam/view
  target and **pop** it; the nominal system is masked, never modified;
  blend-out defined as data; a safety timeout if the cutscene dies
  without popping.

## 14. Ignored motion-sickness reports

- **Symptom** — reviews and QA mention nausea, fatigue, vertigo.
- **Root cause** — no options: fixed FOV, unadjustable shake, forced
  motion blur, forced head bob.
- **Prevention** — the non-negotiable baseline: FOV slider, shake
  intensity 0–100% (trivial with a single shake layer), motion-blur and
  head-bob toggles, smoothing reduction option, camera acceleration
  limits. Design the shake/impulse layer with a global multiplier from
  day 1. Comfort is the default.

## 15. Genre-mismatched camera / dolly-vs-zoom confusion

- **Symptom** — a fighting-game camera zooms in too far when fighters
  close; an RTS "zoom" distorts perspective; a VR move induces nausea; a
  platformer camera has no look-ahead and the player jumps blind.
- **Root cause** — applying third-person-action camera assumptions to a
  genre with a different north star, or conflating **dolly** (translate
  along the view axis) with **zoom** (FOV change).
- **Prevention** — pick the genre's goal deliberately
  ([genres.md](./genres.md)): both-fighters framing with a min-ortho
  clamp (fighting), edge-pan + dolly-to-cursor with clamped height (RTS),
  the Keren look-ahead taxonomy (platformer), the comfort-first hard
  rules (VR — never control the camera, constant velocity, snap-turn).
  Move the camera (dolly) vs change the lens (zoom) intentionally.

## 16. Jump cuts & framing violations

- **Symptom** — a procedural dialogue/cinematic cut reads as a jarring
  "jump cut"; characters appear to swap screen sides; eyelines flip;
  the camera moves "for no reason".
- **Root cause** — switching shots on the same subject with <30° angle
  change, crossing the 180° line of action, or unmotivated movement.
- **Prevention** — encode the film-grammar rules as constraints
  ([cinematography.md](./cinematography.md)): require ≥30° between
  consecutive shots of one subject; constrain candidate cameras to one
  half-space of the line of action (the 180° rule); validate every
  procedural shot (head visible, not in a wall) with graceful fallback;
  keep camera movement motivated by action or eyeline.

## Debugging order

When the camera misbehaves: (1) check the clocks — pause and
frame-step while moving; jitter = #1, (2) draw the collision casts and
watch a graze pass (#2/#4), (3) orbit to the poles (#6), (4) hold the
stick through a recenter window (#7), (5) trigger every blend pair next
to a wall (#8), (6) chain five explosions (#10), (7) run the
accessibility checklist (#14).

## Ship checklist

```
- [ ] Zero jitter at 30/60/144 fps while sprinting (frame-step verified)
- [ ] Tight-space test: never clips the avatar, fades below min distance
- [ ] Graze a pole at every speed: no flicker, no oscillation
- [ ] Full orbit at both pitch extremes: no flip, no roll
- [ ] Hold camera stick through every auto-behavior: input always wins
- [ ] Every blend pair tested near geometry: no through-wall frames
- [ ] Lock-on: switch/release/death cases, angular speed capped
- [ ] Five simultaneous shake sources: capped, readable, slider works
- [ ] Cutscene in/out: exact restore, including FOV and input
- [ ] Options shipped: FOV slider, shake slider, blur/bob toggles
- [ ] Genre goal chosen; dolly vs zoom intentional; VR comfort rules met
- [ ] Procedural cuts respect the 30°/180° rules; shots validated
```
