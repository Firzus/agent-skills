---
name: coop-session
description: >-
  Architecture blueprint for drop-in/drop-out co-op and multiplayer sessions:
  lobby lifecycle, join rules, authority, replication, late-join snapshots,
  anti-grief content rules, scaling, topology, matchmaking, host migration,
  split-screen, loot distribution, revive, cross-play, and co-op design. Use
  when designing co-op, lobbies, netcode, matchmaking, or when late joiners
  desync, hosts gain unfair advantage, rewards conflict, or co-op is not fun.
---

# Co-op Session

Build the drop-in co-op layer (2–4 players) of an open-world action
RPG — the Genshin lobby model: guests visit the **host's world**,
content rules make griefing structurally impossible, and the session
ends gracefully when the host leaves. Architecture level (authority,
prediction, relevance) — no low-level netcode. The hub also maps the
**wider netcode landscape** (lockstep, rollback, FPS lag-comp, MMO
scale, matchmaking) and the **co-op design craft** so you can pick the
model that fits your genre, not just copy Genshin. Primary evidence: the
Grasscutter server reimplementation + the verified co-op rules already
sourced across this skill family.

## The architecture rule

**The host's world is a server instance, authority is a per-category
dial, and the content matrix is data.**

```
SESSION (the host's-world model)
  the "host's world" = a SERVER-SIDE world instance the host owns —
  never the host's machine (no host advantage, no NAT, no exposed
  IPs; host disconnect = the instance closes)
  guests' own worlds DON'T EXIST while visiting (instance destroyed/
  suspended; their state untouched)
  join = the same EnterScene handshake as solo with a TeamJoin
  reason; the host's world flips to MP mode; guest spawns at host
  leave = graceful re-creation of the guest's own instance
  host leaves = warn -> complete -> close: everyone ejected to
  their own worlds; claimed rewards survive (server-side)
  NO host migration — acceptable because returning home is painless

AUTHORITY (a spectrum, not a switch — the datamined Genshin hybrid)
  server-HARD     economy, claims, inventory, progression (always)
  server-owned    enemy AI state, spawns, world events
  client-trusted  movement (plausibility-validated after the fact)
                  and even damage in Genshin's PvE (client computes,
                  server applies + sanity-checks) — viable ONLY in
                  coop PvE where combat cheats can't touch the
                  economy; PvP or shared stakes = server computes
  the rule: protect PERSISTENCE hard; tolerate trust on EPHEMERA

REPLICATION (the canon, architecture level)
  local player: predict inputs, server corrects, replay unacked
  remote players: interpolate ~100-200 ms in the past
  abilities: client requests + cosmetic prediction, server
  validates outcome (cooldown/cost) and broadcasts
  relevance: replicate (and SIMULATE) only near players;
  hysteresis at boundaries
  late join: ONE full world-state snapshot at entry (chests, dead
  enemies, weather, host clock) from the world-state store — then
  deltas; never a replayed event history

CONTENT RULES (the matrix as data — the anti-grief)
  host-only   chests, collectibles, NPCs, quests, time-of-day
  instanced   enemy drops, ore, energy-gated claims (per-player
              resin; respawn after the LAST claim)
  shared      plants/specialties (first-come), fishing spots
  + story content disables co-op entirely; cutscenes are
  host-only presentation (guests keep playing, see a frozen avatar)
```

## Reference map

| File | Covers |
| --- | --- |
| [session-authority.md](./session-authority.md) | The session lifecycle (host's-world model, join/leave/kick flows, gates, party composition), the authority spectrum (server-hard ↔ client-trusted), the three topologies, regional infrastructure, the flagged "do not invent" gaps |
| [replication.md](./replication.md) | Replication at architecture level (prediction, reconciliation, interpolation, relevance, enemy scaling, late-join snapshot), the content-rules anti-grief matrix as data, engine notes (NGO 2.x / UE5 CMC+GAS) |
| [netcode-models.md](./netcode-models.md) | The wider landscape: deterministic lockstep (RTS), rollback (fighting games), FPS lag-comp / favor-the-shooter, MMO scale (interest management, sharding, EVE single-shard + TiDi, server meshing), matchmaking & SBMM (Elo/Glicko/TrueSkill), relay vs dedicated, NAT, middleware, host migration & reconnection |
| [coop-design.md](./coop-design.md) | The design craft: interdependence and the Hazelight co-op-first pole, the L4D AI Director, split-screen/shared-camera engineering, pingless ping comms, loot distribution, downed/revive, room-based drop-in, per-player assist, cross-play |
| [pitfalls.md](./pitfalls.md) | 16 failure modes (symptom → cause → prevention) with debugging order and ship checklist |

## Build order (4 shippable tiers)

```
Tier 1 — Session skeleton
- [ ] Session service: create/invite/join-request (with expiry ~10s)
      /approve/kick/leave; the three host permission modes (reject /
      direct / approval)
- [ ] The host's-world instance model: guest world teardown on join,
      graceful re-creation on leave; spawn-at-host placement
- [ ] Join gates as data: progression unlock, world-level rules
      (guest's WL >= host's; the endgame free-join exception)
- [ ] The host-leave protocol: warn -> complete encounter -> eject
      all (rewards already committed server-side)
Tier 2 — Replication core
- [ ] Authority dial per data category (the spectrum above);
      server-hard transactions reuse progression-economy idempotency
- [ ] Local prediction + smoothed reconciliation; remote
      interpolation buffer (~100-200 ms / 2 snapshots)
- [ ] Late-join snapshot from the world-state store (ALL mutable
      state — the single source from quest/save skills)
- [ ] Relevance: radius-based replication AND simulation bounding,
      with hysteresis; degressive update rates by distance
Tier 3 — Content rules
- [ ] The matrix as data per content type (host-only / instanced /
      shared); interaction authority = world owner
- [ ] Party composition budget (total 4: 2+2 / 2+1+1 / 1x4; dupes
      allowed in overworld, denied in instances)
- [ ] Enemy scaling by player count (HP-only is the shipped lesson:
      150/200/250%, ATK flat — Genshin removed ATK scaling);
      per-player threat in the AI (enemy-ai-framework)
- [ ] Co-op gating: story quests disable sessions; host cutscenes =
      per-player presentation (guests unaffected)
Tier 4 — Polish and services
- [ ] Domain/instance co-op: per-player claims, no-dupe team rule,
      targeted matchmaking (content-scoped, not open-world)
- [ ] Disconnect handling: idempotent transactions across drops;
      rejoin = a fresh join request (no session reconnect)
- [ ] Regions/platforms: regional servers (no cross-region),
      cross-platform within region; the latency-tolerant combat
      design pass (no cross-player frame-perfect mechanics)
- [ ] Network debug: emulated lag/loss testing, the desync
      detection overlay
```

## Numbers (starting points — sourced anchors)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Session | unlock AR 16 + prologue; 4 players max; invitation expiry ~10 s; join allowed anytime (even mid-combat) | wiki/community |
| Join rules | guest WL ≥ host WL (the strong can visit down, never up); WL 8↔9 free exception; voluntary -1 WL with a 24 h lock | wiki |
| Party | total always 4 characters: 2P=2+2, 3P=2(host)+1+1, 4P=1×4; duplicates OK overworld, denied in domains | wiki |
| Enemy scaling | HP 150/200/250% for 2/3/4P, **ATK 100%** (the 110/125/140% multipliers removed — difficulty lesson); shield gauges ×1.5/1.7/2 | wiki + patch notes |
| Claims | resin costs identical to solo; per-player claims; boss respawns after the LAST claim; drops not multiplied; companionship EXP ×2 | wiki/official |
| Network canon | interpolation 100 ms / 2 snapshots (Valve); genre ticks 20–64 Hz; UE default cull distance 150 m; red-ping threshold ~200 ms+ (the "360 ms" figure unconfirmed) | engine docs/community |
| Bandwidth | Genshin mobile ~100–200 MB/h in co-op (≈28–56 KB/s derived — inference) | community measured |
| Regions | 4 server regions, zero cross-region, account locked to server; cross-platform within region | official |
| Genre contrast | Elden Ring: host+2 summons (4 with invader), session ends on boss kill; MHW: 16-player hub, 4-player quests | official/wiki |

Flagged — never invent: the official server tick rate (Grasscutter's
1 Hz logic loop is NOT representative), AFK kick timers, the host
disconnect grace period, per-player session bandwidth, Genshin
replication radii, CCU figures. Full tables in
[session-authority.md](./session-authority.md) and
[replication.md](./replication.md).

## Engine mapping

| Generic block | Unity 6 | UE5 (5.4+) |
| --- | --- | --- |
| Netcode stack | **NGO 2.x** (1.x unsupported from 6000.3): server-authoritative NetworkVariable/RPC; **no built-in prediction** — only the 2.0 anticipation API (`AnticipatedNetworkTransform`, `OnReanticipate`/`Smooth`) | Mature actor replication + RepNotify + RPCs + relevancy (`NetCullDistance`); **CMC ships client prediction + reconciliation free** (the co-op free lunch); Mover 2.0 still experimental — don't bet on it |
| Serious prediction | **Netcode for Entities 1.x** (production-ready: prediction, interpolation, server-rewind lag compensation) — the choice for demanding combat at ECS cost | **GAS prediction keys**: client predicts activation + cosmetics, server confirms/rejects with automatic rollback; outcomes stay server-side |
| Sessions/lobby | **Multiplayer Services SDK** (the unified Sessions package replacing Lobby+Relay+Matchmaker); Relay for the no-dedicated path; Multiplay for the Genshin-style dedicated instances | **Online Subsystem + EOS** (free cross-platform lobbies/sessions/presence/friends); dedicated Linux server builds + external orchestration |
| Distributed authority | NGO 2.x topology + cloud state service — **officially discouraged when cheat resistance matters** (Unity's own doc); prototyping/friends-only | — |
| Relevance at scale | Hand-rolled AOI | Default relevancy suffices for 4 players; **Replication Graph is for 100-player/50k-actor scale** (Fortnite) — overkill here; Iris beta 5.7, off by default, no seamless travel yet |
| Host migration | None built-in either side | **None** (EOS migrates the lobby only, never game state) — design the graceful-end protocol instead |
| Testing | Network simulator in NGO/Transport | `Net PktLag/PktLoss` + Networking Insights |

## Failure modes

The 16 classic co-op bugs (host advantage, late-join desync, the
singleplayer-assumptions retrofit — with three documented postmortems,
misprediction pops, the trust-the-client hole, relevance popping, the
shared-interactable race, host-leave data loss, time/weather
divergence, the cutscene collision, quest-state contamination, the
bandwidth whale, disconnect mid-transaction, the desync iceberg, **the
netcode-model mismatch**, and **co-op designed as a single-player
afterthought**) are cataloged in [pitfalls.md](./pitfalls.md) with
symptom → root cause → prevention.

## Related skills

- `progression-economy` — server-authoritative transactions and
  idempotency keys reused for every network op.
- `character-controller` — the deterministic tick + intent + snapshot
  structure that prediction/reconciliation build on.
- `save-persistence` — the world-state store feeding the late-join
  snapshot; server-authoritative as one of its four save models.
- `quest-system` — host-only progression, the world-state store the
  late-join snapshot reads from.
- `world-time-weather` — host-clock authority, seed replication.
- `loot-drop-system` — the instanced/shared drop matrix, per-player
  claims.
- `enemy-ai-framework` — server-owned AI, per-player threat.
- `scene-flow-manager` — the EnterScene handshake the join flow
  reuses.
- `dialogue-system` / `cinematic-system` — per-player presentation
  (host cutscenes don't capture guests).
- `camera-system` — the multi-target framing rig reused for shared-screen
  / split-screen co-op ([coop-design.md](./coop-design.md)).
- `hud-system` — co-op nameplates, player colors, through-wall
  silhouettes, and pingless ping comms live in the HUD layer.
