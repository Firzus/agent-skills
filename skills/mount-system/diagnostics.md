# Mount diagnostics

Use this reference when a mount jitters, desynchronizes, spawns twice, traps the
rider, exits unsafely, breaks after streaming/JIP/reconnect, or shows a presentation
symptom whose owner is unclear.

Diagnose before tuning. Do not implement a fix unless the request authorizes it.

## Contents

- Reproduction ladder
- Required instrumentation
- Debug order
- Symptom matrix
- Root-cause proof
- Regression evidence

## Reproduce in the smallest failing topology

Record:

```text
Engine/build and plugin revisions
Map/test cell and assets
Standalone | listen | dedicated | packaged
Server, owning client, simulated proxy, JIP/reconnect role
Player count and simultaneous actions
Latency/jitter/loss/reorder settings
Exact lifecycle/input sequence
Expected state/outcome
First visible divergence
Reproduction rate and seed, if deterministic
```

Use this ladder:

1. standalone without streaming;
2. listen server with one remote client;
3. dedicated server with one client;
4. dedicated with observer/target party size;
5. JIP and reconnect;
6. adverse network;
7. streaming boundary and packaged build.

Stop at the first topology that reproduces. Compare it with the immediately simpler
passing topology. Do not begin with a crowded production map unless the defect
requires it.

## Add one correlated debug view

Expose a mount debug overlay and structured log sharing session/request/frame IDs.

### Identity and authority

- durable player ID, rider Actor/NetGUID, mount Actor/NetGUID;
- local role, remote role, owner, owning connection, relevancy/dormancy;
- archetype, skin, rig family, movement branch and config revision.

### Lifecycle

- session ID, monotonic revision, state and state-enter simulation time;
- current/recent request IDs, expected/applied revisions, outcomes/reasons;
- reservation/candidate ID, control lease owner, possession controller/Pawn;
- buffered action ID/type/target/expiry/consumed revision;
- last validated rider placement and recovery anchor.

### Movement and collision

- Mover mode and Input/Sync/Aux summaries;
- input sequence, desired direction/speed, resolved velocity/transform;
- grounded/medium/slope/surface and jump/fall state;
- correction count, magnitude, source frame, reason;
- every authoritative root writer per frame;
- swept root, mounted envelope, turn footprint, floor/surface traces;
- summon/dismount candidates with rejection reasons.

### Presentation and streaming

- rider attachment/seat local and world offsets;
- gait/phase, AnimBP state, montage/warp target, IK error;
- camera target/anchor and smoothing layer;
- world cell/level, gameplay asset readiness, cosmetic asset readiness.

Capture server and affected clients over the same simulation-frame window. A client
video without authoritative state is not enough for a network root cause.

## Diagnose in ownership order

1. **Lifecycle/identity** — Do all peers agree on session, revision, actors, and
   outcome? Was a duplicate/stale request handled idempotently?
2. **Control/authority** — Does the expected controller own the expected Pawn and
   connection? Is exactly one control lease active?
3. **Displacement writers** — Does only mount Mover write the root? Is the rider
   solver truly suspended?
4. **Replay state** — Do Input/Sync/Aux/config revisions match at the first corrected
   frame? Does resimulation read live camera/gameplay/animation state?
5. **Collision/world query** — Did root/envelope/candidate facts differ? Was a
   streamed cell or blocking actor missing on one peer?
6. **Relevancy/assets** — Did stable IDs/session arrive before actors or cosmetic
   resolution? Was an actor dormant/destroyed too early?
7. **Seat/animation/camera** — Only after the authoritative root/session agree,
   inspect downstream smoothing and pose.
8. **Feel tuning** — Adjust acceleration, turn, gait, camera, or smoothing only when
   the system is correct and the remaining issue is perceptual.

This order prevents a seat offset or camera symptom from hiding a possession,
correction, or dual-writer defect.

## Use the symptom matrix

| Symptom | Inspect first | Common first cause | Owner/corrective direction | Minimum regression test |
| --- | --- | --- | --- | --- |
| Two mounts from one input | Request ID/revision/outcome cache | Duplicate RPC/input edge or non-idempotent retry | Lifecycle: sequence input and cache outcome | Duplicate same request across packet retry creates one actor |
| Client stuck in `Mounting` | Server outcome and replicated revision | Outcome lost/not reconstructed or presentation used as commit | Lifecycle/session snapshot | Drop/reorder transition packets; state converges |
| Dedicated client cannot steer | Possession, owner connection, input producer | RPC routed through old rider or lease committed too early | Control topology | Possess/move/dismount on packaged dedicated |
| Owning mount rubber-bands | Writer log, Input/Sync/Aux/config | Second transform writer or non-replayable camera/GAS state | Mover/authority | Adverse-network loop has bounded corrections |
| Remote mount jitters but root agrees | Root vs mesh/seat transforms | Proxy, seat, or camera smoothing layered incorrectly | Presentation | Root trace stays smooth; mesh uses one smoothing layer |
| Rider slowly drifts off seat | Seat local offset and attachment writers | Two seat alignment systems or animated root feedback | Rider/animation | Long sprint/turn/slope run keeps bounded seat error |
| Doorway traps mounted player | Root vs mounted envelope/turn footprint | Root passes while rider envelope/turn cannot | Collision/world | Door/ceiling/turn test rejects or passes consistently |
| Manual dismount clips wall | Candidate order and character placement result | Mount root used instead of on-foot shape/clearance | Lifecycle + character controller | Side blocked -> opposite/rear/last-safe cascade |
| Forced dismount teleports into void | Last-safe/recovery anchor validity | No total recovery chain or streamed-out candidate | Lifecycle/world | Force exit with all local candidates blocked recovers safely |
| Mount disappears before rider placed | Commit timestamps and actor destroy | Destruction tied to animation/dismiss request | Lifecycle | Interrupt dismount; mount survives until placement commit |
| Attack fires twice after exit | Action ID/consumed revision/input sequence | Duplicate outcome or both contexts consumed input | Combat/input handoff | Correction + repeated request consumes exactly once |
| Damage ignored while mounted | Rider collision/query/ASC identity | Rider actor disabled wholesale or instigator changed | Rider/combat handoff | Damage/normal hit/hard CC/downed matrix while mounted |
| JIP sees wrong/invisible skin | Stable IDs, actor relevancy, async assets | Mesh state used as authority or asset readiness race | Session/catalog/presentation | JIP before/after cosmetic load reconstructs same gameplay state |
| Reconnect leaves ghost mount | Stable session owner and actor destruction outcome | Lifecycle stored only on transient Pawn | Session authority | Disconnect each state; reconnect on-foot or profile-defined state |
| Summon fails at cell boundary | Candidate world revision/cell readiness | Raw pointer/unloaded provider or stale reservation | World/streaming | Repeat summon during load/unload with typed retry/refusal |
| One skin moves/fits differently | Archetype/skin data diff and bounds | Cosmetic overrides gameplay or violates rig family | Catalog/Data Validation | Two-skin equivalence suite rejects mismatch |
| Hooves slide but speed is correct | Resolved speed, gait/phase, stride | Animation mapping/phase/stride, not movement | Animation presentation | Same movement trace; gait/phase visual test |
| Camera snaps on possession | Camera anchor/view target timeline | Pawn cast/default camera reset during handoff | Camera adapter | Mount/dismount preserves control rotation/settings |
| Cliff behavior feels autonomous | Desired vs resolved direction and world hits | Hidden auto-steer/avoidance/edge-stop | Movement/product policy | Direct-control test shows only collision/authored overrides |

Do not apply every listed correction. Prove which fact diverges first in the actual
project.

## Prove the root cause

A diagnosis is complete only when it contains:

1. deterministic or bounded reproduction;
2. passing/failing topology comparison;
3. first divergent fact and its authoritative owner;
4. causal chain from divergence to visible symptom;
5. evidence that competing hypotheses do not explain the first divergence;
6. smallest regression test at the owner boundary;
7. scope of affected profiles, branches, assets, and engine versions.

Example structure:

```text
Symptom:
First divergence:
Owner/authority:
Evidence:
Causal chain:
Rejected hypotheses:
Regression test:
Fix scope (only if requested):
```

“Increasing smoothing fixes it” is not a root cause when the authoritative root
still corrects. “The montage is late” is not a root cause when lifecycle incorrectly
waits on a notify.

## Preserve evidence while fixing

When a fix is authorized:

- add the regression test before or with the smallest owner-level change;
- retain request/session/writer diagnostics in development builds;
- avoid compensating in downstream camera/animation for upstream state defects;
- rerun the adjacent transition and topology cells, not only the reproduction;
- compare correction and performance metrics before/after;
- document any changed product policy or version-specific assumption.

## Complete diagnosis

- [ ] Smallest failing topology and nearest passing topology are recorded.
- [ ] Server/client logs correlate session, request, revision, and simulation frame.
- [ ] First divergent fact precedes the visible symptom.
- [ ] Exactly one owner/authority is responsible for that fact.
- [ ] Collision, streaming, and presentation are ruled in/out with evidence.
- [ ] A minimum regression test fails before the fix and passes after it.
- [ ] No feel tuning is presented as a network/lifecycle correction.
