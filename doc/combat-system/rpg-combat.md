# RPG combat — turn-based, damage formulas, stats, status, balance

The non-action combat architectures and the **combat-math/balance** layer
that action combat shares but underdevelops. The action core is in
[attack-graph.md](./attack-graph.md); the ranged half in
[ranged-gunplay.md](./ranged-gunplay.md). Pick a turn model AND a damage-
formula model **deliberately**, the same upstream way you pick the
commitment↔freeform dial — mixing them blindly creates runaway or stagnant
numbers. `[?]` = game/patch-specific.

## Turn-based & tactical architecture

- **Turn / initiative models**:
  - **Strict rounds** — everyone acts once per round (D&D, Dragon Quest);
    simplest FSM, no speed nuance.
  - **Initiative order** — sort by a Speed stat once per round (D&D5e:
    `d20 + DEX`); speed = *ordering*, not frequency.
  - **ATB (Active Time Battle)** — each combatant has a gauge filling ∝
    Speed; full → may act. Time keeps flowing while menus are open (you can
    be hit mid-selection); a **Wait mode** pauses it (an accessibility
    lever). Speed = *frequency*.
  - **CTB (Conditional-Turn-Based)** — turn-based but *not* round-based: a
    visible **Act List** predicts upcoming turns; each action's **Rank/
    cost** pushes the actor down the list (Quick Hit → more turns). All
    action stops during selection → strategy over reflexes.
  - **The generalization**: `next_turn_time = now + base_cost / speed`
    (or `× rank`) models ATB, CTB, and tactical ticks in one line.
- **The turn state machine**: `SelectActor → ActionSelection →
  TargetSelection → Resolution → OnHit/OnDeath → EndOfTurn (tick DoTs,
  decrement durations, regen) → recompute initiative → next`. End-of-turn
  is the natural status-tick hook.
- **The action economy is the real currency** — XCOM's 2 action points
  (most attacks end the turn → "move-or-shoot"); D&D's Action + Bonus +
  Move + Reaction. Designing the economy = designing the decision space
  (the turn-based cousin of the skills layer's cooldown slots).
- **The tactical grid (XCOM/Fire Emblem)** — grid + action points + cover
  + flanking + a to-hit roll. XCOM: `HitChance = Aim − Defense + mods`
  (all additive) vs a PRNG roll; cover = +20/+40 Def; **flanking** removes
  cover Def and grants +crit; height = +20 Aim. The **pod system** (enemies
  activate on line-of-sight) creates the core tension: *moving to flank
  risks activating new pods*. The notorious feel-bad is missing a displayed
  90% shot — many tactics games **fudge** odds in the player's favor on
  lower difficulty `[?]` (values hidden).
- **Queued/programmed (the FFXII Gambit model)** — a priority-ordered
  if-then list per character: `[Target selector + Condition] → Action`,
  scanned top→bottom each tick, first valid rule executes. Condition and
  Action are decoupled. This is **the same data-driven, priority-ordered
  transition-list pattern as the attack-graph edges** and
  `enemy-ai-framework` intents.

## The damage-formula design space

**How bonuses combine** — the upstream choice:

- **Additive bucket**: all `+x%` sum, then one multiply — `base × (1 +
  Σ%)`; each new source *dilutes* the rest (built-in diminishing returns).
  Flatter, controlled progression.
- **Multiplicative**: each source an independent factor `base × (1+a) ×
  (1+b)…`; no dilution → numbers explode, conditional bonuses get *more*
  valuable as they grow. The "millions of damage" ARPG blow-up.
- **Diablo "buckets"**: additive *within* a category, multiplicative
  *across* — the de-facto ARPG standard. The additive/multiplicative mix
  *is* the lever for "how fast does player damage grow over the game's
  life." The **damage-cap-per-node** in [attack-graph.md](./attack-graph.md)
  is the action answer to multiplicative blow-up.

**Mitigation models** (defense → damage):

| Model | Formula | Game | Behavior |
| --- | --- | --- | --- |
| Subtractive | `(ATK − DEF/2)/2` | Dragon Quest | flat reduction; swingy at extremes; needs a min-damage floor |
| Ratio / division | `((2·Lvl/5+2)·Power·A/D)/50 + 2` | Pokémon | smooth; doubling DEF ~halves damage; no hard immunity |
| % curve `K/(K+armor)` | `DR% = Armor/(Armor+K)` | WoW, MOBAs | smooth diminishing DR%, **but EHP is linear**; DR hard-capped (~75%) |
| Subtractive + floor | `max(ATK·r − DEF·c, ATK·minRate)` | mobile | flat reduction with a min-damage % to avoid one-shots |

**The key insight — Effective HP**: `EHP = HP / (1 − DR%) = HP ·
(Armor+K)/K`. Because K is constant, **EHP is *linear* in armor** — each
point adds the same survivability even though DR% visibly diminishes.
**Tune around EHP/TTK, not the displayed DR%.**

**Crit math**: `E[mult] = 1 + critChance·(critMult − 1)`; `DPS = AtkSpeed
× Damage × E[mult]`. The melee reference's ×1.25→×1.5 crit plugs straight in.
Anti-streak via **PRD** (chance rises each failed roll). **Variance band**:
a ±5–15% roll (Pokémon 0.85–1.00) applied *after* the motion-value
multiply softens determinism. **Type effectiveness**: per-type ×2/×0.5/×0
multipliers (dual-type up to ×4), plus STAB ×1.5.

## Stats & character math

- **Primary → derived**: STR/DEX/INT feed HP/ATK/crit via conversion — a
  small authored surface driving many outputs.
- **Souls scaling grades** — a weapon shows S/A/B/C/D/E per stat; bonus =
  `BaseDamage × StatScaling × StatRating`, where the stat is mapped through
  a **saturation curve** (fast early gains, **soft caps** ~25 and ~40).
  Letters are coarse; base damage matters as much as the letter.
- **Stat/power budget** — each item gets a fixed total distributed across
  stats (a +crit item gives less HP) → sidegrades, not strict upgrades.
- **Linear vs exponential growth** — exponential stats force exponential
  enemy HP → the **"everything scales so nothing changes" trap** (the same
  warning the action skill makes about damage caps).
- **Breakpoints** — thresholds unlocking a discrete benefit (Souls soft
  caps; Diablo attack-speed breakpoints tied to whole animation frames).
  Design them intentionally or players feel cheated by "wasted" stats.

## Status effects & conditions

- **Status = data** — a row `{id, magnitude, duration, tickRate, stackRule,
  maxStacks, category, hooks(onApply/onTick/onExpire), resistKey}`; the
  engine iterates active effects at end-of-turn or on a tick timer.
  *Identical philosophy to the data-driven attack graph.*
- **DoT** applies magnitude per tick (Scarlet Rot = fast vs Poison = slow);
  the **snapshot-vs-dynamic** question (`[?]` freeze caster stats at
  application or recompute each tick) is a major theorycraft distinction.
- **Stacks** — `stackRule ∈ {refresh, stack-intensity, stack-duration,
  independent}` with a max.
- **Crowd control + diminishing returns** — CC (stun/root/slow/silence)
  with **DR**: same-category CC has its duration halved each reapplication,
  full immunity after ~2 applications, window resets after ~16 s. *This
  directly parallels the melee reference's anti-stunlock stun-gauge escalation
  (+50–100% threshold per proc)* — both are "repeated lock gets weaker."
- **Application** — `roll < baseChance × (1 − targetResist)`, or a
  **build-up meter** (below). **UI contract**: every buff/debuff is an icon
  with a duration timer + stack count (feeds `hud-system`).

## Combat balance & tuning

- **DPS/TTK/EHP as the currency**: `DPS = E[hit] × attacks/sec`; `TTK =
  HP / DPS`; `EHP = HP·(Armor+K)/K`. Rules of thumb: `TTK_max/TTK_min < 3`,
  `DPS_max/DPS_min < 2.5` at equal gear; healing ≈ 0.6–0.8 of incoming so
  it can't fully negate damage.
- **The spreadsheet/simulation approach** (Schreiber & Romero, *Game
  Balance*): model every weapon/skill in a sheet, change one input, watch
  DPS/TTK ripple; **Monte Carlo** for variance/crit distributions; the
  **"Rule of 2"** — if a value is wrong and you don't know by how much,
  double it or halve it.
- **Encounter/CR budgets** — each enemy gets a cost (HP+DPS+abilities → a
  points value); fill an encounter to a target budget; difficulty = a
  budget multiplier.
- **Difficulty scaling** — flat multipliers (HP×2 — cheap but spongy, the
  EHP-sponge problem) vs smarter scaling (extra mechanics, tighter
  windows). **Feel-bad mechanics to avoid**: one-shots, unavoidable damage,
  **stunlock** (the action-combat reference's anti-stunlock + CC-DR), displayed-high-% misses.
- **Accessibility difficulty** — damage sliders/multipliers (Celeste
  Assist, FF Wait mode), assist modes, one-shot protection — extending the
  action-combat reference's feel-tuning philosophy to inclusivity.

## The action-RPG bridge

Where this meets the melee core:

- **Soulslike = real-time action + RPG math**: the attack graph + Souls
  scaling grades + **poise as a stat** (DS1 passive bar / DS3 hyperarmor
  during attacks — the action-combat reference's poise/hyperarmor, just geared for) +
  **build-up status meters**. The **build-up meter** (each hit adds to an
  invisible meter; at threshold the status procs — Bleed ~15% max HP,
  Frostbite +20% damage-taken; resist stats raise the threshold; the meter
  decays) is *structurally identical to the stun gauge* — accumulate →
  proc → escalate, for ailments instead of stagger.
- **Monster Hunter hitzone/elemental** — per-part hitzone % for physical
  and each element, breakable parts as separate HP pools (already a
  calibration pole); `MV × hitzone% × sharpness × (1 + affinity·crit)`.
- **Diablo/ARPG hybrid** — action input + bucketed damage formula + on-hit
  procs + attack-speed breakpoints.
- **MMO action-combat** — the **GCD** (~1.5 s gating most abilities, both
  for balance and client↔server sync); combat is a **priority system, not
  a fixed rotation** (rank a list, press the highest-value valid ability);
  **telegraphs** (AoE warnings) are the MMO cousin of the action-combat reference's wind-up/
  active-frame readability.
- **Genshin elemental reactions** — a **two-axis status system** (aura
  element + trigger element) generating a reaction matrix:
  **amplifying** (Vaporize/Melt) multiplies the triggering hit (`2.0×`
  forward / `1.5×` reverse, scaling with EM), **transformative**
  (Overload/Swirl) deals its own EM-scaled damage independent of the hit.
  Combinatorial depth from a small element set — an evolution of elemental
  hitzones into *interacting* statuses.

## Connect-back summary

| Action-skill concept | RPG/math analogue |
| --- | --- |
| commitment↔freeform dial | pick a mitigation model + turn model the same upstream way |
| stun gauge + anti-stunlock | CC diminishing returns + status build-up meters (same accumulate→proc→escalate) |
| motion values | sit inside `base × MV × scaling × (1±variance) × crit-EV × mitigation` |
| damage caps per node | the ARPG answer to multiplicative blow-up |
| poise / hyperarmor frames | Souls makes poise a *stat* you gear for |
| skills layer (cooldown + ult) | MMO GCD + priority system; turn-based action economy |
| feel-tuning numbers | EHP/TTK as currency + accessibility damage sliders |

## Sources

gamedeveloper.com *Number Punchers* (FF/DQ math) · Bulbapedia *Damage
formula* · warcraft.wiki.gg *Armor*/*Damage reduction* · Diablo IV/III
forums (additive vs multiplicative, buckets, breakpoints) · Wikipedia
*Active Time Battle* + FF Wiki (ATB/CTB) · UFOpaedia *Chance to Hit* +
gamedeveloper.com *A Deep Dive Into XCOM* · FFXII Gambit FAQ · Dark Souls
Fandom *Parameter Bonus* + fextralife *Weapon Scaling* · Wowpedia *Crowd
control* + Icy-Veins (CC-DR) · Elden Ring wikis (build-up, Frostbite,
poise) · Schreiber & Romero *Game Balance* + gamedesignconcepts *Level 16*
· KQM Library (Genshin reactions/damage formula) · Icy-Veins/Huttspawn
(GCD/priority). Flags: Souls saturation tables, DoT snapshot behavior,
XCOM fudge values, and WoW K-constants are game/patch-specific — treat
concrete numbers as calibration poles, not constants.
