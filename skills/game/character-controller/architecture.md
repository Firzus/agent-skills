# Architecture and ownership

Use this reference to place the controller seam, define project-owned data, and
make the movement simulation replay-complete. Treat the interfaces below as
semantic contracts; map them to the types available in the installed Mover
version only after running the capability gate.

## Contents

- [Module depth](#module-depth)
- [Ownership](#ownership)
- [External interface](#external-interface)
- [Rider mount handoff](#rider-mount-handoff)
- [Replay data](#replay-data)
- [Authority and lifecycle](#authority-and-lifecycle)
- [Player and AI adapters](#player-and-ai-adapters)
- [Transition and influence discipline](#transition-and-influence-discipline)
- [Design deliverable](#design-deliverable)

## Module depth

Make `character-controller` a deep module: callers express a small set of
semantic requests, while the module hides mode selection, collision resolution,
based movement, rollback representation, and final displacement.

```text
External interface
  Movement Intent
  Traversal Request
  Action Movement Request
  Instant Movement Request
               |
               v
Character movement module
  Mover adapter -> modes -> influences -> collision -> reconcile
               |
               v
  Movement Outcome + Movement Presentation State
```

Keep Epic types behind a project-owned adapter. Gameplay callers should depend on
semantic mode IDs and request data, not concrete Default Set classes. This keeps
engine upgrades local while preserving direct access to Mover inside the module.

The seam is real because at least two producers use it: Enhanced Input and AI
produce movement intent; traversal and combat add typed movement requests.

## Ownership

Assign each fact to one owner. A system may observe or request behavior without
owning the resulting displacement.

| Module | Owns | Sends to character movement | Must not do |
| --- | --- | --- | --- |
| Character movement | Active mode, transitions, collision, velocity, final displacement, floor/contact/base state, active-anchor revalidation, replay state, rider suspension token, on-foot safe placement | Outcomes, presentation facts, rider suspend/resume and placement results | Select targets, spend persistent resources, discover routes, or edit transforms outside Mover |
| Input adapter | Device mapping, buffering policy, local input sampling | Device-independent `Movement Intent` | Read or write Mover state directly |
| AI/navigation adapter | Path following and steering decisions | The same `Movement Intent`, server-authored | Use a separate physics implementation for the same pawn class |
| Traversal system | Affordance discovery, world markup, candidate scoring, anchors, volumes, permissions, progression, stamina economy | `Traversal Request` and authorized `Traversal Lease` | Write velocity/transform or run candidate discovery inside resimulation |
| Combat/GAS adapter | Combo graph, action lifecycle, costs, cancel windows, group actions, and target requirements | `Action Movement Request`, cancel handle, resolved facing/warp facts | Select targets, apply displacement, or assume GAS and Mover roll back atomically |
| Targeting | Candidate discovery/selection, soft assist, and hard-lock state | Target/facing snapshot or tracked target facts | Let combat or movement select a target; query from inside movement simulation |
| Camera | Orbit/aim state and manual override policy | Camera-relative basis or resolved desired facing | Own pawn rotation inside the simulation |
| Animation | Pose selection, layers, presentation timing | Authorized root-motion contribution through the installed Mover path | Apply actor motion twice or own gameplay lifetime through a Notify |
| World streaming | Destination preparation and readiness | Accepted teleport destination | Teleport the pawn directly |
| Mount system | Mount actor/session, control lease, seat binding, mount movement, summon/dismount lifecycle | Rider suspend/resume request and candidate placement | Treat the mount as an on-foot mode or bypass the rider placement contract |
| Party/session | Spawn, respawn, reconnect, team membership | Possession/lifecycle facts | Embed roster or group-ultimate logic in movement |

Default to one active pawn per player and no hot character switching. Multiple
players may control separate pawns in the same co-op team. If a project requires
switching, keep roster logic external and never transfer rollback history between
pawns implicitly.

## External interface

Use a small family of typed messages rather than exposing individual modes or
velocity setters.

### Movement Intent

Capture intent before simulation. Include only device-independent values that
the current frame needs, such as:

- desired movement direction and magnitude;
- camera-relative or aim-relative basis already resolved outside Mover;
- jump, sprint, crouch, or interaction intent with explicit buffer semantics;
- requested facing policy and manual-override facts;
- sequence/timeframe identity needed to deduplicate requests.

Do not place raw keys, controller objects, camera transforms, target actors, or
live ability queries in the movement simulation.

### Traversal Request

Make the discovered candidate immutable for the request lifetime. Include:

- semantic verb and requested entry transition;
- stable anchor identity and relative transform or surface frame;
- clearance/contact facts required for entry;
- a validity token or revision that the controller can revalidate;
- the authorized `Traversal Lease` when the mode consumes a resource;
- explicit loss, cancel, and fallback behavior.

The traversal system discovers the candidate. The controller revalidates only
the current candidate/contact needed for physical execution; it does not rescan
the world for alternatives.

### Traversal Lease

Use a project-owned lease when a continuous mode depends on stamina or another
gameplay resource. This is a project policy, not an Epic-native Mover feature.

- Let traversal/GAS remain the persistent resource authority.
- Grant a server-authorized, client-predictable budget with a revision and the
  resolved consumption parameters needed by simulation.
- Capture the movement-relevant lease state for rollback.
- Consume it replayably inside the mode and exit through a declared transition
  when exhausted.
- Commit irreversible resource side effects only from confirmed consumption;
  do not repeat them during resimulation.

Do not read an `AbilitySystemComponent` or recompute a live `allowed/denied`
decision from mutable gameplay state during replay.

### Action Movement Request

Represent combat and traversal actions with policies rather than attack names:

```text
FacingPolicy
LocomotionPolicy
DisplacementPolicy
WarpTargetPolicy
CollisionPolicy
CancelPolicy
AuthorityData
```

Return a handle for every temporary influence so its owner can cancel it
atomically. See [combat-animation.md](./combat-animation.md).

### Instant Movement Request

Use a typed request for teleport, respawn placement, or forced velocity. Include
server validation, preservation/reset flags, and failure behavior. The world
system chooses and prepares the destination; Mover applies the accepted state
change. See [movement-modes.md](./movement-modes.md).

### Rider mount handoff

Expose a project-owned adapter for `mount-system`; keep lifecycle timing and mount
movement outside this controller:

```text
CanSuspendForMount(request) -> result/reason
CaptureOnFootSnapshot() -> recovery snapshot
SuspendForMount(session, seat, collisionPolicy) -> suspension token
ValidateSafePlacement(candidate) -> placement result/reason
ResumeFromMount(session, transform, velocity, facingPolicy) -> movement outcome
RecoverOnFoot(snapshot/recoveryAnchor) -> movement outcome
```

- Let `mount-system` choose when to summon, mount, dismount, or recover and which
  ordered candidate to try.
- Validate every candidate with the rider's current on-foot shape, floor, slope,
  headroom, medium, base, and streaming-ready world state.
- Make suspension revoke the rider Mover's displacement authority while preserving
  required damage, overlap, ability, animation, replication, and query behavior.
- Represent suspension as a scoped/revisioned token so resume cannot clear a newer
  restriction owned by another system.
- On resume, place through the accepted controller path, restore the on-foot
  collision/mode, recompute floor/base state, and apply only the authorized inherited
  velocity and facing policy.
- Return typed success/failure/recovery outcomes. A placement failure leaves the
  current rider state unchanged; the mount lifecycle decides its next candidate.

The character controller never selects a dismount side, destroys the mount, changes
the mount control lease, or uses the seat socket as proof of safe placement.

### Movement Outcome

Return observable simulation results without triggering irreversible gameplay
side effects directly:

- accepted, blocked, cancelled, invalidated, or completed status;
- active semantic mode and transition reason;
- collision/contact/base/anchor result relevant to the caller;
- lease usage and remaining simulated budget;
- final movement facts and correction/reconciliation metadata;
- stable reason codes suitable for tests and diagnostics.

Dispatch presentation or gameplay effects from confirmed outcomes with explicit
deduplication policy.

### Movement Presentation State

Publish canonical facts for animation, camera, and remote presentation:

- world and local velocity/acceleration;
- movement mode, gait, stance, grounded/contact state, and base-relative motion;
- desired and actual facing plus turn rate;
- trajectory or intent-derived prediction when available;
- action/locomotion policy and authorized root-motion state;
- correction, teleport, landing, and mode-transition presentation events.

Prefer canonical state over raw synchronized input for simulated proxies.

## Replay data

Allocate by change rate and authority, then map the allocation to the installed
Input/Sync/Aux interfaces. API names and hooks are version-sensitive.

| Semantic bucket | Put here | Never put here |
| --- | --- | --- |
| Per-frame input | Intent, one-frame requests, resolved facing basis, request IDs | Live object pointers or values recomputed from mutable systems during replay |
| Frequently changing sync state | Mode, velocity, transform, base relationship, active anchor/lease state, action influence handles | Presentation-only state or unvalidated client claims |
| Rare auxiliary state | Capability/config revision and slowly changing simulation parameters | Stamina values or contacts that change every frame |
| Reconstructible rollback-local cache | Probe refinements, cached floor data, intermediate calculations derivable from canonical state | Any fact required to reproduce or authorize movement |

For every simulation-affecting field, record:

| Question | Required answer |
| --- | --- |
| Producer | Which module resolves the value? |
| Authority | Client-authored input, server-authored state, or shared configuration? |
| Replay location | Input, evolving sync state, rare state, or reconstructible cache? |
| Reconcile | What difference requires correction? |
| Merge/interpolate | How are multiple input frames or proxy samples combined? |
| Decay | When does a one-shot request stop applying? |
| Test | Which rollback/network case proves the rule? |

Do not claim bitwise or cross-platform determinism unless the project separately
proves it. Require replay-complete inputs and observable convergence instead.

## Authority and lifecycle

- Let clients predict player-authored intent, but let the server validate
  gameplay authorization, destinations, leases, and action legality.
- Author AI intent on the server and present it to remote clients through the
  same canonical movement state.
- Hydrate join-in-progress and reconnecting clients from current authoritative
  state. Do not require historical local input to reconstruct a newly observed
  pawn.
- Keep spawn, respawn, possession, and reconnect orchestration outside movement;
  accept only the physical placement/lifecycle request.
- Reconstruct rider suspension from the authoritative mount session during JIP;
  recover on foot when the session or mount actor is invalid instead of restoring a
  half-mounted movement state.
- Separate replayed simulation events from confirmed side effects. Audio, VFX,
  achievements, resource commits, and analytics require a deduplication rule.

## Player and AI adapters

Use the same movement core and semantic intent for players and AI. Differences
belong before the seam:

| Concern | Player adapter | AI adapter |
| --- | --- | --- |
| Producer | Enhanced Input or equivalent | Navigation/steering/behavior |
| Authority | Client-predicted, server-validated | Server-authored |
| Camera basis | Resolved from the local camera system | Resolved from desired path/target policy |
| Buffering | Player forgiveness policy | Planner/path-following policy |
| Presentation | Autonomous plus remote proxy | Remote proxy on clients |

Test both adapters against the same interface outcomes. Do not expose internal
mode objects merely to make AI tests convenient.

## Transition and influence discipline

- Keep exactly one persistent movement mode active.
- Use a mode for a durable locomotion regime, a layered move for temporary
  displacement, a modifier for resolved parameter changes, and an instant effect
  for an atomic state change.
- Declare transition priority and loss/cancel paths. Do not rely on incidental
  registration order without a test.
- Give every temporary influence an owner, priority/mix policy, lifetime, cancel
  handle, and finish-velocity rule.
- Queue changes according to the installed Mover lifecycle. Verify whether a
  request affects the current or next simulation frame before writing gameplay
  assumptions around it.
- Keep one primary displacement source per action. If sources intentionally mix,
  declare the mix policy and collision owner explicitly.

## Design deliverable

Produce these tables for a new design or major refactor:

1. Ownership and displacement-authority table.
2. Mode and transition matrix, including invalidation and fallback.
3. Movement-influence matrix for manual input, traversal, combat, bases, root
   motion, forced reactions, and teleport.
4. Replay-data dictionary with producer, authority, reconcile, and test columns.
5. External request/outcome schemas and reason codes.
6. Network-role/topology validation matrix.
7. Capability and engine-upgrade risk register.
8. Rider suspension/safe-placement matrix when mount integration is in scope.

The architecture is closed only when a reviewer can trace every movement result
from producer to replay state to Mover outcome without crossing an undeclared
seam.

## Primary engine anchors

- [Mover features and concepts](https://dev.epicgames.com/documentation/unreal-engine/mover-features-and-concepts-in-unreal-engine)
- [Mover compared with Character Movement Component](https://dev.epicgames.com/documentation/unreal-engine/comparing-mover-and-character-movement-component-in-unreal-engine)
- [Mover API](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/Mover/UMoverComponent)
