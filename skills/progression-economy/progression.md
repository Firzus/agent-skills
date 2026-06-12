# Progression — curves, XP families, skill trees, prestige

How characters grow. All numbers are **starting points**; flagged gaps at the
bottom. Tagged **[DOC]** documented / **[C]** community-derived.

## The curve-table pattern

- **Shape (verified in Grasscutter code)**: the entity sheet
  (`AvatarExcelConfigData`) holds base stats (`hpBase`, `attackBase`,
  `defenseBase`, crit bases) plus `propGrowCurves` — a list of {stat → curve ID}
  references. The curve sheet maps each level to {curve ID → multiplier}.
  Runtime: `stat(level) = base × curve[level]`. Weapons mirror this per rarity.
- **Why it scales**: curves are *shared data* — a handful serve every character;
  adding a character = base stats + three curve references. Three independent
  community reimplementations (Grasscutter, enka-network, Genshin Optimizer)
  encode the same formula.
- **Explicit per-level tables beat formulas**: auditable, diffable,
  spreadsheet-owned. The growth feel lives in the *costs* (EXP per level spans
  ×550 from first to last step), not the stats (near-linear, ~×8.35 at 90).

## The XP-curve families

Most shipped curves are **power** or **geometric**, not linear. The canonical
families (give exact formulas, never approximate a known one):

- **Pokémon experience groups** **[DOC]** (total XP to reach level n; L100 in
  parens):
  - Fast `⌊4n³/5⌋` (800k) · Medium Fast `n³` (1.0M) · Medium Slow
    `1.2n³−15n²+100n−140` (1,059,860) · Slow `1.25n³` (1.25M) · Erratic
    (piecewise quartic, 600k) · Fluctuating (piecewise, 1.64M). Note Medium Slow
    dips *below* Medium Fast at low levels.
- **D&D 5e thresholds** **[DOC]**: hand-authored table, super-linear early then
  flattening — L2=300, L5=6,500, L10=64,000, L20=355,000; one Epic Boon per
  30,000 XP beyond.
- **RuneScape geometric** **[DOC]**: `xp(L) = ⌊¼·Σ⌊n + 300·2^(n/7)⌋⌋`; L99 =
  **13,034,431**; inter-level cost rises ~10.4%/level (×2 every 7 levels) — "92
  is half of 99". Hard cap 200M XP (virtual L126).
- **WoW level squish** **[DOC]**: cap 120→50 (new cap 60), ~2.4:1 renumber, no
  power loss — a reminder that level *numbers* are display, the power curve is
  the real data.

**Choosing**: pick the family from the desired pacing (cubic for a smooth JRPG
arc, geometric for an MMO grind with a flattening tail), author it as an
explicit table, and tune the *costs* not the stats.

## Stat growth & soft caps

Stat **gains** are often linear per level/point, but **conversion to effect** is
curved to enforce soft caps:

- **PoE resistances** **[DOC]**: default max 75%, hard cap 90%; effective-HP value
  is hyperbolic (each +5% above 75 is a larger %-damage-reduction step).
- **PoE armour** **[DOC]**: `DR = A/(A + 5·hit)` (PoE1; ×10 in PoE2) — depends on
  hit size, strong vs many small hits, capped at 90%.
- **WoW secondary-stat DR** **[DOC]**: percentage brackets where the rating cost
  to gain +1% rises (0–30% none, then +10/20/30/40/50% penalties; 126% hard cap
  from rating alone).
- **Breakpoints**: discrete thresholds (a haste tick, an attack frame) — distinct
  optimization targets from smooth DR.

## Skill trees & talent systems

Topologies: **linear** (early WoW rows), **branching** (Diablo II, Borderlands),
**web** (PoE).

- **PoE passive tree** **[DOC]**: 1,325 nodes (PoE1), shared across classes, ~123
  points; tiers = small (travel) → Notables (named clusters) → Keystones
  (rule-changing, upside + downside). Respec via limited refunds + currency.
- **Diablo II** **[DOC]**: 30 skills/class in 3 tabs; rows gate by level; arrows
  (prerequisites) + **synergies** (points in A passively buff B); max 20 points
  per skill — drives one-tree specialization.
- **WoW talents** **[DOC]**: vanilla 51 points / 3 trees with 31-point capstones;
  Cataclysm cut to 41 (must spend 31 in primary first); Dragonflight returned to
  two point-spend trees.
- Mechanisms to choose: point-buy vs unlock-by-level; mutual exclusion (tier
  choices); keystones/notables as build anchors; respec cost (free vs currency vs
  one-shot item).

## Prestige / paragon / infinite progression

- **Diablo III Paragon** **[C]**: uncapped post-cap levels with rising XP
  (`Level·1.44M + 5.76M` pre-p800, then quadratic); effectively infinite.
- **Diablo IV Paragon** **[DOC]**: capped at 300 (P300 = 24.78B XP, ~1B for the
  last level alone); a 5-board cap curbs power creep.
- **CoD prestige** **[DOC]**: hit max level → reset to 1, relock unlocks (keep a
  permanent token); 10 prestiges → Prestige Master → level to 1,000.
- **Idle prestige loops** **[DOC]**: reset for a permanent multiplier currency,
  almost always a **fractional-exponent** of lifetime currency — Cookie Clicker
  `⌊∛(N/10¹²)⌋` (+1% CpS/chip), AdVenture Capitalist `√(c_L/1.5e11)·2` (+2%/angel).
  Doubling prestige needs ~8× currency (cube root) — the deliberate plateau.

## Mastery / horizontal progression

The "power vs breadth" axis: vertical = raise a ceiling (paragon, pinnacle);
horizontal = widen options at a fixed ceiling (FF job mastery, account-wide
unlocks, RuneScape's 29-skill breadth, **virtual levels** 99→126 as a
power-free milestone overlay). Catch-up mechanics (WoW Chromie Time + squish,
Destiny's soft→Powerful→Pinnacle cap tiers) keep latecomers from an
insurmountable plateau.

## The aggregation contract

The single most important written contract **[DOC, KQM-verified for Genshin]**:

```
final = (base_char + base_weapon) × (1 + Σ%) + Σ flat
```

Percentages apply **to the base only**, never the running total. Damage stacks
further layers multiplicatively (DMG bonus × DEF × RES × amp × crit), with
universal constants (crit 5%/50%, ER 100%). Write it down, unit-test it, never
let two systems disagree. In GAS this is the aggregator with the "Multiply mods
SUM within a channel" gotcha (pitfalls #8).

## Numbers (sourced anchors)

| System | Formula / number | Source |
| --- | --- | --- |
| Pokémon Fast/Med/Slow | 0.8n³ / n³ / 1.25n³ | Bulbapedia |
| RuneScape | L99 = 13,034,431; ×2 / 7 levels | RS Wiki |
| D&D 5e | L20 = 355,000 | PHB |
| PoE res / armour | 75% (90 hard); DR = A/(A+5·hit) | poewiki |
| WoW 2nd-stat DR | brackets to 126% hard cap | Wowhead |
| PoE passive tree | 1,325 nodes (PoE1) | pathofexile.com |
| D4 paragon | cap 300; P300 = 24.78B XP | Icy Veins |
| Cookie Clicker prestige | ⌊∛(N/10¹²)⌋, +1%/chip | CC Wiki |

## Flagged gaps — do NOT invent

D3 paragon quadratic segment & int32 cap are community-reverse-engineered · D4
paragon per-level % and all hours-to-level figures are estimates · PoE2 node
count is datamined and patch-volatile (1,325 PoE1 is official) · exact Genshin
curve-column attribution at level 90 (re-read before quoting).

## Sources

Grasscutter source (AvatarData) · enka-network / Genshin Optimizer (formula
confirmations) · Bulbapedia (Pokémon experience) · RuneScape/OSRS Wiki
(Experience) · D&D PHB/DMG · Blizzard SL pre-patch (squish) · Wowhead (secondary
DR) · poewiki (Resistances, Armour, passive tree) · Arreat Summit (D2 skills) ·
Icy Veins (D4 paragon) · Cookie Clicker / AdVenture Capitalist wikis · KQM TCL
(the aggregation formula).
