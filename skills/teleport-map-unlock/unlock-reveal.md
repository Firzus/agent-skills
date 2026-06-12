# Unlock & reveal — terrain, POI, fog of war

How the map becomes visible. All numbers are **starting points**. This skill owns
the unlock *data model*; `minimap-worldmap` owns the rendering.

## The two-layer unlock model

Confirmed by shipped data (BotW, via the Stamen cartographic analysis): terrain is
revealed **per region** (binary), POI are discovered **per item**, with a third
icon state for towers/shrines.

```
regionTerrainRevealed[regionId]  : bool    (tower/statue flag)
poiDiscovered[poiId]             : bool    (individual discovery)
poiActivated[poiId]              : bool    (waypoint activation)
-- map UI, travel UI, and completion % all DERIVE from these flags
```

- **BotW towers download terrain only** — shrines/named locations/POI stay hidden
  until physically found or scoped. The tower is a climb challenge; the traversal
  cost is the price of the reveal.
- **The chained unlock (Genshin)**: statue activation reveals the area's terrain
  AND makes the area's **locked waypoints visible** (greyed icons); each then
  requires approach + interact to activate. Three mechanisms coexist: interaction
  unlock, quest-gated *visibility* (~40 waypoints invisible until their quest), and
  scripted auto-unlock by quest step.

## Fog-of-war types & data structures

- **Shroud / unexplored** — never seen, pure black, no data.
- **Active fog / line-of-sight** (RTS) — explored but out of current vision; shows
  **last-seen stale state**; returns to fog. Data: a per-tile bitmask grid (`int[]
  values` current + `int[] visited` ever-seen, one bit per player); reference-counted
  fog cells (decrement old / increment new only when a unit crosses a cell
  boundary, for perf); LOS via a line test blocked by higher ground.
- **Explored-permanent (the open-world model)** — once seen, revealed forever
  (Skyrim, AC, Elden Ring); only dynamic units re-hide.
- **Render layer**: often a separate higher-res GPU render-texture mask (marching
  squares / bit-masked circle masks merge overlapping vision smoothly), decoupled
  from the coarse CPU logic grid.

## The reveal-method spectrum

| Method | Examples | Mechanism | Trade-off |
| --- | --- | --- | --- |
| **Per-region (tower)** | AC classic, Far Cry 3/4, BotW | one interaction flips a region's fog | fast, legible — but "climb→reveal→checklist" fatigue |
| **Per-tile / proximity** | Skyrim, Fallout, FC5, AC Shadows base | a radius unfogs as you walk | rewards real exploration; can feel slow / 100%-sweep |
| **Item-based (fragments)** | Elden Ring stelae, Minecraft map items | pick up a key item → region detail appears | discovery as reward; blank areas hard to navigate *to* |
| **Statue / shrine** | Genshin | touch → reveals area + unlocks waypoints | couples reveal with fast-travel; quest-gated |
| **Visit-based auto-reveal** | Skyrim/Fallout local, GTA | entering auto-discovers | frictionless; little earned discovery |
| **Purchase from vendor** | Skyrim local maps, classic CRPGs | buy map data | optional shortcut; economy sink |

## The Ubisoft-tower lineage & "tower fatigue"

- **Origin**: Assassin's Creed (2007) synchronization Viewpoints — climb, the
  camera pans, the map unfogs and objectives become trackable. Ubisoft "made and
  codified the trope" (TV Tropes' "Crow's Nest Cartography").
- **The conflated distinction**: a tower reveals *terrain* (the map layer) and/or
  *POI icons* — many secondary sources conflate them. BotW reveals terrain only;
  classic AC reveals both.
- **The backlash & the move away**: towers became a rote "rhythm"; **Far Cry 5
  (2018)** removed towers *and* the minimap (Dutch jokes you won't climb towers all
  game), shifting reveal to organic (talk to NPCs, walk past POIs). **AC Shadows
  (2024/25)** brought viewpoints back but revealing *less* (manual 360° observe to
  tag POIs; region-names-only start) — then a patch *re-added* auto-reveal upgrades
  for players who wanted the convenience back. The lesson: reveal effort is a
  tunable dial, and players split on it.

## Icon soup & decluttering

The criticism: "the world stops being a place and becomes a spreadsheet with
pretty scenery"; pre-marking every POI "replaces discovery". A Ghost Recon
Breakpoint designer confessed they sprinkled `?` icons everywhere because **world
density was too low** ("checklists are reassuring for our brains") — icons paper
over design gaps. Decluttering moves: AC Odyssey's **Exploration Mode** (kills
quest markers; NPCs give geographic directions; an eagle scans to pinpoint),
fewer-reveal viewpoints, category filters, and custom pins. The **"explored %"
completion loop** the reveal system manufactures drives both engagement and chore
fatigue — design it deliberately.

## Multi-layer maps

(Genshin v4.0, official) the layer selector appears contextually over multi-level
zones; layered waypoint pins carry a **sub-icon**; off-layer indicators render
dashed; sub-maps are themselves quest-gated. **The rule: the layer is waypoint
data, never inferred from 2D position** (the Sumeru underground-waypoint confusion
is the documented counterexample — pitfalls #10). Elden Ring (a second map
underneath the surface) and TotK (Sky/Surface/Depths) are the same idea.

## Accessibility

- **Colorblind-safe icons**: never convey map info by color alone; pair color with
  shape/symbol/text (redundant encoding); offer presets + a custom color-picker.
- **Map text & icon scaling**, mixed case (not ALL CAPS), contrast ≥4.5:1 text /
  ≥3:1 graphics; ideally screen-narrate region info for blind/low-vision players.

## Flagged gaps — do NOT invent

Exact Genshin exploration % weights · GTA reveal specifics (inferred from series
conventions) · accessibility pixel target sizes are general UI guidance, not
map-specific · the tower terrain-vs-icon distinction is the most-conflated point in
secondary sources (verified via Giant Bomb + Stamen).

## Sources

Stamen cartographic analysis of BotW · Giant Bomb ("Tower Reveals Map") · TV
Tropes ("Crow's Nest Cartography") · Ubisoft blog (AC Shadows exploration) ·
PCGamesN / GameSpot (Far Cry 5 tower removal) · Genshin Wiki (Statue of the Seven)
· Eldenpedia (map fragments) · Minecraft Wiki (map item) · jdxdev / Gemserk (fog
of war data structures) · SuperJump (Ghost Recon icon confession) · Game
Accessibility Guidelines / Xbox XAG-103.
