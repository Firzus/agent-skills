# Architecture — music, mix, voices, spatial, middleware

The components of a production audio system. All numbers are
**starting points — tune by ear**; flagged gaps at the bottom.
Primary sources: CEDEC 2017 (the BotW sound talk, Walker translation)
+ the official composer interviews, zeldamods (BFSTM/BARS), the
Genshin Wwise Tour 2020 + `.pck`/`.bnk` datamine, the official
ASWG-R001 PDF, Audiokinetic/Epic/Unity official docs, the DICE HDR
GDC talk.

## Adaptive music

### The three tools (usually hybrid)

- **Vertical layering**: synchronized stems (same tempo/key) added or
  removed by volume automation on game state — gradual intensity
  (exploration → combat escalation). Requirements: all stems exactly
  the same length, sample-accurate start, shared playback position
  to join a layer mid-flight.
- **Horizontal re-sequencing**: music cut into segments with
  entry/exit points; transitions on musical boundaries. Shorter
  segments = more reactive score. For discrete state changes.
- **Stingers**: quantized one-shot overlays on events (discovery,
  kill, victory).
- The dominant shipped pattern is **hybrid**: re-sequencing between
  states, layering within a state, stingers as punctuation (the boss
  example: horizontal switch into the boss track, vertical layers
  following the boss HP).

### The two reference philosophies

- **BotW — "environmental BGM"** (CEDEC 2017 + official interviews):
  the team dropped "world BGM" — no overworld loop; the ambience IS
  the BGM, punctuated by aperiodic solo-piano fragments (Field Day:
  ~3/4 silence; the fragments break monotony and mask looping).
  Village/temple themes are **spatial emitters** with stepped
  approach transitions — music as wayfinding (distances and volumes
  hand-tuned over "a month of walking around Hyrule"). Combat music
  is a functional signal (the Guardian ostinato starts on detection,
  stops on threat end); every sound carries a priority and volume;
  ambient SFX cut during combat. Day/night variants are
  tracklist-confirmed for villages and riding. Emitter placement
  partly automated (Jenkins-generated: birds only near real trees).
  Datamined: **BFSTM multi-track** streams (in-file layers toggled
  at runtime — Nintendo's vertical layering), **BFSTP** ~1 s
  prefetches for instant spontaneous starts (combat), and a
  **main + outro** segment pattern (`BGM_Guardian_main` /
  `BGM_Guardian_outro`).
- **Genshin — regional sets on Wwise** (Wwise Tour 2020 + datamine):
  day/dusk/night variants of one theme per region (same key, same
  mood — the composer-documented system); **combat music is a
  reorchestration of the exploration theme** with the same melody
  and length, transitioning at the **same playback position** and
  resuming exploration where it left off (the "Same Time as Playing
  Segment" behavior, observed by ludomusicology analysis);
  quest/event music overrides regional music — the override-stack
  shape again.

### The music state machine

The Wwise model is the canonical vocabulary even when building
native:

```
states: exploration | combat | boss(phase) | quest-override | cutscene
requests arbitrated by PRIORITY (a stack — the camera-vcam /
weather-override pattern: highest wins, auto-fallback on expiry)
TRANSITION MATRIX: per (source, destination) pair ->
  exit at: Immediate | Next Beat | Next Bar | Next Cue | Exit Cue
  sync to: Entry Cue | Same Time as Playing Segment
  + optional dedicated transition segments (musical bridges)
  + Any->Any fallback rule
```

The **musical clock** (BPM, time signature, beat/bar callbacks)
drives quantization and stingers: native in UE5 (Quartz), hand-rolled
in Unity (dspTime math: next-beat at 120 BPM = up to 500 ms wait).
DOOM as the one-line extreme: same-key/tempo segments selected by
combat behavior scripts — gameplay plays the music.

## The mix

- **Bus hierarchy** (the de-facto standard across Unity/FMOD/Wwise):
  `Master → Music / SFX / VO / Ambience / UI`, sub-buses per
  category, per-bus compression/EQ, 2–4 levels deep, top-down.
- **The ducking matrix as data**: source × target × depth ×
  attack/release. Sourced presets: light -6 dB (50/500 ms), medium
  -12 (30/400), heavy -20 (20/600); asymmetric fades (duck fast
  ~10–50 ms, restore slow 500–1500 ms); duck to a target level,
  never mute; a hold time kills inter-phrase flutter. The **mix
  anchor** principle: pick one pillar (usually dialogue) and balance
  everything against it.
- **Mix states in a priority stack**: exploration/combat/menu/
  underwater — one **MixDirector** owns the mixer; systems request
  states, the stack arbitrates (the pause snapshot is the
  `menu-ui-manager` contract). Unity trap: a script-set exposed
  parameter escapes snapshot control until `ClearFloat`.
- **Loudness compliance** (verified at the source): Sony ASWG-R001 —
  **-24 LKFS ±2 LU** integrated (home consoles), **-18 ±2**
  (portable), true peak **-1 dBTP**, LRA ≤ 20 LU, measured per
  ITU-R BS.1770 on **≥30 min of representative gameplay**. EBU R128
  (-23 ±1) and ATSC A/85 (-24) as the broadcast context; Netflix's
  dialogue anchor (-27 ±2 dialogue-gated) as the anchoring practice.
  ASWG is a recommendation, not a hard cert gate — treat as a
  consistency target. LKFS ≡ LUFS.
- **Dynamic range options** (accessibility): the Naughty Dog presets
  are the sourced reference — thresholds Wide -4 dB / Normal -8 /
  Narrow -10 / **Midnight -16 + reduced volume + LFE cut**.
- **HDR audio** (the DICE GDC talk): per-asset loudness as priority;
  a sliding loudness window keyed to the loudest sound culls
  everything below — the conceptual ancestor of "the mix is data".

## Voice management

- **Concurrency per category**: caps (the authoring pattern: max N
  footsteps, M impacts), retrigger windows (~60 ms minimum),
  round-robin variations, pitch randomization (±0.5 semitone kills
  phasing). UE ships this natively (Sound Concurrency assets with
  resolution rules: StopFarthest/Oldest/Quietest/LowestPriority);
  Unity hand-rolls it.
- **The priority grid**: VO > music > gameplay SFX > ambience >
  foley, with per-category reserves so footsteps can never steal the
  dialogue. Wwise formalizes distance-dependent priority (a priority
  offset at max distance) — the "distance × category" formula made
  official.
- **Virtualization**: voices below the audibility threshold (Wwise
  default -80 dB; -60 dB as a common project start) become virtual —
  parameters tracked, zero DSP — and return via *resume* or
  *play-from-elapsed*; the recommended default: **kill if finite,
  else virtual**. Loop-awareness is the trap (see pitfalls #5).
- **Budgets**: Unity defaults 32 real / 512 virtual (community-
  confirmed; past the virtual cap sounds stop dead); UE MaxChannels
  32 by default (override per platform); the "64–128 AAA real
  voices" figure is practice, not standard (flagged); PS5 Tempest:
  ~100 GFLOPS, "hundreds of sources" — no published voice count.

## Spatial audio

- **Attenuation**: per-category curves (log for world SFX, custom
  for VO/UI), spread up close, 2D/3D blend (music 2D, beds
  quasi-2D, world SFX 3D). The sourced AAA reference curve:
  inverse-square ≈ **-6 dB per distance doubling** (-6 dB/4 m over
  80 m — Volition). Distance units are project-defined: there is no
  category-range standard (flagged).
- **Occlusion** (the open-world standard — neither reference game
  does geometric acoustics): periodic raycasts source→listener at
  **10–30 Hz** (never per frame), time-sliced (~4 rays/frame
  budget), distance-gated; result = a 0–1 factor driving **LPF
  (20 kHz → ~300–500 Hz)** + volume (-10 to -20 dB), smoothed over
  0.1–0.2 s; multi-ray against popping; material weights (wood
  ~0.6, concrete ~0.85). Portals/rooms are the expensive geometric
  alternative.
- **Reverb**: volumes per environment with per-category send levels;
  RT60 anchors from acoustics: room 0.4–0.5 s, concert hall
  1.8–2.2 s, cave/cathedral 2–10 s; the underwater state is a mix
  state + filter, not just reverb.
- **The ambience system**: beds per biome/region crossfaded on
  region change; **weather drives rain/wind beds**
  (`world-time-weather`); random one-shot emitters
  (scatter/random-container pattern) with day/night variants; the
  BotW model: hand-placed + pipeline-generated emitters with
  contextual parameters.
- **Third-person listener** (the standard answer, Epic-documented):
  **position on the character, orientation on the camera** — fixes
  attenuation feel AND the occlusion origin.

## The middleware decision (native-first)

- **What native covers now**: UE5 — MetaSounds (sample-accurate DSP
  graphs, the Sound Cue replacement, born in Fortnite) + Quartz
  (quantized playback, beat delegates) + Sound Concurrency + native
  trace occlusion + Audio Gameplay Volumes + stream caching: the
  full blueprint is implementable natively. Unity — the mixer
  (groups/snapshots/ducking/sends) and sample-accurate scheduling
  (`PlayScheduled`); everything else (music system, concurrency,
  occlusion, ambience manager, debug HUD) is hand-rolled.
- **What middleware still buys**: the **authoring tool** — composers
  and sound designers iterate without engine builds (Wwise
  interactive-music hierarchy and transition matrices; FMOD's
  DAW-like timeline and Live Update), the real-time profiler, bank
  management, cross-platform consistency. Licensing: free under
  indie thresholds (Wwise < $250k budget; FMOD < $200k revenue),
  then per-title.
- **The rule** (sourced): start with the simplest sufficient tool;
  upgrade only on a concrete ceiling — the composer-workflow
  ceiling is the usual one. Genshin ships Wwise; BotW ships
  Nintendo's internal stack (BFSTM/BARS).

| Criterion | Native | Middleware |
| --- | --- | --- |
| Dedicated audio designers without engine access | ✗ | ✓ (authoring + Live Update + profiler) |
| Complex quantized interactive music | UE5 ✓ (Quartz); Unity: hand-rolled pattern | ✓ turnkey |
| Simple layers + snapshots | ✓ amply sufficient | oversized |
| Budget | $0 + engineering cost | free indie, then paid |
| Profiling/platform maturity | UE5 good, Unity limited | proven |

## Flagged gaps — do NOT invent

"Music -12 to -18 dB under dialogue" as a figure (unsourced — only
the ducking presets are) · per-category concurrency caps in shipped
games · Genshin combat fade/linger durations (behavior documented,
times not) · the "explore crossfade 2–5 s / linger 3–8 s"
conventions · night-mode compression ratios (only the ND thresholds)
· BotW mounted-combat music variant (not in the tracklist) · BotW
beat-quantization (only main/outro segments are attested) · Genshin
music switch-container internals and mobile voice budgets · PS5
hardware voice counts · console RAM audio budgets as first-party
figures · Unity DSP buffer values (256/512/1024 — convergent but
unofficial) · per-voice DSP cost figures · Wwise bank size
recommendations.

## Sources

CEDEC 2017 BotW sound talk (Walker summary) + official composer
interviews (OST booklet) · zeldamods (Help:Sound modding, BFSTM/
BFSTP/BARS) · Audiokinetic Wwise Tour 2020 (Genshin) + AnimeWwise/
vgmstream datamine · HoYoverse Developer Insights (Yu-Peng Chen) ·
Di Zeng ludomusicology analysis · ASWG-R001 official PDF + Sony-ASWG
GitHub · EBU R128 / ATSC A/85 / Netflix specs · Audiokinetic docs
(transitions, virtual voices, priority, side-chaining tutorial,
codec costs, mastering blog) · Epic docs (Quartz, MetaSounds, Sound
Concurrency, attenuation occlusion, Audio Gameplay Volumes, stream
caching, debug commands) · Unity docs (PlayScheduled, dspTime,
AudioMixer, virtualization, AudioRandomContainer, import settings) ·
DICE GDC (HDR audio) · GDC DOOM (Mick Gordon) · Naughty Dog DR
presets (dev post) · Volition/Brad Meyer (attenuation curves) ·
David Kizale (AAA occlusion case) · CRYENGINE docs (audio budget) ·
acoustics literature (RT60) · StraySpark/youngju.dev (middleware
landscape 2026).
