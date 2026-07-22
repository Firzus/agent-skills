# Tables — layered weights, treasure classes, gating, modifiers

How a drop is rolled. All numbers are **starting points**; flagged gaps at the
bottom. Tagged **[DOC]** documented / **[WIKI]** community wiki (often
file-derived) / **[DATA]** datamined estimate.

## The canonical structure

- **A table is a bucket of weighted entries** — integer weights, not
  percentages (sum the weights, roll in [1..sum]); the **null entry** ("nothing
  drops") is a first-class weighted row; quantity ranges per entry; an entry can
  reference **another table** (recursive roll). (Lostgarden/Game Developer is the
  industry reference; Diablo II's Treasure Classes are the genre canon.)
- **Guaranteed slots stack alongside chance slots**: BotW's enemy tiers don't
  raise drop percentages — a Silver Bokoblin *adds* tables of 100%-guaranteed
  rolls. Genshin's boss gems roll in two independent passes. Multiple independent
  rolls per kill is the shipped norm.
- **Shared sub-tables kill drift**: common sub-tables (`CommonOres`,
  `RegionalHerbs`) referenced by many parents with thin regional overrides —
  UE5's Composite DataTables implement exactly this.

## Recursive treasure classes (Diablo II — the depth reference)

Diablo II's `TreasureClassEx.txt` is the canonical deep loot system **[WIKI]**:

- **Recursive TCs**: every drop pool is a Treasure Class; a TC entry can point to
  another TC, resolved recursively until a concrete item is picked (Baal (H) →
  Act 5 (H) Equip → narrower sub-TCs). v1.10 has 29 weapon + 29 armor TCs.
- **Picks**: how many drop attempts the TC makes. Normal monsters = 1 pick; act
  bosses = **7 picks**. Negative Picks = deterministic guaranteed sub-pulls.
- **NoDrop = the multiplayer scaling lever**: a weighted "nothing" entry. Per
  pick, chance of any item = `ΣProb / (NoDrop + ΣProb)`. The NoDrop weight
  **shrinks with player count**:
  `NewNoDrop = int(ProbSum / (1/((NoDrop/(NoDrop+ProbSum))^N) − 1))`, where
  `N = int(1 + AdditionalPlayers/2 + ClosePartiedPlayers/2)`. More players →
  NoDrop collapses → near-guaranteed drops. **Crucially, player count raises drop
  *frequency*, not item *quality*.**

## ilvl / mlvl gating

Item eligibility is gated by level **[WIKI]**:

- **Diablo II**: `ilvl = monster level (mlvl)`; item type has `qlvl`; the quality
  check uses `Chance = (BaseChance − (ilvl−qlvl)/Divisor)` — higher mlvl over qlvl
  = better odds. Hell Baal ilvl 99.
- **Diablo IV**: Item Power tiers gated by World Tier (Sacred WT3, Ancestral
  WT4); Mythics drop from level 55+ enemies but are boss-farmed (~0.5% generic
  endgame boss [DATA]).
- This is the same idea as PoE's ilvl-gated affix tiers (see
  `inventory-equipment` gear-generation): the *source level* bounds what can roll.

## Drop-rate modifiers — magic find & rarity/quantity

- **Diablo II Magic Find** **[WIKI]**: biases the *quality upgrade* chain
  (Unique > Set > Rare > Magic, checked in order, success stops the chain), not
  which base drops. **Diminishing returns**: effective MF =
  `floor(Factor·MF/(Factor+MF))`, Factor 250 Unique / 500 Set / 600 Rare. ~167 MF
  ≈ 2× uniques; 1000 MF ≈ 3×. **Over-MF can mathematically reduce lower tiers**
  (the Unique check passes first).
- **PoE Increased Rarity (IIR) / Quantity (IIQ)** **[WIKI]**: IIR raises the
  chance a drop is magic/rare/unique; IIQ raises the *number* of drops. Player
  mods are additive-within-category with diminishing returns; party + monster
  mods are additive without DR and stack *multiplicatively* with the player
  total. Each party member ≈ +10% IIQ / +40% IIR (other drops); only the
  killing-blow player's quantity counts.
- **D3 post-Loot-2.0 MF** **[COMM]**: applies 100% to blue, 30% to yellow, 10% to
  legendary — difficulty (Torment) is the dominant lever, not MF.

## Conditionality — three mechanisms

1. **Condition fields in entries** — the industry default; scales poorly (the
   100-condition table).
2. **Table selection by context** (BotW): the *death mode* picks the table —
   `Normal`, `Iced`, `Burnout` (frozen kill drops frozen meat), per-ammo tables.
   The conditional lives in the table *name*, legible to designers.
3. **Actor substitution** (both games): BotW tiers (Red→Silver) are *different
   actors* with their own bdrops (with the consequence that low-tier items go
   **extinct** late-game — a real trade-off); Genshin ships multiple monster IDs
   (a quest variant without drops vs the overworld variant).

Prefer (2) + (3): data-driven, auditable, no condition spaghetti.

## Scaling without editing tables

Genshin's model **[WIKI]**: reward tiers are a piece-wise function of enemy level
(one tier per 5 levels); World Level just moves enemies across tiers. Probability
and material tier scale (masks 16.81% → 42.02%; tier-2 at 40+, tier-3 at 60+);
**quantity stays flat**. Scaling is a layer *over* the tables, never an edit *of*
them.

## The two datamined formats

- **BotW bdrop**: per-actor file with named tables; each table = `RepeatNumMin/Max`
  (roll count) + item/probability pairs whose probabilities **must sum to 100.0**
  (broken sums silently fail drops), plus scatter params (`ApproachType`,
  `OccurrenceSpeedType`) — the physicalization is table data.
- **Grasscutter (Genshin)**: per-monster entries with `minCount/maxCount` and
  **weight windows on a 0–10,000 scale** (`minWeight/maxWeight` — one roll
  partitioned into intervals).

## The WYSIWYG drop

BotW's held weapons ARE the drop (the equipment is a world actor, not a table
entry) — visible loot, zero surprise. Worth one design line: separate "carried
equipment drops" from "table drops".

## Numbers (sourced anchors)

| Parameter | Value | Anchor |
| --- | --- | --- |
| BotW bdrop | probabilities sum to 100.0 per table; RepeatNumMin/Max | datamine |
| Grasscutter | weight windows 0–10,000 + min/maxCount | datamine |
| D2 act-boss picks | 7 | wiki |
| D2 NoDrop exponent | N = int(1 + AddPlayers/2 + CloseParty/2) | wiki |
| D2 MF factors | 250 Unique / 500 Set / 600 Rare | wiki |
| PoE party per-member | +10% IIQ / +40% IIR (other), +50% IIQ (currency) | poewiki |
| Genshin tier scaling | mask 16.81% → 42.02%; tier-2 @40+, tier-3 @60+ | wiki |

## Flagged gaps — do NOT invent

The fine structure of newer `DropTableExcelConfigData` · exact PoE base
drop-any % (league-dependent, ~8–16% estimate) · most ARPG drop % are
datamined/aggregated, not vendor-published — treat as estimates.

## Sources

zeldamods (DropTable/bdrop) · MrCheeze all_drops dump · Grasscutter (Drop.json) ·
Genshin Fandom (Loot System, Material Drop Distribution) · Lostgarden (Daniel
Cook) / Game Developer (loot best practices) · d2mods.info Phrozen Keep
(TreasureClassEx, KB#410) · PureDiablo / diablowiki (Item Generation, MF
diminishing returns) · poewiki / poedb (Drop rate, IIR/IIQ) · Blizzard 2.0.1
(D3 smart loot / MF).
