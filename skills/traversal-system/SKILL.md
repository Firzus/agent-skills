---
name: traversal-system
description: >-
  Architecture blueprint for the traversal layer above the character
  controller in open-world games: world traversability data (climbable-by-
  default surface markup, runtime surface probing, traversal volumes,
  anchor points) and composable traversal verbs (systemic climbing, glide,
  swim/dive, grapple, mounts, regional verbs) with declared contracts,
  stamina as the open-world governor (upgrade curves, consumables, regional
  pools), traversal assists and feel, vault/mantle detection windows, and
  the design valves against traversal trivializing content. References:
  BotW/TotK and Genshin Impact (the systemic school). Use when designing or
  building climbing, gliding, swimming, mounts, grappling, traversal
  progression, or when players climb out of bounds, probes fail on seams,
  or endgame traversal trivializes the world.
---

# Traversal System

Build the traversal layer of an open-world game — the system **above** the
character controller (`character-controller` owns the movement states,
stamina rates, and the mantle cascade basics; this skill owns the world
data, the verb catalog, and the economy). References: BotW/TotK and
Genshin Impact — the systemic school.

## The architecture rule

**Traversal is a dialogue between world markup and player verbs.**

```
WORLD SIDE — traversability data
  surface markup    climbable-BY-DEFAULT, no-climb as the authored
                    exception (the BotW inversion); surface state as
                    dynamic modifier (wet = slippery), not a second tag
  runtime probing   shape sweeps (never single rays) -> hits -> refined
                    position/normal -> climb frame
  volumes           water (swim/dive), updrafts, currents, ladders —
                    each declares: verb enabled, gravity override, drain
  anchors           placed grapple points/hookpoints (designer-controlled
                    counterpoint to systemic surfaces)

VERB SIDE — composable modules (the Capabilities pattern)
  each verb declares:
    required world data   (surface tags / volumes / anchors / nothing)
    controller services   (gravity off, collision profile, reorientation,
                          motion warping)
    costs                 (stamina/s, per-action bursts, alternate pools)
    animation set + IK policy
    interrupt contract    (what cuts me, what state I exit to, what
                          inputs buffer through)
  granting: progression / equipment / region (regional gating = the
  verb's world-data requirement is only satisfiable there)

ARBITER — the stamina economy (and its regional variants)
```

Verbs emit intents into the controller pipeline — never write velocity or
position. Volumes publish forces as intents too; **each verb declares its
response** (glide takes full updraft, climb damps it).

## The economy is the level design

- **No invisible walls: stamina is the wall, weather is the valve.**
  BotW's gating is economic (an unaffordable cliff is impassable *for
  now*) and meteorological (rain closes vertical routes — with designed
  workarounds the system anticipates: timed climb-jumps, fire updrafts,
  ability bypasses).
- **The climb→glide loop is the core economy**: altitude is spent
  stamina; gliding converts it back to horizontal distance. Grant the
  descending verb *after* the player has felt the cost of ascending (the
  paraglider as THE world-opening moment).
- **Upgrades redraw the map**: each stamina tier changes which cliffs are
  climbable (BotW: 4 orbs = 1 vessel, 10 vessels max; Genshin: +7/+8 per
  statue tier, 65→180 oculi per region). Consumables = renting stamina
  for one specific climb → route-planning gameplay (read the cliff, spot
  the rest ledges, "can I make this?").
- **Against endgame trivialization** (the documented BotW→TotK tension):
  (a) diegetic re-constraints (gloom, rain — players accept fictional
  limits, never silent verb-disabling); (b) the Genshin **regional verb
  refresh** (each region ships new verbs + new pools: Sorush, diving,
  Saurians/Phlogiston) — the catalog rotates instead of old verbs
  scaling; (c) composition spaces (TotK Ultrahand — combinatorial verbs
  never exhaust).

## Build order (4 shippable tiers)

```
Tier 1 — Climb the world
- [ ] Surface markup channel (climbable-by-default + authored no-climb,
      with a DEBUG VISUALIZATION mode — reviewable from day 1)
- [ ] Surface prober: shape sweep + refinement traces -> stable climb
      frame; hysteresis to exit (N failed probes, never one)
- [ ] Climb verb over the controller HSM: tangent movement, angle-scaled
      drain, climb-jump burst, corner handling (wrap-probe + slerp)
- [ ] Mantle/vault: the GDC windows (vault 0.4-0.8x height, mantle
      0.8-1.4x, detect within 2.5x bbox width)
Tier 2 — The air loop
- [ ] Glide verb + dive transition; updraft volumes (glide declares it
      listens; lift refills/pauses drain — the BotW rule)
- [ ] Verb transition buffering: jump->glide->dive chains (buffer
      ~100-120 ms through transitions, clear-on-consume, re-entry
      refractory ~200-300 ms after climb->jump)
- [ ] Terminal stamina policy (grace window / auto-ledge / slide-not-
      fall — never a silent unfair release mid-overhang)
- [ ] Per-verb camera presets (reference camera-system)
Tier 3 — Water, anchors, regions
- [ ] Swim/dive: surface (stamina wall) vs free-3D underwater (separate
      pool, no drowning — the Fontaine model); currents as consumed data
- [ ] Grapple: anchor registry + LoS validation + swing through the
      SAME collide-and-slide solver
- [ ] Regional verb granting (module add/remove at runtime; gating via
      world-data requirements)
- [ ] IK visual layer (hands/feet on surfaces; reach-clamped, weight
      ramped down during bursts)
Tier 4 — Mounts & polish
- [ ] Mount as controller-swap (rider controller disabled wholesale,
      mesh to seat socket, VALIDATED dismount query)
- [ ] Road auto-follow; whistle/summon rules; auto-dismount volumes
- [ ] Assist ladder exposed in settings (snap tolerances, auto-vault)
- [ ] Streaming + save guards (verbs check world-data residency;
      mid-traversal load -> last safe grounded position)
```

## Numbers (starting points — the strongest anchors)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Vault / mantle windows | 0.4–0.8× / 0.8–1.4× character height; detect ≤2.5× bbox width | GDC 2012 (Splash Damage) |
| Climb angle cap | ~140° max (45° overhang) if overhangs are designed; else ~90° | tutorial convention |
| BotW wheel economics | ~20–25 s climb or ~40–45 s glide per wheel; 4 orbs × 10 vessels | community/wiki |
| Genshin glide | 3 stamina/s vs 25/s grounded regen — altitude is the limit, not stamina | wiki |
| Stamina curves | BotW 1→3 wheels (+2 food temp); Genshin 100→240 (+7/+8 per statue tier) | wiki |
| Rain slip (BotW) | ~3–5 steps then slip; jump-before-slip nets gain — the designed workaround | community |
| Horse speeds (BotW) | gallop 14.4–18.6 m/s by stars (~3–4× sprint); spurs 2–5 | measured |
| Transition buffers | ~100–120 ms verb buffer; ~100 ms coyote on surface exits (Celeste 5f as reference) | measured + convention |
| Underwater (Fontaine) | separate non-upgradable pool, sprint-only drain, no drowning; tap-swim ~9% faster (measured) | KQM |

Flagged — never invent: BotW climb m/s and meters-per-wheel, glide ratios,
updraft lift speeds, absolute grab distances (only the GDC *relative*
windows are citable). Full tables in [architecture.md](./architecture.md).

## Engine mapping

| Generic block | Unity 6 | UE5 (5.4+) |
| --- | --- | --- |
| Traversability data | Layer = query filter + `SurfaceProfile` component (SO definition, collider-keyed cache); terrain via splat/vertex channels | Collision channel filter + Gameplay Tags + Physical Material SurfaceType; nav-baked traversal segments (community plugins) |
| Surface prober | `SphereCastNonAlloc` fan + normal aggregation; pre-cooked MeshColliders; probe only near climb candidacy | `SweepMultiByChannel` capsule + refinement traces; **complex-trace only for the refinement pass** (locomotion stays on simple) |
| Verb modules | HSM states/modules (the controller's pattern) | CMC `MOVE_Custom` submodes; GAS abilities gating verbs by tags; Mover modes when production-ready |
| Mantle/vault | Motion-warp equivalents via root-motion steering | **Motion Warping** notify windows + warp targets; **GASP**'s detect→param-struct→chooser→warped-montage pipeline (note: stock GASP needs authored ledge splines — generalize via traces) |
| Traversal volumes | Trigger volumes → intent pipeline (never direct velocity; built-in WindZone is particles-only) | `APhysicsVolume`/custom overlaps → CMC force accumulator |
| Authored content | Splines package (`NativeSpline` for runtime) + scene markers with SO definitions | `USplineComponent` actors; warp targets; anchor actors |
| IK layer | Animation Rigging (TwoBoneIK per limb, raycast targets, reach-clamped) | Control Rig + Full-Body IK, effectors from probe hits |
| Mounts | Controller-swap pattern (disable rider wholesale, attach mesh not capsule) | Possession swap (full transfer) vs attached pawn (rider keeps abilities) |

## Failure modes

The 13 classic traversal bugs (climbing forbidden geometry, probe
failures on seams, corner breakage, verb transition dead zones, stamina
edge cases, IK stretching, moving-surface climbing, wind fighting verbs,
mount desyncs, grapple exploits, traversal trivializing content,
streaming integration, save/load mid-traversal) are cataloged in
[pitfalls.md](./pitfalls.md) with symptom → root cause → prevention.

## Related skills

- `character-controller` — the movement HSM, stamina rates, mantle
  cascade, and intent pipeline this layer drives.
- `world-time-weather` — weather as the traversal valve (rain slip,
  updrafts); the wet-surface state consumed by climbing.
- `teleport-map-unlock` — the teleport-vs-traversal tension; earned-only
  unlocks as the shared anti-cannibalization principle.
- `open-world-streaming` — verbs check world-data residency; traversal
  speed defines streaming radii.
- `camera-system` — per-verb camera presets.
- `save-persistence` — mid-traversal restore policies.
- `game-architecture-patterns` — Component (verbs), Type Object (surface
  profiles), Event Queue (volume intents) theory.
