# Benchmark: which model plays fastest

Read this to compare models on the play loop, for example when a new model or
speed tier appears. Each model plays the same fixture from the same state, and
`turn.py --log` times every turn.

## Fixtures

Two games built entirely from code, each starting only in a scene of its own
name, so both can live in one project:

| Fixture | Scene | Game | Controls |
| --- | --- | --- | --- |
| [`DodgeGame.cs`](./benchmark/DodgeGame.cs) | `DodgeBench` | top-down: cross a wall through its gap between two patrolling hazards | WASD |
| [`RuinsGame.cs`](./benchmark/RuinsGame.cs) | `RuinsBench` | third-person action RPG quest: key on a crate, locked gate, two skeletons, chest | WASD relative to facing, mouse look, LeftShift sprint, Space jump, mouse.left attack, E interact, Q potion |

Each fixture reads its controls through Input System actions. `Observe()`
returns the state, the objective, and the rules as JSON. `Restart()` resets the
clock, the player, and the counters, so every run starts in the same state.
[`ruins_solver.py`](./benchmark/ruins_solver.py) plays RuinsGame by script: it
proves the quest is still winnable after a fixture change, and gives a baseline
with no thinking time (34 turns, 23 s of game time).
[`ruins_adapter.cs`](./benchmark/ruins_adapter.cs) is its skill adapter.

Use a disposable project, never the user's game:

1. Create one with `unity projects create` and `--with-pipeline`, from a
   template that includes the Input System, such as
   `com.unity.template.urp-blank`.
2. Copy the fixtures under its `Assets/`, and copy its sample scene as
   `DodgeBench.unity` and `RuinsBench.unity`.
3. Open the Editor for the session as
   [unity-cli](../unity-cli/iteration.md#open-the-editor-for-the-session)
   describes, wait for the readiness `eval`, and open the scene with
   `unity command scene open --path Assets/Scenes/<scene>.unity`.

## Protocol

Before each run, with `<Game>` being `DodgeGame` or `RuinsGame`:

```bash
unity command editor.playmode stop --project-path <fixture>
unity command editor.playmode start --project-path <fixture>
python scripts/turn.py install --project <fixture> --observe "PlayFixture.<Game>.Instance.Observe()" --fps 50 --record <frames>/<run> [--adapter benchmark/ruins_adapter.cs]
unity command eval --project-path <fixture> --code "PlayFixture.<Game>.Instance.Restart(); return 0;"
```

Then delegate one run to the configuration under test, one run at a time:
runs share the Editor. Give every configuration the same brief, effort, and
turn budget, and alternate their order across runs. The brief points the model
to section 3 of [SKILL.md](./SKILL.md#3-play). It gives the turn command with
`--project <fixture> --log <logs>/<run>.jsonl`, forbids any other command, file
edit, or subagent, and asks for one line back: won or not, turns, deaths.

For a model with a speed tier, test it with and without, every time: the tier
that should be faster is not always the faster one. For Codex models, the
option is `serviceTier`: `priority` (speed) or `default`.

Afterwards:

- `python benchmark/stats.py <logs>` prints one line per run (fields below);
- `python scripts/video.py <frames>/<run> <run>.mp4 --log <logs>/<run>.jsonl --fps 50 --title "<configuration>"`
  films the run in game time, with each turn's controls burned in.

| Field | Meaning |
| --- | --- |
| `wall` | from the first turn to the last, in seconds |
| `think/turn` | mean gap between two turns: decision time plus the agent harness's own overhead |
| `cli` | total time inside `turn.py`: the frames played and, when recording, about 17 ms per frame, plus about 0.16 s per turn over HTTP or 0.9 s through the CLI |
| `errors` | turns rejected, such as a malformed control |

## Results

Unity 7000.0.0a12, Input System 7.0.0, Pipeline 1.0.0, Windows 11, low effort
everywhere. Each model ran in its own agent harness (Claude Code for Haiku,
Codex for the GPT models), and `think/turn` includes that harness.

### RuinsGame (3D RPG), three runs per configuration

| Configuration | Runs won | Wall time, median (range) | Think/turn, median over all turns | Turns | Deaths |
| --- | --- | --- | --- | --- | --- |
| GPT-6.1 Terra, `serviceTier: priority` | 3/3 | 80 s (73 to 87 s) | 2.4 s (53 turns) | 17 to 18 | 0 |
| GPT-6.1 Terra, `serviceTier: default` | 3/3 | 99 s (89 to 110 s) | 4.0 s (51 turns) | 15 to 18 | 0 |
| Terra priority, skills, HTTP | 3/3 | 23 s (23 to 28 s) | 2.1 s (18 turns) | 7 | 0 |
| Terra priority, skills, CLI | 3/3 | 38 s (34 to 43 s) | 2.1 s (21 turns) | 7 to 10 | 0 |

The first two rows played with controls turns through the CLI, before skills
and HTTP existed. The priority tier halved the decision time per turn and
finished every run faster; both played equally well. Every one of those runs
sent one turn the driver rejected, `~ -10,0` with a space or a typographic
minus, which `turn.py` now accepts.

Skills cut the quest from 17 turns to 7, and the decision time per turn did
not grow. HTTP saved about 0.9 s per turn over the CLI. Skill runs took 12 s
of game time, against 23 s for the scripted controls player. With skills, the
frames themselves now take most of the time inside `turn.py`: about 10 s per
run, recording included. The skill rows ran only on the priority tier: the
default tier remains unmeasured with skills.

### DodgeGame (top-down), three runs per configuration

| Configuration | Runs won | Wall time, median (range) | Think/turn, mean range | Turns | Deaths per run |
| --- | --- | --- | --- | --- | --- |
| GPT-6.1 Terra, `serviceTier: priority` | 3/3 | 24 s (18 to 34 s) | 1.7 to 2.5 s | 6 to 12 | 1, 4, 1 |
| Claude Haiku 5.5 | 3/3 | 76 s (66 to 136 s) | 6.9 to 11.0 s | 9 to 12 | 0, 0, 1 |
| GPT-6 Luna, `serviceTier: priority` | 0/3 | gave up after 39 to 84 s | 1.2 to 3.7 s | 8 to 31 of 60 | 2, 0, 1 |

Terra finished about three times faster than Haiku, which planned more
carefully. Luna decided as fast as Terra but never passed the wall: it
aligned on the edge of the gap instead of leaving room for the player's
radius, then stopped well before its turn budget and overstated the turns it
had used.

Terra and Luna ran only on the priority tier here. Three runs per
configuration show a large gap, not a precise ratio, and another game can
reorder the models.
