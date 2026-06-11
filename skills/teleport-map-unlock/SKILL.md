---
name: teleport-map-unlock
description: >-
  Architecture blueprint for fast travel, waypoint networks, and map unlocking
  across open-world games: the region-unlock and map-reveal model (towers/statues
  revealing terrain vs POI layers, fog-of-war data structures, the Ubisoft-tower
  lineage and its fatigue, item/proximity/purchase reveal methods), the waypoint
  registry (stable IDs, designated spawn point + facing, map layers,
  discovery/activation states, player-placed waypoints), the atomic teleport
  sequence (validate, confirm, input lock, fade, streaming jump, residency gates,
  physics-safe placement, camera warp, state restoration) including seamless
  no-loading-screen travel, large-world precision, and networked/anti-cheat
  teleport, and fast-travel design policy (the cost/restriction spectrum from
  diegetic Morrowind networks to free map-warp, earned-only unlocks, the
  cannibalization-vs-respecting-time debate, network density and topology).
  References: BotW/TotK and Genshin, with Morrowind, Elden Ring, Dragon's Dogma,
  Death Stranding, and the Ubisoft-tower lineage as design references, and
  Spider-Man/Rift Apart for seamless tech. Use when designing or building fast
  travel, teleport waypoints, map reveal/fog unlock, tower/statue activation, or
  when players fall through the world on arrival, the camera whiplashes, the map
  drowns in icons, or a quest leaves teleport locked.
---

# Teleport & Map Unlock

Build the fast-travel layer of an open-world game: how the map gets revealed, how
the waypoint network grows, how a teleport executes, and what travel *policy* the
game adopts. References: BotW/TotK (towers, 142 Travel Gates) and Genshin (638
waypoints, statues, multi-layer maps), with the Morrowind→Oblivion→Ubisoft-tower
design lineage and Spider-Man/Rift Apart seamless tech.

## The architecture rule

**One unlock model, one waypoint registry, one teleport sequence — the map UI and
the travel UI both derive from the same flags.**

```
UNLOCK/REVEAL  terrain layer (per region) + POI layer (per item) + icon states;
               fog as flags/bitmask; choose tower / proximity / item / purchase
WAYPOINT       stable ID, type, world+map position + MAP LAYER, DESIGNATED SPAWN
REGISTRY       POINT + FACING (never the marker), visibility condition, state
TELEPORT       validate → confirm → input lock → fade → CanSave=false → move
SEQUENCE       streaming source → AWAIT RESIDENCY (cells+collision+navmesh) →
               place at spawn (velocity zeroed, interp reset) → restore → camera
DESIGN POLICY  earned-only, the cost/restriction matrix, density, topology
```

In-world teleport = a streaming jump with all the hard gates of
`open-world-streaming`. Cross-instance teleport (domains) goes through the
`scene-flow-manager` handshake — never a raw streaming-source move.

## Reference map

| File | Covers |
| --- | --- |
| [unlock-reveal.md](./unlock-reveal.md) | The two-layer unlock model (terrain vs POI), the chained statue unlock, fog-of-war data structures, the reveal-method spectrum (tower / proximity / item / statue / visit / purchase), the Ubisoft-tower lineage and "tower fatigue", icon-soup and decluttering, multi-layer maps, accessibility |
| [waypoint-registry.md](./waypoint-registry.md) | The waypoint definition schema, the designated spawn point + facing, network shapes and density, dynamic-lifecycle waypoints, player-placed waypoints, discovery UX |
| [teleport-sequence.md](./teleport-sequence.md) | The atomic state-machine sequence, the residency gate (fall-through defenses), physics-safe placement, camera warp, large-world precision (floating origin / LWC), seamless no-loading travel, save integration, networked/anti-cheat teleport |
| [design-policy.md](./design-policy.md) | The cost/restriction spectrum (diegetic → free), the history (Morrowind → Oblivion → Ubisoft tower), the cannibalization-vs-respecting-time debate, earned-only, the restriction matrix, density and topology, travel-as-content |
| [pitfalls.md](./pitfalls.md) | 16 failure modes (symptom → cause → prevention) with real incidents (New World fall-through, BotW softlock, Sumeru layer mismatch, tower fatigue), debugging order, ship checklist |

## What the shipped data proves

- **Two decoupled reveal layers**: BotW towers download **terrain only** (relief,
  water, roads) — POI stay hidden until found or scoped. Genshin statues
  additionally reveal the area's **locked waypoints** (a chained unlock). Map UI,
  travel UI, and completion % all derive from the same flags.
- **Spawn ≠ marker**: Genshin statues teleport to specific per-statue coordinates;
  BotW Travel Gates spawn Link facing *outward*. The designated spawn point and
  facing are data.
- **Loading is hardware-dominated** (measured): BotW Switch 19–30 s → Switch 2
  ~12 s; Genshin NVMe 3–8 s / HDD 20–30 s — neither does seamless teleports, the
  residency guarantee is worth the screen.

## Build order (4 shippable tiers)

```
Tier 1 — The registry and the sequence
- [ ] Waypoint definitions as data (ID, type, positions, spawn point + facing,
      map layer) + activation state in the save
- [ ] The atomic teleport sequence with residency gates and timeout fallback
- [ ] Physics-safe placement: velocity zeroed, interp reset, camera warp notify
- [ ] Map-as-travel-UI: tap pin → confirm → travel
Tier 2 — Unlock and reveal
- [ ] Region unlock flags driving terrain reveal; choose a reveal method
- [ ] Tower/statue activation flow (interact → flag → reveal + waypoint grant)
- [ ] Icon state pipeline (hidden / visible-locked / activated)
- [ ] Discovery UX; decluttering plan (avoid icon soup)
Tier 3 — Policy and edge cases
- [ ] The restriction matrix as data (per-context rules + denial messages)
- [ ] Spawn safety: capsule overlap validation, fallback offsets
- [ ] CanSave=false during the sequence; idempotent requests
- [ ] Large-world precision: floating origin (Unity) or LWC (UE5) at corners
Tier 4 — Layers, instances, player waypoints, online
- [ ] Multi-layer maps: layer is waypoint DATA
- [ ] Cross-instance teleport through the scene-flow handshake
- [ ] Player-placed waypoints (limit, lifetime, placement validation)
- [ ] Networked teleport: server-validated destination, co-op spawn slots
```

## Key numbers (starting points — sourced anchors)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Network sizes | BotW 120 shrines + 15 towers on 80 km²; Genshin 638 waypoints + 50 statues | wiki/datamine |
| Density | BotW ~1.7 pts/km² (~800 m) vs Genshin ~20–24/km² (~200 m) — a ~12× gap | derived |
| Load times | BotW Switch 19–30 s → Switch 2 ~12 s; Genshin NVMe 3–8 s / HDD 20–30 s | measured |
| Float precision | Unity jitter from ~2–5 km out; UE5 LWC doubles default since 5.1 | docs |
| Spider-Man streaming | ~800 tiles of 128 m², ~1 tile/sec; fast travel masked by subway anim | PS Blog |
| Discovery pointer | locked-waypoint 3D pointer: appears ≤30 m, gone >40 m (hysteresis) | wiki |
| Player waypoints | 1 (BotW DLC, Genshin 7-day) → 3 (TotK, gated by regions mapped) | wiki |
| Dragon's Dogma 2 | Portcrystal $2.99 MTX backlash; Capcom pointedly did NOT sell Ferrystones | press |

Full sourced tables (with flagged "do-not-invent" gaps) in each reference file.

## Engine mapping (summary)

| Generic block | Unity 6 | UE5 (5.4+) |
| --- | --- | --- |
| Body teleport | `rb.position` (not `MovePosition`) + `Physics.SyncTransforms()`; toggle interpolation around the set | `SetActorLocation(..., TeleportPhysics)` + zero `CharacterMovement->Velocity` |
| Camera warp | `CinemachineCore.OnTargetObjectWarped` (CM3 static) | toggle SpringArm camera lag (community pattern) |
| AI | `NavMeshAgent.Warp()` | destination navmesh streamed (WP per cell) |
| Streaming jump | Addressables + hand-rolled residency gate | WP Streaming Source → `IsStreamingCompleted` → teleport; `bBlockOnSlowLoading` |
| Large worlds | floating origin — the teleport fade is the ideal rebase moment | LWC doubles on by default since 5.1 |
| Networked | server validates intent, replicates position | `Server` RPC + `WithValidation` |

Full detail in [teleport-sequence.md](./teleport-sequence.md).

## Related skills

- `open-world-streaming` — the residency gates this sequence awaits.
- `scene-flow-manager` — cross-instance teleports use its handshake.
- `minimap-worldmap` — fog rendering, marker registry, map layers UI (this skill
  owns the unlock *data model*, that one owns the display).
- `save-persistence` — unlock flags, CanSave gate, atomic writes.
- `traversal-system` — the teleport-vs-traversal tension; earned-only as the
  shared principle.
- `quest-system` — priority-quest teleport locks; quest-gated waypoint visibility.
- `camera-system` — warp notification, post-teleport framing.
- `coop-session` — server-authoritative teleport, spawn-slot resolution.
