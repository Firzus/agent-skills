# Validation and acceptance

Use this reference to turn the movement contract into observable completion
criteria. Validate behavior, authority, replay, presentation, and performance;
do not accept a controller because it feels correct in one Editor viewport.

## Contents

- [Test layers](#test-layers)
- [Reusable fixtures](#reusable-fixtures)
- [Invariant tests](#invariant-tests)
- [Mode lifecycle matrix](#mode-lifecycle-matrix)
- [World-interaction scenarios](#world-interaction-scenarios)
- [Combat and animation scenarios](#combat-and-animation-scenarios)
- [Network matrix](#network-matrix)
- [Network emulation](#network-emulation)
- [Rate and performance validation](#rate-and-performance-validation)
- [Acceptance gates](#acceptance-gates)
- [Engine-upgrade conformance](#engine-upgrade-conformance)

## Test layers

Use the narrowest layer that proves the contract, then retain representative
end-to-end cases.

| Layer | Proves | Examples |
| --- | --- | --- |
| Pure policy tests | Stable rules independent of Unreal world state | Transition priority, request decay, facing arbitration, lease consumption, teleport preservation/fallback selection |
| Mover functional tests | Mode/collision/output behavior in a controlled world | Ground/fall, mode entry/exit, slopes, water, climb, glide, bases |
| Network multi-process tests | Authority, prediction, rollback, proxies, lifecycle | Listen/dedicated, correction, loss, join-in-progress, reconnect |
| Streaming/world tests | Residency and destination/contact postconditions | World Partition teleport, unloaded base/anchor/volume |
| Action/presentation tests | Combat influence cleanup and canonical animation input | Dash/root motion/Motion Warping, target loss, Notify removal |
| Performance/soak tests | Project budgets and long-run stability | Resim storms, many proxies, long moving-base ride, repeated transitions |

Test through the project-owned movement interface. Avoid tests that fail only
because an internal Epic type or mode object changed name.

## Reusable fixtures

Keep compact controlled test maps rather than relying on production content.

### Collision gym

- flat ground and isolated walls;
- slope ramp covering the project's accepted angles;
- stairs and curbs at project-relevant dimensions;
- thin obstacles, seams, acute corners, convex/concave edges, low ceilings;
- ledge/perch cases and controlled penetration/recovery cases.

### Traversal gym

- climbable-by-default surfaces plus each exclusion mechanism;
- authored anchors and invalidated/destroyed anchors;
- glide launch, air current, landing, collision, and water-entry paths;
- shorelines, shallow/deep volumes, surface/underwater boundary, authorized and
  unauthorized dive regions;
- lease grant, exhaustion, revoke, correction, and renewal cases.

### Based-movement gym

- translating, rotating, tilting, reversing, stopping, and disappearing bases;
- board, ride, jump, detach, collide, crush, and base-destruction cases;
- multiple players competing for the same space/contact.

### Action gym

- dash, lunge, knockback, move-to, in-place action, and authorized root motion;
- static, moving, lost, invalid, and obstructed warp targets;
- cancellation trigger at every action phase;
- soft target, hard lock, target switch, and manual override.

### Teleport/streaming gym

- ready/unready destination cells;
- valid, obstructed, unsupported, submerged, airborne, and moving-base poses;
- nearby-safe, last-known-safe, checkpoint, and explicit-failure fallbacks;
- every state-preservation policy.

## Invariant tests

Make architectural invariants executable where possible.

### Single writer

- Instrument external actor/root movement calls during a test slice.
- Assert that manual locomotion, bases, layered moves, root motion, and teleport
  reach canonical movement through Mover.
- Fail on a competing transform/velocity write rather than compensating with
  smoothing.

### Replay-complete state

- Replay captured commands while mutating live camera, target, input device,
  Ability System, and traversal-query state outside the simulation.
- Assert that captured frames preserve the same semantic mode/action outcomes.
- Correct server authorization deliberately and verify bounded reconciliation
  without repeated irreversible effects.

### Transition totality

- Exercise every entry, rejection, loss, cancel, invalidation, and fallback edge.
- On an ambiguous frame, assert the declared priority and reason code.
- Invalidate the active surface/volume/base and assert a safe physical mode.

### Temporary influence ownership

- Cancel each layered move/modifier/root-motion contribution at every phase.
- Assert handles are removed once, finish velocity follows policy, and no stale
  facing/warp state remains.

### Presentation independence

- Remove/filter all Anim Notifies and verify gameplay lifetime and cleanup.
- Hide/replace the mesh and verify canonical movement is unchanged.
- Verify simulated proxies animate from canonical presentation state without raw
  local input.

## Mode lifecycle matrix

Fill every cell for each supported mode. Use project-specific cases and expected
reason codes.

| Mode | Entry | Steady | Boundary/contact | Authorization loss | Cancel/forced exit | Rollback | Simulated proxy |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Grounded | stable-floor accept/reject | slope/step/perch/base | floor loss/low ceiling | speed/sprint lease | jump/knockback/teleport | correction near ledge | starts/stops/turns/base |
| Falling | jump/floor loss | air control/gravity | wall/ceiling/landing | n/a | glide/water/teleport | apex/landing correction | trajectory/landing |
| Climbing | candidate/anchor validation | surface-relative motion | convex/concave/top/side | lease exhaust/revoke | drop/jump/hit/teleport | anchor/contact correction | mode/facing/contact |
| Gliding | deploy accept/reject | steer/descent/current | collision/landing/water | lease exhaust/revoke | fold/hit/teleport | wind/transition correction | trajectory/mode |
| Surface swim | shoreline/volume entry | swim/current/surface | shore/dive/volume edge | general lease exhaust | hit/climb-out/teleport | waterline correction | surface/depth/mode |
| Underwater | authorized dive | 3D swim/current | floor/ceiling/surface | aquatic sprint lease | hit/surface/teleport | volume/lease correction | orientation/depth/mode |

For jump buffering/coyote policy, test request capture, context change before
consumption, consumption, expiration, and correction on the edge frame.

## World-interaction scenarios

### Slopes, stairs, seams, and edges

- Cover the accepted angle/dimension domain, not one showcase ramp.
- Exercise low/high movement speed and each relevant modifier/action influence.
- Compare contact, stable floor, transition, and correction on authority and
  autonomous proxy.
- Verify a render-rate change does not alter the semantic outcome beyond the
  declared tolerance.

### Moving bases

- Cover translation and rotation independently before combining them.
- Test relative movement, jump-off inheritance, reverse/stop, correction, base
  invalidation/destruction, and join-in-progress while riding.
- Leave a rotating base during a dash/lunge or root-motion action; assert the
  declared base/action/collision/detach order and inherited velocity on authority,
  autonomous proxy, and simulated proxy.
- Test autonomous players, simulated players, and server-authored AI.
- Validate the project's explicit pawn-to-pawn collision policy on constrained
  bases and passages.

### Water and traversal boundaries

- Repeat entry/exit across shore, climb, glide, surface, and underwater boundaries
  to reveal oscillation.
- Test separate general and aquatic leases, including exhaustion during rollback.
- Unload/invalidate the active anchor or volume and verify the declared fallback.
- Test authorized versus forbidden underwater regions.

### Teleport

- Exercise each teleport type and preservation flag from ground, air, traversal,
  action movement, and moving bases.
- Verify destination readiness precedes application.
- Test each fallback in order and a fully exhausted chain.
- Verify floor/contact/base/anchor/warp state after placement and on all network
  roles.

### Rider mount handoff

- Suspend/resume the rider in standalone, listen, and dedicated processes while
  asserting that only the leased mount writes displacement.
- Verify the suspension token preserves required damage, ability, overlap,
  animation, replication, and query behavior while disabling on-foot input and
  solver movement.
- Validate supplied safe-placement candidates against the current on-foot shape,
  floor/slope, headroom, medium, encroachment, and world readiness.
- Reject a blocked candidate without changing rider state; apply an accepted
  candidate through Mover, recompute floor/base state, and restore only the policy
  represented by the suspension token.
- Reconstruct a valid suspended rider for join-in-progress and recover on foot when
  the authoritative mount session or mount actor is invalid.

## Combat and animation scenarios

For each action movement policy:

- start with and without manual locomotion;
- block immediately, midway, and near completion;
- lose or switch soft/hard targets;
- cancel in every action phase;
- change movement mode while the influence is active;
- correct/rollback through activation, contact, cancel, and completion;
- remove Notifies and vary montage blend-out;
- compare in-place and authorized-root-motion presentation where supported;
- verify no double displacement and no stale warp/facing handle.

For a group action, add one player disconnect, reconnect, die, correct, or fail
authorization while other players continue. Movement must remain valid per pawn.

## Network matrix

Run network acceptance in separate processes. Single-process PIE shares Editor
timing and cannot prove all topology behavior.

| Topology | Required viewpoints |
| --- | --- |
| Standalone | Local player and server-authored AI |
| Listen server | Host authority/autonomous behavior, remote autonomous client, each simulated proxy |
| Dedicated server | Server authority, at least two autonomous clients, cross-client simulated proxies, AI |
| Join-in-progress | New client observes every supported mode/base/action state |
| Reconnect | Recreated possession/state converges without stale request/action handles |

For each topology, record:

- semantic command and mode/action outcomes;
- corrections by cause, count, distance/angle, and rollback depth;
- proxy interpolation discontinuities;
- duplicated/dropped confirmed events;
- base/anchor/lease/action identity convergence;
- bandwidth and simulation cost relevant to project budgets.

## Network emulation

Define three categories:

1. **Baseline**: no artificial impairment.
2. **Product profiles**: latency, jitter, loss, reordering, and duplication derived
   from the project's supported network envelope.
3. **Severe diagnostic**: include a profile around 500 ms round-trip latency and
   at least 10% packet loss, as Epic suggests for exposing assumptions. Treat it
   as a diagnostic stress profile, not a universal shipping pass budget.

Exercise asymmetric conditions where tooling permits. Run normal and adverse
profiles through mode boundaries, moving bases, action cancellation, root motion,
teleport, join-in-progress, and reconnect rather than only straight-line walking.

## Rate and performance validation

Test multiple render rates and frame-spike patterns while preserving the selected
simulation ticking policy. Record:

- game/render frames per simulation tick and input samples merged;
- movement simulation CPU time by role/mode;
- rollback count/depth/resimulated frames and correction cost;
- proxy interpolation cost and visible discontinuities;
- trace/log overhead separately from shipping configuration;
- network bytes/frequency for project-owned Input/Sync/Aux data;
- memory/state size per pawn and at target player/AI concurrency;
- external discovery-query cost owned by traversal, kept separate from Mover's
  collision/contact queries and mode execution.

Set budgets from the target hardware, player count, AI count, tick policy, and
network envelope. Do not import generic tuning numbers.

## Acceptance gates

Accept a requested slice only when:

- every named installed API passed the capability gate;
- requested behavior passes pure/functional tests and the relevant mode lifecycle
  cells;
- standalone, listen, and dedicated multi-process scenarios pass when networked
  movement is in scope;
- autonomous, simulated, authority, and AI roles converge within declared
  project tolerances;
- no uncontrolled external transform writer remains;
- rollback repeats no irreversible effect and loses no required cleanup;
- correction causes are understood and within project budgets;
- moving-base, traversal, teleport, and action invalidation reach safe fallbacks;
- presentation remains downstream of canonical movement;
- unavailable environments or untested cells are reported as incomplete, not
  silently waived.

## Engine-upgrade conformance

Retain a small mandatory suite across engine versions:

1. walking/falling and input merge at multiple render rates;
2. autonomous correction and simulated-proxy interpolation;
3. translating/rotating base plus jump-off and base destruction;
4. one custom anchored mode and one water mode;
5. one layered move, cancellation, and authorized root-motion case;
6. streaming-ready teleport plus each fallback category;
7. standalone/listen/dedicated adverse-network run;
8. join-in-progress and reconnect in an active non-ground mode.

Compare semantic outcomes and project metrics with the previous accepted engine
baseline. Revise the movement contract deliberately when a capability changes;
do not patch callers around a leaking Epic API change.

## Primary engine anchors

- [Testing and debugging networked games](https://dev.epicgames.com/documentation/en-us/unreal-engine/testing-and-debugging-networked-games-in-unreal-engine)
- [Network emulation](https://dev.epicgames.com/documentation/unreal-engine/using-network-emulation-in-unreal-engine)
- [Gauntlet Automation Framework](https://dev.epicgames.com/documentation/en-us/unreal-engine/gauntlet-automation-framework-in-unreal-engine)
- [Mover Examples](https://dev.epicgames.com/documentation/unreal-engine/mover-examples-in-unreal-engine)
