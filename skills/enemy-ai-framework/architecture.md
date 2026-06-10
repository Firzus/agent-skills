# Architecture — brain, perception, threat, tokens, lifecycle, LoD

The components of a production enemy AI framework. All numbers are
**starting points — tune by playtest**. Primary source: Shuo Xu, *Genshin
Impact: Building a Scalable AI System* (GDC 2021).

## Decision architecture

**The comparison, settled by designer authorability:**

- **Behavior trees** (the Halo 2 legacy: priority lists + binary relevancy,
  behavior masking, max depth ~4): mature, reactive via decorators, but
  grows unmanageably and "why did it NOT fire" debugging is hard. Genshin
  started with one big BT and **abandoned it** — every new behavior meant
  restructuring the tree.
- **Genshin's shipped answer**: a modular per-frame **pipeline**
  (`Sensing → Threat → Target Select → Reactions → Scripted → Group →
  Positioning`), each module independent and recomposable per archetype;
  **decision trees** (light, stateless, top-down) for action selection;
  the **Key State Manager** — a designer-facing FSM whose states (boss
  phase, buff status, alertness) enable/disable decision trees and skills.
  Result: 200+ archetypes authored by designers.
- **Utility scoring** for continuous parametric choices (target, skill,
  position — Killzone's tactical position scoring; Genshin has a dedicated
  Ability-scoring module). Tuning curves are opaque to designers — scope
  it to scoring, not control flow.
- **GOAP/HTN** (F.E.A.R. → Horizon): only when emergent multi-step
  improvisation is the product. BTs/HSMs cover ~80% of action-game needs.

**The composition rule**: HSM owns lifecycle states; decision trees/BT
select actions within a state; utility scores parameters; everything is
data the designers author.

## The intent bridge (brain → body)

```
Brain (HSM/DT)  →  Intents (MoveTo, Attack(target, skill), UseSkill)
                →  the SAME controller + combat system as the player
```

- F.E.A.R. formalized it: the planner only decides; execution runs through
  three generic states (move/animate/interact).
- The intent structure is the same one the player's input fills
  (`MoveVector` + virtual buttons). One position writer: the shared motor.
- Test invariant: **a knockback must displace an enemy exactly like the
  player.** If it doesn't, something is writing transforms directly.
- Combat events flow back: a stagger interrupts the current action and
  notifies the brain (action failed, token released) — the same contract
  as `combat-system`'s interrupt propagation.

## Perception

- **Sight**: cone (120° H × 60° V, the Genshin near-universal) + LoS
  raycasts to **multiple body points** (head/torso — Splinter Cell
  Blacklist checks 8 bones; never just the pivot), excluding the agent's
  own colliders. **Gradual detection** (awareness meter filling by
  distance/light/stance — never binary). Genshin: 15–45 m idle by type,
  expands to 200 m in combat; awareness fills in ~0.2–1 s; hit = instant
  100; on full, an **alarm propagates 12 m** to nearby enemies.
- **Hearing**: stimulus events with radius + loudness; measure distance
  **along the navmesh** (TLOU) so walls muffle properly.
- **Alert ladder**: unaware → suspicious (investigate) → searching →
  combat; serious discoveries never fully de-escalate (Blacklist's one-way
  ratchet); search gives up on a timer (15–25 s starting point —
  undocumented convention).
- **Group sharing**: one sees → a data packet (position + timestamp)
  broadcast to nearby allies with natural delay (the TLOU model).
- **Memory lives in a knowledge model, not in behaviors** (Isla's Halo 2
  lesson): last-known-position with TTL, search patterns around it.
- Tick perception at 5–10 Hz throttled, 30 Hz in combat (Genshin's tiers).

## Threat & target selection

The Genshin 3-layer model (documented):

1. **Proximity** — default targeting (8 m common, 15 m elite detection).
2. **Damage threat** — +20 Aggression per hit received from a target
   (fast-hitting characters pull aggro); decays ~3%/s.
3. **Taunt override** — taunt level vs resistance, limited radius, bosses
   immune.

- **Hysteresis is ratio-based in shipped systems**, not time-based:
  Genshin switches at **+20%** over the current target; WoW at 110%
  (melee) / 130% (ranged). Starting point: switch at ≥120% or add a 2–3 s
  lockout (the lockout is inference).
- Co-op distribution: weight recent damage + proximity so aggro rotates;
  cap N enemies per player via the token pool.

## Attack tokens

The full design (see SKILL.md for the summary):

- **Claim → attack → release**, with release **guaranteed in state
  teardown** (death, stagger, leash — not just attack-end) + a safety
  timeout on held tokens.
- Pools by attack type (melee/ranged/charge — Doom's model), costs per
  enemy type (GoW: a fixed pool, big enemies cost more tokens).
- **GoW's scoring pass** (periodic, not per-frame): can-be-aggressive →
  designer Aggression Priority per type with application range → is the
  player's target → Action Rank (on/off screen, camera angle, distance).
  Sort, then distribute from the pool.
- **Doom's steal rule**: a demon with a better angle/proximity can take a
  token — kills the "standing dumbly in front of the player" failure.
- **GoW's interruption rule**: a hit enemy keeps its token briefly —
  aggressors don't starve.
- Off-token: reposition, strafe, flank, posture, vocal taunts (the
  enemies "look busy"). The Kingdoms of Amalur generalization: an 8-slot
  grid around the player with grid capacity + attack capacity.
- **This is the difficulty dial**: Doom's Nightmare = more tokens + more
  simultaneous redemptions. Behavior scales difficulty; stats fine-tune.

## Lifecycle & spatial behavior

- **Spawn**: scripted waves (reinforce at ~50% cleared — inference),
  placed encounters (spawners + conditions + density caps), world
  population (Genshin: commons respawn **12 h** after kill, elites on the
  **daily reset** — not a blanket 12–24 h).
- **Patrol**: waypoint routes + idle variety + randomized micro-pauses —
  patrols also communicate alertness to the player.
- **Leash (the souls model, from the `NpcThinkParam` fields)**: home +
  tether radius; beyond it (or LoS lost too long) → **return state in the
  brain** (never an override — it waits for the current action to finish),
  full heal + partial immunity during return, **abort-return if the
  target closes in** (`backhomeBattleDist` — FromSoft's own
  anti-looking-broken mitigation). Hysteresis band between aggro and
  leash radii. Genshin's equivalent: Defense Zone radius + out-of-zone
  clear timers (3–5 s).
- **Despawn**: distance cap (pool return), corpse timers, encounter end;
  persistent state (position, HP, alive flags) keyed by **stable IDs**
  for streaming (BotW revival flags, Skyrim cell resets).
- **Streaming**: AI in unloaded cells doesn't exist — only persistent
  flags survive; combat-locked ring of cells around active fights; path
  validity checked before commit, fallback behaviors (return home, local
  patrol) when unreachable. See `open-world-streaming`.

## AI LoD (the Genshin 3-tier model, verified)

| Tier | Condition | Tick | Degradations |
| --- | --- | --- | --- |
| LOD0 | in combat (+ bosses) | full (modules at 30 Hz) | none |
| LOD1 | near, out of combat | ~30 Hz, some modules at 50% | simplified pathfinding, reduced sensing |
| LOD2 | distant | 5 Hz, some modules paused | animations paused, skinned meshes hidden |

- **Degrade per module, coherently** (Genshin's asynchronous module
  ticks): decision, perception, repath, and animation drop together — a
  LoD'd enemy must never slide without animation.
- Budget proof: 30+ NPCs at 60 fps mobile, **0.5 ms/frame after**
  LoD + multithreading (Sensing/Threat/scoring/DT in worker threads,
  blackboard on main) — from 2–3 ms before.
- The bubble generalization: full AI near, abstract simulation beyond
  (logical positions at ~1 Hz, no animation/physics), pooled despawn
  beyond that.
- Pathfinding: always async (a path costs 0.5–2 ms on a real navmesh);
  budget ~2 ms or ~4 paths/frame; combat/on-screen agents served first.
  At Genshin's scale: pathfinding moved server-side entirely (6 GB
  navmesh, client sends Query, receives corners).

## Group coordination (light)

- **Squad blackboard**: shared memory; tasks posted (flank, cover,
  investigate), scored per agent, claimed exclusively.
- **Roles with caps** (the TLOU Combat Coordinator): Flanker, Approacher,
  OpportunisticShooter, Investigator — best-candidate selection (the
  ideal flanker paths around the player's *combat vector* — the average
  of recent aim directions used as a pathfinding cost).
- **Formations**: encirclement slots (the kung-fu circle / 8-slot grid),
  data-driven spacing per enemy type.
- **The champion pattern**: one elite holding the expensive tokens +
  minions harassing off-token (Halo's Brute Chieftain: kill the leader,
  the Grunts flee).
- **Anti-"identical robots"**: per-instance personality parameters
  (aggression, courage, accuracy — Halo 2's "styles", Genshin's archetype
  params), random jitter on cooldowns/reactions, idle variety, combat
  vocalizations announcing states (Halo: ~100 events → ~320 lines).
- Synchronized/paired attacks: designer-authored only, grouped token
  reservation + animation sync points.

## Telegraphs & fairness (the readability contract)

- Anticipation = player reaction time (**0.25 s**) + ability trigger time
  + difficulty buffer. Floors: **0.3–0.5 s minimum** for significant
  attacks; 0.4 s light / 0.6–0.8 s heavy / ≥1 s boss nukes.
- Recovery = the punish window you *grant*: 0.3 s (deliberately denied)
  → 1–1.5 s (signature punishable moves) — the Hollow Knight measured
  pattern.
- **Tracking turns during windup, decays to zero during active frames**
  so strafing/dodging works (the souls convention; DS2/DS3 were
  criticized for in-swing 360° tracking). Exact deg/s values are
  undocumented — 90–180°/s windup is a starting inference.

## Undocumented — do NOT present as fact

Doom/GoW/Halo exact token counts (systems confirmed, numbers never
published) · token cooldown durations · search give-up timers ·
per-enemy souls leash radii (extractable from params, no public table) ·
non-Genshin AI CPU budgets · time-based switch hysteresis (shipped
systems use ratios) · wave sizing · enemy turn rates in deg/s.

## Sources

Shuo Xu, *Genshin Impact: Building a Scalable AI System* (GDC 2021,
slides) · Isla, *Handling Complexity in the Halo 2 AI* (GDC 2005) + Halo 3
objectives (GDC 2008) · Orkin, *Three States and a Plan* (F.E.A.R., GDC
2006) · Loudy & Campbell, *Embracing Push Forward Combat* (Doom, GDC
2018) · Sheth, *Evolving Combat in God of War* (GDC 2019) · Game AI Pro:
Kung-Fu Circle (Amalur), Blacklist perception, TLOU Combat Coordinator ·
Dave Mark (utility/IAUS) · Genshin wiki Aggravation/Reset datamines ·
Souls Modding `NpcThinkParam` · GDKeys *Anatomy of an Attack* · AI and
Games breakdowns.
