---
name: combat-system
description: >-
  Architecture blueprint for action-game melee combat systems: data-driven
  attack graphs (combo strings, branches, charge attacks, cancel windows),
  animation-driven hit detection (active frames, hit registry, sweep traces),
  damage pipeline (motion values, crits, damage caps), stagger/poise/stun
  gauges and boss break cycles, the defensive kit (dodge i-frames, guard,
  parry/perfect timing windows), the skills/ultimate layer, and combat feel
  numbers (hit-stop, buffers, cancel timing). Primary reference: Granblue
  Fantasy Relink's combo-chain model, with Monster Hunter, DMC, Bayonetta,
  and souls-likes as calibration poles. Use when designing or building melee
  combat, combo systems, hitboxes, damage formulas, stagger/break mechanics,
  dodge/parry, or when combat feels unresponsive or mushy.
---

# Combat System

Build the melee combat core of an action game. Primary reference: **Granblue
Fantasy: Relink** (combo chains in the Monster Hunter lineage). This skill is
the engine-agnostic blueprint: the attack graph, hit detection, damage
pipeline, stagger economy, defensive kit, feel numbers, and failure modes.
Excluded (separate skills): enemy AI (`enemy-ai-framework`), combat camera
(`camera-system`), stats/equipment progression (`progression-economy`).

## Pick your philosophy first

Every number in a combat system depends on one upstream choice — where you
sit on the **commitment ↔ freeform** dial:

| Dial | Commitment (MH / souls) | Freeform (DMC / Bayonetta) | Relink |
| --- | --- | --- | --- |
| Cancels | Almost none | Everything → dodge/jump | Middle: dodge keeps string position |
| Dodge | Long, big i-frames, costly recovery | Short, spammable, perfect-fishing | Spammable + perfect reward |
| Hit-stop | Attacker-only, heavy | Both, short | Light, both |
| Defense reward | Survival | Style/Witch Time offense | Stun gauge → Link economy |
| Input buffer | Short/strict | Generous | Generous |

Pick one column as the spine; borrow from the other **deliberately**, never
by default. Mixing (e.g. freeform cancels + commitment damage) produces mush.

## The core model: a data-driven attack graph

The combo system is a **graph authored as data** (this is literally how MH
ships its weapon movesets, as FSM files with priority-ordered transition
lists):

- **Node = attack**: `{anim, windows (hitbox/cancel/branch), motion value,
  damage cap, costs/gains, hyperarmor frames}`
- **Edge = transition**: `{input, time window, state predicate (on-hit,
  resource, mode, charge-held)}` — edges ordered by priority (composed
  inputs evaluated before simple ones they contain).
- Branch types: on-input (light/heavy/directional), on-hit vs on-whiff,
  charge (hold), finishers (string payoff, often feeding a resource —
  Relink's finishers level up skill power).
- **Cancel semantics are explicit per edge**: Relink ships both — dodge
  cancel *preserves* string position (Bayonetta's Dodge Offset), guard
  cancel *resets* it. Preserve / reset / offset is a per-edge data field.

Designers add chains without touching code. The graph plugs into the
movement HSM (`character-controller` skill) as the combat state's content.

## Build order (4 shippable tiers)

```
Tier 1 — Hitting things
- [ ] Attack graph data format (nodes/edges) + a 3-hit string
- [ ] Animation-driven hitbox windows (tags on the timeline, never timers)
- [ ] Hit registry (one hit per target per swing) + HitEvent pipeline
- [ ] Damage = base x motion value; hit-stop on contact (attacker + victim)
Tier 2 — Responsiveness
- [ ] Input buffer (intent + timestamp, ~150-300 ms, depth 1, newest wins)
- [ ] Cancel windows per type (dodge/guard/skill) with explicit semantics
- [ ] Dodge with authored i-frames; guard with chip + guard-break gauge
- [ ] On-hit vs on-whiff branching; sweep traces for fast swings
Tier 3 — The reward economy
- [ ] Stagger: poise/flinch per attack + accumulated stun gauge -> 
      vulnerability window (Link Time model)
- [ ] Boss state cycle (Normal -> Overdrive -> Break) modulating damage
      taken/dealt and AI gating
- [ ] Perfect dodge / perfect guard (tight window, asymmetric rewards)
- [ ] Skills layer: cooldown slots + ultimate gauge, decoupled from the
      graph (skill = near-universal cancel target)
Tier 4 — Depth & scale
- [ ] Charge attacks, breakable parts (separate HP pools, MH model)
- [ ] Damage caps per node (Relink model) if long-tail gear progression
- [ ] Party/link layer: shared gauges + synchronized vulnerability windows
- [ ] Per-character graph variants over the shared data model
```

## Feel numbers (starting points — tune by playtest)

| Parameter | Starting point | Anchor |
| --- | --- | --- |
| Hit-stop light / medium / heavy / finisher | 2-4f / 4-8f / 8-15f / 15-30f (@60) | Smash formula `⌊dmg×0.65+6⌋` cap 30f; SF6 10-20f |
| Hit-stop scope | attacker + victim; world-freeze for finishers only | MH freezes attacker only (weapon "bite") — a deliberate exception |
| Dodge total / i-frames | 25-40f total; i-frames first 40-60% | Elden Ring 13f@30 i-frames; MH base 250 ms + skill investment |
| Perfect guard / parry window | 5-8f (83-133 ms) | Sekiro 12f@60 shrinking on spam; Relink ~5f (community) |
| Perfect dodge window | 10-15f — ~2x more lenient than parry, lower reward | Relink consensus; Bayonetta ~20f |
| Slow-mo reward | 2-4 s at 0.1-0.3x enemy speed | Witch Time 0.5-3 s |
| Attack input buffer | 10-18f (167-300 ms), depth 1 | FG 4-8f; action games run longer |
| On-hit cancel opens | at hit + hit-stop end (~20-30% earlier than whiff) | SF6 on-hit-only specials |
| Combo next-input grace | 0.3-0.5 s after recovery-cancel point | MH delay-tolerant strings |
| Motion values light / heavy / charged | 20-50 / 50-80 / 100-180 (% of base) | MH GS charge lv3 = 100-120 |
| Crit | x1.25, build-up to x1.5 | MH affinity model |
| Stun gauge threshold | ~8-15 light hits; +50-100% per proc (anti-stunlock) | MH KO escalation |
| Break/KO window | 8-15 s; damage taken x1.2-1.5 | Relink Break, MH KO |
| Screen shake | 0.15-0.25 s, trauma² amplitude, Perlin not random | GDC *Juicing Your Cameras* |

Full sourced tables in [architecture.md](./architecture.md).

## Engine mapping

| Generic block | Unity 6 | UE5 (5.4+) |
| --- | --- | --- |
| Attack graph data | ScriptableObject attack assets referencing next-node assets | GameplayAbilities + montage sections (single combo ability) or ability-per-attack chained by tags; GameplayTags as cancel rules |
| Hitbox windows | Animation events (prefer Animancer/Playables delegates over string events) toggling `Physics.OverlapCapsuleNonAlloc` per frame — **not** trigger colliders | `AnimNotifyState` (HitWindow/ComboWindow/InterruptWindow) doing per-tick socket sweep traces |
| Fast-swing safety | CapsuleCast from last-frame to current socket position | path-trace previous→current socket per tick |
| Damage pipeline | `IDamageable` + `DamageInfo` struct + C# events for feedback | GameplayEffect + ExecutionCalculation + meta attribute; GameplayCues for feedback |
| Hit-stop | per-`Animator.speed` on attacker+victim (NOT global `Time.timeScale`) | `CustomTimeDilation` per actor (NOT global dilation); cosmetic-only in netplay |
| Attack lunge/tracking | clamp steering in `OnAnimatorMove` | Motion Warping with translation/rotation limits |
| GAS-like layer | community GAS ports (no first-party); attributes+tags+effects+cues pattern | GAS is the standard backbone |

## Failure modes

The 12 classic combat bugs (hitbox desync, multi-hit duplicates, point-blank
whiffs, eaten inputs, animation pops on cancel, hit-stop bleeding into
UI/co-op, stagger-lock, duplicate damage, cancel exploits, knockback through
walls, tracking overshoot, graph/state desync) are cataloged in
[pitfalls.md](./pitfalls.md) with symptom → root cause → prevention.

## Related skills

- `character-controller` — the movement HSM this graph plugs into; shared
  input-buffer principles (intent + timestamp + context).
- `enemy-ai-framework` — the AI brain drives this same combat system via
  intents; attack tokens pace the enemies using these attacks.
- `camera-system` — hit-stop interaction (shake on unscaled time),
  lock-on and combat framing.
- `hud-system` — consumes the HitEvent pipeline (damage numbers, stun
  gauges, boss state UI).
- `game-architecture-patterns` — State, Type Object (attack data), Event
  Queue (hit events), Update Method theory.
- `unity6-aaa-best-practices` / `ue5-aaa-best-practices` — engine-wide
  practices assumed here.
