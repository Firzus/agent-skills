---
name: unity-multiplayer
description: >-
  Use when adding or reviewing networking in a Unity game: choosing between
  Unity Netcode (GhostObjects or entities) and Netcode for GameObjects, the
  authority model, host modes, sessions, matchmaking, relay, dedicated server
  builds, or testing several peers with Multiplayer Play Mode.
---

# Multiplayer: netcode, authority, sessions, dedicated server

Load the [`unity-core`](../unity-core/SKILL.md) skill with this one: its default
stack and review pass apply here.

Networking is decided before gameplay code exists: the netcode stack, the
authority model, and the client/server split shape prediction, state ownership,
and the build pipeline. Retrofitting any of the three is a rewrite.

For engine-agnostic replication theory and drop-in co-op session design, use the
`coop-session` skill. For server-authoritative persistence, use
`save-persistence` and `inventory-equipment`.

## The stack

| Concern | Package |
| --- | --- |
| Netcode | `com.unity.netcode` (Unity Netcode) |
| Sessions, Lobby, Relay, Matchmaker | `com.unity.services.multiplayer` |
| Server builds | `com.unity.dedicated-server` |
| Multi-peer testing | `com.unity.multiplayer.playmode` |

The netcode is **Unity Netcode** with GhostObjects. Leave it only in these
situations:

| Situation | Netcode |
| --- | --- |
| Gameplay already on ECS, or ghost counts where per-object cost dominates | Unity Netcode, entity workflow, mixed with GhostObjects |
| Distributed authority | Netcode for GameObjects |

**Unity Netcode** carries an entity workflow and a GameObject workflow in one
package. Its namespaces and types are spelled `Netcode`
(`using Unity.Netcode;`), while its assemblies are named `Unity.NetCode*` in
asmdef references.

**GhostObjects** are its GameObject workflow. A GhostObject component on the
prefab root makes a GameObject networked. Gameplay goes in `GhostBehaviour`
scripts (`PredictionUpdate`, `PredictionGatherInput`,
`PredictionPhysicsUpdate`), replicated state in `GhostField<T>`, input in
`GhostInput<T>`, one-off events in RPCs or custom messages, and session start in
the static `Netcode` class (`Listen`, `Connect`, `StartAsHost`). Only the
transform, and the Rigidbody on predicting clients, replicate on their own: a
value that no `GhostField<T>` or `GhostComponentRef<T>` declares never reaches
clients.

**The entity workflow** costs less per object: each GhostObject syncs its
transform with its ghost entity every frame and runs its `GhostBehaviour`
methods in managed code that Burst cannot compile. Both workflows share one
replication pipeline and mix in one world, so keep most objects as GhostObjects
and move the mass ones (mobs, projectiles) to entity ghosts, or put their hot
data in a `GhostComponentRef<T>` that a Burst system processes.

**Netcode for GameObjects** (`com.unity.netcode.gameobjects`, NGO:
`NetworkBehaviour`, `NetworkVariable`, and RPCs) installs Unity Netcode,
Entities, Burst, and Collections as dependencies. Its time types (`NetworkTime`,
`NetworkTimeSystem`, `NetworkTickSystem`) live in
`Unity.Netcode.GameObjects.Timing`, and its Editor assemblies are
`Unity.Netcode.GameObjects.Editor*`.

## Authority

**Client-server** is the default: the server owns simulation and is the source
of truth for anything exploitable (position validation, damage, inventory,
economy), while clients predict and render. Unity Netcode supports no other
model: every ghost belongs to the server, dedicated or run by a host player,
and a client's write to a predicted value is a prediction the server
overwrites.

In a `GhostBehaviour`, guard server-only decisions such as spawning or scoring
with `IsServer`, and writes to predicted state with `CanWriteState` (true on the
server and on predicting clients). Keep `PredictionUpdate` identical on server
and clients: branching there on `IsServer` makes them run different code and
mispredict. A host is both server and client, so write the two cases as
independent `if` statements; an `if (IsServer) {...} else {...}` never runs
the client branch on a host.

A Unity Netcode host runs in **single-world host mode** by default: one world
for client and server, cheaper for the host, but without prediction switching,
partial ticks, or relevancy on the host connection. **Binary-worlds host mode**
runs the dedicated server's code paths on the host; choose it when a dedicated
server build may follow.

**Distributed authority** exists only in NGO, so choosing it also chooses the
netcode package. It spreads `NetworkObject` ownership across clients through a
relay: owners simulate their own objects, ownership transfers or redistributes
automatically, and object state survives a client leaving. One client is the
session owner, handling global operations such as network scene management. It
fits drop-in co-op, social spaces, and sandboxes without a simulation server.
Competitive games stay client-server, where centralised anti-cheat,
server-authoritative physics, and rollback live.

Under distributed authority, gate authoritative logic on
`NetworkBehaviour.HasAuthority`, which reads `true` on the owning client.
`IsServer` answers a different question and silently does the wrong thing
there.

Validate client input and rate-limit state changes under either model: a client
owning an object still means a client controls what it reports.

Setup for distributed authority: Netcode for GameObjects with no GhostObject on
its network prefabs (a prefab carrying both a NetworkObject and a GhostObject
makes the session fail to start), `com.unity.services.multiplayer`, a Unity
Cloud project, and a session created `WithDistributedAuthorityNetwork()`.

## Sessions and services

**Multiplayer Services** consolidates Lobby, Relay, and Matchmaker into one SDK
with a higher-level `sessions` API, which is why connection flows go through it
rather than the individual services or hand-rolled sockets.

- Matchmaker supports CEL OR-operator pools and filters, config history with diffs, dashboard log access, and third-party hosting hooks.
- Cloud Code has an experimental stateful mode with a local server for per-player and per-session state, which prototypes persistence before dedicated servers exist.
- Build session UI on **Unity Building Blocks**.
- Host dedicated servers with a third-party provider, connected through the Matchmaker's hosting hooks.

**Multiplayer Center** (`Window → Multiplayer → Multiplayer Center`) scaffolds
packages, samples, and tutorials from a questionnaire. It is a pre-release
package, and Unity's own docs advise backing up the project before installing its
recommendations, since they can conflict with multiplayer packages already
present. Point it at new projects; wire an existing codebase by hand.

## Server builds

Use the **Dedicated Server** platform with **Multiplayer Roles**
(Edit → Project Settings → Multiplayer) to produce Client, Server, and
Client-and-Server builds from one project. Roles strip rendering, UI, and audio
from server builds automatically, which is what keeps headless builds small and
cheap to run.

Drive server builds through Build Profiles with per-role scene lists and
scripting defines, and run them in CI like any other target — see
[workflow.md](../unity-core/workflow.md).

## Testing

**Multiplayer Play Mode** runs multiple virtual players in
one Editor, so host-and-client behaviour is testable without several Editor
installs or standalone builds. Its capabilities live largely in the Play Mode
Framework and the engine's Multiplayer modules. Each developer's local player
run mode is stored per developer, not in the shared scenario asset.

With Unity Netcode, the **PlayMode Tools** window
(`Window → Multiplayer → PlayMode Tools`) sets whether entering Play mode
creates a client world, a server world, or both; in a Multiplayer Play Mode
scenario, set this PlayMode Type in each player's window. When
`com.unity.dedicated-server` is installed, the player's Multiplayer Role
overrides it. Test as a host and as a dedicated server, since a host takes both
`IsServer` and `IsClient` branches.

With `com.unity.pipeline` installed, Unity Netcode registers `unity command`
groups under `netcode` that inspect worlds, connections, and ghosts, compare a
ghost's state on the server and clients, control the network simulator, and
record prediction traces; NGO registers `netcode.gameobjects` groups. Run them
as [unity-cli](../unity-cli/SKILL.md) describes.
