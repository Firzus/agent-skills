# Combat movement and animation handoff

Use this reference when combat, targeting, root motion, Motion Warping, or
animation can influence movement. Keep combo and presentation architecture
outside the controller while preserving one collision-resolved displacement
authority.

## Contents

- [Action movement contract](#action-movement-contract)
- [Displacement arbitration](#displacement-arbitration)
- [Facing and targeting](#facing-and-targeting)
- [Cancellation](#cancellation)
- [Root motion and Motion Warping](#root-motion-and-motion-warping)
- [Animation handoff](#animation-handoff)
- [Group actions](#group-actions)
- [Acceptance rules](#acceptance-rules)

## Action movement contract

Let combat/GAS own attacks, combo branches, costs, cooldowns, hit windows, cancel
windows, target requirements, and action lifetime. Let targeting alone discover
and select targets. Submit a semantic movement contract to the character module
for each action that affects movement.

```text
FacingPolicy
LocomotionPolicy
DisplacementPolicy
WarpTargetPolicy
CollisionPolicy
CancelPolicy
AuthorityData
```

Define each policy explicitly:

| Policy | Questions to answer |
| --- | --- |
| Facing | Free, movement-aligned, target-aligned, or authored? What can manual input override? |
| Locomotion | Enabled, scaled, blended, or locked? Which mode changes are legal? |
| Displacement | None, layered velocity, move-to, impulse/forced velocity, or authorized root motion? |
| Warp target | None, activation snapshot, or tracked? Who validates loss/range/line of sight? |
| Collision | Which active-mode collision remains authoritative? What happens when blocked? |
| Cancel | Allowed frames/conditions, influence handles to remove, finish velocity, next mode |
| Authority data | Which target/facing/action facts must be captured for prediction and replay? |

Use semantic action/request IDs and sequence identity. Do not make the controller
know attack names, combo nodes, montage sections, damage, elemental rules, or a
group-ultimate graph.

## Displacement arbitration

Keep Mover as the only writer. Classify each action influence using the installed
Mover capabilities:

| Intent | Preferred semantic representation |
| --- | --- |
| Dash or lunge over time | Layered move with explicit lifetime, mix priority, cancel handle, and finish velocity |
| Knockback/hit reaction | Layered move for duration-based motion or atomic forced velocity for an instantaneous change |
| Move toward a target | Validated layered move; never a direct actor transform lerp |
| Authored contact-rich action | Root-motion contribution through the verified Mover path |
| No movement action | Locomotion/facing policy only; add no zero-value displacement writer |

Use one primary displacement source per action. If an action intentionally mixes
manual locomotion, a lunge, and root motion, declare the mix order and weight in
the contract and test cancellation at each phase.

A reasonable project default is:

```text
forced safety / server correction
  > forced hit reaction
  > authorized action or traversal influence
  > manual locomotion proposal
```

Treat this as project policy, not an Epic-provided priority. Encode and test the
actual order instead of relying on registration timing.

## Facing and targeting

Keep target discovery, soft assistance, hard lock, and camera control external.
Provide only replay-complete target/facing facts to movement.

Support these semantic facing policies:

- `Free`: preserve current facing or let the presentation layer orient within the
  active mode's declared rules.
- `MovementAligned`: face resolved movement intent/velocity.
- `TargetAligned`: face a validated target direction supplied by targeting.
- `Authored`: let the action/root-motion contract provide facing for a bounded
  interval through Mover.

Use soft targeting by default and optional explicit hard lock for a Relink-like
control surface. Manual input breaks soft assistance unless the current action
declares a bounded facing lock. In hard lock, the external camera/targeting system
owns target switching and provides the desired facing; the controller still owns
physical rotation resolution.

Declare target behavior for:

- target lost, destroyed, occluded, out of range, or behind the actor;
- soft target changing during an action;
- snapshot versus tracked facing/warp target;
- manual camera input and manual movement override;
- rollback to a frame before target acquisition or loss;
- autonomous versus simulated-proxy presentation.

The [official Relink control manual](https://relink.granbluefantasy.jp/en/manual/detail?p=steam&s=controls)
supports lock-on, target switching, dash, dodge, attacks, and skills as public
product behavior. It does not reveal Cygames' internal controller architecture.

## Cancellation

Return an owner-visible handle for every temporary movement influence. Bind the
action's cancellation path to one atomic cleanup operation that:

1. invalidates the action movement request;
2. removes its layered moves/modifiers through verified Mover handles;
3. clears or transfers facing locks and warp targets;
4. stops authorized root-motion contribution without applying it twice;
5. resolves finish velocity and active mode;
6. emits one replay-safe outcome and deduplicates confirmed side effects.

Test cancellation before start, during anticipation, during displacement, on
contact/block, during recovery, after target loss, during correction, and on
ability/network teardown. A missing Anim Notify must not prevent cleanup.

## Root motion and Motion Warping

Use root motion only through the integration path verified in the installed
Mover and Motion Warping plugins. Public APIs include Mover-oriented root-motion
and Motion Warping adapters in some engine versions; their names, data, and
replication contracts are version-sensitive.

Preserve this authority chain:

```text
animation delta / warp intent
  -> validated action movement request
  -> installed Mover root-motion representation
  -> active-mode collision and movement resolution
  -> canonical movement state
  -> mesh presentation
```

- Keep the collision root/capsule canonical. Resynchronize presentation to the
  canonical root after correction or cancellation; never move the capsule to
  chase a divergent mesh.
- Treat Motion Warping as trajectory adaptation, not destination validation.
  Combat/traversal validates the target and loss policy; Mover resolves movement
  and collision.
- Choose snapshot or tracked warp targets per action. Capture the facts needed
  to reproduce that choice.
- Define behavior when blocked, target validity changes, a montage blends out,
  the mode changes, or rollback re-enters the warp interval.
- Do not assume that using a Mover adapter automatically makes GAS, montage, or
  Motion Warping lifetimes rollback-safe. Prove the combined slice.

If the installed engine lacks the required integration, use in-place animation
with a verified layered movement request or stop the root-motion build slice. Do
not bypass Mover.

## Animation handoff

Keep animation as a consumer of canonical movement/presentation facts. Publish:

- local/world velocity and acceleration;
- semantic movement mode, gait, stance, contact, stable-floor, and base-relative
  state;
- desired/actual facing, angular rate, and locomotion policy;
- trajectory/predicted intent where supported;
- action phase needed for presentation, without making it gameplay authority;
- root-motion authorization, warp-target presentation state, and correction or
  teleport events;
- landing and mode-transition facts with deduplication identity.

Animation may select poses, blend, play montages, or provide an authorized root-
motion delta through Mover. It must not select movement modes, spend resources,
change transforms directly, or decide that an action permanently completed.

Use Anim Notifies as presentation signals or redundant timing hints. They can be
filtered or affected by blend/sync behavior, so ability state, simulation state,
or explicit timers/tags must own gameplay lifetime and cleanup.

Motion Matching, Blend Space/state-machine architecture, Pose Search, Control
Rig, IK, orientation/stride warping, and animation accessibility belong to a
separate `animation-system` reference. Do not recreate them here.

Let the camera consume the displayed predicted state after resimulation and
smoothing. Keep camera state outside Mover rollback; feed camera-derived facing
intent into a future command rather than reading the live camera during replay.

## Group actions

Keep group ultimates and synchronized team actions in combat/session orchestration.
The controller receives only per-pawn contracts such as:

- input/locomotion lock with bounded lifetime;
- facing or warp-target policy;
- layered displacement/root-motion authorization;
- typed teleport/placement when required;
- cancellation and disconnect fallback.

Do not freeze transforms, share rollback histories, or coordinate multiple pawns
inside character movement. Test one player disconnecting, correcting, dying, or
losing the target during orchestration.

## Acceptance rules

Accept the combat/animation seam only when:

- every action displacement reaches Mover through one declared representation;
- cancel removes all owned influences, facing locks, and warp targets exactly
  once;
- deleting or filtering every Anim Notify does not leave gameplay stuck;
- correction/resimulation does not double root motion or irreversible effects;
- blocked movement has a declared action result;
- target loss and manual override resolve through the action policy;
- animation and camera can present autonomous and simulated proxies from
  canonical state without reading raw local input;
- group-action orchestration can fail without corrupting individual movement.

## Primary engine anchors

- [Mover features and concepts](https://dev.epicgames.com/documentation/unreal-engine/mover-features-and-concepts-in-unreal-engine)
- [Root Motion](https://dev.epicgames.com/documentation/unreal-engine/root-motion-in-unreal-engine)
- [Motion Warping](https://dev.epicgames.com/documentation/unreal-engine/motion-warping-in-unreal-engine)
- [Animation Notifies](https://dev.epicgames.com/documentation/unreal-engine/animation-notifies-in-unreal-engine)
- [`UMotionWarpingMoverAdapter`](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/Mover/UMotionWarpingMoverAdapter)
