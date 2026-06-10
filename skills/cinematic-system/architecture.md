# Architecture — timeline, video, transitions, skip/replay, production

The components of a production cutscene system. All numbers are
**starting points — tune by playtest**; flagged gaps at the bottom.
Primary sources: zeldamods (Demo, bdemo, BFEVFL, EventInfo,
Content/Movie — the most complete public datamine of a shipped
cutscene system), the Genshin USM datamines (GI-cutscenes/charlotte),
official Unity/Epic/CRI/RAD docs, and the GDC production canon
(Naughty Dog, Santa Monica, Guerrilla, Square Enix).

## The timeline model

### Three independent implementations, one schema

- **Unity**: `TimelineAsset` (project asset) holding typed tracks
  (Animation, Audio, Activation, Control, Signal) of clips; the
  `PlayableDirector` (scene component) compiles a graph at Play,
  owns the clock and the bindings. Multiple directors can play the
  same asset with different bindings — reusability by design.
- **UE**: `LevelSequence`/`UMovieScene` — object bindings carrying
  tracks, tracks carrying sections (clips with ranges and blending);
  Shot track + sub-sequences for composition.
- **Nintendo (BFEVFL "TLIN", datamined)**: duration, actors,
  actions, clips, oneshots, triggers (2 per clip), subtimelines,
  cuts — the same schema, shipped on a console.

The generic model: `CutsceneAsset { tracks: [typed], track:
{ bindingRole, clips: [{start, duration, blendIn/Out, payload}] },
markers }` + a runtime **Director** resolving bindings and owning
the clock. Concept map: Shot/Subsequence ↔ Control Track · Camera
Cut ↔ Cinemachine Track · Event Track ↔ Signal Track · Level
Visibility ↔ Activation Track.

### Bindings: the canonical decision

Per role, choose: **possess** an existing world actor (the scene
interacts with world state) or **spawn** a temporary scene actor
(the scene is self-contained and replayable anywhere). UE names
these possessable/spawnable; 5.5 reimplements spawnables as
possessables with custom bindings — proof the industry converges on
"binding = pluggable resolution strategy". Resolve by **role table**
at launch (never by serialized scene identity — pitfall #3); UE 5.4+
Dynamic Binding resolves by function (e.g. "player pawn"); Unity
rebinds via `SetGenericBinding`/`SetReferenceValue` before Play.

### Event markers

Gameplay consequences fire **only** through event tracks: Unity's
Signal triple (Asset/Emitter/Receiver, with the **Retroactive** flag
— fire even when playback starts past the marker: the native skip
support) or UE's Event Track into the Director Blueprint. The
`quest-system` contract: give-item/set-flag/advance fire the *same
events as gameplay* — the cutscene is a trigger source, never a
second source of truth.

## Realtime vs pre-rendered

### The decision matrix

| Criterion | Realtime | Pre-rendered |
| --- | --- | --- |
| Visual complexity | bounded by runtime budget | unlimited (crowds, destruction) |
| Determinism | clipping/framerate risk | "nothing can break" |
| Player state (outfit, weather) | reflected | impossible (Genshin ships Boy/Girl video variants — doubling weight) |
| File weight | negligible | heavy (~42 GB cumulative USM archive) |
| Localization | trivial swap | audio tracks per language in the container + overlay subtitles — never re-render |
| Resolution | scales with hardware | frozen (ages badly) |
| Spoilers | dataminable scripts | encryptable (versioned USM keys protect pre-downloads) |
| Art consistency | perfect | a visible seam (the Lost Odyssey lesson) |

Industry default: realtime first, pre-render the few shots beyond
budget (Genshin: ~2–10 USM per version; Naughty Dog went full
realtime from Uncharted 4; FF XVI ships *hybrid shots* — realtime
characters composited with pre-rendered crowds/magic, decided per
shot at storyboard).

### Codecs and middleware

The duopoly: **CRI Sofdec/USM** (Japan/China standard — Genshin;
multi-language audio + switchable subtitles in one container, alpha
movies for seamless transitions, default 3 Mbps, VP9 ≈ 2× H.264
compression) and **Bink** (the western de-facto: 15,000+ games, free
in UE since Epic bought RAD; 1080p ≈ 1.2 MB/s, 4K decode 2.3 ms/frame
on PS4-class with GPU assist). Royalty-free VP9/WebM is the
no-middleware choice (BotW Switch; the video stream inside Genshin's
USM); H.264/HEVC carry license considerations and per-platform OS
decode dependencies.

**Subtitles are overlays, never baked** — three convergent shipped
proofs: Genshin (SRT in gamedata, 15 languages), BotW (`ui_texts`
synchronized over mute videos, plus rumble tracks), CRI (switchable
subtitles in-container). Audio: per-language tracks in the container
(USM ×4) or a separate stream (BotW's `.bfstm`).

### The realtime↔video seam

Match the last realtime frame to the first video frame: same assets,
camera pose, and grading — render the video *from the engine* (MRQ/
Recorder) with the gameplay grading; freeze auto-exposure/LUT a few
frames before the cut; route video audio through the game's bus; or
mask with a fade/flash. Failure modes: lighting/grain mismatch,
player state visible in the wrong outfit, a load hitch at the
switch. (Craft knowledge — few public post-mortems; flagged.)

## Transitions: the bdemo contract

BotW's datamined `.bdemo` descriptor is a shipped checklist — every
entry below maps to a real field:

```
ENTER
  input lock + player/camera state capture
  PRELOAD GATE: WaitLoadActorNames + WaitFrame — the scene waits
    for its actors; EventInfo per-scene streaming mode:
    Seamless / FullPackage / Load / Async (open-world-streaming)
  WORLD STAGING (data): HideActors, DisableFarActors,
    IsOverwritePlayerPos (teleport to stage), Weather/Time override,
    IsStopChemical (pause simulation)
  AUDIO: WorldMuteType, BgmStopType
  HUD hide channel + letterbox (by RATIO, not pixels)
EXIT
  player position: IsMovePlayerEndPos/PlayerEndPos (scene-defined)
    OR captured-position restore — an explicit per-scene choice
  NextDemo chaining before control returns
  camera handoff to gameplay (the Cinemachine Brain / camera-system
    contract: control returns to the highest-priority vcam)
  world flags applied via event tracks; auto_save after (the
    save-persistence hook); buffered-input flush on re-enable
```

The **vignette spectrum** uses the same machinery end to end:
camera-only takeover → walk-and-talk → letterboxed in-world
(Genshin) → full cutscene → video. BotW runs a 2-second chest-get
and a boss cinematic through one system; Naughty Dog's interactive
cinematics (UC4+) blend gameplay into full-quality scenes from
variable start positions; GoW 2018 is the extreme (~100 uncut shots,
zero cuts — the camera "lands" where gameplay picks it up).

### Interruption and suspend

Separate the **seen-flag** (written at start — feeds galleries) from
the **completion-flag + consequences** (written by the single
completion path, which is also the skip path). On suspend:
checkpoint-before-cutscene + replay, or save the position. Pause
must suspend director, video player, and audio bus in the same frame
(Unity's documented VideoPlayer pause-audio-runs-on bug is the
counterexample), with explicit resync on resume.

## Skip and replay

- **The golden rule: skipping = reaching the final state.** All
  timeline events still fire (retroactive markers), actors land at
  end positions, rewards grant once (idempotent). Two strategies:
  silent fast-forward (evaluate without rendering — handles
  animation-driven displacement) or jump-to-end (every clip knows
  its final state). The QA invariant: **state-after-skip ≡
  state-after-watch** — any divergence is a bug.
- **Skip policy is per-scene data** (BotW's `SkipPolicy`), with the
  confirm pattern (X then +) or hold-to-skip (RDR2 switched to hold
  specifically against accidental skips — duration unpublished).
  Skip-after-first-view needs the seen-flag decision: per-save or
  per-player.
- **Replay galleries** hit the **context problem**: a scene authored
  against world-state T replays out of context (wrong outfits, dead
  actors, spoilers). Two strategies: snapshot the relevant context
  with the seen-flag, or canonical re-staging (all-spawnable scenes
  replay in any level — the documented UE benefit). The shipped
  history: Genshin ran *years* without a gallery (Travel Log text
  only) until **Recollection (6.3, 2026)** — replay with pause/
  scrub/skip; its realtime-context mechanism is undocumented
  (flagged). BotW replays Memories from the Adventure Log but not
  other cutscenes.

## The production pipeline

1. **Blocking/previz in-engine**: gray-box proxies + rough cameras
   lock timing and composition *before* the mocap shoot — the same
   scene file flows to final (the engine is the sequence DCC;
   Maya remains for animation polish).
2. **Mocap shoot**: shot list + previz first; Naughty Dog captures
   whole scenes in one take (the volume sees everything; cutting is
   a post decision — cameras created in Maya afterwards).
   Throughput: 15–25 s moves, 2–4 takes, 15–25 files/day;
   $1.5–5k/day studio (full performance capture $5–10k); a 2-day
   session ≈ 50–80 game-ready clips ≈ $15–40k; booking to delivery
   6–14 weeks.
3. **Cleanup/retarget**: 2–8 h cleanup per capture hour (extreme:
   1 mocap day = 2–4 months of perfect-polish for one animator);
   retarget to the production skeleton (IK Retargeter / HumanIK).
4. **Polish layers**: hands/fingers, solve fixes, cloth; facial/lip
   sync produced and timed by the `dialogue-system` pipeline — the
   cinematic hosts the result.
5. **Dailies**: daily animation reviews + weekly director 1:1s (the
   TLOU cadence: ~30 animators at peak for 90 min of cutscenes +
   2 h IGC, front-loading safe scenes while accepting ~30% change).
   The realistic quota: **~15 s of finished cinematic per animator
   per week, facial included** (Naughty Dog, realistic style) —
   ≈ 1 min/month (derived, present as such).

- **Camera grammar**: motivation over movement ("never an
  unmotivated move" — GoW GDC), the 180° rule (`camera-system`),
  film ASL ~2.5 s as the analogy reference (no game-specific GDC
  figure — flagged); the one-shot trade-offs: heavy previz, no
  shot/reverse-shot vocabulary, gameplay-camera landing constraints.
- **Binary discipline**: `.uasset`/`.umap` are unmergeable
  (Epic-confirmed, no merge tool planned) — exclusive checkout
  (Perforce `binary+l`, Epic's own Fortnite workflow) + structural
  splitting: master sequence + per-department sub-sequences
  (layout/anim/camera/lighting) to shrink the contention surface.
  Unity text serialization barely helps dense timelines — the split
  is the real fix.
- **Localization re-timing** (the FF7R official account): non-lip-
  synced languages must fit the source language's durations and
  pauses (FR/DE retimed to Japanese; one JP line with two pauses
  becomes three short FR sentences). Dub within ±0.2 s of source.
  Consequences: subtitle tracks and audio-keyed markers are
  **per-language data**, never global; communicate timing windows
  to localization early.

## Flagged gaps — do NOT invent

The exact Genshin general-skip version (sources conflict — describe
as "partial, late, progressive") · Recollection's realtime-context
mechanism · letterbox/hold-to-skip durations in shipped games (only
one engine default exists: 0.25 s letterbox in Panda3D) · input
flush timings · preload distances before cutscene triggers ·
game-specific average shot length · timeline length/track-count
budgets · the pre-rendered/realtime ratio as a number · suspend/
crash seen-flag timing in shipped games (inference from BotW's
auto_save) · TotK datamine (zeldamods covers BotW — cite BotW only).

## Sources

zeldamods (Demo, bdemo, BFEVFL/TLIN, EventInfo, Event pack,
Content/Movie, Executable/EventPatroller) · GI-cutscenes + charlotte
(USM datamine: VP9/HCA/SRT structure, sizes) · Unity docs
(PlayableDirector, Signals, Timeline changelog, VideoPlayer
limitations, Sequences deprecation, StreamingController) · Epic docs
(Sequencer, spawnables/possessables, Dynamic Binding 5.4 /
Replaceable 5.5, Electra, Bink announcement, Cinematic Prestreaming,
Layered Control Rigs, Take Recorder) · CRI Sofdec2 manual + blog
(alpha movies) · RAD/Bink official specs · GDC: Uncharted 4
interactive cinematics (Naughty Dog 2017), GoW cinematography (Arazi
2019), Horizon Forbidden West cinematics (Guerrilla 2023 — 22 h),
FFXIII realtime cutscenes (2010) · Game Anim (TLOU Cinematic
Journey, UC2 Hennig interview, Lost Odyssey) · Square Enix official
(FF7R localization) · Perforce/Epic (binary versioning) · MoCap
Online/EdVEC/Bohemia (mocap economics) · Cutting/Salt (film ASL).
