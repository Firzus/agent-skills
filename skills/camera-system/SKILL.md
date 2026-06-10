---
name: camera-system
description: >-
  Architecture blueprint for third-person cameras in action games: the
  virtual-camera stack with a single blending brain (the Cinemachine model
  generalized), orbit/follow rigs with screen-composition dead zones,
  collision vs occlusion resolution (whiskers, asymmetric pull-in, fade
  strategies), combat cameras (soft-lock bias, hard lock-on, group and big-
  enemy framing), contextual states and designer camera volumes, procedural
  dialogue cameras (shot-reverse-shot, the 180-degree rule), screen shake
  via the trauma model, FOV as a feel tool, motion-sickness accessibility,
  and photo mode. References: John Nesky's 50 Game Camera Mistakes, God of
  War 2018's one-shot camera, Genshin Impact, Cinemachine. Use when
  designing or building a third-person camera, camera collision, lock-on,
  camera shake, or when the camera jitters, fights the player, or causes
  motion sickness.
---

# Camera System

Build the third-person camera of an action game — the third pillar of feel
alongside `character-controller` and `combat-system`. References: John
Nesky's *50 Game Camera Mistakes* (GDC, Journey), God of War 2018's
one-shot camera, Genshin Impact, and Cinemachine as the reference
implementation. Excluded: authored cutscene cameras (timeline —
`cinematic-system`) and FPS cameras.

## The architecture rule

**A stack of declarative virtual cameras + one brain that blends. Gameplay
never writes the final camera transform.**

```
vcams (one per context: explore / combat / aim / dialogue / photo)
  = declarative configs {follow target, look target, distance, offsets,
    damping, FOV, noise}
brain = picks the live vcam by priority, blends via a per-pair blend
    table (curve + duration; a cut is a zero-length blend)
camera state = a data struct (position, rotation, FOV, lens) — blending
    two vcams is interpolating two structs
pipeline per vcam: composition → collision/occlusion → noise/shake
volumes = the designer override layer (level-design-placed, blend in/out)
```

Gameplay talks to the system through states and events only. This is the
same router/stack discipline as `menu-ui-manager` — the priority table is
a router, the cinematic override is a modal stack.

## Nesky's law (the input contract)

**Never fight the player's input.** Every automatic behavior (recentering,
auto-framing, soft-lock bias) suspends the instant the player touches the
camera stick and resumes only after an idle delay. Manual input always
wins. Corollaries: recenter softly behind the player while running (but
not while they're aiming the camera), nonlinear sensitivity curves, invert
X/Y options, no FOV snaps, and **cut — don't blend — when passing through
opaque geometry** (unless you've signed up for the one-shot constraint).

## Build order (4 shippable tiers)

```
Tier 1 — A camera that doesn't hurt
- [ ] Brain + vcam stack + blend table; explore vcam (orbit + follow,
      per-axis damping, dead/soft zone composition)
- [ ] ONE CLOCK: camera updates after the interpolated character — the
      #1 jitter source (see character-controller interpolation)
- [ ] Pitch clamps (~±85°, no pole flip); sensitivity curves + invert
      options; recentering that yields to input
Tier 2 — Collision & occlusion
- [ ] Sphere/frustum cast target->desired; asymmetric resolve (snap in,
      smooth out); occlusion hysteresis (min occlusion time)
- [ ] Whiskers (anticipate, don't react); ignore thin poles; camera-only
      collision layer with designer blockers
- [ ] Min distance + character fade/dither below it (never near-plane
      clip into the avatar)
Tier 3 — Combat & contexts
- [ ] Soft-lock bias (degrees toward engaged enemy, input overrides,
      TOGGLEABLE); hard lock-on (frame both, flick to switch, explicit
      release rules, angular speed cap — no whiplash)
- [ ] Group framing (weighted centroid, zoom-to-fit with hard limits);
      big-enemy framing (pull back + raise pivot by target bounds)
- [ ] Context vcams: aim (shoulder swap, FOV zoom, stiff damping),
      climb/swim, interiors; designer camera volumes with blends
- [ ] Shake layer: trauma model + impulse bus, ONE application point
      with a global intensity multiplier
Tier 4 — Polish & cinematics
- [ ] Procedural dialogue cameras: shot-reverse-shot, 180-degree rule,
      shot-quality validation with graceful fallbacks
- [ ] Cinematic takeover = push/pop with snapshot/restore (the
      cinematic-system contract); FOV-as-feel (sprint widen, blended)
- [ ] Photo mode: free cam vcam + constraints (radius, tilt limits,
      roll), pause + HUD hide integration
- [ ] Accessibility baseline: FOV slider, shake/bob/blur toggles,
      camera acceleration limits — comfort is the DEFAULT
```

## Numbers (starting points — tune by playtest)

| Parameter | Value | Anchor |
| --- | --- | --- |
| 3P distance | ~2–4 m explore (CM default 2 m, UE 3 m, Genshin slider 4.5–6) | engine docs/wiki |
| Shoulder offset | X 0.4, Y 1.0, Z −0.5 m (CM default) | engine docs |
| FOV | ~60° vertical console, 90–100° horizontal PC; sprint +5–10° (in ~0.15 s, out ~0.3 s) | convention + measured |
| Damping | per-axis: lateral 0.1 s, vertical 0.5 s, depth 0.3 s (CM defaults) | engine docs |
| Look speed | ~200–500°/s full deflection; accel ramp 0.2–1 s; ADS ~0.6× | measured (shooters) |
| Collision probe | 0.2 m radius (CM), 0.12 m (UE) | engine docs |
| Occlusion hysteresis | min occlusion time + hold; snap-in, slow-out | mechanism documented, values: tune |
| Pitch limits | ~−60° up / +90° down; clamp ±85° hard | community convention |
| Trauma shake | +0.2 small/+0.5 big, decay ~1.5/s, shake = trauma², max 5–10° rotational, Perlin 0.1–4 Hz (NOT 10–25) | Eiserloh GDC + CM docs |
| Default blend | Ease In Out ~1.5–2 s; aim in/out short (~0.2–0.4 s, inference) | CM default + practice |
| Recenter | wait ~2 s after input, recenter ~2 s | CM convention |
| Photo mode radius | measured: GoW 3.5 m (criticized), Horizon ~5 m; be ≥5 m | measured reviews |

Full sourced tables with the "undocumented — don't invent" list in
[architecture.md](./architecture.md).

## Engine mapping

| Generic block | Unity 6 (Cinemachine 3.x) | UE5 (5.4+) |
| --- | --- | --- |
| Brain + stack | `CinemachineBrain` + `CinemachineCamera` priorities/channels (3.x rewrite: migration from 2.x is painful and documented as such) | Classic: `APlayerCameraManager` + view targets; **Lyra camera-mode stack** (production-proven); **Gameplay Camera System** = Epic's Cinemachine (still Experimental in 5.7, Beta ~5.8 — adopt only if pinning versions) |
| Orbit rig | `OrbitalFollow` (exploration, input-driven) vs `ThirdPersonFollow` (aim/shoulder, controller-driven) — the rule: aim → TPF, free orbit → OF | SpringArm (limited: one config per rig, binary probe) or GPC Boom nodes |
| Collision | `Deoccluder` (line of sight: pull-forward/preserve-height strategies, hysteresis built in) + `Decollider` (penetration) | SpringArm probe (no hysteresis — roll your own) / GPC collision nodes |
| Group framing | `TargetGroup` + `GroupFraming` | custom CameraModifier / Lyra mode |
| Volumes | `CinemachineTriggerAction` + priority boost; `Confiner` | trigger → mode push / `SetViewTargetWithBlend` |
| Shake | Impulse Source/Listener (spatialized bus) | `UCameraShakeBase` + **PerlinNoise pattern** (not the legacy Wave oscillator) via the shake modifier |
| Update order | Brain LateUpdate/SmartUpdate with interpolated rigidbody — one clock | camera evaluates after movement tick |

## Failure modes

The 14 classic camera bugs (update-order jitter, collision pull-in
oscillation, clipping into the character, occlusion flicker, wall-peek
exploits, pole flip, auto-behaviors fighting input, blends through
geometry, lock-on whiplash, shake accumulation, FOV pops, camera-relative
input inversion, cutscenes not restoring, ignored motion-sickness
reports) are cataloged in [pitfalls.md](./pitfalls.md) with symptom →
root cause → prevention.

## Related skills

- `character-controller` — the interpolation/clock contract (jitter) and
  the camera-relative input reframe problem.
- `combat-system` — hit-stop interaction (shake runs on unscaled time),
  hit feedback impulses.
- `cinematic-system` — the timeline takeover and Brain handoff; the
  cutscene snapshot/restore contract.
- `dialogue-system` — dialogue sessions consume the procedural
  shot-reverse-shot cameras built here.
- `scene-flow-manager` — camera state across context transitions.
- `hud-system` — photo-mode HUD hiding, reticle clearance.
- `game-architecture-patterns` — State (vcam contexts), Event Queue
  (impulse bus) theory.
