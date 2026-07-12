---
name: traversal-system
description: >-
  Architecture blueprint for traversal above the character controller:
  traversability markup, surface probing, volumes, anchors, climb/glide/swim,
  grapple, parkour, wall-run, web-swinging, mantle/vault traces, motion warping,
  IK, vehicles, stamina, networking, readability, and design constraints.
  Use when designing climbing, parkour, gliding, swimming, vehicles,
  grappling, traversal progression, or when players escape bounds, probes fail,
  automation overrides intent, or traversal trivializes the world.
---

# Traversal System

Build the traversal layer of an open-world or action game — the system **above**
the character controller (`character-controller` owns the movement states, stamina
rates, and the mantle cascade basics; this skill owns the world data, the verb
catalog, the technical implementation, vehicle traversal design, and the economy;
`mount-system` owns creature-mount lifecycle, control handoff, and movement).
References: BotW/TotK and Genshin (the systemic-climbing school), broadened with
the parkour/momentum tradition (Mirror's Edge, Titanfall 2, Spider-Man) and vehicle
traversal design (Death Stranding, TotK, Sea of Thieves).

## The architecture rule

**Traversal is a dialogue between world markup and player verbs.**

```
WORLD SIDE   climbable-by-default markup (BotW) OR authored+telegraphed routes
             (parkour); runtime shape-sweep probing; volumes (water/updraft/
             current/ladder); anchors; readability cues
VERB SIDE    composable modules (the Capabilities pattern); each declares its
             required world data, controller services, costs, animation/IK,
             and interrupt contract; granted by progression/equipment/region
IMPLEMENTATION  mantle/vault trace cascade → motion-warp → IK; surface probing
                at scale; wall-run/grapple physics; custom movement modes + net
VEHICLES    terrain gating, build-your-own, multi-crew; world-authored mount
            restrictions are facts consumed by `mount-system`
ECONOMY      stamina (spend/deplete) OR momentum (accumulate/protect) as the
             governor; the anti-trivialization valves
```

Verbs emit intents into the controller pipeline — never write velocity or position.

## The two economies (the headline contrast)

- **Systemic-climbing (BotW/Genshin)**: stamina is a resource you **spend and
  deplete**; an unaffordable cliff is impassable *for now*; the wall is economic,
  not an invisible barrier. Climb-everything removes the readability problem (every
  surface is an affordance) at the cost of route-reading skill.
- **Parkour/momentum (Mirror's Edge/Titanfall 2)**: speed is a resource you
  **accumulate and protect**; momentum is the "fuel" (loss felt as a slowdown, not
  a bar); geometry is **authored, telegraphed, and exclusive**, making *route-reading
  itself the skill*. The recurring fault line is **automation ↔ expression** — AC's
  "press up to win" backlash vs Mirror's Edge's losable manual inputs.

These reward **opposite** player behaviors — pick a school deliberately, or blend
knowingly (Dying Light's "Natural Movement" is climb-anything in first-person, at
the cost of breaking level-design smoke-and-mirrors).

## Reference map

| File | Covers |
| --- | --- |
| [world-data.md](./world-data.md) | Climbable-by-default markup (the BotW inversion), runtime surface probing, volumes, anchors, guidance without walls, AND readability/telegraphing (Runner Vision, the yellow=climbable convention, the freedom-vs-authored-route tension) |
| [verbs.md](./verbs.md) | The verb declaration contract, climbing/glide/swim/grapple deep dives, AND the parkour/momentum verbs (wall-run, free-running, web-swinging, the automation-vs-expression axis, coyote-time/buffering for flow) |
| [implementation.md](./implementation.md) | Mantle/vault/climb detection (the trace cascade, GASP), motion warping, procedural IK, surface probing at scale, wall-run and grapple physics, custom movement modes and network prediction |
| [vehicles.md](./vehicles.md) | Mechanical vehicles as traversal: terrain-gated transport, build-your-own physics, and multi-crew traversal design; runtime implementation belongs in a future `vehicle-system` |
| [economy.md](./economy.md) | Stamina as the governor (upgrade curves, consumables, regional pools), the climb→glide loop, and the design valves against endgame trivialization |
| [pitfalls.md](./pitfalls.md) | 14 failure modes (symptom → cause → prevention) with debugging order and ship checklist |

## Build order (4 shippable tiers)

```
Tier 1 — Climb/parkour the world
- [ ] Surface markup channel (climbable-by-default + authored no-climb) with a
      DEBUG VISUALIZATION, OR authored+telegraphed parkour routes
- [ ] Surface prober: shape sweep + refinement → stable climb frame; hysteresis
- [ ] Climb/parkour verb over the controller HSM
- [ ] Mantle/vault: the GDC windows + the trace cascade
Tier 2 — The air/momentum loop
- [ ] Glide + dive (stamina school) OR wall-run + momentum chaining (parkour)
- [ ] Verb transition buffering (coyote-time, jump buffer, refractory)
- [ ] Terminal stamina policy / momentum-loss feedback
- [ ] Per-verb camera presets
Tier 3 — Water, anchors, regions, grapple
- [ ] Swim/dive; grapple/swing through the SAME collide-and-slide solver
- [ ] Regional verb granting; IK visual layer (warp first, IK polishes)
Tier 4 — World integration, vehicles, polish
- [ ] World-authored mount restrictions/candidates expose typed facts to
      `mount-system`; traversal never executes mount lifecycle
- [ ] Vehicles / build-your-own if used; multi-crew if co-op
- [ ] Assist ladder in settings; streaming + save guards
```

## Key numbers (starting points — the strongest anchors)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Vault / mantle windows | 0.4–0.8× / 0.8–1.4× character height; detect ≤2.5× bbox | GDC 2012 (Splash Damage) |
| Coyote time / jump buffer | ~80–150 ms (often coded 0.1 s) — flow enablers | tutorials (approx) |
| Titanfall 2 momentum | acrobatic chaining ~30 mph (~2× sprint); wall-run speed rises over time | dev (ceiling) |
| BotW wheel economics | ~20–25 s climb / ~40–45 s glide per wheel; 4 orbs × 10 vessels | community |
| GASP detection | trace cascade → Chooser Table → Motion Warping (UE5.4+) | Epic |

Full sourced tables (with flagged "do-not-invent" gaps) in each reference file.

## Engine mapping (summary)

| Generic block | Unity 6 | UE5 (5.4+) |
| --- | --- | --- |
| Movement base | Kinematic Character Controller + custom states | CMC `MOVE_Custom` + `PhysCustom`; **Mover plugin** (experimental) |
| Mantle detection | `CapsuleCast`/`SphereCast` cascade | trace cascade → **GASP** `TryTraversalAction` |
| Align anim→geometry | `Animator.MatchTarget` + Animation Rigging | **Motion Warping** (`AddOrUpdateWarpTarget*`, Skew Warp) |
| Limb IK | Animation Rigging `TwoBoneIKConstraint` | Control Rig FBIK, Foot Placement |
| Wall-run/grapple | custom state + Verlet/distance constraint | `MOVE_Custom` + Verlet; Cable Component for rope |

Full detail in [implementation.md](./implementation.md).
