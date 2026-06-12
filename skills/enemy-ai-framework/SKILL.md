---
name: enemy-ai-framework
description: >-
  Architecture blueprint for game AI across genres: designer-authorable decision
  architectures (FSM/HSM vs behavior trees vs GOAP vs HTN vs utility/IAUS — the
  decision matrix), the brain-to-intent-to-execution separation (AI drives the
  same character controller and combat as the player), perception (sight cones,
  hearing propagation, the alert ladder), threat and target selection with
  hysteresis, attack tokens as the pacing/difficulty regulator, lifecycle (spawn,
  patrol, leash, respawn), AI LoD and crowd scale, group coordination, genre AI
  beyond action (RTS command hierarchy and influence maps, stealth alert states
  and Alien Isolation's two-brain model, racing Drivatar imitation, sim smart-
  objects and needs, director/macro AI, companion AI, the Nemesis social system),
  the technical foundations (navmesh/Recast, pathfinding and the funnel, RVO/ORCA
  avoidance, steering and context-steering, influence maps and EQS, ML reality vs
  hype, crowds via flow fields and Mass/DOTS), and AI believability (the fun-vs-
  smart thesis, the illusion of intelligence via barks, difficulty as behavior not
  stats, the fairness contract, archetypes and encounter composition, reactivity).
  References: Genshin's GDC 2021 scalable AI, Doom/God of War attack tokens, F.E.A.R.
  GOAP, Halo, souls aggro/leash. Use when designing or building enemy AI, behavior
  trees, aggro, spawning, AI performance, stealth/RTS/racing/sim AI, or when
  enemies all attack at once, flip targets, walk through walls, or feel like
  identical robots.
---

# Enemy AI Framework

Build the AI layer of a game. References: Genshin's GDC 2021 scalable AI (200+
designer-authored archetypes), the attack-token model (Doom 2016, God of War),
F.E.A.R.'s GOAP and the "illusion of intelligence", Halo's archetype sandbox,
souls-like aggro/leash. Excluded (covered elsewhere): boss phase data
(`combat-system`), town-NPC schedules.

## The two architecture rules

1. **The brain decides; the body is the player's.** AI emits intents —
   `MoveTo(pos)`, `Attack(target, skillId)` — consumed by the **same character
   controller and combat system as the player**. Payoff: staggers/knockbacks work
   identically, no movement cheating, hitboxes implemented once, and you can plug an
   AI brain into the player character for soak tests. ("Have the AI press buttons.")
2. **Decision architecture by role, designer-authorability as the deciding
   criterion** (Genshin rejected one big BT for productivity):

```
FSM/HSM        → lifecycle/context states (idle/patrol/combat/return, boss phases)
Decision trees → action selection INSIDE a state (light, stateless, recomposable)
  or BT
Utility/IAUS   → continuous parametric choices (target, skill, position)
GOAP / HTN     → only when multi-step improvisation IS the fantasy
```

Genshin's shipped pipeline (per-frame, modular): `Sensing → Threat → Target Select
→ Reactions → Scripted → Group → Positioning` — modules recompose per archetype;
designers author new enemies without engineers.

## Reference map

| File | Covers |
| --- | --- |
| [decision-perception.md](./decision-perception.md) | The decision-architecture comparison settled by designer authorability, the intent bridge (brain → body), perception (sight/hearing/the alert ladder), threat and target selection with hysteresis |
| [combat-tokens.md](./combat-tokens.md) | Attack tokens (the pacing/difficulty regulator), telegraphs and the fairness floor, lifecycle (spawn/patrol/leash/respawn), AI LoD and the bubble, group coordination |
| [genres.md](./genres.md) | AI beyond action: RTS command hierarchy + influence maps + the cheating reality, stealth alert states + Alien Isolation's two-brain model, racing Drivatar imitation, sim smart-objects/needs, director/macro AI (Left 4 Dead), companion AI (Elizabeth/Ellie), the Nemesis social system |
| [techniques.md](./techniques.md) | The decision-architecture matrix (FSM/BT/GOAP/HTN/utility), navigation (Recast navmesh, the funnel, HPA*), RVO/ORCA avoidance, steering and context-steering, influence maps and EQS, ML reality vs hype, crowds via flow fields and Mass/DOTS |
| [believability.md](./believability.md) | The fun-vs-smart thesis, the illusion of intelligence via barks, difficulty as behavior not stats, believable imperfection and the fairness contract, archetypes and encounter composition, reactivity and juice |
| [pitfalls.md](./pitfalls.md) | 16 failure modes (symptom → cause → prevention) with debugging order and ship checklist |

## Attack tokens (the pacing regulator)

One system controls difficulty AND readability:

- N tokens per encounter; an enemy **claims** before attacking, **releases** after
  (end, whiff, interruption, death — release in state teardown, never just the happy
  path, plus a safety timeout). Separate **melee and ranged pools**.
- **Off-token enemies look busy**: reposition, strafe, flank, posture, taunt — never
  statically wait (GoW's "kung fu circle"). Doom lets demons **steal** tokens; GoW
  lets an interrupted enemy **keep** its token briefly (anti-starvation).
- **Difficulty scales by tokens, not HP**: more tokens + faster redemptions = harder,
  instead of bullet sponges. Full detail in [combat-tokens.md](./combat-tokens.md).

## Build order (4 shippable tiers)

```
Tier 1 — One enemy that fights fair
- [ ] HSM lifecycle + decision tree for attacks; the intent bridge
- [ ] Perception: sight cone + LoS + hearing + hit = aggro
- [ ] DEBUG OVERLAY FROM DAY 1 (the #1 productivity item)
Tier 2 — Encounters
- [ ] Attack tokens (pools, guaranteed release, timeout)
- [ ] Threat model + ratio hysteresis; slot-based positioning (no conga lines)
- [ ] Leash as a brain state; telegraphs with the fairness floor
Tier 3 — World integration
- [ ] Spawners + persistent state by stable IDs; AI LoD (3 tiers, per-module)
- [ ] Streaming guards; the alert ladder + group alarm propagation
Tier 4 — Texture & scale
- [ ] Group roles with caps; per-instance personality (kill "identical robots")
- [ ] Archetype roster + encounter composition (rock-paper-scissors)
- [ ] Barks announcing intent (the believability multiplier); difficulty by behavior
```

## Key numbers (starting points — tune by playtest)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Sight cone | 120° H × 60° V; 20–30 m fodder (200 m in combat) | Genshin datamine |
| Threat | +20 per hit, decay ~3%/s, switch at ≥120% ratio (NOT time-based) | Genshin/WoW |
| Tokens | 1 melee + 1–2 ranged; counts unpublished | convention |
| Telegraphs | 0.4 s light / 0.6–0.8 s heavy / ≥1 s boss (≥0.3–0.5 s floor) | design refs |
| AI budget | Genshin ships 30+ NPCs at 0.5 ms on mobile after LoD | GDC 2021 |
| L4D Director | adjusts **pacing not difficulty** (intensity → Build/Sustain/Fade/Relax) | Booth GDC 2009 |
| RTS cheating | SC2 levels 8–10 cheat (full vision + harvest boost) | SC2LE/TStarBots |
| Halo barks | 57 events, 166 dialogue types, 5,147 lines | Griesemer GDC 2002 |

Full sourced tables (with the "undocumented — don't invent" list) in each file.

## Engine mapping (summary)

| Generic block | Unity 6 | UE5 (5.4+) |
| --- | --- | --- |
| Brain | Unity Behavior (frozen) · custom HSM/BT · Behavior Designer | **BT + Blackboard** (event-driven) · **StateTree** |
| Perception | custom: OverlapSphere + LoS + stimulus bus | **AIPerception** (sight/hearing/damage, time-sliced) |
| Intent bridge | `updatePosition=false` + `desiredVelocity` → shared controller | AIController/Pawn split is native |
| Navigation | AI Navigation (Recast) + A* Pathfinding Project | Navmesh + **Detour Crowd** (RVO) + nav links |
| Spatial queries | DIY / assets | **EQS** (generators + tests) |
| Tokens | custom token manager | custom; Smart Objects as a claim primitive |
| Crowds | **DOTS/ECS + Burst** + flow fields | **Mass** (MassEntity + ZoneGraph + StateTree) |
| ML | ML-Agents (mostly QA/playtest) | Learning Agents (experimental) |

UE5 ships ~5 of the 6 blocks natively; the one block custom everywhere: **attack
tokens**. Full detail in [techniques.md](./techniques.md).

## Related skills

- `character-controller` / `combat-system` — the body: AI intents drive these;
  staggers and hit events flow back to the brain.
- `open-world-streaming` — AI residency at cell borders, the bubble model.
- `world-time-weather` — time divisions and weather flags as blackboard inputs.
- `adaptive-audio` — the aggro/threat ladder triggers combat music.
- `loot-drop-system` — death hands off to the drop pipeline; tier substitution.
- `coop-session` — server-owned AI, per-player threat tables.
- `dialogue-system` — the LLM-NPC frontier; combat barks share the bark arbiter.
- `game-architecture-patterns` — State (HSM), Type Object (archetypes), Event Queue
  (stimuli), Update Method (LoD) theory.
