# Consumers — chemistry, temperature, survival, biomes

How gameplay reads weather and time. All numbers are **starting points**. Primary
sources: GDC 2017 (Dohta, chemistry engine), the BotW datamine, and the survival
canon (TLD, RimWorld, Don't Starve).

## The publish/subscribe shape

Proven in BotW's code: the clock emits a `NewDayEvent` signal, and derived states
are published as shared flags (`WM_DaytimeFlag`, `WM_BloodyDay`…) queried by AI —
a global blackboard, not raw-clock polling. Continuous values (wetness 0–1) ride
the global parameter bus (shader globals / MPC) written once per frame in one
place (pitfalls #6).

## The chemistry frame (GDC 2017)

Physics = rule-based *movement* calculator; chemistry = rule-based *state*
calculator. Elements (fire, water, ice, electricity, wind) vs materials (solids);
three rules (elements change material state; elements change element state;
materials don't interact). Weather participates as an **element emitter** — rain
extinguishes fire, lightning electrifies, wind spreads fire which generates
updrafts (`traversal-system`). This is "rules over content": each consumer pair is
a rule, and the combinations multiply.

## Systemic rain & lightning

- **Rain**: climb slip, fire extinction (blocking campfire time-skip — friction as
  design), footstep masking (stealth buff), grounded electric AoE, fire enemies
  killed. Genshin: rain applies the Hydro aura to characters and enemies — Electro
  under rain triggers Electro-Charged on everything Wet; weather is a combat input.
- **Lightning**: periodic target tick during storms (~5 s real, community), targets
  metal equipment, **~10 s sparking telegraph** (unequip to defuse; armor doesn't
  count); impact ignites an AoE. The player can weaponize it (throw metal among
  enemies). The model: **hazard + telegraph + counterplay + offensive reuse**
  (pitfalls #13).

## Temperature — the reference-game models

- **Deterministic climate data** (per altitude band × day/night — Gerudo desert:
  47.5 °C day / −4 °C night at 0 m). Thresholds 0/−10/40/50 °C; cold ticks ½ heart
  per 10 s; icy water 1 heart/s, no protection. Counters are layered and additive
  (2 levels: armor + food + elemental weapon + terrain); desert heat and volcanic
  fire are two distinct resistances.
- **The gauge model (Sheer Cold)**: a shared team gauge filling at 1 %/s
  (modifiers: blizzard +200 %, swimming +180 %, Pyro −20 %), alert at 70 %, then
  1 % maxHP + 150 HP/s; drained 5 %/0.2 s near heat sources; Scarlet Quartz =
  temporary accumulation immunity. Reusable pattern: *environmental gauge + zone
  emitters + point neutralizers*.

## Richer survival-temperature models

BotW/Genshin use a **single environmental gauge** countered by clothing/elixirs —
no per-body-part insulation, no wind-chill, no acclimation. The deeper models:

- **The Long Dark "Feels Like"** = Air Temp + Wind Chill (≤0) + clothing air-temp
  bonus + clothing windchill bonus. Warmth **regenerates while Feels Like > 0 °C,
  drains below**; at zero warmth, Condition (health) drains. Counters: wind-shielding
  terrain, clothing layers, fire, bedroll (+0.1 → +12 °C), Snow Shelter +15 °C, car
  +5 °C. Anti-hibernation: **Cabin Fever** if indoors >12 h/24 over a 6-day window.
- **RimWorld comfort band**: each pawn has a Min/Max Comfortable Temperature
  (~16–26 °C); beyond ±10 °C of the range, **hypothermia/heatstroke** accrue (both
  lethal at 100%); the range is widened by apparel **insulation**, genes, hediffs.
- **Don't Starve dual gauges** (Winter Freezing / Summer Overheating, each with its
  own counters — thermal stone, endothermic fire, shade).

The lesson: pick the model depth deliberately — a single gauge (BotW), an additive
"feels like" (TLD), or a comfortable-band-with-insulation (RimWorld).

## Biome / climate-driven weather

How biome + season + time + altitude combine into a local condition:

- **Minecraft**: each biome has a base temperature; actual temp drops ~0.00125 per
  block above Y=81; precipitation **rains if temp ≥ 0.15, snows if < 0.15** —
  mountains snow-cap above the snow line even in temperate biomes. No seasons.
- **RimWorld**: outdoor temp = f(biome avg, latitude, season, time-of-day) +
  events; the fullest combination model (all five factors).
- **Valheim**: biome *is* the climate authority (Mountain = permanent Freezing;
  night = Cold; being Wet cancels frost resistance — a dry-off loop).
- **Terraria**: biome-scoped weather (global Rain renders as a Blizzard in the Snow
  biome; Sandstorm only in Desert).

General model: `local_condition = f(biome_base, latitude_offset, season_phase,
time_offset, altitude_lapse) + stochastic_event`.

## Time-driven world state

- **Spawn windows**: BotW Stal enemies emerge 21:00–05:00 and self-destruct at
  dawn (with no-sun exception zones, and a don't-spawn-if-player-too-close rule);
  night-only shops; Genshin fish species split day/night, NPCs relocate.
- **NPC schedules as data with weather variants** (the remarkable datamined
  detail): each BotW NPC ships a `baischedule` with **rain variants as first-class
  fields** (`WaitAnchorRainASName`, `RainEmotion`…). Rain isn't a behavioral patch;
  every schedule entry has its rain version (merchants shelter, sell rain-day stock).

## Numbers (sourced anchors)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Lightning telegraph | ~10 s sparking; target tick ~5 s | measured |
| BotW temp thresholds | 0/−10/40/50 °C; cold ½ heart per 10 s | wiki |
| Sheer Cold | 1 %/s fill (alert 70 %), then 1 % maxHP + 150 HP/s | wiki |
| TLD warmth | gains while Feels Like > 0 °C; Snow Shelter +15 °C | wiki |
| RimWorld comfort | ~16–26 °C band; ±10 °C beyond → affliction | wiki |
| Minecraft | snow if temp < 0.15; lapse −0.00125/block above Y81 | wiki |

## Flagged gaps — do NOT invent

The exact lightning tick (5 min is community consensus, not datamine) · off-screen
NPC simulation level · BotW heat damage ticks (only cold is measured) · the
day/night temperature swap hour.

## Sources

GDC 2017 (Dohta — chemistry engine) · zeldamods (AISchedule, Stal pages) · Genshin
wikis (Sheer Cold, Hydro) · The Long Dark Wiki (Feels Like, Cabin Fever) · RimWorld
Wiki (Temperature) · Don't Starve Wiki (Winter/Summer) · Minecraft Wiki (Biome,
Weather) · Valheim Wiki (Environment).
