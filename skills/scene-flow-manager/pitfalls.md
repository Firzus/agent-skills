# Pitfalls — the 14 classic flow failure modes

Each: symptom → root cause → prevention. Read before designing; re-read
when the second login behaves differently from the first.

## 1. "The second login differs from the first"

- **Symptom** — double events, previous player's data visible, ghost
  behaviors after logout/relogin.
- **Root cause** — static/singleton state surviving the session: static
  events still subscribed, pools not purged, persistent managers never
  reset.
- **Prevention** — `IResettable` on every persistent manager; the FSM
  calls `ResetSession()` on logout; ban unregistered mutable statics;
  CI smoke test running two login/logout cycles back to back.

## 2. Init-order races

- **Symptom** — null refs at boot, machine-dependent, "works on my PC".
- **Root cause** — system A reads B before B initialized; async inits
  completing in nondeterministic order; implicit Awake-order dependency.
- **Prevention** — explicit ordered init driven by the bootstrap
  (dependency graph, await each stage); never auto-init in
  Awake/BeginPlay; an all-systems-ready gate before leaving Boot.

## 3. Scattered LoadScene/OpenLevel calls

- **Symptom** — double transitions, orphan scenes, flow state desynced
  from the actual world.
- **Root cause** — gameplay code calling scene APIs directly, bypassing
  the flow manager.
- **Prevention** — one entry point: `RequestTransition`. A lint/review
  convention banning scene APIs outside the flow module. Gameplay emits
  requests; the FSM decides.

## 4. Transition interrupted mid-way

- **Symptom** — half-states: old context half-destroyed, new one
  half-loaded; quit during load corrupts; double transitions.
- **Root cause** — non-atomic transition; a second request lands during
  one in flight; an error mid-teardown goes unhandled.
- **Prevention** — atomic, non-reentrant transitions (reject or queue new
  requests — explicitly); try/catch around the sequence with recovery to
  a safe context; quit handled as a special transition that waits (or a
  clean cancellation point).

## 5. Memory not released between contexts

- **Symptom** — RAM climbs with every context change; mobile crash after
  N transitions.
- **Root cause** — Unity: Addressables handles not released, static refs
  retaining assets, `UnloadUnusedAssets` never called (additive loads
  never trigger it); UE: streamed-out levels without GC, delegates/
  UPROPERTY refs retaining actors.
- **Prevention** — the composer owns all handles and releases them at
  teardown; the sequencer's GC step (unload → UnloadUnusedAssets →
  collect) behind the loading screen; Addressables groups split per
  context; QA memory snapshot compared across two visits to the same
  context.

## 6. Loading screen shown too late

- **Symptom** — a flash of broken/black/empty screen between teardown and
  the loading screen appearing.
- **Root cause** — the loading screen is part of the content being
  loaded, or its async load completes after teardown starts.
- **Prevention** — the loading screen lives in the persistent layer;
  sequencer step 1 = screen visible, verified, before anything
  destructive.

## 7. The lying progress bar

- **Symptom** — stuck at 90%, jumps backwards, hits 100% while still
  loading.
- **Root cause** — Unity's `progress` caps at 0.9 under gated activation;
  naive aggregation of multiple operations; activation/warmup/init not
  counted.
- **Prevention** — weighted aggregate of real phases, monotonic by
  construction (clamp to max reached); normalize `progress/0.9`; include
  PSO warmup in the final segment; if honesty is impossible, use an
  indeterminate indicator instead.

## 8. Input not locked during transitions

- **Symptom** — pause menu opened during a fade; player actions on a
  world being torn down.
- **Root cause** — input still routed to gameplay during the sequence.
- **Prevention** — sequencer step 1 locks input, last step unlocks; the
  lock belongs to the flow manager, not to screens.

## 9. Audio bleeding across contexts

- **Symptom** — menu music still audible in game; 3D sounds from the
  previous level; "2 audio listeners" warnings.
- **Root cause** — audio owned by content scenes without teardown;
  duplicated listeners.
- **Prevention** — a persistent AudioManager owns music/buses; the
  transition includes an explicit audio step (fade out old bus, stop,
  fade in new); exactly one listener, on the persistent layer.

## 10. Managers scene loaded twice

- **Symptom** — double managers, double events — usually editor-only, or
  after returning through Boot.
- **Root cause** — editor play-in-scene plus the bootstrap shim both
  loading managers; the flow re-entering Boot; DDOL singleton
  duplication.
- **Prevention** — idempotence check before structural loads (is the
  scene already loaded?); Boot enterable only once; a singleton guard
  that destroys duplicates *and logs an error* (it's a flow bug, not
  normal).

## 11. Online: token expiry / kick / version mismatch mid-transition

- **Symptom** — arriving in the target context already disconnected;
  incoherent server errors after a long load.
- **Root cause** — session validated before the transition but not
  after; no handling of network failures mid-transition.
- **Prevention** — online gates at the END of the transition (revalidate
  token/session/version before activating gameplay); network failures
  are FSM transitions (→ Reconnect or → Title with a message), never
  swallowed exceptions; preemptive token refresh when loads run long.

## 12. Save corruption from quit-during-transition

- **Symptom** — unreadable or inconsistent save after quitting/crashing
  during a load.
- **Root cause** — a save write triggered mid-teardown on partial state;
  quit interrupting a write.
- **Prevention** — the FSM exposes `CanSave` (false during transitions);
  atomic writes (temp-then-rename); quit waits for pending writes; save
  *before* starting the transition.

## 13. Cutscene not restoring gameplay state

- **Symptom** — after a cutscene: input stuck in cinematic mode, HUD
  invisible, timeScale wrong, camera orphaned.
- **Root cause** — the cutscene mutated globals and an exit path (skip!
  error!) didn't restore them all.
- **Prevention** — cutscene = FSM context with symmetric enter/exit:
  snapshot on enter, guaranteed restore on exit (try/finally — including
  skip and error); skip = jump to the final state of every step, never
  an interruption.

## 14. Editor-vs-build divergence

- **Symptom** — works in editor playing scene X directly, breaks in
  build (or vice versa); managers missing in play-in-scene.
- **Root cause** — the build always boots through index 0; the editor
  starts on an arbitrary scene, violating bootstrap assumptions.
- **Prevention** — an editor bootstrap shim (Unity:
  `playModeStartScene` → Boot, or a `RuntimeInitializeOnLoadMethod`
  loading managers if absent; UE: verify map GameMode overrides and
  default maps). Game code never assumes "I arrived via Boot" unless the
  shim guarantees it.

## Debugging order

When the flow misbehaves: (1) log every transition with its step-by-step
progress — most bugs name themselves, (2) run the double login/logout
smoke test (#1), (3) play from an arbitrary editor scene (#14), (4) diff
memory between two visits to the same context (#5), (5) quit at every
step of a transition (#4/#12), (6) pull the network cable mid-load (#11).

## Ship checklist

```
- [ ] Two consecutive login/logout cycles: byte-identical behavior
- [ ] Quit at every transition step: no corruption, clean next boot
- [ ] Kill the network during every online step: correct error + safe exit
- [ ] Skip every cutscene at every moment: full state restore
- [ ] Memory flat across repeated context cycles (snapshot diff)
- [ ] Progress bar: monotonic, never stuck, honest tail
- [ ] Editor play-from-any-scene works via the shim
- [ ] Cert ceilings: nothing non-interactive > 20 s, loading screens
      under 2/3 min with indicators (XR-001)
- [ ] Crash loop (3 failed boots) offers safe mode
- [ ] First-boot and warm-boot paths both tested
```
