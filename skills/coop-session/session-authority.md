# Session & authority — lifecycle, the host's-world model, topology

The session layer and the authority spectrum. All numbers are **starting
points — tune by playtest**; flagged gaps at the bottom. Replication and
the content matrix are in [replication.md](./replication.md); the wider
netcode landscape in [netcode-models.md](./netcode-models.md); co-op
design/UX in [coop-design.md](./coop-design.md). Primary evidence: the
Grasscutter server reimplementation (the best public window into
Genshin's architecture), the multi-source-verified co-op rules corpus,
the Gambetta replication canon, official Unity/Epic/Valve docs.

## The session lifecycle

### The host's-world model

The "host's world" is a **server-side world instance the host owns**,
never the host's machine. Grasscutter makes the architecture literal: a
`World` object owned by a `Player`; joining is `hostWorld.addPlayer(guest)`
followed by the same EnterScene handshake as solo with a `TeamJoin`
reason (the host receives a `HostFromSingleToMp` — his world flips to MP
mode). Implications: no host latency advantage, no NAT traversal, no
exposed IPs; host disconnect = the instance closes.

**Guests' worlds don't exist while visiting** — the world object is
created/destroyed dynamically (leaving co-op = `new World(player)` at the
previous position with a `TeamBack` reason). Their world state (chests,
respawns, quests) is untouched by construction. (Whether the official
server suspends or destroys is unverified — observably identical.)

This dedicated-instance choice is what lets the skill **avoid host
migration and pause-on-disconnect entirely** — the P2P-world problems
covered in [netcode-models.md](./netcode-models.md). The server is the
resilience mechanism: a dropped player reconnects and re-pulls state.

### Flows

- **Join**: friend list / UID search / online-player list / targeted
  matchmaking; three host permission modes (reject / direct join /
  approval); approval requests expire (~10 s, auto-decline); the guest
  spawns **at the host's position**; joining is allowed anytime, even
  mid-combat (only quest locks block it).
- **Leave/kick**: guests leave freely (back to their own re-created
  world); the host kicks individually; when a player leaves, their
  character slot backfills from the host's original solo party — the
  session reconfigures without interruption.
- **Host leaves** = the session ends: all guests ejected to their own
  worlds. No grace period documented; no session reconnection (a drop
  means a fresh join request). **No host migration** — and that's a
  defensible decision: the graceful-end protocol (warn → let the
  encounter finish → award → close) plus the painless "return home"
  fallback make migration's enormous cost unnecessary. Claimed rewards
  survive because they were committed server-side at claim time.
- **Gates as data**: progression unlock (AR 16 + prologue), the
  world-level rule (a guest can only join worlds of **WL ≤ their own** —
  the strong visit down, never up; the WL 8↔9 free exception; the
  voluntary -1 WL valve with a 24 h lock), same server region,
  cross-platform within it.

### Party composition

The team budget is **always 4 characters**, split by player count:
2P = 2+2, 3P = 2 (host) + 1 + 1 (the owner's privilege), 4P = 1 each.
Duplicates allowed in the overworld, denied in instanced content. Swaps
via party setup out of combat only.

## The authority spectrum

**The most important finding: Genshin's authority is a per-category dial,
not a monolith** (datamined via Grasscutter):

| Category | Authority | Evidence |
| --- | --- | --- |
| Economy, claims, inventory, progression | **server-hard** | all transactions server-side (the progression-economy model) |
| Enemy AI state, spawns, world events | **server-owned** | the server runs the scene loop, entities, Lua triggers |
| Movement | **client-trusted, plausibility-validated** | the client streams positions; the server sanity-checks displacement rates (speedhacks work locally, trigger bans statistically) |
| Combat damage | **client-computed, server-applied** | the client sends `AttackResult` with the damage already computed; the server applies it to HP, decides death, grants drops |

The design lesson: **protect persistence hard, tolerate trust on
ephemera**. A combat cheat in co-op PvE affects one session, never the
economy — that's why client-computed damage is viable here (the combat
engine's full fidelity stays client-side, no server resimulation cost).
The line: PvP or shared stakes → the server computes outcomes from stats
(the pure canon — see the authoritative and lag-comp models in
[netcode-models.md](./netcode-models.md)). Flag: the official server's
validation depth is inference; Grasscutter proves the protocol.

## The three topologies

| Criterion | Dedicated instance (Genshin) | Listen-server | P2P lockstep |
| --- | --- | --- | --- |
| Anti-cheat | central trust | host cheats freely | no referee |
| Host advantage | none | ~0 ms for host | symmetric, slowest-player speed |
| Infra cost | high | ~zero | ~zero |
| Host leaves | graceful close | session dead | survives (by design) |
| NAT/IP | none | punch/relay + exposed | worse at 4+ |
| Fit | persistent economy, cross-platform | friends-only co-op | RTS/fighting |

(Transport-layer detail — relay vs direct vs dedicated, NAT traversal,
middleware — is in [netcode-models.md](./netcode-models.md).)

## Topology & infrastructure

- **Regional dedicated fleets**: one architecture deployed per region
  (4 regions, zero cross-region, account locked to its server;
  cross-platform within a region). One connected solo player = one world
  instance (created at login, destroyed at logout/join) — co-op
  *reduces* active instances.
- **The services layer** is decoupled from game servers: friends,
  presence, UID search, join requests with expiry, world permissions,
  content matchmaking (UGS / EOS / PlayFab equivalents — see
  [netcode-models.md](./netcode-models.md)).
- **The small-team alternative**: listen-server + relay (Unity Relay /
  EOS) accepting the host-advantage and host-leave pitfalls — design
  latency-tolerant and grief-tolerant accordingly.

## Flagged gaps — do NOT invent

The official server tick rate (Grasscutter's 1 Hz logic loop is a
reimplementation artifact, not Genshin's netcode) · official damage-
validation depth (the protocol is proven, the server's checks are
inference) · AFK kick timers · host-disconnect grace periods · exact
join-flow duration (only generic loading screens ~15–30 s) · per-player
session bandwidth (only mobile data ~100–200 MB/h ≈ 28–56 KB/s derived) ·
Genshin replication radii (only UE's 150 m default as an engine
reference) · CCU/server counts · multi-player aggro tables (design
inference) · spawn protection on mid-combat joins (contradictory reports)
· the "relay-based, player hosts" third-party claim (contradicted by
Grasscutter evidence — discarded).

## Sources

Grasscutter source (MultiplayerManager, World.addPlayer, EnterScene
reasons, AttackResult proto, GameEntity.damage, scene Lua loops) ·
Genshin Fandom (Co-Op Mode + scaling tables, Adventure Rank, Domain,
Weekly Boss, Portable Waypoint, UID regions) · HoYoLAB official (v1.4
co-op guide, patch notes, no cross-region) · Game8/GameWith/DiamondLobby
(verified rules) · Gabriel Gambetta (prediction/interpolation canon) ·
Valve Developer Wiki · Unity docs (NGO 2.x, Multiplayer Services) · Epic
docs (CMC, GAS, EOS) · Alibaba Cloud (miHoYo regional architecture) ·
AccelByte/Edgegap (topology trade-offs). Netcode-model sources in
[netcode-models.md](./netcode-models.md).
