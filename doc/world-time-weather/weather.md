# Weather — data model and simulation

Two traditions: **weather as data** (the BotW pre-rolled model, fully datamined)
and **simulation-driven weather** (clouds/fronts, rendering-heavy). All numbers
are **starting points**. Tagged **[DOC]** documented / **[INF]** inferred.

## Weather as data (the BotW model)

**Weather is data, not simulation** — the architecture, fully datamined:

- **Climate profiles as assets**: the world maps to climates (94 areas → 20
  climates via a region lookup); each climate bundles per-type probability rates
  (`Bluesky/Cloudy/Rain/HeavyRain/Storm`), temperature tables per 100 m altitude
  band × day/night, and a sky palette. 9 weather types total; **snow is rain +
  cold temperature**, not a separately scheduled state.
- **Pre-rolled schedule**: weather is drawn ahead for 3 in-game days in 4-hour
  slots, packed into the save (6 four-bit nibbles per int32 per climate).
  Consequences: a *deterministic* forecast (the HUD icon is honest), no reroll on
  reload (anti-save-scum by design), and time-skip just moves the cursor. The
  current climate is resolved from the **camera** position.

A weather **state** bundles: precipitation type+intensity, wind, fog density,
cloud coverage, lighting palette, audio bed, gameplay flags. BotW's WorldMgr
splits sub-managers (Time/Weather/Sky/Temp/Clouds) — the logical state is distinct
from each presentation consumer.

## The override stack

```
debug/forced > quest/cinematic override > permanent special climate
  (Dragonspine subzero, Seirai perpetual storm)
> persistent regional state (mutable by progression — finishing the
  Seirai questline clears its storm; freeing Vah Ruta stops the rain)
> ambient probabilistic schedule (the climate tables)
```

Every entry is a **handle** (acquire/release, owner, priority, safety timeout)
plus a diagnostic listing live handles — the imperative `SetWeather` with no owner
is the leak generator (pitfalls #8). Cities-always-sunny is a permanent regional
entry.

## Transitions

Schedule granularity (4 h) ≠ blend duration (unpublished for both games —
flagged). Make every channel fade: lighting profile weights, fog, cloud coverage,
particle emission ramps, audio crossfades. Cloud cover leads the rain (observable
in BotW) — **sequence the channels, don't lerp them in lockstep** (pitfalls #4).

## Simulation-driven weather (the rendering-heavy side)

When weather is an emergent system rather than a schedule:

- **Volumetric clouds (the Nubis lineage)** [DOC]: raymarch through 3D noise,
  clouds built at two LODs (low-freq base + high-freq detail). **Perlin-Worley
  noise** (Perlin connectedness + inverted Worley billows) + a height/density
  gradient per cloud type + a coverage signal from a weather map. Cost ~2 ms on
  PS4; cheap-sampling (big empty steps, expensive sampling only when density > 0,
  bail after ~10 empty steps). Horizon Forbidden West's Nubis³ moved to a
  voxel-based renderer with compressed-SDF ray-march acceleration. RDR2 voxelizes
  + raymarches, sharing the result across viewport, reflections, and a sky
  irradiance probe grid.
- **Atmospheric scattering** [DOC]: Bruneton 2008 (precomputed LUTs) → Hillaire
  2020 "Scalable and Production Ready Sky and Atmosphere" (shipped as UE Sky
  Atmosphere): low-res LUTs (Transmittance / Multiple-Scattering / Sky-View /
  Aerial-Perspective) decoupling atmosphere cost from screen resolution.
- **Dynamic storm systems**: RDR2's "advanced weather system" (real cloud movement
  tied to time/location — a directable *hybrid*); Sea of Thieves' server-created
  **moving 3D storm volumes** (wind strength, lightning frequency, wave amplitude),
  server-authoritative lightning so all crew see the identical bolt, wind as a
  world-space vector field; MS Flight Simulator's live Meteoblue NWP + METAR
  injection (METAR overrides only surface wind/temp/pressure; clouds/precip always
  come from the model).
- **Temporal upsampling (the key optimization)** [DOC]: raymarch to a quarter-res
  buffer (1/16 of pixels per frame), reproject via motion vectors, converge full-res
  over 16 frames — at the price of blur/streaking on fast camera motion.

## The simulation-vs-authored spectrum

- **"Weather as set dressing"** (cheap, directable, data-driven schedules —
  BotW/Genshin, No Man's Sky's seed-driven storms) vs **"weather as system"**
  (simulated fronts, emergent, expensive — MS Flight Sim, Sea of Thieves).
- **Directability is the recurring demand**: Guerrilla, Rockstar, and Hillaire all
  keep the PBR/sim **art-directable** (presets, coverage maps, weather maps) —
  pure simulation is rejected for narrative control.
- **RDR2 is the canonical hybrid**: physically-grounded scattering + voxel clouds,
  but storms/mood scripted to mission/story.
- **Cost ordering (rough)**: atmosphere scattering (sub-ms LUTs) < volumetric
  clouds (0.2–5 ms, amortized 1/16) < FFT ocean (up to ~40% frame) < live-NWP
  weather (only viable by offloading to forecast servers). Don't treat as a hard
  benchmark.

**When to simulate**: flight/naval sims and emergent multiplayer (shared
deterministic state) justify simulation; linear/narrative open worlds lean
authored + reconstructed.

## Numbers (sourced anchors)

| Parameter | Value | Anchor |
| --- | --- | --- |
| BotW schedule | 4-hour slots, 3 days pre-rolled, 9 types, 94→20 climates | datamine |
| Nubis clouds | ~2 ms PS4; Perlin-Worley + height gradient | SIGGRAPH 2015 |
| Cloud upsampling | quarter-res = 1/16 px, converge over 16 frames | ARTR |
| Sea of Thieves storms | server-authoritative volumes + lightning seed | Rare GDC |
| No Man's Sky | seed-driven storms, ~5 min events, biome-gated | wiki |

## Flagged gaps — do NOT invent

Weather blend durations and curves (BotW and Genshin — unpublished; only proxy is
Genshin's 0.05–1 s talent sky transitions) · Genshin's internal weather algorithm
· per-climate rain % values (structure datamined, numbers not extracted) · RDR2's
exact cloud-update cadence (DF inference) · Sea of Thieves storm parameters (some
secondary-sourced).

## Sources

zeldamods (AreaData, WorldMgr) · botw decompilation · Guerrilla SIGGRAPH 2015/2023
(Nubis / Nubis³) · Hillaire EGSR 2020 (Sky Atmosphere) · Rockstar SIGGRAPH 2019
(RDR2 atmosphere) · Rare GDC ("Technical Art of Sea of Thieves") · MSFS blog
(Meteoblue / METAR) · Digital Foundry (RDR2, Death Stranding timefall).
