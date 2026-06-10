---
name: teleport-map-unlock
description: >-
  Architecture blueprint for fast travel, waypoint networks, and map
  unlocking in open-world games: the region unlock model (towers/statues
  revealing terrain vs POI layers, multi-state icons), the waypoint
  registry (stable IDs, designated spawn point + facing, map layers,
  discovery/activation states, player-placed waypoints), the atomic
  teleport sequence (validate, confirm, input lock, fade, streaming jump,
  residency gates, placement, state restoration), and fast travel design
  policy (earned-only unlocks, restriction matrix, network density, the
  teleport-vs-traversal tension). References: BotW/TotK and Genshin
  Impact. Use when designing or building fast travel, teleport waypoints,
  map reveal/fog unlock, tower/statue activation, or when players fall
  through the world on arrival, the camera whiplashes across the map, or
  a quest leaves teleport locked.
---

# Teleport & Map Unlock

Build the fast-travel layer of an open-world game: how the map gets
revealed, how the waypoint network grows, and how a teleport actually
executes. References: BotW/TotK (142 Travel Gates, towers) and Genshin
Impact (638 waypoints, statues, multi-layer maps).

## The architecture rule

**One unlock model, one waypoint registry, one teleport sequence — the
map UI and the travel UI both derive from the same flags.**

```
UNLOCK MODEL (region-keyed flags in the save)
  terrain layer    revealed per REGION (tower/statue activation)
  POI layer        revealed per ITEM (physical discovery) — BotW
                   towers reveal terrain ONLY; POI stay hidden
                   (Genshin statues additionally reveal the region's
                   LOCKED waypoints — a chained unlock)
  icon states      hidden -> visible-locked -> activated (-> completed)
                   2-3 states per POI type, all derived from flags

WAYPOINT REGISTRY (definitions as data + state in the save)
  per waypoint: stable ID, type (shrine/tower/statue/domain-entrance/
  player-placed), world position, map position + MAP LAYER,
  DESIGNATED SPAWN POINT + FACING (never the marker position),
  visibility condition (quest flag), activation state
  player-placed waypoints: count limit, lifetime, placement
  validation (deny in air/water/instances), exact-pose restore

TELEPORT SEQUENCE (atomic, state-machine exclusive)
  validate (unlocked? policy allows now?) -> confirm UI -> input lock
  -> fade -> CanSave=false -> move streaming source -> AWAIT RESIDENCY
  (cells + collision + navmesh, with timeout) -> place at spawn point
  + facing (velocity zeroed, interpolation reset) -> restore state
  (aggro cleared, region systems resubscribed, buffs preserved BY
  DESIGN) -> camera snap (warp notify, no damping traversal) -> reveal
```

In-world teleport = a streaming jump with all the hard gates of
`open-world-streaming`. Cross-instance teleport (domains) goes through
the `scene-flow-manager` handshake — never a raw streaming-source move.

## Fast travel design policy

- **Earned-only**: no destination exists before physical discovery —
  the first trip is earned, the rest are free. This is the
  anti-cannibalization core (the teleport-vs-traversal tension from
  `traversal-system`): both reference games charge zero resources but
  charge *discovery*.
- **The restriction matrix is design, not defaults** — every cell is a
  decision: BotW allows teleport anywhere (even mid-combat, even
  falling) except inside Divine Beasts and Hyrule Castle; Genshin
  blocks on priority quests and instances but NOT overworld combat,
  and *allows* mid-fall teleport as the documented fall-damage escape.
  Write the matrix (combat / falling / scripted quest / instance /
  co-op) and test each cell as content.
- **The last-100-meters principle**: teleport gets the player close,
  traversal does the rest. Waypoints belong adjacent to real activity
  hubs; a waypoint that leaves a 3-minute walk reads as punitive.
- **Density is a genre dial**: BotW ~1.7 points/km² (~800 m spacing,
  travel between points is the game) vs Genshin ~20 points/km²
  (~200 m, farming routine is the game). Pick deliberately.
- **The player-placed waypoint** is its own mini-spec: BotW DLC 1 →
  TotK 3 (gated by regions mapped — the custom network rewards map
  progress), Genshin 1 with 7-day lifetime; placement validation
  refuses air/water/instances without consuming the item; restores
  exact pose (vs designated spawn for standard waypoints).

## Build order (4 shippable tiers)

```
Tier 1 — The registry and the sequence
- [ ] Waypoint definitions as data assets (ID, type, positions, spawn
      point + facing, map layer) + activation state in the save
- [ ] The atomic teleport sequence with residency gates and timeout
      fallback (in-world only)
- [ ] Physics-safe placement: velocity zeroed, interpolation reset,
      controller toggle/sync, camera warp notify
- [ ] Map-as-travel-UI: tap pin -> confirm -> travel (markers via the
      minimap-worldmap registry)
Tier 2 — Unlock and reveal
- [ ] Region unlock flags driving the terrain reveal (fog rendering
      stays in minimap-worldmap)
- [ ] Tower/statue activation flow (interact -> flag -> reveal +
      waypoint grant) with atomic save write
- [ ] Icon state pipeline (hidden / visible-locked / activated)
- [ ] Discovery UX: approach pointer for locked waypoints (Genshin:
      visible at 30 m, gone at 40 m), activation reward hook
Tier 3 — Policy and edge cases
- [ ] The restriction matrix implemented as data (per-context rules +
      error messages per denial reason)
- [ ] Quest-gated visibility and scripted auto-unlocks
- [ ] Spawn safety: capsule overlap validation at arrival, fallback
      offsets, never spawn into enemies/players/moved objects
- [ ] CanSave=false during the sequence; idempotent requests (ignore
      while a sequence runs)
Tier 4 — Layers, instances, player waypoints
- [ ] Multi-layer maps: layer is waypoint DATA (icon variant, layer
      switch UI, spawn carries the layer — never inferred from 2D)
- [ ] Cross-instance teleport through the scene-flow handshake
      (instance teardown, return-position snapshot taken at ENTRY)
- [ ] Player-placed waypoints (limit, lifetime, placement validation,
      exact-pose restore)
- [ ] Co-op rules (guest uses own unlocks; spawn slot resolution)
```

## Numbers (starting points — sourced anchors)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Network sizes | BotW: 120 shrines + 15 towers on 80 km² (datamined map size); TotK: 152 shrines + 120 Lightroots (each exactly under a surface shrine — mirrored coordinates); Genshin: 638 permanent waypoints + 50 statues | wiki/datamine |
| Density / spacing | BotW ~1.7 pts/km² (~800 m); Genshin ~20-24 pts/km² (~200-220 m) — a ~12× density gap, both shipped | derived |
| Reveal granularity | 1 tower = 1 region (BotW avg ~5.3 km²); 1 statue = 1 named area + its locked waypoints | wiki |
| Measured load times | BotW Switch 19-30 s → Switch 2 ~12 s; TotK Switch 2 ~5-8 s; Genshin NVMe 3-8 s / SATA 8-12 s / HDD 20-30 s — hardware dominates | measured |
| Cooldowns | none in either game; restrictions are contextual, not temporal | wiki |
| Discovery pointer | locked-waypoint 3D pointer: appears ≤30 m, disappears >40 m (hysteresis) | wiki |
| Activation reward | Genshin: 5 primogems + 50 AEXP per waypoint/statue | wiki |
| Player waypoints | 1 (BotW DLC, Genshin 7-day) → 3 (TotK: +1 at 10 regions, +1 at 15) | wiki |
| Exploration % | waypoints/statues are the heaviest weights in Genshin's region % — exact point values unpublished (do not invent) | community |

Flagged — never invent: BotW tower heights, exact Genshin exploration
weights, internal streaming pipeline details of either game (the
sequence here is a blueprint, not a datamine). Full tables in
[architecture.md](./architecture.md).

## Engine mapping

| Generic block | Unity 6 | UE5 (5.4+) |
| --- | --- | --- |
| Body teleport | `rb.position` (never `MovePosition`) + `Physics.SyncTransforms()`; toggle `interpolation = None`/restore around the set (avoids the 1-frame smear); CharacterController: `enabled = false/true` around the transform write | `TeleportTo` / `SetActorLocation(..., ETeleportType::TeleportPhysics)` then zero `CharacterMovement->Velocity` (`None` recalculates velocity from the delta — the fly-away bug); detach from movable base first |
| Camera warp | Cinemachine 3.x: `CinemachineCore.OnTargetObjectWarped(target, delta)` — **static** in CM3, pass the exact tracked transform; full snap: `PreviousStateIsValid = false` | toggle `bEnableCameraLag` around the teleport (community pattern — no official flush API); watch `bDoCollisionTest` waking up inside geometry |
| AI | `NavMeshAgent.Warp()` (returns false if no navmesh) — never set transform on an active agent | AI pawns need destination navmesh streamed (WP streams navmesh per cell) |
| Streaming jump | Addressables/scene loads + a hand-rolled residency gate (handles done + ground raycast) before releasing the fade | The documented WP flow: enable a `WorldPartitionStreamingSource` at destination → `Is Streaming Completed` → teleport → disable source; `bBlockOnSlowLoading`; avoid `FlushAsyncLoading` (game-thread hitch) |
| Large worlds | No native double precision (confirmed) — floating origin; **the teleport fade is the ideal origin-shift moment** | LWC doubles on by default since 5.1 — no origin shifting needed |
| Waypoint data | ScriptableObject definitions + runtime state dict in the save | PrimaryDataAsset/DataTable rows + Gameplay Tags; state in SaveGame |
| Instances | Additive scene + scene-flow handshake | Level Instances / sub-world partitions (5.4+); seamless travel persists only what's explicitly listed |

## Failure modes

The 14 classic fast-travel bugs (teleport before residency, camera
whiplash, velocity leaking through, unsafe spawn points, float
precision at map edges, stale state after arrival, save mid-sequence,
unlock flag desync, teleport exploits, multi-layer map mismatch,
input/UI races, infinite loading screens, density mistakes,
cross-instance leaks) are cataloged in [pitfalls.md](./pitfalls.md)
with symptom → root cause → prevention.

## Related skills

- `open-world-streaming` — the residency gates this sequence awaits;
  teleport = streaming jump.
- `scene-flow-manager` — cross-instance teleports use its handshake;
  loading screen patterns.
- `minimap-worldmap` — fog rendering, marker registry, map layers UI
  (this skill owns the unlock *data model*, that one owns the display).
- `save-persistence` — unlock flags, CanSave gate, atomic writes.
- `traversal-system` — the teleport-vs-traversal tension; earned-only
  as the shared principle.
- `camera-system` — warp notification, post-teleport framing.
