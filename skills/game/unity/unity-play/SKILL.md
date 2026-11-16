---
name: unity-play
description: >-
  Use when an agent must play a Unity game by itself in the Editor: reach a
  goal or finish a level, reproduce a gameplay bug by playing, smoke-test a
  scene with real input, or compare which model plays fastest. Not for
  automated PlayMode test suites or Editor automation without play, which
  belong to unity-cli, nor for writing the gameplay code itself.
---

# Unity play: an agent plays the game

Apply [`unity-core`](../unity-core/SKILL.md), and load
[`unity-cli`](../unity-cli/SKILL.md) with this skill: its readiness checks,
command discovery, and rules on whose Editor it is apply here.

## Principles

- **Play in the Editor, in Play Mode.** The Unity CLI reaches the live game
  there: `unity command eval` reads any object and injects input without the
  window having focus. A standalone build offers none of this without a
  development Player and the runtime Pipeline, which this skill does not cover.
- **Turn-based, paused between turns.** A model needs seconds to decide, a game
  frame lasts milliseconds. The driver pauses the game after each turn, so
  thinking time costs no game time and a slow model loses only wall-clock time.
- **Real input through the Input System.** The driver queues keyboard and mouse
  state events, which reach the game's own input actions. OS-level keystrokes
  need the Game view in the foreground and collide with the user's typing. By
  default the Input System sends the keyboard to the game only while the Game
  view has focus, and stops a device when the Editor loses OS focus. For the
  session, the driver therefore swaps in an in-memory copy of the input
  settings that sends all input to the game regardless of focus. Nothing is
  saved to the project, and the original settings come back at `finish` or
  when Play Mode exits. Meanwhile the user's own keystrokes in the Editor also
  reach the game. The legacy Input Manager accepts no injected input: for such
  a game, call its gameplay methods through `eval` and report that input itself
  went untested.
- **Read state as text, not pixels.** A compact JSON observation costs a
  fraction of a screenshot in tokens and latency. Capture the Game view only
  for a question the state cannot answer, such as whether something is drawn.
- **Skills before keys.** Every decision costs seconds, so the model names a
  goal (`goto key`, `attack skeletonA`) and the driver steers with real
  keyboard and mouse input until an event ends it: arrived, blocked, took
  damage, target defeated. A game needs a small adapter for this; raw controls
  stay available for what no skill covers.
- **One HTTP call per turn.** `scripts/turn.py` sends the input, waits, pauses,
  and returns the observation in one call to the Editor's local Pipeline
  server, using the token in `Library/Pipeline/.unity-pipeline-port`: about
  0.16 s, against 0.9 s of process start for each `unity command`. Unity
  documents this connection but names only its own CLI as a client, so
  `turn.py` falls back to `unity command eval` when the server refuses.
- **A fast model plays, the session's model prepares.** Preparing needs
  judgment (whose Editor, which observation); playing needs many quick
  decisions. The [play model](#play-model) is the fastest configuration that
  won every run of [benchmark.md](./benchmark.md).

## 1. Prepare

1. Settle which Editor to play in, as [unity-cli](../unity-cli/SKILL.md#choose-who-the-editor-is-for)
   describes. Entering Play Mode in the user's Editor needs their agreement:
   it interrupts what they are doing there.
2. Check the prerequisites:
   - `com.unity.pipeline` installed and the readiness `eval` passing;
   - Input System active: `activeInputHandler` is `1` or `2` in
     `ProjectSettings/ProjectSettings.asset`;
   - Python 3 on PATH, for `scripts/turn.py`.
3. Agree on the goal and a stop condition: what counts as success, and a turn
   budget after which the agent stops and reports.
4. Choose the observation, a C# expression evaluated after every turn:
   - a method the game already exposes for this, when one exists;
   - otherwise an expression that reads only what the goal needs, for example
     `UnityEngine.JsonUtility.ToJson(UnityEngine.Object.FindFirstObjectByType<MyGame.Player>())`.
   Keep it under about 1 KB, with positions rounded and the units and rules
   the model needs to decide. A string starting with `{` or `[` is passed
   through as JSON; any other value is returned as a JSON string.
5. Read the game's bindings (input actions asset or input code) to learn which
   keys do what. Input System key names: `W`, `Space`, `LeftArrow`, `Enter`.
6. Write the skill adapter, a C# file of assignments run inside the driver
   ([example](./benchmark/ruins_adapter.cs)):

   | Assign | Purpose |
   | --- | --- |
   | `playerPosition`, `playerYaw` (degrees) | required: where the player is and faces |
   | `locate(id)` | required: a target's position, `null` once it is gone; use the observation's ids |
   | `pathTo(from, to)` | waypoints around walls, for example from `UnityEngine.AI.NavMesh.CalculatePath`; straight line by default |
   | `health`, `hostiles`, `hostileAlert`, `lowHealth` | events: took damage, low health, enemy near |
   | `forwardKey`, `jumpKey`, `attackControl`, `interactKey`, `lookDegreesPerUnit`, ranges | the game's controls; defaults fit WASD, Space, left click, E |

   Skills need a game where the player moves forward and turns with the
   mouse. For other control schemes, play with controls turns.

**Done:** Editor agreed, prerequisites met, goal, budget, observation, key
map, and adapter known.

**Blocked:** the user declines Play Mode in their Editor, or the Pipeline or
Python is missing: report what is missing and stop. A game on the legacy Input
Manager is played through `eval` calls, as the principles describe.

## 2. Start a session

```bash
unity command editor.playmode start --project-path <project>
unity command editor status --project-path <project>   # playerLoopTicking: true
python <skill>/scripts/turn.py install --project <project> --observe "<expression>" --adapter <adapter>.cs
```

`editor.playmode start` turns Run In Background on until Play Mode exits, so
the game keeps running while the Editor is unfocused. `install` pauses the
game, sets a fixed frame time (`--fps 60` by default, so each frame advances
the same game time; `--fps 0` keeps the game's own), and prints the first
observation. Install again after each Play Mode start: the driver ends with
Play Mode, and a new install replaces any earlier one.

When the user wants to watch the session, add `--record <folder>` to
`install`, with a folder outside the project and a fixed frame rate (not
`--fps 0`), and add `--log <file>` to the turn command given to the play model.
Every played frame of the main camera is then saved there, at about 17 ms per
frame, and [step 4](#4-finish) turns the frames into a video. Overlay UI drawn on the
screen rather than by a camera is not in these frames.

## 3. Play

### Play model

| Setting | Value |
| --- | --- |
| Model | GPT-6.1 Terra (`gpt-6.1-terra`) |
| `reasoningEffort` | `low` |
| `serviceTier` | `priority` |

This table is the only place that names the play model: when a benchmark
finds a faster configuration that still wins every run, change it here.

Hand this section to a subagent on the play model, with exactly these
settings. Give it the goal, the turn budget, the exact turn command with
`--project`, the key map, and what the observation fields mean. Allow it only
the turn command: no file edit, no other Unity command, no subagent. Ask for
the outcome, turns, and failures in one line. When the host cannot run that
model with these settings, stop and report it rather than play on another
model. To compare
models on a new release, follow [benchmark.md](./benchmark.md).

### Turns

A skill turn, the default:

```bash
python <skill>/scripts/turn.py --project <project> '<skill> <target id>' [max frames]
```

| Skill | Does | Ends with |
| --- | --- | --- |
| `goto` | walks to the target, around walls through the adapter's path | `arrived`, `blocked`, `enemy near` |
| `face` | turns toward the target | `facing` |
| `attack` | closes in, faces, attacks at the game's cooldown | `target defeated`, `low health` |
| `interact` | walks within range, faces, presses interact once | `interacted with` |
| `jump_onto` | walks close, then jumps forward onto the target | `jumped toward` |
| `wait` | waits `max frames` frames | `waited` |

Every skill except `attack` also ends on `took damage`, and any skill on
`target gone`, on `timeout` when it reaches `max frames` (600 by default), or
on `stalled` when no frame advanced for 20 s. The reply is
`{"event": ..., "frames": n, "frame": n, "obs": ...}`. After `blocked` or an
unexpected event, read the observation and choose again, with a controls turn
if needed; after `stalled`, check `editor status` and the Console first.

A controls turn, for what no skill covers:

```bash
python <skill>/scripts/turn.py --project <project> '<controls>' <frames>
```

- `<controls>`: `-` for none, otherwise tokens joined by `+`:
  - key names (`W`, `Space`, `LeftShift`, `E`);
  - `mouse.left` / `mouse.right`;
  - `@x,y`: pointer position in screen pixels from the bottom-left;
  - `~dx,dy`: mouse movement applied on every frame of the turn, which turns a
    mouse-look camera by the same amount each frame.

  Examples: `'W+LeftShift+~5,0' 30`, `'mouse.left+@640,360' 2`. Two keys are
  `W+D`, never `WD`, which names no key and rejects the turn. Quote the
  controls: PowerShell reads `@` and `,` as its own syntax.
- Each turn holds its controls for `<frames>` frames, releases the ones the
  previous turn held and this one omits, then pauses. Name every control on
  every turn: nothing carries over.
- Every turn is a new press. A control the previous turn also held is
  released for the first frame, then pressed again. So `'mouse.left' 31`
  twice in a row attacks twice, and a held movement key loses one frame. Such
  a turn lasts at least 2 frames.
- The reply is `{"frame": n, "obs": ...}`. `"stalled": true` means no frame
  advanced for 20 s: check `editor status` and the Console before continuing.
- Choose `<frames>`: a few near danger or for a precise movement, 30 to 60 to
  travel.

Stop at the goal, at the turn budget, or after several turns without progress.
A C# exception in the observation stops the turn with an error: fix the
expression and run `install` again.

**Done:** goal reached, or budget or stall reached with the last observation.

## 4. Finish

1. Run `turn.py finish --project <project>`: it releases held input and
   restores the project's input settings, leaving the game paused.
2. Stop Play Mode with `unity command editor.playmode stop`, unless the user
   wants to look at the final state: Play Mode changes are discarded on exit.
3. For a recorded session, build the video with FFmpeg:

   ```bash
   python <skill>/scripts/video.py <folder> <out>.mp4 --log <turns>.jsonl --fps <install fps> --title "<label>"
   ```

   `<turns>.jsonl` is the file the turns wrote with `--log <file>`. Each
   turn's skill or controls are burned in at the top, and the observation's
   `hp` (or `player.hp`), `objective`, and `lastEvent` fields, when present,
   at the bottom. The video
   runs in game time: the pauses while the model decided produced no frames.
   Check it before handing it over: decode it end to end
   (`ffmpeg -v error -xerror -i <out>.mp4 -f null -`) and look at frames from
   its start, its key actions, and its end; the `video-report` skill, when
   installed, details that review.
4. Report the outcome, turns, game time, failures (deaths, resets), and
   wall-clock time; name any input that went through `eval` instead of the
   Input System.
