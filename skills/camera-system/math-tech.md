# Math & tech — damping, jitter, collision, projection, net

The math and engineering for working programmers. Each section: technique →
formula/API → gotcha. Uncertainty flagged `[?]`.

## Smoothing / damping math

**The frame-rate-independence problem**: naive `lerp(a, b, t)` per-frame with a
constant `t` is fps-dependent (Δt leaks into the exponent). The fixes — all the same
continuous solution to `dx/dt = −λ(x − target)`:

```
Exp decay (the fix):  x = b + (a−b)·exp(−λ·dt)   ≡  lerp(a, b, 1 − exp(−λ·dt))
Half-life form:       x = b + (a−b)·2^(−dt/halflife)
Pow form:             lerp(a, b, 1 − pow(r, dt))   // r = fraction remaining after 1 s
```

`λ` (1/seconds, higher = tighter); `halflife` = time to close half the gap
(designer-friendly). These never *reach* the target (asymptotic) — snap within
epsilon.

**Critically-damped spring (SmoothDamp)**: a 2nd-order spring-damper at the critical
damping ratio (ζ = 1) → fastest approach with **no overshoot**, and it tracks
velocity (so it follows a moving target without the constant lag of exp decay).
Unity `Mathf.SmoothDamp(current, target, ref velocity, smoothTime, maxSpeed, dt)`
(from *Game Programming Gems 4* Ch.1.10). The general spring model: `a = −k·(x −
target) − c·v`, damping ratio `ζ = c/(2·√k)` (ζ<1 overshoot/bounce, ζ=1 critical,
ζ>1 sluggish). **Gotchas**: `dt=0` → NaN; persist `velocity` across frames
(resetting kills the spring); per-axis damping = independent solvers per axis.

## The update-order / jitter problem (the #1 camera bug)

Two clocks: a fixed-timestep **simulation clock** (physics, e.g. 50 Hz) and a
variable **render clock**. Aliasing = jitter.

- **Unity**: follow/look-at cameras belong in **`LateUpdate`** (after Update +
  animation) so they read the target's final post-move transform. The
  rigidbody-follow jitter (target moved in `FixedUpdate`, stale on render frames) is
  fixed by enabling **Rigidbody `Interpolate`** (blends the visual transform between
  the two latest physics states). `Interpolate` = previous→current (1 tick latency,
  smooth); `Extrapolate` = predict forward (no latency, can overshoot).
- **The "one clock" rule**: only ever move a camera target on one clock. CM Brain
  offers `LateUpdate` / `FixedUpdate` / `SmartUpdate` (auto-detects). The
  ghost-target trick: drive a separate interpolated kinematic Rigidbody via
  `MovePosition`, point the camera at it.
- **UE5**: SpringArm ticks in `TG_PostPhysics` (after physics); `CameraLagMaxTimeStep`
  keeps lag stable on large frame dt.

## Collision / occlusion math

- **Probe types**: raycast (cheap but the near-plane is a *rectangle*, not a point →
  thin walls poke through); **sphere-cast** (sweep radius ≈ near-plane corner radius
  — what UE SpringArm does: `SweepSingleByChannel(Sphere(ProbeSize))`, ProbeSize
  default 12 uu); frustum-corner casts (most robust, ~5× the ray cost).
- **The near-clip rectangle** (why the radius matters):

```
halfHeight   = n · tan(vFOV/2)
halfWidth    = halfHeight · aspect
cornerRadius = sqrt(halfWidth² + halfHeight²)   // min sphere radius to hide the near plane
```

UE's `ProbeSize` is a hand-tuned constant, **not** FOV-derived (a known footgun).
- **Pull-in fast (near-instant), push-back slow/damped** to avoid popping. Predictive
  whiskers anticipate occluders. **Depenetration**: if the camera starts inside
  geometry, spherecast won't help — push out along the normal (`ComputePenetration`).
  **"Preserve height while pulling in"** keeps framing stable in tight spaces `[?]`.

## Look-at / aim math

- **Store/interpolate orientation as quaternions**; Euler only as input/display.
  **Slerp** = constant-angular-velocity shortest-arc. **Gimbal lock** is an
  Euler-only pathology at pitch ±90°; quaternions don't have it.
- **Pole-flip / up-vector problem** (distinct from gimbal lock): `LookRotation(forward,
  up)` is undefined when `forward ∥ up`. Detect `|dot(forward, up)| > ~0.99` and swap
  to an alternate up vector (lerp between the two near the pole to avoid a
  discontinuity).
- **Screen-space composition**: project the target to viewport, reframe only when it
  exits the dead/soft zone. The dead zone kills micro-jitter; the soft zone damps back
  toward the dead-zone *edge* (not center); hard limits clamp instantly.
- **Lock-on / aim-assist with an angular clamp**: `Quaternion.RotateTowards(current,
  target, degPerSec·dt)` — unlike Slerp it does **not** decelerate near the target, so
  it keeps up with strafing targets. Clamp pitch/yaw on your own float fields, never
  read-modify-write `transform.eulerAngles`.

## FOV / projection

- **Axis**: Unity `fieldOfView` is **vertical** by default; UE `FOV` is **horizontal**
  — an easy cross-engine bug. Conversion: `H = 2·atan(tan(V/2)·r)` (not linear).
- **Hor+** (modern default): hold vertical FOV, let horizontal grow on wider aspect.
  **Vert-**: crop vertical (ultrawide sees less).
- **Dolly-zoom (Vertigo)**: keep the subject's on-screen size constant while changing
  FOV + distance: `FOV(d) = 2·atan(height0 / (2·d))` with `height0` fixed (Unity ships
  `FrustumHeightAtDistance` / `FOVForHeightAndDistance` helpers).
- **Orthographic (2D/top-down)**: `orthographicSize` = half the viewport height in
  world units; fit a rect via `size = max(rectH/2, (rectW/2)/aspect)`.

## Networked / split-screen cameras

- **The camera is client-local** — a render concern, not game state. Never replicate
  the camera transform; replicate the *target* and compute the camera locally
  `[convention]`. In **rollback/prediction**, the camera reads the displayed
  (predicted) state and is **not** rolled back; run it *after* resimulation so it
  follows the corrected transform `[pattern]`.
- **Split-screen**: N cameras each with its own Brain, filtered by culling/layer
  masks. **Shared co-op "zoom-to-fit"**: encapsulate all players in an AABB; for
  perspective `distance = extent/tan(FOV/2) + padding`; SmoothDamp position **and**
  zoom; add margin/hysteresis to stop split↔shared flicker; clamp max zoom-out, then
  hard-split. (Unity TargetGroup + Position Composer does this.)

## Performance

Per-frame collision probes dominate camera cost (ray cheapest, sphere ≈ a few rays,
4–5 corner casts ≈ 5×; split-screen multiplies by viewport). Reduce: cast on a
dedicated narrow channel (`ECC_Camera` / a LayerMask); amortize (probe every N frames,
interpolate — most cameras tolerate 15–30 Hz collision); give the world a cheap
camera-collision proxy mesh; use Unity's batched `RaycastCommand`/`SpherecastCommand`
(Job-system, multithreaded) instead of N synchronous casts (which force a main-thread
physics sync).

## Unity ↔ UE5 mapping

| Concept | Unity / Cinemachine | UE5 |
| --- | --- | --- |
| Follow rig | vcam + Position Composer | SpringArmComponent (`TargetArmLength`) |
| Collision probe | Deoccluder (spherecast) | SpringArm `SweepSingleByChannel(Sphere(ProbeSize))` |
| Probe channel | LayerMask | `ProbeChannel = ECC_Camera` |
| Damping | `SmoothDamp` / Composer damping | `CameraLagSpeed` + lag sub-stepping |
| Update clock | Brain LateUpdate/SmartUpdate + Rigidbody Interpolate | `TG_PostPhysics` |
| FOV axis | vertical by default | horizontal by default |
| Constant-speed aim | `Quaternion.RotateTowards` | `RInterpConstantTo` |
| Damped aim | `Quaternion.Slerp` / SmoothDamp | `RInterpTo` |

## Key formulas (cheat sheet)

```
Exp smoothing (fps-indep): x = b + (a−b)·exp(−λ·dt) ≡ lerp(a,b, 1−exp(−λ·dt))
Spring damping ratio:      ζ = c / (2·√k)   (ζ=1 critical: fastest, no overshoot)
Near-plane corner radius:  rCorner = √((n·tan(vFOV/2)·aspect)² + (n·tan(vFOV/2))²)
FOV convert:               H = 2·atan(tan(V/2)·r)
Dolly-zoom:                FOV(d) = 2·atan(height0 / (2·d)), height0 fixed
Zoom-to-fit distance:      d = extent / tan(FOV/2) + padding
Constant-speed aim:        RotateTowards(cur, tgt, degPerSec·dt)
```

## Flagged gaps — do NOT invent

"Predictive whiskers" / "height-preserving pull-in" are common-practice terms, not
single-doc citations · networked-camera and occlusion-batching reflect widely-held
engine conventions, not one canonical source · UE `ProbeSize` is hand-tuned (not
FOV-derived) · batched-cast throughput is project-dependent.

## Sources

Freya Holmér *"Lerp smoothing is broken"* · Rory Driscoll *"Frame Rate Independent
Damping"* (2016) · *Game Programming Gems 4* Ch.1.10 (SmoothDamp) · Unity docs
(SmoothDamp, Quaternion, Execution Order, Rigidbody Interpolation, Dolly Zoom) ·
Cinemachine docs (SmartUpdate, Composer, Deoccluder, TargetGroup) · UE5
`SpringArmComponent.cpp` · Wikipedia (FOV in video games, Dolly zoom) · *3D Math
Primer* (gimbal lock).
