# Teleport sequence — the atomic jump and its engineering

The teleport is an **exclusive state machine**: one request at a time, input locked
from confirmation, defined cancel points only before the streaming-source move. No
GDC/datamine documents either reference game's internal pipeline — this is a
blueprint from observable behavior, engine docs, and the sibling skills. Tagged
`[inferred]` where a practice is standard but not single-doc-sourced.

## The sequence

```
1. VALIDATE   target unlocked? policy matrix allows (context)? → typed denials
2. CONFIRM    map UI confirm; idempotent (ignore while running)
3. LOCK       input lock; CanSave = false (save-persistence)
4. FADE       fade/loading screen in (anti-flash rules from scene-flow-manager)
5. JUMP       move the streaming source to the target
6. AWAIT      residency gates: cells loaded + collision present (ground raycast)
              + navmesh ready — WITH TIMEOUT and fallback
7. PLACE      at spawnPoint + facing; velocity zeroed; interpolation reset;
              controller-safe write; spawn-safety overlap check + fallback offsets
8. RESTORE    aggro cleared; region systems resubscribed (weather/audio/spawn);
              buffs preserved BY DESIGN; arrival services fire
9. CAMERA     warp notify (no damping traversal), framing preset
10. REVEAL    fade out; input unlock; CanSave = true
```

## The residency gate (fall-through defenses)

The #1 bug class: place the player before destination collision/navmesh exists →
fall through the world or eject from geometry.

- **UE5 World Partition**: activate a **Streaming Source component** at the target
  *before* moving the player; poll `UWorldPartitionSubsystem::IsAllStreamingCompleted()`
  / `IsStreamingCompleted(src)` (or the component's `Is Streaming Completed`) before
  placing; `bBlockOnSlowLoading` ("Block on Slow Streaming") forces a synchronous
  stall for teleport correctness over smoothness.
- **Defenses (engine-agnostic)**: (1) gate placement on residency, never place
  blind; (2) disable gravity/movement on arrival (UE: Movement Mode = None →
  Falling once floor loads); (3) Z-offset + line-trace down to snap to real ground;
  (4) override `ChoosePlayerStart` so a missing PlayerStart can't fall back to
  `(0,0,0)`.
- **Networked aggravator**: on a client the floor cell may not exist yet — gate
  `PlayerCanRestart` on a "level loaded" bool.
- **Always with a timeout + fallback** (retry, degraded known-safe spawn, error) —
  never an unbounded wait (pitfalls #12). UE5: never "fix" it with
  `FlushAsyncLoading` (a game-thread hitch).

## Physics-safe placement

- **Zero motion on arrival**: UE `SetActorLocation(..., Teleport=true)`
  (`TeleportPhysics`) *preserves* velocity by design (so ragdolls don't explode) —
  for a clean stop you must **also zero velocity**.
- **Kill the 1-frame smear (Unity Rigidbody)**: briefly set `interpolation = None`,
  assign `rb.position` (not `MovePosition`, which interpolates), zero velocities,
  call `Physics.SyncTransforms()`, restore interpolation.
- **CharacterController** ignores `transform.position` — disable → set transform →
  re-enable (toggling triggers an internal sync).
- **NavMeshAgent**: use `NavMeshAgent.Warp(position)` (a raw transform set leaves
  the nav position stale); make a coexisting Rigidbody kinematic to avoid a race.
- **Capsule overlap / depenetration**: pre-place overlap test + nudge to free
  space `[inferred]`. **Detach from movable platforms** before teleport `[inferred]`.

## Camera on teleport

- **Cinemachine**: `CinemachineCore.OnTargetObjectWarped(target, delta)` notifies
  all vcams tracking that target (pass the *exact* tracked transform or it no-ops);
  `PreviousStateIsValid = false` for a full snap.
- **UE**: zero/flush SpringArm Camera Lag for the teleport frame `[inferred]`;
  watch a spring-arm collision test waking inside geometry — place the camera with
  the same residency gate.

## Large-world precision

Single-precision `float` (24-bit mantissa) jitters far from origin: Unity reports
noticeable jitter from **~2–5 km** out (PhysX is single-precision and won't switch
to double). Two fixes:

- **Floating origin / rebasing (Unity)**: keep the camera near origin; when it
  crosses a threshold (commonly 500–1000 m), translate the whole world the opposite
  way (shift all roots + active particles/trails, keep a 64-bit world-position
  ledger). **The teleport fade is the ideal rebase moment** — you're already
  discontinuous, so fold the origin shift into the jump for free.
- **UE5 Large World Coordinates (LWC)**: double-precision `FVector`, default-on
  since 5.1 (`WORLD_MAX` raised to ~88M km); GPU stays fast via camera-relative
  rendering. (Legacy World Composition rebasing calls `AActor::ApplyWorldOffset` —
  override it for actors caching absolute coords; not supported in multiplayer.)

## Seamless / no-loading-screen travel

The trick: never block on a stall screen — **mask streaming behind a
non-interruptible animation/"valve", or have I/O fast enough to skip masking**.

- **Animation-masked streaming**: play a fixed-duration camera-constrained
  sequence whose runtime ≥ worst-case stream time; dump the old region, request the
  destination, hand control back only once residency is confirmed. Spider-Man
  (~800 tiles of 128 m², ~1 tile/sec) hides the swap behind a subway animation; God
  of War Ragnarök uses "squeeze-throughs" as valves ("dump the level behind, load
  ahead — but only *after* the squeeze finishes"); its realm travel uses the
  "Realm Between Realms" corridor as a loading buffer.
- **Hardware-eliminated masking**: Ratchet & Clank Rift Apart swaps two entirely
  different maps "almost instantly" via the PS5 I/O stack ("no tricks"); on PC HDD
  the same jumps stall hard — proof it was I/O-bound.
- **Takeaway**: seamless = (stream budget ≤ mask duration) OR (I/O bandwidth high
  enough to skip the mask). Fade-to-black is the degenerate zero-content mask.

## Save & networked teleport

- **Teleport as a de-facto save point** `[inferred]`: a successful arrival is a
  clean known-good state (grounded, resident) — a natural autosave trigger. Gate on
  residency-complete so you never persist a fall-through.
- **Idempotent requests**: a destination ID + token so a re-sent request (lag,
  double-press) doesn't double-execute.
- **Networked rule**: never trust client position. The client sends **intent**
  (destination ID); the server **validates the target is actually unlocked** (UE:
  `Server` RPC + `WithValidation`) and replicates the authoritative position back.
  Distinguish legitimate teleport from speed/teleport hacks with an explicit
  whitelist so legit jumps aren't auto-flagged. Resolve **co-op spawn slots**
  server-side (claim a distinct slot per arriving player) to avoid stacking.

## Cross-instance teleport

A domain teleport brings you to the *entrance* (in-world); entering is a separate
scene transition. Cross-instance teleports must go through `scene-flow-manager`
(instance teardown, return-position snapshot taken at **entry**, not exit) — never
a raw source move (pitfalls #14).

## Flagged gaps — do NOT invent

The internal pipelines of both reference games · UE camera-lag flush API · UE
NavMesh-warp exact call · LWC ~21 km soft-cap default · teleport-as-save and co-op
slot resolution are `[inferred]` standard practice.

## Sources

Epic UE docs (World Partition, `FWorldPartitionStreamingSource`,
`WorldPartitionSubsystem`, `SetActorLocation`, LWC, World Composition) · Unity docs
(`NavMeshAgent.Warp`, Cinemachine `OnTargetObjectWarped`) · Unity Discussions
(float precision) · Bugnet (Rigidbody interpolation jitter) · PlayStation.Blog
(Spider-Man tiles) · Digital Foundry (Spider-Man, Rift Apart, PS5 I/O) · Push
Square (GoW Ragnarök valves) · AccelByte / MoldStud (server-authoritative movement).
