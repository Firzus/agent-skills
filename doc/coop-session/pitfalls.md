# Pitfalls — the 16 classic co-op failure modes

Each: symptom → root cause → prevention, with real incidents where
documented. Read before designing; re-read when a late joiner sees
closed chests or two players claim the same reward. Session/authority
detail is in [session-authority.md](./session-authority.md), replication
and the content matrix in [replication.md](./replication.md), the wider
netcode landscape in [netcode-models.md](./netcode-models.md), and co-op
design/UX in [coop-design.md](./coop-design.md).

## 1. The host advantage

- **Symptom** — the host plays at 0 ms while guests eat full RTT;
  dodges and timings feel unfair; guests feel the lag, the host
  never does. (And the host can cheat on their own machine.)
- **Root cause** — listen-server topology: the authoritative
  simulation runs on a player's machine.
- **Prevention** — dedicated instances (the Genshin model: the
  host's world is a server instance); or design around it:
  latency-tolerant combat (generous i-frames, hit validation with
  rewind, no frame-perfect cross-player mechanics).

## 2. Late-join state desync

- **Symptom** — the joining guest sees opened chests rendered
  closed, dead enemies alive, unlocked doors locked.
- **Root cause** — the join snapshot covers spawned actors but not
  **all mutable state**; past events never replay. (Documented
  cases: Godot's missing spawn-flag properties; Vintage Story's
  relog-to-resync chests.)
- **Prevention** — one world-state store (the `quest-system`/
  `save-persistence` single source) whose **full snapshot** ships
  reliably at join, before the world becomes playable; every
  mutable state lives in the store, never only in events.

## 3. The singleplayer-assumptions retrofit

- **Symptom** — "let's add co-op" becomes a rewrite: singletons
  everywhere, `timeScale = 0` pauses, one-player camera/cutscene
  assumptions, UI welded to game state.
- **Root cause** — solo-first architecture with implicit global
  state.
- **Prevention** — three documented postmortems converge: Slay the
  Spire 2 (a thin synchronizer + UI/logic split: "coop is way
  easier"), Super Bear Adventure (~18 months of retrofit, full
  controller rewrite), The Conduit (late multiplayer → massive
  rework; fixed in the sequel by making it a day-one focus). The
  rule: decide co-op-or-not before coding world systems — or treat
  solo as a one-player session.

## 4. Misprediction pops

- **Symptom** — local rubber-banding; a cast animation starts then
  snaps away when the server denies.
- **Root cause** — optimistic prediction corrected by snapping;
  cast cosmetics not tied to the confirm/reject cycle.
- **Prevention** — smoothed reconciliation windows (NGO's `Smooth`
  anticipation mode; UE's CMC corrections + `p.NetShowCorrections`
  for debugging); every predicted cosmetic tagged to a prediction
  key and rolled back as a block on reject (the GAS shape).

## 5. The trust-the-client hole

- **Symptom** — speedhacks, forged damage, forged RPCs.
- **Root cause** — client-authoritative outcomes accepted verbatim.
- **Prevention** — the authority dial: persistence (economy, claims,
  progression) is **always** server-hard; client trust is tolerable
  only on session-scoped ephemera in PvE (the Genshin trade —
  client-computed damage, server-applied, plausibility-checked;
  reported, not officially documented — flagged). The moment stakes
  are shared (PvP, trading), the server computes from stats. NGO's
  own docs: "client authority is a pretty dangerous door" —
  validate every client RPC.

## 6. Relevance popping

- **Symptom** — enemies/players visibly appear and disappear at the
  relevance boundary.
- **Root cause** — a single binary threshold with no margin.
- **Prevention** — hysteresis (entry radius > exit radius), cosmetic
  fade-in/out, relevance radius > silhouette render distance. At 4
  players, calibrate generously — bandwidth allows it.

## 7. The shared-interactable race

- **Symptom** — two players open the same chest the same frame →
  double rewards or a crash.
- **Root cause** — non-atomic check-then-act across machines.
- **Prevention** — server-side atomic claim arbitration (first valid
  request wins, the rest reject in the same tick); optimistic but
  revocable client display; or instance the loot per player
  entirely (the `loot-drop-system` matrix answer).

## 8. Host-leave data loss

- **Symptom** — the host quits mid-domain; guests lose the run.
- **Root cause** — the world IS the host's instance, with no
  graceful-end protocol and no host migration (none exists natively
  in either engine; EOS migrates lobbies only).
- **Prevention** — the **warn → complete → close** protocol: notify
  guests, let the encounter finish, award, then eject. Commit
  rewards server-side at claim time so nothing already earned is
  ever lost (the Genshin behavior: ejected, but pockets intact).

## 9. Time/weather divergence

- **Symptom** — rain at the guest's, sun at the host's; desynced
  day/night events.
- **Root cause** — clock/weather simulated locally per client.
- **Prevention** — host-clock authority (the `world-time-weather`
  rule): replicate seed + reference timestamp; clients derive
  everything locally; only the host can change time in session.

## 10. The cutscene collision

- **Symptom** — the host triggers a dialogue while guests fight
  nearby: guests get frozen, teleported, or captured by a scene
  they didn't start.
- **Root cause** — presentation (camera, freeze, letterbox) designed
  session-wide instead of per-player.
- **Prevention** — the shipped three-layer answer: (a) story content
  disables co-op entirely; (b) allowed quest dialogues show **only
  to the host** — guests keep playing and see a frozen avatar,
  never teleported; (c) NPC interaction is host-only. The rule:
  presentation is per-player by default; global freezes/timeScale
  are forbidden in session.

## 11. Quest-state contamination

- **Symptom** — a guest advances or breaks the host's quest (kills
  the quest boss early, grabs the objective item), or sees the
  host's quest state inconsistently.
- **Root cause** — quest triggers listening to world events without
  filtering actor identity; partial quest replication.
- **Prevention** — the structural rule: **host-only progression**
  (guests do nothing that counts); the content matrix encoded as
  data per type, never as scattered if/else.

## 12. The bandwidth whale

- **Symptom** — 4 players in a dense camp → throughput explosion;
  the listen-server host's upload saturates.
- **Root cause** — everything replicated to everyone at a fixed
  rate, full-precision floats.
- **Prevention** — relevance + degressive update rates by distance +
  quantized transforms. (Replication Graph is built for 100
  players/50k actors — overkill at 4.)

## 13. Disconnect mid-transaction

- **Symptom** — a guest drops mid-claim/pickup → duplicated or lost
  items.
- **Root cause** — a multi-step transaction split across machines
  with no journal or idempotency.
- **Prevention** — the `progression-economy` idempotent transactions
  applied to network ops: unique transaction IDs, exactly-once
  server execution (replay = no-op), server commit before any
  visual grant, reconciliation on reconnect.

## 14. The desync iceberg

- **Symptom** — slow silent drift: enemy positions diverge between
  clients over minutes of local extrapolation, until one event makes
  it visible.
- **Root cause** — partially local simulation (AI, cosmetic physics)
  with no periodic resynchronization; full cross-machine determinism
  is practically impossible (floats, update order).
- **Prevention** — an explicit architecture choice: periodic
  authoritative snapshots that overwrite drift (the recommended
  default — enemy AI simulated server-side, clients extrapolate
  cosmetically only), or full deterministic lockstep (enormous
  cost, RTS territory). Corollary: **the AI belongs to the server**;
  a client never decides an AI state change.

## 15. The netcode-model mismatch

- **Symptom** — combat feels terrible online despite the architecture
  being "correct": a precise shooter has unfair hit-reg; a fighting
  game stutters and freezes; an RTS desyncs after ten minutes; the
  Genshin-style client-trusted model gets exploited the moment PvP or
  trading is added.
- **Root cause** — the wrong netcode model for the genre. The dedicated-
  instance + client-trusted-PvE model fits latency-tolerant co-op PvE
  and *nothing else*. A competitive shooter needs server-authoritative
  **lag compensation** (favor-the-shooter rewind); a fighting game needs
  **rollback** (determinism + state save/load); an RTS needs
  **deterministic lockstep** (fixed-point + checksums).
- **Prevention** — pick the model by trust × scale × genre up front
  ([netcode-models.md](./netcode-models.md)): protect persistence
  server-hard always; add lag-comp the moment hit-reg fairness matters;
  add rollback only if you can make the sim deterministic and
  serializable; never bolt PvP/trading onto a client-trusted PvE model
  without moving outcome authority to the server.

## 16. Co-op designed as a single-player afterthought

- **Symptom** — co-op "works" but isn't fun: one player carries while
  the other watches; players never need each other; a downed friend
  across the map is just an annoyance; strangers can't communicate
  without voice; a join/leave causes a jarring difficulty jump.
- **Root cause** — the *design* (not the netcode) ignored co-op:
  self-sufficient mechanics (no interdependence), static headcount
  difficulty multipliers, no pingless comms, shared loot that rewards
  the faster looter, no per-player skill assist.
- **Prevention** — the design craft in [coop-design.md](./coop-design.md):
  build **interdependence** (neither player self-sufficient); a
  **room-based** drop-in model with empowerment-without-invalidation;
  **performance-based** encounter scaling (not headcount multipliers);
  **pingless context comms** (the Apex model) for the stranger path;
  **personal/instanced loot** and **per-player assist** to absorb skill
  disparity; a forgiving **downed/revive** economy.

## Debugging order

When co-op misbehaves: (1) join late into a heavily-mutated world and
diff against the store (#2), (2) play as guest at emulated 200 ms
(#1, #4), (3) two players hammer the same interactable (#7), (4) kill
the host mid-encounter (#8), (5) trigger a host dialogue while guests
fight (#10), (6) let a session idle 15 minutes and compare enemy
positions across clients (#14), (7) drop the connection mid-claim and
reconnect (#13), (8) profile bandwidth in the densest camp (#12), (9)
stress the chosen netcode model against the genre's worst case — precise
hit-reg / frame-perfect input / 10-minute determinism (#15), (10)
playtest with a skill-mismatched stranger pair, mics muted (#16).

## Ship checklist

```
- [ ] Topology decided (dedicated instance vs listen-server) with
      its trade-offs documented
- [ ] The authority dial written per data category; persistence
      server-hard everywhere
- [ ] Late-join snapshot covers ALL mutable state (audit against
      the world-state store)
- [ ] Smoothed reconciliation; predicted cosmetics roll back clean
- [ ] Relevance with hysteresis; bandwidth profiled at 4P density
- [ ] Shared interactables: atomic server claims (race-tested)
- [ ] The host-leave protocol: warn/complete/eject; rewards
      committed at claim
- [ ] Host-clock authority for time/weather
- [ ] Presentation per-player; no global freeze in session
- [ ] Content matrix as data; host-only progression enforced
- [ ] Network transactions idempotent (drop-tested)
- [ ] AI server-owned; periodic snapshots overwrite drift
- [ ] Emulated lag/loss test pass (100/200/300 ms, 1-5% loss)
- [ ] Solo treated as a one-player session (no retrofit debt)
- [ ] Netcode model justified by genre (lag-comp / rollback / lockstep
      only if the design demands it); persistence server-hard regardless
- [ ] Co-op design: interdependence, pingless comms, per-player assist,
      performance-based scaling, forgiving revive (stranger pair tested)
```
