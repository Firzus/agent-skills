# Pitfalls — the 14 classic time & weather failure modes

Each: symptom → root cause → prevention. Read before designing; re-read
when the sun jitters after long sessions or a quest leaves it raining
forever.

## 1. Frame-rate-dependent clock / float drift

- **Symptom** — game time drifts over long sessions; scheduled events
  "slide"; the sun jitters after hours of play.
- **Root cause** — accumulating `deltaTime` into a 32-bit float
  (precision degrades to ~1 ms after ~9 h, ~62 ms after a week), or
  worse, advancing per frame instead of per dt.
- **Prevention** — a **double** accumulator or integer ticks; never
  subtract float timestamps; Unity exposes `Time.timeAsDouble`
  precisely for this.

## 2. The midnight wrap

- **Symptom** — NPC schedules break at 00:00; a "22:00→06:00" interval
  never triggers; an event scheduled at 24:00 never fires.
- **Root cause** — naive `start < t < end` comparisons failing when the
  interval spans the wrap; 24:00 vs 00:00 ambiguity.
- **Prevention** — store time as absolute minutes since game epoch
  (monotonic, never wrapped); convert to hour-of-day only at display
  and lookup edges; unit-test every interval helper with the wrap case.

## 3. The time-skip event storm

- **Symptom** — sleeping 10 hours freezes the game for a frame;
  sounds, quests and spawns all fire at once.
- **Root cause** — the scheduler naively replays every intermediate
  event in the same frame.
- **Prevention** — an explicit per-event fast-forward policy (replay /
  coalesce / skip-with-final-state-recompute); tick-based systems
  receive one `OnTimeSkipped(from, to)` instead of N ticks. The BotW
  model: the skip is an instant clock set, with crossed-midnight
  handlers forced to run **exactly once** in catch-up.

## 4. Weather popping

- **Symptom** — lighting snaps, rain appears instantly, the audio bed
  cuts dead.
- **Root cause** — discrete state swap with no transition phase.
- **Prevention** — every channel blends: lighting via volume/profile
  weights, interpolated parameter buses, audio `TransitionToSnapshots`
  crossfades, particle emission ramps. Sequence the channels (cloud
  cover leads the rain — the observable BotW order), don't lerp them
  in lockstep.

## 5. Rain indoors

- **Symptom** — drops fall through roofs; sheltered surfaces get wet;
  rain audio isn't muffled inside.
- **Root cause** — no occlusion; global wetness applies everywhere.
- **Prevention** — a top-down depth occlusion mask (ortho camera → RT,
  world-height comparison — the standard technique on both engines),
  blocker tagging including glass via proxy meshes, interior volumes
  that cut emitters and low-pass the audio snapshot.

## 6. Polling hell

- **Symptom** — diffuse CPU cost; dozens of systems read weather every
  frame and recompute.
- **Root cause** — no publication API; everyone interrogates the
  manager.
- **Prevention** — the service publishes change events
  (`OnWeatherChanged`, `OnDayPhaseChanged`) + cached readable state;
  continuous values (wetness 0–1) ride the global parameter bus
  (shader globals / MPC) written once per frame in one place. BotW's
  shape: signals + shared blackboard flags queried by AI.

## 7. Lighting/GI desync

- **Symptom** — sun at the horizon but noon GI; reflections frozen on
  the old sky; shadows pop when the sun crosses the horizon.
- **Root cause** — static baked GI + moving sun; reflection probes
  never re-rendered; two shadow-casting directional lights active
  during the sun↔moon handoff.
- **Prevention** — Unity: APV Lighting Scenarios with blending (same
  probe positions across bakes; scenarios cover probes ONLY — sync
  sky/fog/reflections manually), time-sliced or on-demand probes on a
  clock cadence. UE: Lumen + Sky Light Real Time Capture; tune Lumen
  update speed if the sun moves fast. Horizon handoff: one
  shadow-casting directional at a time, intensity crossfade around
  dawn/dusk.

## 8. Override stack leaks

- **Symptom** — a quest forces rain and never releases it; two systems
  fight over weather → flicker.
- **Root cause** — an imperative ownerless `SetWeather` API with no
  priority arbitration.
- **Prevention** — overrides as handles (acquire/release, owner,
  priority: ambient < region < quest < debug), auto-release on
  quest/scope end, a safety timeout, and a diagnostic listing live
  handles. Genshin's quest-locked weathers (Seirai's storm until its
  questline) show the arbitration must be explicit and the release
  must be tied to progression state, not to fragile script flow.

## 9. Save/load inconsistency

- **Symptom** — time is saved but weather rerolls → players save-scum
  the weather; blood-moon-style timers reset on reload; buffs
  timestamped in the wrong time base.
- **Root cause** — weather state (current, target, blend progress,
  RNG seed) and scheduler timestamps not serialized, or stored in real
  time instead of game time.
- **Prevention** — serialize the full clock + weather machine + seed +
  pre-rolled schedule; event timestamps in game time; decide
  explicitly what rerolls on reload (default: nothing — the BotW
  model: the 3-day forecast lives in the save).

## 10. Regional border pops

- **Symptom** — crossing a biome border instantly swaps sky/weather;
  oscillation when the player walks along the border.
- **Root cause** — binary regional lookup with no spatial blending or
  hysteresis.
- **Prevention** — spatial blend (volume blend distances / weather
  zones) + border hysteresis: the dissipation zone larger than the
  application zone (observable in Genshin's environmental shifts).

## 11. Multiplayer drift

- **Symptom** — two clients see different weather; clocks diverge.
- **Root cause** — per-client weather RNG; client-advanced clocks.
- **Prevention** — server-authoritative clock and weather transitions;
  replicate (reference timestamp, scale, seed) and let clients derive
  rendering locally. The Genshin split: economy on the
  non-manipulable server clock, ambience on the diegetic clock
  (host-controlled in co-op).

## 12. The performance cliff

- **Symptom** — the most expensive frame in the game is the
  thunderstorm at dusk: dense volumetric clouds + rain particles + wet
  shaders + grazing-angle shadows, all at once.
- **Root cause** — each feature budgeted in isolation, never their
  combined peak; grazing sun angles inflate shadow cascade coverage;
  volumetric clouds are expensive in reflection probes (HDRP disables
  them there by default for a reason).
- **Prevention** — profile and budget **the worst weather state**, not
  the average; per-state quality presets (reduced cloud resolution
  under rain); clamp shadow distance at dawn/dusk.

## 13. Untelegraphed hazards

- **Symptom** — the player dies to a lightning strike or
  environmental cold with no warning; it reads as arbitrary.
- **Root cause** — weather applies gameplay effects without telegraphs
  or exemption rules (cutscenes, menus).
- **Prevention** — telegraph systematically: BotW's metal equipment
  sparks ~10 s before the strike (with counterplay: unequip, or
  weaponize it); Dragonspine's gauge is visible with an alert
  threshold (70 %). Suspend environmental damage during cutscenes and
  dialogues.

## 14. The 4 AM class (daily reset / DST)

- **Symptom** — the daily reset "moves" by an hour twice a year;
  rewards claimable twice or never; support ticket floods.
- **Root cause** — the reset defined in local time, or on a server
  whose DST behavior the client doesn't model; comparisons against
  local `DateTime.Now`.
- **Prevention** — define all resets in UTC (or a fixed documented
  server timezone — Genshin runs fixed no-DST zones, which is why the
  reset "becomes" 5 AM local during US DST); store timestamps in UTC;
  convert only at display.

## The timescale corollary

Skyrim below timescale ~6–8 breaks quests, schedules, and AI — clock
consumers make implicit assumptions about the time scale. Treat
`dayLengthMinutes` as a contract: when it changes, re-test every
schedule, buff duration, and spawn window.

## Debugging order

When time/weather misbehaves: (1) scrub the clock through midnight in
the debug panel (#2), (2) sleep across midnight and diff fired events
(#3), (3) force every weather transition back to back and watch each
channel (#4), (4) stand under a roof in rain (#5), (5) list live
override handles after a weather quest (#8), (6) save/reload mid-storm
and compare (#9), (7) walk a region border in zigzag (#10), (8)
profile the storm-at-dusk frame (#12).

## Ship checklist

```
- [ ] Clock accumulates in double/ticks; 12-hour soak test shows zero
      drift
- [ ] All interval logic passes the midnight-wrap tests
- [ ] Time-skip: crossed events fire exactly once (catch-up policy
      per event)
- [ ] Every weather channel blends; no pops on any transition pair
- [ ] Occlusion mask: dry under every roof; muffled audio indoors
- [ ] Zero raw-clock polling (events + parameter bus audited)
- [ ] GI/reflections/shadows coherent across a full day cycle,
      including both horizon handoffs
- [ ] Override handles: every quest weather releases; diagnostic clean
      after the main quest line
- [ ] Save/reload: weather, blend, and timers restore exactly
- [ ] Region borders: no pop, no oscillation walking the line
- [ ] Worst-state frame (storm at dusk) inside budget on min spec
- [ ] Every environmental hazard telegraphed, with cutscene exemption
- [ ] Resets defined in UTC/fixed-zone; DST transition tested both ways
```
