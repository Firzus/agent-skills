# World data — traversability, volumes, anchors, readability

The world side of the dialogue. All numbers are **starting points**. Primary
sources: GDC 2017 *Breaking Conventions with BotW*, CEDEC 2017, and the parkour
readability tradition (Mirror's Edge).

## Climbable-by-default (the BotW inversion)

Every collision is climbable unless explicitly marked. The production cost moves:
instead of tagging climbable surfaces, level design guarantees non-climbable
surfaces *read visually* (smooth Sheikah stone). **No-climb is a first-class
authored channel with a debug visualization mode** — auditable, reviewable.

- **Runtime detection, no handhold markup**: a shape sweep (wider than the
  capsule) or multi-height ray fan → hit array → **refinement traces toward each
  hit** for clean position/normal (overlaps alone give false normals on
  overlapping geometry) → reorient on the normal, move tangent. Eye-height trace
  detects top-out (mantle). See [implementation.md](./implementation.md).
- **Surface state as dynamic modifier**: wet/slippery is weather state applied to
  the material, not a second markup (BotW rain).

## The opposite philosophy: authored & telegraphed routes

The parkour school inverts climb-everything: geometry is **authored, exclusive,
and telegraphed**, making *route-reading* the skill.

- **Readability cues**: Mirror's Edge's **Runner Vision** turns key objects bold
  red as the runner approaches — dynamic and tunable (intensity/fade/timing by
  skill level), deliberately *not* a breadcrumb trail. The industry convention:
  **yellow/white = climbable** (Uncharted, Tomb Raider, Last of Us, Horizon), red/
  warm = objective route — works via perceptual salience, "as long as it's
  consistent".
- **The freedom-vs-authored-route tension (the core trade)**: a curated path keeps
  flow but can **lie about affordances** (Mirror's Edge Hard Mode, with Runner
  Vision off, reveals that "some surfaces look climbable but aren't, others are but
  don't look it"). Climb-everything (BotW) removes the readability problem entirely
  but removes route-reading skill. Dying Light's "Natural Movement" is the hybrid:
  real-time geometry scan + climb-anything in first-person — at the cost of breaking
  "established smoke-and-mirrors level-design techniques" (quests rewritten when
  players approach from any angle).

## Volumes

Each volume publishes versioned world facts: verb/capability gates, medium and
field parameters, drain-policy inputs, and a validation revision. Traversal
resolves movement-relevant values into an immutable request snapshot.

- **Water** (+ min depth for dive), **updrafts** (placed AND emergent — BotW's
  grass fires feed the chemistry engine), **currents**, **ladders** (free climb).
- Volumes publish facts rather than forces. Each verb resolves its response (glide
  takes full updraft, climb damps it — pitfalls #8); `character-controller`
  captures accepted values in Mover replay data and owns final displacement.

Traversal owns authored facts, discovery/scoring, and stable candidate IDs and
revisions. Consumers own transition execution. The controller revalidates only the
active contact/candidate required for physical execution; it never rediscovers
alternatives during resimulation.

## External locomotion capability gates

Traversal owns the authored world facts consumed by external locomotion systems:

- `Mount.NoSummon`: invocation is forbidden at the current location.
- `Mount.ForceDismount`: the mount system must complete a safe transition before
  entering or continuing through the restricted area.
- Terrain, medium, landing, shore, and capability tags describe access; they never
  execute mount lifecycle.

`mount-system` validates the facts and candidates on the server, then executes the
resulting summon, movement, or dismount transition. Traversal volumes never spawn,
possess, attach, move, or destroy a mount actor.

## Anchors

Grapple points / hookpoints: hand-placed data — the designer-controlled
counterpoint to systemic surfaces. Definition (range class, swing type) in shared
data; placement in scene markers; queried via a registry + angle/LoS filter
(pitfalls #9).

## Guidance without walls (CEDEC)

- **The triangle rule**: climb-or-around choices, view occlusion.
- **Landmark gravity**: tall landmarks pull the player.
- **Bowl topography**: descending is free (gliding spends altitude), so important
  destinations sit low — "gravity to go forward".

## Engine mapping

| Generic block | Unity 6 | UE5 (5.4+) |
| --- | --- | --- |
| Traversability data | Layer query filter + `SurfaceProfile` SO (collider-keyed cache); terrain via splat/vertex channels | Collision channel + Gameplay Tags + Physical Material SurfaceType |
| Volumes | trigger volumes → typed world facts | `APhysicsVolume`/custom overlaps → immutable request data → `character-controller` Mover adapter |
| Anchors | scene markers + SO definitions; registry + LoS filter | anchor actors; registry query |
| Readability | shader recolor by tag (Runner-Vision style) | post-process / material highlight by Gameplay Tag |

## Flagged gaps — do NOT invent

Coyote-time/jump-buffer ms (80–150 ms are common implementation ranges from
tutorials, not confirmed exact values for any AAA title) · BotW slip-back
distances (only the step pattern is citable).

## Sources

GDC 2017 *Breaking Conventions with BotW* · CEDEC 2017 field level design ·
Mirror's Edge (O'Brien, Runner Vision) · Dying Light "Natural Movement" deep dive ·
Uncharted/Horizon color-coding convention · Cantão BotW-climbing recreation.
