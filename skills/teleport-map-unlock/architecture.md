# Architecture — unlock model, waypoint registry, teleport sequence, policy

The components of a production fast-travel system. All numbers are
**starting points — tune by playtest**; flagged gaps at the bottom.
Primary sources: Zelda Dungeon/Zelda Wiki (Travel Gates), the Stamen
cartographic analysis of BotW's map, Genshin Fandom wiki (waypoint
change history, Portable Waypoint), Digital Foundry/Polygon load
measurements, official engine docs.

## The unlock model

- **Two decoupled layers, confirmed by shipped data**: BotW towers
  download **terrain only** (relief, water, roads) — shrines, named
  locations and POI stay hidden until physically found or scoped. The
  Stamen analysis confirms the data model: terrain revealed *per
  region* (binary), POI discovered *per item*, with a third icon state
  for towers/shrines ("detected but not activated" orange vs
  "activated" blue). The unlock model is therefore:

```
regionTerrainRevealed[regionId]  : bool        (tower/statue flag)
poiDiscovered[poiId]             : bool        (individual discovery)
poiActivated[poiId]              : bool        (waypoint activation)
-- map UI, travel UI, and completion % all DERIVE from these flags
```

- **The chained unlock (Genshin)**: statue activation reveals the
  named area's terrain AND makes the area's **locked waypoints
  visible** on the map (greyed icons); each then requires approach +
  interact to activate (50 AEXP + 5 primogems). Three mechanisms
  coexist: interaction unlock, quest-gated *visibility* (~40 waypoints
  invisible until their quest — Tsurumi, Sumeru undergrounds,
  Meropide), and scripted auto-unlock by quest step.
- **The trigger as content**: BotW towers are climb challenges (the
  traversal cost is the price of the reveal); TotK moves the challenge
  to an access puzzle per tower and makes the tower a reusable
  catapult (launch + skydive scan revealing surface AND sky — the
  Depths are revealed separately by 120 Lightroots, each sitting at
  the mirrored coordinates of a surface shrine). Statues add heal/
  revive/stamina services (see `traversal-system` for the stamina
  economy).
- **Alternative reveal models** (one line each): item-based (Elden
  Ring: 19 map fragments picked up at stelae — reveal divorced from
  structures), automatic visit-based reveal (softened Ubisoft model).

## The waypoint registry

Definitions as data assets; activation state in the save
(`save-persistence`).

```
WaypointDef:
  id            stable string/GUID (never scene-dependent)
  type          shrine | tower | statue | domain-entrance |
                significant-location | player-placed
  worldPos      Vector3
  mapPos        Vector2 + MAP LAYER id        (multi-floor worlds)
  spawnPoint    Vector3 + facing              (NOT the marker pos)
  visibility    optional quest-flag condition
  services      heal zone, region reveal, launch pad...
```

- **The designated spawn point is proven in shipped data**: Genshin
  statues teleport to *specific* per-statue coordinates (some inside
  the heal radius, some not); BotW Travel Gates spawn Link facing
  *outward* from the structure; the Travel Medallion spawns facing
  opposite to placement. Spawn ≠ marker, and facing is data.
- **Network shapes**: BotW 142 Travel Gates in the base game (120
  shrines + 15 towers + 7 special — including the Divine Beast gates
  that *deactivate* after completion: waypoints can have dynamic
  lifecycle). Genshin: 638 permanent waypoints (61 at launch — the
  wiki traces every addition; ~40–50 per major region), typed
  regular/underground/underwater, plus 50 statues and domain
  entrances as separate target types.
- **Density as a design dial**: BotW ~1.7 points/km² on a datamined
  80 km² map (~800 m spacing — the trip between points *is* the game)
  vs Genshin ~20–24/km² on ~24–27 km² of land (~200–220 m — the daily
  farming routine is the game). A ~12× gap, both correct for their
  design.
- **Player-placed waypoints — the mini-spec** (Genshin Portable
  Waypoint + BotW/TotK Travel Medallion): count limit (1 → 3 in TotK,
  gated by 10 then 15 regions mapped — the custom network rewards map
  progress); lifetime (Genshin: 7 days); placement validation that
  refuses invalid states (air, water, instances) *without consuming
  the item*; exact position+orientation restore (unlike standard
  waypoints); replacement confirmation when placing over the limit.
  Teleporting to a Portable Waypoint resets nearby enemies (unlike
  standard waypoints) — lifecycle differences are per-type data.
- **Discovery UX**: a 3D pointer toward locked waypoints appears
  within 30 m and disappears beyond 40 m (hysteresis in the data);
  icons follow the hidden / visible-locked / activated pipeline.

## The teleport sequence

No GDC/datamine documents either game's internal pipeline — this is a
blueprint assembled from observable behavior, engine docs, and the
sibling skills' gates. The sequence is an **exclusive state machine**:
one request at a time, input locked from confirmation, defined cancel
points only before the streaming-source move.

```
1. VALIDATE      target unlocked? policy matrix allows (context)?
                 -> typed denial reasons drive UI messages
2. CONFIRM       map UI confirm; idempotent (ignore while running)
3. LOCK          input lock; CanSave = false (save-persistence)
4. FADE          fade/loading screen in (anti-flash rules from
                 scene-flow-manager)
5. JUMP          move the streaming source to the target
6. AWAIT         residency gates: cells loaded + collision present
                 (ground raycast) + navmesh ready — WITH TIMEOUT and
                 fallback (retry, degraded known-safe spawn, error)
7. PLACE         at spawnPoint + facing; velocity zeroed;
                 interpolation reset; controller-safe write;
                 spawn-safety overlap check (enemies, players, moved
                 objects) with fallback offsets
8. RESTORE       aggro cleared; region systems resubscribed (weather,
                 audio, spawn director — world-time-weather);
                 buffs preserved BY DESIGN (Genshin food buffs tick
                 through; waypoints can be heat sources draining
                 Sheer Cold — services fire on arrival)
9. CAMERA        warp notify (no damping traversal), framing preset
10. REVEAL       fade out; input unlock; CanSave = true
```

- **In-world vs cross-instance**: a domain teleport in Genshin brings
  you to the *entrance* (in-world); entering is a separate scene
  transition with the EnterScene handshake; leaving mid-run resets
  instance progress. Cross-instance teleports must go through
  `scene-flow-manager` (instance teardown, return-position snapshot
  taken at **entry** time, not exit) — never a raw source move.
- **What survives** (verified): food buffs persist (Genshin); aggro is
  dropped; the mount stays behind (BotW — whistle is earshot-only;
  the Ancient Saddle adds a horse-teleport *with target-side placement
  validation*: refused where a horse can't stand or enemies are near);
  co-op guests teleport using *their own* unlocked waypoints in the
  host's world, never "to a player".
- **Loading cost is hardware-dominated** (measured): BotW Switch
  19–30 s → Switch 2 ~12 s; TotK Switch 2 ~5–8 s; Genshin NVMe 3–8 s /
  HDD 20–30 s. Neither reference game does seamless teleports — the
  residency guarantee is worth the screen. Genshin's teleport also
  forces a confirmed server sync (a de-facto save point).

## Fast travel policy

- **Earned-only** is the core: no destination before physical
  discovery; first trip earned, rest free. Cost variants in one line
  each: RDR2 (paid coach), Witcher 3 (signpost-to-signpost only),
  Morrowind (diegetic overlapping transport networks). Dragon's Dogma
  2's restriction stance ("travel is only boring if your game is
  boring") marks the other pole of the dial.
- **The restriction matrix** — every cell is a verified design
  decision, not a default:

| Context | BotW | Genshin |
| --- | --- | --- |
| Overworld combat | allowed | allowed (standard escape) |
| Falling | allowed | **allowed — documented fall-damage escape** |
| Instances | denied (Divine Beasts, Hyrule Castle: "Leave" only) | denied (domains: Leave Domain only) |
| Scripted quests | rare locks | priority quests block teleport ("must complete before teleporting") |
| Co-op | — | guest's own unlocks; no teleport-to-player |

  Each denial has a *typed reason* surfaced in UI ("Priority quest…",
  "Cannot use in current state"). No cooldowns in either game —
  restrictions are contextual, never temporal.
- **The map as travel UI**: open map → tap pin → confirm is the
  canonical flow, from anywhere. Dense networks need QoL: region
  selector, type filters, route tracking that includes "via the
  nearest *locked* waypoint" (Genshin v5.5 Track and Guide). A text
  search was NOT confirmed — filters, not search.
- **Return-trip design**: instances exit to their entrance; the
  post-boss teleport offer is a generic pattern (not in the reference
  games).

## Progression integration

- **Completion currencies stay separate**: region reveal (towers/
  statues), waypoint activation (per-item), statue levels (oculi →
  stamina, in `traversal-system`). Genshin's region exploration % is a
  weighted threshold system where waypoints/statues weigh heaviest —
  exact values unpublished (qualitative only; do not invent).
- **Multi-layer maps** (Genshin v4.0, official): the layer selector
  appears contextually when the cursor hovers a multi-level zone;
  waypoint pins in layered zones carry a **sub-icon**; off-layer
  indicators render dashed; sub-maps are themselves quest-gated
  (Enkanomiya via the Inscribed Map, Chasm underground via its
  questline). Four separate map environments exist beyond Teyvat's
  surface. The rule: **the layer is waypoint data, never inferred
  from 2D position** (the Sumeru underground-waypoint confusion is
  the documented counterexample — see pitfalls #10).

## Flagged gaps — do NOT invent

The internal pipelines of both games (the sequence above is a
blueprint) · BotW tower heights (no reconfirmable measurements) ·
TotK's +89 m launch (single weak source) · exact Genshin exploration %
weights · "never more than X m from a waypoint" (only the ~200 m
spacing inference exists) · Genshin mobile/PS5 load measurements ·
Genshin teleport-in-combat as *official* policy (community consensus
only) · Travel Medallion denied in shrines/dungeons (uncorroborated) ·
BotW named-location count (187 vs 226, unresolved conflict).

## Sources

Zelda Dungeon (Travel Gate — the reference page) · Stamen cartographic
analysis of BotW's map · Zelda/Fandom wikis (Sheikah/Skyview Towers,
Ancient Saddle) · Game8/Polygon/Destructoid (Travel Medallion chain) ·
Genshin Fandom (Teleport Waypoint change history, Portable Waypoint,
Statue of The Seven, Map, Error messages) · HoYoverse Developers
Discussions (Multi-Layered Map v4.0, map QoL) · Digital Foundry +
Polygon (measured load times) · GameFAQs datamine (BotW 80 km² map) ·
KQM TCL · Unity/Epic official docs (teleport APIs, World Partition
streaming sources, LWC).
