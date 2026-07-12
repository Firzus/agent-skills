# World, co-op, and persistence integration

Use this reference to connect the mount runtime to authored world facts, summon and
dismount candidates, World Partition, catalog/loadout persistence, cosmetics, and
co-op policy.

## Contents

- World ownership boundary
- Typed candidates and gates
- Summon/streaming pipeline
- World restrictions and reachability
- Co-op ownership/collision
- Catalog, loadout, instances, and save
- Cosmetic separation
- Integration completion record

## Keep world facts outside mount lifecycle

`traversal-system` owns authored facts and candidate discovery. `mount-system`
consumes those facts, revalidates them on the server, and executes lifecycle and
movement.

```text
World markup / volumes / surface probes / streaming state
  -> FMountWorldCandidate + capability/gate facts
  -> mount eligibility and authoritative validation
  -> lifecycle request outcome
```

World volumes must not spawn, possess, attach, dismount, or destroy mounts directly.
They publish facts/events through a typed interface. The mount lifecycle decides
priority, placement, revision, and recovery.

## Define typed world candidates

Adapt the structure to project conventions:

```cpp
struct FMountWorldCandidate
{
    FGuid CandidateId;
    FTransform Transform;
    FVector_NetQuantizeNormal SurfaceNormal;
    FName MediumId;
    FGameplayTagContainer TerrainAndAccessTags;
    FName SourceProviderId;
    FName WorldCellOrLevelId;
    uint32 WorldValidationRevision;
    EMountCandidatePurpose Purpose; // Summon, Dismount, Landing, Shore, Recovery
    float Score;
};
```

Candidate discovery may be client-assisted for responsiveness, but the server
recomputes or verifies authoritative facts. Never trust a client transform, score,
surface, or access tag.

### Validate candidates by purpose

| Purpose | Required checks |
| --- | --- |
| Summon | Swept root, mounted envelope, floor/slope/medium, branch permission, streaming/assets, distance/visibility policy |
| Manual dismount | On-foot shape, floor/slope, headroom, blocking actors, path/transfer, world gate, target context |
| Forced recovery | Total recovery chain, authoritative anchor, loaded destination, no half-mounted state |
| Flying landing | Approach volume, surface/clearance, branch transition, world permission |
| Aquatic shore | Depth gradient, on-foot/ground shape, current, collision, streaming |

Navmesh may contribute a fact for AI/pathable companions; it is never sufficient
proof for a player-controlled summon or safe rider placement.

## Separate `NoSummon` and `ForceDismount`

Use distinct semantics:

- `Mount.NoSummon`: reject creation of a new mount session at this location/state.
  It does not eject an already-mounted player.
- `Mount.ForceDismount`: request a high-priority safe transition before entering or
  continuing through a restricted region.

Add branch-specific facts only when needed, for example no-fly, no-dive, landing,
shore, or required capability tags. Tags describe access; they never execute a
transition.

Author critical interiors, dungeons, boss arenas, cinematics, or topology-breaking
regions explicitly. Let ordinary doors, ceilings, and narrow paths rely on the
mount collision/envelope contract when that produces readable behavior. Do not
cover poor collision with a blanket no-mount volume.

Every refusal/forced transition returns a stable reason suitable for UI, telemetry,
and tests. The server is authoritative.

## Build a streaming-safe summon pipeline

1. Resolve the player's server-validated equipped archetype and skin IDs.
2. Ask world/traversal providers for candidates near the rider and movement intent.
3. Filter by gate, capability, medium, root/envelope, and world-cell readiness.
4. Score deterministically; record provider and rejection reasons in debug builds.
5. Reserve the selected candidate/session revision.
6. Load/resolve authoritative gameplay data through Asset Manager/project catalog.
7. Spawn the mount server-side only in a loaded, valid world context.
8. Initialize Mover/collision before acquiring control.
9. Replicate stable gameplay/cosmetic IDs; clients resolve presentation assets.
10. Commit `Mounted` or roll back the entire transaction with a typed outcome.

Gameplay data required for collision and movement must be server-ready before
spawn. Cosmetic async load may complete later using a compatible placeholder, but
cannot change collision, movement, eligibility, or session identity.

### Handle World Partition boundaries

- Associate candidates/recovery anchors with a stable world/cell identity.
- Revalidate after async load or world revision changes.
- Prevent teardown/unload while an authoritative transition still depends on a
  candidate, or cancel/recover before unload.
- Test summon/dismount exactly on cell boundaries and during rapid streaming.
- Do not keep raw pointers to unloaded actors in session, candidate, or save data.
- Use soft/stable IDs and project streaming handles according to existing policy.

## Protect world design from movement capabilities

For each capability, traversal/world design records:

- regions and content that it may bypass;
- terrain/volume tags and readable cues;
- landing/shore/summon/dismount affordances;
- quest/cinematic/encounter assumptions;
- streaming/HLOD/nav/content reachable from new directions;
- progression valve and behavior when capability is unavailable.

`mount-system` owns how a mount moves. `traversal-system` owns where the world
permits/communicates that capability and the economy/access valves that prevent it
from trivializing content.

Never solve a world-progression problem with a hidden movement clamp. Publish an
authored, debuggable restriction and player-facing reason.

## Define co-op ownership and collision

Record policy for each pair and action:

| Concern | Required decision |
| --- | --- |
| Who may invoke | Own mount only, party mount, shared world mount, or theft/borrowing rules |
| Riders/seats | One rider, passengers, seat authority, seat changes |
| Friendly player/mount collision | Block, overlap, soft presentation avoidance, push/stagger/contact damage |
| Enemy collision | Block/overlap channels and equivalence to on-foot hero |
| Contact damage | Explicit combat ability or absent; never inferred from speed |
| Simultaneous summon space | Candidate reservation and overlap/race policy |
| JIP/reconnect | Session reconstruction or on-foot recovery |
| Relevancy | Owner, party, observers, distance, streaming, dormancy |

### Ephemeral utility co-op baseline

- Each player invokes and controls their own mount.
- One rider per mount; no passenger or multi-seat control.
- A player cannot mount another player's ephemeral mount.
- Friendly characters and mounts are nonblocking and cause no push, stagger, or
  contact damage.
- World/obstacles block.
- Enemies use the project's on-foot-equivalent collision policy.
- Mount movement causes no contact damage.
- Optional soft avoidance may affect remote presentation only; it must not override
  local direct input or authoritative displacement.
- The session must work for the project's full party size, including simultaneous
  summon/dismount, JIP, and reconnect.

If passengers, shared mounts, or multi-crew control are desired, stop and scope a
new seat/control topology. Multi-crew mechanical vehicles belong in
`vehicle-system`.

## Separate catalog, loadout, and instance data

Use only the layers the selected profile needs:

```text
MountArchetype (gameplay definition)
  Movement capabilities
  Chassis/RigFamily
  Collision/envelope/footprint
  Allowed skins

MountSkin (cosmetic definition)
  Compatible RigFamily/Archetypes
  Mesh/material/VFX/audio/saddle/secondary animation

MountCatalogEntitlement (durable player access)
  Archetype/capability/skin IDs and source

MountLoadout (durable selection)
  Equipped archetype/skin per capability

MountInstanceRecord (optional)
  Only for persistent individualized creatures
```

For `EphemeralUtility`, omit `MountInstanceRecord`. Runtime is reconstructed from
validated archetype plus skin; duplicates, random rolls, names, stats, bond, injury,
and equipment do not exist unless another profile is selected.

For `PersistentCompanion`, instance data needs a stable ID, schema version, world
presence/recovery state, ownership, and conflict resolution. Do not serialize the
runtime Actor graph as the durable domain model.

### Assign durable owners

| Fact | Typical durable owner |
| --- | --- |
| Gameplay capability unlock | Progression/account save/service |
| Skin entitlement | Inventory/catalog/account service |
| Equipped selection | Player loadout save/service |
| Individual companion state | Mount instance repository for persistent profiles only |
| Active session | Runtime replicated lifecycle; never durable save authority |

Follow the project's `save-persistence` contract for schema, migration, atomicity,
cloud conflict, and corruption recovery. This skill defines mount domain facts, not
a second save framework.

## Enforce cosmetic separation

A skin may change only approved presentation data within its rig family:

- skeletal/static mesh and materials;
- VFX/audio;
- saddle/tack and cosmetic attachments;
- secondary animation and bounded pose offsets.

A skin must not change:

- root collision, mounted envelope, turn footprint;
- speed, acceleration, turn, jump, fall, stamina, cooldown;
- movement branch or terrain/world access;
- health, damage, abilities, targeting, aggro, interaction range;
- seat count, rider authority, or network priority.

Automate validation:

1. resolve archetype and rig family;
2. verify skin compatibility and required bones/assets;
3. compare/reject gameplay fields on cosmetic assets;
4. instantiate two skins in the same movement/lifecycle test;
5. assert identical gameplay configuration and outcomes;
6. measure bounds/pose against the same collision/envelope tolerances.

If visual scale cannot fit the same gameplay envelope, it is not a valid skin for
that rig family.

## Define unlock and monetization policy

This skill does not choose a business model. It requires the implemented data and
player-facing claim to agree.

- Keep gameplay capabilities/unlocks distinct from cosmetic entitlements.
- Make deterministic gameplay unlocks explicit when required by the design.
- Do not hide paid speed, stamina, cooldown, terrain access, or power in a skin.
- Test server validation so an unentitled client cannot request an archetype/skin.
- Record offline/service-unavailable behavior and never grant permanent entitlement
  from a transient runtime actor.

## Complete world/persistence integration

- [ ] Traversal/world publishes facts and candidates; only mount lifecycle executes transitions.
- [ ] `NoSummon` and `ForceDismount` have distinct server-authoritative semantics.
- [ ] Candidate validation covers root, envelope, rider placement, medium, and streaming.
- [ ] World Partition unload cannot orphan a transition or raw pointer.
- [ ] Every movement capability has authored access/readability/progression valves.
- [ ] Co-op ownership, seats, collision, contact damage, JIP, and reconnect are explicit.
- [ ] Catalog, loadout, optional instances, and runtime sessions are separate.
- [ ] Cosmetic data cannot mutate gameplay fields and is automatically validated.
- [ ] Travel/reconnect reconstructs the selected profile without half-mounted save state.
