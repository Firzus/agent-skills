# Replication & content rules — the canon, the anti-grief matrix

The architecture-level replication model and the data-driven content
matrix that makes griefing structurally impossible. Numbers are **starting
points — tune by playtest**. Session lifecycle and authority are in
[session-authority.md](./session-authority.md); the wider netcode
landscape (lockstep, rollback, lag-comp, MMO scale) in
[netcode-models.md](./netcode-models.md).

## Replication (architecture level)

- **The local player**: predict inputs immediately; the server returns
  authoritative state + last processed input; the client replays
  unacknowledged inputs (reconciliation), smoothed — never snapped.
- **Remote players**: interpolate between the last two snapshots —
  rendered **~100–200 ms in the past** (the Valve reference: 100 ms
  buffer = 2 snapshots at 20/s, survives one lost packet). "The local
  player lives in the present; everyone else lives in the past."
  (Interpolation vs extrapolation trade-offs:
  [netcode-models.md](./netcode-models.md).)
- **Abilities**: client requests + cosmetic prediction; the server
  validates (cooldown, cost) and broadcasts; mispredicted cosmetics roll
  back as a block (the GAS prediction-key shape).
- **Relevance** serves two purposes at 4 players: less bandwidth, but
  mostly **bounding server simulation** — only zones near players are
  active (the Grasscutter block/group spawning). Hysteresis at
  boundaries; degressive update rates by distance; quantized transforms.
  (Interest management *at MMO scale* is a different problem class —
  [netcode-models.md](./netcode-models.md).)
- **Enemies**: AI is **server-owned** (a client never decides an AI state
  change); threat extends per-player (`enemy-ai-framework`); scaling by
  player count is **HP-only** — the shipped lesson: 150/200/250% HP for
  2/3/4P with ATK flat at 100% (the original 110/125/140% ATK multipliers
  were removed to cut co-op difficulty); shield gauges scale ×1.5/1.7/2;
  drops are never multiplied (they're instanced). Beware static headcount
  multipliers — they create difficulty breakpoints; performance-based
  scaling is the better generalization ([coop-design.md](./coop-design.md)).
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
  quest-manipulated); world-quest dialogues/cutscenes are **host-only
  presentation** — guests keep playing and see the host's avatar frozen;
  never teleported, never captured (`dialogue-system`/`cinematic-system`:
  per-player presentation is the rule; global freezes/timeScale are
  forbidden in session).
- **Matchmaking** is content-scoped (the domain Match button), never
  open-world; guests can enter domains they haven't unlocked if the host
  has.
- **Latency-tolerant combat by design** (inference, flagged): PvE only,
  no cross-player frame-perfect mechanics, generous hitboxes,
  attacker-side damage — what makes interpolation delays invisible. (A
  precise-shooter or PvP design would instead need lag compensation —
  [netcode-models.md](./netcode-models.md).)

The loot-distribution model (personal vs FFA vs round-robin) and the
broader anti-grief social layer are in [coop-design.md](./coop-design.md).

## Engine notes

- **Unity**: NGO 2.x is the Unity 6 line (1.x unsupported from 6000.3);
  its anticipation API is visual anticipation + manual reconciliation,
  not input rollback. Netcode for Entities 1.x ships real prediction/
  interpolation/server-rewind (16–32-tick physics history) —
  production-ready, ECS paradigm. The Multiplayer Services SDK unifies
  Lobby+Relay+Matchmaker as "Sessions" (`CreateOrJoinSessionAsync`
  handles lobby + relay allocation + netcode connection). **Distributed
  authority is officially discouraged where cheat resistance matters** —
  Unity's own docs say it "relies on the assumption that each game
  instance can be trusted".
- **UE5**: the replication stack + CMC prediction is the strongest
  default for 4-player co-op; GAS prediction keys for abilities (cosmetic
  prediction, server outcomes); Iris is beta (5.7, off by default, no
  seamless travel) and Replication Graph targets 100-player scale — both
  unnecessary here; EOS gives free cross-platform sessions; **no host
  migration exists** (EOS migrates lobbies only).

## Sources

Grasscutter source (scene Lua loops, AttackResult proto, entity-appear
notifies) · Genshin Fandom (scaling tables, Shield Gauge Data, Co-Op
rules) · HoYoLAB (Luna I patch notes — ATK-scaling removal) ·
Game8/GameWith/DiamondLobby (verified content rules) · Gabriel Gambetta
(prediction/interpolation/reconciliation) · Valve Developer Wiki (Source
networking figures, interpolation) · Unity docs (NGO 2.x, N4E
server-rewind, Multiplayer Services, distributed-authority warning) ·
Epic docs (CMC, GAS FPredictionKey, Iris status, Replication Graph, EOS).
Wider model sources in [netcode-models.md](./netcode-models.md); co-op
design sources in [coop-design.md](./coop-design.md).
