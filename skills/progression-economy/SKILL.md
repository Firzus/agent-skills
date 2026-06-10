---
name: progression-economy
description: >-
  Systems architecture blueprint for progression and economy in
  live-service open-world games: stat curve tables (base x curve[level],
  shared curves as data), ascension/breakpoint tables, multi-track
  progression with cross-gating (account/character/weapon/talent), the
  stat aggregation contract (base x (1+%) + flat), multi-currency wallets
  (typed currencies, one-way conversion graphs, paid/earned split,
  caps/overflow/expiry), energy gating with timestamp-based regen,
  battle pass structure (seasons, typed missions, retroactive
  entitlements, idempotent rollover), and the server-authoritative
  transaction model (validate-commit-notify, idempotency keys, int64
  currencies). References: Genshin Impact (datamined + Grasscutter) and
  BotW (the hidden world-level counterpoint). Use when designing or
  building leveling, talents, currencies, energy/stamina systems, battle
  passes, reward grants, or when balances drift, grants duplicate on
  retry, or a curve-table edit breaks live players.
---

# Progression & Economy

Build the progression/economy layer of a live-service game — **systems
architecture, not economy game design** (no gacha, no monetization
design). Primary reference: Genshin Impact (datamined configs + the
Grasscutter server reimplementation as architectural evidence);
counterpoint: BotW (the no-server, materials-as-progression model with
a datamined hidden world level).

## The architecture rule

**Progression is tables, the wallet is a ledger, and the server (or
the save) is the only authority.**

```
PROGRESSION DATA (declarative tables)
  curve tables    stat(level) = base x curveMultiplier[level]
                  curves are SHARED data referenced by name
                  (GROW_CURVE_HP_S4...) — a handful of curves serve
                  dozens of characters; adding one = base stats +
                  3 curve references
  breakpoints     ascension phases as table rows: unlockMaxLevel,
                  addProps[] (flat bonuses), costItems[], the
                  account-rank gate -> final formula:
                  base x curve[lvl] + sum(addProps of phases reached)
  multi-track     account (AR -> world level, a DISTINCT mutable
                  state, not derived) | character (level+ascension) |
                  talents (table-indexed, constellation +3 as an
                  additive index overlay) | weapon | artifacts —
                  each track its own tables, cross-gated
  aggregation     THE written contract: final = (base_char +
                  base_weapon) x (1 + sum%) + sum_flat — percentages
                  apply to BASE only, never the running total

WALLET (a service with a ledger)
  typed currencies + a one-way conversion graph (paid premium ->
  earned premium -> sinks; never backwards) — the paid/earned split
  IS the one-way edge (platform-locked paid, cross-platform earned)
  caps as data; overflow -> mailbox with expiry, never silent loss
  every transaction journaled (append-only); refunds FROM the ledger

ENERGY (a currency with temporal auto-grant)
  { current, cap, regenInterval, nextAddTimestamp } — lazy
  recalculation on read from SERVER time, never a tick loop;
  the client renders a prediction only

TRANSACTIONS (one discipline everywhere)
  client requests intent -> server validates against the tables ->
  commits spend+grant ATOMICALLY -> notifies new state
  idempotency keys stored with the result in the same transaction
  (deterministic IDs for server grants: rewardSource-playerId)
  offline/solo: same atomicity inside the save write
  (save-persistence); currencies in int64 minor units, never float
```

## What the datamines prove

- **The curve-table pattern is real shipped code**: Grasscutter loads
  `AvatarExcelConfigData` (base stats + curve references) and
  computes `base × curveInfos[curveId][level]` exactly; weapons have
  parallel tables per rarity. Curves are immutable post-release
  (observed policy — balance ships as new content, never as
  retroactive curve edits).
- **Server-authoritative is total**: the leaked official server
  binary generates artifacts server-side; every Grasscutter handler
  follows validate→mutate→notify; the resin protocol sends
  `nextAddTimestamp` to the client (timestamp regen, proven).
- **BotW's counterpoint**: no XP — orbs/seeds/materials as
  progression, plus a datamined hidden world level: kill counters
  (`Defeated_*_Num`, capped 10/type) converted to points by a config
  table (`LevelSensor.byml`). Only raw counters are saved; derived
  values recalculate — **minimize persisted derivable state**.

## Build order (4 shippable tiers)

```
Tier 1 — Tables and the contract
- [ ] Curve tables + breakpoint tables as data (spreadsheet-driven
      import pipeline); explicit per-level value tables (auditable)
- [ ] The stat aggregation contract WRITTEN + unit tests of record
      (the +10%+10% question answered once)
- [ ] Multi-track state model with cross-gates as data
- [ ] int64 currencies in minor units; the wallet as balance +
      append-only transaction journal
Tier 2 — Transactions
- [ ] Atomic spend+grant (one transaction; solo: one save write)
- [ ] Idempotency keys: client-generated before first attempt,
      reused on retry; deterministic for server grants; stored with
      the result, TTL'd
- [ ] Validation server-side (or save-side) against the tables —
      the client sends intents, never results
- [ ] Caps + overflow policy (mailbox with expiry) + currency
      expiry as per-instance TTL data
Tier 3 — Energy and seasons
- [ ] Energy as timestamp-regen currency (server clock, UTC epoch,
      lazy recompute, clamp at cap, client predicts only)
- [ ] Consumable energy items (the condensed/fragile/transient
      taxonomy: stored, non-expiring, per-instance-expiring)
- [ ] Battle pass: season defs, level/reward tables per track,
      typed missions reusing the quest objective-event pattern,
      weekly caps, retroactive entitlement on purchase
- [ ] Season rollover idempotent and support-replayable; auto-grant
      unclaimed earned rewards (the Fortnite policy)
Tier 4 — Live operations
- [ ] Data/code version handshake at login (table hash; force
      update on mismatch); live data patching path
- [ ] Receipt validation server-side with seen-before tracking;
      boot-time entitlement reconciliation
- [ ] Economy telemetry (progression rates per breakpoint, material
      stocks at each ascension) + pre-launch flow simulation
- [ ] Anti-cheat layer: rate limits + anomaly detection over the
      transaction journal
```

## Numbers (starting points — sourced anchors)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Character curve | 1→90, 6 ascensions (20/40/.../80), 8,362,650 EXP total, last level ×550 the first; ~2.09M Mora; all-in per character ~7.05M Mora | wiki |
| Ascension table | per phase: 20k→120k Mora, gems 1/3/6/3/6/6 (3:1 tiers), boss 0/2/4/8/12/20, specialty 3/10/20/30/45/60, AR gates 15→50 | wiki |
| Talents | 1→10: 1,652,500 Mora, books 3/2/4/6/9/4/6/12/16, weekly boss mats from 6→7, crown at 10; constellations +3 as index overlay | wiki |
| Account | AR 1→60 (1,880,200 EXP, ×6.5 wall at 55→56); WL0-9 mapping; WL lowerable (distinct state) | wiki |
| Energy | cap 120→160 (1.1)→200 (**4.7**); 1/8 min = 180/day; 0→200 = 26h40 (overnight-safe); costs 20/40/30-then-60; condensed cap 5; transient = per-instance 7-day TTL (since **1.5**) | wiki, corrected |
| Battle pass | **6-week** seasons aligned to versions; 50 × 1,000 BEP; weekly cap 10,000 (daily+weekly; period missions uncapped) = 60k available for 50k needed; 150 primos/level; retroactive claim on purchase | wiki, corrected |
| Currencies | Crystals→Primogems 1:1 one-way (platform-locked → cross-platform); F2P income ~9-13k primos/version (varies); inventory caps 9,999/2,000/99,999 by type | wiki/community |
| Stat constants | crit base 5%/50%, ER base 100%; HP/DEF curve ≈ linear ×8.35 @90 (the exponential growth is in COSTS, not stats) | KQM/wiki |
| BotW | 120 orbs (4/upgrade, 30 upgrades, max-both impossible by design), 441/900 koroks, armor ×4 tiers | wiki |

Flagged — never invent: exact Mora/Primogem caps, BP unclaimed-reward
fate (no primary source), the paid/earned internal storage, weapon
ascension Mora. Full tables in [architecture.md](./architecture.md).

## Engine mapping

| Generic block | Unity 6 | UE5 (5.4+) |
| --- | --- | --- |
| Curve tables | ScriptableObjects from CSV/JSON import scripts; AnimationCurve OK for designer tuning but managed (no Burst/Jobs) — explicit per-level tables for contractual curves | **CurveTable** from CSV (native) + **FScalableFloat** = `Value × Curve[Level]` — literally the Genshin pattern, native in GAS; DataRegistry for async/override access |
| Aggregation | Hand-rolled pipeline + tests | GAS aggregators: `((Base+Additive)×Multiplicative)/Division`; **Multiply mods SUM within a channel** (the classic gotcha); custom order = Evaluation Channels or one MMC |
| Wallet backend | **UGS Economy** (currencies with native max balance, atomic virtual purchases, receipt validation, `configAssignmentHash`; 60 req/player/min; AAA maturity unproven — flagged) or PlayFab Economy v2 (**native idempotency: 14-day IdempotencyId replay**) or custom | **No first-party economy** (EOS has none game-side — confirmed); PlayFab/Nakama/AccelByte or custom backend + dedicated server (the AAA pattern); Lyra ships inventory fragments but NO XP/progression |
| Live data patching | Addressables Remote Catalog + Update Previous Build (keep `addressables_content_state.bin`) | DataTable/CurveTable repacks; GameFeature plugins for additive content |
| Server logic | Cloud Code (server-time anti-cheat pattern documented; validation lives there, not in the client) | Dedicated server + database |
| Numeric | `long` minor units; BigInt display-only in JS contexts | int64; caps below type limits |

## Failure modes

The 14 classic progression/economy bugs (client-authoritative
balances, float drift, non-atomic spend+grant, the live curve-table
edit, energy timestamp exploits and DST bugs, silent cap losses, the
single-material bottleneck, aggregation order bugs, refund edge cases,
battle pass rollover bugs, entitlement desync, save-scumming,
int32 overflow — the WoW gold cap —, data/code version skew) are
cataloged in [pitfalls.md](./pitfalls.md) with symptom → root cause →
prevention and real incidents.

## Related skills

- `save-persistence` — atomic save writes for solo transactions;
  server-authoritative model; minimal persisted derivable state.
- `world-time-weather` — the 4 AM reset class; UTC discipline for
  regen and season boundaries.
- `quest-system` — typed objective events reused by BP missions;
  idempotent reward grants.
- `loot-drop-system` — claims spend the energy currency defined here;
  shares the idempotent-grant discipline.
- `inventory-equipment` — item stats ride these curve tables; the stat
  aggregation pipeline recomputes on equip.
- `coop-session` — reuses the server-authoritative transaction model
  and idempotency keys for every network op.
- `hud-system` — wallet/energy display contracts (client predicts,
  server owns).
- `game-architecture-patterns` — Type Object (currency/item defs),
  Event Queue (transaction notifications).
