---
name: progression-economy
description: >-
  Systems architecture blueprint for progression and economy in live-service
  and single-player games: stat curve tables (base × curve[level], shared
  curves as data) and the XP-curve families (Pokémon experience groups,
  RuneScape's geometric curve, D&D thresholds, prestige/paragon infinite
  progression), skill trees and soft caps / diminishing returns, the stat
  aggregation contract, multi-currency wallets and the live-ops economy
  discipline (faucets vs sinks, inflation control, the in-house economist,
  player-driven markets, wealth concentration), energy gating with
  timestamp-based regen, battle-pass and season models across the industry
  (net-positive currency earn-back, FOMO-expiry vs never-expires, retroactive
  entitlements, idempotent rollover), and the server-authoritative transaction
  model (validate-commit-notify, idempotency keys, int64 currencies). References:
  Genshin (datamined + Grasscutter), EVE Online (the economist's craft), WoW,
  RuneScape, Diablo, Fortnite, Helldivers 2, with Unity 6 / UE5 mappings. Use
  when designing or building leveling, XP curves, talents/skill trees, prestige,
  currencies, economy balance, energy/stamina, battle passes, reward grants, or
  when balances drift, grants duplicate on retry, the economy inflates, or a
  curve-table edit breaks live players.
---

# Progression & Economy

Build the progression/economy layer — **systems architecture plus the live-ops
economy discipline** (not monetization ethics or gacha-pull psychology, which
live in `loot-drop-system`). Primary references: Genshin Impact (datamined
configs + the Grasscutter server reimplementation as architectural evidence),
EVE Online and WoW (the virtual-economy management craft), plus the broad
RPG/MMO/idle canon for curve and skill-tree patterns. Counterpoint: BotW (the
no-server, materials-as-progression model with a datamined hidden world level).

## The architecture rule

**Progression is tables, the wallet is a ledger, and the server (or the save)
is the only authority.**

```
PROGRESSION   stat(level) = base × curve[level]; curves are SHARED data;
              breakpoints/ascension as table rows; multi-track, cross-gated;
              the written aggregation contract
WALLET        typed currencies + a one-way conversion graph; a ledger, not a
              number; faucets vs sinks balanced to control money supply
ENERGY        a currency with temporal auto-grant; lazy recompute from server
              time, never a tick loop
TRANSACTIONS  client requests intent → server validates → commits spend+grant
              ATOMICALLY → notifies; idempotency keys; int64 minor units
```

## Reference map

| File | Covers |
| --- | --- |
| [progression.md](./progression.md) | Curve tables (the Grasscutter-proven pattern), the XP-curve families (Pokémon groups, RuneScape geometric, D&D, WoW squish) with exact formulas, stat growth and soft caps / diminishing returns, skill trees (linear/branching/web, PoE passive tree, respec), prestige/paragon infinite progression, mastery/horizontal progression, the aggregation contract |
| [wallet-economy.md](./wallet-economy.md) | The wallet-as-ledger, the one-way conversion graph, caps/overflow/expiry, AND the live-ops economy: faucets vs sinks, inflation/deflation and real cases, the in-house economist (EVE, Valve), player-driven markets, currency design (hard/soft/bound), wealth concentration and luxury sinks |
| [energy.md](./energy.md) | Energy as timestamp-regen currency, the datamined resin model, the consumable taxonomy, DST/clock discipline |
| [battle-pass.md](./battle-pass.md) | Season structure across the industry, the net-positive currency earn-back pattern, FOMO-expiry vs never-expires models, XP/challenge systems and weekly caps, retroactive entitlements, idempotent rollover (the OW2/Apex incidents), the Dota 2 revenue evidence |
| [transactions.md](./transactions.md) | The server-authoritative flow, idempotency keys and their advanced traps, int64 minor units, anti-cheat, the offline/solo adaptation |
| [pitfalls.md](./pitfalls.md) | 16 failure modes (symptom → cause → prevention) with real incidents (WoW int32 gold cap, D3 RMAH inflation, Lost Ark DST), debugging order, ship checklist |

## What the datamines prove

- **The curve-table pattern is real shipped code**: Grasscutter loads
  `AvatarExcelConfigData` (base stats + curve references) and computes
  `base × curveInfos[curveId][level]` exactly. Curves are immutable
  post-release (balance ships as new content, never as retroactive edits).
- **Server-authoritative is total**: the leaked official server generates
  artifacts server-side; every handler follows validate→mutate→notify; the
  resin protocol sends `nextAddTimestamp` (timestamp regen, proven).
- **BotW's counterpoint**: no XP — orbs/seeds/materials as progression, plus a
  datamined hidden world level (kill counters → points via `LevelSensor.byml`).
  Only raw counters are saved; derived values recalculate — **minimize persisted
  derivable state.**

## Build order (4 shippable tiers)

```
Tier 1 — Tables and the contract
- [ ] Curve + breakpoint tables as data; explicit per-level value tables
- [ ] The stat aggregation contract WRITTEN + unit tests of record
- [ ] Multi-track state model with cross-gates as data
- [ ] int64 currencies in minor units; wallet = balance + append-only journal
Tier 2 — Transactions and the economy
- [ ] Atomic spend+grant (one transaction; solo: one save write)
- [ ] Idempotency keys (client-generated before first attempt, reused on retry)
- [ ] Server-side validation against the tables (client sends intents only)
- [ ] Faucet/sink map drawn; caps + overflow (mailbox with expiry)
Tier 3 — Energy and seasons
- [ ] Energy as timestamp-regen currency (server UTC clock, lazy recompute)
- [ ] Battle pass: season defs, reward tables, typed missions, weekly caps,
      retroactive entitlement, idempotent + replayable rollover
Tier 4 — Live operations
- [ ] Data/code version handshake at login (table hash)
- [ ] Receipt validation server-side; boot-time entitlement reconciliation
- [ ] Economy telemetry (progression rates, material stocks, faucet/sink flow)
      + pre-launch flow simulation
- [ ] Anti-cheat: rate limits + anomaly detection over the journal
```

## Key numbers (starting points — sourced anchors)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Genshin character curve | 1→90, 6 ascensions, 8,362,650 EXP; ~7.05M Mora all-in | wiki |
| Pokémon XP groups | Fast 0.8n³ / Medium n³ / Slow 1.25n³ (L100 totals) | Bulbapedia |
| RuneScape XP | L99 = 13,034,431; ~+10.4%/level (×2 per 7 levels) | RS Wiki |
| D&D 5e | L20 = 355,000 XP (hand-authored, super-linear early) | PHB |
| PoE passive tree | 1,325 nodes; resistances cap 75% (90% hard) | poewiki |
| D4 paragon | capped 300; P300 = 24.78B XP | Icy Veins |
| Genshin energy | cap 200 (4.7); 1/8 min = 180/day; 0→200 = 26h40 | wiki |
| EVE economy | faucets (NPC bounties) historically >3× all sinks combined → inflation | CCP QEN |
| Fortnite XP | 80,000 XP/level flat; L100 ≈ 8M, L200 = 16M | fortnite.gg |
| WoW gold cap | int32 copper → 214,748g (reached Jan 2008) | history |

Full sourced tables (with flagged "do-not-invent" gaps) in each reference file.

## Engine mapping (summary)

| Generic block | Unity 6 | UE5 (5.4+) |
| --- | --- | --- |
| Curve tables | SO from CSV/JSON import; explicit per-level tables for contractual curves | **CurveTable** + **FScalableFloat** = `Value × Curve[Level]` — the Genshin pattern, native in GAS |
| Aggregation | hand-rolled pipeline + tests | GAS aggregators (Multiply mods SUM within a channel — the gotcha); custom order via MMC |
| Wallet backend | UGS Economy / PlayFab v2 (14-day IdempotencyId) / custom | no first-party economy (PlayFab/Nakama/custom + dedicated server) |
| Server logic | Cloud Code (validation lives here, not the client) | dedicated server + database |
| Numeric | `long` minor units | int64; caps below type limits |

Full detail in [transactions.md](./transactions.md) and the reference files.

## Related skills

- `save-persistence` — atomic save writes for solo transactions; minimal
  persisted derivable state.
- `world-time-weather` — the 4 AM reset class; UTC discipline for regen/seasons.
- `quest-system` — typed objective events reused by BP missions; idempotent grants.
- `loot-drop-system` — claims spend the energy currency; shares the
  idempotent-grant discipline; owns drop-rate pity/perception.
- `inventory-equipment` — item stats ride these curve tables; the aggregation
  pipeline recomputes on equip.
- `coop-session` — reuses the server-authoritative transaction model and
  idempotency keys.
- `hud-system` — wallet/energy display contracts (client predicts, server owns).
- `game-architecture-patterns` — Type Object (currency/item defs), Event Queue
  (transaction notifications).
