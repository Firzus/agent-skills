# Pitfalls — the 14 classic cutscene failure modes

Each: symptom → root cause → prevention, with real incidents where
documented. Read before designing; re-read when a skip strands the
player or the first shot shows low-res faces.

## 1. The unskippable cutscene

- **Symptom** — player rage, negative reviews, churn on replays and
  alt accounts.
- **Root cause** — "the player must see our content" + a correct
  skip never budgeted (realtime scenes tied to weather/time make it
  genuinely hard — the Genshin excuse).
- **Prevention** — the absolute rule: everything skippable, with the
  all-events-fire guarantee (#2). The cautionary tale: Genshin's
  years of documented demand — partial hangout skip only in 4.5,
  domain reward skip in 5.7, the replay gallery in 6.3. The
  counter-model players cite: FFXIV (everything skippable + an inn
  replay journal).

## 2. Skip leaves broken state

- **Symptom** — after a skip: missing quest flags, ungranted items,
  actors misplaced, progression blocked.
- **Root cause** — jump-to-end implementations that seek the last
  frame without replaying side effects; events between the current
  position and the end never fire.
- **Prevention** — skipping = reaching the final state: silent
  fast-forward or jump-to-end with every event fired (retroactive
  markers are the engine support); idempotent rewards; the QA
  invariant state-after-skip ≡ state-after-watch. Real cases:
  **007 First Light** (skipping the Airfield cinematic at the last
  second loaded Bond out of the world — patched 1.009), **Ship of
  Harkinian** (skipping the blue warp granted the medallion but
  never raised the lake — fixed by setting the flag *inside the
  skip code*).

## 3. Bindings break across contexts

- **Symptom** — the cutscene plays with missing or T-posed actors,
  or animates the wrong object depending on load order.
- **Root cause** — the timeline references scene objects by
  serialized identity: Unity generic bindings live in a scene's
  director (empty elsewhere); a UE possessable points at one level's
  actor GUID.
- **Prevention** — a role→actor resolution table at launch; UE 5.4+
  Dynamic Binding (resolve-by-function: "player pawn") / 5.5
  Replaceable bindings; all-spawnable for scenes replayed across
  levels; Unity: Stop→rebind→Play (hot rebinding is unreliable).

## 4. The streaming hitch at cutscene start

- **Symptom** — a hitch or black frame at trigger; **low-res faces
  in the first shot** (the famous mip pop).
- **Root cause** — assets requested only at trigger time; mip/LOD
  streaming is a feedback loop with multi-frame latency.
- **Prevention** — a preload gate ahead of the play trigger (the
  BotW `WaitLoadActorNames` + per-scene streaming-mode pattern;
  `open-world-streaming`). Engine support: Unity
  `StreamingController.SetPreloading` + forced mips before camera
  cuts; UE's Cinematic Prestreaming plugin (records per-frame mip
  requests, replays with pre-roll).

## 5. The realtime↔video seam

- **Symptom** — a visible pop at the switch (exposure/LUT/grain
  mismatch, aspect/resolution change); an audio click at handoff.
- **Root cause** — the video carries frozen grading that can't match
  the dynamic runtime state (auto-exposure, time-of-day); separate
  audio paths.
- **Prevention** — render the video from the engine with gameplay
  grading; freeze exposure/LUT a few frames before the cut; route
  video audio through the game bus; or mask the seam (fade/flash);
  alpha-channel video (Sofdec Alpha Plus) exists precisely for
  seamless overlay transitions. (Craft knowledge — flagged.)

## 6. Session state leaks

- **Symptom** — after the cutscene: dead or doubled input, missing
  HUD, wrong time scale, a stuck audio snapshot, weird camera
  damping.
- **Root cause** — entering mutates N systems through scattered code
  paths; early exits (skip, interruption, exception) don't pass
  through every restore.
- **Prevention** — the same finally-scope as dialogue sessions: a
  `CutsceneSession` capturing state on entry and guaranteeing
  restore on **every** exit path, with idempotent restores.

## 7. The mid-cutscene interruption hole

- **Symptom** — app suspend/crash during a cutscene: content marked
  seen without being seen (flag written too early) or forced
  rewatch (too late); pausing a video lets the audio run on and
  drift (a documented Unity VideoPlayer bug).
- **Root cause** — one arbitrary write moment for the seen flag and
  rewards; video/timeline/audio clocks not suspended atomically.
- **Prevention** — separate the seen-flag (start, for galleries)
  from the completion-flag + consequences (the single completion
  path, which is also the skip path); checkpoint-before-cutscene on
  suspend; pause director + video + audio bus in the same frame
  with explicit resume resync. The Cyberpunk lesson on long
  suspends: "either you show a T-pose, or you hard crash" — memory
  leaks after multi-hour console suspends were a known trade.

## 8. Frame-rate-dependent timelines

- **Symptom** — physics clips desync, particles drift, events miss a
  frame at 144 fps; 30 fps-authored content breaking at 60+.
- **Root cause** — the timeline evaluated on variable game dt;
  simulated content (physics, particles, ragdolls) diverges from
  baked content.
- **Prevention** — choose and lock the clock source (game / unscaled
  / DSP / manual+fixed-dt for physics-matched content); **bake
  simulations** (Alembic) instead of simulating during playback;
  test every cutscene uncapped and at time scale ≠ 1 (Unity's
  documented audio-scheduled-early bug at timescale ≠ 1).

## 9. Audio drift on long timelines

- **Symptom** — over minutes, voice/music slides against animation.
- **Root cause** — two clocks: audio runs sample-accurate on the DSP
  clock, the timeline frame-based on the game clock; startup scene
  loading offsets audio by seconds.
- **Prevention** — Unity documented: `DirectorUpdateMode.DSPClock`
  for sample-accurate sync (incompatible with time scaling); never
  Play-On-Awake (start after scene init); periodic video↔audio
  resync via frame-ready callbacks.

## 10. The localization re-timing trap

- **Symptom** — German dub cut off; subtitles missing the Japanese
  VO; an event keyed to an English audio moment landing wrong in
  other languages.
- **Root cause** — clip timings, subtitles, and markers baked to ONE
  language's audio durations.
- **Prevention** — per-language subtitle tracks (or per-language
  timeline assets — the documented safe-but-duplicative option);
  dub timing windows communicated early (the FF7R account: FR/DE
  retimed to Japanese pauses; industry constraint: dub within
  ±0.2 s of source); audio-keyed markers re-timed per language.

## 11. Letterbox/aspect bugs

- **Symptom** — 16:9 pillarboxing on 21:9/32:9 (a whole community
  fix industry exists: Psychonauts 2, Immortals of Aveum…); HUD
  widgets visible during scenes; subtitles outside the safe area.
- **Root cause** — letterbox as fixed pixel bars; hide-HUD done
  widget by widget; subtitles anchored to physical edges.
- **Prevention** — letterbox by target ratio (relative crop); an
  explicit ultrawide decision (the praised Guardians of the Galaxy
  animated aspect transition vs full-width); one global HUD-hide
  channel; subtitles inside the *letterboxed* safe area.

## 12. The binary merge disaster

- **Symptom** — two animators edit the same sequence → an
  unmergeable binary conflict; a day of work lost.
- **Root cause** — `.uasset`/`.umap` and dense Unity timelines don't
  merge; Epic confirms no merge tool exists or is planned.
- **Prevention** — exclusive checkout (Perforce `binary+l` — Epic's
  own Fortnite workflow) or one-file-one-owner; and the structural
  fix: master sequence + per-department sub-sequences
  (layout/anim/camera/lighting) to shrink the contention surface.

## 13. Cutscene-applied world changes desync

- **Symptom** — the cutscene shows the bridge collapsing, but the
  gameplay state change is applied elsewhere (or not) — skip,
  interruption, or replay leaves an inconsistent world.
- **Root cause** — two sources of truth: the visual (timeline) and
  the state (quest system) apply "the same" change independently.
- **Prevention** — single source of truth: the cutscene fires the
  **same gameplay events** as normal play (event tracks → quest
  system), and the skip path replays those events (the Ship of
  Harkinian fix — the flag set inside the skip — is this rule).

## 14. The replay-context problem

- **Symptom** — gallery replay with the wrong outfit, absent actors
  (dead in the story), incoherent weather, spoilers.
- **Root cause** — the scene was authored against world-state T; the
  gallery replays it out of context.
- **Prevention** — snapshot the relevant context with the seen-flag
  (outfit, actor variants, choices) or canonical re-staging
  (all-spawnable scenes in a dedicated context). Genshin's
  Recollection (6.3) "preserves cameras, voices, environments" —
  mechanism undocumented; present strategies, not their internals.

## Debugging order

When cutscenes misbehave: (1) skip every scene and diff state
against a full watch (#2, #13), (2) play each scene from a different
level/load order (#3), (3) trigger with a cold streaming cache and
watch the first shot (#4), (4) exit by every abnormal path and check
input/HUD/camera (#6), (5) run a 5-minute scene at uncapped fps and
timescale 0.5 (#8, #9), (6) play the German build (#10), (7) play on
a 32:9 monitor (#11), (8) replay from the gallery at 100% completion
(#14).

## Ship checklist

```
- [ ] Every scene skippable; per-scene policy in data;
      state-after-skip == state-after-watch verified per scene
- [ ] Bindings resolved by role; scenes tested across contexts;
      zero serialized scene-identity references
- [ ] Preload gates on every trigger; first-shot mips verified cold
- [ ] The session scope restores on every exit path
- [ ] Seen-flag and completion-flag separated; suspend tested
- [ ] Clock source locked per scene; sims baked; uncapped-fps pass
- [ ] DSP-clock audio on long scenes; no Play-On-Awake
- [ ] Subtitle/marker timing per language; dub windows communicated
- [ ] Letterbox by ratio; ultrawide decision made; HUD-hide channel
- [ ] Exclusive checkout + sub-sequence ownership in place
- [ ] World changes fire through shared gameplay events only
- [ ] Gallery replays tested against endgame world state
- [ ] Video seams masked or grading-matched; audio on the game bus
```
