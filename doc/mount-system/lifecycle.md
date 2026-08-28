# Mount lifecycle

Use this reference to make summon, mount, dismount, dismiss, interruption, travel,
and recovery transactional. Lifecycle states describe authoritative gameplay, not
animation clips.

## Contents

- Requests, outcomes, and revision
- State machine and priorities
- Summon-and-mount transaction
- Safe dismount transaction
- Buffered actions
- Forced transitions and recovery
- Travel, reconnect, and JIP
- Lifecycle completion matrix

## Define typed requests and outcomes

Adapt names and field types to the project, but preserve identity, expected state,
and explicit results.

```cpp
enum class EMountRequestType : uint8
{
    SummonAndMount,
    ManualDismount,
    AttackDismount,
    InteractDismount,
    ForcedDismount,
    Dismiss
};

struct FMountRequest
{
    FGuid RequestId;
    uint32 ExpectedRevision;
    EMountRequestType Type;
    FNetworkGUID RiderId;
    FName RequestedArchetypeId;
    FName RequestedSkinId;
    FVector_NetQuantizeNormal PreferredExitDirection;
    FMountBufferedAction BufferedAction;
};

struct FMountOutcome
{
    FGuid RequestId;
    uint32 AppliedRevision;
    EMountOutcomeCode Code;
    EMountFailureReason Reason;
    EMountLifecycleState FinalState;
    FTransform FinalRiderTransform;
    bool bRetryable;
};
```

Use stable enumerated failure reasons, for example:

- `NotEntitled`, `InvalidLoadout`, `InvalidRiderState`, `CombatBlocked`;
- `NoSummonZone`, `ForceDismountZone`, `NoValidSpawn`, `AssetsUnavailable`;
- `RequestStale`, `RequestDuplicate`, `TransitionBusy`, `ControlLeaseFailed`;
- `NoSafeExit`, `TargetInvalid`, `TravelInProgress`, `ServerRecovery`.

Do not collapse failures into a boolean. UI, telemetry, retries, tests, and recovery
need to distinguish policy rejection from a system defect.

### Make requests idempotent

- Cache the outcome for a bounded set of recent `RequestId` values.
- Return the same outcome for an exact duplicate; never spawn or consume twice.
- Reject an unseen request whose `ExpectedRevision` is stale.
- Increment the session revision once per committed lifecycle mutation.
- Correlate client anticipation and server result by request ID and revision.
- Bound caches by count/time according to project network budgets.

## Use an authoritative state machine

Recommended semantic states:

```text
OnFoot
  -> SummonPending
  -> Mounting
  -> Mounted
  -> DismountPending
  -> Dismounting
  -> OnFoot

Any transition may enter Recovering.
Travel/death may terminate the session directly after authoritative cleanup.
```

`Mounting` and `Dismounting` mean a gameplay transaction crossed its reservation
boundary. They do not wait for an Anim Montage notify.

Record a transition table:

| From | Request/event | Guard | Commit | Failure/recovery |
| --- | --- | --- | --- | --- |
| OnFoot | SummonAndMount | Rider/world/gameplay/loadout eligible | Mount actor initialized, lease acquired, rider suspended | Destroy partial actor, restore rider, typed refusal |
| Mounted | ManualDismount | Safe exit found | Rider placement accepted | Remain mounted, brake, `NoSafeExit` feedback |
| Mounted | AttackDismount | Attack valid and safe exit found | Rider placed; action token handed to combat | Remain mounted and clear/expire token |
| Mounted | InteractDismount | Target valid and safe exit found | Rider placed; token handed to interaction | Remain mounted and clear/expire token |
| Mounted | ForcedDismount | Forced event | Rider placed at total recovery candidate | Enter Recovering until valid on-foot state |
| Any active | Travel/death | Server event | Lease released and rider/session cleanup committed | Server recovery, never persist half-mounted |

### Resolve concurrent events by priority

Define priorities in project policy. A safe baseline is:

1. death/downed, travel/map teardown, authority loss;
2. forced world transition, deep-water handoff, configured hard CC;
3. attack or explicit interaction dismount;
4. manual dismount/toggle;
5. cosmetic/loadout changes.

Higher-priority events cancel or supersede lower ones only before their commit
point. After commit, finish the transaction and enqueue the next valid transition.
Never run two lifecycle mutations concurrently.

## Validate summon eligibility

For an immediate ground summon, validate on the server:

- rider is authoritative, alive, grounded, stable, and owns no active mount session;
- on-foot state is eligible, such as idle/walk/run/sprint;
- rider is not falling, jumping, swimming, climbing, gliding, knocked back, downed,
  or already transitioning;
- gameplay policy permits summon, including combat status;
- world facts do not include `Mount.NoSummon` and no travel/teardown is active;
- selected archetype and skin are entitled, equipped, compatible, and ready;
- a spawn candidate passes root footprint, mounted envelope, slope, ceiling, medium,
  and streaming checks;
- the requested movement branch is valid in the current world medium.

Do not use navmesh presence as the only spawn proof. A player-controlled mount
needs collision/envelope and streaming validity even when it never uses AI nav.

## Execute summon-and-mount as one transaction

Use this order:

1. Accept `FMountRequest` against the current revision.
2. Snapshot rider state needed for rollback/recovery.
3. Ask traversal/world for candidates; score them deterministically.
4. Revalidate the selected candidate on the server.
5. Reserve session and candidate so a duplicate/race cannot reuse them.
6. Resolve/load the authoritative archetype, rig family, and skin IDs.
7. Spawn the mount actor server-side and initialize its swept root and Mover state.
8. Seed movement direction/velocity from eligible rider movement; use zero velocity
   for an idle invocation.
9. Acquire the exclusive control lease.
10. Suspend rider on-foot movement and configure mounted collision/query policy.
11. Bind the rider to the seat and perform the selected possession/control handoff.
12. Commit `Mounted`, increment revision, and replicate the outcome.
13. Start presentation immediately from the committed state; do not gate control on
    a montage, VFX, audio, or asset callback.

On failure before commit, release the reservation, destroy any partial mount actor,
restore the rider snapshot, retain/increment revision according to project audit
policy, and return one typed outcome. Never leave an invisible possessed mount or a
suspended unmounted rider.

## Make safe dismount a placement transaction

### Maintain total recovery data

While mounted, update a server-owned `LastValidatedRiderPlacement` when a candidate
is valid for the on-foot controller and remains inside allowed world/streaming
policy. Store transform, world/cell identity, validation revision, and reason.

This is not a per-frame save. It is bounded recovery state for the current session.

### Generate candidates in deterministic order

For manual and buffered-action dismounts:

1. requested side/direction;
2. opposite side;
3. rear;
4. last nearby validated safe placement.

For each candidate, test the on-foot character shape, floor/slope, overhead
clearance, medium, blocking actors, world gate, streaming readiness, and a sweep or
path from the seat/transfer point where required. Use the character controller's
safe-placement contract; do not duplicate its collision rules.

### Commit in a safe order

1. Lock the selected candidate and capture exit velocity/facing policy.
2. Enter `Dismounting`; stop accepting lower-priority requests.
3. Place/enable the rider through the character safe-placement API.
4. Restore on-foot collision and movement with the allowed inherited velocity.
5. Return possession/control to the rider and verify the lease.
6. Detach the seat binding.
7. Commit `OnFoot`, increment revision, and publish the outcome.
8. Only then dissolve/destroy or return the mount according to its profile.
9. Consume a valid buffered action exactly once.

The mount must not disappear before rider placement commits.

### Reject versus force

- Manual, attack, or interaction dismount with no safe candidate: reject, keep the
  player mounted, brake according to policy, clear/expire the buffered action, and
  show a concrete reason.
- Forced dismount: cannot be rejected. Use current safe candidates, then the last
  validated rider placement, then a project-defined authoritative recovery anchor.
  Enter `Recovering` until an on-foot state is verified.

The final recovery anchor must be specified and tested. Do not invent a blind
teleport or assume the current mount location fits the rider.

## Buffer attack and interaction explicitly

Use one revision-bound token:

```text
ActionId
ActionType
SourceInputSequence
TargetId (optional)
DesiredFacing/aim context
CreatedAtSimulationTime
ExpiryPolicy
ConsumedRevision (optional)
```

Rules:

- Validate that the requested attack/interaction exists before dismounting.
- Preserve target lock and facing context through the handoff when valid.
- Consume only after on-foot placement and control lease commit.
- Mark consumed before dispatch or make dispatch idempotent.
- Clear on rejection, target invalidation, priority cancellation, death, travel, or
  expiry.
- Never let a reconnect or duplicate outcome replay the action.

Passive pickup overlaps may remain available while mounted when gameplay policy
permits them; explicit NPC/chest/quest/puzzle/teleporter/harvest actions commonly
use the buffered dismount path.

## Handle forced transitions

Define an outcome for every event:

| Event | Typical policy | Required proof |
| --- | --- | --- |
| Normal damage | Route to rider; remain mounted | Damage owner and hit reaction do not steal movement authority |
| Hard CC | Forced dismount for configured tags | Tag snapshot, priority, recovery placement |
| Downed/death | End mount session | No surviving lease/actor/session mismatch |
| Safe fall landing | Remain mounted | Mount movement resolves landing |
| Threshold fall damage | Apply rider consequence and force exit if configured | Exactly one damage application |
| Shallow water | Stay mounted with Ground medium response | Collision/animation agree |
| Swim-depth water | End Ground session and hand to rider swimming | Direction/momentum preserved within policy |
| `Mount.ForceDismount` | Complete forced safe exit before restricted entry | Server world fact and total recovery path |
| Mount actor destroyed | Recover rider/session | Stable session owner survives actor |

Hard CC is a configured semantic set, not “any gameplay tag that looks severe.”
Snapshot the eligibility fact used by the authoritative transition.

## Terminate cleanly for travel and reconnect

### Fast travel, teleport, and map change

- Server begins a high-priority termination.
- Reject new mount requests.
- Clear buffered actions and release the control lease.
- Restore/record the rider's valid on-foot identity before travel serialization.
- Destroy/return the runtime mount actor.
- Arrive on foot unless the selected product profile explicitly specifies and tests
  remount reconstruction.
- Do not auto-resummon for `EphemeralUtility`.

### Join-in-progress

A joining observer reconstructs from the session snapshot plus normal actor/Mover
replication. Presentation waits for IDs/assets without changing lifecycle. A late
skin or animation asset may pop/blend cosmetically but cannot create a second actor
or move the rider.

### Reconnect

For `EphemeralUtility`, terminate the old session and resume on foot. A persistent
companion may reconstruct its durable world-presence state, but never auto-grant a
control lease or mounted state without an explicit reconnect contract.

## Complete the lifecycle matrix

- [ ] Every state/event pair is accepted, rejected with reason, ignored idempotently, or recovered.
- [ ] Duplicate/stale requests cannot spawn, destroy, or consume twice.
- [ ] Commit and cancellation boundaries are documented.
- [ ] Manual no-exit failure stays mounted with feedback.
- [ ] Forced exit has a total, server-owned recovery chain.
- [ ] Mount destruction follows rider placement, never precedes it.
- [ ] Buffered actions are consumed exactly once or explicitly cleared.
- [ ] Death, travel, actor loss, JIP, and reconnect cannot leave half-mounted state.
- [ ] No gameplay transition depends on animation notification timing.
