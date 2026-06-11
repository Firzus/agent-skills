# Networked — MMO/server persistence at scale

Server-authoritative player-data persistence for online games. The recurring
pattern: **hot state lives in game-server RAM while online; the database is the
durable system of record, written periodically/on-event.** Tagged `[DOC]` /
`[INF]` inferred.

## The universal pattern (RAM-of-truth-while-online)

Player/character state is held in the game server's memory during a session for
latency; the DB is hit on **login, logout, crash-interval flush, or zone/server
handoff** — not per game tick (documented for WoW: a proxy "flushes to DB
periodically", ticks 2.5×/s; Albion: write-on-change "just in case the game server
crashes"; Roblox: in-memory player data, DataStore "only when necessary"). **The
crash-between-writes window is intrinsic** — everything below shrinks or recovers
from it.

## Database backend: SQL vs NoSQL

- **EVE Online — single relational DB, single shard**: the whole universe in **one
  MS SQL Server** (active/passive cluster); scaling is vertical + node-per-solar-system
  + **Time Dilation** (slow the sim when overloaded) rather than sharding. ~2,000
  txn/s, ~38k IOPS peak `[dated ~2010]`.
- **WoW — three relational DBs by scope**: Persistent (characters/items), Account
  (achievements), Regional (token/realm-list); ~50/50 read/write; a proxy fronts the
  DB and flushes periodically; ~20 logical shards per DB; transactions for inventory/
  trade/zone-change, NOT combat.
- **Albion — NoSQL (Cassandra), one world**: "player profile as a row keyed by hash";
  Cassandra uses timestamps to resolve node conflicts → requires NTP sync; still uses
  SQL for query-heavy problems (the marketplace).
- **PoE — sharded relational authority**: an "account authority" service, 5 shards by
  account_id × 2 read-replicas.
- **The tradeoff**: relational/row = strong ACID for trades/inventory, easy joins,
  but the single-write-node is the scaling ceiling. Document/NoSQL = horizontal scale
  + "whole profile = one document" simplicity, but weaker cross-entity transactions
  and **eventual consistency**.

## Write-back caching

Games overwhelmingly use **write-behind** (async batched flush) for latency;
write-through (synchronous durable write) is reserved for high-value transactions
(real-money purchases, trades). Albion keeps player data in RAM while online, writes
on every change "just in case the game server crashes", reads only on login/handoff;
**zone handoff goes through the DB** ("server 1 flushes the entity, server 2
retrieves it — the two never exchange player data directly"). Mitigate the
crash-between-writes window with short flush intervals + event-triggered writes (zone
change, trade commit, purchase).

## Sharding & consistency

- **Single-shard (EVE)** avoids cross-shard reconciliation entirely — the hardest
  dupe surface (an item existing in two shards) can't exist.
- **Per-realm (WoW)**: **layering** = full coherent copies for population surges;
  **sharding** = per-zone copies with no coherence across zone boundaries.
- **Account-wide vs character-specific**: WoW's three-DB split is exactly this;
  Destiny consolidates to one Bungie.net profile across linked platforms (cross-save).
- **Eventual-consistency caveats**: Cassandra can return stale reads → use **quorum
  read/write** where up-to-date data is required (inventory commits); PlayFab inventory
  writes are eventually consistent — verify via ETag retry.

## Idempotency & transactional integrity

- **Idempotency keys (the anti-double-grant primitive)**: PlayFab Economy v2
  `IdempotencyId` (stored 14 days, returns the original result on retry; reusing the ID
  with a different body = conflict). Client purchases → a client-generated GUID reused
  on retry; server grants → a deterministic ID (`questId-playerId`). The general
  pattern: a UUID per logical operation, check-or-insert under a **unique constraint**
  inside the **same transaction** as the effect.
- **Optimistic concurrency**: PlayFab ETags (`If-Match` → 412 on conflict); Nakama
  version OCC (each object returns a version; the next write must match, `version:"*"`
  = create-only); Roblox **session locking** (atomically write a LockId into key
  metadata inside `UpdateAsync` so two servers can't write one player's key →
  prevents the item dupe).
- **Ledger / event-sourcing for economy**: an append-only ledger as the source of
  truth, state derived by projection, idempotency enforced at every layer (request
  hash, DB unique constraint, ledger external-reference uniqueness). See
  `progression-economy` and `inventory-equipment` networking for the full treatment.

## Live-service player-data platforms

| Platform | Storage | Concurrency | Idempotency | Limits |
| --- | --- | --- | --- | --- |
| **PlayFab Economy v2** | per-item docs (not one blob) | ETags (412) | `IdempotencyId` 14-day TTL | catalog ≤20 GB; 3,000+ items; eventually consistent |
| **Nakama** | collections → JSON objects, Postgres-backed | version OCC | `version:"*"` create-only | self-host; permission levels |
| **Roblox DataStore** | key → JSON blob | session locking via `UpdateAsync` | lock GUID | **4 MB/key**; 25 MB/min read, 4 MB/min write per key; experience cap 100 MB + 1 MB/lifetime user |
| **AccelByte Cloud Save** | JSON or binary; game vs player records | Extend validation | `[under-sourced]` | server-write-only for authoritative data |

(Correction: Roblox DataStore is **4 MB/key**, not 6 MB; GameSparks is retired,
GameLift is compute not a player-data store.)

## Backup, rollback & disaster recovery

**The rollback dilemma**: a global rollback punishes innocent players; targeted
audits spare them but may miss hidden dupes.

- **Targeted-audit playbook (preferred — Diablo III AH gold dupe)**: (1) disable the
  feature (AH offline, suspend trading) to isolate; (2) lock exploiter accounts; (3)
  full audit of all transactions in the window; (4) per-account ban or rollback; (5)
  claw back duplicated gold via targeted audits — explicitly **NOT** a region-wide
  rollback. Recovered >85% of excess gold.
- **Global save-rollback playbook (RuneScape/OSRS)**: regular save-game snapshots; on
  a bad deploy, shut down + restore everyone to just before the update; only 3
  rollbacks in 9 years; **no individual-account rollbacks**; a **hotfix system** to
  disable offending content without full redeploy.
- **The primitives**: DBs with write-ahead logs allow **point-in-time recovery** to
  just before the damage; an **append-only audit log recording every mutation +
  actorId** is what makes targeted clawback possible (the Namazu Item Ledger,
  per-item UUID fingerprints). **Restoration moral hazard**: "restore hacked items"
  policies get exploited (fake-hacked-friend dupe) — economically-strict games adopt
  no restorations, ever.

## Key numbers

| Parameter | Value | Anchor |
| --- | --- | --- |
| EVE | 1 SQL DB, whole universe; ~2,000 txn/s `[dated]` | dev blog |
| WoW | 3 DBs; 50/50 read/write; ~20 shards/DB | blue post |
| PoE | 5 account-authority shards × 2 replicas | GGG (HN) |
| PlayFab | IdempotencyId 14-day TTL; catalog ≤20 GB | MS Learn |
| Roblox | 4 MB/key; experience cap 100 MB + 1 MB/lifetime user | Roblox docs |
| Rollbacks | RuneScape 3 in 9 years; Diablo III >85% gold reclaimed | press |

## Flagged gaps — do NOT invent

EVE throughput numbers are ~2010 dev blogs (order-of-magnitude) · Unity Cloud Save /
AccelByte idempotency specifics are under-sourced · generic ledger/event-sourcing
repos are illustrative of the pattern, not confirmed internal AAA designs · Lost
Ark/WoW DB engines beyond blue posts are proprietary.

## Sources

EVE (eveonline.com "Tranquility Tech IV"; highscalability) · WoW (Blizzard blue posts;
Joe Rumsey interview) · Albion (davidsalz.de; Quo Vadis 2016) · PoE (GGG, Hacker News)
· Roblox docs (DataStore limits, session locking) · MS Learn (PlayFab idempotency,
ETags) · Heroic Labs (Nakama OCC) · PureDiablo/Blizzard (D3 rollback) · OSRS
(maintenance/rollback blog) · Namazu Item Ledger.
