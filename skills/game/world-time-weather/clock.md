# Clock — time, day divisions, calendars, seasons

The game clock service. All numbers are **starting points**. Primary sources:
zeldamods + the botw decompilation (`worldTimeMgr.cpp`), Genshin wikis, and the
seasonal canon (Stardew, RimWorld, Don't Starve).

## Representation

- **A monotonic accumulator** in double or integer ticks since game epoch — never
  a wrapped hour-of-day float as the source of truth. (BotW stores a float in
  [0, 360] incremented per frame; it gets away with it because sessions are short
  — a 32-bit float accumulator degrades to ~1 ms error after ~9 h.) Convert to
  hour-of-day only at the edges (display, schedule lookup).
- **Time scale as a published contract**: 1 game minute = 1 real second (24-min
  day) is the BotW/Genshin standard; genre range 20–96 min. Consumers make
  implicit assumptions (Skyrim below timescale ~6–8 breaks quests and schedules) —
  expose `dayLengthMinutes` once and document what depends on it (pitfalls: the
  timescale corollary).

## Two day divisions, not one

The BotW lesson: a **binary day/night flag** (code: 06:00–18:00) for lighting and
broad logic, plus **fine divisions for AI** — BotW ships 8 (`Morning_A` 04–07 …
`Night_B` 00–04) queried by AI as blackboard data. Genshin likewise splits visual
milestones (6/12/18/24) from logic bounds (day = 06:00–19:00). Keep the two layers
distinct.

## Pause rules & clock modes

- **Pause rules are per-context data**, not hardcode: BotW freezes time in menus
  and cutscenes but **not in shrines or Divine Beasts** (a myth-killer); Genshin
  freezes in the solo pause menu, never in co-op, and keeps some timers running
  even paused (gadget cooldowns) while pausing others — a per-timer policy list.
- **Clock modes pilotable by script** (decompiled: `Normal`, `Forced`,
  `Force0600`…): quests freeze the clock (BotW start: locked at 05:15 until the
  intro, then capped at 11:00 until the Plateau quest). Expose freeze / cap /
  force-to-hour as first-class modes.

## The dual-clock model (Genshin)

- A **server clock** (real time, not manipulable — carries the economy: daily
  reset 04:00, weekly Monday 04:00, fixed no-DST timezones) and a **diegetic
  clock** (24-min cycle, player-skippable, per-world, host-controlled in co-op —
  carries ambience, spawns, quests).
- A single-player game has one clock and must protect its economies differently
  (BotW: the blood moon timer runs on *active play time* only, so sleeping can't
  accelerate it).

## Calendar & seasons

Neither reference game has dynamic seasons — their "seasons" are spatial (fixed
climate regions). To add a **time axis** (the season as a persisted date value
that transforms spawns/foliage/temperature/daylight):

- **Season cycles**: Stardew 4 seasons × 28 days (112-day year; out-of-season
  crops wither at the boundary); Don't Starve 4 seasons, 70-day year (friendly
  20 d / harsh 15 d, configurable); RimWorld **emergent** seasons (quadrum +
  latitude + biome, 60-day year = 4×15-day quadrums); Dwarf Fortress 12 months ×
  28 = 336-day year. What changes per season: foliage/art palette, crop viability,
  spawn tables, daylight length, temperature curve, weather probability, NPC
  routines, traversal (frozen water).
- **Two calendar families**: **game-time-driven** (Stardew/RimWorld/DF — the date
  is a persisted save value, reproducible, authored pacing) vs **real-time-clock**
  (Animal Crossing — reads the wall clock, "world matches my life" immersion but
  invites "time-traveling" exploits, countered by gating items behind updates). The
  date is a first-class persisted value either way.
- **Seasonal daylight**: Stardew shifts nightfall (8/8/7/6 PM by season); Don't
  Starve uses segment-based days (long winter nights); RimWorld models axial tilt
  → latitude-dependent daylight and polar day/night. BotW/Genshin have a fixed
  ~24-min cycle with no seasonal day-length, latitude, or polar effects — RimWorld's
  axial-tilt model is the reference for adding it.
- **Long-cycle change**: cyclic (DF frozen lakes each winter, returns to baseline)
  vs escalating/permanent (Frostpunk's one-way ramp to a −150 °C storm, The Long
  Dark's permanent cold decline).

## Calendar mechanics (the reference game shape)

A day counter drives moon phases (BotW: 8-phase cycle = `(days + x + 1) % 8`) and
per-item shop restock periods (Genshin: 1/2/3/7 days per vendor item).

## Numbers (sourced anchors)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Day length | 24 real min (BotW/Genshin); genre 20–96 min | datamine + wiki |
| BotW fine divisions | 8 (Morning_A 04–07 … Night_B 00–04) | decomp |
| Stardew | 4 × 28 d = 112-d year; nightfall 8/8/7/6 PM | wiki |
| RimWorld | 60-d year = 4 × 15-d quadrums; comfort ±10 °C | wiki |
| Don't Starve | 70-d year; friendly 20 d / harsh 15 d | wiki |
| Float precision | ~1 ms error after ~9 h on 32-bit float | verified |

## Flagged gaps — do NOT invent

The day/night temperature swap hour · off-screen NPC simulation level · Don't
Starve season-length rounding drift · Minecraft precip threshold edition ambiguity
(>0.15 Java / ≥0.15 Bedrock).

## Sources

zeldamods (Time, Map area) · botw decompilation (`worldTimeMgr.cpp`) · Genshin
wikis (Time, Reset) · Stardew Wiki (Seasons, Day Cycle) · RimWorld Wiki (Quadrum,
World generation) · Don't Starve Wiki (Seasons/World) · Nookipedia (Animal
Crossing Hemisphere) · Dwarf Fortress Wiki (Calendar).
