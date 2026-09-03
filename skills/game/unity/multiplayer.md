# Multiplayer — netcode, authority, sessions, dedicated server

Networking is decided before gameplay code exists: the netcode stack, the
authority model, and the client/server split shape prediction, state ownership,
and the build pipeline. Retrofitting any of the three is a rewrite.

For engine-agnostic replication theory and drop-in co-op session design, use the
`coop-session` skill. For server-authoritative persistence, use
`save-persistence` and `inventory-equipment`.

## The stack

| Concern | Package |
| --- | --- |
| Netcode | `com.unity.netcode.gameobjects` |
| Sessions, Lobby, Relay, Matchmaker | `com.unity.services.multiplayer` |
| Server builds | `com.unity.dedicated-server` |
| Multi-peer testing | `com.unity.multiplayer.playmode` |

**Netcode for GameObjects** is the default: `NetworkBehaviour`, `NetworkVariable`,
and RPCs over GameObjects. **Netcode for Entities** (`com.unity.netcode`)
is the supported step off that row, for DOTS-scale simulation — many networked
entities with prediction at scale. It pairs with the ECS core packages, and a
project takes it only when already built on ECS. The two stacks do not
interoperate, so this is a per-project choice.

## Authority

**Client-server** is the default: the server owns simulation and is the source of
truth for anything exploitable — position validation, damage, inventory,
economy — while clients predict and render.

Gate authoritative logic on `NetworkBehaviour.HasAuthority`. It reads `true` on
the server or host in client-server, and `true` on the owning client under
distributed authority, so one property covers both topologies and the code
survives a topology change. `IsServer` answers a different question and silently
does the wrong thing under distributed authority.

**Distributed authority** spreads `NetworkObject`
ownership across clients through a relay: owners simulate their own objects,
ownership transfers or redistributes automatically, and object state survives a
client leaving. One client is the session owner, handling global operations such
as network scene management. It fits drop-in co-op, social spaces, and sandboxes
without a simulation server. Competitive games stay client-server, where
centralised anti-cheat, server-authoritative physics, and rollback live.

Validate client input and rate-limit state changes under either model — a client
owning an object still means a client controls what it reports.

Setup for distributed authority: Netcode for GameObjects,
`com.unity.services.multiplayer`,
a Unity Cloud project, and a session created `WithDistributedAuthorityNetwork()`.

## Sessions and services

**Multiplayer Services** consolidates Lobby, Relay, and Matchmaker into one SDK
with a higher-level `sessions` API, which is why connection flows go through it
rather than the individual services or hand-rolled sockets.

- Matchmaker (6.4) supports CEL OR-operator pools and filters, config history with diffs, dashboard log access, and third-party hosting hooks.
- Cloud Code gained an experimental stateful mode with a local server (6.5) for per-player and per-session state, which prototypes persistence before dedicated servers exist.
- Build session UI on **Unity Building Blocks**. Multiplayer Widgets was deprecated in 6.3.
- Plan hosting on the current Multiplayer Services or third-party path: Multiplay Hosting as configured pre-6.3 was removed from the Editor and runtime when the service sunset.

**Multiplayer Center** (`Window → Multiplayer → Multiplayer Center`) scaffolds
packages, samples, and tutorials from a questionnaire. It is still pre-1.0, and
Unity's own docs advise backing up the project before installing its
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
[workflow.md](./workflow.md).

## Testing

**Multiplayer Play Mode** runs multiple virtual players in
one Editor, so host-and-client behaviour is testable without several Editor
installs or standalone builds. Its capabilities now live largely in the Play Mode
Framework and the engine's Multiplayer modules.
