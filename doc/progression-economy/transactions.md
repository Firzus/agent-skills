# Transactions — server authority, idempotency, anti-cheat

One discipline everywhere: the server (or the save) is the only authority. All
numbers are **starting points**.

## The flow

```
client sends INTENT ("buy item 43")
  → server validates against the tables (currency? materials? gates?)
  → commits spend+grant in ONE atomic transaction
  → notifies the new state
```

No client balance math is ever truth. Evidence: every Grasscutter packet handler
follows validate→mutate→notify; the official server generates items server-side;
reward handlers keep a `rewardedLevels` set as the anti-double-claim guard.

## Idempotency

The PlayFab-documented pattern:

- A key generated **client-side before the first attempt** and reused on every
  retry; stored with the result in the same transaction (unique constraint);
  replay returns the original response.
- **Deterministic IDs for server grants** (`rewardSource-playerId`) so a
  server-initiated grant can't double-apply.
- A payload hash to reject key reuse with a different body; TTL retention (14 days
  in PlayFab).
- **Advanced traps**: simultaneous-retry races (use INSERT ON CONFLICT), zombie
  "processing" keys (a sweeper), and queue-consumer duplication below a clean HTTP
  layer (the handler must be idempotent independently).

## int64 minor units

- **Integers in minor units (int64)**, decimal conversion at display only (the
  Fowler/Stripe/Modern Treasury pattern). Never float — IEEE-754 can't represent
  decimals exactly and rounding errors accumulate (pitfalls #2).
- **int64 from day one** (9.2×10¹⁸ headroom). The canonical failure: WoW stored
  money as int32 copper → the 214,748g gold cap, reached Jan 2008, at which point
  no income credited at all (pitfalls #13). Idle/exponential economies need
  big-number/mantissa representations.
- JavaScript contexts: `number` is a float — use BigInt or display-only
  formatting.

## Anti-cheat economics

- Every progression write validated server-side against the tables; the client
  sends intents, never results.
- Rate limiting + anomaly detection layered over the transaction journal (the
  append-only ledger is the audit surface).
- The Cheat Engine workflow (scan → modify → re-scan → pointer scan) is publicly
  documented and trivial against client-authoritative balances — assume it.

## The offline/solo adaptation

The same discipline locally:

- Spend + grant written atomically **inside one save write** (`save-persistence`
  temp-then-rename) — never an intermediate "materials debited, level not raised"
  state.
- For solo RNG and economy: serialize the RNG state in the save (reload replays
  the same sequence) or commit-on-action (autosave immediately after the
  outcome), or accept save-scumming as solo freedom (pitfalls #12).
- BotW's no-server defense: persist raw counters only, derive everything else.

## Data/code version handshake

A table version/hash exchanged at login; reject or force-update on mismatch
(Genshin force-updates the client before any login). UGS implements the miniature
version (`configAssignmentHash` propagated through Cloud Code); with Addressables,
verify the remote catalog hash at boot before any transaction (pitfalls #14).

## Engine mapping

| Generic block | Unity 6 | UE5 (5.4+) |
| --- | --- | --- |
| Atomic purchase | UGS virtual purchases / PlayFab (service-side atomic) | dedicated server + DB transaction |
| Idempotency | PlayFab 14-day IdempotencyId; UGS Cloud Code | server-side key store |
| Validation | Cloud Code (server-time anti-cheat pattern) | dedicated server logic |
| Numeric | `long` minor units | int64; caps below type limits |
| Version handshake | Addressables remote catalog hash; `configAssignmentHash` | DataTable/CurveTable repack version |

## Sources

Grasscutter (packet handlers, reward sets) · Microsoft Learn (PlayFab Economy v2
idempotent transactions) · Unity docs (UGS Economy, Cloud Code server-time
anti-cheat) · Modern Treasury / Stripe (minor units) · WoW int32 gold-cap history.
