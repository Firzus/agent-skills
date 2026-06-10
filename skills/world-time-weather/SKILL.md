---
name: world-time-weather
description: >-
  Architecture blueprint for the time-of-day and weather system in
  open-world games: central game clock service (time scale, dual day
  divisions, pause rules, clock modes), weather as data not simulation
  (climate profiles, pre-rolled regional schedules, the override stack),
  systemic weather publishing states consumed by traversal, combat, AI,
  audio, and rendering (the BotW chemistry-engine model), the event
  scheduler (timed world events, blood-moon-style resets, respawn
  policies, time-skip catch-up), NPC schedules as clock consumers, and
  time/weather persistence in saves. References: BotW/TotK (zeldamods
  datamine) and Genshin Impact (server clock model). Use when designing
  or building day/night cycles, weather state machines, dynamic sky
  systems, environmental hazards, daily resets, or when weather pops,
  quests leak forced weather, or sleeping fires ten hours of events in
  one frame.
---

# World Time & Weather

Build the time-of-day + weather layer of an open-world game — systems
first: the clock, the weather state machine, and their gameplay
consumers. Rendering (sky, volumetric clouds) is treated as one consumer
among others, not detailed here. References: BotW/TotK (the
best-datamined implementation in the genre — zeldamods + decompilation)
and Genshin Impact (the server-clock model).

## The architecture rule

**One clock service, one weather service — both publish; nobody polls
the raw clock.**

```
GAME CLOCK (service)
  time as a monotonic accumulator (double / integer ticks — NEVER a
  float; never wrapped: convert to hour-of-day only at the edges)
  publishes: day-phase flags + change events (OnNewDay, OnPhaseChanged)
  clock modes pilotable by script (Normal / Forced / ForceTo-hour —
  the BotW pattern: quests freeze or cap the clock)
  two day divisions, not one:
    binary day/night flag (lighting, broad gameplay)
    N fine time divisions for AI/schedules (BotW: 8 divisions)

WEATHER (service) — weather is DATA, not simulation
  climate profiles (data assets): per-weather-type probability rates,
  temperature tables (by altitude band x day/night), sky palette
  region map -> climate (BotW: 94 areas -> 20 climates)
  schedule pre-rolled N days ahead in fixed slots (BotW: 3 days of
  4-hour slots, packed in the save -> deterministic forecast UI,
  no save-scum reroll)
  the override stack:
    debug > quest/cinematic > permanent special climate (region)
    > persistent regional state (mutable by progression)
    > ambient probabilistic schedule
  every override is a HANDLE (acquire/release + owner + timeout) —
  never an imperative SetWeather

CONSUMERS (subscribe to events; read cached state; never poll-compute)
  gameplay: traversal wetness/slip, combat (rain = Hydro aura),
            AI schedules, stealth sound masking, hazards
  presentation: lighting/sky/fog/clouds, precipitation VFX,
                audio beds, UI forecast
  continuous values (wetness 0-1) ride a global parameter bus
  (shader globals / MPC), written once per frame in one place
```

A weather **state** bundles: precipitation type+intensity, wind, fog
density, cloud coverage, lighting palette, audio bed, gameplay flags
(wet surfaces, lightning active). The logical state is separate from its
rendering consumers (BotW's WorldMgr splits Time/Weather/Sky/Temp/Cloud
sub-managers).

## Systemic weather (the chemistry-engine model)

Weather earns its cost when it is an *input* to other systems, not a
backdrop (GDC 2017: elements vs materials, "rules over content"):

- **Rain**: wet surfaces → climbing slip (`traversal-system`), fires
  extinguished (which also blocks campfire time-skip — deliberate
  friction), footstep masking → stealth buff, grounded electric attacks
  become AoE. Genshin: rain literally applies the Hydro aura to
  characters and enemies — weather feeds the elemental combat system.
- **Thunderstorms**: lightning targets metal equipment on a periodic
  tick with a **~10 s telegraph** (sparking) — the canonical fair
  environmental hazard, and an offensive tool (throw a metal weapon as
  a lightning rod).
- **Temperature is climate data, not simulation**: per-altitude-band,
  per-day/night tables; layered counters (armor, food, elemental
  weapons, terrain). Two pressure models: damage ticks (BotW cold) vs a
  visible gauge with emitters and neutralizers (Dragonspine Sheer Cold).
- **Weather gates routes**: rain closes climbing, the economy reopens it
  — see `traversal-system` for the valve design.

## Build order (4 shippable tiers)

```
Tier 1 — The clock
- [ ] Clock service: double/tick accumulator, configurable time scale
      (expose dayLengthMinutes; document consumer assumptions), pause
      rules per context (menus, cutscenes, dialogues)
- [ ] Day phases: binary flag + fine divisions; change events
- [ ] Clock modes for scripting (freeze, cap, force-to-hour)
- [ ] Debug panel: scrub time, jump to hour (day 1)
Tier 2 — Weather states
- [ ] Weather profiles as data assets (the full state bundle)
- [ ] Region -> climate map + pre-rolled schedule (N days, fixed
      slots, serialized) + forecast accessor for UI
- [ ] Timed blends between states (everything fades: lighting via
      volume/profile weights, audio crossfades, particle ramps)
- [ ] The override stack with handles, priorities, timeouts, and a
      live-handles diagnostic
Tier 3 — Consumers
- [ ] Publish/subscribe wiring + global parameter bus (wetness, wind,
      snow) written once per frame
- [ ] Two or three systemic consumers end-to-end (climb slip, fire
      extinction, stealth masking) — prove the pipeline
- [ ] Precipitation occlusion (top-down depth mask) + interior volumes
      (cut emitters, low-pass the audio bed)
- [ ] Environmental hazards with telegraphs and cutscene exemptions
Tier 4 — Scheduler & persistence
- [ ] Event scheduler: fixed-hour hooks, two-phase events (schedule
      flag -> fire at window), recurring rules
- [ ] Time-skip policy: instant clock set + explicit catch-up of
      crossed events (fire once, never N times, never zero)
- [ ] Respawn policies (event-driven / periodic-probabilistic /
      fixed-hour) with the never-on-screen invariant
- [ ] Serialization: clock, day counter, weather schedule + blend
      state, scheduler timestamps (in GAME time) — reload rerolls
      nothing
- [ ] NPC schedules as data with weather variants (rain anchors)
```

## Numbers (starting points — sourced anchors)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Day length | 24 real min (1 game min = 1 s) in BotW & Genshin; genre range 20–96 min (Minecraft 20, GTA V 48, Skyrim 72 @ timescale 20, Witcher 3 96) | datamine + wiki |
| Day/night logic split | BotW code: day flag 06:00–18:00; gameplay night 21:00–05:00 (Stal spawns); Genshin: visual milestones 6/12/18/24 vs logic day 06:00–19:00 | decomp + wiki |
| Weather slots | BotW: 4 in-game hours per slot, 3 days pre-rolled, 9 weather types, 94 areas → 20 climates | datamine |
| Lightning telegraph | ~10 s sparking before strike; target tick ~5 s (community) | measured |
| Temperature tiers | BotW: <0 °C / <−10 °C cold, >40 °C / >50 °C heat; cold tick ½ heart per 10 s; 2 additive resist levels | wiki + measured |
| Gauge pressure model | Sheer Cold: 1 %/s fill (alert at 70 %), then 1 % maxHP + 150 HP/s; recovery 5 %/0.2 s near heat | wiki |
| Blood moon | dedicated timer, exactly 7 in-game days of ACTIVE play (~2 h 48), resolved at midnight, scheduled one day ahead, prohibition + postponement rules | datamine |
| Respawn policies | BotW: enemies/weapons on blood moon only; materials 1 %-chance roll every 60 s, only if the player is in another map area; shops at midnight if player absent | datamine |
| Server resets | Genshin: daily 04:00 server, weekly Monday 04:00, fixed timezones without DST; node respawns 12/24/48/72 h real time per node | wiki/official |
| Float precision | 32-bit float accumulator degrades to ~1 ms error after ~9 h of play — use double/ticks | verified |

Flagged — never invent: weather blend durations (BotW/Genshin —
unpublished), Genshin's internal weather algorithm, per-climate rain %
values (structure datamined, values not extracted), off-screen NPC
simulation level. Details in [architecture.md](./architecture.md).

## Engine mapping

| Generic block | Unity 6 (URP/HDRP) | UE5 (5.4+) |
| --- | --- | --- |
| Clock | No built-in TOD — C# service accumulating in **double** (`Time.timeAsDouble` exists for this); rotated directional light + curves | Directional Light (Atmosphere Sun) + manager; Sun Position Calculator plugin; Day Sequence plugin (young — verify maturity) |
| Weather/TOD blend | **Volume framework** = the blend mechanism (one global Volume per state, weights animated by the manager; both pipelines) | Interpolated MPC params + post-process blends; UDS as de-facto marketplace standard |
| Sky/clouds | HDRP: Physically Based Sky + Volumetric Clouds + Local Volumetric Fog. **URP: none built-in (incl. 6.3/6.4)** — skybox shader or third-party | Sky Atmosphere + Volumetric Clouds + Exponential Height Fog; Sky Light Real Time Capture (time-sliced 9 frames, built for TOD) |
| GI under moving sun | **APV Lighting Scenarios** + `BlendLightingScenario` (bake day/night; same probe positions required; covers probes ONLY — sync sky/fog/reflections manually) | **Lumen** — designed for dynamic TOD; caveat: seconds of propagation latency on fast sun moves (tune Update Speed in PPV) |
| Param bus | `Shader.SetGlobalFloat` (wetness/snow/wind globals) | **Material Parameter Collections** — the documented pattern ("snow amount… wetness"); max 2 MPC/material |
| Precipitation + occlusion | VFX Graph box-around-player; top-down ortho depth → RT mask (Lagarde technique, HDRP Custom Pass) | Niagara GPU + Scene Depth/Distance Field collision; SceneCapture2D top-down R32F mask |
| Snow/wet accumulation | Shader globals + masks | Runtime Virtual Textures (drawer/receiver; Nanite meshes can't write to RVT) |
| Audio | AudioMixer `TransitionToSnapshots` (weighted multi-state mix — exactly the weather case) | MetaSounds + control bus/submix (pattern; verify per-project) |
| Streaming | Managers in always-loaded bootstrap scene (`scene-flow-manager`) | **AlwaysLoaded Data Layer** for clock/weather managers; referencing a streamed actor from a persistent one leaks it persistent |
| Multiplayer | Server-authoritative clock + weather seed; clients derive rendering | Same — the Genshin model: economy on server clock, ambience on the diegetic clock |

## Failure modes

The 14 classic time/weather bugs (float drift, the midnight wrap, the
time-skip event storm, weather popping, rain indoors, polling hell,
lighting/GI desync, override leaks, save/load reroll, regional border
pops, multiplayer drift, the storm-at-dusk perf cliff, untelegraphed
hazards, the 4 AM/DST reset class) are cataloged in
[pitfalls.md](./pitfalls.md) with symptom → root cause → prevention.

## Related skills

- `traversal-system` — weather as the traversal valve (rain slip,
  updrafts); stamina economy vs weather gating.
- `open-world-streaming` — region map residency; managers always loaded.
- `enemy-ai-framework` — time divisions and weather flags as AI
  blackboard inputs; night spawn windows.
- `quest-system` — time-gated quests and quest-owned weather override
  handles; daily reset alignment.
- `adaptive-audio` — weather/time drive ambient beds and music
  variants; the override-stack pattern shared.
- `save-persistence` — serializing clock, schedule, and scheduler
  timestamps; anti-save-scum determinism.
- `scene-flow-manager` — bootstrap residency for the services.
- `hud-system` — forecast UI, hazard gauges, telegraphs.
