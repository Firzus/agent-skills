---
name: enemy-ai-framework
description: >-
  Architecture blueprint for enemy AI in action games: designer-authorable
  decision architectures (HSM for lifecycle states + decision trees/BT for
  action selection + utility scoring), the brain-to-intent-to-execution
  separation (AI drives the same character controller and combat systems as
  the player), perception (sight cones, hearing, damage aggro, alert
  ladder), threat and target selection with hysteresis, attack tokens as
  the pacing and difficulty regulator, lifecycle (spawn, patrol, leash,
  respawn), 3-tier AI LoD, and light group coordination. References:
  Genshin Impact's GDC 2021 scalable AI pipeline, Doom 2016 / God of War
  attack tokens, souls-like aggro and leash. Use when designing or building
  enemy AI, behavior trees, aggro systems, enemy spawning, AI performance
  scaling, or when enemies all attack at once, flip targets, or walk
  through walls.
---

# Enemy AI Framework

Build the enemy AI layer of an action game. References: Genshin Impact's
GDC 2021 scalable AI system (200+ designer-authored archetypes), the attack
token model (Doom 2016, God of War 2018), souls-like aggro/leash. Excluded
(covered elsewhere): boss phase data (`combat-system`), companion/town NPC
schedules.

## The two architecture rules

1. **The brain decides; the body is the player's.** AI emits intents —
   `MoveTo(pos)`, `Attack(target, skillId)` — consumed by the **same
   character controller and combat system as the player**. Never direct
   transform or animation manipulation. Payoff: staggers/knockbacks/cancels
   work identically, no movement cheating, hitboxes implemented once, and
   you can plug an AI brain into the player character for soak tests.
   ("Have the AI press buttons.")
2. **Decision architecture by role, designer-authorability as the deciding
   criterion** (Genshin rejected one big BT for productivity):

```
HSM            → lifecycle/context states (idle/patrol/combat/return,
                 boss phases — Genshin's "Key State Manager")
Decision trees → action selection INSIDE a state (light, stateless,
   or BT          re-composable; BT if your team knows it)
Utility scores → continuous parametric choices (target, skill, position)
Planning (GOAP/HTN) → only when multi-step improvisation IS the fantasy
```

Genshin's shipped pipeline (per-frame, modular, each module independently
tickable): `Sensing → Threat → Target Select → Reactions → Scripted →
Group → Positioning` — modules recompose per archetype; designers author
new enemies without engineers.

## Attack tokens (the pacing regulator)

One system controls difficulty AND readability:

- N tokens per encounter; an enemy **claims** before attacking, **releases**
  after (end, whiff, interruption, death — release in the state teardown,
  never just the happy path, plus a safety timeout).
- Separate **melee and ranged pools** (1 melee + 1–2 ranged baseline; +1
  per difficulty tier — exact shipped counts were never published).
- **Off-token enemies look busy**: reposition, strafe, flank, posture,
  taunt — never statically wait (GoW's "kung fu circle").
- Subtleties from shipped systems: Doom lets demons **steal** tokens
  (better angle/proximity takes over); GoW lets an interrupted enemy
  **keep** its token briefly (anti-starvation of aggressors).
- **Difficulty scales by tokens, not HP**: more tokens + faster
  redemptions = harder, instead of bullet sponges.

## Build order (4 shippable tiers)

```
Tier 1 — One enemy that fights fair
- [ ] HSM lifecycle (idle/patrol/combat/return) + decision tree for attacks
- [ ] Intent bridge: AI drives the shared controller/combat systems
- [ ] Perception: sight cone + LoS raycast + hearing events + hit = aggro
- [ ] DEBUG OVERLAY FROM DAY 1: perception cones, active state, target,
      path, token holders (the #1 productivity item)
Tier 2 — Encounters
- [ ] Attack tokens (melee/ranged pools, guaranteed release, timeout)
- [ ] Threat model: proximity + damage (+flat per hit) + taunt override;
      ratio hysteresis (switch at >=120% of current target's threat)
- [ ] Slot-based positioning (arc/circle around target — no conga lines)
- [ ] Leash: home + radius, return = a brain state (waits for the current
      action), heal + invuln during return, abort if re-engaged close
Tier 3 — World integration
- [ ] Spawners: encounters, waves, world respawn timers (12 h common /
      daily elites — the Genshin model), persistent state by stable IDs
- [ ] AI LoD 3 tiers (the Genshin model): full sim in combat; ~30 Hz near;
      5 Hz + animation paused far — degraded PER MODULE, coherently
- [ ] Streaming guards: validate paths, dormant if the combat cell isn't
      loaded (see open-world-streaming)
- [ ] Alert ladder (idle -> suspicious -> combat) + group alarm
      propagation + last-known-position with TTL
Tier 4 — Texture & scale
- [ ] Group roles with caps (flanker/approacher/shooter — the TLOU
      Combat Coordinator model), squad blackboard
- [ ] Per-instance personality params (aggression, courage, timer jitter)
      — kill the "identical robots" feel
- [ ] Champion pattern (elite holding expensive tokens + harassing minions)
- [ ] Difficulty via behavior (tokens, reaction speed, move usage), stats
      as fine-tuning only
```

## Numbers (starting points — tune by playtest)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Sight cone | 120° H × 60° V; 20–30 m fodder (Genshin: 30 m, 200 m in combat) | Genshin datamine |
| Hearing | 15–20 m (navmesh distance, not euclidean) | Genshin/TLOU |
| Awareness | hit = instant 100; proximity fills in ~0.2–1 s; alarm propagates ~12 m | Genshin datamine |
| Perception tick | 5–10 Hz throttled; 30 Hz in combat | Genshin GDC |
| Threat | +20 per hit received, decay ~3%/s, switch at +20% ratio (NOT time-based) | Genshin/WoW model |
| Tokens | 1 melee + 1–2 ranged; return delay 0.5–1.5 s (inference — counts unpublished) | convention |
| Active attackers | 3–5 attacking, 6–10 alive (souls encounters: 1–4) | genre convention |
| Leash | 2–3× aggro range; out-of-zone timer 3–5 s; full heal on return | souls params/Genshin |
| Telegraphs | 0.4 s light / 0.6–0.8 s heavy / ≥1 s boss (≥0.3–0.5 s floor: reaction time 0.25 s + buffer) | design refs |
| Recovery | 0.3 s (no punish) → 1–1.5 s (signature punishable) | Hollow Knight analysis |
| Tracking | turn during windup, decay to 0 during active frames (so dodging works) | souls convention |
| AI budget | Genshin ships 30+ NPCs at **0.5 ms** on mobile (2–3 ms pre-optimization) | GDC 2021 |
| Pathfinding | async queue, ~2 ms or ~4 paths/frame; never synchronous in combat | community practice |

Full sourced tables with the "undocumented — don't invent" list in
[architecture.md](./architecture.md).

## Engine mapping

| Generic block | Unity 6 | UE5 (5.4+) |
| --- | --- | --- |
| Brain | **Unity Behavior** (official, functional but frozen since 2025 — team laid off; isolate behind an interface) · custom HSM/BT · Behavior Designer | **BT + Blackboard** (mature, great debug) · **StateTree** (Epic's recommendation for new projects 5.5+; HSM+BT hybrid, on-demand selection) |
| Perception | Custom: OverlapSphere + multi-point LoS raycasts + stimulus event bus (nothing built-in) | **AIPerception** (sight/hearing/damage) — know the quirks: MaxAge=0 never forgets, enable Forget Stale Actors, configure sight target points |
| Intent bridge | `agent.updatePosition=false` + read `desiredVelocity` → shared controller; resync `nextPosition` | **AIController/Pawn split is native** — the brain/body separation built in |
| Navigation | AI Navigation package (NavMeshSurface, links, runtime tile rebake) | Navmesh + nav links + **Detour Crowd** avoidance + nav invokers |
| Tokens | Custom token manager / encounter director | Custom; **Smart Objects** = a native claim-based primitive reusable for tokens |
| LoD | Custom bucket scheduler + Animator culling + agent throttling | **Significance Manager** + tick intervals + URO animation throttling |
| Scale (crowds) | DOTS has no official AI stack — community territory | **Mass/MassAI**: prototyping blocks, production needs custom C++; ambient crowds only |

Structural fact: UE5 ships ~5 of the 6 blocks natively; Unity ships
navigation and a frozen brain — the rest is yours. The one block custom
everywhere: **attack tokens**.

## Failure modes

The 14 classic AI bugs (direct transform writes, everyone-attacks-at-once
or token starvation, target flip-flop, navmesh desync after knockback,
perception through walls, conga lines, leash exploits, streaming-border
freezes, stale blackboards, no-LoD full-rate ticking, decision thrash,
animation/decision desync, stat-inflation difficulty, untestable AI) are
cataloged in [pitfalls.md](./pitfalls.md) with symptom → root cause →
prevention.

## Related skills

- `character-controller` / `combat-system` — the body: AI intents drive
  these; staggers and hit events flow back to the brain.
- `open-world-streaming` — AI residency at cell borders, the bubble model.
- `world-time-weather` — time divisions and weather flags as blackboard
  inputs; night spawn windows.
- `adaptive-audio` — the aggro/threat ladder triggers combat music.
- `loot-drop-system` — death hands off to the drop pipeline; tier
  substitution via the spawn director.
- `coop-session` — server-owned AI, per-player threat tables.
- `game-architecture-patterns` — State (HSM), Type Object (archetypes),
  Event Queue (stimuli), Update Method (LoD scheduling) theory.
