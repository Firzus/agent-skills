# Mount architecture

Use this reference to define runtime ownership, control topology, authority,
simulation state, and collision before implementing a mount.

## Contents

- Domain language
- Runtime modules
- Control topology
- Authority and state allocation
- Collision contract
- Capability gate
- Architecture completion record

## Use one domain language

| Term | Meaning |
| --- | --- |
| Mount archetype | Gameplay definition: movement branch, chassis, collision, seats, and allowed capabilities |
| Mount skin | Presentation-only selection compatible with an archetype/rig family |
| Mount session | Revisioned runtime relationship between one rider and one mount actor |
| Rider | The player's existing character actor; it does not become a new character while mounted |
| Mount pawn | Rideable runtime actor that owns mount movement for the active session |
| Control lease | Exclusive authority to translate one player's input into one displacement writer |
| Seat binding | Presentation and query relationship that keeps the rider aligned to the mount |
| World candidate | Typed, scored, trace-backed location supplied by world/traversal queries |
| Movement branch | Ground, Flying, or Aquatic simulation contract |
| Swept root | The single simple collision primitive moved by the solver |
| Mounted envelope | Query-only clearance volume covering mount plus rider |
| Turn footprint | Space needed to rotate/steer without clipping; not necessarily the swept root |

Avoid overloaded terms such as `mounted`, which might mean lifecycle state, an
attached mesh, or controller possession. Name the fact: `LifecycleState`,
`SeatBindingState`, or `ControlLeaseOwner`.

## Assign runtime modules

Use project naming conventions, but preserve these responsibilities:

| Module | Responsibility | Stable host |
| --- | --- | --- |
| Mount session authority | Validate requests, increment revision, own lifecycle and control lease | A connection-stable replicated owner such as PlayerState or a controller-owned component |
| Mount pawn | Mover simulation, swept root, movement branch, mount presentation source | Spawned/persistent Pawn depending on profile |
| Rider adapter | Suspend/resume on-foot movement and collision; expose seat/placement hooks | Player character |
| Mount catalog | Resolve archetypes, rig families, skins, and compatibility | Asset Manager-backed project service |
| World query adapter | Request typed summon/dismount candidates and authored gate facts | Traversal/world layer |
| Gameplay adapter | Ask combat, interaction, damage, and status systems for eligibility/outcomes | Existing gameplay layer |
| Presentation adapters | Camera, animation, audio, VFX, UI, accessibility | Local/client presentation systems |

Recommended Unreal-shaped types are illustrative, not mandatory API:

```text
AMountPawn
  + simple swept root
  + UMoverComponent
  + UMountMovementSet
  + UMountPresentationComponent

UMountSessionComponent       // stable replicated lifecycle owner
UMountRiderComponent         // suspend/resume and seat contract
UMountCatalogSubsystem       // asset resolution, no session authority
UMountArchetype              // gameplay Primary Data Asset
UMountSkin                   // cosmetic Primary Data Asset
UMountRigFamily              // skeleton/seat/gait compatibility
```

Do not put the authoritative lifecycle only on a transient mount actor. Its
destruction must not erase the evidence needed to recover, reconnect, or reject a
stale request.

## Select one control topology

| Topology | Use when | Strength | Primary risk |
| --- | --- | --- | --- |
| Possession swap | Mount is a distinct Pawn with independent predicted movement | Clear movement ownership and input routing | Rider identity/ASC/camera continuity across possession |
| Retained rider possession | Existing character must remain the possessed Pawn | Stable player Pawn and ability ownership | Hidden dual writers and indirect mount prediction |
| AI-to-player lease | Persistent companion is AI-controlled while unmounted | Natural companion world presence | Controller transfer races and AI recovery |
| Same-actor mode swap | The player actor changes locomotion form | Simple identity continuity | This is a transformation; route it to traversal rather than representing it as a mount |

For possession swap:

```text
OnFoot
  PlayerController -> RiderPawn

Mounted
  PlayerController -> MountPawn -> Mount Mover -> world transform
                         |
                         +-- SeatBinding -> RiderPawn (suspended)

Stable identity and ASC remain on PlayerState when the project uses that model.
```

For retained possession, require an explicit adapter that converts rider-owned
commands into mount Input state. The rider's on-foot solver must be suspended and
must not write transforms. Do not accept "both components are mostly disabled" as
proof of exclusive authority.

### Run a topology spike

Prove the chosen topology in standalone, listen server, and dedicated server with:

- one summon, mount, move, correction, dismount, and repossession cycle;
- the rider's ASC/abilities/attributes, camera, input, and targeting preserved;
- server rejection of a duplicate or stale request;
- one late-joining observer reconstructing the same session;
- a forced actor destruction recovering to a valid on-foot state;
- instrumentation showing exactly one displacement writer.

Select a topology from evidence. Keep another topology as a named fallback only if
the spike exposes a concrete engine/project blocker.

## Allocate authority and reconstruction

| Fact | Writer | Replication/reconstruction |
| --- | --- | --- |
| Entitlement and equipped mount IDs | Authoritative progression/persistence service | Durable data; validated by server |
| Lifecycle state, revision, request outcome | Server mount session authority | Replicated session snapshot |
| Control lease owner | Server mount session authority | Replicated; predicted client may anticipate only reversible presentation |
| Local movement intent | Owning client or AI adapter | `FMountInputCmd`, validated and predicted |
| Collision-resolved transform/velocity | Mount Mover simulation with server authority | Mover/Network Prediction state and corrections |
| World gate and candidate validity | World/traversal query, revalidated by server | Candidate ID plus trace evidence or recomputation |
| Safe dismount placement | Server lifecycle using character placement contract | Typed outcome and final transform |
| Selected cosmetic ID | Server-validated loadout | Replicated ID; assets load locally |
| Seat, gait, VFX, audio, camera smoothing | Client presentation | Reconstructed from session and movement state |

Never replicate a mesh choice as proof of entitlement. Replicate a validated stable
ID and resolve presentation through the catalog.

## Separate Input, Sync, Aux, and session state

Names differ across Mover versions. Preserve the semantic allocation:

### Input state

Store player/AI intent needed for one predicted frame:

- desired movement vector already expressed in a stable simulation frame;
- desired facing policy or heading;
- sprint intent;
- jump edge/sequence;
- branch-specific actions that participate in movement simulation.

Do not sample the live camera during resimulation. Convert camera-relative input to
a stable vector before filling the input command.

### Sync state

Store facts required to continue deterministic movement:

- transform, velocity, active movement branch/mode;
- grounded/medium state and movement-mode transition state;
- gait/speed band when it changes simulation rather than presentation;
- any jump/fall state needed for rollback.

### Aux state

Store low-frequency simulation configuration needed during replay:

- archetype/config revision;
- validated movement parameters;
- collision/medium policy inputs that cannot be derived from Sync state.

Do not copy mutable gameplay objects, AnimBP state, or live asset objects into
predicted state. Prefer stable IDs and immutable/revisioned configuration.

### Session snapshot

Keep lifecycle outside movement state but reconstructable alongside it:

```cpp
struct FMountSessionState
{
    FGuid SessionId;
    uint32 Revision;
    EMountLifecycleState LifecycleState;
    FNetworkGUID RiderId;
    FNetworkGUID MountId;
    FName ArchetypeId;
    FName SkinId;
    EMountControlTopology Topology;
    FNetworkGUID ControlLeaseOwner;
    FMountOutcome LastOutcome;
};
```

Adapt field types to project conventions. The required property is stable identity
plus monotonic revision, not this exact C++ representation.

## Enforce the collision contract

Use three explicit shapes/data sets:

1. **Swept root** — one simple primitive moved by Mover; blocks authoritative
   world collision.
2. **Mounted envelope** — query-only rider-plus-mount clearance used for summon,
   doors, ceilings, transition validation, and optional camera planning.
3. **Navigation/turn footprint** — planning data for AI, authored restrictions,
   path width, and turn feasibility.

Keep skeletal Physics Assets and attached rider colliders out of authoritative
locomotion sweeps. Configure the suspended rider's collision channels explicitly;
do not disable the whole actor and accidentally disable damage, interaction, or
query semantics.

Record who blocks whom:

| Pair | Required project policy |
| --- | --- |
| Mount ↔ world | Blocking channels and step/slope contract |
| Mount ↔ enemy | On-foot-equivalent block, overlap, or ignore; contact damage separate |
| Mount ↔ friendly player/mount | Blocking or nonblocking; never leave implicit |
| Rider ↔ world while seated | Usually query/overlap only; root mount owns displacement |
| Mounted envelope ↔ doorway/ceiling | Query result and refusal/transition policy |

## Pass the capability gate

Before version-sensitive implementation, record:

- exact engine version and source/binary build;
- enabled Mover and Network Prediction plugins/modules;
- available sample/reference implementations and installed headers;
- supported updated-component/root shapes for the intended movement set;
- rollback/resimulation hooks and state registration APIs;
- possession, relevancy, dormancy, and packaged dedicated-server behavior;
- compatibility of avoidance, nav, root motion, and World Partition assumptions.

`[Version-sensitive]` Do not assume the default Mover movement set supports a
quadruped footprint or nonstandard capsule orientation. Build a mount-specific set
or stop for a capability spike. Verify APIs against installed source; do not copy a
signature from a different engine release.

## Complete the architecture record

- [ ] Product profile and exclusions are named.
- [ ] Stable lifecycle owner survives mount actor destruction/possession changes.
- [ ] Control topology passed the three-topology spike.
- [ ] Every mount-affecting fact has one writer and authority.
- [ ] Input/Sync/Aux/session allocations are replay/reconstruction-safe.
- [ ] Swept root, mounted envelope, and turn footprint are distinct.
- [ ] Rider collision and suspension preserve gameplay queries.
- [ ] All version-sensitive capabilities have evidence or a named blocker.
- [ ] Transformation and mechanical-vehicle requests are routed out.
