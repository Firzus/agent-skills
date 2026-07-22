# Design policy — the cost spectrum, the debate, density

How much friction fast travel should have. All detail is **design reference**;
praise/criticism flagged.

## The history: diegetic networks → the map marker

- **Morrowind (2002)** — overlapping *diegetic* transport networks, no instant
  warp: silt strider + boat routes, two Mages Guild teleport networks, Mark/Recall,
  and Almsivi/Divine Intervention spells. Each is point-to-point, in-world, and tied
  to a settlement's character (coastal = boats). You *learn geography* and chain
  services — "navigation becomes a skill tree". An experienced player crosses the
  map in <20 s once they've internalized the network, so the friction isn't actually
  tedious; it makes remote places *feel* remote. Widely praised as the gold standard.
- **Oblivion (2006)** — the click-the-map model: instant warp to any discovered
  location, major cities unlocked from the start, alongside quest/location markers.
  Where the genre **converged** on map-marker teleport. The critique: the bigger map
  "feels like a fraction of the size" because ease of navigation shrinks the world.

## The cost / restriction spectrum

| Archetype | Examples | Cost / gate |
| --- | --- | --- |
| **Free / instant, anywhere** | Skyrim map-warp; Spider-Man 2 (~1.3 s, no load) | none |
| **Free but node-gated** | Witcher 3 signpost-to-signpost; Elden Ring grace-to-grace; Horizon FW campfire | must reach a node |
| **Resource-cost / consumable** | Dragon's Dogma Ferrystone; Horizon ZD Fast Travel Packs | a consumable per warp |
| **Paid diegetic transit** | RDR2 train/stagecoach; Skyrim carriages | gold, fixed routes |
| **Player-built / diegetic-only** | Death Stranding roads & ziplines; Morrowind | construction effort |
| **Gated / delayed by progression** | Dark Souls 1 (no warp until ~halfway); AC viewpoints; Far Cry outposts | unlock first |
| **None by design** | Outer Wilds, Subnautica, The Pathless, Monster Hunter (intra-map) | — |

## The design debate

- **"Fast travel cannibalizes the world you built"**: a world ignorable after first
  traversal "misses most of what makes a big seamless world interesting"; the
  polemic version calls any-time warp "a crutch… lazy design" that encourages
  "sprawling expanses of blandness". "You can see where level design takes a hit in
  DS1 once you can warp."
- **"Respecting player time"**: the counterweight — limited fast travel punishes
  players with <20–30 min sessions; even critics concede the camp warp "might be a
  boon to someone who only has 20 minutes a day". Star Wars Jedi: Survivor *added*
  fast travel after Fallen Order omitted it ("much-requested") — the sequel-reversal
  pattern shows players demand it.
- **The Dragon's Dogma 2 flashpoint**: director Itsuno — *"Travel is boring? That's
  not true. It's only an issue because your game is boring. All you have to do is
  make travel fun"* (via discoveries, varied spawns, unsafe situations). DD2 still
  calls fast travel "convenient and good" but restricts it because *distance*
  matters. The **MTX backlash**: Portcrystals sold at $2.99 sparked "selling fast
  travel" accusations — but the key nuance is that **Capcom pointedly did NOT sell
  Ferrystones** (the consumable you need to *use* a Portcrystal), "a design Rubicon
  unwilling to cross".
- **"Earn fast travel" progression**: AC (climb + synchronize a viewpoint), Far Cry
  (liberate an outpost → it becomes a travel point), Horizon (campfire). The first
  trip is earned; the rest are free.

## Travel-as-content

- **Death Stranding** makes traversal *the* game (weight, balance, stamina,
  gradient, surface, weather all interact); Fragile Jump is deliberately limited to
  preserve geography. The self-critique: once you build a road, "there are no
  mechanics left in that geographical space" — player-built roads are themselves
  *slow* fast travel.
- **Elden Ring** — warp grace-to-grace once discovered (blocked inside a dungeon
  with a live boss; can warp in/out of legacy dungeons to grind/upgrade); **Torrent**
  (the spectral steed, ~2× run speed, double-jump, Spiritsprings) is the middle layer
  between walking and warp.
- **Dark Souls 1** — interconnection *because* of no early warp: Lordran loops back
  on itself, distance from Firelink generates dread; the Lordvessel warp (added
  ~halfway) is criticized as *removing* one of the game's best qualities.
- **Vehicles/mounts as the middle layer** between walking and teleport: Torrent,
  Roach, Seamoth/Cyclops, Just Cause's grapple→parachute→wingsuit (manual flight
  faster and more fun than vehicles).

## The earned-only core & the restriction matrix

- **Earned-only**: no destination exists before physical discovery — the
  anti-cannibalization core (the teleport-vs-traversal tension from
  `traversal-system`). Both reference games charge zero resources but charge
  *discovery*.
- **The restriction matrix is design, not defaults** — every cell is a decision:

| Context | BotW | Genshin |
| --- | --- | --- |
| Overworld combat | allowed | allowed (standard escape) |
| Falling | allowed | **allowed — documented fall-damage escape** |
| Instances | denied (Divine Beasts: "Leave" only) | denied (domains: "Leave Domain" only) |
| Scripted quests | rare locks | priority quests block teleport |
| Co-op | — | guest's own unlocks; no teleport-to-player |

Each denial surfaces a *typed reason* in UI. No cooldowns in either game —
restrictions are contextual, never temporal. **Write the matrix and test each cell
as content** (pitfalls #9).

## Density & topology

- **Density is a genre dial**: BotW ~800 m spacing (the trip *is* the game) vs
  Genshin ~200 m (the farming routine is the game) — a ~12× gap, both shipped. Pick
  deliberately.
- **The last-100-meters principle**: teleport gets the player close, traversal does
  the rest. Waypoints belong adjacent to real activity hubs; a waypoint leaving a
  3-minute walk reads as punitive.
- **Network topology**: hub-and-spoke (Dark Souls Firelink, Monster Hunter town, ER
  Roundtable Hold reachable *only* by warp) vs point-to-point (Morrowind, Witcher 3
  signposts) vs any-to-any (Skyrim, Spider-Man, Horizon campfires). The "back-to-town
  to sell/upgrade" loop is the canonical justification — games most suited to fast
  travel are those where you retread your steps.

## Player sentiment

Self-reported behavior is bimodal/phase-dependent: players fast-travel "constantly"
only *after* covering new ground (BotW: ~100 h on foot, then warp for cleanup); some
do deliberate no-fast-travel tours. **No rigorous cross-industry usage survey
exists** — treat usage-rate claims as directional, not measured.

## Flagged gaps — do NOT invent

Usage-rate "data" is forum/anecdote only · Oblivion's dropped spells were partly
engine-driven · Death Stranding early-build claims are paraphrased livestream ·
Monster Hunter's no-warp rationale is partly inferred.

## Sources

samlowe.dev / unmappedworlds (Morrowind/Oblivion) · IGN First / Kotaku / Polygon
(Dragon's Dogma 2, Itsuno) · Game Developer (Fast Travel Sucks; On the design of
Dark Souls) · Fextralife / pureeldenring (Elden Ring Torrent) · Kojima Productions
(Death Stranding) · Vice (RDR2) · straypixels / duskdev (the debate) · Trinity
College ICIDS 2023 (flânerie).
