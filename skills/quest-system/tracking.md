# Tracking — logs, markers, the anti-marker philosophy

How the player finds and follows objectives. All detail is **design reference**;
praise/criticism flagged. Uncertainty marked `[?]`.

## The cardinal contract

**Markers derive from objective state — never set imperatively.** BotW makes the
contract data-explicit: `IndicatorActors` (position + `OffFlag`) published per
active step to the marker registry (`minimap-worldmap`). The map queries "active
objectives → target positions"; it is never written to directly (pitfalls #11).

## Quest-log / journal structures

- **Diary-prose + structured list (Witcher 3)**: entries written in an in-world
  narrating voice with a clear current objective beneath; categorized (main /
  secondary / contracts / treasure); praised as "know exactly the info you need
  without overwhelming". The **"Story So Far" recap** on load (a narrated
  "previously on…") was built because the game is ~35× the size of Witcher 2.
- **Hand-written diary (Morrowind)**: NPC verbal directions logged verbatim ("look
  for the rock cairn on the coastline"), deliberately shorthand. Praised for
  immersion, criticized for clutter — later patches added a filtered topics view.
- **Auto-added structured list + Pip-Boy (Skyrim/Fallout)**: accepting a quest
  auto-adds it; journal text is deliberately minimal ("not how or where") because
  the arrow does the navigating — the root of the "follow-the-arrow" critique.
- **Skeuomorphic manuscript (Kingdom Come)**: the "immersion over efficiency" pole.

## Objective markers & waypoints

- **The floating diamond + compass (Bethesda standard)**: an arrow on a compass
  strip + a map marker; "follow the arrow" is a viable whole-game play style.
  Criticized as the genre's homogenizing crutch.
- **Exact vs area-search**: Skyrim pinpoints even "long-lost artifacts"
  (criticized as immersion-breaking); Witcher 3 often uses a **search radius** (a
  red circle requiring Witcher Senses inside) — the praised middle ground.
- **GPS-line / breadcrumb (Cyberpunk 2077)**: a yellow dotted path on the minimap;
  critiqued as "a game about following the yellow line". Dead Space's floor Locator
  and Fable's golden trail are the diegetic ancestors `[?]`.
- **Distance-only minimalism (Ghost of Tsushima)**: the only nav HUD is destination
  name + distance.
- **Diegetic scan markers (Horizon Focus)**: an AR visor places trackable markers
  (scan ~75–90 m), distinct from the non-diegetic waypoint UI.

## The anti-marker philosophy

The deliberate minimal-guidance movement:

- **Elden Ring — no quest log, no markers, by design**: Miyazaki, "trust players…
  they'll figure out what to do next"; enemy difficulty doubles as soft signposting.
  The critique: the absence of state-tracking means slow NPC chains "fall by the
  wayside"; community wikis become the de-facto quest log.
- **BotW — minimal HUD, single tracked quest**: a Pro HUD strips everything to
  hearts; communicate organically (Link shivers when cold; landmarks on the
  horizon).
- **AC Odyssey — Guided vs Exploration toggle**: Exploration removes auto-waypoints;
  clues name a region + cardinal sub-area and *you* place the marker. Praised
  ("developers: steal this idea").
- **Ghost of Tsushima — Guiding Wind**: a diegetic compass (swipe-up bends wind
  toward the objective), backed by a **"Weenies" landmark taxonomy** (Flags = tall
  skyline landmarks; Breadcrumbs = ground markers) with an internal rule that
  something must "call to" the player every **≤30 seconds**. Widely praised.

**The debate**: markers reduce friction but can make detailed worlds ornamental;
yet because games are *designed around* markers, turning them off can make them
unplayable. The modern fix is a **toggle/mode**, not a single default. Whatever
the choice, the marker *derives from objective state* — the philosophy is a
presentation layer over the same contract.

## Map integration & tracking at scale

- **Manual pins vs reference stamps (BotW)**: up to 5 pins (placeable via scope or
  on the map) show on the minimap; stamps are map-only.
- **Map↔log handoff**: a clue (log) → reason on the world map → `?` POI icons hint
  the waypoint; Horizon offers Guided (turn-by-turn, follows roads) vs Explorer
  (straight-line) pathfinding.
- **Tracking interaction**: one tracked/navigated quest at a time is the praised
  norm (Witcher 3, Ghost of Tsushima); Skyrim's "select all → compass full of
  arrows" is the scaling pain. **Auto-track-on-accept** is the root of the
  follow-the-arrow critique — the Elden Ring counter-proposal is a *player-authored*
  log so the game doesn't imply importance by auto-selecting.
- **Tap-to-reveal HUD (God of War, Horizon)**: HUD appears only on a touchpad tap /
  "Dynamic" mode — praised as the ideal middle path. Filtering 100+ quests is the
  weakest-documented area; no title is cited as having "solved" it `[?]`.

## Special models (knowledge graphs, deduction, search)

When the "quest" is investigation, the log *is* the gameplay:

- **Outer Wilds Ship Log** — a dual-view **knowledge graph**: Map Mode (entries by
  location) + Rumor Mode (a node-link "detective board" whose layout differs per
  player by discovery order); `!` = unread, `*` = more to discover. Progression is
  **knowledge-gated, not marker-gated**. Rumor Mode was added ~1 year before
  launch after playtesters couldn't grasp the nonlinear structure.
- **Return of the Obra Dinn deduction logbook** — fill fates (name + death);
  **validation only in groups of three** (any 3 all-correct auto-lock) — an
  anti-brute-force gate.
- **Disco Elysium Thought Cabinet + task list** — a rhombic "inventory for
  thoughts" with timed internalization (see `dialogue-system` narrative-design) +
  a conventional task checklist alongside.
- **Her Story search-as-interface** — no quest log at all; keyword search of a clip
  DB capped at the first 5 hits, forcing keyword-narrowing; the player externalizes
  notes to paper.
- **Detective "case board"** — infinite canvas, drag-drop evidence cards, string
  connections; Shadows of Doubt makes it *mechanical* (incrimination flows along
  strings, color = strength).

## Flagged gaps — do NOT invent

Large-scale (100+) quest filtering has no authoritative "solved" example ·
Dead Space/Fable breadcrumb lineage rests on secondary commentary · BotW pin/stamp
exact behaviors across versions.

## Sources

Game Developer ("Trust players"; Quest Compass history; Ghost of Tsushima Weenies)
· Kotaku (Skyrim Compass to Nowhere; BotW minimap) · Polygon (Witcher 3 recap;
Odyssey modes; Guiding Wind) · PC Gamer (Odyssey Exploration) · Outer Wilds
making-of + GDC 2020 · Obra Dinn wiki · ZA/UM (Thought Cabinet) · Her Story
(Barlow) · ColePowered (Shadows of Doubt case boards).
