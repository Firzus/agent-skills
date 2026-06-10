---
name: adaptive-audio
description: >-
  Architecture blueprint for game audio systems in open-world games:
  adaptive music (vertical layers, horizontal re-sequencing, stingers,
  the music state machine with quantized transition rules), mix
  architecture (bus hierarchy, the ducking matrix, mix-state stacks,
  loudness compliance — ASWG-R001), voice management (per-category
  concurrency, priority stealing, loop-aware virtualization), spatial
  audio (attenuation curves, raycast occlusion, reverb volumes, ambient
  beds driven by region/weather), and the native-first middleware
  decision (UE5 MetaSounds/Quartz and Unity Audio Mixer primary,
  Wwise/FMOD as the authoring-workflow upgrade). References: BotW/TotK
  (the CEDEC-documented environmental-BGM minimalism) and Genshin Impact
  (Wwise-confirmed regional/combat music). Use when designing or
  building game music systems, mixing, sound concurrency, audio
  occlusion, ambience, or when combat music cuts mid-beat, layers
  drift, ducking pumps, or footsteps steal the dialogue.
---

# Adaptive Audio

Build the audio layer of an open-world game — adaptive music, mix,
voices, spatial — **native-first**: UE5 (MetaSounds/Quartz) and Unity
(Audio Mixer + the DSP-clock pattern) as primary targets, Wwise/FMOD
as the deliberate upgrade. References: BotW/TotK (the CEDEC 2017
environmental-BGM philosophy) and Genshin Impact (Wwise confirmed by
the official Wwise Tour and the `.bnk`/`.wem` datamine).

## The architecture rule

**Music is a state machine with quantized transitions; the mix is an
arbitrated stack; every voice has a category, a cap, and a priority.**

```
MUSIC (a state machine + a transition matrix)
  three tools, usually hybrid:
    vertical layers      synced stems added/removed on intensity
                         (gradual change; all stems same length,
                         sample-accurate start)
    horizontal re-seq    segment-to-segment on musical boundaries
                         (discrete state change: explore -> combat)
    stingers             quantized one-shot overlays on events
  the transition MATRIX (the Wwise vocabulary as canon): per
  (source, destination) pair -> exit at Immediate / Next Beat /
  Next Bar / Next Cue + sync to Entry Cue / SAME TIME AS PLAYING
  SEGMENT (the Genshin explore<->combat trick: combat is a
  reorchestration of the same theme, resumed at the same position)
  requests arbitrated by priority (exploration < combat < boss <
  quest override < cutscene) — the same stack pattern as the
  camera vcam and weather overrides
  a MUSICAL CLOCK (BPM, signature, beat/bar callbacks) drives
  quantization — native in UE5 (Quartz), hand-rolled in Unity
  (dspTime + PlayScheduled)

MIX (data, arbitrated)
  bus hierarchy: Master -> Music / SFX / VO / Ambience / UI
  (sub-buses per category, 2-4 levels deep)
  the ducking matrix (source x target x dB x attack/release) as data
  mix states (explore/combat/menu/underwater) in a PRIORITY STACK —
  one MixDirector owns the mixer; nobody calls TransitionTo directly
  loudness compliance: ASWG-R001 as the target

VOICES (caps, priorities, virtualization)
  per-category concurrency caps + retrigger windows + round-robin
  variations; steal lowest-priority-then-quietest
  category priority grid: VO > music > gameplay SFX > ambience
  virtualization: inaudible voices tracked without DSP, resumed
  loop-aware (the kill-if-finite-else-virtual default)

SPATIAL
  attenuation per category (music 2D, beds quasi-2D, world SFX 3D)
  occlusion: periodic raycasts (10-30 Hz, NOT per frame) -> 0-1
  factor -> LPF + volume, smoothed — no geometric acoustics in
  either reference game
  reverb volumes per environment; ambient beds per biome crossfaded
  on region change, weather-driven (world-time-weather contract)
```

## The two reference philosophies

- **BotW — environmental BGM** (CEDEC 2017): no overworld music loop —
  the ambience IS the BGM, punctuated by aperiodic piano fragments
  (Field Day ≈ 3/4 silence); village themes as **spatial emitters**
  with stepped approach transitions (music as wayfinding); per-sound
  priorities and volumes; ambient SFX cut during combat; emitter
  placement partly automated (birds only near real trees). Datamined:
  BFSTM multi-track streams with in-file layers toggled at runtime,
  plus a main/outro segment pattern for combat music.
- **Genshin — regional sets** (Wwise): day/dusk/night variants of the
  same theme per region; combat music starts on aggro (the
  `enemy-ai-framework` threat link) as a reorchestration of the
  exploration theme, transitioning at the same playback position and
  resuming exploration where it left off; quest/event music as
  override-stack entries.

## Build order (4 shippable tiers)

```
Tier 1 — The mix skeleton
- [ ] Bus hierarchy + category routing; compression/EQ per bus
- [ ] The MixDirector: mix-state stack with priorities; ducking
      matrix as data (VO ducks music: ~-6 to -12 dB, fast attack
      ~10-50 ms, slow release ~300-1500 ms, duck-to never mute)
- [ ] Loudness pipeline: -24 LUFS ±2 target (console), -1 dBTP,
      measured on 30+ min representative captures
- [ ] The audio debug HUD day one: voice counts per category, bus
      meters, active mix state, music state
Tier 2 — Music
- [ ] The musical clock (BPM/signature/beat callbacks): Quartz (UE)
      or dspTime+PlayScheduled double-buffer (Unity)
- [ ] The music state machine + transition matrix (per-pair rules);
      request stack with priorities
- [ ] Vertical layers (sample-accurate start, same-length stems) +
      stingers (beat-quantized)
- [ ] Streaming discipline: preload/prime next candidates (~1 s
      ahead scheduling; UE Prime On Load)
Tier 3 — Voices and spatial
- [ ] Per-category concurrency (native Sound Concurrency in UE;
      hand-rolled pooling in Unity) + retrigger windows (~60 ms) +
      pitch variation (±0.5 semitone kills phasing)
- [ ] Loop-aware virtualization policies per category
- [ ] Third-person listener: POSITION on the character, ORIENTATION
      on the camera (also fixes occlusion origin)
- [ ] Occlusion raycasts time-sliced + distance-gated; LPF 20 kHz ->
      ~300-500 Hz + -10 to -20 dB at full occlusion, smoothed
Tier 4 — World integration and platforms
- [ ] Ambient beds per biome/region with crossfades; weather beds
      driven by world-time-weather; day/night variants
- [ ] Reverb volumes (cave/interior/open) + the underwater mix state
- [ ] Compression policy per category (streamed music/beds,
      compressed-in-memory SFX — Vorbis decompressed is ~x10 memory)
- [ ] The mobile mix pass (HPF 200-800 Hz simulation, mono check,
      tightened dynamics) + dynamic range options (the Naughty Dog
      presets: thresholds -4/-8/-10/-16 dB, LFE cut at Midnight)
```

## Numbers (starting points — sourced anchors)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Loudness | ASWG-R001: **-24 LKFS ±2** (console), **-18 ±2** (portable), -1 dBTP, LRA ≤20 LU, ≥30 min capture; EBU R128 -23 ±1; Netflix dialogue anchor -27 ±2 | official PDFs |
| Ducking presets | light -6 dB (50/500 ms), medium -12 (30/400), heavy -20 (20/600); duck-down fast, restore slow (500-1500 ms) | SDK docs (convention) |
| Voice defaults | Unity 32 real / 512 virtual (community-confirmed defaults); UE5 MaxChannels 32; Wwise virtualization threshold -80 dB (course example: -60 dB + 50 max instances as a project start) | engine docs |
| Attenuation | the AAA inverse-square reference: -6 dB per distance doubling (~-6 dB/4 m over 80 m); category ranges are project units (no standard — flagged) | Volition/Wwise |
| Occlusion | LPF 20 kHz → 300-500 Hz, -10 to -20 dB full occlusion, raycasts 10-30 Hz, ~4 rays/frame budget, 0.1-0.2 s smoothing; material factors wood ~0.6 / concrete ~0.85 | practice (convergent) |
| Reverb | RT60 references: room 0.4-0.5 s, concert hall 1.8-2.2 s, cathedral 2-10 s; engine default decay 1.49 s | acoustics literature |
| Transition exercise values | Wwise official course: explore↔combat fade 0.5 s, sync same-time; next-beat wait at 120 BPM ≤ 500 ms | official course |
| CPU/memory | CRYENGINE official: 3-4 ms audio on a 20 ms frame; Vorbis ≈ 1.5-3× ADPCM CPU (Q10 ≈ 2× Q0), ADPCM 4:1 fixed; memory conventions mobile 20-50 / console 100-200 MB (secondary — flagged) | engine/middleware docs |
| Scale anchors | Genshin audio ≈ 17 GB / ~100k files (EN); BotW BFSTM 32 kHz Wii U / 48 kHz Switch; Mondstadt OST 63 tracks/3 discs | datamine/official |

Flagged — never invent: "music -12 to -18 dB under dialogue" (no
source), per-category caps in shipped games, combat fade/linger times
in Genshin (behavior documented, durations not), the exploration
crossfade 2-5 s convention, night-mode ratios (only ND thresholds),
PS5 Tempest voice counts. Full tables in
[architecture.md](./architecture.md).

## Engine mapping (native-first)

| Generic block | Unity 6 | UE5 (5.4+) |
| --- | --- | --- |
| Musical clock | **Hand-rolled**: `AudioSettings.dspTime` + `PlayScheduled` (sample-accurate, officially recommended for stitching); double-AudioSource flip-flop, schedule ~1 s ahead, durations via `samples/frequency` never `clip.length` | **Quartz**: clock subsystem on the audio render thread, `PlayQuantized` with Bar/Beat boundaries, beat delegates to gameplay |
| Music graph | All hand-rolled (state machine, layers, crossfades); AudioRandomContainer (2023.2+) is update-based — NOT for synced music | **MetaSounds**: sample-accurate DSP graphs; vertical layers = Wave Players in one source; documented interactive-music patterns |
| Mix | Audio Mixer: groups, snapshots (`TransitionTo` — linear interpolation: crossfade volume dips), Duck Volume sidechain, sends; exposed-param trap: script-set params escape snapshots until `ClearFloat` | Submixes + **Audio Modulation** (control buses — the modern path; Sound Classes legacy); ducking via Submix Dynamics sidechain (dialogue-system pattern) |
| Concurrency | Hand-rolled per-category pooling; AudioSource priority 0-255; auto-virtualization keeps playback position, stops dead past virtual cap | **Sound Concurrency assets**: max count + resolution rules (StopFarthest/Oldest/Quietest/LowestPriority) + retrigger time — native |
| Virtualization | Priority-then-volume eviction; Virtualize Effect bypasses filters | PlayWhenSilent (resume where it was) vs Restart (from zero; the UE-125054 focus bug — Won't Fix) |
| Spatial | 3D source settings + AudioReverbZone; occlusion = hand-rolled raycasts + AudioLowPassFilter | Attenuation assets with **native trace-based occlusion** (off by default: trace channel, LPF, volume, interpolation); **Audio Gameplay Volumes** (reverb/filter/submix per volume); binaural ITD built in |
| Streaming | Per-clip Streaming (~200 KB overhead each); DSP buffers ~256/512/1024 samples (unofficial but convergent) | **Audio Stream Caching** (default): Load on Demand / Prime / Retain per wave |
| Debug | Profiler audio module only — build the HUD | `au.Debug.Sounds` (+Sort), `au.3dVisualize`, `stat audio`, `audiomemreport` — mostly free |
| Middleware upgrade | Wwise/FMOD buy: the composer/designer **authoring tool** decoupled from engine builds, the interactive-music hierarchy, Live Update, the profiler; licensing free under indie thresholds. The rule: start native, upgrade on a concrete ceiling | Same |

## Failure modes

The 14 classic audio bugs (unquantized transitions, layer drift,
ducking pumping, the 100-footsteps phasing problem, virtualization
killing loops, snapshot fights, the silent priority budget, the
third-person listener mismatch, occlusion raycast spikes, streaming
hitches on music transitions, loudness non-compliance, the mobile mix
disaster, decompressed-audio memory blowouts, missing debug tooling)
are cataloged in [pitfalls.md](./pitfalls.md) with symptom → root
cause → prevention.

## Related skills

- `world-time-weather` — weather/time drive ambient beds and music
  variants; the override-stack pattern shared.
- `enemy-ai-framework` — the aggro/threat link triggering combat
  music.
- `dialogue-system` — VO ducking, the dialogue bus.
- `menu-ui-manager` — the pause mix snapshot contract (refcounted
  pause + audio duck).
- `scene-flow-manager` — context transitions own the audio fades and
  bootstrap residency of the audio services.
- `camera-system` — the arbitrated-stack pattern (vcams) this music
  system mirrors; listener orientation.
- `open-world-streaming` — audio bank/stream residency.
