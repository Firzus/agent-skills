---
name: world-time-weather
description: >-
  Architecture blueprint for time-of-day, weather, seasons, and climate systems:
  central game clocks, time scale, calendars, server/diegetic clocks, weather
  profiles, regional schedules, overrides, volumetric clouds, storms, systemic
  weather effects, survival temperature, event schedulers, daily resets, TOD
  lighting, rendering integration, and persistence. Use when designing day/night,
  weather, seasons, dynamic skies, hazards, resets, or when weather pops, forced
  weather leaks, the sun jitters, or time-skip floods events.
---

# World Time & Weather

Build the time-of-day + weather layer of an open-world game — systems first: the
clock, the weather state machine, their gameplay consumers, the scheduler, and
the rendering integration. References: BotW/TotK (the best-datamined
implementation in the genre) and Genshin (the server-clock model), broadened with
the simulation-driven weather (RDR2, Sea of Thieves), seasonal (Stardew,
RimWorld), and rendering (Nubis, Hillaire) traditions.

## The architecture rule

**One clock service, one weather service — both publish; nobody polls the raw
clock.**

```
GAME CLOCK   monotonic accumulator (double/ticks, NEVER a wrapped float);
             publishes day-phase flags + change events; dual day divisions;
             dual server/diegetic clocks; calendar/seasons if used
WEATHER      weather is DATA (climate profiles, pre-rolled regional schedules,
             the handle-based override stack) — or simulated (clouds/fronts);
             a weather state bundles precip/wind/fog/cloud/lighting/audio/flags
CONSUMERS    subscribe to events; read cached state; never poll-compute;
             continuous values (wetness 0-1) ride a global parameter bus
SCHEDULER    fixed-hour hooks, two-phase events, respawn policies, time-skip
             catch-up (fire once, never N times, never zero)
ENGINE       dynamic GI under a moving sun, sky/cloud rendering, precipitation
             + rain occlusion, the param bus written once per frame
```

## Reference map

| File | Covers |
| --- | --- |
| [clock.md](./clock.md) | The clock representation (double/ticks), time scale as a contract, dual day divisions, pause rules, clock modes, the dual server/diegetic model, AND calendars + seasonal cycles (Stardew/RimWorld/Don't Starve), real-time-clock vs game-time, seasonal daylight |
| [weather.md](./weather.md) | Weather-as-data (climate profiles, pre-rolled schedules, the override stack) AND simulation-driven weather (volumetric clouds — Nubis lineage, atmospheric scattering — Hillaire, dynamic storms — RDR2/Sea of Thieves, the sim-vs-authored spectrum) |
| [consumers.md](./consumers.md) | The chemistry-engine model, systemic rain/lightning/temperature, BotW's gauge model, AND richer survival-temperature systems (TLD "Feels Like", RimWorld comfort band) and biome/climate-driven weather (Minecraft/Valheim/RimWorld) |
| [scheduler-persistence.md](./scheduler-persistence.md) | The event scheduler skeleton, the blood-moon case study (GC + panic), the three respawn policies, the server-cron layer, time-skip catch-up, persistence and anti-save-scum determinism |
| [engine.md](./engine.md) | Dynamic GI under a moving sun (Lumen, APV Lighting Scenarios), sky/atmosphere/cloud rendering, the global param bus (Volume / MPC), precipitation + rain occlusion (Lagarde), TOD asset ecosystems, performance, always-loaded managers |
| [pitfalls.md](./pitfalls.md) | 16 failure modes (symptom → cause → prevention) with the timescale corollary, debugging order, ship checklist |

## Systemic weather (the chemistry-engine model)

Weather earns its cost when it is an *input* to other systems, not a backdrop
(GDC 2017: elements vs materials, "rules over content"):

- **Rain**: wet surfaces → climbing slip, fires extinguished, footstep masking →
  stealth, grounded electric attacks → AoE. Genshin: rain applies the Hydro aura —
  weather feeds the elemental combat system.
- **Thunderstorms**: lightning targets metal equipment with a ~10 s telegraph —
  the canonical fair hazard, and an offensive tool.
- **Temperature is climate data, not simulation**: per-altitude/day-night tables;
  damage ticks (BotW cold) or a visible gauge (Sheer Cold). Richer survival models
  (TLD "Feels Like", RimWorld comfort band) live in [consumers.md](./consumers.md).

## Build order (4 shippable tiers)

```
Tier 1 — The clock
- [ ] Clock service: double/tick accumulator, configurable time scale, pause rules
- [ ] Day phases: binary flag + fine divisions; change events; clock modes
- [ ] Calendar/seasons if used (date as a persisted value)
- [ ] Debug panel: scrub time, jump to hour
Tier 2 — Weather states
- [ ] Weather profiles as data; region → climate map + pre-rolled schedule
- [ ] Timed blends between states (everything fades)
- [ ] The override stack with handles, priorities, timeouts, diagnostic
Tier 3 — Consumers
- [ ] Publish/subscribe + global parameter bus written once per frame
- [ ] Two or three systemic consumers end-to-end (climb slip, fire, stealth)
- [ ] Precipitation occlusion + interior volumes; hazards with telegraphs
Tier 4 — Scheduler, persistence, engine
- [ ] Event scheduler: fixed-hour hooks, two-phase events, time-skip catch-up
- [ ] Respawn policies with the never-on-screen invariant
- [ ] Serialization: clock, schedule + blend state, scheduler timestamps (game time)
- [ ] TOD lighting: dynamic GI, sky/cloud, param bus; budget the storm-at-dusk peak
```

## Key numbers (starting points — sourced anchors)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Day length | 24 real min (1 game min = 1 s) in BotW & Genshin; genre 20–96 min | datamine + wiki |
| Weather slots | BotW: 4-hour slots, 3 days pre-rolled, 9 types, 94 areas → 20 climates | datamine |
| Lightning telegraph | ~10 s sparking before strike | measured |
| Blood moon | exactly 7 in-game days of ACTIVE play (~2 h 48), resolved at midnight | datamine |
| Server resets | Genshin daily 04:00 / weekly Monday 04:00, fixed no-DST timezones | official |
| Float precision | 32-bit float degrades to ~1 ms error after ~9 h — use double/ticks | verified |
| Volumetric clouds | Nubis ~2 ms PS4; temporal upsampling: quarter-res = 1/16 px over 16 frames | SIGGRAPH |
| Seasons | Stardew 4×28 d; RimWorld 4×15 d quadrums; Don't Starve 70-d year | wikis |
| Lumen TOD | global sun moves propagate over multiple seconds; update speed clamps ~16 | Epic |

Full sourced tables (with flagged "do-not-invent" gaps) in each reference file.

## Engine mapping (summary)

| Generic block | Unity 6 (URP/HDRP) | UE5 (5.4+) |
| --- | --- | --- |
| Clock | C# service in **double** (`Time.timeAsDouble`) | Directional Light + manager; Day Sequence plugin (5.4+) |
| GI under moving sun | APV **Lighting Scenarios** + `BlendLightingScenario` (probes only) | **Lumen** (realtime; tune update speed ≤16) |
| Sky/clouds | HDRP PBS + Volumetric Clouds; **URP none built-in** | Sky Atmosphere + Volumetric Clouds + Sky Light RTC (9-frame slice) |
| Param bus | `Shader.SetGlobalFloat` (Volume weights) | **Material Parameter Collections** (write once/frame) |
| Precipitation | VFX Graph box-around-camera + depth-buffer collision | Niagara + Scene Depth; rain occlusion via ortho R32F (Lagarde) |
| Managers | always-loaded bootstrap scene | AlwaysLoaded Data Layer (don't hard-ref streamed actors) |

Full detail in [engine.md](./engine.md).
