# Mount validation

Use this reference to define shippable stage gates and test matrices. Replace
project-specific budgets and party size from product requirements; do not invent
values.

## Contents

- Test layers
- Fixture maps and data
- Lifecycle/transition matrix
- Movement/geometry matrix
- Network/topology matrix
- Streaming/persistence/cosmetic matrix
- Performance and accessibility gates
- Engine-upgrade conformance
- Ship checklist

## Use the right Unreal test layer

| Layer | Best fit |
| --- | --- |
| Low-Level Tests | Pure transition priority, revision/idempotency, candidate ordering, config compatibility |
| Automation/Spec | Eligibility policy, catalog/loadout resolution, serialization/migration adapters, buffered-action logic |
| Functional Tests | Spawn/dismount placement, collision, movement modes, damage/interaction/camera/animation handoffs in test maps |
| Gauntlet/project packaged harness | Multi-client listen/dedicated, JIP/reconnect, adverse network, travel, long soak |
| Data Validation | Archetype/skin/rig family references, bones/sockets, cosmetic separation, asset readiness |

Use project-native equivalents when these layers differ. Keep tests at stable
project contracts rather than private Mover implementation details.

## Build deterministic fixtures

Create small test maps/data covering:

- flat floor, slopes around policy boundaries, step up/down, uneven terrain;
- narrow door, low ceiling, turn pocket, corridor, moving platform if supported;
- safe side/opposite/rear exits and all-local-candidates-blocked recovery;
- shallow/deep water edge, shoreline, fall/landing surfaces;
- `NoSummon`, `ForceDismount`, capability/terrain zones;
- World Partition/streaming boundary and travel destination;
- combat dummy, hard-CC source, damage/downed/death source;
- explicit/passive interaction targets;
- one valid archetype/rig family and at least two compatible skins;
- intentionally invalid data assets for validator tests.

Log stable fixture IDs and expected reasons. Avoid relying only on a production map
whose geometry/content changes independently.

## Cover the lifecycle matrix

Test every request/event from every reachable state, including races:

| State | Required events |
| --- | --- |
| OnFoot | Eligible idle summon, moving summon, every ineligible rider state, combat block, no-summon, bad loadout/assets, no candidate |
| SummonPending | Duplicate/stale request, candidate invalidation, asset failure, travel, death, disconnect |
| Mounting | Possession failure, correction, hard CC, death, travel, actor destruction |
| Mounted | Manual exit, attack, interaction, normal damage, each hard CC, jump/fall, shallow/deep water, force zone, travel, disconnect |
| DismountPending/Dismounting | Candidate becomes blocked, duplicate request, higher-priority death/travel/force event, actor loss |
| Recovering | Valid last-safe, fallback recovery anchor, streaming failure, completion/timeout |

For each cell assert:

- accepted/rejected/superseded outcome code and reason;
- exactly one revision change when committed;
- actor count and stable IDs;
- possession/control lease and one displacement writer;
- rider movement/collision/ASC/targeting state;
- buffered action consumed once or cleared;
- final recoverable state on every peer.

Add sequence/property tests for repeated requests, reordered outcomes, monotonic
revision, and “never two active leases.”

## Cover movement and geometry

For the selected branch, test:

### Ground

- idle, acceleration, braking, reversal, turn-in-place, sustained sprint;
- input magnitude and camera-relative directions;
- slopes, steps, seams, edges, walls, doorway, ceiling, turn footprint;
- jump press/buffer/coyote policy, repeated edge sequence, airborne control;
- safe/threshold/lethal fall outcomes;
- shallow-water movement and deep-water rider handoff;
- moving platform/base motion if supported;
- root/envelope behavior with each compatible skin;
- local and remote correction/proxy/seat smoothing.

### Flying, when scoped

- takeoff/landing/crash, full input envelope, ceiling/no-fly/world bounds;
- hover/stall/boost/resource policy as selected;
- obstacles from all approach directions;
- world streaming/HLOD/content reached from above;
- camera roll/horizon comfort and recovery.

### Aquatic, when scoped

- surface/depth/current/buoyancy/drag controls;
- water-body boundaries, shore/seabed/ceiling collisions;
- enter/exit and invalid shore recovery;
- above/below-water camera and asset/streaming transitions.

Assert collision-resolved outcomes, not exact floating-point transforms unless the
project's deterministic contract supports that assertion.

## Cover topologies and network adversity

Run the lifecycle and selected movement subset across:

| Topology | Roles to observe |
| --- | --- |
| Standalone | Authority/local presentation |
| Listen server | Host plus remote owning client and proxy |
| Dedicated | Server, owning client, simulated proxy |
| Packaged dedicated | Shipping-like modules/configuration and multiple clients |

Use the project's required party size. For a three-player co-op target, test 1, 2,
and 3 players plus simultaneous summon/dismount in constrained space.

Add:

- latency, jitter, packet loss, reorder/duplication supported by the harness;
- rollback/resimulation during jump, collision, summon completion, and dismount;
- JIP in each lifecycle state and during cosmetic async load;
- disconnect/reconnect in each lifecycle state;
- relevancy leave/re-enter, dormancy policy, actor destroy/recreate;
- server travel, fast travel/teleport, map teardown;
- stale/forged entitlement, candidate transform, revision, and action requests.

Required invariants:

- server and all peers converge on session revision/state;
- owning input controls only the leased mount;
- no duplicate actor/action/damage under retry/resimulation;
- correction metrics remain within project budgets;
- reconnect/travel resumes according to the selected profile;
- cosmetic readiness never changes gameplay.

## Validate streaming, persistence, and cosmetics

### Streaming

- summon while cells load/unload and exactly on boundaries;
- invalidate a reserved candidate before spawn;
- unload a referenced world actor/interaction target;
- force dismount when local candidates or last-safe cell are unavailable;
- destroy the mount during replication/relevancy transitions;
- verify no raw unloaded pointer remains in session or save data.

### Persistence

- first unlock and equipped selection;
- missing/deleted/renamed archetype or skin IDs;
- schema migration and corrupted/partial record through the project's save policy;
- service/offline entitlement behavior;
- save/load on foot, during rejected request, and after session cleanup;
- persistent companion instance conflict only when that profile exists.

### Cosmetic equivalence

For every compatible skin, assert:

- same archetype movement/collision/envelope/footprint/config revision;
- same summon/dismount eligibility and outcomes;
- same damage/ability/access/resource behavior;
- valid skeleton, root, seat, IK, gait/phase schema and required assets;
- mesh/pose remains inside validated visual/envelope tolerances;
- JIP/async placeholder resolves without actor/session mutation.

Include invalid skins that attempt to change gameplay or violate rig family; Data
Validation must reject them.

## Define measured budgets

The project supplies targets for:

- server/client mount simulation cost at target player count;
- animation/IK/cloth/VFX cost per LOD and visible mount count;
- memory and async-load latency for chassis/skins;
- replication bandwidth, correction rate/magnitude, relevancy distance;
- summon/dismount response latency and transition timeout;
- collision/query count for root, envelope, candidate, IK, camera;
- streaming hitch/frame-time and actor spawn/destruction churn.

Measure representative worst cases in packaged builds. Averages alone do not catch
simultaneous summon, crowded co-op, streaming, or correction spikes.

Do not copy budgets from another game or leave “performant” as a completion
criterion.

## Validate accessibility and readability

Test with keyboard/mouse and target controllers:

- remapped/conflicting inputs and one-handed layouts;
- sprint hold/toggle and action buffering;
- camera sensitivity/inversion/recenter cancellation;
- reduced shake/lag/FOV change/motion or roll;
- readable refusal and forced-transition reasons using text/icon/audio policy;
- color/contrast and non-audio-only state cues;
- assists enabled/disabled in networked play without authority divergence.

Run comfort playtests for sustained sprint, repeated summon/dismount, tight spaces,
uneven terrain, jump/fall, water transition, and Flying when scoped.

## Gate engine upgrades

Because Mover/Network Prediction APIs are version-sensitive:

1. rerun the capability report after an engine/plugin upgrade;
2. compile and package every target before adapting code from new samples;
3. rerun state serialization/resimulation and possession topology tests;
4. compare collision/mode behavior and correction metrics;
5. rerun dedicated JIP/reconnect/travel and Data Validation;
6. record changed engine facts separately from project policy.

Do not accept a successful editor compile as conformance.

## Ship checklist

### Contract and authority

- [ ] Product profile, exclusions, topology, and movement branches match the game design.
- [ ] Exactly one lifecycle owner, control lease, and displacement writer exist.
- [ ] Input/Sync/Aux/session data is replay/reconstruction-safe and revisioned.
- [ ] Requests are server-validated, idempotent, and return typed outcomes.

### Lifecycle and recovery

- [ ] Summon/mount/dismount/dismiss has explicit commit, cancel, timeout, and recovery.
- [ ] Safe dismount covers side/opposite/rear/last-safe/final recovery anchor.
- [ ] Manual no-exit stays mounted; forced exit always reaches a verified state.
- [ ] Buffered attack/interaction consumes exactly once or clears.
- [ ] Death, actor loss, travel, JIP, and reconnect cannot leave half-mounted state.

### Movement and presentation

- [ ] Selected branch passes its geometry, transition, correction, and feel tests.
- [ ] Root, mounted envelope, and turn/navigation footprint remain distinct.
- [ ] Rider, animation, Motion Warping, camera, and smoothing never write root authority.
- [ ] Seat/IK/gait/phase and accessibility pass for every rig/skin in scope.

### World, co-op, and persistence

- [ ] World gates/candidates are authored facts; lifecycle alone executes transitions.
- [ ] Streaming boundaries and recovery anchors are safe under unload/load races.
- [ ] Party-size collision/ownership/JIP/reconnect policy passes packaged dedicated tests.
- [ ] Runtime actor, catalog, loadout, optional instance, and cosmetics are separate.
- [ ] Cosmetic-equivalence and invalid-data tests pass.

### Evidence

- [ ] Low-Level, Automation/Spec, Functional, packaged/Gauntlet, and Data Validation suites pass as applicable.
- [ ] Adverse-network correction and performance metrics meet project-defined budgets.
- [ ] Debug overlay/logs identify session, revision, lease, writer, collision, candidate, and correction.
- [ ] Engine upgrade capability/conformance evidence is recorded.
