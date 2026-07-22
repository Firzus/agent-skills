# Movement diagnostics

Use this reference to find the first incorrect layer in a Mover/Network Prediction
pipeline. Diagnose before tuning. A visible mesh or camera symptom may be
downstream of an intent, collision, base, or reconciliation error.

## Contents

- [Diagnosis loop](#diagnosis-loop)
- [Reproduction matrix](#reproduction-matrix)
- [Evidence to capture](#evidence-to-capture)
- [Tool ladder](#tool-ladder)
- [Symptom map](#symptom-map)
- [Correction analysis](#correction-analysis)
- [Diagnosis deliverable](#diagnosis-deliverable)

## Diagnosis loop

Follow one direction through the pipeline:

```text
intent producer
  -> captured command
  -> mode / transition
  -> layered move / modifier / instant effect
  -> collision / floor / base / anchor
  -> canonical output state
  -> reconcile / rollback / proxy smoothing
  -> animation / camera presentation
```

1. Reproduce in the smallest topology that still fails.
2. Freeze the engine version, process layout, role, network profile, render rate,
   simulation policy, map, and action sequence.
3. Capture every layer for the same simulation timeframe.
4. Identify the first field that differs from the declared contract.
5. Prove its owner and distinguish source error from downstream presentation.
6. Define the smallest regression guard.
7. Implement only when a fix was requested; then rerun the original and opposite
   server topology plus relevant adverse networking.

Do not start by changing friction, snap, smoothing, replication frequency,
capsule size, or animation blend values.

## Reproduction matrix

Record unavailable cells rather than omitting them.

| Axis | Values to isolate |
| --- | --- |
| Engine | Exact installed build/source revision and plugin capabilities |
| Process | Editor single-process, standalone process, multi-process listen, dedicated server + clients |
| Role | Authority, autonomous proxy, simulated proxy, server-authored AI |
| Network | Baseline, latency, jitter, loss, reordering/duplication when supported |
| Rates | Simulation tick policy, render rates, frame spikes |
| Mode | Ground, fall, climb, glide, surface swim, underwater, project extension |
| Influence | Manual only, modifier, layered move, root motion, moving base, teleport |
| World | Flat, slope, stairs, edge, seam, water boundary, anchor, translating/rotating base |
| Lifecycle | Entry, steady state, loss, cancel, correction, join-in-progress, reconnect |

Prefer a repeatable input script or recorded semantic command sequence over a
manual reproduction. Do not claim bitwise determinism; require a stable scenario
and comparable semantic outcomes.

## Evidence to capture

Correlate records with simulation timeframe, actor/network identity, role, mode,
and request/action sequence ID.

### Command and state

- captured movement direction/magnitude and resolved facing basis;
- buffered request timestamp/context and consume/decay decision;
- Input/Sync/Aux semantic fields and configuration revision;
- client/server authority and reconciliation decision;
- rollback start/end/depth and whether the frame is resimulating.

### Movement execution

- active mode before/after, candidate transitions, evaluation order, rejection
  reason, and fallback;
- layered moves/modifiers/instant effects with owner, priority/mix, lifetime,
  handle, and cancellation;
- proposed versus collision-resolved displacement and velocity;
- sweep hit, contact, stable-floor decision, normal, penetration, step/slope/perch
  result;
- base identity, relative transform, linear/angular contribution, validity;
- active traversal anchor/surface frame/volume and lease revision/remainder.

### Networking and presentation

- authoritative, predicted, corrected, and displayed transforms/velocities;
- correction count, distance/angle, cause timeframe, and repeated pattern;
- simulated-proxy interpolation samples and mode transitions;
- root-motion/warp target state before and after correction;
- canonical presentation state consumed by animation/camera;
- deduplicated versus repeated simulation events.

If the project lacks these facts, add observability before proposing a root cause.

## Tool ladder

Use the least expensive tool that can expose the missing layer, then escalate.
Verify availability in the installed engine.

1. Project semantic logs/counters for commands, modes, influences, outcomes, and
   corrections.
2. Mover Gameplay Debugger categories, `LogMover`, trail/trajectory/correction
   visualization, and the installed Mover debug component.
3. Visual Logger for correlated world/state events where project instrumentation
   supports it.
4. Network Prediction traces/Insights for timelines, rollback, reconciliation,
   and proxy behavior.
5. Chaos Visual Debugger only when collision/physics evidence requires it; do
   not infer a ChaosMover backend from tool usage.
6. Unreal Insights for game-thread, simulation, network, and performance spans.
7. Multi-process/Gauntlet reproduction for topology and process-isolation bugs.

Capture a short failing window with known IDs. Large unfiltered logs obscure the
first divergence.

## Symptom map

Use this table to choose the first evidence, not to skip diagnosis.

| Symptom | First facts to compare | Common contract violation |
| --- | --- | --- |
| Jitter on slopes/stairs | Stable-floor decision, floor normal, snap/step result, correction | Treating any hit as floor; alternating floor/base facts |
| Sticking on seams/edges | Sweep hits, depenetration, stable floor, slide result | Parallel transform writer; unbounded/oscillating depenetration; stale floor |
| Falling from a valid ledge | Perch/support test and transition order | Edge policy differs across client/server or render-dependent query |
| Slope exploit | Walkability, input projection, modifier/action mix | Multiple acceleration/displacement paths or missing speed envelope |
| Moving-platform drift | Base ID, relative state, update order, inherited velocity, correction | Base state missing from replay or base invalidation not handled |
| Snap after base destruction | Base validity and fallback transition | Dangling base identity or missing detach outcome |
| Swim/climb oscillation | Volume/contact frame, hysteresis, transition order | Raw noisy boundary drives mode every frame |
| Buffered jump/climb misfires | Capture/consume timeframe and required context | Request not revalidated or one-shot flag merged/decayed incorrectly |
| Stamina differs after correction | Lease revision/budget, resim usage, confirmed commits | Live GAS read, duplicated commit, or resource state absent from replay |
| Dash/lunge continues after cancel | Owner handle, cancel frame, lifetime, finish velocity | Cleanup tied only to Notify or incomplete handle ownership |
| Root motion doubles/snaps | Animation delta, Mover influence, capsule/mesh transforms | Animation and movement both apply displacement |
| Warp reaches invalid target | Target revision, snapshot/tracked policy, block result | Motion Warping treated as target validation |
| Teleport embeds/falls/returns | Streaming ready proof, request flags, encroachment, floor/base reset, fallback | Raw transform write or incomplete teleport postconditions |
| Autonomous correction storm | First differing Input/Sync/Aux field and transition | Live external read, authority mismatch, bad reconcile rule |
| Simulated proxy stutters | Server samples, interpolation mode, canonical presentation | Animation reads raw input or proxy smoothing changes modes |
| Only low/high FPS fails | Fixed-tick count, input merge, buffer decay, side effects | Render delta used inside simulation or input accumulated incorrectly |
| AI behaves unlike player | Semantic intent and mode outcomes | Separate movement implementation or client-only camera/input dependency |
| Co-op pawns block/pop | Pawn collision policy and same-space outcomes | Blocking/overlap behavior was never specified or server/client disagree |

## Focused investigations

### Stable-floor and collision faults

Reproduce on a minimal collision map before testing detailed art. Compare the
same sweep/contact/floor decision on authority and autonomous proxy. Verify that
all motion, including base following and root motion, uses the declared Mover
collision path. Treat animation jitter as downstream until capsule/canonical
state is stable.

### Mode deadlock or oscillation

Log every transition candidate in evaluation order with its precondition and
rejection reason. Verify each active mode revalidates its own prerequisites and
has a falling/ground/water fallback. Check that mode changes are queued/applied
on the simulation frame expected by the installed Mover version.

### Moving-base faults

Start with a single translating base, then add rotation and network correction.
Compare base identity, relative transform, angular contribution, tick dependency,
and detach velocity. A correct world transform can still hide an incorrect
relative-base state that fails on the next frame.

When the fault appears only with a temporary action, capture the verified order of
base contribution, action-influence mixing, collision resolution, detach, and
velocity inheritance on the same simulation frame. Treat that order as an explicit
installed-version/project contract; do not infer it from registration timing.

### Traversal-lease faults

Log authorization revision, initial budget, per-frame simulated consumption,
resimulated consumption, and confirmed external commits. The resource authority
and Mover remainder must reconcile without treating a replay as new gameplay.

### Action/root-motion faults

Disable the presentation mesh or replace the animation with an in-place clip.
If the capsule still fails, diagnose the action request/Mover layer. If the
capsule is correct but the mesh diverges, diagnose root-motion handoff,
presentation state, or AnimBP. Remove all Notifies to prove gameplay cleanup is
not Notify-owned.

### Teleport faults

Trace destination preparation and physical application separately. Prove the
world system reported readiness, the server accepted the destination, the Mover
effect ran once, preservation flags matched the request, stale contact/base data
was invalidated, and one fallback produced a valid final state.

## Correction analysis

Do not treat correction count alone as the cause. For the first recurring
correction:

1. Match client and server by simulation timeframe and request ID.
2. Compare captured commands before state.
3. Compare transition candidate/order and active mode.
4. Compare external authorization copied into replay state.
5. Compare layered influences and cancellation.
6. Compare collision, floor, base, anchor, and volume results.
7. Compare canonical output and reconcile decision.
8. Only then inspect smoothing and animation.

Group corrections by first differing field and scenario. A periodic pattern may
indicate tick/input merge; boundary clusters may indicate contact/transition;
action clusters may indicate uncaptured target, lease, or root-motion state.

## Diagnosis deliverable

Return:

```text
Symptom and impact
Stable reproduction matrix
Expected contract
First incorrect timeframe and field
Owning module
Evidence and eliminated alternatives
Root cause or explicitly labelled hypothesis
Smallest corrective direction
Regression guard and affected validation matrix
Remaining evidence gaps
```

A diagnosis-only task is complete only when the first wrong state and owner are
proven. If the required capture is unavailable, return an incomplete evidence-gap
report naming the exact capture required. Do not present a list of generic
possible causes as a completed diagnosis.

## Primary engine anchors

- [Mover debugging reference](https://dev.epicgames.com/documentation/en-us/unreal-engine/mover-debugging-reference-for-unreal-engine)
- [Networked-game testing and debugging](https://dev.epicgames.com/documentation/en-us/unreal-engine/testing-and-debugging-networked-games-in-unreal-engine)
- [Using network emulation](https://dev.epicgames.com/documentation/unreal-engine/using-network-emulation-in-unreal-engine)
- [Unreal Insights](https://dev.epicgames.com/documentation/unreal-engine/unreal-insights-in-unreal-engine)
