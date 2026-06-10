# Pitfalls — the 14 classic enemy-AI failure modes

Each: symptom → root cause → prevention. Read before designing; re-read
when "the enemy does whatever" and nobody can say why.

## 1. AI writes the transform directly

- **Symptom** — enemies teleport through walls/the player; staggers and
  knockbacks have no effect; collision ignored.
- **Root cause** — NavMeshAgent (or a tween) writing position instead of
  the character controller — the intent-separation violation.
- **Prevention** — one position writer: the shared motor. Unity:
  `updatePosition = false`, feed `desiredVelocity` as a locomotion intent,
  resync `nextPosition`. UE: AIController → MovementComponent. Test: a
  knockback must displace an enemy exactly like the player.

## 2. Everyone attacks at once / everyone waits politely

- **Symptom** — six enemies swing simultaneously (unreadable, unfair) — or
  a passive circle and dead pacing.
- **Root cause** — no token system; or tokens never returned (holder died
  or got staggered without release), pool mis-sized.
- **Prevention** — attack tokens with **guaranteed release in state
  teardown** (not the happy path) + a safety timeout; off-token enemies
  reposition/posture, never idle; pool size per difficulty.

## 3. Target flip-flopping

- **Symptom** — the enemy alternates targets every frame; constant
  about-faces.
- **Root cause** — threat recalculated continuously with no hysteresis or
  commitment.
- **Prevention** — ratio hysteresis (switch only at ≥120% of the current
  target's threat — the Genshin/WoW model), current-target score bonus,
  optional switch cooldown.

## 4. Navmesh–reality desync

- **Symptom** — agents walk through closed doors; an enemy knocked off
  the navmesh freezes forever.
- **Root cause** — navmesh not updated for dynamic obstacles; no
  off-mesh recovery routine.
- **Prevention** — carving obstacles / dynamic modifiers + tile rebuilds
  for anything blocking; a mandatory post-displacement recovery: sample
  the nearest navmesh polygon, a "regain navmesh" state, and a fallback
  (warp or despawn) if unreachable.

## 5. Perception through walls

- **Symptom** — aggro through walls on damage or noise; or sight failing
  because the raycast hits the agent's own body.
- **Root cause** — no LoS check on damage/hearing stimuli; raycasts
  from/to the pivot; LayerMask including self.
- **Prevention** — every distant stimulus passes LoS (hearing may
  tolerate occlusion with attenuation); rays from the eye to multiple
  body points; exclude self colliders; UE: configure sight target points,
  MaxAge, and Forget Stale Actors.

## 6. The conga line

- **Symptom** — enemies single-file toward the same point, executed one
  by one.
- **Root cause** — all pathing to the player's exact position along the
  same optimal path.
- **Prevention** — slot-based positioning (arc/circle assigned by a
  coordinator — EQS in UE, scored points in Unity), varied avoidance
  priorities, per-agent path desirability noise.

## 7. Leash exploits & broken-looking resets

- **Symptom** — players pull enemies to reset packs for free damage; or
  the leash interrupts mid-swing and the enemy pivots home absurdly.
- **Root cause** — binary distance-only leash applicable at any instant.
- **Prevention** — return-home is a **brain state** that waits for the
  current action; heal + immunity during return; abort-return if
  re-engaged close (`backhomeBattleDist` — FromSoft's own fix);
  hysteresis band between aggro and leash radii.

## 8. AI frozen at streaming borders

- **Symptom** — an enemy stands immobile at a cell edge; pathfinding
  fails toward an unloaded cell.
- **Root cause** — decision/navigation assume a fully loaded world.
- **Prevention** — validate path before commit; fallback behavior on
  unreachable (return home, local patrol); couple agent activation to
  streaming (dormant until the combat cell set is resident) — see
  `open-world-streaming`.

## 9. Stale blackboard data

- **Symptom** — chasing a corpse; staring at an empty spot forever; null
  refs on despawned entities.
- **Root cause** — blackboard references never invalidated;
  last-known-position without expiry.
- **Prevention** — validate references on every read (alive + valid);
  TTL on LKPs; death/despawn events scrub subscribed blackboards; UE:
  MaxAge + Forget Stale Actors.

## 10. Full-rate ticking without LoD (or sliding LoD ghosts)

- **Symptom** — frame rate collapses with enemy count; distant enemies
  reasoning at full rate — or LoD'd enemies sliding without animation.
- **Root cause** — no decision LoD; or LoD cutting animation but not
  movement.
- **Prevention** — bucket scheduler degrading decision, perception,
  repath, and animation **together, coherently** (the Genshin per-module
  tiers); if movement continues at low LoD, keep a minimal locomotion
  pose; Significance Manager + URO (UE), Animator culling + tick buckets
  (Unity).

## 11. Decision thrash

- **Symptom** — ten actions started per second, none finished; erratic
  strafe-dancing.
- **Root cause** — BT re-evaluated every frame with no commitment — every
  micro-change reselects a branch.
- **Prevention** — commitment on engaged decisions (a started attack
  finishes or is interrupted by a strong reason — never re-decided);
  decision cooldowns; event-driven aborts (UE observer aborts, StateTree
  transitions) instead of re-polling.

## 12. Animation/decision desync

- **Symptom** — attack decided but the animation was interrupted: hitbox
  never spawns; the AI waits forever for an anim event that won't come.
- **Root cause** — the brain awaits an animation callback with no
  timeout; interruptions don't notify the brain.
- **Prevention** — every wait-for-anim-event state has a timeout;
  animation interruptions raise an event to the brain (action failed,
  token released) — the same interrupt contract as `combat-system`'s
  graph/state desync.

## 13. Difficulty by stat inflation only

- **Symptom** — hard mode = HP sponges; identical patterns, just longer
  and duller.
- **Root cause** — difficulty wired only to HP/damage multipliers.
- **Prevention** — difficulty modulates **behavior**: token counts,
  aggression, reaction speed, advanced-move usage, positioning quality
  (the Doom Nightmare model); stats as fine adjustment.

## 14. Untestable AI

- **Symptom** — "the enemy does whatever" and every AI bug costs hours —
  the #1 productivity killer.
- **Root cause** — no visualization of internal state.
- **Prevention** — debug overlay from day 1: perception cones/rays,
  active brain state above the head, token holders, current path, target
  scores, decision-transition history. UE: use the native gameplay
  debugger + visual logger. Unity: gizmos + a custom overlay are
  mandatory, not optional.

## Debugging order

When AI misbehaves: (1) turn on the debug overlay and watch the brain
state + token flow — most bugs name themselves, (2) knock an enemy back
and verify it moves like the player (#1), (3) check token release on
stagger/death (#2), (4) kill the target and watch the blackboard (#9),
(5) walk to a cell border (#8), (6) profile decision tick rates by
distance (#10).

## Ship checklist

```
- [ ] Knockback parity test: enemy displaced exactly like the player
- [ ] Stagger/kill a token holder: token released, encounter keeps pacing
- [ ] 6+ enemy encounter: max N attackers, others visibly busy, no conga
- [ ] Pull enemies to the leash edge: clean return, no mid-swing pivot,
      no free-damage cheese loop
- [ ] Perception: no aggro through walls; gradual detection feels fair
- [ ] Co-op (if applicable): aggro distributes, no single-player focus
- [ ] 30+ enemies: AI budget holds (per-module LoD verified in profiler)
- [ ] Difficulty tiers change behavior, not just HP
- [ ] Debug overlay shows: state, target, tokens, path, perception
- [ ] Soak test: an AI brain driving the player character survives 30 min
```
