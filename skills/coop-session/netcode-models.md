# Netcode models — the landscape beyond the dedicated instance

This skill's core is the **Genshin model**: a per-party dedicated server
instance, client-trusted PvE (clients compute combat/positions, low cheat
stakes because it's co-op), interest over ~4 players, no rollback, no
lag-compensated hit-reg. That is one point in a much larger space. Pick
the model that fits *your* trust, scale, and genre — most shipping games
are hybrids. `[DOC]` = canonical talk/spec, `[?]` = uncertain/evolving.

## The canonical taxonomy

Three root models; the axes are **what crosses the wire** (inputs vs
state) × **who is authoritative** (all peers vs one server) × **how
mispredictions are reconciled** (abort / rollback / server-correct).

| Model | On the wire | Authority | Reconciliation | Canonical | Numbers |
| --- | --- | --- | --- | --- | --- |
| **Deterministic lockstep** | inputs/commands only | all peers equal | none — desync ⇒ abort | Age of Empires, StarCraft 2, SupCom | 1500 units / 28.8k modem; +200–300 ms command delay; FP banned |
| **Authoritative client-server** | inputs up, snapshots down | server | server correction + client replay | QuakeWorld, Source, Apex | tick 20–128 Hz |
| **Rollback (P2P deterministic)** | inputs only | all peers deterministic | predict → rollback → re-sim | GGPO; Skullgirls, KI, SF6 | re-sim K frames in 16.6 ms; ring buffer of N states |
| **Lag-comp FPS** | inputs + timestamped snapshots | server (rewinds hitboxes) | server-side rewind to shooter view | Source, Overwatch, Valorant | 1–2 s history; ~250 ms rewind cap |
| **MMO single-shard** | AoI-filtered state | server cluster + 1 DB | time dilation | EVE Online | TiDi to ~10% real time |
| **Server meshing** | state via replication layer | per-node DGS + layer | network-bind culling, PES | Star Citizen, Dual Universe | entity-graph DB |
| **P2P + host migration** | state snapshots | rotating host | elect host + transfer state | CoD Zombies, Unity MPS | 3 s snapshot, 10 s relay timeout |

## Deterministic lockstep (the RTS model)

Send **only inputs/commands**, never world state; every client runs the
same deterministic sim, so identical inputs → bit-identical state
("1500 Archers on a 28.8", Terrano & Bettner, GDC 2001) `[DOC]`. AoE moved
1500+ units over a modem because it transmits *commands*, not positions.
Commands are timestamped to a future **execution turn** (SupCom runs on
SimTick+2/+3 → 200–300 ms inherent input latency), run at a fixed
timestep.

The brutal cost is **determinism**:
- **Floating-point non-determinism** is the #1 desync cause — fix with
  **fixed-point integer math** (StarCraft 2) or forced strict IEEE754
  (SupCom, at a perf cost); mixing the two = desync.
- A **seeded shared PRNG** is mandatory — any divergence compounds.
- **Desync detection via periodic state checksums** compared across
  clients; a mismatch aborts ("out of sync") — there's no resync. The
  checksum doubles as anti-cheat and as the replay/save mechanism.

Wins for huge entity counts, low player counts, replays/anti-cheat
(RTS, MOBAs, Factorio-style sims). **Opposite trust model to Genshin**:
every peer simulates authoritatively and cross-checks.

## Rollback (the fighting-game revolution)

Deterministic P2P like lockstep, but **never wait** for remote input:
predict the remote input (usually repeat the last one), simulate locally
immediately, and on misprediction **roll back** to the last known-good
state, re-apply the correct inputs, and fast-forward to the present
(GGPO, Tony Cannon 2009; Infil/Ars Technica explainer) `[DOC]`.

- **Why fighting games**: 60 fps, frame-perfect inputs, offline muscle
  memory must transfer online. Delay-based netcode *adds* input delay and
  *freezes* when input is late; rollback keeps the offline feel and
  corrects the past invisibly.
- **Three hard requirements**: a fully deterministic 1-frame advance; a
  fully serializable state; the engine can **save/load/advance one frame
  without rendering** (the rollback primitive — a ring buffer of N
  states).
- **The rollback budget**: when input arrives K frames late, the engine
  must re-simulate K frames within one 16.6 ms display frame — so the sim
  step must be cheap. `synctest` runs a 1-frame rollback every frame
  offline to catch non-deterministic ("leaky") state.
- Adopters: Skullgirls, Killer Instinct, SF6, GGRS (Rust port). Genshin
  has **no determinism, no state save/load, no rollback** — it streams
  authoritative state.

## FPS / shooter netcode in depth

Builds on authoritative client-server (client prediction + reconciliation
is the known baseline):

- **Lag compensation / server-side rewind ("favor the shooter")**: when a
  shot arrives, the server **rewinds all hitboxes to the world-state the
  shooter saw** (using the shot's timestamp), evaluates the hit there,
  re-applies. You hit where the enemy *was* on your screen. The server
  keeps ~**1–2 s** of position history (Valve/Bernier, Overwatch GDC 2017,
  Apex "What Makes Apex Tick") `[DOC]`.
- **Overwatch specifics**: a **~250 ms rewind cap** stops high-ping
  players killing you long after you reached cover; **extrapolation**
  (dead-reckoning) past the cap still favors the shooter ("it is a
  guess… it can be wrong"). `[?]` (may have been retuned post-launch)
- **Interpolation vs extrapolation**: interpolate remote entities ~1
  update in the past (smooth, adds latency lag-comp must account for) vs
  extrapolate forward (no added latency, wrong on direction changes).
- **Tick-rate debate**: 20-tick ≈ 50 ms granularity, 128-tick ≈ 7.8 ms —
  finer lag-comp precision but ~triple CPU + bandwidth. **Peeker's
  advantage**: the peeker sees the defender first; lag-comp validates the
  peeker's shot against rewound state ⇒ a structural attacker edge,
  worse with latency and coarse ticks. `[?]` (128-tick is illustrative;
  CS2 moved to "sub-tick")
- Genshin does **no lag-comp hit-reg, no server rewind, no peeker's-
  advantage tuning** — PvE co-op doesn't need favor-the-shooter fairness.
  This is the single biggest gap if you ever add competitive or
  precise-shooter combat.

## MMO-scale architecture (thousands, not 4)

- **Interest management / Area-of-Interest (AoI)**: only send a player
  updates about entities in their AoI — the core scalability lever
  (spatial grids/cells, spatial pub/sub; Liu & Theodoropoulos, ACM CSUR
  2013) `[DOC]`.
- **Sharding / instancing / layering**: parallel isolated realm copies
  (classic WoW), invisible **layers** of one realm at high pop, or
  private dungeon **instances** (closest to Genshin — but Genshin
  instances the *whole* co-op world).
- **Single-shard + time dilation (EVE)**: one universe, a node cluster
  bound by a single DB of record; **TiDi slows the game clock (down to
  ~10% real time)** when a node overloads (1600-ship fights) rather than
  dropping the sim (CCP papers) `[DOC]`.
- **Seamless-world server meshing (Star Citizen/Dual Universe)**: a
  **replication layer** decouples simulation (per-node DGS) from state,
  holding every entity in memory and replicating to clients *and* server
  nodes via network-bind culling; a persistent **entity-graph DB** is the
  database-of-record. `[?]` (partially shipped/evolving)
- **Replication Graph (Unreal, UE 4.20)**: groups actors into shared
  relevancy nodes to cut redundant CPU/bandwidth — shipped in Fortnite BR
  (100 players). The engine-level answer when default relevancy doesn't
  scale (overkill for 4-player co-op).

## Matchmaking & online services

- **Skill-based matchmaking**: **Elo** (single scalar, 1v1, breaks on
  teams) → **Glicko-2** (adds a rating-deviation/uncertainty term) →
  **TrueSkill** (Bayesian μ/σ per player, **handles teams and N-player
  matches**, scores match quality — built for Xbox Live) `[DOC]`. Form
  matches that minimize predicted skill gap; σ drives placement
  volatility.
- **Party ≠ Lobby ≠ Session**: a persistent friend group vs a
  pre-match staging pool vs the actual networked match. "Session" is the
  portable handle most middleware exposes.
- **Transport topology**: P2P direct (lowest latency, exposes IPs, NAT
  fails on many networks) vs **relay** (one known IP, solves NAT, hides
  IPs, small added latency — Genshin's regime if it weren't dedicated) vs
  **dedicated** (neutral authority, cheat-resistant, costly — Genshin's
  choice). **NAT traversal**: STUN (find your public IP) → TURN (relay
  fallback) → ICE (try candidates), plus UDP hole-punching.
- **Middleware**: EOS (free cross-platform sessions/matchmaking),
  Steam (SteamNetworkingSockets + Steam Datagram Relay), PlayFab (Azure
  dedicated hosting), Photon (relay + deterministic Quantum), Nakama
  (open-source authoritative match handlers). **Backfill** refills
  mid-session slots. Note these as the build-vs-buy alternative to
  Genshin's bespoke first-party stack.

## Reconnection & resilience

- **Host migration (P2P only)**: when the authoritative host leaves,
  elect a new host and transfer state. Unity's documented model: the host
  serializes a snapshot every ~3 s to the lobby; a ~10 s relay timeout
  triggers migration; the new host rebuilds the world and rematches
  clients by connectionId. **Fragile** (CoD Zombies): recreating complex
  real-time state across consumer networks in tight timeouts fails on
  large/divergent state or simultaneous drops. `[?]`
- **The dedicated alternative**: a dedicated/authoritative server *is*
  the resilience mechanism — a dropped player just reconnects and
  re-pulls state ("save the match state server-side"). **No migration
  needed.** This is exactly what Genshin buys by paying for instances.
- **Pause-on-disconnect (fighting games)**: deterministic P2P matches
  can't migrate live → freeze and attempt reconnect, else end the match.
- **The mid-drop options ladder**: (a) AI takeover, (b) hold slot +
  backfill, (c) pause, (d) end match — choice depends on the authority
  model.

## Sources

Terrano & Bettner "1500 Archers on a 28.8" (GDC 2001) · Game Developer
"Minimizing the Pain of Lockstep" / "Synchronous RTS Engines and Desyncs"
· GGPO docs + Infil/Ars Technica rollback explainer (2019) · Valve
"Source Multiplayer Networking" + Bernier "Latency Compensating Methods"
· Gambetta "Fast-Paced Multiplayer" · Overwatch "Let's Talk Netcode" +
GDC 2017 (Tim Ford) · EA "What Makes Apex Tick" · Liu & Theodoropoulos,
ACM CSUR 2013 (interest management) · CCP "Single-Sharded Architecture" +
"Time Dilation" · CitizenCon 2951 server meshing · UE 4.20 Replication
Graph notes · Microsoft Research "TrueSkill" · AccelByte "P2P vs Relay vs
Dedicated" · Valve GameNetworkingSockets · Unity "Migrate Session Host".
Flags: 128-tick is illustrative (CS2 sub-tick); Overwatch 250 ms cap may
be retuned; Star Citizen meshing is in-development.
