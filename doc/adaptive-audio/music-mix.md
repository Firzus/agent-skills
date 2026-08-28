# Music, mix & voices — the adaptive core

The adaptive-music engine, the mix architecture, voice management, and the
middleware decision. All numbers are **starting points — tune by ear**;
flagged gaps at the bottom. Spatial audio is in [spatial.md](./spatial.md);
the DSP under all of it in [dsp-synthesis.md](./dsp-synthesis.md); the
design/composition craft in [design-craft.md](./design-craft.md). Primary
sources: CEDEC 2017 (the BotW sound talk) + composer interviews, zeldamods
(BFSTM/BARS), the Genshin Wwise Tour 2020 + datamine, the ASWG-R001 PDF,
Audiokinetic/Epic/Unity docs, the DICE HDR GDC talk.

## Adaptive music

### The three tools (usually hybrid)

- **Vertical layering**: synchronized stems (same tempo/key) added or
  removed by volume automation on game state — gradual intensity
  (exploration → combat escalation). Requirements: all stems exactly the
  same length, sample-accurate start, shared playback position to join a
  layer mid-flight.
- **Horizontal re-sequencing**: music cut into segments with entry/exit
  points; transitions on musical boundaries. Shorter segments = more
  reactive score. For discrete state changes.
- **Stingers**: quantized one-shot overlays on events (discovery, kill,
  victory).
- The dominant shipped pattern is **hybrid**: re-sequencing between
  states, layering within a state, stingers as punctuation (the boss
  example: horizontal switch into the boss track, vertical layers
  following the boss HP).

### The two reference philosophies

- **BotW — "environmental BGM"** (CEDEC 2017 + interviews): the team
  dropped "world BGM" — no overworld loop; the ambience IS the BGM,
  punctuated by aperiodic solo-piano fragments (Field Day: ~3/4 silence;
  the fragments break monotony and mask looping). Village/temple themes
  are **spatial emitters** with stepped approach transitions — music as
  wayfinding (hand-tuned over "a month of walking around Hyrule"). Combat
  music is a functional signal (the Guardian ostinato starts on
  detection, stops on threat end); every sound carries a priority and
  volume; ambient SFX cut during combat. Datamined: **BFSTM multi-track**
  streams (in-file layers toggled at runtime), **BFSTP** ~1 s prefetches
  for instant starts, a **main + outro** segment pattern
  (`BGM_Guardian_main` / `BGM_Guardian_outro`).
- **Genshin — regional sets on Wwise** (Wwise Tour 2020 + datamine):
  day/dusk/night variants of one theme per region; **combat music is a
  reorchestration of the exploration theme** with the same melody and
  length, transitioning at the **same playback position** and resuming
  exploration where it left off (the "Same Time as Playing Segment"
  behavior); quest/event music overrides regional music — the override-
  stack shape again.

### The music state machine

The Wwise model is the canonical vocabulary even when building native:

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

The **musical clock** (BPM, time signature, beat/bar callbacks) drives
quantization and stingers: native in UE5 (Quartz), hand-rolled in Unity
(dspTime math: next-beat at 120 BPM = up to 500 ms wait — the sample-
accurate scheduling in [dsp-synthesis.md](./dsp-synthesis.md)). DOOM as
the extreme: same-key/tempo segments selected by combat scripts —
gameplay plays the music. The composer-side discipline (loopable,
key/tempo-locked, leitmotif) is in [design-craft.md](./design-craft.md).

## The mix

- **Bus hierarchy** (the de-facto standard): `Master → Music / SFX / VO /
  Ambience / UI`, sub-buses per category, per-bus compression/EQ, 2–4
  levels deep, top-down.
- **The ducking matrix as data**: source × target × depth × attack/
  release. Sourced presets: light −6 dB (50/500 ms), medium −12 (30/400),
  heavy −20 (20/600); asymmetric fades (duck fast ~10–50 ms, restore slow
  500–1500 ms); duck to a target level, never mute; a hold time kills
  inter-phrase flutter. Implemented as sidechain dynamics
  ([dsp-synthesis.md](./dsp-synthesis.md)). The **mix anchor** principle:
  pick one pillar (usually dialogue) and balance everything against it.
- **Mix states in a priority stack**: exploration/combat/menu/underwater
  — one **MixDirector** owns the mixer; systems request states, the stack
  arbitrates (the pause snapshot is the `menu-ui-manager` contract).
  Unity trap: a script-set exposed parameter escapes snapshot control
  until `ClearFloat`.
- **Loudness compliance** (verified): Sony ASWG-R001 — **−24 LKFS ±2 LU**
  integrated (home consoles), **−18 ±2** (portable), true peak −1 dBTP,
  LRA ≤ 20 LU, measured per ITU-R BS.1770 on **≥30 min of representative
  gameplay**. EBU R128 (−23 ±1) and ATSC A/85 (−24) as broadcast context;
  Netflix's dialogue anchor (−27 ±2 dialogue-gated) as anchoring
  practice. ASWG is a recommendation, not a hard cert gate. LKFS ≡ LUFS.
- **Dynamic range options** (accessibility): the Naughty Dog presets are
  the sourced reference — thresholds Wide −4 dB / Normal −8 / Narrow −10 /
  **Midnight −16 + reduced volume + LFE cut** (the night-mode rationale is
  in [design-craft.md](./design-craft.md)).
- **HDR audio** (the DICE GDC talk): per-asset loudness as priority; a
  sliding loudness window keyed to the loudest sound culls everything
  below — the conceptual ancestor of "the mix is data".

## Voice management

- **Concurrency per category**: caps (max N footsteps, M impacts),
  retrigger windows (~60 ms minimum), round-robin variations, pitch
  randomization (±0.5 semitone kills phasing). UE ships this natively
  (Sound Concurrency assets: StopFarthest/Oldest/Quietest/LowestPriority);
  Unity hand-rolls it.
- **The priority grid**: VO > music > gameplay SFX > ambience > foley,
  with per-category reserves so footsteps can never steal the dialogue.
  Wwise formalizes distance-dependent priority (a priority offset at max
  distance).
- **Virtualization**: voices below the audibility threshold (Wwise
  default −80 dB; −60 dB as a common project start) become virtual —
  parameters tracked, zero DSP — and return via *resume* or *play-from-
  elapsed*; the recommended default: **kill if finite, else virtual**.
  Loop-awareness is the trap (see pitfalls #5). The physical-voice cap is
  the #1 CPU driver ([dsp-synthesis.md](./dsp-synthesis.md)).
- **Budgets**: Unity defaults 32 real / 512 virtual (community-confirmed;
  past the virtual cap sounds stop dead); UE MaxChannels 32 by default;
  the "64–128 AAA real voices" figure is practice, not standard.

## The middleware decision (native-first)

- **What native covers now**: UE5 — MetaSounds (sample-accurate DSP
  graphs, the Sound Cue replacement) + Quartz (quantized playback) +
  Sound Concurrency + native trace occlusion + Audio Gameplay Volumes +
  stream caching. Unity — the mixer (groups/snapshots/ducking/sends) and
  sample-accurate scheduling (`PlayScheduled`); everything else (music
  system, concurrency, occlusion, ambience manager, debug HUD) is
  hand-rolled.
- **What middleware still buys**: the **authoring tool** — composers and
  sound designers iterate without engine builds (Wwise interactive-music
  hierarchy; FMOD's DAW-like timeline + Live Update), the real-time
  profiler, bank management, cross-platform consistency. Licensing: free
  under indie thresholds (Wwise < $250k budget; FMOD < $200k revenue).
- **The rule** (sourced): start with the simplest sufficient tool;
  upgrade only on a concrete ceiling — usually the composer workflow.
  Genshin ships Wwise; BotW ships Nintendo's internal stack. The
  production-workflow handoff is in [design-craft.md](./design-craft.md).

| Criterion | Native | Middleware |
| --- | --- | --- |
| Dedicated audio designers without engine access | ✗ | ✓ (authoring + Live Update + profiler) |
| Complex quantized interactive music | UE5 ✓ (Quartz); Unity: hand-rolled | ✓ turnkey |
| Simple layers + snapshots | ✓ amply sufficient | oversized |
| Budget | $0 + engineering cost | free indie, then paid |
| Profiling/platform maturity | UE5 good, Unity limited | proven |

## Flagged gaps — do NOT invent

"Music −12 to −18 dB under dialogue" as a figure (unsourced — only the
ducking presets are) · per-category concurrency caps in shipped games ·
Genshin combat fade/linger durations (behavior documented, times not) ·
the "explore crossfade 2–5 s / linger 3–8 s" conventions · night-mode
compression ratios (only the ND thresholds) · BotW beat-quantization
(only main/outro segments are attested) · Genshin mobile voice budgets ·
PS5 hardware voice counts · console RAM audio budgets · Unity DSP buffer
values (256/512/1024 — convergent but unofficial) · Wwise bank size
recommendations.

## Sources

CEDEC 2017 BotW sound talk (Walker summary) + composer interviews ·
zeldamods (BFSTM/BFSTP/BARS) · Audiokinetic Wwise Tour 2020 (Genshin) +
datamine · HoYoverse Developer Insights (Yu-Peng Chen) · ASWG-R001 PDF +
Sony-ASWG GitHub · EBU R128 / ATSC A/85 / Netflix specs · Audiokinetic
docs (transitions, virtual voices, priority, codec costs) · Epic docs
(Quartz, MetaSounds, Sound Concurrency, stream caching) · Unity docs
(PlayScheduled, dspTime, AudioMixer, virtualization) · DICE GDC (HDR
audio) · GDC DOOM (Mick Gordon) · Naughty Dog DR presets. Spatial sources
in [spatial.md](./spatial.md); DSP sources in
[dsp-synthesis.md](./dsp-synthesis.md).
