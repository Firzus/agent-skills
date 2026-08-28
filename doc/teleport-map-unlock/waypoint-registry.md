# Waypoint registry — schema, spawn points, density

Definitions as data assets; activation state in the save (`save-persistence`). All
numbers are **starting points**.

## The waypoint schema

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

## The designated spawn point

Proven in shipped data: Genshin statues teleport to *specific* per-statue
coordinates (some inside the heal radius, some not); BotW Travel Gates spawn Link
facing *outward* from the structure; the Travel Medallion spawns facing opposite
to placement. **Spawn ≠ marker, and facing is data.** Place at the spawn point with
the facing, velocity zeroed and interpolation reset (see
[teleport-sequence.md](./teleport-sequence.md)).

## Network shapes & density

- **BotW**: 142 Travel Gates in the base game (120 shrines + 15 towers + 7 special
  — including Divine Beast gates that *deactivate* after completion: waypoints can
  have a dynamic lifecycle). **Genshin**: 638 permanent waypoints (61 at launch —
  ~40–50 per major region), typed regular/underground/underwater, plus 50 statues
  and domain entrances as separate target types.
- **Density as a design dial**: BotW ~1.7 points/km² on a datamined 80 km² map
  (~800 m spacing — the trip between points *is* the game) vs Genshin ~20–24/km² on
  ~24–27 km² of land (~200–220 m — the daily farming routine is the game). A ~12×
  gap, both correct for their design.
- **Reveal granularity**: 1 tower = 1 region (BotW avg ~5.3 km²); 1 statue = 1
  named area + its locked waypoints.

## Dynamic-lifecycle waypoints

Waypoints aren't all permanent: Divine Beast gates deactivate after completion;
player-placed waypoints expire; domain entrances are separate target types.
Lifecycle differences are **per-type data**, not special-cased code.

## Player-placed waypoints (the mini-spec)

(Genshin Portable Waypoint + BotW/TotK Travel Medallion)

- **Count limit**: 1 → 3 in TotK, gated by 10 then 15 regions mapped — the custom
  network *rewards map progress*.
- **Lifetime**: Genshin 7 days; BotW/TotK persistent.
- **Placement validation** that refuses invalid states (air, water, instances)
  *without consuming the item*.
- **Exact position + orientation restore** (unlike standard waypoints, which use
  the designated spawn).
- **Replacement confirmation** when placing over the limit.
- Lifecycle nuance: teleporting to a Portable Waypoint resets nearby enemies
  (unlike standard waypoints).

## Discovery UX

A 3D pointer toward locked waypoints appears within 30 m and disappears beyond 40 m
(hysteresis in the data); icons follow the hidden / visible-locked / activated
pipeline; activation grants a reward hook (Genshin: 5 primogems + 50 AEXP per
waypoint/statue).

## Engine mapping

| Generic block | Unity 6 | UE5 (5.4+) |
| --- | --- | --- |
| Waypoint data | ScriptableObject definitions + runtime state dict in the save | PrimaryDataAsset / DataTable rows + GameplayTags; state in SaveGame |
| Map registry | the marker registry consumes waypoint state (`minimap-worldmap`) | same — markers derive from waypoint state |

## Flagged gaps — do NOT invent

Exact Genshin exploration % weights · BotW named-location count (187 vs 226,
unresolved) · Travel Medallion denied in shrines/dungeons (uncorroborated).

## Sources

Zelda Dungeon (Travel Gate) · Stamen (map analysis) · Genshin Fandom (Teleport
Waypoint change history, Portable Waypoint, Statue of The Seven) · Game8 / Polygon
(Travel Medallion) · GameFAQs datamine (BotW 80 km² map).
