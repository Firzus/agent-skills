# Unreal Mover build

Use this reference to implement a mount-specific Mover/Network Prediction stack
without coupling the reference to one Unreal release. Verify every API name and module
against the installed engine.

## Contents

- Capability gate
- Mount movement set
- Replay-safe input and state
- Possession/control handoff
- Collision and movement output
- Replication, relevancy, and destruction
- C++/Blueprint boundary
- Build sequence

## Produce a capability report first

Inspect the installed engine, plugin descriptors, source/headers, enabled modules,
sample projects, and packaged targets. Record evidence, not memory.

| Capability | Evidence to capture | Decision |
| --- | --- | --- |
| Mover plugin status/API | Engine version, plugin descriptor, module/header paths | Supported, spike, or blocker |
| Network Prediction integration | Fixed tick, resimulation, input/state registration, proxy smoothing | Selected mechanism |
| Updated component/root shape | Supported primitive and orientation for the custom set | Root collision contract |
| Custom movement modes | Mode registration and transition APIs in installed source | Ground implementation plan |
| Layered moves/modifiers | Available hooks and replay semantics | Use only when required |
| Possession on dedicated server | Controller/Pawn ownership and RPC routing evidence | Control topology |
| Relevancy/dormancy/destruction | Replication Graph/project settings and actor lifecycle | Session reconstruction plan |
| Nav/avoidance integration | Installed NavMover/avoidance behavior | Explicit capability or exclusion |
| Root motion/Motion Warping bridge | Installed adapter and network semantics | Presentation-only or scoped special move |

Classify each row as `[Engine fact]`, `[Version-sensitive]`, `[Project policy]`,
`[Recommendation]`, or `[Unknown]`. A tutorial or sample is evidence of an API
shape, not proof that it meets shipping requirements.

Useful official entry points:

- [Mover in Unreal Engine](https://dev.epicgames.com/documentation/en-us/unreal-engine/mover-in-unreal-engine)
- [Mover features and concepts](https://dev.epicgames.com/documentation/unreal-engine/mover-features-and-concepts-in-unreal-engine)
- [Mover examples](https://dev.epicgames.com/documentation/unreal-engine/mover-examples-in-unreal-engine)
- [UMoverComponent API](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/Mover/UMoverComponent)

Prefer installed documentation/source when online documentation targets a different
release.

## Build a mount-specific movement set

Start from generic `UMoverComponent` semantics. Do not assume a default character
movement set is a quadruped mount implementation. Prove or replace its assumptions
about vertical capsule, step-up, floor probing, facing, braking, and mode changes.

Recommended conceptual composition:

```text
UMountMovementSet
  GroundMode
  AirborneMode
  GroundToWaterTransition
  ForcedStop/Transition modifiers
  MountInputProducer
  MountMovementSettings (immutable/revisioned)
```

Add Flying and Aquatic through separate sets/modes only after Ground is complete.
Do not branch a universal mode on `bCanFly` and `bCanSwim` flags.

### Keep mode responsibilities narrow

Each movement mode owns:

- required Sync/Aux inputs;
- floor/medium queries;
- intent-to-proposed-move conversion;
- collision-resolved output through the one Mover writer;
- deterministic entry/exit conditions;
- debug state and tests.

Lifecycle owns mount/dismount. Gameplay owns eligibility and costs. Animation owns
pose. A movement mode must not possess actors, grant abilities, load skins, or wait
for a montage.

## Fill replay-safe input

Enhanced Input and AI are adapters into the same command contract:

```text
Enhanced Input / AI desired motion
  -> local MountIntent
  -> convert camera-relative direction to stable simulation direction
  -> FMountInputCmd
  -> Mover predicted frame
```

Recommended input facts:

- quantized desired planar/3D movement direction;
- desired facing policy/heading when separate from movement;
- normalized magnitude;
- sprint intent;
- jump press sequence or edge counter;
- movement-branch actions only when simulation consumes them.

Do not put raw key states, `UInputAction` pointers, current camera transform, target
actor pointers, or mutable ability tags in replay input. Resolve gameplay
authorization before or alongside the lifecycle request and snapshot the result
needed by simulation.

### Treat edges as sequences

A boolean jump flag may replay ambiguously across frames. Use an input sequence,
timestamp in simulation time, or the installed framework's edge mechanism. Prove
that one physical press produces at most one accepted jump through correction and
resimulation.

## Allocate movement state deliberately

Exact APIs vary. Preserve these semantics:

```text
Input: transient command for this predicted frame
Sync: state required to resume simulation from a corrected frame
Aux: immutable/low-frequency configuration required during replay
Session: lifecycle identity and control lease, reconstructed outside the movement mode
Presentation: derived only; never feeds authoritative movement
```

Include a config/archetype revision when tunables can change at runtime. A correction
must replay with the same values the server used. Either replicate immutable config
before activation or include a stable revision that resolves to immutable data.

Keep physical surface/medium facts in Sync/Aux only when they cannot be recomputed
deterministically from the corrected world state. Document the choice and test it
under rollback.

## Acquire and release the control lease safely

For possession swap, implement a server-owned order consistent with lifecycle:

### Acquire

1. Spawn and initialize the mount Pawn and Mover.
2. Verify owning PlayerController/PlayerState and requested rider.
3. Seed mount Sync state from the validated summon candidate and allowed rider
   velocity/facing.
4. Suspend the rider solver and blocking collision according to the rider adapter.
5. Attach/bind the rider for presentation and gameplay queries.
6. Possess the mount Pawn and activate the mount input context.
7. Verify the owning connection can produce mount commands.
8. Commit the lease/session revision.

### Release

1. Reserve and validate rider placement.
2. Stop accepting new mount movement actions after the selected simulation frame.
3. Place and resume the rider solver/collision.
4. Repossess the rider and verify ownership/input context.
5. Release the mount lease and seat binding.
6. Commit on-foot session state.
7. Destroy/dissolve or return the mount actor.

Do not rely on client input-context changes as authority. The server's possession
and lifecycle state decide which commands are valid; local contexts prevent user
confusion and duplicate intents.

### Preserve stable player systems

Audit systems that accidentally assume the possessed Pawn is always the hero:

- ASC/attributes and avatar actor updates;
- inventory/equipment and weapon visibility;
- targeting/lock-on and interaction source;
- camera view target and control rotation;
- team/affiliation and damage instigator;
- HUD bindings and input prompts;
- save ownership and analytics identity.

Prefer stable PlayerState/player identity references. Where a system must use the
current avatar, expose an explicit `ActiveControlledAvatar`/rider contract instead
of discovering it through casts.

## Keep one collision-resolved writer

The mount Mover proposes and resolves displacement through its swept root. No other
system may call transform setters, physics impulses that bypass the solver, root
motion movement, attachment correction, or network smoothing on the authoritative
root.

Audit writers with temporary instrumentation:

```text
ActorId | Frame | WriterName | Before | Proposed | Resolved | Reason
```

Fail a development assertion when more than the allowed Mover path writes the root
in one authoritative frame.

### Root and envelopes

- Use one supported simple primitive as the updated/swept component.
- Keep rider skeletal/Physics Asset collision out of locomotion blocking.
- Query the mounted envelope before spawn, narrow entries, and transitions.
- Store turn/navigation footprint separately from the sweep primitive.
- Define overlap behavior for pickups, combat hits, trigger volumes, and water.
- Never correct the authoritative root to match an animated mesh or seat socket.

If the installed Mover path cannot support the selected root/footprint contract,
stop for an engine capability decision. Do not disguise a vertical character
capsule as an accepted quadruped design without testing doors, turns, ceilings,
steps, slopes, and network correction.

## Configure proxies and corrections

Use the installed Mover/Network Prediction pattern for fixed simulation and
interpolated/smoothed simulated proxies. Separate:

- authoritative/predicted root correction;
- remote proxy interpolation;
- local visual mesh smoothing;
- rider seat smoothing;
- camera smoothing.

Never feed a smoothed visual transform back into Sync state.

Track correction count, magnitude, reason, mode, input sequence, session revision,
and topology. A correction storm often begins with wrong ownership, non-replayable
input, config revision mismatch, or a second writer—not insufficient smoothing.

### Relevancy and dormancy

- Keep an active controlled mount relevant to its owner and necessary observers.
- Do not dormancy-sleep an actor with active predicted movement or lifecycle work.
- Replicate stable IDs/session revision before cosmetic async resolution matters.
- On destroy, mark session outcome before actor disappearance can orphan clients.
- Test Replication Graph/project-specific relevancy, not only default actor ranges.

## Split C++ and Blueprint responsibilities

Prefer C++ for:

- replay/prediction state and serializers;
- movement modes, collision, authority, idempotency, and request outcomes;
- possession/control lease and recovery;
- validation rules that protect gameplay/cosmetic separation.

Use Blueprint/Data Assets for:

- authored archetype/skin/rig references and project tunables;
- presentation assembly, VFX/audio, animation selection, camera presets;
- world zones/candidate providers when they call a typed authoritative interface;
- debug visualization and designer-facing test maps.

Blueprint events may request or present a transition. They must not become the only
owner of a commit, revision, or displacement.

## Build in this order

1. Capability report and topology/collision spike.
2. Server lifecycle graybox with no final animation.
3. Ground input, Sync/Aux, floor/step/slope/collision, and correction diagnostics.
4. Rider seat binding and proxy smoothing.
5. Safe dismount and all interruption paths.
6. World streaming, combat, camera, persistence, and accessibility adapters.
7. Packaged dedicated/JIP/reconnect/adverse-network validation.
8. Additional movement branch only after a new scope decision.

## Complete the Mover implementation

- [ ] Installed capabilities and exact APIs have evidence.
- [ ] Custom movement set assumptions match the mount root and footprint.
- [ ] Input/Sync/Aux state survives correction and replay.
- [ ] One input press cannot double-trigger after resimulation.
- [ ] Possession/control lease succeeds and recovers on dedicated server.
- [ ] Stable player identity/ASC/targeting/HUD survive both handoffs.
- [ ] Only Mover writes authoritative displacement.
- [ ] Root correction, proxy smoothing, seat smoothing, and camera smoothing are separate.
- [ ] Active mounts remain relevant; actor destruction cannot orphan the session.
- [ ] Packaged targets use the same proven modules and configuration.
