# Mount movement branches

Use this reference to specify movement feel and simulation for Ground, Flying, and
Aquatic mounts. Complete one branch before composing capabilities.

## Contents

- Shared movement contract
- Control-feel decision
- Ground branch
- Flying branch
- Aquatic branch
- Cross-medium transitions
- Archetypes and capabilities
- Movement completion record

## Start with a shared contract

Every branch must define:

| Concern | Required decision |
| --- | --- |
| Input | Stable desired direction/magnitude, facing policy, action edges |
| Authority | Predicted owner, server simulation, proxy presentation |
| Modes | Entry, active simulation, exit, interruption, recovery |
| Collision | Swept root, blocking channels, step/slope/medium response |
| Footprint | Clearance, turn radius/space, navigation/world restrictions |
| Speed model | Acceleration, braking, turn response, sprint/boost and caps |
| Vertical model | Gravity/buoyancy/lift, jump/takeoff/landing/surface behavior |
| Resources | Stamina/energy/cooldown or explicit absence |
| World valves | Capability gates and authored restrictions |
| Presentation | Gait/phase/lean/IK/camera outputs derived from simulation |
| Failure | Blocked input, invalid transition, fall/crash/stuck recovery |
| Tests | Geometry, transitions, network adversity, accessibility |

Keep exact speed, acceleration, turn, air-control, camera, and network budgets in
project tuning backed by prototypes and playtests. Do not present genre examples as
canonical numbers.

## Choose control feel deliberately

### Direct avatar steering

Use when the mount is a low-friction exploration utility:

- map input to a desired camera-relative world direction;
- rotate/follow movement intent with readable, project-tuned response;
- allow turn-in-place or low-speed reorientation;
- smooth presentation at speed without delaying authoritative intent;
- let hard collision and authored world restrictions override input;
- keep auto-steering, road following, cliff refusal, and animal autonomy absent or
  accessibility-only unless explicitly designed.

The goal is immediate avatar-like control. Simulated quadruped presentation may
have inertia; the player's requested direction must remain legible.

### Mediated animal control

Use only when animal agency and relationship are core mechanics:

- input expresses spur/rein/desired path rather than direct velocity;
- autonomy may resolve local avoidance, cliff refusal, fear, or road following;
- feedback exposes why the creature deviated;
- progression/relationship may change behavior only through explicit rules;
- accessibility can reduce control mediation without hiding gameplay state.

Do not combine delayed direct steering with unexplained autonomy. Pick a contract
and make deviations observable.

## Build the Ground branch first

Recommended semantic modes:

```text
Grounded
  <-> Airborne
  -> WaterThresholdTransition
  -> ForcedStop/Recovery
```

Mount/dismount is lifecycle, not a movement mode.

### Map steering

For direct control:

1. Convert input to stable desired world direction before predicted simulation.
2. Project desired motion onto the accepted ground plane when grounded.
3. Select desired speed from input magnitude and sprint policy.
4. Apply deterministic acceleration/braking toward desired planar velocity.
5. Resolve facing from desired movement and low-speed turn policy.
6. Send one proposed move through Mover collision.
7. Derive presentation lean/gait from resolved, not desired, movement.

Handle zero input explicitly: brake/coast according to product feel, retain a stable
facing, and allow idle invocation to remain stationary.

### Separate speed from gait

Simulation owns continuous speed/acceleration. Animation maps resolved speed and
acceleration to gait bands with hysteresis:

```text
Idle -> Walk -> Run -> Sprint
```

Do not make tap-to-cycle gait the input model unless the product intentionally uses
mediated animal control. Do not let animation gait clamp or write movement speed.

Publish at least:

- signed/local velocity and speed;
- acceleration/deceleration;
- turn rate and lean intent;
- grounded/airborne and surface normal;
- gait band plus normalized phase when available;
- stride/foot contact data for presentation.

### Define sprint/resources

Select hold and/or toggle through remappable accessibility settings. If the profile
has no mount stamina, sprint simply selects the maximum allowed desired speed and
must not inherit an on-foot stamina drain accidentally.

If stamina/energy is included, define owner, regeneration, costs, prediction,
rollback, exhaustion behavior, UI, accessibility, persistence, and balance tests.
Do not add a resource solely because another mount game has one.

### Handle floor, steps, slopes, and edges

Prove:

- stable floor frame and hysteresis across uneven terrain;
- step-up/down behavior compatible with the mount's root and visual legs;
- walkable slope policy and deterministic slide/rejection behavior;
- no perch/edge oscillation or repeated grounded/airborne flips;
- no doorway entry that passes the root but traps the mounted envelope;
- turn feasibility in narrow geometry;
- moving-platform support or explicit exclusion.

For direct `EphemeralUtility`, avoid automatic cliff-stop or autonomous edge
refusal by default. Collision, slope limits, and authored restrictions remain hard
constraints; fall consequences remain explicit gameplay policy.

### Implement one manual jump

Define:

- grounded eligibility and jump input edge/sequence;
- project-tuned input buffer and coyote tolerance;
- vertical impulse/trajectory owned by Mover;
- limited readable air control;
- facing/velocity continuity;
- early-release behavior or explicit absence;
- landing, fall consequence, and hard-CC outcome.

No double jump, charged jump, auto-vault, or animation-authored trajectory enters
the Ground baseline implicitly. Add each as a new scoped movement capability.

Animation anticipates and presents the jump; it does not fire the authoritative
impulse from a notify.

### Handle falls

Capture fall start, vertical velocity/height metric, landing surface, and rider
damage policy using the project's authoritative damage model. The mount itself
must not silently grant fall immunity.

For an ephemeral mount with no health:

- safe landing remains mounted;
- configured threshold applies consequence to the rider;
- a forced dismount may follow through the lifecycle recovery path;
- death/downed ends the session;
- damage is applied exactly once under correction/resimulation.

### Cross shallow and deep water

Ground may accept a shallow-water medium with explicit drag/speed, floor probing,
VFX/audio, gait, and collision response. Define the water-depth sample against the
mount/rider contract, not a visual mesh socket alone.

At swim depth:

1. authoritative world/medium query requests a transition;
2. lifecycle selects a safe rider swimming handoff;
3. preserve allowed direction and momentum;
4. commit rider swimming/on-foot control;
5. end/dissolve the Ground mount session;
6. reject Ground summon while the rider remains in an invalid swim state.

## Treat Flying as a separate branch

First choose the flight model:

| Model | Player skill | World impact |
| --- | --- | --- |
| Free 3D avatar flight | Directional navigation and camera | Maximum ground-content bypass; full 3D collision/content burden |
| Momentum/lift flight | Pitch, speed, energy, stall/recovery | More mastery and terrain interaction |
| Glide/limited vertical | Preserve/spend altitude; authored lifts | Retains more ground topology and route planning |

Specify independently:

- takeoff/landing eligibility and transaction;
- 3D input frame, camera horizon, pitch/yaw/roll policy;
- acceleration, lift/gravity, stall/hover/boost behavior;
- ceiling/altitude/world bounds and no-fly volumes;
- collision/crash response and recovery;
- stamina/energy, if any, including rollback;
- landing candidate ownership and safe rider recovery;
- combat/targeting and co-op relevance at vertical distance;
- streaming/HLOD/world-content support in all reachable space.

Flight progression is a world-design decision. `traversal-system` owns authored
access valves; `mount-system` consumes them and executes movement/lifecycle.

Do not unlock free flight before proving that required quests, hazards, streaming,
navigation, and presentation remain valid when approached from above or bypassed.

## Treat Aquatic as a separate branch

Choose surface, submerged, or amphibious behavior. Define:

- water-body/volume fact source and authority;
- surface height, depth, current, buoyancy, drag, and vertical control;
- camera and input frame above/below water;
- collision against shore, seabed, surface obstacles, and ceilings;
- oxygen/energy only when product design requires it;
- enter/exit candidates and shoreline recovery;
- animation/VFX/audio medium state;
- replication across water-body and streaming boundaries.

An Aquatic archetype is not Ground with gravity disabled. Its floor/medium queries,
vertical control, collision, recovery, and presentation are different contracts.

## Make cross-medium transitions explicit

For every pair in scope, decide:

| Transition | Decision examples |
| --- | --- |
| Ground -> Flying | Takeoff action, jump threshold, authored launch, or forbidden |
| Flying -> Ground | Landing candidate, collision approach, crash/recovery |
| Ground -> Aquatic | Shallow continuation, rider swim handoff, or archetype swap |
| Aquatic -> Ground | Shore candidate, beaching, or explicit dismount |
| Flying -> Aquatic | Dive transition, impact, or forbidden |

Cross-medium transitions must preserve one displacement writer and one lifecycle
owner. Do not destroy one actor and spawn another between predicted frames without
a revisioned authoritative transition and reconstruction plan.

## Compose archetypes through proven capabilities

Prefer specialized archetypes and movement sets:

```text
MountArchetype
  Chassis/RigFamily
  GroundCapability
  optional FlyingCapability
  optional AquaticCapability
  Collision/Envelope/Footprint data
  Presentation references
```

Composition is valid only when every capability pair has an explicit transition.
If a new skeleton, leg count, root shape, seat layout, or locomotion model violates
the rig/chassis contract, create a new rig family and rerun the full validation
matrix.

## Complete the movement record

- [ ] One control-feel contract is selected and player deviations are observable.
- [ ] Ground has deterministic floor, step, slope, edge, jump, fall, and water behavior.
- [ ] Speed simulation and gait presentation are separate.
- [ ] Resource absence or inclusion is explicit and tested.
- [ ] No animation, camera, or attached actor writes authoritative movement.
- [ ] Flying/Aquatic are absent or have independent contracts and tests.
- [ ] Every cross-medium transition has authority, commit, failure, and recovery.
- [ ] Exact tuning values come from project prototypes/playtests and measured budgets.
