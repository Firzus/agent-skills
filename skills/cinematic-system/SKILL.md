---
name: cinematic-system
description: >-
  Architecture blueprint for cutscene systems in open-world games: the
  universal timeline model (typed tracks, clips with blends, markers,
  director-resolved bindings — the schema Unity Timeline, UE Sequencer,
  and Nintendo's BFEVFL independently converge on), realtime vs
  pre-rendered video decision matrix (codecs, middleware, overlay
  subtitles, the seam problem), the gameplay-to-cutscene transition
  contract (the datamined BotW bdemo checklist: preload gates, world
  staging, exit positions), skip with the all-events-fire guarantee,
  replay galleries and the context problem, the full production pipeline
  (previz, mocap, dailies, binary asset versioning); the cinematography
  craft (film language and shot grammar — the 180/30-degree rules,
  shot/reverse-shot, J/L-cuts, shot sizes; camera and lens craft — focal-
  length emotion, dolly zoom, motivated movement; cinematic lighting and
  color grading; virtual production — LED volumes/ICVFX, virtual cameras,
  simulcam; performance capture — optical/inertial/markerless, facial and
  MetaHuman Animator; realtime cinematic tech — the physical camera model,
  Movie Render Queue warm-up); and the interactive-cinematic design layer
  (the cutscene/ludonarrative debate, QTEs, playable cinematics — the
  Naughty Dog active-cinematic and GoW one-shot, branching and choice-driven
  cinematics — Mass Effect/Telltale/Until Dawn and the combinatorial-
  explosion patterns, player-state-reflective cutscenes — the equipment-
  mismatch and canonize-vs-reflect problem, and cutscene/QTE accessibility).
  References: Genshin Impact (USM mix), BotW/TotK (Demo events datamine),
  God of War/Naughty Dog/Half-Life (interactive craft), with GDC talks for
  production. Use when designing or building cutscenes, timelines, in-game
  cinematics, cinematography, virtual production, QTEs, branching/interactive
  cinematics, video playback, skip systems, or when skips break quest state,
  bindings T-pose, first shots show low-res textures, the film grammar feels
  off, or a QTE locks players out.
---

# Cinematic System

Build the cutscene layer of a game — realtime timelines, pre-rendered
video, transitions, skip/replay, the production pipeline, the
cinematography craft, and the interactive-cinematic design layer. Lip
sync/facial stays in `dialogue-system` (the cinematic hosts it).
References: Genshin Impact (the realtime/USM mix), BotW/TotK (the datamined
Demo system — the most complete public transition contract), God of War /
Naughty Dog / Half-Life (the interactive-craft poles), with the Naughty
Dog / Santa Monica / Guerrilla GDC canon for production.

## The architecture rule

**One timeline model, one director, and a skip that reaches the final
state.** Three independent implementations converge on the same
schema — Unity (PlayableDirector/TimelineAsset), UE
(LevelSequence/MovieScene), and Nintendo (BFEVFL "TLIN": actors,
clips, triggers, subtimelines, cuts):

```
CUTSCENE ASSET (data, reusable across contexts)
  tracks (typed: animation / camera / audio / VFX / activation /
          subtitle / EVENT)
  track -> binding role + clips { start, duration, blendIn/Out,
           payload } + markers
  sub-timelines for composition (shots, department layers)

DIRECTOR (runtime)
  resolves BINDINGS at play time — the canonical decision per role:
    possess an existing world actor  (scene interacts with world)
    spawn a temporary scene actor    (replayable anywhere)
  owns the clock (choose and lock the source: game / unscaled / DSP)
  evaluates tracks, fires events through markers

EVENTS (the quest-system contract)
  gameplay consequences (give item, set flag, advance quest) fire
  ONLY through event tracks/markers — never "code at the end" —
  and they fire on skip too (retroactive markers are the native
  engine support for this rule)

THE SESSION (the same finally-scope as dialogue)
  enter: input lock, state capture, preload gate, world staging,
         HUD hide, letterbox
  exit:  restore-or-scene-defined position, camera handoff,
         buffered-input flush — on EVERY path (end, skip, error)
```

## Reference map

| File | Covers |
| --- | --- |
| [timeline-transitions.md](./timeline-transitions.md) | The timeline model (three implementations, one schema), binding resolution (possess vs spawn, role tables), event markers, the bdemo transition contract, the session scope, skip/replay (the all-events-fire rule, the context problem), the timeline engine mapping |
| [production.md](./production.md) | Realtime vs pre-rendered (the decision matrix), codecs & middleware (USM/Bink/VP9, overlay subtitles), the realtime↔video seam, the mocap-to-final production pipeline, localization re-timing, binary versioning, the sourced number tables |
| [cinematography.md](./cinematography.md) | Film language & shot grammar (180/30-degree, shot/reverse-shot, J/L-cuts, shot sizes), camera/lens craft (focal-length emotion, dolly zoom, motivated movement), cinematic lighting & color, virtual production (LED volumes, virtual cameras, simulcam), performance capture, realtime cinematic tech (physical camera, Movie Render Queue) |
| [interactive.md](./interactive.md) | The cutscene/ludonarrative debate, QTEs (history, good design, decline), playable cinematics (ND active-cinematic, GoW one-shot, Half-Life), branching & choice-driven cinematics (Mass Effect/Telltale/Until Dawn, combinatorial-explosion patterns), player-state-reflective cutscenes (equipment mismatch, canonize-vs-reflect), cutscene/QTE accessibility |
| [pitfalls.md](./pitfalls.md) | 16 failure modes (symptom → cause → prevention) with debugging order and ship checklist |

## Realtime vs pre-rendered

Default to realtime; pre-render only what exceeds the runtime budget.
The decision matrix (sourced in [production.md](./production.md)):
visual complexity vs player-state reflection (outfits/weather),
determinism vs file weight (Genshin's USM archive: ~42 GB cumulative),
localization (overlay subtitles + per-language audio tracks in the
container — **never baked**), spoiler protection (encrypted videos in
pre-downloads), and art consistency (the Lost Odyssey seam lesson).
Both reference games mix: BotW's 18 Memories ship as mute VP9 1080p30
videos with overlay subtitles/rumble and separate audio streams;
Genshin pre-renders only ~2–10 signature moments per version.

## Build order (4 shippable tiers)

```
Tier 1 — Timeline core
- [ ] Timeline asset model (typed tracks, clips, blends, markers) +
      director with explicit clock source
- [ ] Binding resolution by ROLE (table role->actor at launch;
      possess-vs-spawn decided per role)
- [ ] Event markers wired to the quest/world event bus, with
      retroactive firing
- [ ] The cutscene session scope (capture + finally-restore)
Tier 2 — Transitions (the bdemo checklist)
- [ ] Preload gate: wait-for-actors + streaming mode per scene
      (seamless / full-package / async — open-world-streaming)
- [ ] World staging as data: hide actors, weather/time override,
      pause simulation, audio mute/BGM policy
- [ ] Exit contract: scene-defined player end position OR captured
      restore; camera handoff (camera-system); input flush
- [ ] Letterbox by target ratio (never fixed pixels); HUD hide
      channel (hud-system)
Tier 3 — Skip, video, replay
- [ ] Skip = reach final state: fast-forward or jump-to-end with all
      events fired; QA invariant: state-after-skip == state-after-
      watch; per-scene skip policy as data (the bdemo SkipPolicy)
- [ ] Video playback (middleware decision), overlay subtitles,
      per-language audio; the realtime->video seam protocol (frozen
      exposure/LUT, same-bus audio, or a masking fade)
- [ ] Seen-flag vs completion-flag separation (suspend/crash safety;
      save-persistence)
- [ ] Replay gallery: snapshot context or canonical re-staging
      (all-spawnable scenes replay anywhere)
Tier 4 — Production pipeline
- [ ] In-engine previz/blocking workflow (gray-box + cameras first;
      the same scene file flows to final)
- [ ] Mocap loop: shoot plan -> Take Recorder/import -> retarget ->
      polish layers (facial via dialogue-system)
- [ ] Binary discipline: exclusive checkout + master/sub-sequence
      split per department (one-owner rule)
- [ ] Localization re-timing: per-language subtitle tracks, dub
      length windows communicated early; dailies cadence
```

## Numbers (starting points — sourced anchors)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Video specs | Genshin USM: VP9 1080p30 ~10 Mbps, 20–300 MB/video, ~42 GB archive, 4 audio languages + 15 subtitle languages overlay, Boy/Girl variants; BotW: VP9 1080p30 Switch / AVC 720p30 Wii U, mute + separate audio streams | datamine |
| Middleware | Bink 2: 1080p ≈ 1.2 MB/s, 4K decode 2.3 ms/frame on PS4-class (GPU), free in UE; Sofdec2 default 3 Mbps, VP9 ≈ 2× H.264 compression, multi-language in one container | official |
| Content scale | BotW 18 Memories (~31 min; total cutscenes ~1 h 48); TotK 12 Dragon's Tears (~37 min); TLOU: 90 min cutscenes + 2 h IGC | wiki/GDC |
| Production | ~15 s finished cinematic/week/animator incl. facial (Naughty Dog) ≈ 1 min/month; ~30 animators at TLOU peak, daily dailies; Horizon FW: 22 h of cinematics | first-hand |
| Mocap | $1.5–5k/day studio, 2-day session ≈ $15–40k for 50–80 game-ready clips; cleanup 2–8× capture time; 15–25 files/day; end-to-end 6–14 weeks | industry |
| Shot grammar | film ASL ~2.5 s today (no game-specific GDC figure — analogy, flagged); GoW 2018: ~100 uncut shots, zero cuts total | academic/GDC |
| Transitions | fades 0.3–1 s convention; visuals lead audio by 200–500 ms; letterbox/hold-to-skip durations unpublished (flagged) | consensus |
| Skip/replay facts | Genshin: no narrative skip until late (domain reward skip 5.7; Recollection replay gallery 6.3, 2026); BotW: per-scene SkipPolicy in data, X-then-+ confirm, Memories replayable from the log; RDR2: hold-to-skip against accidental skips | verified |
| Localization | dub within ±0.2 s of source duration; FF7R: FR/DE retimed to Japanese pauses — subtitle/marker timing is per-language | official |

Flagged — never invent: letterbox/hold durations in shipped games,
input flush timings, preload distances, game-specific ASL, timeline
track-count budgets, the exact Genshin general-skip version (sources
conflict). Full tables in [production.md](./production.md).

## Engine mapping

| Generic block | Unity 6 | UE5 (5.4+) |
| --- | --- | --- |
| Timeline | Timeline package (mature, maintenance — 1.8.x active fixes); PlayableDirector + typed tracks; **Sequences package DEPRECATED since 6.1** (don't build on it) | Sequencer: LevelSequence/MovieScene, tracks→sections→channels; Shot track + sub-sequences |
| Events | Signal Asset/Emitter/Receiver (+ `INotification` for code); **Retroactive flag** = the skip support; last-frame signals may not fire (offset ~0.01 s) | Event Track → Director Blueprint endpoints |
| Bindings | Generic bindings (per-director) + ExposedReference (clips); hot rebind limited — Stop→rebind→Play is the reliable pattern | Possessable vs spawnable; **5.4 Dynamic Binding** (resolve-by-function, e.g. player pawn), 5.5 Replaceable custom bindings; `MovieSceneBindingOverrides` |
| Camera | CinemachineTrack overrides the Brain's priority; blend = clip overlap; control returns to the Brain at end — the handoff contract | Camera Cut track + CineCamera; the camera-system restore |
| Video | VideoPlayer (H.264 cross-platform; **documented audio desync** on Android/Windows/WebGL, async queued seeks) → CRIWARE plugin (USM, multi-language containers, alpha movies) or AVPro for serious use | Media Framework/Electra (OS codecs only, hard-coded platform caps) or **Bink — bundled free** (.bk2, light CPU decode) |
| Pre-render path | Recorder (supported post-6.1) | MRQ (stable through 5.6) → Movie Render Graph (experimental 5.4, matured ~5.8) |
| Streaming | `StreamingController.SetPreloading` + forced mips before cuts | **Cinematic Prestreaming** plugin (records per-frame mip requests, replays with pre-roll) |
| Anim polish | Animation tracks + override layers | 5.4 Layered Control Rigs (non-destructive over clips); Take Recorder for mocap/previz |
| Versioning | Text-serialization barely helps timelines — split + ownership | `.uasset` unmergeable (Epic-confirmed) — Perforce `binary+l` exclusive checkout + sub-sequence split |

## Failure modes

The 16 classic cutscene bugs (the unskippable cutscene, skip leaving
broken state — the 007 First Light and Ship of Harkinian cases,
binding breaks across contexts, the streaming hitch and low-res first
shots, video/realtime seam pops, session state leaks, the
mid-cutscene interruption hole, frame-rate-dependent timelines, audio
drift on long scenes, the localization re-timing trap,
letterbox/ultrawide bugs, the binary merge disaster, cutscene-applied
world-change desync, the replay-context problem, **broken film grammar**,
and **QTEs that exclude players**) are cataloged in
[pitfalls.md](./pitfalls.md) with symptom → root cause → prevention.

## Related skills

- `scene-flow-manager` — cinematic contexts, transition gates, state
  restore on context exit.
- `camera-system` — the Brain handoff, dialogue cameras, the GoW
  one-shot constraint.
- `dialogue-system` — facial/lip sync production and VO timing; the
  session-scope discipline shared.
- `quest-system` — event tracks fire the same events as gameplay;
  single source of truth for world changes.
- `open-world-streaming` — preload gates, streaming modes per scene.
- `hud-system` — HUD hide channel, subtitle safe areas.
- `coop-session` — host cutscenes as per-player presentation (guests
  keep playing).
- `save-persistence` — seen/completion flag separation, auto-save
  after cutscenes.
