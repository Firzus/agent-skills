# Believability — fun vs smart, illusion, archetypes

The craft of believable/fun AI. Each: principle → examples → source. Uncertainty
flagged `[?]`.

## The fun-vs-smart thesis

Game AI's goal is not to *win* or be optimal — it is to **lose believably** and
produce a fun experience. The player is the only audience; AI sophistication the
player never perceives is wasted budget.

- **Optimal AI is unbeatable, not fun**: an AI unbound by human limits crushes any
  human if it truly plays to win — so "non-competitive by design" is the *default*,
  not a cheat. The "we built an AI that outsmarted players and it wasn't fun" lesson:
  players dragged it into its dumbest situations and won by attrition. Prescription:
  **more variety, less intelligence** (a recognizable mix of archetypes) so the
  *player* exhibits skill.
- **"Artificial stupidity"** (Lars Lidén): deliberately introduce *calibrated* errors
  so the player can win "without the AI looking unintelligent" — "the AI needs to be
  *more* intelligent in order to appear *less* intelligent" (clumsy randomness reads
  as broken; calibrated mistakes read as a fair human opponent).
- **F.E.A.R.'s "illusion of intelligence"**: the planner had a 3-state FSM and shallow
  plans `[?]`. What players remembered as brilliant squad tactics was largely the
  **combat dialogue** plus level design (nav links that let AI dive through windows
  read as environmental reasoning). "Most action-game AI is about acting and
  pretending, not reasoning."

## The illusion of intelligence (legibility techniques)

"If the AI didn't say it, it didn't happen" (Orkin). Make every decision **legible**
or the player reads sophistication as a glitch.

- **Combat barks are the single biggest believability multiplier**. F.E.A.R. converted
  lone barks into *squad dialogues* (a hit AI's teammate yells "What's your status?" →
  "I'm hit!"): it confirms the hit landed, sells coordination, and leaks the enemy's
  health state. **Dialogue can fake unimplemented behavior** ("Man down!" gives the
  *perception* of group awareness for almost no AI cost).
- **Announce intent before acting** ("Flanking left!", "Reloading!", "Grenade out!")
  — telegraphs (fairness) and makes the maneuver read as deliberate.
- **Halo's industrial-scale barks**: 57 events, 166 dialogue types, 12 speaking
  characters, 5,147 lines, evaluated hundreds/second, filtered by priority/context/
  uniqueness — officially "flavor only", yet it carries the illusion.
- **Deliberate hesitation / reaction delays read as "thinking"** — a beat between
  detection and engagement (a logic tick every 0.2–0.5 s, not per-frame) prevents
  inhuman instant reactions.

## Difficulty as design, not stats

Scale **behavior and perception**, not raw HP/damage. Difficulty keeps the player in
the **flow channel** (the band between anxiety and boredom):

- **Token model** (caps simultaneous attackers — see [combat-tokens.md](./combat-tokens.md))
  + **reaction-time / logic-tick scaling** (faster ticks → the AI aborts reloads to
  flee a flank; same content, more perceived intelligence).
- **Halo's lever**: "Smarter = Tougher" — Bungie tuned *intelligence and lifespan*
  across difficulty; perceived intelligence tracked perceived difficulty ("too easy"
  correlated with "not intelligent"). Difficulty and believability are the **same
  axis**.
- **Accuracy / miss-on-purpose**: first-shot-misses (a fair beat to react to a new
  threat); suppressing fire that deliberately misses (reads as tactics); an
  **aim-error cone** that naturally scales with distance, clamped at point-blank
  (avoid the stormtrooper effect). "Give the player time" (Spec Ops enemies run
  convincingly but never escape your grenade).
- **The "30 seconds of fun" loop** (Griesemer): a ~3-second action loop → ~30-second
  encounter → ~3-minute mission; Bungie split **Design owns the 3-minute scope**, **Code
  owns the 30-second scope**. Use a **waved/fractal difficulty curve** (tense-and-
  release, with a dip to teach a new mechanic).

## The fairness contract

The AI must *visibly* obey the same constraints a skilled human would:

- **The "no" list**: no input-reading, no perfect tracking, no omniscience, no instant
  reactions — throttle reaction even without cheating.
- **Make mistakes intelligently, not randomly**: players read RNG ("sometimes whiffs,
  sometimes instakills") as broken; prefer second/third-best move selection, shallower
  search, and **libraries of repeatable routines the player can learn**.
- **"Notice then lose"** — believable AI detects the player, then can *lose* track
  (last-known-position search) — fairer and reads as human fallibility `[?]`.
- **Anti-exploit memory** = believability: an AI that *notices* repeated deaths in a
  spot and refuses the killbox — flanking/flushing while a bark *narrates* the
  adaptation so it reads as cunning, not scripting.

## Archetypes & encounter composition

Personality lives in the **roster**, not in any single brain. Each archetype is a
near-stateless "black box" of action-selection biases; *encounters* are the design
surface, built by combining archetypes like chess pieces.

- **Halo's per-race "black box"**: same combat cycle (charge/flee/seek cover/throw
  grenade), different selection weights → distinct *recognizable* species (Grunts flee;
  Elites seek cover when hurt; Jackals carry shields). "Each room is a designed
  encounter" — the **sandbox** (enemy roster × weapon roster × terrain) generates
  variety.
- **DOOM's push-forward roster**: enemies are chess pieces in 4 classes (ambient/
  fodder/heavy/super-heavy); each demands a *specific tool* (the Carcass spawns shields
  to deny resources, forcing weapon choice). **Rock-paper-scissors**: a sniper forces
  movement → exposes you to a charging skirmisher → near a heavy's area-denial. The
  *interplay*, not any one enemy, is the difficulty.
- **Teaching**: introduce a new archetype in a controlled beat (the flow-curve dip) —
  DOOM Eternal isolates the arachnotron solo so you learn to prioritize its turret.

| Archetype | Role | Believability behavior | Player pressure |
| --- | --- | --- | --- |
| Fodder/minion | numbers, resource drops | panic & flee when the leader dies; chatter | crowd-clearing; reads morale |
| Skirmisher | mobility, flanking | shield-up when broken; bark flanks | forces movement, breaks turtling |
| Heavy/bruiser | soak + area denial | seek cover when hurt; recovery window | demands the right tool; punishes greed |
| Sniper/artillery | long-range zoning | first-shot-miss; tracer telegraph | forces cover & repositioning |
| Support/denial | shields, buffs | spawns shields to block glory kills | high kill-priority; reshapes the fight |
| Squad/leader | coordination, morale | suppression, search parties; death cascades panic | reads as coordinated tactics |
| Super-heavy/champion | difficulty spike | telegraphed wind-ups; introduced solo first | skill check / encounter climax |

## Reactivity & juice (AI-side)

Reactions are *feedback* — they confirm the player's actions and communicate AI state,
independent of actual smarts (cross-ref `combat-system` for player-side feel):

- **Hit reactions / flinch / stagger** as state-communication (a flinch confirms a
  hit, a stagger telegraphs a vulnerability window, a directional hit-react sells the
  damage source). Stack many small cues (hit-stop ~30–50 ms light / 100–150 ms crit,
  screenshake *opposite* the impact, squash/stretch, particles) for visceral impact.
- **Death variety** (a chance of a harmless explosion adds excitement; scale the
  *first* death from a new threat harder). **Group reactions** — morale, fleeing, panic
  (Halo Grunts "break" then recover; kill the leader → cascade panic) are *readable* AI
  emotion the player can exploit.
- **Environmental-awareness barks** ("He's in the vents!", "He's reloading!") make the
  world feel reactive and leak the AI's perceived game state.

## Flagged gaps — do NOT invent

F.E.A.R. plan-depth (~2–3 actions) is partly forum-sourced · "rubber-band aggression"
and stealth "notice-then-lose" are established practices, not single-source · Spec Ops
grenade-escape and BioShock first-shot-miss are second-hand (gamedev.SE).

## Sources

Orkin *Combat Dialogue in F.E.A.R.* (Game AI Pro) + *Three States and a Plan* (GDC
2006) · Griesemer *The Illusion of Intelligence* (Halo, GDC 2002) · Digital Foundry
*DF Retro: Halo* · Loudy & Campbell *Embracing Push Forward Combat in DOOM* (GDC 2018)
· Game Developer *Intelligent Mistakes* / *Artificial stupidity* · gamedev.SE (fairness
contract) · askagamedev (aim error) · Nijman *The Art of Screenshake* · Csíkszentmihályi
flow → game design.
