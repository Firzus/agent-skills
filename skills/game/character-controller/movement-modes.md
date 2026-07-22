# Movement modes and world interaction

Use this reference to design persistent locomotion modes and the physical
contracts for stamina, moving bases, and teleport. Keep world affordance discovery
and gameplay economy outside the controller.

## Contents

- [Classify movement correctly](#classify-movement-correctly)
- [Mode lifecycle contract](#mode-lifecycle-contract)
- [Grounded, jump, and falling](#grounded-jump-and-falling)
- [Climbing](#climbing)
- [Gliding](#gliding)
- [Surface swimming](#surface-swimming)
- [Underwater swimming](#underwater-swimming)
- [Sprint and traversal leases](#sprint-and-traversal-leases)
- [Moving bases](#moving-bases)
- [Teleport and recovery](#teleport-and-recovery)
- [Extensions](#extensions)

## Classify movement correctly

Use the Mover concept matching the behavior's lifetime. Confirm concrete types
in the installed version.

| Behavior | Representation | Reason |
| --- | --- | --- |
| Walking/grounded, falling, surface swim, underwater swim, climb, glide | Movement mode | Persistent collision and control regime; exactly one active |
| Sprint envelope, stance, resolved traction/control change | Modifier or mode settings | Changes parameters without owning displacement |
| Dash, lunge, knockback over time, authorized root motion | Layered move or installed equivalent | Temporary proposed movement mixed with the active mode |
| Teleport, respawn placement, atomic forced velocity | Instant effect or installed equivalent | Atomic state change with explicit postconditions |

Do not encode every verb as a parallel state machine. Keep one active movement
mode and arbitrate temporary influences through Mover.

## Mode lifecycle contract

Specify every mode with the same observable lifecycle:

| Field | Required definition |
| --- | --- |
| Entry request | Producer, authority, required replay data, buffer lifetime |
| Preconditions | Physical contact/volume plus gameplay authorization |
| Entry validation | What is rechecked on the simulation frame that accepts entry? |
| Steady state | Input mapping, collision rules, gravity/buoyancy, facing, resource lease |
| Contact frame | Stable anchor/base/volume representation and hysteresis |
| Temporary influences | Allowed layered moves/modifiers and mix priorities |
| Loss conditions | Contact, volume, lease, anchor, or authority invalidation |
| Cancellation | Owner, handle, finish velocity, cleanup, outcome reason |
| Exit/fallback | Next mode and safe physical state for every failure |
| Presentation | Canonical facts and deduplicated transition events |
| Tests | Entry, steady state, edge, loss, cancel, rollback, proxy, adverse network |

Revalidate a buffered request when consumed. Store its timeframe and required
context; do not accept a jump, climb, or dive merely because it was legal when
the button was pressed.

Use stable reference frames and hysteresis near boundaries. A noisy contact,
shoreline, or volume edge must not alternate modes every simulation frame.

## Grounded, jump, and falling

Use verified Default Set walking/falling behavior where it satisfies the project
contract. Keep project semantics independent from installed class names.

### Ground contact

Distinguish:

- **hit**: a sweep encountered geometry;
- **contact**: the character currently touches supporting geometry;
- **stable floor**: the contact satisfies walkability, support, edge/perch, and
  movement-policy checks.

Define and test slope, step, ledge/perch, floor snap, depenetration, base
attachment, and transition-to-fall behavior. Do not fix jitter by increasing snap
or friction until the first incorrect contact/base fact is known.

### Jump

Treat jump as an accepted request plus a vertical state change, not a direct
transform edit.

- Capture coyote/buffer policy in replay-complete data when the project uses it.
- Revalidate stable-floor/coyote context when consuming a buffered request.
- Separate horizontal air control from vertical jump/gravity policy.
- Express variable jump through an explicit held/released input policy and
  simulation state.
- Define jump-off moving-base velocity inheritance.
- Define apex, terminal velocity, landing, and interrupted-jump outcomes without
  copying generic tuning numbers.

Publish landing impact facts. Let combat/gameplay decide fall damage, immunity,
VFX, or recovery.

### Falling

Falling must always be a safe fallback when support, an anchor, a water volume,
or a custom mode becomes invalid. Preserve collision and bounded depenetration;
never leave the pawn in a mode whose physical preconditions no longer hold.

## Climbing

Implement climbing as a project-owned custom mode. Do not claim a Default Set
climbing mode unless the installed engine proves one exists.

For a Genshin-like profile, use a hybrid affordance model outside the controller:

- eligible static surfaces are climbable by default;
- tags, materials, components, or volumes declare exclusions;
- authored anchors handle transitions or exceptional geometry;
- traversal discovers and scores the candidate;
- the controller receives a stable surface frame and validity token.

The climbing mode owns only physical execution:

- revalidate current contact, clearance, and anchor revision;
- maintain a stable tangent/normal frame with hysteresis;
- map captured intent into surface-relative motion;
- solve concave/convex changes without discovering a new route implicitly;
- consume the authorized traversal lease replayably;
- define top, bottom, side, jump/drop, knockback, exhaustion, and invalid-anchor
  exits;
- fall safely if the surface or base disappears.

Mantle/vault selection, route readability, unlocks, and stamina economy belong to
`traversal-system`. If an authored transition uses Motion Warping, route its root
motion through Mover as described in [combat-animation.md](./combat-animation.md).

## Gliding

Implement gliding as a project-owned airborne mode or verified falling-derived
extension. Declare:

- deployment permission and input buffer;
- captured wind/updraft/current facts needed by simulation;
- gravity, terminal descent, steering, facing, and collision policies;
- general traversal lease consumption and exhaustion behavior;
- cancellation, attack/hit interruption, water entry, landing, and invalid-volume
  transitions;
- finish velocity when folding the glider or transitioning to falling.

The traversal/world system owns updraft discovery and region rules. Copy the
resolved movement-affecting values into replay state; do not query mutable volume
or weather policy from a resimulation frame.

## Surface swimming

Use the installed Default Set swimming mode only after the capability gate. The
public API documents a water-volume mode and surface controls in some versions;
it does not prove a complete project water model.

Define:

- entry/exit volume and shoreline hysteresis;
- stable water-surface reference and base/current contribution;
- camera-relative planar input captured outside simulation;
- buoyancy/depth constraints and jump/climb-out request behavior;
- general traversal-stamina lease and the exact exhaustion fallback;
- loss of volume, streaming, teleport, and moving-water-base behavior;
- remote-proxy surface presentation facts.

For the Genshin-like profile, surface swimming consumes the general traversal
stamina budget. The gameplay system owns the resulting failure/recovery policy;
the controller only exits through the authorized physical transition.

## Underwater swimming

Treat underwater traversal as a separate project-owned mode. Do not assume that
an installed surface swimming mode provides full 3D underwater controls.

For the selected Genshin-like profile:

- allow diving only inside explicitly authorized water regions;
- require no oxygen resource;
- allow normal underwater locomotion without general-stamina drain;
- consume a separate `Aquatic Stamina` lease only for underwater sprint;
- let traversal own recovery pickups, currents, acceleration bubbles, region
  permissions, and aquatic progression;
- capture 3D intent, current/volume facts, and lease state for replay.

Define surface breach/dive thresholds with hysteresis, floor/ceiling contact,
orientation and facing policy, sprint exhaustion, combat interruption, teleport,
and invalid-volume fallback. Underwater camera and post-processing remain outside
the controller.

This profile follows publicly documented Genshin product behavior, not evidence
of its internal architecture:

- [Genshin exploration stamina](https://blog.playstation.com/?p=341471)
- [Genshin underwater exploration and Aquatic Stamina](https://blog.playstation.com/2023/08/04/genshin-impact-version-4-0-launches-august-16-first-details/)

## Sprint and traversal leases

Keep resource ownership outside movement. A sprint/climb/glide/swim mode receives
a resolved permission or `Traversal Lease`; it does not mutate the persistent
stamina attribute directly.

For a continuous lease:

1. Authorize it on the server and make the prediction contract explicit.
2. Include budget, revision, and resolved consumption parameters needed by the
   movement simulation.
3. Store the movement-relevant remainder in replay state.
4. Consume it according to simulation time, including resimulation.
5. Transition with a stable reason code when exhausted or revoked.
6. Commit persistent resource consumption only from confirmed usage.

Do not call stamina itself a Mover modifier. A modifier may carry the resolved
speed/control envelope; the resource and its economy remain external.

## Moving bases

Add verified based movement in its dedicated network slice after the walking and
falling baseline. Do not claim moving-base support before that slice passes on
listen and dedicated processes. Treat network behavior as an acceptance
requirement, not a guarantee provided by using a helper type.

Capture or reconstruct the installed equivalent of:

- stable network-resolvable base identity;
- relative character transform/contact;
- base linear and angular contribution needed by simulation;
- tick/update dependency and swept following policy;
- inherited velocity on detach or jump;
- base revision/validity.

Define outcomes for a destroyed, unloaded, unresolved, teleporting, or
non-walkable base. Usually detach to falling with a declared inherited velocity;
never retain a dangling base pointer or snap to an unknown transform.

Test translation, rotation, tilt, direction reversal, high relative speed,
boarding/leaving, jump-off, correction, simulated proxies, and base destruction.
Keep arbitrary Chaos-driven vehicles/supports outside this kinematic baseline.

For co-op, make pawn-to-pawn collision an explicit product decision. Test two
players competing for the same contact, edge, narrow passage, and teleport spot;
do not assume blocking, overlap, or soft avoidance.

## Teleport and recovery

Model teleport as a typed, server-validated request. Never use a raw
`SetActorLocation` as a competing movement path.

### Request

Include:

- reason/type such as blink, fast travel, respawn, or recovery;
- destination pose and destination revision;
- streaming/readiness proof from the world system;
- collision/encroachment policy;
- explicit preservation flags for facing, velocity, active mode, base, layered
  moves, root motion, and buffered input;
- failure and fallback policy.

### Execution

1. Let World Partition or the project streaming system prepare the destination
   and report readiness.
2. Validate authority, destination revision, capsule/shape clearance, and
   gameplay permission on the server.
3. Apply through the installed Mover instant-effect path.
4. Clear or preserve each state field according to the typed policy.
5. Invalidate stale floor, contact, base, anchor, and warp-target data.
6. Recompute physical support and select the resulting mode.
7. Reconcile/present the accepted result to autonomous and simulated proxies.

### Fallback chain

Use an ordered, bounded chain owned by project policy:

```text
requested pose
  -> nearby validated safe poses
  -> last-known-safe pose
  -> checkpoint / spawn
  -> explicit failure if none is valid
```

Do not let Mover choose streaming or game-design destinations. It only applies
and collision-validates the accepted physical state through verified installed
capabilities.

## Extensions

Keep vault, mantle, zipline, grapple, vehicles, wall-run, and arbitrary physics
interaction outside the core profile. Add one only when requested:

1. Decide whether it is a persistent mode, temporary influence, or authored
   transition.
2. Define the external affordance and permission owner.
3. Reuse the same request/outcome/replay contracts.
4. Add its lifecycle and network matrix before implementation.

Route creature mounts to `mount-system`. A mount owns a distinct movement contract
and lifecycle; it does not become a character-controller mode. This controller only
suspends/resumes the rider and validates on-foot placement through the adapter in
[architecture.md](./architecture.md).

Do not restore generic FPS momentum, vehicle, VR, or active-ragdoll guidance to
this skill.

## Primary engine anchors

- [`USwimmingMode`](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/Mover/USwimmingMode)
- [`UBasedMovementUtils`](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/Mover/UBasedMovementUtils)
- [`FTeleportEffect`](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/Mover/FTeleportEffect)
- [World Partition](https://dev.epicgames.com/documentation/unreal-engine/world-partition-in-unreal-engine)
