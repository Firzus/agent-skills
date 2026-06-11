# Decision & perception — the brain, sensing, threat

The brain side. All numbers are **starting points**. Primary source: Shuo Xu,
*Genshin Impact: Building a Scalable AI System* (GDC 2021).

## Decision architecture (settled by designer authorability)

- **Behavior trees** (the Halo 2 legacy): mature, reactive via decorators, but grow
  unmanageably and "why did it NOT fire" debugging is hard. Genshin started with one
  big BT and **abandoned it** — every new behavior meant restructuring the tree.
- **Genshin's shipped answer**: a modular per-frame **pipeline** (`Sensing → Threat →
  Target Select → Reactions → Scripted → Group → Positioning`), each module
  independent and recomposable per archetype; **decision trees** (light, stateless,
  top-down) for action selection; the **Key State Manager** — a designer-facing FSM
  whose states (boss phase, buff, alertness) enable/disable decision trees and skills.
  Result: 200+ archetypes authored by designers.
- **Utility scoring** for continuous parametric choices (target, skill, position).
  Tuning curves are opaque to designers — scope it to scoring, not control flow.
- **GOAP/HTN** (F.E.A.R. → Horizon): only when emergent multi-step improvisation is
  the product. BTs/HSMs cover ~80% of action-game needs. The full architecture matrix
  (FSM vs BT vs GOAP vs HTN vs utility/IAUS, with trade-offs) is in
  [techniques.md](./techniques.md).

**The composition rule**: HSM owns lifecycle states; decision trees/BT select
actions within a state; utility scores parameters; everything is data designers
author.

## The intent bridge (brain → body)

```
Brain (HSM/DT) → Intents (MoveTo, Attack(target, skill), UseSkill)
               → the SAME controller + combat system as the player
```

- F.E.A.R. formalized it: the planner only decides; execution runs through three
  generic states (move/animate/interact).
- The intent structure is the same one the player's input fills (`MoveVector` +
  virtual buttons). One position writer: the shared motor.
- **Test invariant**: a knockback must displace an enemy exactly like the player. If
  it doesn't, something is writing transforms directly (pitfalls #1).
- Combat events flow back: a stagger interrupts the current action and notifies the
  brain (action failed, token released) — the same contract as `combat-system`'s
  interrupt propagation.

## Perception

- **Sight**: a cone (120° H × 60° V, the Genshin near-universal) + LoS raycasts to
  **multiple body points** (Splinter Cell Blacklist checks 8 bones; never just the
  pivot), excluding the agent's own colliders. **Gradual detection** (an awareness
  meter filling by distance/light/stance — never binary). Genshin: 15–45 m idle by
  type, expanding to 200 m in combat; awareness fills in ~0.2–1 s; hit = instant 100;
  on full, an **alarm propagates 12 m**.
- **Hearing**: stimulus events with radius + loudness; measure distance **along the
  navmesh** (TLOU) so walls muffle properly.
- **The alert ladder**: unaware → suspicious (investigate) → searching → combat;
  serious discoveries never fully de-escalate (Blacklist's one-way ratchet); search
  gives up on a timer (15–25 s starting point). The deep stealth treatment (alert
  meters, the Alien Isolation two-brain model) is in [genres.md](./genres.md).
- **Group sharing**: one sees → a data packet (position + timestamp) broadcast to
  nearby allies with natural delay (the TLOU model).
- **Memory lives in a knowledge model, not in behaviors** (Isla's Halo 2 lesson):
  last-known-position with TTL, search patterns around it.
- Tick perception at 5–10 Hz throttled, 30 Hz in combat (the LoD tiers in
  [combat-tokens.md](./combat-tokens.md)).

## Threat & target selection

The Genshin 3-layer model (documented):

1. **Proximity** — default targeting (8 m common, 15 m elite detection).
2. **Damage threat** — +20 Aggression per hit received from a target (fast-hitting
   characters pull aggro); decays ~3%/s.
3. **Taunt override** — taunt level vs resistance, limited radius, bosses immune.

- **Hysteresis is ratio-based in shipped systems**, not time-based: Genshin switches
  at **+20%** over the current target; WoW at 110% (melee) / 130% (ranged). Starting
  point: switch at ≥120% or add a 2–3 s lockout (the lockout is inference) —
  pitfalls #3.
- Co-op distribution: weight recent damage + proximity so aggro rotates; cap N
  enemies per player via the token pool.

## Numbers (sourced anchors)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Sight cone | 120° H × 60° V; 15–45 m idle / 200 m combat | Genshin datamine |
| Awareness | hit = 100 instant; proximity fills ~0.2–1 s; alarm 12 m | Genshin datamine |
| Hearing | 15–20 m (navmesh distance) | Genshin/TLOU |
| Perception tick | 5–10 Hz; 30 Hz in combat | Genshin GDC |
| Threat | +20/hit, decay ~3%/s, switch at +20% ratio | Genshin/WoW |

## Flagged gaps — do NOT invent

Search give-up timers (convention) · time-based switch hysteresis (shipped systems
use ratios) · non-Genshin perception ranges.

## Sources

Shuo Xu *Genshin Impact: Building a Scalable AI System* (GDC 2021) · Isla *Handling
Complexity in the Halo 2 AI* (GDC 2005) · Orkin *Three States and a Plan* (F.E.A.R.,
GDC 2006) · Game AI Pro (Blacklist perception, TLOU Combat Coordinator) · Genshin
wiki Aggravation datamines.
