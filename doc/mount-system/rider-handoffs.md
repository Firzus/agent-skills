# Rider and gameplay handoffs

Use this reference to integrate the rider controller, seat/animation, camera,
targeting, combat, damage, interaction, input, and accessibility without giving
presentation systems gameplay authority.

## Contents

- Rider suspend/resume
- Seat and rig contract
- Animation and Motion Warping
- Camera and targeting
- Input contexts
- Combat, interaction, and damage
- Accessibility
- Handoff completion record

## Suspend and resume the rider explicitly

The character controller exposes a mount adapter; the mount lifecycle calls it.
Recommended semantic interface:

```text
CanSuspendForMount(request) -> result/reason
CaptureOnFootSnapshot() -> snapshot
SuspendForMount(session, seat, collisionPolicy)
ValidateSafePlacement(candidate) -> result
ResumeFromMount(session, transform, velocity, facingPolicy)
RecoverOnFoot(snapshot/recoveryAnchor)
```

Suspension must address each concern independently:

- stop the on-foot movement solver from writing displacement;
- preserve or explicitly replace gameplay query/overlap channels;
- stop on-foot movement input from reaching the rider solver;
- preserve player identity, ASC/attributes, inventory, team, and damage ownership;
- define weapon visibility and attack source while seated;
- expose the rider as attached/suspended for other systems;
- keep the actor replicated/relevant as required.

Do not disable the entire rider actor, tick tree, collision, or replication as a
shortcut. That commonly removes damage, interaction, animation, ability, or network
behavior that must remain active.

On resume, restore from the current authoritative policy, not stale component flags
captured before an unrelated gameplay change. Use a scoped suspension token or
layered policy so mount exit does not undo a concurrent system's valid restriction.

## Define seat and rig compatibility as data

Use a rig-family contract shared by gameplay archetype and cosmetic skins:

```text
MountRigFamily
  SkeletonId
  RootConvention
  PrimarySeatSocket/Bone
  SeatLocalTransform
  RiderOrientationPolicy
  RiderIKTargets
  Gait/PhaseSchema
  MountedEnvelopeProfile
  AllowedRiderBodyProfiles
  SkinCompatibilityRules
```

Treat the seat socket as presentation input. The authoritative rider relationship
comes from the session/seat binding, not from discovering an attachment parent.

Data Validation must reject:

- missing or renamed seat/IK bones;
- skin skeleton/root/scale outside the rig-family tolerance;
- rider pose/seat combination outside the mounted envelope;
- a skin overriding collision or movement gameplay data;
- incompatible gait/phase schema;
- missing transition animation/presentation references required by the archetype.

If a new skin needs a different skeleton, leg count, root shape, seat layout, or
movement model, create a new rig family/archetype and rerun validation. Do not call
it a cosmetic variant.

## Keep animation downstream of simulation

Use separate mount and rider AnimBPs. The mount publishes resolved movement facts;
the rider consumes the same facts plus seat state.

Recommended presentation inputs:

- lifecycle and seat-binding state;
- resolved local velocity/speed and acceleration;
- gait band and normalized gait phase;
- turn rate, lean, slope, surface normal;
- grounded/airborne/water/branch state;
- jump/landing and hard-CC presentation events;
- rider aim/upper-body state and accessibility settings.

Animation may output mesh offsets, pose, IK, secondary motion, VFX/audio cues, and
camera hints. It must not move the swept root, place the rider, possess a Pawn,
change the control lease, or commit lifecycle state.

### Use Motion Warping for alignment, not authority

Generate warp targets from server-validated mount/dismount candidates and the seat
contract. The lifecycle commits according to state/simulation time; the montage
visually converges on the target.

Rules:

- no gameplay commit depends on reaching an Anim Notify;
- interruption always has a lifecycle recovery path;
- network correction changes presentation targets without rewriting authoritative
  state from the mesh;
- root motion, when used for a future special action, proposes motion through the
  movement solver and follows the installed Mover integration contract;
- Contextual Animation is an optional capability spike, never a public dependency.

Use Anim Notifies only for presentation such as footsteps, tack audio, dust, or
short-lived VFX. Make critical cues resilient to skipped/late montages.

### Solve rider pose after seat binding

Recommended order:

1. resolve mount locomotion pose;
2. publish gait/phase and seat transform;
3. apply rider base seated pose;
4. align pelvis/root to seat within bounded presentation offsets;
5. solve hands/feet/reins/stirrups with IK;
6. layer aim, hit reaction, equipment, facial, and secondary animation;
7. clamp offsets to the mounted envelope and comfort policy.

Do not copy mount clips one-for-one onto the rider. Share phase/state, not animation
asset identity.

The future project-wide `animation-system` should own AnimBP architecture, Sync
Markers, Motion Matching, IK budget, LOD, and content pipelines. This reference owns
only the mount-facing data and authority boundary.

## Preserve camera continuity

The camera system keeps the player's established yaw/pitch, sensitivity, inversion,
collision, and comfort settings across the handoff.

Mount integration provides:

- stable view target/anchor independent of animated head motion;
- speed/branch/clearance facts for gradual distance, height, lag, and FOV blending;
- mount/rider bounds for camera collision;
- lifecycle blend state and correction severity;
- optional recenter request that manual camera input cancels.

Avoid forced camera roll, auto-steer coupling, abrupt FOV steps, or camera lock by
default. Flying may require a separately approved horizon/roll comfort policy.

Do not sample the smoothed camera to drive predicted mount simulation. Input code
converts camera-relative intent into a stable direction before filling the command.

## Preserve targeting and avatar identity

Define which object each subsystem means by "player":

| Concern | Recommended stable source |
| --- | --- |
| Player/account/team | PlayerState or project identity service |
| Controlled locomotion actor | Current control lease/Pawn |
| Damageable hero/attributes | Rider/ASC owner according to combat architecture |
| Camera focus | Camera system's active mount rig/target |
| Interaction origin | Project policy: rider, mount root, or explicit proxy |
| Aim/target lock | Combat targeting context that survives handoff |

A possession swap is a technical control handoff, not roster character switching.
Do not reinitialize character progression, equipment, cooldowns, combo state, or
player identity as if a new hero were selected.

For attack-to-dismount, preserve target ID, lock state, desired facing/aim, attack
type, and input sequence in the buffered action. Revalidate after rider placement;
consume once or return a clear cancellation.

## Swap input contexts without making them authority

Use a remappable `MountToggle` and a mount movement context. Apply local contexts
from the replicated/predicted lifecycle state:

- OnFoot: rider movement and `MountToggle` summon request.
- Mounting/Dismounting: only explicitly buffered/cancelable inputs.
- Mounted: mount movement, sprint hold/toggle, jump, camera, dismount, allowed
  interaction/attack requests.

Ensure one physical input does not reach both on-foot and mount movement in the
same frame. Clear or sequence edge-triggered actions during context swaps.

The server validates requests from lifecycle/control lease; a local context is not
an anti-cheat or authority boundary.

## Integrate combat as a typed policy

Decide separately:

- eligibility to summon while combat is active;
- whether an already-mounted player may remain/flee;
- whether offensive input dismounts or enters mounted combat;
- targeting origin and lock continuity;
- damage owner and instigator;
- hard-CC tags that force dismount;
- fall/crash damage;
- mount health/downed/death, if any.

### Ephemeral utility baseline

- `Combat.Active` blocks new summon.
- Existing mounted session may continue through enemy aggro unless an authored rule
  forces dismount.
- Offensive input uses buffered attack-to-dismount; no mounted combat.
- Damage routes to the rider; the mount has no health/ASC.
- Normal damage does not dismount.
- Configured knockdown/launch/stun semantics force dismount.
- Downed/death dissolves the mount after authoritative recovery/cleanup.
- No extra invulnerability frames arise from mounting/dismounting unless combat
  policy explicitly owns and tests them.

Keep GAS tags/effects out of replay input. The gameplay authority validates the
request and snapshots the semantic outcome needed by lifecycle/movement.

### Mounted-combat extension

Treat mounted combat as a new vertical slice with:

- attack graph, weapon/ability eligibility, target acquisition, hit traces;
- rider/mount locomotion and rotation arbitration;
- animation/IK/weapon socket coverage for every gait/branch;
- damage/CC/knockback and dismount interactions;
- prediction, anti-cheat, AI, camera, UI, balance, and accessibility tests.

Do not add one attack animation and declare mounted combat supported.

## Integrate interaction explicitly

Classify interactions:

| Class | Mounted behavior |
| --- | --- |
| Passive pickup/currency overlap | May collect while mounted if policy permits |
| NPC/chest/quest/puzzle/teleporter/harvest | Usually buffer interact-to-dismount |
| Mount-native world action | Execute from mount only when explicitly designed |
| Travel/map transition | High-priority session termination before travel |

The interaction system validates target existence/range both before requesting exit
and after on-foot placement. The buffered token carries target and intent; the mount
lifecycle owns only the exit transaction.

## Provide accessibility from the first slice

At minimum, expose and test:

- full remapping, including one-handed/conflict cases;
- sprint hold/toggle;
- optional camera recenter and strength, canceled by manual input;
- camera shake, lag, FOV change, and motion/roll reduction;
- steering sensitivity and inversion through the shared camera/input policy;
- clear text/icon/audio reasons for summon or dismount refusal;
- high-contrast/readable lifecycle and stamina/energy feedback if resources exist;
- independent VFX/audio intensity where high-speed effects affect comfort.

Accessibility assists may add optional steering/edge support, but must be explicit,
off/on according to project defaults, deterministic where gameplay-relevant, and
compatible with network authority.

## Complete the handoff record

- [ ] Rider suspension disables one solver, not the actor's required gameplay behavior.
- [ ] Resume restores layered policy without overwriting unrelated restrictions.
- [ ] Rig/seat/skin compatibility is data-validated.
- [ ] Animation and Motion Warping cannot commit lifecycle or displacement.
- [ ] Gait/phase drives both AnimBPs without clip identity coupling.
- [ ] Camera settings and target lock survive both control handoffs.
- [ ] One input edge cannot reach both rider and mount contexts.
- [ ] Combat, interaction, damage, hard CC, fall, downed, and death have typed outcomes.
- [ ] Buffered attack/interaction is consumed once or cleared visibly.
- [ ] Accessibility settings are present in standalone and networked tests.
