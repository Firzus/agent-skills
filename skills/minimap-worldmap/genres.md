# Genres — minimap UX across RTS/MOBA/FPS, and the anti-map debate

The open-world map (Genshin/BotW) is one point in a much wider design
space. Other genres treat the minimap as a **command surface** or an
**information-warfare tool**, and a whole movement argues for **no
minimap at all**. Steal the pattern that fits your game's tension.
`[DOC]` = dev docs/talk, `[RE]` = design analysis/wiki, `[?]` =
community/uncertain.

## RTS — the minimap *is* a command surface

In an RTS the minimap is the highest-information-density object on
screen, not decoration `[RE]`:

- **Click-to-move camera / click-drag scroll** — StarCraft, C&C, CoH.
  The minimap is the *fastest* way to reposition; pros navigate by it
  rather than edge-scroll.
- **Camera box / viewport rectangle** — a trapezoid shows what slice
  of the world the main view covers (core to spatial orientation).
- **Alert pings / flashes** — red "under attack" flashes jump attention
  to a location; double-click (or spacebar in SC) snaps the camera
  there. This is the RTS attention-management loop.
- **Issue orders on the minimap** — move/attack/rally commands and team
  pings (SC2 default **Alt+Click**) work directly on the minimap.
- **Fog of war read at a glance** — unexplored black, explored-unsighted
  dimmed, actively-sighted live. The minimap is where you *read* vision.
- **Colors**: own/ally green, enemy red, neutral yellow; colorblind
  modes vary by title. `[?]`
- Praised for macro utility; criticized for a steep literacy barrier.

The takeaway for any game: if the minimap is a *control* surface, make
it click-targetable, pingable, and the camera's primary driver — not a
passive overlay.

## MOBA — the minimap *is* the macro game

- **Minimap awareness as a core skill** — "converts chaos into
  decision-making": who can reach you, where the next fight is, whether
  it's secretly 3v5. High-elo play is partly minimap-reading. `[RE]`
- **Vision / wards** — a ward answers "which route am I afraid of, and
  when?" Players look at the minimap *immediately* after warding to
  register coverage.
- **Smart-ping wheel** — LoL holds **G / V / Ctrl+Click** for a radial
  of directional pings (Retreat / On My Way / Enemy Missing / Assist,
  plus Push / All-In / Need Vision). Fast "MIA" pings are a key low-elo
  vs high-elo difference; coaches frame pings as "data, not panic".
- **Overlaid timers** (dragon/Baron) drive pre-objective rotations.
- **Locked vs unlocked minimap** — north-up static vs rotates/centers on
  the player; a per-player config. `[?]`
- Praised for voiceless macro-comms; criticized for ping spam eroding
  trust ("be consistent, don't spam").

## FPS / shooter — radar as information warfare

- **CoD minimap + UAV/radar** — UAV reveals enemies as **red dots
  (~30 s, refresh ~3 s)**. `[RE]`
- **Red dots on fire** — firing an *unsuppressed* weapon paints you on
  the enemy minimap; **suppressors** hide the ping. The core stealth/
  info trade and a series-defining mechanic.
- **The "Ghost" perk** — hides you from UAVs **while moving**; standing
  still disables it; Advanced UAV shows Ghost users as a static dot (no
  heading). MW2019+ disputes about firing-reveals-without-UAV are
  ongoing community friction. `[?]`
- **Counter-UAV / Scrambler** scrambles enemy minimaps; **Hard Wired**
  negates it — info-warfare escalation.
- **Tac-map (full-screen)** for objectives/loadout, distinct from the
  corner minimap (Warzone).
- **Rainbow Six Siege drone/cam map** — drones are intel gathering.
  **Red ping (scan)**: ~1 s hold, marks enemies through walls but the
  enemy sees "SPOTTED". **Yellow ping (Ping 2.0)**: instant, silent,
  contextual, usable while dead via cams. `[RE]`
- **Compass + sound vs persistent minimap** — tactical shooters favor a
  top compass + audio cues to preserve tension; CoD's minimap is the
  "less immersive but efficient" counter-example.

## The anti-minimap / immersion movement

The central critique: **minimaps make detailed worlds ornamental** —
attention is pulled to the high-contrast corner, so players "follow an
icon, not a path"; "exploration turns into navigation". Designers
(incl. Sakurai) argue the minimap pulls you *out of the world*, and
that it lets devs skip environmental cues, sensible roads, and horizon
landmarks ("lazy design"). `[RE]`

Diegetic / minimal answers:

- **Far Cry 2 — diegetic GPS + paper map** (Clint Hocking). Pull out a
  **physical map + handheld GPS in real time; the game does NOT pause** —
  "bullets continue to whiz into your body". Honest caveat: it still had
  a conventional HUD for ammo/health; full diegesis in an FPS was judged
  "nearly hopeless" without compromise. `[RE]`
- **Mirror's Edge — Runner Vision** (no minimap): traversable objects
  highlight **red** = importance; *Catalyst* adds a full red guide-line
  + classic + off toggles. Technically **spatial UI, not diegetic** (the
  red is in 3D space but isn't a fiction object). `[RE]`
- **Ghost of Tsushima — Guiding Wind** (Sucker Punch): swipe summons
  wind toward your map-pinned waypoint, backed by songbirds (shrines),
  foxes (dens), and **"Weenies"** — tall flags/smoke + ground
  breadcrumbs (Tori gates). Design rule: draw the player by *something
  every ≤30 s*. Widely praised as best-in-class diegetic nav. `[RE]`
- **Elden Ring — minimal markers**: no minimap; an interactive
  hand-drawn map, **up to 100 player wax-stamp markers (10 symbols)**,
  and **beacons (light beams)**. "Go anywhere… but it tells you when
  you're in trouble; no errand quests." Restores mystery vs the
  AC-style "checklist of icons + checkmarks". `[RE]`
- **The pragmatic answer — a toggle/customizable HUD**: let players
  hide/reveal the minimap on demand (RDR2's minimap-off is a popular
  self-imposed immersion mode). The cheapest way to serve both camps.
  `[?]`

## Survival/crafting — "make your own map" or none at all

- **Minecraft — craftable map item**: drawn as you hold-and-use it.
  Cartography table zooms out (1 paper/level), clones, locks; **zoom
  0→4 = 1:1 (128²) to 1:16 (2048²)**. Maps snap to a **fixed world
  grid** — you make a base map *in each new area*; enables aligned map
  walls in item frames. `[RE]`
- **Valheim — explore-to-reveal + shared map**: personal map reveals by
  walking; the **Cartography Table** syncs map + pins between players
  (downloaded pins dark-gray until clicked → white). Real-time pin
  sharing was retired in favor of the table. `[RE]`
- **Subnautica — NO map at all, beacon system**: intentional omission
  for immersion. Navigation = compass + depth + craftable, renamable,
  recolorable **beacons** + landmarks. The pillar is **"the thrill of
  the unknown"** — navigation as genuine orienteering. Praised for
  tension; criticized as "artificial," pushing players to external
  maps. `[RE]`

## The cross-genre UX toolbox

- **Player marker / arrow** — "you are here" + facing; its *removal*
  (Outward, Minecraft empty maps) is itself a design lever.
- **Objective marker / waypoint** — the most-attacked element ("keeping
  the marker centered" replaces reading the world); the GPS route-line
  is the top immersion-breaker.
- **Custom pins/markers** — Elden Ring stamps, BotW stamps, Valheim pin
  groups, Subnautica named beacons. Player-authored annotation is a
  consistently praised pattern (see pin model in
  [markers-fog.md](./markers-fog.md)).
- **Legend / filter** — toggle marker categories to fight clutter.
- **Fast-travel from the map** — near-universal map-as-travel-menu
  (this skill raises the request; `teleport-map-unlock` executes it).
- **Map-as-menu (pause)** — full-screen map doubling as objective/
  loadout screen; contrast Far Cry 2's *non-pausing* diegetic map.
- **Multi-floor / layer selector** — where flat minimaps fail (WoW
  vertical zones "more confusing than the world"); argues for layer
  pickers in vertical spaces (see map spaces in the hub).
- **Map completion %** — the AC 100% loop: praised for clarity,
  criticized for "stripping mystery".
- **Fog-of-war reveal satisfaction** — the dopamine of un-blacking the
  map; a deliberately rewarded exploration beat.

## Per-genre comparison

| Genre / Game | Map form | Nav input | Vision/FoW | Comms/ping | Diegetic? | + / − |
| --- | --- | --- | --- | --- | --- | --- |
| RTS (SC, CoH) | Persistent corner minimap + camera box | Click/drag = camera & orders | Live fog on minimap | Alt+Click ping, rally | No | macro utility / literacy barrier |
| MOBA (LoL, Dota) | Persistent corner minimap | Camera + ping rotations | Wards = vision | Smart-ping wheel | No | macro skill / ping spam |
| FPS (CoD) | Corner minimap + UAV radar; tac-map | Radar = info | UAV/red dots; Ghost counters | Spotting/UAV | No | info-warfare depth / balance disputes |
| Tac-shooter (R6) | Drone/cam feeds + pings | Drone scouting | Scan through walls | Red (loud) vs Yellow (silent) | Partly | intel depth / cam-camp meta |
| Diegetic OW (Far Cry 2) | In-world paper map + GPS, no pause | Hold map while exposed | n/a | n/a | Yes (mostly) | tension / still needs HUD |
| Diegetic OW (Ghost) | World map + Guiding Wind | Swipe wind; weenies | n/a | n/a | Yes | best-in-class nav / hard to generalize |
| Minimal-marker (Elden Ring) | Hand-drawn map, pins, beacons; no minimap | Compass + landmarks | Symbols hint, no auto-reveal | n/a | Semi | restored mystery / missable quests |
| No-minimap (Mirror's Edge) | Runner Vision red cues | Red highlights / route | n/a | n/a | Spatial | clean immersion / "follow the line" |
| Survival (Minecraft) | Craftable item, grid-snapped, zoom 0–4 | Hold map; compass | Draws as you walk | n/a | Yes (item) | clever / grid confuses newcomers |
| Survival co-op (Valheim) | Explore-reveal shared map + pins | Walk; boat/wind | Personal reveal; table-shared | Shared pins | No | co-op sync / real-time share retired |
| No-map (Subnautica) | Beacons + compass + depth | Orienteering | n/a | Renamable beacons | Yes (beacons) | thrill of unknown / "artificial" |

## Sources

RTS: GameReplays minimap-camera thread; SC2 hotkey docs. MOBA:
Mobalytics "Map Awareness", Boosteria, Strafe ping guides. FPS: CoD
Wiki (*UAV Recon*, *Ghost*); R6 Wiki (*Drone*, *Ping 2.0*), Siege.gg.
Anti-minimap: Game Developer "personal crusade against mini-maps";
Unmapped Worlds; Owl Basket (summarizing Sakurai); Far Cry 2 (Perreault
portfolio, Game Developer UI analyses); Ghost of Tsushima "Taxonomy of
Weenies"; Elden Ring (Stamen, PC Gamer producer interview); Mirror's
Edge Wiki (Runner Vision). Survival: Minecraft/Valheim/Subnautica wikis;
Charlie Cleveland "Design of Subnautica" talk. Flags: locked-vs-unlocked
defaults, RTS colorblind specifics, MW2019+ firing-reveal rules, and
Don't Starve map specifics are community/uncertain — verify before
citing as fact.
