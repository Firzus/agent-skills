# Architecture — clock, weather machine, consumers, scheduler, persistence

The components of a production time/weather system. All numbers are
**starting points — tune by playtest**; flagged gaps at the bottom.
Primary sources: zeldamods datamine + zeldaret/botw decompilation
(`worldTimeMgr.cpp`), GDC 2017 (Dohta, chemistry engine), Genshin
wikis. BotW is the best-documented implementation in the genre — most
patterns below are read directly from its data.

## The game clock

- **Representation**: a monotonic accumulator in double or integer
  ticks since game epoch — never a wrapped hour-of-day float as the
  source of truth (BotW stores time as a float in [0, 360] incremented
  per frame; it gets away with it because sessions are short — a
  32-bit float accumulator degrades to ~1 ms error after ~9 h).
  Convert to hour-of-day only at the edges (display, schedule lookup).
- **Time scale as a published contract**: 1 game minute = 1 real second
  (24-min day) is the BotW/Genshin standard; genre range 20–96 min.
  Consumers make implicit assumptions about the scale (Skyrim below
  timescale ~6–8 breaks quests and NPC schedules) — expose
  `dayLengthMinutes` once and document what depends on it.
- **Two day divisions, not one** (the BotW lesson): a binary day/night
  flag (code: 06:00–18:00) for lighting and broad logic, plus fine
  divisions for AI — BotW ships 8 (`Morning_A` 04–07, `Morning_B`
  07–10, `Noon_A` 10–13, `Noon_B` 13–17, `Evening_A` 17–19, `Evening_B`
  19–21, `Night_A` 21–24, `Night_B` 00–04) queried by AI as blackboard
  data. Genshin likewise splits visual milestones (6/12/18/24) from
  logic bounds (day = 06:00–19:00). Keep the two layers distinct.
- **Pause rules are per-context data**, not hardcode: BotW freezes time
  in menus and cutscenes but **not in shrines or Divine Beasts** (a
  documented myth-killer — only blood moons are inhibited there).
  Genshin freezes in the solo pause menu, never in co-op, and keeps
  some timers running even paused (gadget cooldowns) while pausing
  others (skill cooldowns) — a per-timer policy list.
- **Clock modes pilotable by script** (decompiled: `Normal`, `Forced`,
  `Force0600`…): quests freeze the clock (BotW start: locked at 05:15
  until the intro cutscene, then capped at 11:00 until the Plateau
  quest). Expose freeze / cap / force-to-hour as first-class modes.
- **The dual-clock model (Genshin)**: a **server clock** (real time,
  not manipulable — carries the economy: daily reset 04:00 server,
  weekly Monday 04:00, fixed timezones without DST) and a **diegetic
  clock** (24-min cycle, player-skippable +30 min to 2 days, per-world,
  host-controlled in co-op — carries ambience, spawns, quests). A
  single-player game has one clock and must protect its economies
  differently (BotW: the blood moon timer runs on *active play time*
  only, so sleeping can't accelerate it).
- **Calendar**: day counter driving moon phases (BotW: 8-phase cycle =
  `(days + x + 1) % 8`); per-item shop restock periods (Genshin: 1/2/3/
  7 days per vendor item). Neither reference game has dynamic seasons —
  their "seasons" are spatial (fixed climate regions).

## The weather machine

**Weather is data, not simulation** — the BotW architecture, fully
datamined:

- **Climate profiles as assets**: the world maps to climates (94 areas
  → 20 climates via a region lookup); each climate bundles per-type
  probability rates (`Bluesky/Cloudy/Rain/HeavyRain/Storm`),
  temperature tables per 100 m altitude band × day/night, and a sky
  palette. 9 weather types total; **snow is rain + cold temperature**,
  not a separately scheduled state.
- **Pre-rolled schedule**: weather is drawn ahead for 3 in-game days in
  4-hour slots, packed into the save (6 four-bit nibbles per int32 per
  climate). Consequences: a *deterministic* forecast (the HUD icon is
  honest), no reroll on reload (anti-save-scum by design), and
  time-skip just moves the cursor — it never rerolls. The current
  climate is resolved from the **camera** position (datamined detail).
- **The override stack** (observed across both games):

```
debug/forced > quest/cinematic override > permanent special climate
  (Dragonspine subzero, Seirai perpetual storm)
> persistent regional state (mutable by progression — finishing the
  Seirai questline clears its storm; freeing Vah Ruta stops the rain)
> ambient probabilistic schedule (the climate tables)
```

  Every entry is a **handle** (acquire/release, owner, priority,
  safety timeout) plus a diagnostic listing live handles — the
  imperative `SetWeather` with no owner is the leak generator.
  Cities-always-sunny (Genshin) is just a permanent regional entry.
- **Transitions**: schedule granularity (4 h) ≠ blend duration. Blend
  durations are unpublished for both games (flagged) — make every
  channel fade: lighting profile weights, fog, cloud coverage,
  particle emission ramps, audio crossfades. Cloud cover leads the
  rain (observable in BotW) — sequence the channels, don't lerp them
  in lockstep.
- **Separation of concerns**: BotW's WorldMgr splits sub-managers
  (Time, Weather, Sky, Temp, Clouds, DoF) — the logical weather state
  is distinct from each presentation consumer.

## Systemic consumers

The publish/subscribe shape is **proven in BotW's code**: the clock
emits a `NewDayEvent` signal, and derived states are published as
shared flags (`WM_DaytimeFlag`, `WM_BloodyDay`…) queried by AI — a
global blackboard, not raw-clock polling.

- **The chemistry frame (GDC 2017)**: physics = rule-based *movement*
  calculator; chemistry = rule-based *state* calculator. Elements
  (fire, water, ice, electricity, wind) vs materials (solids); three
  rules (elements change material state; elements change element
  state; materials don't interact). Weather participates as an
  **element emitter** — rain extinguishes fire, lightning electrifies,
  wind spreads fire which generates updrafts (`traversal-system`).
  This is "rules over content": each consumer pair is a rule, and the
  combinations multiply.
- **Rain**: climb slip, fire extinction (blocking campfire time-skip —
  friction as design), footstep masking (stealth buff), grounded
  electric AoE, fire enemies killed. Genshin: rain applies the Hydro
  aura to characters and enemies — Electro under rain triggers
  Electro-Charged on everything Wet; weather is a combat input.
- **Lightning**: periodic target tick during storms (~5 s real,
  community), targets metal equipment, **~10 s sparking telegraph**
  (unequip to defuse; armor doesn't count); impact ignites an AoE.
  The player can weaponize it (throw metal among enemies). The model:
  hazard + telegraph + counterplay + offensive reuse.
- **Temperature**: deterministic climate data (per altitude band ×
  day/night — Gerudo desert: 47.5 °C day / −4 °C night at 0 m).
  Thresholds 0/−10/40/50 °C; cold ticks ½ heart per 10 s; icy water 1
  heart/s, no protection. Counters are layered and additive (2 levels:
  armor + food + elemental weapon + terrain); desert heat and volcanic
  fire are two distinct resistances.
- **The gauge model (Sheer Cold)**: a shared team gauge filling at
  1 %/s (modifiers: blizzard +200 %, swimming +180 %, Pyro −20 %),
  alert at 70 %, then 1 % maxHP + 150 HP/s; drained 5 %/0.2 s near
  heat sources; Scarlet Quartz = temporary accumulation immunity.
  Reusable pattern: *environmental gauge + zone emitters + point
  neutralizers* — an alternative to raw damage ticks.

## Time-driven world state

- **Spawn windows**: BotW Stal enemies emerge 21:00–05:00 and
  self-destruct at dawn (with no-sun exception zones, and a
  don't-spawn-if-player-too-close rule); night-only shops (Kilton
  21:00–05:00); Genshin fish species split day/night, NPCs relocate
  (Linlang: stalls by day, shop 19:00–06:00).
- **NPC schedules as data with weather variants in the format** (the
  remarkable datamined detail): each BotW NPC ships a `baischedule` —
  action blocks with `StartTime`/`EndTime` and position anchors, where
  **rain variants are first-class fields** (`WaitAnchorRainASName`,
  `RainEmotion`, `WaitRainEquipment`…). Rain isn't a behavioral patch;
  every schedule entry has its rain version (merchants shelter and
  even sell rain-day stock). Off-screen simulation level (real
  walking vs teleport) is undocumented — flagged.
- **Sleep/wait = instant clock set, zero simulation** (datamined: "the
  game never speeds up or slows down the flow of time"). BotW campfire
  → Morning 05:00 / Noon 12:00 / Night 21:00; bed adds full heal;
  unavailable in combat and under rain (no fire). If the skip crosses
  midnight, a flag forces `handleNewDay` to run **once** — the
  catch-up answer (see scheduler). The pre-rolled weather is not
  rerolled: skipping just advances the cursor (players check the
  forecast and skip to a clear slot — intended use, not an exploit).

## The event scheduler

- **The minimal skeleton (datamined from BotW)**: (a) fixed-hour hooks
  (`handleNewDay` at each midnight crossing); (b) signal/observer
  (`NewDaySignal.emit`); (c) **two-phase events**: schedule the flag
  one window ahead (`WM_BloodyDay` set at midnight when the timer
  exceeds threshold) → fire at the next window (cutscene at the
  following midnight) — with prohibition conditions and postponement
  (timer pushed to the next day); (d) **skip catch-up**: events
  crossed by a time-skip fire exactly once, in catch-up — never
  replayed N times, never silently dropped.
- **The blood moon as a case study** — three roles on one event:
  a narrative clock event (every exactly 7 in-game days of *active*
  play, ~2 h 48), the **world's garbage collector** (resets all
  revival flags → enemies/weapons respawn), and a **memory safety
  valve**: the *panic* blood moon is real and datamined — a per-frame
  check on resource/physics/spawn heaps (5 % free threshold) or
  stalled tasks triggers the same cutscene with a full system reset at
  any hour, telemetried back to Nintendo. (Myth-killer: the *regular*
  blood moon is not the GC-under-pressure — only the panic one is.)
- **Three respawn policies** (datamined): event-driven (enemies/
  weapons on blood moon only), periodic-probabilistic (materials: 1 %
  chance per 60 s tick, only while the player is in a *different* map
  area), fixed-hour conditional (shops restock at midnight if the
  player isn't there). The shared invariant: **the world never mutates
  on screen**.
- **The server-cron layer (Genshin)**: daily 04:00 / weekly Monday
  04:00 server time on fixed no-DST timezones; node respawns 12/24/48/
  72 h real time *per node since harvest* (not aligned to the reset);
  staggered offsets (ores reset+2 h, ingredients reset−4 h) spread the
  load and the player routine.

## Persistence

- **Serialize**: the clock (hour + day counter → moon phase), the
  pre-rolled weather schedule, the active weather state + blend
  progress + RNG seed, and all scheduler timestamps **in game time**
  (a real-time timestamp breaks under time-skip; a game-time one
  breaks under reload if not saved). BotW serializes time, the 3-day
  forecast, and the blood moon timer — reload rerolls *nothing*.
- Decide explicitly what rerolls on reload (default: nothing — weather
  save-scumming is an economy leak), and what the blood moon timer
  counts (active play only: cutscenes, menus and clock-skips excluded).
- Genshin: no local save — diegetic hour, persistent regional weather
  states (post-quest) and resets all live server-side
  (`save-persistence` server-authoritative model).

## Flagged gaps — do NOT invent

Weather blend durations and curves (BotW and Genshin — unpublished;
the only proxy is Genshin's talent sky-transition table, 0.05–1 s) ·
Genshin's internal weather algorithm (probability tables, reroll
granularity, seed — no public datamine) · per-climate rain % values
(structure datamined in `normal.bwinfo`, numeric tables not extracted)
· the exact lightning tick (5 min is community consensus, not
datamine) · off-screen NPC simulation level · BotW heat damage ticks
(only cold is measured) · the day/night temperature swap hour · panic
blood moon "90 % RAM" folklore (datamine says 5 % free on specific
heaps).

## Sources

zeldamods (Time, Blood moon, Save Files, Map area, AreaData, WorldMgr,
Object respawning, AISchedule, Telemetry) · zeldaret/botw decompilation
(`worldTimeMgr.cpp`) · GDC 2017 (Dohta — chemistry engine, via
Thumbsticks/VentureBeat) · Zelda wikis (Weather, Temperature, Rain,
Stal pages) · Genshin wikis (Time, Weather, Climate, Sheer Cold,
Hydro, Reset) + HoYoLAB official · community measurements (lightning
timing, cold ticks, day-length comparisons) · Bruce Dawson (float
precision) · UESP (Skyrim timescale).
