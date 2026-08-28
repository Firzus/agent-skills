# Perception — why true-random feels rigged, and how to fix it

Managing the *feel* of random drops. This is complementary to deterministic
*currency* pity (which lives in `progression-economy`) — here the techniques act
on the **drop roll itself** and on **presentation**. All numbers are **starting
points**.

## Why true-random feels "broken"

- **True (memoryless) randomness clusters.** Independent events have no memory, so
  streaks and droughts are statistically inevitable, not bugs. Players expect the
  Law of Large Numbers to apply to *small* samples — the gambler's fallacy.
- **The drought math** (the core number to internalize): at a 10% drop rate,
  `P(0 in 20 kills) = 0.9²⁰ ≈ 12%` — ~1 in 8 players legitimately goes 20+ kills
  dry and concludes the game is rigged. For a rare event p=0.5%, `P(0 after 100)
  ≈ 60.6%`; after 200 ≈ 36.7%. Even at the "average" count, a third of players
  have nothing.
- **Asymmetric complaints**: players attribute lucky streaks to skill but blame
  unlucky ones — a systematic perception bias with churn and economy effects.
- **The "cursed account" myth** is usually fallacy, but *can* be a real artifact
  of a badly-seeded PRNG (weak seeding produces genuinely streaky sequences) —
  use a proper CSPRNG, not `Math.random()`.
- **Design takeaway**: "the solution isn't explaining how often streaks should
  occur — it's UI that makes randomness feel structured and verifiable. Fairness
  is a design problem."

## Pseudo-random distribution (PRD)

The Warcraft III / Dota 2 technique that reduces variance: on each failed
attempt, proc chance *increases by a constant C*; on success the counter resets.
The initial chance is **lower** than the nominal listed chance to compensate.

```
P(N) = C · N        // on the N-th attempt since the last proc
```

- **Effects**: fewer back-to-back multi-procs, fewer long dry spells, and it
  defeats "priming" (you can't farm to guarantee the next proc).
- **The nominal-vs-effective gap (critical caveat)**: C is tuned so low nominal
  values match (listed 25% → C≈0.0847, actual ≈24.9%), but at **high listed
  values the actual rate drops well below nominal**: 50% → ~45.7%, 80% → ~66.7%.
  WC3 even shipped wrong C values for high p. C has **no closed form** — solve it
  numerically.

| Nominal | Actual | C | Guaranteed by | Avg attempts |
| --- | --- | --- | --- | --- |
| 5% | 5.0% | 0.00380 | 264 | 20.00 |
| 10% | 10.0% | 0.01475 | 68 | 10.00 |
| 25% | 24.9% | 0.08475 | 12 | 4.02 |
| 50% | 45.7% | 0.25701 | 4 | 2.19 |
| 80% | 66.7% | 0.50276 | 2 | 1.50 |

PRD is the **drop-side analogue of bad-luck protection** — apply it to a proc-like
drop (a rare on each kill), not to a currency you accumulate.

## Drop-side bad-luck protection

Distinct from `progression-economy` currency pity. These act on the drop source:

- **Incrementing drop chance ("rolling pity timer")**: the rarity's chance rises
  each kill/pack that fails to yield it, resets on success.
- **Guaranteed-after-N (hard floor on the source)**: Hearthstone guarantees ≥1
  Legendary within the first 10 packs of a new set, then a 40-pack ceiling
  (avg rate ~5%, ~1/20 packs). These are *source* guarantees, not a currency.
- **Duplicate / "mercy" pool-shaping**: won't grant a 2nd copy of a Legendary
  until you own all in the set — reshapes the *droppable pool* rather than the
  odds.
- **Caveat**: independent per-source counters mean cross-source droughts persist;
  players misread this as the guarantee "not working".

## Shuffle-bags & small-number fixes

- **Shuffle-bag / bingo-bag (draw *without replacement*)**: fill a bag with
  outcomes in the desired ratio, shuffle, draw one-by-one, refill when empty.
  Guarantees the target frequency over each bag while preserving local surprise.
  Tetris's 7-bag randomizer is the canonical example.
- **Bag size tunes max streak**: 1 hit/1 miss → max 2-in-a-row; 5/5 (same 50%) →
  up to 10-in-a-row possible. Pick bag size to bound perceived unfairness.
- **Loot-table decrement**: on roll, reduce that item's weight by 1 and persist
  the modified table per-player — "rolling without replacement".
- **Avoid `Math.random()` for mechanics** (weak/streaky in small samples): use a
  weighted CDF + CSPRNG, rejection sampling to avoid modulo bias.
- **Seeded streaks caveat**: predetermined per-mission seeds (XCOM) make
  save-scumming reproduce the same outcome — a deliberate anti-exploit, but can
  manufacture a genuinely "cursed" seed.

## Drop ceremony & juice

- **Rarity beams/colors/sounds**: D3 Legendaries announce via a loud clang +
  orange beam + minimap asterisk; Sets use green. Multi-sensory telegraph turns a
  stat-roll into an event.
- **Ceremony can backfire — over-telegraphing**: D3's "Beam of Disappointment"
  (trial keys triggered the full Legendary fanfare, conditioning then dashing a
  Pavlovian response) — devs removed the beam. **Reserve the big ceremony for
  genuine high-value drops.**
- **"Drop fewer, drop better"** (Loot 2.0, GDC 2015): rarity = power; smart
  (class-appropriate) drops; highlight the legendary affix; make quality legible.
  "Randomness is a tool to create reliability."
- **Near-miss design — the ethics boundary**: near-misses recruit the same
  reward circuitry as actual wins and increase persistence despite zero
  predictive value. Loot-box reveals that flash a legendary color before
  resolving to a dupe exploit this — **this is the line toward dark-pattern /
  gambling design**; flag it, and see [compliance.md](./compliance.md).

## Transparency

- **Published drop tables build trust**: Warframe (2015) publishes auto-generated
  tables for nearly every droppable item (the first major studio to do so).
- **Kill/attempt counters & "guaranteed within X"** convert an invisible
  probability into a legible progress bar — reducing "rigged" perception.
- **Presentation nuance**: exact decimals (7.1253%) create false precision; round
  values or ranges (7–8%) read as more honest and communicate variability.
- **The retention argument** (Mosqueira, GDC 2015): the fear of being "too
  generous" was wrong — players who get loot and leave happy come back; stingy
  odds make them leave frustrated. Transparency + generosity is retention-positive.

## Numbers (sourced anchors)

| Datum | Value | Source |
| --- | --- | --- |
| 10% drop, P(0 in 20 kills) | ~12% | math |
| 0.5% rate, P(0 after 100) | ~60.6% | math |
| PRD 25% nominal → actual | 24.9% (C=0.0847), guaranteed by 12 | Dota 2 Wiki |
| PRD 50% / 80% nominal → actual | 45.7% / 66.7% | Dota 2 Wiki |
| Hearthstone Legendary | avg ~5% (~1/20 packs); ≤10 first set, 40 ceiling | HS Wiki |
| Tetris randomizer | 7-bag, without replacement | Tetris Guideline |

## Flagged gaps — do NOT invent

Hearthstone per-rarity pity ceilings vary by wiki edition (approximate) · PRD
"actual" values are legacy WC3 figures (Dota 2's current internal C-table may
differ) · near-miss research is from *gambling* contexts — transfer to
non-gambling loot is plausible but under-studied.

## Sources

Liquipedia / Dota 2 Wiki (PRD, the C-table) · Diplograph (PRD effects) · TrueRNG
KB (loot-table RNG, streak psychology) · The Decision Lab (gambler's fallacy) ·
Hearthstone Wiki (pack statistics, pity) · Envato Tuts+ / seanmonstar (shuffle
bags) · Game Developer (loot drop best practices) · Diablo Wiki / PureDiablo
(drop ceremony, Beam of Disappointment) · GDC 2015 Mosqueira (Loot 2.0) · Clark
et al. 2009 Neuron (near-miss neuroscience) · warframe.com/droptables.
