# Combat — tokens, telegraphs, lifecycle, LoD, groups

The encounter side. All numbers are **starting points**. Sources: Doom GDC 2018,
GoW GDC 2019, souls `NpcThinkParam`, Genshin GDC 2021.

## Attack tokens (the difficulty dial)

- **Claim → attack → release**, with release **guaranteed in state teardown**
  (death, stagger, leash — not just attack-end) + a safety timeout on held tokens
  (pitfalls #2).
- Pools by attack type (melee/ranged/charge — Doom's model), costs per enemy type
  (GoW: a fixed pool, big enemies cost more tokens).
- **GoW's scoring pass** (periodic, not per-frame): can-be-aggressive → designer
  Aggression Priority per type with application range → is the player's target →
  Action Rank (on/off screen, camera angle, distance). Sort, then distribute.
- **Doom's steal rule**: a demon with a better angle/proximity can take a token —
  kills the "standing dumbly in front of the player" failure.
- **GoW's interruption rule**: a hit enemy keeps its token briefly — aggressors
  don't starve.
- Off-token: reposition, strafe, flank, posture, vocal taunts (enemies "look busy").
  The Kingdoms of Amalur generalization: an 8-slot grid around the player with grid
  capacity + attack capacity.
- **This is the difficulty dial**: Doom's Nightmare = more tokens + more simultaneous
  redemptions. Behavior scales difficulty; stats fine-tune (pitfalls #13).

## Telegraphs & fairness (the readability contract)

- Anticipation = player reaction time (**0.25 s**) + ability trigger time + a
  difficulty buffer. Floors: **0.3–0.5 s minimum** for significant attacks; 0.4 s
  light / 0.6–0.8 s heavy / ≥1 s boss nukes.
- Recovery = the punish window you *grant*: 0.3 s (deliberately denied) → 1–1.5 s
  (signature punishable moves) — the Hollow Knight measured pattern.
- **Tracking turns during windup, decays to zero during active frames** so
  strafing/dodging works (the souls convention; DS2/DS3 were criticized for in-swing
  360° tracking). 90–180°/s windup is a starting inference. The broader believability
  case (telegraphed aggression, the fairness contract) is in
  [believability.md](./believability.md).

## Lifecycle & spatial behavior

- **Spawn**: scripted waves (reinforce at ~50% cleared — inference), placed
  encounters (spawners + conditions + density caps), world population (Genshin:
  commons respawn 12 h after kill, elites on the daily reset).
- **Patrol**: waypoint routes + idle variety + randomized micro-pauses — patrols
  communicate alertness to the player.
- **Leash (the souls model, from `NpcThinkParam`)**: home + tether radius; beyond it
  (or LoS lost too long) → a **return state in the brain** (never an override — it
  waits for the current action to finish), full heal + partial immunity during
  return, **abort-return if the target closes in** (`backhomeBattleDist` — FromSoft's
  own anti-looking-broken mitigation). Hysteresis band between aggro and leash radii
  (pitfalls #7).
- **Despawn**: distance cap (pool return), corpse timers, encounter end; persistent
  state keyed by **stable IDs** for streaming.
- **Streaming**: AI in unloaded cells doesn't exist — only persistent flags survive;
  a combat-locked ring of cells around active fights; path validity checked before
  commit, fallback behaviors when unreachable (pitfalls #8). See `open-world-streaming`.

## AI LoD (the Genshin 3-tier model, verified)

| Tier | Condition | Tick | Degradations |
| --- | --- | --- | --- |
| LOD0 | in combat (+ bosses) | full (modules 30 Hz) | none |
| LOD1 | near, out of combat | ~30 Hz, some modules 50% | simplified pathfinding, reduced sensing |
| LOD2 | distant | 5 Hz, some paused | animations paused, skinned meshes hidden |

- **Degrade per module, coherently** — decision, perception, repath, and animation
  drop together; a LoD'd enemy must never slide without animation (pitfalls #10).
- Budget proof: 30+ NPCs at 60 fps mobile, **0.5 ms/frame after** LoD + multithreading
  (from 2–3 ms before).
- The bubble generalization: full AI near, abstract simulation beyond (logical
  positions at ~1 Hz, no animation/physics), pooled despawn beyond that. The crowd-
  scale techniques (flow fields, Mass/DOTS) are in [techniques.md](./techniques.md).
- Pathfinding: always async (~0.5–2 ms/path); budget ~2 ms or ~4 paths/frame; combat/
  on-screen agents served first.

## Group coordination (light)

- **Squad blackboard**: shared memory; tasks posted (flank, cover, investigate),
  scored per agent, claimed exclusively.
- **Roles with caps** (the TLOU Combat Coordinator): Flanker, Approacher,
  OpportunisticShooter, Investigator — best-candidate selection (the ideal flanker
  paths around the player's *combat vector*).
- **Formations**: encirclement slots (the kung-fu circle / 8-slot grid); data-driven
  spacing per enemy type (kills the conga line, pitfalls #6).
- **The champion pattern**: one elite holding the expensive tokens + minions
  harassing off-token (Halo's Brute Chieftain: kill the leader, the Grunts flee).
- **Anti-"identical robots"**: per-instance personality params, jitter on cooldowns/
  reactions, idle variety, combat vocalizations (see [believability.md](./believability.md)).

## Flagged gaps — do NOT invent

Doom/GoW/Halo exact token counts (systems confirmed, numbers never published) ·
token cooldown durations · per-enemy souls leash radii · wave sizing · enemy turn
rates in deg/s.

## Sources

Loudy & Campbell *Embracing Push Forward Combat* (Doom, GDC 2018) · Sheth *Evolving
Combat in God of War* (GDC 2019) · Genshin GDC 2021 (LoD) · Souls Modding
`NpcThinkParam` · Game AI Pro (Kung-Fu Circle, TLOU Combat Coordinator) · GDKeys
*Anatomy of an Attack* · Hollow Knight telegraph analysis.
