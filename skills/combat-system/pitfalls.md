# Pitfalls — the 12 classic combat failure modes

Each: symptom → root cause → prevention. Read before designing; re-read
when combat "feels mushy" and nobody knows why.

## 1. Hitbox desync from animation

- **Symptom** — the hitbox is active while the visual swing is elsewhere;
  hits land before/after the blade passes.
- **Root cause** — windows authored in seconds instead of normalized clip
  time; attack-speed buffs or hit-stop not applied to window timers;
  frame-rate-dependent event dispatch.
- **Prevention** — author windows in normalized clip time and evaluate
  them from the animation's actual playback position (never a parallel
  timer); debug-draw hitboxes over the mesh as a standing tool.

## 2. Multi-hit duplicates

- **Symptom** — one swing hits the same target two or three times.
- **Root cause** — per-frame overlap with no hit registry; or hitting
  multiple colliders (limbs) of one entity.
- **Prevention** — per-activation hit set keyed by **entity root**, not
  collider; cleared on window open; declared multi-hit attacks re-arm the
  registry explicitly.

## 3. Point-blank whiffs / tunneling

- **Symptom** — attacks pass through enemies at point blank or during
  fast movement.
- **Root cause** — single-frame in-place overlap missing targets between
  frames; hitbox origin spawning beyond the enemy's collider; trigger-
  collider detection missing FixedUpdate contacts.
- **Prevention** — sweep the hit shape from previous to current socket
  transform each tick; size shapes generously vs the visual; never rely
  on trigger-enter callbacks for fast swings.

## 4. Eaten inputs / unresponsive combat

- **Symptom** — presses during attacks do nothing; combat feels "laggy"
  even at high frame rate.
- **Root cause** — no input buffer; cancel windows opening only at clip
  end; animator transitions consuming the input frame.
- **Prevention** — timestamped input buffer (~150–300 ms, depth 1, newest
  wins, cleared on consume) consumed when the next valid window opens;
  generous cancel windows tuned in data; input reading decoupled from
  animation state.

## 5. Animation pops on cancel

- **Symptom** — snapping/teleporting when canceling into the next action.
- **Root cause** — zero-length blends on interrupt; root motion delta
  discarded mid-clip.
- **Prevention** — short interrupt blends (0.05–0.15 s); preserve
  accumulated root motion on cancel; validate every cancel edge in the
  graph plays a blended transition.

## 6. Hit-stop bleeding into everything

- **Symptom** — UI animations, particles, and camera freeze on every hit;
  co-op desyncs.
- **Root cause** — global `Time.timeScale` / `SetGlobalTimeDilation`
  pulses.
- **Prevention** — scope time dilation to attacker + victim only
  (per-`Animator.speed` in Unity, `CustomTimeDilation` in UE); UI/camera
  on unscaled time; in networked play, hit-stop is client-side cosmetic —
  never authoritative simulation time.

## 7. Stagger-lock

- **Symptom** — enemies chain-staggered into infinite combos; or the
  player chain-staggered with no escape.
- **Root cause** — stagger gauge without decay, post-stagger immunity, or
  escalating thresholds; every hit re-triggering the flinch animation.
- **Prevention** — threshold escalation per proc (+50–100%, the MH KO
  model), gauge decay, immunity/grace window after each stagger,
  hyperarmor on heavy enemy attacks; for the player, hit-stun decay and
  combo-escape mechanics.

## 8. Duplicate damage application

- **Symptom** — damage applied twice (or N times) per hit, especially in
  multiplayer or via event fan-out.
- **Root cause** — damage computed on both client and server; both the
  interface call and an event subscriber applying it; effect applied
  per-collider.
- **Prevention** — single authoritative damage application point
  (server-only in netplay; one GameplayEffect path in GAS); feedback
  subscribers strictly read-only; idempotent hit IDs.

## 9. Cancel-window exploits

- **Symptom** — canceling recovery into an infinite DPS loop that skips
  the attack's committed cost.
- **Root cause** — free, symmetric cancels (anything → anything) with no
  cost or lockout; recovery fully cancelable including on whiff.
- **Prevention** — cancel rules as explicit graph edges (data, reviewable);
  cancels cost a resource or only target different move categories;
  same-move chain caps; on-hit cancels earlier than on-whiff (whiffing
  stays punishable).

## 10. Knockback through walls/floors

- **Symptom** — launched enemies clip out of the level or fall through
  geometry.
- **Root cause** — knockback applied as raw transform translation or
  velocity ignoring collision; tunneling on large impulses.
- **Prevention** — route knockback through the character movement solver
  (swept movement, see `character-controller`); clamp impulse magnitude;
  ground/wall checks during the knockback arc; kill the impulse on first
  blocking hit.

## 11. Attack tracking overshoot

- **Symptom** — lunges/soft-lock teleport the attacker across the arena or
  slide them unnaturally into position.
- **Root cause** — unclamped target-snap (warp distance/rotation
  unlimited); tracking continuing through active/recovery frames; lerping
  position instead of warping root motion.
- **Prevention** — clamp warp translation/rotation (UE Motion Warping
  limits; Unity: clamp steering in `OnAnimatorMove`); track during wind-up
  only; stop at a minimum distance; never track during active frames.

## 12. Combo graph vs gameplay state desync

- **Symptom** — the graph says "attacking" while the character is
  staggered or dead; hitbox windows stay open after an interrupt; the next
  combo starts from mid-string.
- **Root cause** — combo state machine and health/stagger state are
  separate systems with no interrupt propagation; window-closing events
  never fire after an interruption.
- **Prevention** — single source of truth for actor state (tags in GAS;
  one state stack in Unity); stagger/death force-cancels the active attack
  through one interrupt path (close windows, clear hit registry, reset
  graph node); windows closed by state-exit hooks, never only by
  end-events.

## Debugging order

When combat misbehaves: (1) turn on hitbox debug-draw and watch a slow-mo
swing (#1/#3), (2) log the hit registry per swing (#2/#8), (3) log buffer
consume vs window-open timestamps (#4), (4) check what scopes the hit-stop
actually touches (#6), (5) force a stagger mid-attack and verify every
window closed and the graph reset (#12). Most "combat feels bad" reports
are #4 (eaten inputs) or #1 (desynced windows) wearing a costume.

## Playtest checklist

```
- [ ] Mash through a full string: zero eaten inputs, no double-triggers
- [ ] Cancel every attack at every window into dodge/guard/skill: no pops,
      no effect-after-cancel leftovers
- [ ] Point-blank and max-speed-passing attacks all connect (sweep check)
- [ ] One swing through a crowd: each enemy hit exactly once
- [ ] Stagger/kill the player mid-swing: windows closed, graph reset
- [ ] Stun-lock attempt on a single enemy: threshold escalation kicks in
- [ ] Perfect dodge and perfect guard at the same attack: windows and
      rewards differ as designed (parry tighter, reward bigger)
- [ ] Hit-stop: UI clock and particles keep running; co-op unaffected
- [ ] Knockback an enemy into every wall/corner: nothing clips through
- [ ] Lunge attack from max soft-lock range: no teleport feel, clamped
- [ ] Same fight at 30 / 60 / 144 fps: identical windows and damage counts
```
