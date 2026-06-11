# Networking — server authority, dupe prevention, persistence

For online/MMO games where the **server is the only source of truth** and item
state must survive trades, crashes, lag, sharding, and adversarial clients.
Companion to the single-player data model. Each mechanism is paired with the
failure it prevents. Uncertainty flagged `[?]`.

## Server-authoritative ownership

- **The client sends intent, never state.** "I attempt to consume slot 4 / equip
  / confirm trade" — never "I now have 3 potions". The server validates and
  replicates the result. This single rule closes most dupe/forgery classes. *A
  client claiming a 50-kill streak is no more trustworthy than one claiming it
  moved 500 m/s* — reward claims, loot rolls, inventory credits all need server
  authority.
- **Unique item id model.** Each non-fungible item gets a server-generated unique
  id; identical ids are presumed dupes and scanned/deleted. Diablo II stamped a
  pseudorandom 32-bit fingerprint and deleted duplicates with a matching id —
  *but stackables without fingerprints (potions, gems, runes) had no dedup and
  were heavily duped*. Cover stackables too.
- **Transactional item moves.** Every mutation (add/remove/equip/trade) is an
  atomic server write with an idempotency id so a retried request is processed
  exactly once.
- **Fungible vs distinct split.** Ledgers classify items as `FUNGIBLE`
  (quantity-adjusted) vs `DISTINCT` (per-instance lifecycle) — determines whether
  you track counts or unique ids.

## The duplication root-cause catalog

Classic root causes and **real documented incidents**:

| Incident | Root-cause class | Trigger | Studio fix |
| --- | --- | --- | --- |
| RuneScape 2 party room | container non-atomicity | deposit > owned, withdraw | value-based delays |
| WoW instance dupe | lag/rollback + trade | trade gold → enter bugged instance → rubber-band rollback keeping gold | instance fix `[?]` (forum-sourced) |
| Diablo III 1.0.8 | integer overflow (signed 32-bit) | RMAH list ~6B gold (shown 1.7B), cancel refunds full 6B | revert patch, audit all txns, ban |
| Diablo IV 2023 (×2) | race / forced disconnect | drop items in trade slot, force-close client | suspend trade, backend fix, hotfix |
| Diablo II | UID type confusion / save timing | trade-buffer state → copy gets a new unique tag | periodic + on-save dupe scans |
| PoE / PoE2 | crash → server rollback | force instance crash mid-craft | silent hotfix, ban + delete `[?]` |

**Cross-cutting lesson**: dupes live at **concurrency + client trust**. The
recurring studio playbook is *disable the feature (trade/AH) → isolate → audit
transaction logs → targeted bans/deletes → avoid full rollback* (rollbacks punish
legit players and are the last resort).

## Trade & mailbox — escrow, 2-phase commit, idempotency

- **Escrow / "limbo".** Never mutate two inventories directly. Move the item to a
  temporary `Trade_Escrow` state first, then out to the receiver, committing both
  sides together. *Prevents partial transfer = dupe (credited not debited) or
  loss.*
- **Two-phase commit (lock-confirm-swap).** *Prepare*: lock both player sessions
  (in-memory mutex keyed on a `trade_id`, valid because a player exists on one
  server), validate both still own what they offered, write a pending trade
  record (both deltas, both ids, timestamp). *Commit*: apply both deltas inside a
  single atomic write; append audit log. *Prevents the credit/debit window;
  enables crash recovery between phases.*
- **Row-level locking.** `SELECT … FOR UPDATE` on both inventory rows so
  concurrent trades can't double-spend (the D4/WoW class).
- **Idempotent transactions.** The client generates a UUID before the first
  attempt and reuses it on retry; the server stores it (~14 days) and returns the
  original result. Server-granted rewards use a deterministic key like
  `questId-playerId` to block double-grants. *Prevents network-retry double-processing.*
- **Timeout + auto-expire** pending trades (~10 min) to release locked rows.
- **Tamper-evident logging.** Append `{trade_id, counterparty, deltas, timestamp,
  hash(previous_entry)}` — a hash chain so altering any record breaks every later
  hash. This is what makes post-incident audit + rollback feasible.

## Persistence — ACID, ledger, reconciliation

- **ACID DB transactions** wrap multi-row item moves (all-or-nothing). EVE Online
  is the canonical single-shard example: one MS SQL DB is the final synchronizer,
  the `Items` table taking >9M insertions/day, all logic in stored procedures.
- **Append-only ledger / event sourcing.** Record every lifecycle event
  (`CREATED`, `QUANTITY_ADJUSTED`, `DELETED`) immutably with `actorId` +
  `timestamp` + before/after. Never update/delete — **reverse with a compensating
  event**. Balance is a replay of the stream. *Enables deterministic replay +
  audit.*
- **Optimistic concurrency**: `UNIQUE(aggregate_id, version)` so two concurrent
  appends for the same version → one fails and retries (*prevents lost-update
  dupes*).
- **Idempotency at the persistence layer**: handlers track the last-processed
  sequence number and skip duplicates (delivery is at-least-once).
- **Write-back cache**: keep hot inventory in memory/Redis while the player is
  online, persist deltas periodically (Albion writes every few minutes + on zone
  change). *Trade-off*: a crash between writes risks losing recent changes vs
  duping on replay — drives the need for idempotent replay.
- **Reconciliation jobs**: periodically compare ledger vs authoritative store,
  flag identical unique-ids ("dupescan").

## Anti-cheat for items

- **Validate the exact slot, not just ownership.** Common production bug: check
  the item *exists* in inventory but not that it's *in the claimed slot* → consume
  one, remove another. Check ownership + slot + prerequisites (funds, level,
  cooldown).
- **"Detect impossible items" is a backstop, not the wall.** A hacked client can
  forge a *plausible* item; over-relying on the check can even let cheaters get
  non-cheaters auto-banned. Layer behavioral/statistical anomaly detection
  (impossible acquisition rate, inhuman timing) on top of full server authority.
- **Control information revealed to the client** (Albion: "absolute server
  authority includes what you reveal to the client" — their only serious cheat
  came from trusting client data).
- **Encrypt the protocol** to raise the bar on forged packets (PoE).

## Sharding & account-stash consistency

- **Single-shard avoids cross-shard reconciliation entirely** (EVE's whole
  universe is one DB; Albion is one world backed by Cassandra). Prevents the
  hardest dupe surface — an item existing authoritatively in two shards.
- **Eventual-consistency caveat**: distributed NoSQL can return stale reads —
  use **quorum reads/writes** where up-to-date data is required (inventory
  commits), fast non-quorum elsewhere.
- **Account-wide stash = single-writer.** WoW's Warband Bank is account-wide
  within a region but only the first character logged in gets access — explicit
  single-writer locking to avoid concurrent-write dupes.
- **Soulbound / bind-on-pickup** makes the most valuable items non-tradeable,
  shrinking the dupe-and-launder surface.
- **Cross-server sync via message queue + idempotent deltas**: mutate
  authoritatively on one server, emit a change event with a unique id, propagate
  via Redis/Kafka, discard already-processed ids on the receiving side.

## Design rules

1. Client sends intent, server owns state.
2. Trades = 2-phase commit + escrow + row locks + idempotency key + hash-chained
   log.
3. Persist via ACID over an append-only ledger; reverse with compensating events;
   reconcile continuously.
4. Unique item ids enable dupe-scanning — but cover stackables and leave no
   save-checkpoint window.
5. Validate the exact slot; "impossible item" checks are a backstop.
6. Prefer single-shard or single-writer account stashes; if distributed, use
   quorum writes + idempotent queued deltas + soulbound gating.
7. Incident playbook: disable feature → isolate → audit → targeted bans → avoid
   full rollback.

## Engine mapping

| Generic block | Unity 6 | UE5 (5.4+) |
| --- | --- | --- |
| Authority | NGO/Mirror server ownership; ServerRpc intent | registered subobject lists (5.1+) + `FFastArraySerializer` |
| Trade txn | server service + DB transaction | server service; replicate result only |
| Backend | UGS Cloud Code (deny client Write) | PlayFab Economy v2 (per-instance StackId, IdempotencyId) |

## Sources

AccelByte "Server-Authoritative Game Logic" · Albion (David Salz, Quo Vadis 2016)
· CCP "Server Technology of EVE" · Azure Event Sourcing pattern · PlayFab Economy
v2 (idempotent transactions) · Namazu Elements Item Ledger · Diablo II v1.09 Item
Format + PureDiablo (fingerprints) · Ars Technica / Gamasutra (D3 integer-overflow
dupe) · Dexerto / PC Gamer (D4 2023 trade dupe) · RuneScape Wiki (party room) ·
Blizzard "Warbands" (account-wide bank). **Uncertainty**: WoW dupe specifics and
PoE2 dupe scope rest on community/forum reports, not official postmortems; some
pattern sources are engineering blogs (illustrative best practice).
