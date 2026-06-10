---
name: character-controller
description: >-
  Architecture blueprint for third-person action/adventure character
  controllers in production games: kinematic collide-and-slide movement
  solver, hierarchical movement state machine (ground/air/climb/swim/glide),
  ground handling (slopes, steps, snapping, moving platforms), jump
  parametrization and game-feel numbers (coyote time, input buffering,
  gravity multipliers), stamina economy, modular movement abilities, the
  animation interface (root motion boundaries), and network-ready structure.
  Includes sourced starting-point numbers and Unity 6 / UE5 mappings. Use
  when designing or building a character controller, player movement,
  locomotion, traversal (climbing, swimming, gliding), jump feel, third
  person movement, or when diagnosing movement jitter, slope bugs, or
  floaty controls.
---

# Character Controller

Build the movement layer of a third-person action/adventure game. This skill
is the engine-agnostic architecture blueprint: components, the movement
state machine, feel numbers, build order, and failure modes. Engine tooling
specifics live in the engine mapping section and the dedicated engine skills
(`unity6-aaa-best-practices`, `ue5-aaa-best-practices`).

## The default stance: kinematic

Use a **kinematic collide-and-slide** controller for player characters.
This is the AAA consensus (Unity CharacterController/KCC, UE CMC, PhysX CCT):
exact designer-authored response, instant stops, no mass/friction leakage
into feel, stable on slopes and steps, deterministic and replayable for
networking. A force-driven character can't express "stop exactly here" or
"ignore this push" without fighting the solver.

Rigidbody-driven is the justified exception: physics-as-gameplay (Human:
Fall Flat), vehicles/boards, or momentum-trading designs — typically built
as a **floating capsule** (ground spring holding a hover height, force
toward target velocity, torsional upright spring; Genshin ships a steered
variant of this hybrid).

## The one-directional pipeline

```
input → intent → state machine → movement solver → collision → animation
```

- The **state machine** decides *what* the character does.
- The **solver** decides *where it ends up*.
- **Collision** decides *what's legal*.
- **Animation** only *visualizes* — it never writes position during
  locomotion (root motion is a scoped exception, see architecture.md).

Keeping these one-directional is what allows per-state tuning without
regressions. Never let the animation or the camera write into the capsule.

## Build order (4 shippable tiers)

```
Tier 1 — Walking skeleton
- [ ] Capsule + collide-and-slide solver (or engine-native equivalent)
- [ ] Grounded/Airborne states; jump parametrized by height + time-to-apex
- [ ] Ground detection by shape cast (not a single ray); slope limit
- [ ] Camera-relative input -> intent vector
Tier 2 — Production feel
- [ ] Coyote time + jump buffering (buffer = intent + timestamp, revalidated)
- [ ] Asymmetric gravity (fall multiplier), variable jump, apex hang
- [ ] Step-up/step-down + ground snapping (no bunny-hop downhill)
- [ ] Fixed-timestep simulation + visual interpolation (test 30/60/144 fps)
- [ ] Squash/stretch, dust, camera assists (feel without touching physics)
Tier 3 — Traversal states
- [ ] Moving platforms (basing: delta-transform, velocity imparted on exit)
- [ ] Climb / swim (surface + underwater) / glide as HSM states
- [ ] Stamina economy as the traversal governor (drain/regen/exhaustion)
- [ ] Animation interface: publish state + velocity; root motion as
      proposed-velocity only
Tier 4 — Scale & robustness
- [ ] Modular movement verbs (composition over transition edges)
- [ ] Network-ready structure (see below)
- [ ] Rigidbody interaction (capped push impulses, crush handling)
- [ ] World-streaming guards (no simulation over missing collision)
```

## Feel numbers (starting points — tune by playtest)

| Parameter | 3P action/adventure | Source anchor |
| --- | --- | --- |
| Coyote time | 100–200 ms | Celeste ships 0.1 s (source) |
| Jump input buffer | 100–150 ms | Celeste 0.08 s; 120 ms canonical |
| Time to apex | 0.4–0.7 s (>0.7 = floaty) | UE5 template ≈0.71 s, deliberately generous |
| Jump height | 1–2.5 m | UE5 template ≈2.5 m, UE4 default ≈0.9 m |
| Fall gravity multiplier | 1.5–2× | Pittman GDC; piecewise parabola |
| Time to max speed | 0.2–0.4 s | UE default ≈0.3 s |
| Turn rate | 360–720°/s | UE5 template 500°/s |
| Air control | 20–50% of ground accel | UE5 template 0.35 |
| Run / sprint speed | 4.5–6 / 6.5–8 m/s | UE 6 m/s default, Genshin ≈5.3 |
| Capsule | r 0.3–0.5 m, h ≈ character | UE template 42×192 cm |
| Step height | 25–45 cm | UE default 45 cm, Unity 30 cm |
| Slope limit | 45–50° | UE default ≈44.8° |
| Skin width | ≥0.01 m, ~10% of radius | Unity official rule |
| Solver iterations | 3–5 slide passes | PhysX/Fauerby/KCC practice |
| Stamina | sprint 15–20/s · climb 8–12/s · glide 3–5/s · regen 25/s after 1–1.5 s | Genshin/BotW model |

Jump math: pick height `h` and time-to-apex `t`, derive `g = 2h/t²`,
`v0 = 2h/t` (Pittman, GDC). Designers tune what they feel; constants fall
out. Full sourced tables in [architecture.md](./architecture.md).

## Network-ready structure (3 decisions, day one)

Even a solo game should structure these three things — retrofitting is a
rewrite:

1. **Deterministic tick:** `simulate(state, input, fixed_dt)` as a pure
   step — fixed timestep, no reads from real time or render state.
2. **Input → intent separation:** the simulation consumes an intent struct
   (move vector, action flags), never raw device input.
3. **Snapshotable state:** controller state (position, velocity, state id,
   timers) serializable in one struct.

Prediction/rollback/reconciliation belong to a future netcode skill; UE's
CMC gives them free if you respect its saved-move cycle.

## Engine mapping

| Generic block | Unity 6 | UE5 (5.4+) |
| --- | --- | --- |
| Solver | Built-in `CharacterController.Move` (limits: no capsule rotation, no platforms, no auto slope-slide) · **KCC** (de-facto standard pattern, support frozen) · `com.unity.charactercontroller` (DOTS) | **CMC** `PhysWalking/Falling/...` + `SafeMoveUpdatedComponent` · **Mover 2.0** (beta in 5.7, not yet production default) |
| State machine | Yours to build (KCC callbacks consume it) | CMC modes + `MOVE_Custom`; Mover: modes + transitions = the FSM is the framework |
| Ground handling | KCC ground probing/snapping; `Step Offset`/`Slope Limit` | `FindFloor`, perch radius, step-up, walkable angle — free |
| Moving platforms | `PhysicsMover` pattern (simulate platforms before character, same fixed loop) | Based movement — free |
| Animation | Animator params; root motion via `OnAnimatorMove` → velocity into solver | AnimBP property access; root motion sources; **motion warping** for mantle/vault |
| Input | Input System: read in Update, consume in FixedUpdate | Enhanced Input: contexts per movement state |
| Network | DIY (KCC is determinism-friendly); DOTS: Netcode for Entities | CMC saved moves = free prediction; replicate anything that affects speed |
| Simulation | **FixedUpdate + interpolation**, camera on LateUpdate | CMC ticks per-frame but substeps (`MaxSimulationTimeStep` 0.05) |

## Failure modes

The 12 classic movement bugs (slope/stair jitter, tunneling, edge sticking,
capsule sliding off ledges, moving-platform desyncs, slope exploits, state
deadlocks, root motion conflicts, frame-rate dependence, water/climb
boundary oscillation, physics desync/crush, buffered-input misfires) are
cataloged in [pitfalls.md](./pitfalls.md) with symptom → root cause →
prevention.

## Related skills

- `open-world-streaming` — the controller side of streaming (never simulate
  over missing collision) is covered there and in pitfalls.md.
- `game-architecture-patterns` — State (HSM), Component, Update Method
  theory.
- `unity6-aaa-best-practices` / `ue5-aaa-best-practices` — engine-wide
  practices this skill assumes.
