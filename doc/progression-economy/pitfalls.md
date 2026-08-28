# Pitfalls — the 16 classic progression/economy failure modes

Each: symptom → root cause → prevention, with real incidents where
documented. Read before designing; re-read when a balance drifts by
one unit or a retry grants twice. Deep dives:
[progression.md](./progression.md), [wallet-economy.md](./wallet-economy.md),
[energy.md](./energy.md), [battle-pass.md](./battle-pass.md),
[transactions.md](./transactions.md).

## 1. Client-authoritative balances

- **Symptom** — players with 999,999,999 gold; the economy and
  leaderboards destroyed.
- **Root cause** — the balance lives in client memory and the server
  accepts reported values. The Cheat Engine workflow (scan → modify →
  re-scan → pointer scan) is publicly documented and trivial.
- **Prevention** — the client sends **intents** ("buy item 43"),
  never results; the server validates and owns state. Solo games:
  accepted by design for the player's own world, but protect save
  integrity (checksums — `save-persistence`) where achievements or
  leaderboards depend on it.

## 2. Float currency drift

- **Symptom** — balances drifting by units after thousands of
  transactions; audit totals that never reconcile.
- **Root cause** — IEEE-754 can't represent decimals exactly;
  rounding errors accumulate per operation.
- **Prevention** — the absolute rule: **integers in minor units
  (int64)**, decimal conversion at display only (the
  Fowler/Stripe/Modern Treasury pattern, transposed as-is).
  JavaScript contexts: `number` is a float — BigInt or display-only
  formatting.

## 3. Non-atomic spend+grant

- **Symptom** — currency debited but the item never received (crash
  between writes); or granted twice on a network retry.
- **Root cause** — two separate writes without a transaction; retries
  without idempotency keys; or a key regenerated per attempt (a
  documented SDK default trap).
- **Prevention** — one atomic transaction (UGS virtual purchases and
  PlayFab purchases are service-side atomic); an idempotency key
  generated **before the first attempt and reused on every retry**;
  PlayFab's pattern: 14-day key retention, replay returns the
  original result; deterministic `rewardSource-playerId` IDs for
  server grants. Watch the deeper traps: simultaneous-retry races,
  zombie processing-state keys, queue-consumer duplication.

## 4. The live curve-table edit

- **Symptom** — after a balance patch, existing player builds change
  value; stats disagree with saves; community uproar.
- **Root cause** — stat curves are a **contract** with persisted data
  (levels invested, materials spent at the old rates); retroactive
  edits invalidate that history.
- **Prevention** — the observed Genshin policy: **curves immutable
  post-release, balance ships as additive content** (new items,
  new overlays — never edited curves). If a change is unavoidable:
  full retroactive recompute + compensation, or versioned
  grandfathering.

## 5. Energy timestamp exploits & DST bugs

- **Symptom** — full energy by advancing the phone clock; or regen
  broken / players locked out at daylight-saving transitions.
- **Root cause** — regen computed on the device clock; or regen math
  mixing local time and DST.
- **Prevention** — **server timestamps only**, stored as UTC epoch:
  `energy = min(cap, stored + floor((now − last)/interval))`,
  computed on demand, never ticked. The DST incident record is real:
  Lost Ark March 2022 (botched DST rollout, shifted events,
  vendor-confirmed), MapleStory November 2023 (vouchers lost at a
  shifted reset). Same class as `world-time-weather`'s 4 AM bugs.

## 6. Silent cap losses

- **Symptom** — rewards granted to a player at currency/inventory cap
  vanish without a trace; "I lost my gems" support floods.
- **Root cause** — the grant clamps to cap and discards the excess
  with no notification or queue.
- **Prevention** — overflow goes to a **mailbox with explicit
  expiry**, never destroyed; or the grant is refused with a clear
  error. Make overcap waste *visible* (the resin-at-cap display);
  define the saturation behavior per currency as part of its data.

## 7. The single-material bottleneck

- **Symptom** — the XP curve looks right on paper, but players stall
  mid-game because **one** material gates everything; churn spikes
  at one precise breakpoint.
- **Root cause** — cost curves and acquisition rates tuned in
  separate spreadsheets; the sheet computes what *should* happen,
  not what does (interdependent currencies, drop variance,
  suboptimal play).
- **Prevention** — two-stage systemic answer: pre-launch **economy
  simulation** (resource-flow modeling over hundreds of simulated
  hours — Machinations-class tooling) and post-launch **telemetry**
  on real progression rates (time-at-level, material stocks at each
  ascension).

## 8. Aggregation order bugs

- **Symptom** — +10% and +10% give +21% instead of +20% (or the
  reverse); a buff applies to the wrong base; tooltip and combat
  disagree.
- **Root cause** — no written order-of-operations contract. The GAS
  case is canonical: default `((Base + Additive) × Multiplicative) /
  Division`, and **Multiply modifiers SUM within a channel**
  (`×(M1+M2)`, not `×M1×M2`) — a documented gotcha that surprises
  everyone; plus the snapshot-vs-live recalculation question.
- **Prevention** — the contract written and unit-tested as the
  source of record (`final = (base + flat_base) × (1 + Σ%) +
  flat_final` — percentages on base only, the Genshin pipeline);
  in GAS: Evaluation Channels or one central MMC; snapshot vs live
  decided explicitly per buff.

## 9. Respec/refund edge cases

- **Symptom** — a refund after a price drop returns more than was
  spent (arbitrage); partial refunds losing fractions; consumed
  materials not restored.
- **Root cause** — refunds computed from the **current** catalog
  price instead of the price paid; integer division rounding; no
  journal of original transactions.
- **Prevention** — refund **from the append-only ledger** (effective
  cost recorded per transaction); one documented rounding policy;
  refunds in the original currency only, no conversions mid-refund.
  (Built from accounting principles — no single public incident.)

## 10. Battle pass rollover bugs

- **Symptom** — the season ends at different wall times per region;
  missions completed at the reset boundary uncounted; unclaimed
  rewards lost at the rollover.
- **Root cause** — season end expressed in local wall time instead
  of one UTC instant; the claim pipeline separate from the grant
  pipeline.
- **Prevention** — one UTC end instant displayed in local time; a
  grace window at the boundary; **auto-grant earned-but-unclaimed
  rewards** (the Fortnite policy) — and make the rollover
  **idempotent and support-replayable**: the OW2 case (paid tiers
  75–80 never delivered despite the stated policy) and the Apex case
  (claims broken all season, unresolved before the end) are the
  proof.

## 11. Entitlement desync

- **Symptom** — the player paid for the premium track but rewards
  stay locked; interrupted purchase = money taken, nothing received;
  restore-purchases double-grants.
- **Root cause** — receipt-validation races; interrupted consumables
  stuck "entitled but not consumed"; the same pending order handled
  by two callbacks (the verified Unity IAP 5.0.1 iOS double-grant).
- **Prevention** — server-side receipt validation with seen-before
  tracking (one receipt = one grant); boot-time entitlement
  reconciliation (catch interrupted purchases); retroactive grants
  in the same transaction as the entitlement; platform-siloed
  entitlements documented in the design (the Genshin 2.4
  PlayStation-only BP claim case).

## 12. Save-scumming the economy (solo)

- **Symptom** — save before every spend or random drop, reload if
  unlucky; rarity stops meaning anything.
- **Root cause** — the economic state is fully reloadable and the
  RNG rerolls on each load.
- **Prevention** — three graded answers: serialize the RNG state in
  the save (reload replays the same sequence); **commit-on-action**
  (autosave immediately after the outcome — the BotW
  autosave-after-shrine shape; its anti-scum intent is inference);
  or accept it as solo-player freedom. Server-authoritative games
  are immune by construction.

## 13. Big-number overflow

- **Symptom** — a balance stuck or wrapping at 2,147,483,647;
  "rich" players unable to receive anything.
- **Root cause** — currency in int32. **The canonical case**: WoW
  stored money as int32 copper → the historical gold cap
  (214,748g 36s 47c = 2³¹−1 copper), reached by players in January
  2008 (the first was banned on exploit suspicion, then Blizzard
  apologized); at cap, no income source credited at all.
- **Prevention** — **int64 from day one** (9.2×10¹⁸ of headroom);
  big-number/mantissa representations for exponential idle
  economies; explicit application caps below the type limit.

## 14. Data/code version skew

- **Symptom** — after a partial patch, the client reads old tables
  against new server logic (or vice versa): wrong prices displayed,
  deserialization crashes, rejected transactions.
- **Root cause** — data tables and code versioned/deployed
  independently with no handshake.
- **Prevention** — a **table version/hash exchanged at login**;
  reject or force-update on mismatch (Genshin force-updates the
  client before any login, observable every version); UGS implements
  the miniature version (`configAssignmentHash` propagated through
  Cloud Code); Addressables: verify the remote catalog hash at boot
  before any transaction.

## 15. Runaway inflation (faucets > sinks)

- **Symptom** — prices climb relentlessly; new players can't afford
  basics; the soft currency becomes worthless; gold-farming/RMT thrives.
- **Root cause** — faucets (mob gold, quest rewards, vendoring) exceed
  sinks structurally; mudflation devalues old wealth each patch; no
  measurement of net flow. Real case: **Diablo III RMAH** — money
  entered freely with no effective sink → hyperinflation (compounded by
  a gold-dupe and farmers), forcing the AH shutdown.
- **Prevention** — draw the faucet/sink map explicitly and keep net flow
  matched to player/goods growth ([wallet-economy.md](./wallet-economy.md)):
  currency sinks (AH fees, repair, respec, luxury/status goods aimed at
  the rich), material sinks (destruction loops), and **out-compete RMT**
  (a Token/Bond gold-for-time channel) rather than only banning. Measure
  it with a price index and per-currency earn-vs-spend telemetry. Note
  the EVE rule: **destroying items is not a currency sink** (the currency
  was already spent player-to-player).

## 16. Respec / skill-tree refund exploits

- **Symptom** — players respec to arbitrage a buffed-then-nerfed node,
  refund more points/currency than they spent, or lose invested
  materials on a tree reset.
- **Root cause** — refunds computed from the current tree state instead
  of the invested record; no cost recorded per point; synergy/prereq
  invariants not re-validated after a partial refund.
- **Prevention** — record invested cost per node; refund from that
  record (not the live catalog); re-validate prerequisites and mutual
  exclusion after any refund; pick a respec-cost policy deliberately
  (free vs currency vs one-shot item) and gate it server-side. Same
  ledger discipline as currency refunds (#9). See skill trees in
  [progression.md](./progression.md).

## Debugging order

When the economy misbehaves: (1) diff the transaction journal against
balances (#1, #3), (2) grep for float currency types (#2, #13),
(3) replay a grant with the same idempotency key (#3), (4) run the
aggregation tests of record (#8), (5) shift the server clock across
a DST boundary in staging (#5), (6) grant at cap and trace the
overflow (#6), (7) simulate the season rollover twice (#10), (8) buy
the premium track at level 40 and count retroactive grants (#11).

## Ship checklist

```
- [ ] All currencies int64 minor units; zero float money paths
- [ ] Every spend+grant atomic; idempotency keys stored with results
- [ ] Client sends intents only; server validates against tables
- [ ] Curves immutable post-release policy adopted (or migration +
      compensation plan written)
- [ ] Energy regen: server UTC timestamps, lazy recompute, DST
      transition tested both ways
- [ ] Overflow-to-mailbox on every capped currency; nothing silent
- [ ] Aggregation contract written + unit tests of record
- [ ] Refunds computed from the ledger; one rounding policy
- [ ] Season end = one UTC instant; rollover idempotent and
      support-replayable; unclaimed earned rewards auto-granted
- [ ] Receipt validation server-side with seen-before; boot
      entitlement reconciliation
- [ ] Solo: RNG state saved or commit-on-action chosen explicitly
- [ ] Table hash handshake at login; force-update on mismatch
- [ ] Economy telemetry live (progression rates per breakpoint)
- [ ] Faucet/sink map drawn; net flow measured; sinks sized to growth
- [ ] Respec/skill refunds from the invested record; prereqs re-validated
```
