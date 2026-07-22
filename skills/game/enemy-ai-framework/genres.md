# Genres — RTS, stealth, racing, sim, director, companion

AI architectures beyond action games. Each: architecture → techniques → source.
Uncertainty flagged `[?]`.

## RTS / strategic AI — the command hierarchy

The core architecture is a **3-layer abstraction** (mirroring a military chain of
command):

- **Strategic layer** ("macro"): long-horizon economy, tech/build-order, expansion —
  often a deliberative planner (it reasons over action *sequences*).
- **Operational/tactical layer**: army composition, maneuvers, positioning, target
  selection — frequently driven by **influence maps** and adversarial search.
- **Reactive control layer** ("micro"): per-unit steering, kiting, focus-fire.

Higher layers **issue commands** down; lower layers queue/execute (the "divide-and-
conquer at every level" pattern). **Influence maps** are the universal RTS spatial
technique: a grid summarizing terrain + units into scalar fields (threat, safety,
value), **computed once and shared by all agents** → emergent group behavior (see
[techniques.md](./techniques.md)).

**The cheating reality**: at high difficulty, RTS AI commonly cheats — no fog-of-war,
knowing your build, resource bonuses, and especially **superhuman micro/multitasking**.
StarCraft II built-in levels **8–10 are confirmed cheating agents** (full vision +
harvest boost). But it's not universal — AoE2:DE devs claim the *skirmish* AI plays
by player rules and only "cheats" by knowing your army size `[?, forum-sourced]`.

## Stealth AI — the alert ladder & "fun to evade"

Architecture: FSM/BT over discrete awareness states, fed by vision cones + sound
propagation. The canonical MGS-template ladder: **Idle → Suspicious** (a glimpse/sound;
in Thief a guard may not even rotate, only an audio bark) **→ Searching/Investigate**
(moves to the last-known point, a countdown timer runs, vision cones *tighten*) **→
Alerted → Combat**; on losing LoS, drop to Search, **not** straight to Idle. A
**detection meter** (visibility × distance × light) gates transitions.

- **Design principles**: intentional, **legible blind spots** make evasion a fair
  puzzle; don't make combat as viable as stealth (or players ignore stealth);
  "fun to evade ≠ fun to fight" — stealth AI telegraphs state and gives second chances
  (the search/give-up loop), the opposite of action AI.
- **Alien Isolation — the two-brain model**: a **Director AI** ("macro") that *always
  knows the player's location* and models stress via a menace gauge, giving the Alien
  **general hints** (never exact coordinates); and the **Alien AI** ("micro") — a
  ~100-node behavior tree (~30 active) driven by *its own sensors* (footsteps,
  gunshots, motion-tracker pings, short rear ray-casts = "eyes in the back of its
  head"). **The Alien never cheats** — it must *find* you. BT nodes unlock as you
  progress, biased by your habits (hide in lockers → it checks lockers).

## Racing AI — racing line + driver model + catch-up

Layered: a **physics sim** (each AI car runs its own rigid-body sim, same physics as
the player), an **AI controller** following the on-screen **racing line** (optimal
path for this stretch), and the **Drivatar** personality/imitation layer (a Bayesian
NN trained on real human laps records lines and characteristics → reproduces a
player's *style*, not a scripted route).

**Does the AI cheat the physics?** The nuanced answer (Turn 10): "Drivatars do not
rubber-band — **they rubber-band the *cars***." If the player is far behind, the game
manipulates car params (weight, torque, friction); far ahead → buffs the cars. So
catch-up exists, applied to vehicle physics rather than driver skill `[degree varies
by title]`. The design goal: **the AI must feel like a rival** — imitation learning
makes opponents feel like people, mistakes included.

## Sim / emergent AI — smart objects, needs, jobs

- **The Sims — object-centric utility (smart objects)**: behavior lives in the
  **objects, not the agent**. Each object **broadcasts advertisements** ("bed: +10
  energy"). A Sim scans nearby objects → scores each ad = advertised value × current
  need deficit → picks among the **top scorers at random** (not strict argmax — the
  randomness prevents robotic optimality and leaves needs imperfectly met, giving the
  *player* a job). The object even tells the Sim how to animate. Fully data-driven:
  add objects without touching Sim code.
- **RimWorld — ThinkTrees (deterministic, not utility)**: everything is a **Job**;
  behavior = evaluate JobGivers, execute the first valid job. A **ThinkTree** sets the
  order; player work priorities 1–4 tie-break; need thresholds inject higher-priority
  jobs. Essentially boolean/predetermined.
- **Dwarf Fortress**: needs affect *focus* (a skill multiplier); dwarves
  spontaneously do personal-fulfillment jobs. The emergent-story engine.

The takeaway: many agents × needs × environmental affordances → stories the designer
didn't script.

## Director / macro AI — pacing, not per-agent

- **Left 4 Dead's AI Director** (genre-defining): the goal is dramatic **pacing, not
  difficulty**. The Adaptive Dramatic Pacing algorithm estimates each Survivor's
  **emotional intensity** (rises from being hit/incapped/nearby kills), tracks the max
  of four, and cycles **Build Up → Sustain Peak → Peak Fade** (waits for a natural lull)
  **→ Relax** (~30–45 s). The explicit statement: "adjusts pacing not difficulty —
  amplitude unchanged, frequency changed". Simple intensity estimation suffices.
- **Alien Isolation's Director** is the same family but **conducts one creature**
  rather than spawning crowds. The distinction: the Director is a *meta-layer* above
  individual agents — it controls *what/when/where to spawn or hint*, not combat moves.
  (See `world-time-weather` for the storyteller-vs-director distinction.)

## Companion AI — the "useful companion" problem

The escort-mission stigma (companions are burdens). BioShock Infinite's **Elizabeth**
is the canonical solution: **no escort mechanics** (you never protect her or watch her
health — she *helps*, giving you ammo/health and staying out of the line of fire);
**goal-side positioning** (place her *between* the player and the next objective so
she's ahead but not blocking; teleport closer if outrun — "not too close, too close is
creepy"); **exist in the negative spaces** (independent environmental interaction —
level designers painted objects with "eyeballs" marking what she can gaze at). The
philosophy: "more important to make an entertaining companion than a clever algorithm".
The Last of Us' **Ellie** follows the same "never a liability" doctrine (enemies often
ignore the companion in stealth) `[?]`.

## The Nemesis social system

Shadow of Mordor/War — procedural **social** AI (not combat AI): a persistent NPC
database + hierarchy (Overlord → Warchiefs → Captains → soldiers) + **turn-based
off-screen simulation**. Each orc has a procedural name/appearance/strengths/fears and
a hidden **player-interaction score**; on player death/mission/time, the system
simulates off-screen events (duels, promotions, deaths) so the power balance shifts
organically — an orc that kills you gets *promoted* and references the encounter in
barks. The philosophy: provide a framework, then get out of the way.

## Per-genre comparison

| Genre | Core architecture | Decision technique | Cheats? |
| --- | --- | --- | --- |
| RTS | 3-layer hierarchy + managers | planner (macro) + adversarial search + utility (micro) | yes at high diff (vision, micro) |
| Stealth | FSM/BT over alert-state ladder | threshold/meter transitions; search timers | no (fair perception is the point) |
| Stealth-horror (Isolation) | two brains (Director + Alien BT) | utility scheduler; BT node-unlock | Director knows you; Alien never does |
| Racing (Drivatar) | physics sim + controller + ML imitation | Bayesian NN on human laps | rubber-bands the *cars*, not the AI |
| Sim — life (The Sims) | object-centric utility | ads = need-deficit × value, top-N random | no |
| Sim — colony (RimWorld) | ThinkTree of JobGivers | first-valid-job; priorities | no (deterministic) |
| Director (L4D) | meta-AI above agents | intensity → Build/Sustain/Fade/Relax | adjusts pacing, not difficulty |
| Companion (Elizabeth) | autonomous helper + scheduler | goal-side positioning; teleport-if-far | invulnerable but never a burden |
| Social (Nemesis) | persistent DB + turn-based off-screen sim | interaction score → promotion/death | no (systemic) |

## Flagged gaps — do NOT invent

Alien BT node counts (~100/~30 are secondary, not CA primary) · Forza current
rubber-band degree (evolving) · Ellie/TLoU stealth-ignore and wildlife AI (genre
knowledge, not re-sourced) · AoE2 "doesn't cheat" (forum, lower confidence).

## Sources

Ontañón survey of RTS Game AI · Game AI Pro 2 Ch.30 (influence maps) · TStarBots (SC2
cheating tiers) · Mark Brown *School of Stealth* · Tommy Thompson (Alien Isolation) ·
Greenawalt / Ars War Stories (Drivatar) · Will Wright 1996 / Zubek *Needs-Based AI*
(The Sims) · Booth *AI Systems of Left 4 Dead* (GDC 2009) · Abercrombie GDC 2014
(Elizabeth) · de Plater GDC + US Patent 11660540B2 (Nemesis).
