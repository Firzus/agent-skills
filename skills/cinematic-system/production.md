# Production — realtime vs video, codecs, the pipeline, versioning

The content side: the realtime-vs-pre-rendered decision, codecs and
middleware, the realtime↔video seam, the mocap-to-final production
pipeline, and binary versioning. All numbers are **starting points**;
flagged gaps at the bottom. The timeline engineering is in
[timeline-transitions.md](./timeline-transitions.md); the cinematography/
mocap/virtual-production *tech* in [cinematography.md](./cinematography.md).

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

Industry default: realtime first, pre-render the few shots beyond budget
(Genshin: ~2–10 USM per version; Naughty Dog went full realtime from
Uncharted 4; FF XVI ships *hybrid shots* — realtime characters composited
with pre-rendered crowds/magic, decided per shot at storyboard). The
player-state-mismatch problem (the "wrong weapon in the cutscene" bug) is
the design cost of pre-render — see [interactive.md](./interactive.md).

### Codecs and middleware

The duopoly: **CRI Sofdec/USM** (Japan/China standard — Genshin; multi-
language audio + switchable subtitles in one container, alpha movies for
seamless transitions, default 3 Mbps, VP9 ≈ 2× H.264 compression) and
**Bink** (the western de-facto: 15,000+ games, free in UE since Epic
bought RAD; 1080p ≈ 1.2 MB/s, 4K decode 2.3 ms/frame on PS4-class with GPU
assist). Royalty-free VP9/WebM is the no-middleware choice (BotW Switch;
the video stream inside Genshin's USM); H.264/HEVC carry license
considerations and per-platform OS decode dependencies.

**Subtitles are overlays, never baked** — three convergent shipped proofs:
Genshin (SRT in gamedata, 15 languages), BotW (`ui_texts` synchronized over
mute videos, plus rumble tracks), CRI (switchable subtitles in-container).
Audio: per-language tracks in the container (USM ×4) or a separate stream
(BotW's `.bfstm`).

### The realtime↔video seam

Match the last realtime frame to the first video frame: same assets, camera
pose, and grading — render the video *from the engine* (MRQ/Recorder — see
[cinematography.md](./cinematography.md)) with the gameplay grading; freeze
auto-exposure/LUT a few frames before the cut; route video audio through
the game's bus; or mask with a fade/flash. Failure modes: lighting/grain
mismatch, player state visible in the wrong outfit, a load hitch at the
switch. (Craft knowledge — few public post-mortems; flagged.) The Movie
Render Queue warm-up discipline (build TAA/Lumen history before the first
frame) is the technical key — [cinematography.md](./cinematography.md).

## The production pipeline

1. **Blocking/previz in-engine**: gray-box proxies + rough cameras lock
   timing and composition *before* the mocap shoot — the same scene file
   flows to final (the engine is the sequence DCC; Maya remains for
   animation polish).
2. **Mocap shoot**: shot list + previz first; Naughty Dog captures whole
   scenes in one take (the volume sees everything; cutting is a post
   decision — cameras created in Maya afterwards). Throughput: 15–25 s
   moves, 2–4 takes, 15–25 files/day; $1.5–5k/day studio (full performance
   capture $5–10k); a 2-day session ≈ 50–80 game-ready clips ≈ $15–40k;
   booking to delivery 6–14 weeks. (Capture-tech detail — optical vs
   inertial, facial, retargeting — in [cinematography.md](./cinematography.md).)
3. **Cleanup/retarget**: 2–8 h cleanup per capture hour (extreme: 1 mocap
   day = 2–4 months of perfect polish for one animator); retarget to the
   production skeleton (IK Retargeter / HumanIK).
4. **Polish layers**: hands/fingers, solve fixes, cloth; facial/lip sync
   produced and timed by the `dialogue-system` pipeline — the cinematic
   hosts the result.
5. **Dailies**: daily animation reviews + weekly director 1:1s (the TLOU
   cadence: ~30 animators at peak for 90 min of cutscenes + 2 h IGC,
   front-loading safe scenes while accepting ~30% change). The realistic
   quota: **~15 s of finished cinematic per animator per week, facial
   included** (Naughty Dog, realistic style) — ≈ 1 min/month (derived).

- **Camera grammar**: motivation over movement ("never an unmotivated
  move" — GoW GDC), the 180° rule, film ASL ~2.5 s as the analogy reference
  (no game-specific GDC figure — flagged). Full shot grammar in
  [cinematography.md](./cinematography.md).
- **Binary discipline**: `.uasset`/`.umap` are unmergeable (Epic-confirmed,
  no merge tool planned) — exclusive checkout (Perforce `binary+l`, Epic's
  own Fortnite workflow) + structural splitting: master sequence +
  per-department sub-sequences (layout/anim/camera/lighting) to shrink the
  contention surface. Unity text serialization barely helps dense
  timelines — the split is the real fix.
- **Localization re-timing** (the FF7R official account): non-lip-synced
  languages must fit the source language's durations and pauses (FR/DE
  retimed to Japanese; one JP line with two pauses becomes three short FR
  sentences). Dub within ±0.2 s of source. Consequences: subtitle tracks
  and audio-keyed markers are **per-language data**, never global;
  communicate timing windows to localization early.

## Engine mapping (production)

| Block | Unity 6 | UE5 (5.4+) |
| --- | --- | --- |
| Video | VideoPlayer (H.264; documented audio desync on Android/Windows/WebGL) → CRIWARE (USM, multi-language, alpha movies) or AVPro | Media Framework/Electra (OS codecs only) or **Bink — bundled free** (.bk2, light CPU decode) |
| Pre-render path | Recorder (supported post-6.1) | MRQ (stable through 5.6) → Movie Render Graph (matured ~5.8) |
| Anim polish | Animation tracks + override layers | 5.4 Layered Control Rigs (non-destructive over clips); Take Recorder for mocap/previz |
| Versioning | text serialization barely helps timelines — split + ownership | `.uasset` unmergeable — Perforce `binary+l` exclusive checkout + sub-sequence split |

## Numbers (sourced anchors)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Video specs | Genshin USM: VP9 1080p30 ~10 Mbps, 20–300 MB/video, ~42 GB archive, 4 audio + 15 subtitle languages, Boy/Girl variants; BotW: VP9 1080p30 Switch / AVC 720p30 Wii U, mute + separate audio | datamine |
| Middleware | Bink 2: 1080p ≈ 1.2 MB/s, 4K decode 2.3 ms/frame (PS4-class GPU); Sofdec2 default 3 Mbps, VP9 ≈ 2× H.264 | official |
| Content scale | BotW 18 Memories (~31 min; total ~1 h 48); TotK 12 Dragon's Tears (~37 min); TLOU: 90 min cutscenes + 2 h IGC | wiki/GDC |
| Production | ~15 s finished cinematic/week/animator incl. facial (Naughty Dog) ≈ 1 min/month; ~30 animators at TLOU peak; Horizon FW: 22 h of cinematics | first-hand |
| Mocap | $1.5–5k/day studio, 2-day session ≈ $15–40k for 50–80 clips; cleanup 2–8× capture time; end-to-end 6–14 weeks | industry |
| Localization | dub within ±0.2 s of source; FF7R FR/DE retimed to Japanese pauses — per-language timing | official |

## Flagged gaps — do NOT invent

The exact Genshin general-skip version (sources conflict — "partial, late,
progressive") · Recollection's realtime-context mechanism · letterbox/
hold-to-skip durations in shipped games (only one engine default: 0.25 s in
Panda3D) · input flush timings · preload distances before triggers ·
game-specific average shot length · timeline length/track-count budgets ·
the pre-rendered/realtime ratio as a number · suspend/crash seen-flag
timing (inference from BotW's auto_save) · realtime-relight lighting-
continuity numbers · TotK datamine (zeldamods covers BotW — cite BotW
only).

## Sources

GI-cutscenes + charlotte (USM datamine) · CRI Sofdec2 manual + blog (alpha
movies) · RAD/Bink official specs · GDC: Uncharted 4 interactive cinematics
(ND 2017), GoW cinematography (Arazi 2019), Horizon Forbidden West
cinematics (Guerrilla 2023), FFXIII realtime cutscenes (2010) · Game Anim
(TLOU Cinematic Journey, Lost Odyssey) · Square Enix (FF7R localization) ·
Perforce/Epic (binary versioning) · MoCap Online/Bohemia (mocap economics)
· Cutting/Salt (film ASL). Timeline sources in
[timeline-transitions.md](./timeline-transitions.md); craft sources in
[cinematography.md](./cinematography.md).
