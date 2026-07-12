---
name: mount-system
description: >-
  Architecture and implementation workflow for player-controlled animal and
  creature mount systems in Unreal Engine. Design, build, refactor, or diagnose
  summon and dismiss, mount and safe-dismount transactions, possession and rider
  binding, Mover-based ground/flying/aquatic locomotion, collision, animation,
  camera, combat, replication, join-in-progress, reconnect, persistence, and
  cosmetic separation. Use for unsafe dismounts, competing displacement writers,
  mount correction storms, lifecycle desync, or gameplay-affecting skins. Route
  player transformations, generic traversal verbs, and mechanical multi-crew
  vehicles to their dedicated systems.
---

# Mount System

Design a predictable rideable-creature runtime, not a speed modifier attached to
the player. Keep the public contract reusable: select a product profile explicitly
instead of treating one game's mount fantasy as an engine best practice.

Use an Unreal-first, Mover-first, dedicated-server-capable architecture. Treat the
installed engine version and enabled plugins as evidence: Mover and Network
Prediction APIs are version-sensitive and must pass a capability gate before code
depends on them.

## Route the request

| Branch | Trigger | Required result |
| --- | --- | --- |
| `design` | Product role, architecture, migration, topology, spec, or review | A decision-complete mount contract and validation matrix |
| `build` | New implementation, refactor, or vertical slice | Working scoped slice plus test evidence |
| `diagnose` | Jitter, desync, unsafe exit, bad collision, duplicate spawn, or broken handoff | Reproduction, first divergent fact, root cause, and regression test |

For combined work, run `diagnose → design → build`. Do not implement a fix when
the request only asks for diagnosis or review.

## Preserve the ownership boundary

| Owner | Owns | Does not own |
| --- | --- | --- |
| `mount-system` | Runtime mount actor, lifecycle, control lease, rider binding, mount-specific movement, summon/dismiss, replicated session | Generic on-foot solver, world authoring, combat rules, durable player identity |
| `character-controller` | Rider suspend/resume contract, on-foot collision and safe placement, generic movement invariants | Mount lifecycle or mount gait policy |
| `traversal-system` | World affordances, terrain/capability tags, `NoSummon`/`ForceDismount` facts, candidate discovery | Possession, spawning, movement, or lifecycle execution |
| `combat-system` / GAS | Combat eligibility, targeting, attacks, costs, damage, hard-CC semantics | Movement authority or dismount placement |
| Camera system | Camera rigs, blending, collision, comfort settings | Mount state authority |
| Animation system | AnimBP, Motion Warping presentation, Sync Markers, IK, assets | Gameplay commits or displacement authority |
| Persistence/progression | Entitlements, unlock policy, catalog ownership | Transient mount actor state |
| Session/party | Player identity, reconnect policy, party membership | Mount movement simulation |

Mechanical vehicles, suspension/tire physics, buoyancy craft, multi-seat control,
and distributed crew roles belong in a future `vehicle-system`. A player becoming
the locomotion form belongs in `traversal-system` as a traversal form, not here.

## Enforce the non-negotiable invariants

- Name the selected product profile and its exclusions.
- Prove the installed Mover/Network Prediction capability before using an API;
  never invent a silent Character Movement Component fallback.
- Allow exactly one authoritative displacement writer during `Mounted`.
- Make the server authoritative for lifecycle and durable outcomes; make requests
  idempotent and revisioned.
- Keep predicted input and simulation state replay-safe. Do not read live camera,
  mutable GAS state, raw device state, or animation state during resimulation.
- Give the mount one simple swept root primitive. Treat rider collision envelopes,
  navigation/turn footprints, and presentation meshes as separate concerns.
- Never let an attached rider participate implicitly in the mount sweep.
- Commit gameplay transitions from the lifecycle state machine or simulation time,
  never from an Anim Notify.
- Separate transient runtime actors from durable catalog/loadout data.
- Model Ground, Flying, and Aquatic as distinct movement contracts, not booleans on
  one universal mode.
- Make every failure explicit through a typed outcome and observable reason.

## Establish the mount brief

Inspect project evidence before asking questions: engine version, enabled plugins,
Pawn/PlayerState/ASC ownership, existing movement stack, target topologies, World
Partition, save model, and adjacent skill contracts. Reuse decisions already
present in the project.

Resolve only the decisions that change architecture:

1. Product role: travel utility, persistent companion, or deep animal simulation.
2. Identity: distinct rideable actor or player transformation.
3. Runtime lifetime: session-only summon or persistent world actor.
4. Control topology: possession swap, retained rider possession, or another proven
   lease model.
5. Movement branches: Ground first; Flying/Aquatic only when independently scoped.
6. Control feel: direct avatar steering or deliberately mediated animal agency.
7. Collision: swept root, rider envelope, turn footprint, and world restrictions.
8. Lifecycle: eligibility, summon, mount, manual/forced dismount, dismiss, recovery.
9. Combat/damage: mounted combat, buffered exit actions, damage and hard-CC policy.
10. Co-op: ownership, seats, friendly collision, join-in-progress, reconnect.
11. Persistence: catalog, instances, loadout, unlocks, cosmetics, travel behavior.
12. Presentation: seat alignment, gait/phase, camera, targeting, accessibility.

Ask one targeted question only when missing evidence would select a materially
different contract. Record unresolved values as `[Unknown]`, not as defaults.

## Select a product profile

Read [product-profiles.md](./product-profiles.md) whenever product fantasy or
scope is undecided.

| Profile | Core promise | Architectural consequence |
| --- | --- | --- |
| `EphemeralUtility` | Immediate summoned travel utility; rider remains the hero | Session-only mount actor, direct steering, catalog/loadout persistence |
| `PersistentCompanion` | A known creature exists beyond a ride session | Durable identity, world presence, AI and recovery policy |
| `DeepAnimalSimulation` | Relationship and animal agency are part of play | Mediated control, needs/bond/injury systems, much larger validation surface |

Do not silently blend profiles. A project may extend one profile, but must name the
new durable data, authority, failure cases, and tests introduced by the extension.

## Preserve the data flow

```text
device / AI
  -> Mount Intent
  -> gameplay + traversal authorization
  -> FMountRequest / FMountInputCmd
  -> authoritative lifecycle + control lease
  -> mount Mover simulation
  -> collision-resolved Mount Outcome
  -> revisioned FMountSessionState
  -> rider / camera / animation presentation
```

Keep `FMountRequest`, `FMountOutcome`, `FMountSessionState`, `FMountInputCmd`, and
`FMountWorldCandidate` typed. Define their minimum fields and ownership in
[architecture.md](./architecture.md) and [lifecycle.md](./lifecycle.md).

## Execute the design branch

1. Read [architecture.md](./architecture.md),
   [product-profiles.md](./product-profiles.md), and
   [lifecycle.md](./lifecycle.md).
2. Load only the movement, handoff, world, and validation references needed by the
   selected scope.
3. Produce:
   - selected profile and explicit exclusions;
   - ownership and authority matrix;
   - lifecycle/transition matrix with priority, cancellation, and recovery;
   - control topology and lease transfer;
   - Input/Sync/Aux/reconstruction allocation;
   - root collision, mounted envelope, and navigation/turn footprint;
   - typed requests, outcomes, session snapshot, and world candidates;
   - movement-branch contracts;
   - rider, world, combat, camera, persistence, and session handoffs;
   - capability risks, spikes, and validation matrix.

The design is complete only when every mount-affecting fact has exactly one owner,
one authority, one replay/reconstruction representation, an explicit failure
outcome, and an observable test. An unproven engine capability remains a spike or
blocker.

## Execute the build branch

1. Pass the capability gate in [mover-build.md](./mover-build.md).
2. Prove the selected control topology and collision contract on a dedicated
   server before building presentation depth.
3. Implement the smallest end-to-end lifecycle and one movement branch.
4. Integrate rider, combat, world, persistence, and accessibility handoffs.
5. Add the topology and transition suites from
   [validation.md](./validation.md).

Test project-facing contracts, not accidental private details of Mover. The slice
is complete only when it converges in standalone, listen, and dedicated topologies;
survives rollback, join-in-progress, reconnect, duplicate and stale requests; has
no competing transform writer; and passes the selected movement/transition matrix.

## Execute the diagnose branch

Read [diagnostics.md](./diagnostics.md). Reproduce in the smallest topology that
still fails, then capture on the same frames:

- runtime and durable IDs, roles, owner, and owning connection;
- lifecycle state/revision, request ID, outcome, and control lease;
- Mover mode plus Input/Sync/Aux state;
- root collision, mounted envelope, world candidate, and safe-exit probes;
- correction count/magnitude, seat offset, gait/animation phase;
- streaming state and required asset readiness.

Locate the first divergent fact or first concurrent writer. State the proven cause
and smallest regression test before suggesting tuning. A downstream mesh, camera,
or animation symptom is not proof of a movement cause.

## Build in four shippable tiers

### Tier 1 — Contract and lifecycle graybox

- [ ] Capability report records engine/plugin/API evidence and blockers.
- [ ] Product profile, topology, ownership, authority, and state allocation are explicit.
- [ ] Server-authoritative summon/mount/dismount/dismiss completes with typed outcomes.
- [ ] One swept root primitive and safe placement are debug-visible.

### Tier 2 — One complete movement branch

- [ ] Ground movement owns displacement and passes slope, step, wall, door, jump, fall, and water-edge cases.
- [ ] Input, Sync, and Aux state resimulate without live presentation dependencies.
- [ ] Rider binding, gait/phase publication, camera continuity, and collision envelopes remain coherent.

### Tier 3 — Gameplay and world integration

- [ ] Attack, interaction, damage, hard CC, world gates, travel, and streaming transitions have deterministic outcomes.
- [ ] Durable catalog/loadout data reconstructs runtime state without saving the transient actor.
- [ ] Co-op ownership, friendly collision, join-in-progress, reconnect, and accessibility contracts pass.

### Tier 4 — Production evidence

- [ ] Standalone, listen, dedicated, packaged, adverse-network, and streaming suites pass.
- [ ] Data Validation rejects incompatible archetypes/skins and missing assets.
- [ ] Debug overlays and structured lifecycle outcomes identify the first failing owner.
- [ ] Speed, acceleration, turn, camera, and network budgets are project-defined and measured.

## Reference map

| Read | When |
| --- | --- |
| [architecture.md](./architecture.md) | Define ownership, topology, authority, replay state, collision, and domain types |
| [product-profiles.md](./product-profiles.md) | Choose the mount fantasy, durable identity, progression, and vertical-slice exclusions |
| [lifecycle.md](./lifecycle.md) | Specify requests, state transitions, idempotency, safe dismount, travel, and recovery |
| [mover-build.md](./mover-build.md) | Implement or review Mover/Network Prediction capability gates, state, modes, and collision |
| [movement-branches.md](./movement-branches.md) | Design Ground, Flying, Aquatic, gaits, jump/fall, and medium transitions |
| [rider-handoffs.md](./rider-handoffs.md) | Integrate rider controller, animation, camera, targeting, combat, damage, and accessibility |
| [world-persistence.md](./world-persistence.md) | Integrate world gates, summon candidates, World Partition, co-op, catalog, loadout, and cosmetics |
| [diagnostics.md](./diagnostics.md) | Investigate lifecycle, correction, collision, dismount, streaming, JIP, or presentation failures |
| [validation.md](./validation.md) | Plan stage gates and standalone/listen/dedicated/package/network test matrices |

## Label evidence and stop cleanly

Use `[Engine fact]`, `[Version-sensitive]`, `[Project policy]`,
`[Recommendation]`, and `[Unknown]` in design records. Verify version-sensitive
claims against the installed engine source, headers, samples, or official Epic
documentation.

Stop with a concrete blocker when a required capability is absent, selected
topology cannot preserve ownership/prediction, two transform writers are imposed,
simulation depends on non-replayable live state, required topologies cannot be
tested, or the request is actually a physics-driven mechanical vehicle. Do not
invent a fallback to keep the document moving.
