# Architecture — session, authority, replication, content rules, topology

The components of a production drop-in co-op system. All numbers are
**starting points — tune by playtest**; flagged gaps at the bottom.
Primary evidence: the Grasscutter server reimplementation (the best
public window into Genshin's architecture), the multi-source-verified
co-op rules wiki corpus, the Gambetta replication canon, official
Unity/Epic/Valve docs.

## The session lifecycle

### The host's-world model

The "host's world" is a **server-side world instance the host owns**,
never the host's machine. Grasscutter makes the architecture literal:
a `World` object owned by a `Player`; joining is
`hostWorld.addPlayer(guest)` followed by the same EnterScene
handshake as solo with a `TeamJoin` reason (the host receives a
`HostFromSingleToMp` — his world flips to MP mode). Implications: no
host latency advantage, no NAT traversal, no exposed IPs; host
disconnect = the instance closes.

**Guests' worlds don't exist while visiting** — the world object is
created/destroyed dynamically (leaving co-op = `new World(player)` at
the previous position with a `TeamBack` reason). Their world state
(chests, respawns, quests) is untouched by construction. (Whether the
official server suspends or destroys is unverified — observably
identical.)

### Flows

- **Join**: friend list / UID search / online-player list / targeted
  matchmaking; three host permission modes (reject / direct join /
  approval); approval requests expire (~10 s, auto-decline); the
  guest spawns **at the host's position**; joining is allowed
  anytime, even mid-combat (only quest locks block it).
- **Leave/kick**: guests leave freely (back to their own re-created
  world); the host kicks individually; when a player leaves, their
  character slot backfills from the host's original solo party — the
  session reconfigures without interruption.
- **Host leaves** = the session ends: all guests ejected to their own
  worlds. No grace period documented; no session reconnection (a
  drop means a fresh join request). **No host migration** — and
  that's a defensible decision: the graceful-end protocol
  (warn → let the encounter finish → award → close) plus the
  painless "return home" fallback make migration's enormous cost
  unnecessary. Claimed rewards survive because they were committed
  server-side at claim time.
- **Gates as data**: progression unlock (AR 16 + prologue), the
  world-level rule (a guest can only join worlds of **WL ≤ their
  own** — the strong visit down, never up; the WL 8↔9 free
  exception; the voluntary -1 WL valve with a 24 h lock), same
  server region, cross-platform within it.

### Party composition

The team budget is **always 4 characters**, split by player count:
2P = 2+2, 3P = 2 (host) + 1 + 1 (the owner's privilege), 4P = 1 each.
Duplicates allowed in the overworld, denied in instanced content.
Swaps via party setup out of combat only.

## The authority spectrum

**The most important finding: Genshin's authority is a per-category
dial, not a monolith** (datamined via Grasscutter):

| Category | Authority | Evidence |
| --- | --- | --- |
| Economy, claims, inventory, progression | **server-hard** | all transactions server-side (the progression-economy model) |
| Enemy AI state, spawns, world events | **server-owned** | the server runs the scene loop, entities, Lua triggers |
| Movement | **client-trusted, plausibility-validated** | the client streams positions; the server sanity-checks displacement rates (speedhacks work locally, trigger bans statistically) |
| Combat damage | **client-computed, server-applied** | the client sends `AttackResult` with the damage already computed; the server applies it to HP, decides death, grants drops |

The design lesson: **protect persistence hard, tolerate trust on
ephemera**. A combat cheat in co-op PvE affects one session, never
the economy — that's why client-computed damage is viable here (the
combat engine's full fidelity stays client-side, no server
resimulation cost). The line: PvP or shared stakes → the server
computes outcomes from stats (the pure canon). Flag: the official
server's validation depth is inference; Grasscutter proves the
protocol.

### The three topologies

| Criterion | Dedicated instance (Genshin) | Listen-server | P2P lockstep |
| --- | --- | --- | --- |
| Anti-cheat | central trust | host cheats freely | no referee |
| Host advantage | none | ~0 ms for host | symmetric, slowest-player speed |
| Infra cost | high | ~zero | ~zero |
| Host leaves | graceful close | session dead | survives (by design) |
| NAT/IP | none | punch/relay + exposed | worse at 4+ |
| Fit | persistent economy, cross-platform | friends-only co-op | RTS/fighting |

## Replication (architecture level)

- **The local player**: predict inputs immediately; the server
  returns authoritative state + last processed input; the client
  replays unacknowledged inputs (reconciliation), smoothed — never
  snapped.
- **Remote players**: interpolate between the last two snapshots —
  rendered **~100–200 ms in the past** (the Valve reference: 100 ms
  buffer = 2 snapshots at 20/s, survives one lost packet). "The
  local player lives in the present; everyone else lives in the
  past."
- **Abilities**: client requests + cosmetic prediction; the server
  validates (cooldown, cost) and broadcasts; mispredicted cosmetics
  roll back as a block (the GAS prediction-key shape).
- **Relevance** serves two purposes at 4 players: less bandwidth,
  but mostly **bounding server simulation** — only zones near
  players are active (the Grasscutter block/group spawning).
  Hysteresis at boundaries; degressive update rates by distance;
  quantized transforms.
- **Enemies**: AI is **server-owned** (a client never decides an AI
  state change); threat extends per-player (`enemy-ai-framework`);
  scaling by player count is **HP-only** — the shipped lesson:
  150/200/250% HP for 2/3/4P with ATK flat at 100% (the original
  110/125/140% ATK multipliers were removed to cut co-op
  difficulty); shield gauges scale ×1.5/1.7/2; drops are never
  multiplied (they're instanced).
- **Late join**: one **full world-state snapshot at entry** — opened
  chests, dead enemies, weather, the host's clock — read from the
  world-state store (the `quest-system`/`save-persistence` single
  source), then deltas. The Grasscutter join cascade
  (`PlayerEnterSceneNotify` + entity-appear notifies) is exactly
  snapshot-at-entry, never a replayed event history.

## The content rules matrix

The matrix is **data per content type**, and it IS the anti-grief —
interaction authority belongs to the world owner:

| Content | Rule |
| --- | --- |
| Chests, collectibles, investigation, monuments, Seelies, domain doors, time-of-day, statue offerings | **host-only** |
| Enemy drops, ore (most) | **instanced per player** |
| Energy-gated claims (ley lines, bosses, weeklies, domains) | **per-player**: each pays their own resin for their own reward; the boss respawns after the **last** claim; costs identical to solo |
| Plants, local specialties | **shared** (first-come — the only residual grief surface, covered by social norms) |
| Wood, fishing spots | shared-harvestable by all |
| Daily commissions | progressable in the host's world (with exceptions) |
| Player gadgets | usable but not deployable (no portable waypoints in others' worlds) |
| Trading | **nonexistent** — total economy isolation between accounts |

- **Quests**: host-only progression (guests advance nothing of their
  own); story content **disables co-op entirely** (the world is
  quest-manipulated); world-quest dialogues/cutscenes are
  **host-only presentation** — guests keep playing and see the
  host's avatar frozen; never teleported, never captured
  (`dialogue-system`/`cinematic-system`: per-player presentation is
  the rule; global freezes/timeScale are forbidden in session).
- **Matchmaking** is content-scoped (the domain Match button), never
  open-world; guests can enter domains they haven't unlocked if the
  host has.
- **Latency-tolerant combat by design** (inference, flagged): PvE
  only, no cross-player frame-perfect mechanics, generous hitboxes,
  attacker-side damage — what makes interpolation delays invisible.

## Topology & infrastructure

- **Regional dedicated fleets**: one architecture deployed per
  region (4 regions, zero cross-region, account locked to its
  server; cross-platform within a region). One connected solo player
  = one world instance (created at login, destroyed at
  logout/join) — co-op *reduces* active instances.
- **The services layer** is decoupled from game servers: friends,
  presence, UID search, join requests with expiry, world
  permissions, content matchmaking (UGS / EOS / PlayFab
  equivalents).
- **The small-team alternative**: listen-server + relay (Unity
  Relay / EOS) accepting the host-advantage and host-leave pitfalls
  — design latency-tolerant and grief-tolerant accordingly.

## Engine notes (beyond the SKILL.md table)

- **Unity**: NGO 2.x is the Unity 6 line (1.x unsupported from
  6000.3); its anticipation API is visual anticipation +
  manual reconciliation, not input rollback. Netcode for Entities
  1.x ships real prediction/interpolation/server-rewind
  (16–32-tick physics history) — production-ready, ECS paradigm.
  The Multiplayer Services SDK unifies Lobby+Relay+Matchmaker as
  "Sessions" (`CreateOrJoinSessionAsync` handles lobby + relay
  allocation + netcode connection). **Distributed authority is
  officially discouraged where cheat resistance matters** — Unity's
  own docs say it "relies on the assumption that each game instance
  can be trusted".
- **UE5**: the replication stack + CMC prediction is the strongest
  default for 4-player co-op; GAS prediction keys for abilities
  (cosmetic prediction, server outcomes); Iris is beta (5.7, off by
  default, no seamless travel) and Replication Graph targets
  100-player scale — both unnecessary here; EOS gives free
  cross-platform sessions; **no host migration exists** (EOS
  migrates lobbies only).

## Flagged gaps — do NOT invent

The official server tick rate (Grasscutter's 1 Hz logic loop is a
reimplementation artifact, not Genshin's netcode) · official
damage-validation depth (the protocol is proven, the server's checks
are inference) · AFK kick timers · host-disconnect grace periods ·
exact join-flow duration (only generic loading screens ~15–30 s) ·
per-player session bandwidth (only mobile data ~100–200 MB/h ≈
28–56 KB/s derived) · Genshin replication radii (only UE's 150 m
default as an engine reference) · CCU/server counts · multi-player
aggro tables (design inference) · spawn protection on mid-combat
joins (contradictory reports) · the "relay-based, player hosts"
third-party claim (contradicted by Grasscutter evidence — discarded).

## Sources

Grasscutter source (MultiplayerManager, World.addPlayer, EnterScene
reasons, AttackResult proto, GameEntity.damage, scene Lua loops) ·
Genshin Fandom (Co-Op Mode + scaling tables, Adventure Rank, Domain,
Weekly Boss, Portable Waypoint, UID regions, Shield Gauge Data) ·
HoYoLAB official (v1.4 co-op guide, Luna I patch notes, support:
no cross-region) · Game8/GameWith/DiamondLobby (verified rules) ·
Gabriel Gambetta (the prediction/interpolation canon) · Valve
Developer Wiki (Source networking figures) · Unity docs (NGO 2.x,
anticipation, N4E server-rewind, Multiplayer Services, distributed
authority warning) · Epic docs (CMC, GAS FPredictionKey, Iris status,
Replication Graph, EOS lobbies-vs-sessions) · Alibaba Cloud (the
miHoYo regional architecture) · AccelByte/Edgegap (topology
trade-offs) · postmortems: Slay the Spire 2, Super Bear Adventure,
The Conduit (retrofit lessons) · Bandai Namco / Capcom (genre
contrasts).
