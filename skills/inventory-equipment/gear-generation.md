# Gear generation — RNG pipelines, affixes, crafting

How items get their stats. Two traditions: the **gacha weighted-draw pipeline**
(Genshin, fully datamined) and the **ARPG affix system** (PoE/Diablo/Last Epoch).
Both reduce to weighted data tables. All numbers are **starting points**; flagged
gaps at the bottom.

## The gacha pipeline — the datamined 4-draw (Genshin)

The leaked-server RE (hope1ess) + wiki tables document the full generator. Four
weighted draws, all data:

1. **Slot** — from the source's drop table.
2. **Main stat** — weighted pick over the per-slot pool (`weightSelectOne` on
   leaked tables): flower/plume fixed (HP/ATK flat 100%); sands 1334/1333/1333/
   500/500 (≈26.7% HP%/ATK%/DEF%, 10% ER/EM); goblet 770/770/760 + 8×200
   elemental/phys DMG + 100 EM (the Dendro 3.0 addition rebalanced HP%/ATK% from
   21.25 to 19.25% — pools are *versioned data*); circlet 3×1100 + 3×500 + 200.
   The RE also surfaces a **main-stat pity** (per-depot counts forcing a stat
   after N misses) — plausible interpretation, flagged.
3. **Initial substat count** — by source: 20% four-liners from domains, 34% from
   bosses/strongbox, the rest three-liners.
4. **Each substat** — weighted pick from the remaining pool (main stat and
   present substats excluded): flat HP/ATK/DEF = 6, percentages/EM/ER = 4, crit
   rate/DMG = 3 (pool total 44). **Value** = one of 4 equiprobable roll tiers
   (70/80/90/100% of max).

**Upgrades every +4**: below 4 lines → new weighted line; at 4 → equiprobable
line upgrade with a fresh tier roll. Max +20 (5★).

**The encoding insight**: an artifact is fully reconstructible from `(setId,
slot, mainPropId, appendPropIdList)` — each affix ID encodes *which stat at which
tier*. The instance is a compact ID list: cheap to save, replicate, audit. Copy
this encoding regardless of genre.

**The deterministic track**: weapons roll nothing — fixed base + secondary from
curves; refinement R1–R5 consumes duplicates (cumulative). Two generation
policies behind one equipment interface.

## The ARPG affix system (PoE / Diablo / Last Epoch)

The Western looter tradition: items carry **prefix + suffix** mods drawn from
**ilvl-gated, weighted pools**.

- **Slots**: PoE rares hold up to 3 prefixes + 3 suffixes = 6 explicit mods
  (magic: 1+1). Each item base has a mod pool keyed to item type (an axe rolls
  phys dmg; body armour can't).
- **Tiers**: T1 = strongest; each mod is a discrete value band. **ilvl gating**:
  the item level (from area/monster level) gates which tiers can roll — T1–T2
  typically need ilvl ~82–86. A low-ilvl base cannot roll T1 even on a perfect
  base.
- **Weights + tags**: each mod has a spawn weight relative to the pool; tags
  (fire/caster/`shaper`) restrict eligibility and let crafting materials multiply
  weights (a fossil giving 10× fire). PoE's Modifier Tier Rating blocks the
  lowest 34%/50%/67% of eligible tiers at +50/+100/+200 and redistributes weight.
- **Affix level (D2)**: drawn from `MagicPrefix.txt`/`MagicSuffix.txt`; affix
  level = item ilvl + base qlvl decides eligibility. Uniques/sets carry a
  **rarity weight** (Stone of Jordan rarity 1 vs Manald Heal 15 → SoJ ~15× rarer).
- **Mutual exclusion / groups**: mods in the same group don't co-roll (one life
  prefix, not three).

## Rarity tiers & smart-loot

- Ladder: Normal/White → Magic (blue) → Rare (yellow) → Set (green) / Legendary
  (gold). PoE adds fixed-roll Uniques; D4 layers **Sacred/Ancestral** power bands
  over Legendary.
- **Smart loot (D3 Loot 2.0)**: ~85% of drops are class-tailored, ~15% roll for
  a random other class; class-restricted items never roll a wrong-class mainstat.
  Legendary selection is weighted (sum eligible weights, pick by weight). Stats
  narrowed and split into Primary/Secondary so they don't compete; fixed at drop,
  not on ID.
- **D4 hidden weighting** is community-suspected (desirable affixes rarer) —
  unconfirmed, flagged.

## The crafting layer — the determinism dial

Place your crafting on a spectrum from pure-random to fully-deterministic;
**this is the single biggest itemization decision**. Rough ordering (random →
deterministic):

```
D2 drops/gambling
  → PoE chaos-spam (reforge all)
  → PoE fossils/essences (biased / guarantee one mod)
  → PoE harvest/metacraft (targeted, "keep prefixes")
  → D3 smart-loot + Kadala gambling
  → D4 enchanting (reroll one affix from a pool)
  → D4 tempering (pick affix from a manual) + masterworking (+quality)
  → Last Epoch forging (deterministic within Forging Potential)
  → D2 runewords / Grim Dawn blueprints (fully deterministic)
```

- **PoE currency orbs**: Chaos (reforge all), Exalt (add one mod), Divine
  (reroll values within tier), Essences (guarantee one mod), Fossils (bias pool).
  Metamods ("Prefixes Cannot Be Changed") gate which currencies respect them.
- **D4**: Tempering applies one chosen affix from a recipe (charges restorable);
  Masterworking adds Quality (max 20 post-2.5, +~1% affixes/level, Capstone
  upgrades a random affix → Greater); Enchanting rerolls one affix.
- **Last Epoch forging**: every item has **Forging Potential** (crafting
  "durability", ~20–40 rare→exalted); each craft consumes a random FP amount;
  at 0 the item locks. Glyphs modify outcomes (Glyph of Hope: 25% no FP cost).
  Craftable cap T5; T6–T7 drop-only.
- **Runewords (D2)**: insert runes in exact order into socketed white bases —
  fully deterministic, the endgame chase.

**Determinism backlash is real**: GGG deliberately nerfed Harvest for being *too*
deterministic (it "broke the mold"). Too random frustrates; too deterministic
removes the chase. Pick a point and defend it.

## The constrained-guarantee funnel

Anti-frustration never breaks the core RNG — it **shrinks the search space**,
version by version. The Genshin shipped chronology: guaranteed 5★ per AR45
domain run → strongbox (3×5★ → 1×5★ of a chosen set, 34% four-liners) → defined
crafting (elixir: set + piece + main stat + 2 chosen substats, 5.0) → guaranteed
upgrades on chosen substats (5.5). ARPG equivalents: D3 bad-luck protection
(guaranteed legendary on first boss kills), targeted farming (Helltide boosting
Ancestral rates), gambling as a currency sink. **Design the funnel's stages into
the data model from day one even if they ship later.**

The famous "perfect item" odds are community-computed and criteria-dependent (a
specific max-CD Genshin piece ≈ 1/20M) — always cite the criterion with the
number, never a bare figure.

## Numbers (sourced anchors)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Genshin substat weights | flat 6 / %·EM·ER 4 / crit 3 (pool 44) | datamine/KQM |
| Genshin roll tiers | 4 equiprobable 70/80/90/100% of max | datamine |
| Genshin four-liner rate | 20% domains / 34% boss-strongbox | datamine |
| PoE rare mods | 3 prefix + 3 suffix; T1 ilvl ~82–86 | poewiki |
| PoE tier rating +50/100/200 | blocks low 34/50/67% of tiers | poewiki (verify league) |
| D2 gamble odds | Uniq 0.05 / Set 0.10 / Rare 10 / Magic ~89.85% | Arreat Summit |
| D3 smart loot | ~85% smart / ~15% random | D3 2.0.1 |
| D4 base affixes | 4 (was 3); masterwork Quality max 20 | Blizzard 2.5.0 |
| Last Epoch FP | ~20–40 rare→exalted; craftable cap T5 | community |
| BL3 parts | ~35/gun from 1,500–1,700 → "~1B" combos | marketing (approx) |

## Flagged gaps — do NOT invent

The current Genshin artifact cap · exact elixir costs for sands/goblet (sources
diverge; only flower/plume = 1 is safe) · main-stat pity semantics (plausible RE)
· PoE live tier-rating % and tab capacities (shift per league) · D4 masterwork
cap (20 vs 25 — verify live) · D4 hidden affix weighting (community-inferred) ·
canonical perfect-item odds (criteria-dependent) · BL3 "1 billion" (marketing,
not audited).

## Sources

hope1ess (leaked official server RE — artifact generation, weight tables, roll
tiers) · Genshin Fandom + KQM (artifact tables, set-bonus nuances) · poewiki
(Modifier, Fossil, Essence, Metamod, Harvest) · poedb · Blizzard 2.5.0 + D4
patch notes (tempering/masterworking) · D3 2.0.1 notes (smart loot) · Arreat
Summit / diablowiki (D2 gambling, affix levels, SoJ rarity) · lastepochtools /
icy-veins / arreatsummit.gg (forging potential, glyphs) · grimdawn.fandom
(blueprints) · Gearbox interviews (BL3 parts).
