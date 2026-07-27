# Animation — state machines, sequences, cameras, procedural rigs

Four tools, four jobs. They compose rather than compete: a Timeline sequence
drives an Animator, Animation Rigging adjusts that result, and Cinemachine
frames it.

| Job | Reach for |
| --- | --- |
| Character state and locomotion | **Animator** (state machines, blend trees) |
| Cutscenes, scripted sequences, trailers | **Timeline** |
| Camera behaviour and framing | **Cinemachine** |
| Runtime rig adjustment — IK, aim, foot placement | **Animation Rigging** |

## Versions

| Package | Editor-generation line | Unity 6.0 LTS |
| --- | --- | --- |
| `com.unity.cinemachine` | 3.1.7 | — |
| `com.unity.timeline` | 6.6.0 (25 Mar 2026) | 1.8.12 |
| `com.unity.animation.rigging` | 6.6.0 (13 Apr 2026), core package embedded in Unity | 1.3.1 |

Timeline and Animation Rigging now version with the Editor generation rather
than independently — the same core-package shift ECS took in 6.4. Install the
version Package Manager marks **Released** or **Recommended** for the Editor in
use, rather than forcing a `6.6.0` line into an older 6.x project.

Timeline is actively maintained and released, not deprecated.

## Animator

The Animator owns character state: locomotion, actions, reactions.

- Model state in layers with masks — base locomotion on one layer, upper-body actions on another — so a character can aim while running without a combinatorial state explosion.
- Blend continuous motion with blend trees, keyed on speed and direction, rather than transitions between discrete clips.
- Drive transitions from parameters the gameplay code sets, keeping the state machine the single owner of which animation plays.
- Keep gameplay decisions out of the graph. The Animator answers "what is playing"; gameplay logic answers "what should happen", and the two meet at parameters and events.

## Timeline

Timeline sequences authored content: cutscenes, scripted beats, trailers.

- Sequence with tracks over the objects involved — Animation, Activation, Audio, Signal — and bind them per instance so one timeline drives many actors.
- Emit **Signals** for gameplay to react to, so the sequence stays declarative and gameplay code subscribes rather than polling playback time.
- Reach for a Timeline when the beat is authored and repeatable. Runtime-variable behaviour belongs to the Animator or gameplay code.

## Cinemachine

Cinemachine owns camera behaviour: a Cinemachine Camera per shot or per
behaviour, with the brain blending between them.

- Define camera behaviour as configured components — follow, look-at, noise, collision — rather than positioning a camera by hand in `LateUpdate`.
- Blend between cameras by priority and let the brain resolve transitions.
- Drive cutscene cameras from Timeline tracks, which is what pairs the two tools.

Cinemachine 3 restructured its API and component model from the 2.x line. Check
the upgrade guide before moving a 2.x project, and write new work against the
3.x API.

## Animation Rigging

Animation Rigging adjusts animated output at runtime, on top of whatever the
Animator plays.

- Build rigs from constraints — Two Bone IK, Multi-Aim, Damped Transform — layered over the animated skeleton.
- Reach for it where the result must respond to the world: foot placement on uneven ground, weapon aim toward a target, head and eye tracking.
- Weight constraints at runtime to blend the adjustment in and out, so procedural correction fades rather than snapping.
- Keep authored motion in clips and corrections in the rig. Rebuilding authored motion procedurally costs more and animates worse.

## Composition

A cutscene reads: Timeline drives the Animator and the Cinemachine cameras,
Animation Rigging keeps the aim and gaze on their targets, and Signals hand
control back to gameplay at the end.

## Where Unity leaves a gap

Unity's animation stack is thinner than Unreal's, and the difference is
concentrated in one place: **frame-accurate gameplay events fired from
animation**. Unreal ships Anim Notifies and Notify States as first-class
authoring objects on a notify track, with Montages to sequence them. Unity's
equivalent is the clip-level `AnimationEvent`, which calls a method **by string
name** on a component of the same GameObject, takes a single parameter, and is
stored on the clip — so it carries no compile-time safety and is fragile across
reimports of authored clips.

For an action game, that gap sits on the critical path: hitbox open and close,
i-frame windows, footsteps, VFX and SFX spawn points, and cancel windows are all
frame-accurate events driven by animation.

**Build a state-scoped animation event system.** The pattern, proven in a
shipping action RPG (`Firzus/lysandra`):

- Carry the events on a `StateMachineBehaviour` attached to the Animator state, not on the clip. The events survive clip reimport and live where the state does.
- Serialize each event as a name plus a **normalized trigger time** (`0..1`), so it stays correct when clip length changes.
- Fire from `OnStateUpdate` by testing whether the trigger time was **crossed** between the previous and current normalized time, rather than comparing for equality — a frame step jumps over any exact value.
- Handle the two time models separately. A looping state wraps, so test the crossing across the wrap and clamp a trigger time of `1` just below it, since `Mathf.Repeat` never returns exactly `1`. A non-looping state must **not** wrap its time, or a trigger time of `1` is never reached.
- Fire a trigger time of `0` from `OnStateEnter`: the crossing test cannot catch frame zero.
- Publish onto the project's event bus rather than calling a method by name, so events are typed and gameplay subscribes without coupling to the Animator.
- Give the behaviour a custom editor with a **preview scrubber** — sample the clip through `AnimationMode`, and blend trees through a `PlayableGraph`, so trigger times are placed against the pose on screen instead of guessed numerically.

Reset any reflection or type caches from
`[RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]`,
which is what keeps the system correct once domain reload is gone — see
[runtime.md](./runtime.md).

Reach for the built-in clip `AnimationEvent` only for one-off cosmetic hooks.

For the authoring UI that makes such a system usable — master-detail
inspectors, polymorphic event lists, timeline strips — see
[editor-tools.md](./editor-tools.md).
