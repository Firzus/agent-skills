# Architecture — tables, wallet, energy, battle pass, transactions

The components of a production progression/economy system. All numbers
are **starting points — tune by playtest**; flagged gaps at the
bottom. Primary sources: the Genshin Excel-config datamines via
Grasscutter source code (the open reimplementation), enka-network and
Genshin Optimizer (independent confirmations of the formulas), the
leaked official server reverse-engineering, zeldamods (BotW's
LevelSensor), Fandom wiki tables, PlayFab/UGS official docs.

## Progression data

### The curve-table pattern

- **Shape (verified in Grasscutter code)**: the entity sheet
  (`AvatarExcelConfigData`) holds base stats (`hpBase`, `attackBase`,
  `defenseBase`, crit bases) plus `propGrowCurves` — a list of
  {stat → curve ID} references. The curve sheet
  (`AvatarCurveExcelConfigData`) maps each level to a dictionary of
  {curve ID → multiplier}. Runtime: `stat(level) = base ×
  curve[level]`. Weapons mirror this with per-rarity curves.
- **Why it scales**: curves are *shared data* — a handful of curves
  serve every character; adding a character = base stats + three
  curve references. Three independent community reimplementations
  (Grasscutter, enka-network, Genshin Optimizer) encode the same
  formula — the architecture is unambiguous.
- **Explicit per-level tables beat formulas**: auditable, diffable,
  spreadsheet-owned. The growth feel lives in the *costs* (EXP per
  level spans ×550 from first to last step), not the stats (HP/DEF
  multipliers are near-linear, ~×8.35 at 90).

### Breakpoints (ascension)

Per-phase table rows: `unlockMaxLevel`, `addProps[]` (flat bonuses,
including the character's ascension stat), `costItems[]`, `coinCost`,
`requiredPlayerLevel` (the account-rank gate). Final formula:

```
finalBase(level, ascension) = base × curve[level]
                            + Σ addProps(phases ≤ ascension)
```

Tiered progression is *entirely declarative* — one table row per
phase. The standard cost shape (per phase, 1→6): Mora 20k→120k, gems
1/3/6/3/6/6 (3:1 tier conversion), boss materials 0/2/4/8/12/20,
regional specialty 3/10/20/30/45/60, common mobs by tier — totals
420k Mora, 46 boss mats, 168 specialties for 1→90.

### Multi-track with cross-gating

- **Account**: AR 1→60 (1,880,200 EXP; a deliberate ×6.5 wall at
  55→56); **World Level is a distinct mutable state**, not a derived
  function — even ranks auto-promote, odd ranks require an ascension
  quest, and players can lower WL (proof the enemy scaling reads a
  state variable).
- **Character**: level + ascension (AR-gated). **Talents**: 1–10
  table-indexed (multipliers per level in `ProudSkillExcelConfigData`
  param lists), ascension-gated per level, weekly-boss mats from 6→7,
  a crown at 10; constellations add +3 as an **additive overlay on
  the level index** — the multipliers stay in the table.
- **Weapon**: level + ascension + refinement, per-rarity EXP curves
  (5★ 9.06M / 4★ 6.04M / 3★ 3.99M — a clean ×1.5 ladder).
- **Artifacts** (stat pipeline only): main stat + substats + set
  bonuses, all table data; the leaked server binary shows artifact
  *generation* is fully server-side — the client only displays.
- **The aggregation contract** (KQM-verified):
  `final = (base_char + base_weapon) × (1 + Σ%) + Σ flat` —
  percentages apply **to the base only**. Damage stacks further
  layers multiplicatively (DMG bonus × DEF × RES × amp × crit), with
  universal constants: crit 5%/50%, ER 100%. Write this contract
  down; test it; never let two systems disagree on it.

### The BotW counterpoint

No XP, no levels: hearts/stamina from orbs (4 per upgrade, 120 total,
maxing both impossible by design — a permanent choice), inventory
slots from koroks (441 needed of 900), armor tiers from materials +
rupees. And yet a **hidden world level exists** (datamined): kill
counters per enemy type (capped at 10), converted to points by
`LevelSensor.byml` (flag→points + thresholds swapping enemy/weapon
variants). Only the raw counters persist; points recalculate on load.
Two lessons: even "no-level" games ship a data-driven world level;
and **persist raw counters, derive the rest**.

## The wallet

- **Taxonomy + one-way conversion graph**: paid premium (Genesis
  Crystals — platform-locked) → earned premium (Primogems —
  cross-platform) at 1:1, irreversible; earned premium → sinks
  (fates, energy refills, BP levels); wish byproducts
  (Stardust/Starglitter) → shop. Soft currency (Mora) and materials
  never convert upward. **The one-way edge IS the paid/earned
  split** — motivated by revenue recognition and reconciliation
  (GAAP/IFRS: revenue recognized on consumption), not by a universal
  legal mandate (phrase it as accounting/regulatory-motivated).
- **The wallet is a ledger**: server-side balances + an append-only
  transaction journal. Refunds compute **from the journal** (price
  paid), never from the current catalog; one rounding policy,
  documented; refund in the original currency only.
- **Caps, overflow, expiry as data**: native max-balance per
  currency; overflow → mailbox with explicit expiry (the
  1,000-capacity mail with attachments pattern), never silent loss;
  event currencies expire wholesale; per-instance TTLs exist
  (Transient Resin: each batch expires 7 days after the following
  Monday — an item-currency with per-instance TTL).
- Inventory caps by category (9,999 general / 2,000 boss mats /
  99,999 ores-books) — caps are tuning data, not constants.

## Energy

**Energy is a currency with temporal auto-grant.** The datamined
model: `{ current, cap, regenIntervalSec, nextAddTimestamp }` —
Grasscutter's ResinManager stores `nextAddTimestamp` on the player
and the network protocol sends it to the client. Recompute lazily on
every read/spend from **server clock in UTC epoch**; clamp at cap
(regen timer only runs below cap); the client renders a prediction
only. Offline regen is free by construction (it's arithmetic, not a
loop).

Parameters (corrected): cap 120 (1.0) → 160 (1.1) → **200 (4.7)**;
1 per 8 min = 180/day; 0→200 = 26 h 40 (the overnight-safe
rationale); costs: domains/ley lines 20, normal bosses 40, weekly
bosses 30 for the first 3 then 60 (since 1.5 — **no 5.x cost
reductions exist**). The consumable taxonomy: Condensed (banked
energy, cap 5, doubles a run), Fragile (+60, never expires),
Transient (+60, per-instance TTL, since **1.5**). Primo refills use
escalating prices (50→200, 6/day) — friction as data. One design
line: energy smooths sessions and server load; everything else here
is the data model.

## Battle pass

- **Structure (corrected)**: **6-week seasons aligned to versions**
  (not 10); 50 levels × 1,000 BEP (= 50k; weekly caps allow ~60k —
  a deliberate ~20% buffer); three tracks (free / paid / paid+10
  levels); level purchase 150 primos; unlock at AR 20.
- **Missions are typed objectives** — the `quest-system`
  objective-event pattern reused: daily (reset 04:00), weekly
  (Monday 04:00, **the 10k weekly cap covers daily+weekly only**),
  and "this period" missions (uncapped, event/abyss-linked).
  In-progress weeklies carry over version boundaries.
- **The data model (materialized by Grasscutter)**: `SeasonDef {id,
  start, end}` · `LevelRewardTable[level][track]` · `MissionDef
  {type, objectiveEvent, target, bepReward, refreshType,
  countsTowardWeeklyCap}` · `PlayerBPState {seasonId, exp, level,
  trackEntitlement, claimedRewards[], missionProgress[]}` — the
  server's `triggerMission` increments progress; `takeReward`
  validates and delivers server-side.
- **Entitlements**: buying the paid track mid-season unlocks claims
  for **all previously reached levels** (retroactive grant in one
  transaction); purchases don't carry across seasons; receipt
  validation server-side with seen-before tracking (one receipt =
  one grant); platform-siloed entitlements are a real shipped
  constraint (the Genshin 2.4 PlayStation BP case) — document
  platform rules in the track design.
- **Rollover**: unclaimed rewards reportedly lost at season end (a
  reminder mail exists; no primary HoYoverse statement — flagged).
  The reference policy is Fortnite's **auto-grant on next login**;
  the OW2/Apex incidents (paid tiers never delivered, claims broken
  all season) prove the rollover must be **idempotent and
  support-replayable**.

## The transaction model

- **The flow**: client sends an *intent* ("buy item 43") → server
  validates against the tables (currency? materials? gates?) →
  commits spend+grant in **one atomic transaction** → notifies the
  new state. No client balance math is ever truth. Evidence: every
  Grasscutter packet handler follows this; the official server
  generates items server-side; reward handlers keep a
  `rewardedLevels` set as the anti-double-claim guard.
- **Idempotency** (the PlayFab-documented pattern): a key generated
  client-side *before the first attempt* and reused on every retry;
  stored with the result in the same transaction (unique
  constraint); replay returns the original response; **deterministic
  IDs for server grants** (`rewardSource-playerId`); payload hash to
  reject key reuse with a different body; TTL retention (14 days in
  PlayFab). Advanced traps: simultaneous-retry races (INSERT ON
  CONFLICT), zombie "processing" keys (sweeper), and queue-consumer
  duplication below a clean HTTP layer.
- **Anti-cheat economics** (one line): every progression write
  validated server-side against the tables; rate limiting + anomaly
  detection layered on the journal.
- **Offline/solo adaptation**: the same discipline locally — spend +
  grant written atomically *inside one save write*
  (`save-persistence` temp-then-rename); never an intermediate
  "materials debited, level not raised" state. BotW's no-server
  defense: persist raw counters only, derive everything else.

## Flagged gaps — do NOT invent

Exact Mora/Primogem caps (contradictory or absent sources) · the
official fate of unclaimed BP rewards (convergent wikis, no primary
source) · HoYoverse's internal paid/earned storage (the platform
lock is the observable signal) · weapon ascension Mora (uncollected)
· the "curves immutable post-release" policy (observed via stable
datamines, never declared) · UGS Economy's AAA maturity (no public
shipped-title list) · BotW autosave-as-anti-scum motivation
(inference) · exact curve-column attribution at level 90 (8.349 vs
8.739 HP/ATK labeling — re-read before quoting).

## Sources

Grasscutter source (AvatarData, ResinManager, BattlePassManager,
packet handlers) · enka-network-api + Genshin Optimizer (independent
formula confirmations) · hope1ess (leaked official server RE —
artifacts) · ambr/PaiGramTeam data models · zeldamods (Difficulty
scaling, LevelSensor.byml) + leoetlino RE notes · Fandom wiki
(Character EXP, Talent Materials, Adventure Rank, Original/Transient
Resin, Battle Pass, Currency, Genesis Crystal, Mail, Inventory) ·
KQM TCL (the damage/stat formula) · Microsoft Learn (PlayFab Economy
v2 idempotent transactions) · Unity docs (UGS Economy, Cloud Code
server-time anti-cheat, Addressables Remote Catalog) · Epic docs
(DataTable/CurveTable, FScalableFloat, Data Registry) ·
GASDocumentation (tranek) · Modern Treasury/Stripe (minor units) ·
Zelda Dungeon (orbs, koroks) · Nintendo official guide.
