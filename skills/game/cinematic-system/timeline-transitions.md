# Timeline & transitions — the model, bindings, the session, skip/replay

The runtime engineering of a cutscene system: the timeline model, binding
resolution, the transition contract, and skip/replay. All numbers are
**starting points — tune by playtest**. Realtime-vs-video and the
production pipeline are in [production.md](./production.md); the
cinematography craft in [cinematography.md](./cinematography.md);
interactive/branching design in [interactive.md](./interactive.md).
Primary sources: zeldamods (the BotW Demo/bdemo/BFEVFL datamine — the most
complete public window into a shipped cutscene system), the Genshin USM
datamines, official Unity/Epic/CRI docs, the GDC production canon.

## The timeline model

### Three independent implementations, one schema

- **Unity**: `TimelineAsset` holding typed tracks (Animation, Audio,
  Activation, Control, Signal) of clips; the `PlayableDirector` compiles a
  graph at Play, owns the clock and the bindings. Multiple directors can
  play the same asset with different bindings — reusability by design.
- **UE**: `LevelSequence`/`UMovieScene` — object bindings carrying tracks,
  tracks carrying sections (clips with ranges and blending); Shot track +
  sub-sequences for composition.
- **Nintendo (BFEVFL "TLIN", datamined)**: duration, actors, actions,
  clips, oneshots, triggers (2 per clip), subtimelines, cuts — the same
  schema, shipped on a console.

The generic model: `CutsceneAsset { tracks: [typed], track: { bindingRole,
clips: [{start, duration, blendIn/Out, payload}] }, markers }` + a runtime
**Director** resolving bindings and owning the clock. Concept map: Shot/
Subsequence ↔ Control Track · Camera Cut ↔ Cinemachine Track · Event Track
↔ Signal Track · Level Visibility ↔ Activation Track.

### Bindings: the canonical decision

Per role, choose: **possess** an existing world actor (the scene interacts
with world state) or **spawn** a temporary scene actor (self-contained,
replayable anywhere). UE names these possessable/spawnable; 5.5
reimplements spawnables as possessables with custom bindings — proof the
industry converges on "binding = pluggable resolution strategy". Resolve by
**role table** at launch (never by serialized scene identity — pitfall #3);
UE 5.4+ Dynamic Binding resolves by function (e.g. "player pawn"); Unity
rebinds via `SetGenericBinding`/`SetReferenceValue` before Play.

### Event markers

Gameplay consequences fire **only** through event tracks: Unity's Signal
triple (Asset/Emitter/Receiver, with the **Retroactive** flag — fire even
when playback starts past the marker: the native skip support) or UE's
Event Track into the Director Blueprint. The `quest-system` contract:
give-item/set-flag/advance fire the *same events as gameplay* — the
cutscene is a trigger source, never a second source of truth.

## Transitions: the bdemo contract

BotW's datamined `.bdemo` descriptor is a shipped checklist — every entry
maps to a real field:

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

The **vignette spectrum** uses the same machinery end to end: camera-only
takeover → walk-and-talk → letterboxed in-world (Genshin) → full cutscene
→ video. BotW runs a 2-second chest-get and a boss cinematic through one
system; Naughty Dog's interactive cinematics blend gameplay into
full-quality scenes from variable start positions; GoW 2018 is the extreme
(~100 uncut shots, zero cuts — the design craft is in
[interactive.md](./interactive.md) and the camera craft in
[cinematography.md](./cinematography.md)).

### Interruption and suspend

Separate the **seen-flag** (written at start — feeds galleries) from the
**completion-flag + consequences** (written by the single completion path,
which is also the skip path). On suspend: checkpoint-before-cutscene +
replay, or save the position. Pause must suspend director, video player,
and audio bus in the same frame (Unity's documented VideoPlayer
pause-audio-runs-on bug is the counterexample), with explicit resync on
resume.

## The session scope

```
enter: input lock, state capture, preload gate, world staging,
       HUD hide, letterbox
exit:  restore-or-scene-defined position, camera handoff,
       buffered-input flush — on EVERY path (end, skip, error)
```

The same finally-scope as `dialogue-system`: whatever happens (end, skip,
crash), the exit contract runs. This is the discipline behind the
session-leak and interruption-hole pitfalls.

## Skip and replay

- **The golden rule: skipping = reaching the final state.** All timeline
  events still fire (retroactive markers), actors land at end positions,
  rewards grant once (idempotent). Two strategies: silent fast-forward
  (evaluate without rendering — handles animation-driven displacement) or
  jump-to-end (every clip knows its final state). The QA invariant:
  **state-after-skip ≡ state-after-watch** — any divergence is a bug.
- **Skip policy is per-scene data** (BotW's `SkipPolicy`), with the confirm
  pattern (X then +) or hold-to-skip (RDR2 switched to hold against
  accidental skips — duration unpublished). Skip-after-first-view needs the
  seen-flag decision: per-save or per-player. The skip/pause/QTE *player
  experience* and accessibility are in [interactive.md](./interactive.md).
- **Replay galleries** hit the **context problem**: a scene authored
  against world-state T replays out of context (wrong outfits, dead actors,
  spoilers — the player-state problem in [interactive.md](./interactive.md)).
  Two strategies: snapshot the relevant context with the seen-flag, or
  canonical re-staging (all-spawnable scenes replay in any level). Genshin
  ran *years* without a gallery until Recollection (6.3, 2026); BotW
  replays Memories from the Adventure Log but not other cutscenes.

## Engine mapping (timeline)

| Block | Unity 6 | UE5 (5.4+) |
| --- | --- | --- |
| Timeline | Timeline package (mature; **Sequences package DEPRECATED since 6.1**) | Sequencer: LevelSequence/MovieScene, tracks→sections→channels; Shot track + sub-sequences |
| Events | Signal Asset/Emitter/Receiver (+ **Retroactive** = skip support; last-frame signals may not fire) | Event Track → Director Blueprint endpoints |
| Bindings | Generic bindings + ExposedReference; Stop→rebind→Play is the reliable hot-rebind | Possessable vs spawnable; **5.4 Dynamic Binding**, 5.5 Replaceable; `MovieSceneBindingOverrides` |
| Camera | CinemachineTrack overrides the Brain priority; control returns to the Brain at end | Camera Cut track + CineCamera; the camera-system restore |
| Streaming | `StreamingController.SetPreloading` + forced mips | **Cinematic Prestreaming** plugin (records mip requests, replays with pre-roll) |

## Sources

zeldamods (Demo, bdemo, BFEVFL/TLIN, EventInfo, Content/Movie) ·
GI-cutscenes + charlotte (USM datamine) · Unity docs (PlayableDirector,
Signals, Timeline changelog, VideoPlayer limitations, Sequences
deprecation, StreamingController) · Epic docs (Sequencer, possessables/
spawnables, Dynamic Binding 5.4 / Replaceable 5.5, Cinematic
Prestreaming). Production sources in [production.md](./production.md).
