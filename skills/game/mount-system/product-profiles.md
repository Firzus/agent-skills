# Mount product profiles

Use this reference before architecture when the mount fantasy, persistence model,
or scope is not already decided. Product intent changes the correct runtime; it is
not cosmetic flavor applied after implementation.

## Contents

- Profile decision
- `EphemeralUtility`
- `PersistentCompanion`
- `DeepAnimalSimulation`
- Progression and monetization
- Vertical-slice template

## Select, do not blend, a profile

Answer these questions from the game design concept, core loop, and player fantasy:

| Question | Why it changes architecture |
| --- | --- |
| Is travel the content or a utility to reach content? | Determines desired friction, mastery, and interruption cost |
| Is the creature present when not ridden? | Determines durable identity, AI, streaming, save, and recovery |
| Does control friction express animal personality? | Selects direct steering versus mediated agency |
| Can the creature be harmed, lost, fed, bonded, or equipped? | Adds durable mutable instance state and failure recovery |
| Is collecting gameplay capabilities or cosmetic expression? | Separates archetypes, entitlements, skins, and monetization |
| Does flight bypass authored ground content? | Requires world/economy valves and 3D validation |
| Is mounted combat a pillar? | Adds combat graph, targeting, animation, balance, and network scope |
| Are passengers or crew part of co-op? | Changes seats, authority, relevancy, input, and UI contracts |

Record the chosen profile, the player-facing promise, and excluded mechanics. If a
project blends profiles, name the added systems and pay their full persistence,
network, recovery, content, and validation cost.

## `EphemeralUtility`

Choose this profile when the rider remains the hero and the mount is an immediate,
low-friction exploration utility.

### Player-facing contract

- Invoke and mount in one action; idle invocation may begin stationary.
- Keep the rider visible; the creature is distinct, not a transformation.
- Use direct, camera-relative avatar steering with no autonomous refusal by default.
- Preserve movement direction/momentum when invocation occurs while moving.
- Give control immediately; animation and VFX never delay the gameplay commit.
- Dismiss/dissolve the runtime mount after a committed dismount.
- Resume on foot after travel, respawn, reconnect, or map transition.

### Runtime contract

- Spawn an `AMountPawn` only for the active mount session.
- Prefer possession swap when the topology spike proves PlayerState/ASC, camera,
  targeting, and prediction continuity.
- Keep the rider actor attached/suspended rather than replacing player identity.
- Let the mount Mover be the only displacement writer during `Mounted`.
- Keep one rider per player's own mount; no passengers or shared control by default.
- Route damage to the rider; the mount has no health/ASC unless the profile changes.
- Keep friendly characters/mounts nonblocking when co-op design requires free flow;
  never add push, stagger, or contact damage implicitly.

### Default interaction policy

- `MountToggle`: summon-and-mount while eligible; manual dismount while mounted.
- Offensive input: buffer one attack, dismount safely, then consume it exactly once.
- Explicit interaction: buffer one interaction when the target requires an on-foot
  actor; passive pickups may remain available while mounted.
- Normal damage: stay mounted.
- Configured hard CC, downed, death, deep-water transition, or authored force zone:
  force a safe recovery/dismount.
- Combat active: block a new summon; an already-mounted player may flee unless a
  project rule explicitly forces dismount.

### Ground-first movement policy

- Direct facing toward desired movement; turn in place at low speed and smooth
  visual heading at speed without tank controls.
- Sprint is hold/toggle according to accessibility preference; no mount stamina by
  default.
- Derive gait presentation from speed instead of making gait an input mode.
- Support one buffered manual jump with project-tuned coyote tolerance and readable
  air control; no double jump, charged jump, or auto-vault unless scoped.
- Traverse shallow water with explicit slowdown/presentation; transition to rider
  swimming at the configured depth.
- Apply the rider's configured fall consequence and force dismount when required;
  do not add hidden mount fall protection.

### Persistence and content policy

- Persist catalog entitlements and one equipped selection per movement capability.
- Reconstruct runtime from `MountArchetype + MountSkin`; do not save a transient
  actor or create per-copy instance records.
- Unlock gameplay capabilities deterministically through gameplay policy.
- Restrict skins to mesh/material/VFX/audio/saddle/secondary animation within a
  compatible rig family.
- Reject cosmetic changes to collision, speed, stamina, cooldown, access, or power.
- Exclude level, rarity power, equipment, bond, feeding, injury, duplicate rolls,
  paid speed, and paid cooldown unless the product profile is explicitly changed.

### Recommended first vertical slice

- One `GroundMountChassis` and one rig family.
- Two visually distinct skins with identical gameplay data.
- Idle and moving invocation, steering, sprint, jump, fall, shallow/deep water.
- Manual, attack, interaction, hard-CC, zone, travel, death, and failed dismounts.
- Catalog/loadout reconstruction.
- Standalone, listen, dedicated with target co-op size, JIP, reconnect, rollback,
  streaming, collision, and safe-dismount evidence.

Keep Flying, Aquatic, mounted combat, follow AI, health/bond/feeding, passengers,
multiple rig families, and gameplay-affecting monetization out of this slice.

## `PersistentCompanion`

Choose this profile when a known creature exists and matters outside the ride
session.

Add all of the following contracts:

- durable `MountInstanceId` distinct from archetype and skin IDs;
- authoritative world-presence state: stabled, summoned, following, mounted,
  unavailable, recovering, or another project-defined state;
- unmounted AI ownership, navigation footprint, teleport/streaming recovery, and
  distance policy;
- controller/lease transfer between AI and player without two movement writers;
- save migration and conflict policy when the world actor and durable record differ;
- multiplayer ownership, visibility, theft/borrowing, party and disconnect rules;
- recovery when the actor is destroyed, unloaded, blocked, or separated.

Do not add simulated follow behavior merely to make an ephemeral summon look
persistent. Conversely, do not delete and recreate a companion actor without a
defined identity/recovery policy.

Persistent identity does not require bond, feeding, injury, or death. Each is an
independent product decision.

## `DeepAnimalSimulation`

Choose this profile only when animal relationship, care, and mediated control are
core mechanics.

Potential systems include:

- indirect or semi-autonomous steering, road following, fear, trust, and refusal;
- bonding, needs, feeding, grooming, injury, downed/revive, or permanent loss;
- individualized stats, training, equipment, breeding, naming, and ownership;
- environmental reactions and animation coverage across terrain/weather;
- stable management and long-term collection economy.

For each included system, define:

1. player fantasy and decision it creates;
2. durable data and mutation owner;
3. network authority and anti-cheat boundary;
4. failure/recovery policy;
5. content burden and accessibility option;
6. observable completion tests.

Mediated control is valuable only when friction communicates intentional agency.
Unexplained input delay, path snapping, or random refusal is a control defect, not
personality.

## Keep progression and monetization honest

Separate three axes:

| Axis | Examples | Rule |
| --- | --- | --- |
| Gameplay capability | Ground/Flying/Aquatic access, jump, terrain permission | Owned by archetype/progression; disclose and test |
| Durable identity/state | Companion instance, bond, injury, equipment | Exists only in profiles that require individual creatures |
| Cosmetic expression | Mesh, material, VFX, audio, saddle, secondary animation | Must remain within rig/collision/gameplay compatibility |

Prove cosmetic separation with data validation and automated comparison, not a
design statement. If a skin requires a different skeleton, leg count, seat layout,
collision, movement values, or access capability, classify it as a new rig family
or gameplay archetype and validate the expanded scope.

Avoid monetization that sells movement power, stamina, cooldown bypass, terrain
access, or required gameplay capability while claiming skins are cosmetic. The
skill does not choose the business model; it requires mechanics and claims to
match.

## Complete the profile record

```text
Profile:
Player-facing promise:
Journey role: utility | content | mixed
Runtime identity/lifetime:
Control feel and agency:
Movement branches:
Combat/damage:
Co-op/seats:
Persistence/progression:
Monetization constraints:
Explicit exclusions:
First vertical slice:
Evidence needed to change profile:
```

- [ ] Every included mechanic creates a named player decision or expression.
- [ ] Runtime lifetime matches durable identity semantics.
- [ ] Direct versus mediated control is intentional and observable.
- [ ] Progression, durable state, and cosmetics use separate data.
- [ ] The first slice excludes all unneeded branches and systems.
- [ ] A profile change requires a new architecture and validation decision.
