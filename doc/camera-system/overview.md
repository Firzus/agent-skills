# Camera System

Build the camera of a game — the third pillar of feel alongside
`character-controller` and `combat-system`. References: John Nesky's *50 Game
Camera Mistakes*, God of War's one-shot camera, Itay Keren's *Scroll Back*
(2D cameras), the Toric-space camera-control research, and Cinemachine as the
reference implementation. Excluded: authored cutscene cameras on a timeline
(`cinematic-system`).

## The architecture rule

**A stack of declarative virtual cameras + one brain that blends. Gameplay never
writes the final camera transform.**

```
vcams (one per context: explore / combat / aim / dialogue / photo)
  = declarative configs {follow target, look target, distance, offsets,
    damping, FOV, noise}
brain = picks the live vcam by priority, blends via a per-pair blend table
camera state = a data struct (pos, rot, FOV, lens) — blending = interpolating
pipeline per vcam: composition → collision/occlusion → noise/shake
volumes = the designer override layer (level-placed, blend in/out)
```

Gameplay talks to the system through states and events only — the same
router/stack discipline as `menu-ui-manager`.

## Nesky's law (the input contract)

**Never fight the player's input.** Every automatic behavior (recentering,
auto-framing, soft-lock bias) suspends the instant the player touches the camera
stick and resumes only after an idle delay. Manual input always wins. And **cut —
don't blend — when passing through opaque geometry** (unless you've signed up for
the one-shot constraint).

## Reference map

| File | Covers |
| --- | --- |
| [rig-collision.md](./rig-collision.md) | The virtual-camera model, the orbit/follow rig (composition dead/soft zones, recentering, pitch coupling), collision vs occlusion (whiskers, asymmetric resolve, fades, the camera-only layer) |
| [combat-contexts.md](./combat-contexts.md) | Soft-lock and hard lock-on, group and big-enemy framing, contextual vcams and designer volumes, the one-shot constraint (GoW), procedural dialogue cameras |
| [genres.md](./genres.md) | Genre-specific cameras: FPS (view models, head-bob, recoil, ADS), racing (speed-FOV, look-to-apex), RTS (edge-pan, strategic zoom), fighting (both-fighters framing), platformer (the Keren taxonomy, look-ahead), VR (comfort-first rules), MOBA, isometric ARPG, fixed-cam horror |
| [cinematography.md](./cinematography.md) | Shot vocabulary, framing fundamentals (rule of thirds, look-room, 180°/30° rules), camera-movement language and the dolly-zoom, procedural cinematography systems (Virtual Cinematographer, Toric space), lens/FOV emotional language, letterboxing/aspect, spectator/auto-director cameras |
| [math-tech.md](./math-tech.md) | Frame-rate-independent damping and the critically-damped spring (SmoothDamp), the update-order/jitter problem, collision/occlusion math, look-at and quaternion math, FOV/projection and the dolly-zoom formula, networked/split-screen cameras, performance |
| [feel-accessibility.md](./feel-accessibility.md) | The trauma shake model, impulses, FOV as feel, the motion-sickness accessibility baseline, photo mode |
| [pitfalls.md](./pitfalls.md) | 16 failure modes (symptom → cause → prevention) with debugging order and ship checklist |

## Build order (4 shippable tiers)

```
Tier 1 — A camera that doesn't hurt
- [ ] Brain + vcam stack + blend table; explore vcam (orbit + follow, composition)
- [ ] ONE CLOCK: camera updates after the interpolated character (the #1 jitter)
- [ ] Pitch clamps (~±85°); sensitivity curves + invert; recentering that yields
Tier 2 — Collision & occlusion
- [ ] Sphere/frustum cast; asymmetric resolve (snap in, smooth out); hysteresis
- [ ] Whiskers; camera-only collision layer; min distance + character fade
Tier 3 — Combat & contexts
- [ ] Soft-lock bias (toggleable); hard lock-on (frame both, angular speed cap)
- [ ] Group + big-enemy framing; context vcams; designer volumes
- [ ] Shake layer: trauma model + impulse bus, one application point
Tier 4 — Polish & cinematics
- [ ] Procedural dialogue cameras (shot-reverse-shot, 180° rule, validation)
- [ ] Cinematic takeover = push/pop with snapshot/restore; FOV-as-feel
- [ ] Photo mode; accessibility baseline (FOV slider, shake/bob/blur toggles)
```

## Key numbers (starting points — tune by playtest)

| Parameter | Value | Anchor |
| --- | --- | --- |
| 3P distance | ~2–4 m explore (CM 2 m, UE 3 m) | engine docs |
| FOV | ~60° vertical console; sprint +5–10° (in ~0.15 s, out ~0.3 s) | convention |
| Damping | per-axis: lateral 0.1 s, vertical 0.5 s, depth 0.3 s (CM) | engine docs |
| Trauma shake | +0.2 small / +0.5 big, decay ~1.5/s, shake = trauma², Perlin 0.1–4 Hz | Eiserloh GDC |
| Exp damping | `x = b + (a−b)·exp(−λ·dt)` (fps-independent); SmoothDamp = critically-damped spring | Holmér/GPG4 |
| Spherecast | UE SpringArm ProbeSize 12 uu; min radius = near-plane corner radius | UE source |
| FPS FOV | world 80–110 HFOV; viewmodel ~70–75; ADS sway −50–80% | MoCap Online |
| Platformer look-ahead | 80–120 px; Celeste 100→150 px on dash | Keren / Celeste src |
| VR | snap-turn 30/40°; constant velocity only; never control the camera | Meta/USI |

Full sourced tables (with the "undocumented — don't invent" list) in each file.

## Engine mapping (summary)

| Generic block | Unity 6 (Cinemachine 3.x) | UE5 (5.4+) |
| --- | --- | --- |
| Brain + stack | `CinemachineBrain` + `CinemachineCamera` priorities | `APlayerCameraManager` + Lyra camera-mode stack; Gameplay Camera System (experimental 5.7) |
| Orbit rig | `OrbitalFollow` vs `ThirdPersonFollow` | SpringArm or GPC Boom nodes |
| Collision | `Deoccluder` + `Decollider` | SpringArm spherecast (no hysteresis — roll your own) |
| Damping | `SmoothDamp` / Composer damping (per-axis) | `CameraLagSpeed` + lag sub-stepping |
| Update | Brain LateUpdate/SmartUpdate + Rigidbody Interpolate | `TG_PostPhysics` tick group |
| Shake | Impulse Source/Listener | `UCameraShakeBase` + PerlinNoise pattern |

Full detail in [math-tech.md](./math-tech.md).
