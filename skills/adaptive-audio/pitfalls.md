# Pitfalls — the 14 classic game-audio failure modes

Each: symptom → root cause → prevention. Read before designing;
re-read when combat music cuts mid-beat or the dialogue gets stolen
by footsteps.

## 1. The unquantized transition

- **Symptom** — combat music slams in mid-beat; the cut feels broken
  rather than dramatic.
- **Root cause** — the transition fires on the raw gameplay event
  instead of a musical boundary.
- **Prevention** — quantize to the matrix rule for that state pair
  (next beat/bar/cue — UE: `PlayQuantized`; Unity: computed dspTime
  boundary); accept the wait-window trade-off (≤500 ms at 120 BPM
  next-beat) — the standard compromise: an immediate stinger covers
  the wait, the full transition lands on the bar.

## 2. Layer drift

- **Symptom** — vertical stems slowly desync over long loops; the
  mix turns to mud minutes in.
- **Root cause** — frame-based starts (`Play()` in the same frame ≠
  the same sample), unequal stem lengths, streams starting with
  different latencies.
- **Prevention** — sample-accurate starts (same dspTime via
  PlayScheduled; Wave Players inside one MetaSound source); all
  stems exactly equal length; a shared playback position to join a
  layer mid-flight; compute durations from `samples/frequency`,
  never float `length`.

## 3. Ducking pumping

- **Symptom** — the music audibly "pumps" on every VO line.
- **Root cause** — over-aggressive sidechain (low threshold + high
  ratio + mistimed release).
- **Prevention** — duck to a target (-6 to -12 dB), never mute; fast
  attack (~10–50 ms), moderate release (~300–1500 ms) tuned by ear;
  a hold time against inter-phrase flutter; natural ratios (2:1 to
  4:1).

## 4. The 100-footsteps problem

- **Symptom** — crowds/combat spam identical sounds; cumulative
  volume spikes plus audible phasing/comb filtering (flanging) from
  identical samples a few ms apart.
- **Root cause** — no concurrency limits.
- **Prevention** — per-category caps (native Sound Concurrency in
  UE; pooled in Unity), retrigger windows (~60 ms minimum),
  round-robin variations, pitch randomization (±0.5 semitone kills
  phasing), bus-level limiting as the backstop.

## 5. Virtualization kills loops

- **Symptom** — looping ambiences virtualized and never coming back,
  or restarting from zero with an audible pop (the engine-start
  intro replaying).
- **Root cause** — a virtualization mode mismatched to the content
  (Restart on a loop with an intro; the UE-125054 Won't Fix
  focus-volume bug).
- **Prevention** — loop-aware policies per category: play-when-
  silent / resume-from-elapsed for critical beds (cost: permanent
  logical rendering), intro/loop split into separate assets, and
  systematic out-of-range round-trip testing. The default:
  **kill if finite, else virtual**.

## 6. Snapshot fights

- **Symptom** — pause vs combat vs underwater: the mix jumps to
  whoever spoke last.
- **Root cause** — multiple systems call `TransitionTo`/mix-state
  APIs with no arbitration.
- **Prevention** — one MixDirector owning the mixer; mix states in
  a priority stack (the camera/weather pattern); Unity's extra trap:
  script-set exposed parameters escape snapshot control until
  `ClearFloat`.

## 7. The silent priority budget

- **Symptom** — a crucial dialogue line inaudible because footsteps
  stole its voice.
- **Root cause** — no priority discipline; voices stolen by
  audibility once past the channel cap.
- **Prevention** — a category priority grid (VO > music > gameplay
  SFX > ambience) with per-category reserves; continuous voice-count
  monitoring (`au.Debug.Sounds` sorted by priority; the Unity
  profiler + the hand-built HUD).

## 8. The third-person listener mismatch

- **Symptom** — attenuation feels wrong; sounds behind the camera
  are audible; occlusion evaluated from the camera.
- **Root cause** — the listener defaults to the camera while the
  avatar stands 3–6 m away.
- **Prevention** — the standard pattern (Epic-documented):
  **position on the character, orientation on the camera** — which
  also fixes the occlusion origin (UE evaluates occlusion from the
  listener).

## 9. Occlusion raycast spikes

- **Symptom** — CPU hitches when many emitters are active.
- **Root cause** — a raycast per voice per frame.
- **Prevention** — 10–30 Hz cadence (never per frame), time-slicing
  (~4 rays/frame budget), distance-gating (no checks beyond max
  audible range), async traces for distant sources, cached results
  with timeouts.

## 10. The streaming hitch on music transitions

- **Symptom** — a gap or late entry when the next track starts.
- **Root cause** — the stream is neither open nor primed at play
  time.
- **Prevention** — Unity: schedule ~1 s ahead (the documented
  worst-case stream-open delay); UE: Prime On Load on probable
  transition candidates, Retain for critical first chunks, size the
  stream cache (the default is small); the music state machine
  preloads its *next candidates*.

## 11. Loudness non-compliance

- **Symptom** — the game is much louder/quieter than everything else
  on the platform; the mix gets crushed by limiters.
- **Root cause** — no loudness target; mastering by vibe at 2 AM.
- **Prevention** — target ASWG-R001 (-24 LKFS ±2 console / -18
  portable, -1 dBTP) measured on ≥30 min of representative gameplay,
  regularly through production; a master limiter as a safety net,
  never a crutch. (ASWG is a recommendation — frame as platform
  consistency, not cert.)

## 12. The mobile mix disaster

- **Symptom** — a mix that's gorgeous on monitors and inaudible on a
  phone speaker (bass-dependent elements vanish, dynamics too wide,
  4–5 kHz fatigue).
- **Root cause** — phone speakers cut below ~200–800 Hz and are
  near-mono.
- **Prevention** — a dedicated mobile check pass (reference EQ with
  HPF at 200/400/800 Hz, mono fold-down check), harmonics/saturation
  on bass instead of fundamentals, tightened dynamics, and an
  exposed dynamic-range option (the ND threshold presets:
  -4/-8/-10/-16 dB, LFE cut at Midnight).

## 13. The decompressed-audio memory blowout

- **Symptom** — hundreds of MB of audio resident in RAM.
- **Root cause** — everything imported Decompress On Load (Vorbis
  decompressed ≈ ×10 its compressed size — official Unity figure).
- **Prevention** — a compression policy per category: long
  music/beds = streamed, medium SFX = compressed in memory, only
  small frequent sounds decompressed; VO compressed + on-demand per
  scene (`dialogue-system`); UE: stream caching with targeted
  Prime/Retain + `audiomemreport` audits.

## 14. Missing audio debug tooling

- **Symptom** — invisible, unreproducible audio bugs ("a sound is
  missing" with no trace).
- **Root cause** — no voice-count overlay, bus meters, or music/mix
  state display.
- **Prevention** — the debug HUD as a day-one requirement: voices
  per category, active mix state and stack, music state +
  transition log, occlusion factor per source. UE gives most of it
  free (`au.Debug.Sounds`, `au.3dVisualize`, `stat audio`,
  `au.Debug.SoundModulation`); Unity only has the profiler module —
  build the overlay.

## Debugging order

When audio misbehaves: (1) open the debug HUD and read voice counts
per category (#7, #14), (2) trigger every music transition pair back
to back (#1, #10), (3) let layered music run 10 minutes and check
alignment (#2), (4) spam VO lines over music (#3), (5) spawn 50
identical emitters (#4), (6) walk out of range of every looping bed
and back (#5), (7) stack pause + combat + underwater (#6), (8) play
on a phone speaker (#12), (9) run the loudness measurement (#11).

## Ship checklist

```
- [ ] Every transition pair quantized per the matrix; no raw-event
      music cuts
- [ ] Layered stems equal-length, sample-accurate-started; 10-min
      alignment soak green
- [ ] Ducking matrix tuned: no pumping, never mute
- [ ] Concurrency caps + retrigger windows + variation on every
      spammable category
- [ ] Loop-aware virtualization policies per category; range
      round-trips tested
- [ ] One MixDirector; mix-state stack; no direct TransitionTo
- [ ] Priority grid with VO reserves; steal tests pass
- [ ] Listener: position character / orientation camera
- [ ] Occlusion time-sliced and distance-gated; profiled
- [ ] Music next-candidates preloaded; no transition hitches
- [ ] Loudness measured on 30-min captures: -24 LKFS ±2 / -1 dBTP
- [ ] Mobile speaker pass + dynamic range option shipped
- [ ] Compression policy per category audited; memory report clean
- [ ] The audio debug HUD shipped (dev builds)
```
