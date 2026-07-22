---
name: scene-flow-manager
description: >-
  Architecture blueprint for game application flow: context state machines,
  boot/title/login/world/cinematic states, additive scene composition, atomic
  transitions, loading screens, online auth and enter-world handshakes, queues,
  reconnection, soft reset, async loading, lifecycle, suspend/resume, patching,
  FTUE, and loading UX. Use when designing boot flows, scene loading, login,
  transitions, onboarding, PSO warmup, or when relogin differs, traversal
  stutters, queues fail, or resume crashes.
---

# Scene Flow Manager

Build the application flow of a game: boot → title → (login) → world, and
every transition between contexts — plus the loading/lifecycle tech
underneath and the player-facing flow design around it. References: Genshin
Impact's documented client flow (dispatch → gate → EnterScene handshake),
the bootstrap + persistent managers + additive content pattern, Half-Life/
God of War (cold-open onboarding), and FFXIV (queue UX). Excluded (separate
skills): in-world spatial streaming (`open-world-streaming`), the screens
inside a context (`menu-ui-manager`).

## The architecture rules

1. **The flow is an explicit FSM of contexts.** Boot, Splash, Title, Login,
   Queue, InWorld, Cinematic, Credits... A context defines *which world is
   loaded* (scene set, active systems, input mode); screens are UI inside a
   context. Decision test: if reaching it requires scene load/unload, it's
   a context. The FSM lives in a root persistent owner; transitions go
   through one API — `RequestTransition(target, params)` — with an explicit
   legality table. **No `LoadScene`/`OpenLevel` anywhere else, ever.**
2. **Each context declares its scene set; the flow manager diffs.** The
   bootstrap pattern: Boot scene (index 0, minimal) → persistent managers
   scene (audio, save, input, UI root, the flow manager — never unloaded) →
   per-context content scenes loaded additively. Transition = diff current
   vs target sets: unload what's no longer needed, load what's missing,
   never touch the shared intersection.
3. **Transitions are atomic, gated, and non-reentrant.**

```
1. Loading screen VISIBLE (it lives in the persistent layer) + input lock
2. Teardown outgoing: save (before, never during), unsubscribe, clear
   pools, resolve pending modals, stop context audio
3. Unload diff + release handles + UnloadUnusedAssets + full GC
   (the ONLY acceptable moment for a blocking collect)
4. Load incoming set async (aggregated, weighted progress)
5. Init incoming context: spawn player, restore state, bind UI
6. COMPLETION GATES: all systems ready, shader/PSO warmup done,
   server ack received (online) — barriers, never timers
7. Reveal: fade in, input unlock
```

Any step can fail → abort cleanly to a safe context (Title) with an error
dialog; never a half-state. New requests during a transition are rejected
or queued — explicitly.

## Reference map

| File | Covers |
| --- | --- |
| [fsm-composition.md](./fsm-composition.md) | The context FSM (context vs screen, ownership, the one API), scene composition (bootstrap + persistent + additive, diff-based transitions), the atomic transition refinements, loading screens & honest progress, the boot dependency graph, the online flow (the Genshin EnterWorld handshake, queue/maintenance/reconnect), returning flows, cinematic contexts |
| [loading-lifecycle.md](./loading-lifecycle.md) | Async loading (the background-load/main-thread-activate split, time-slicing, asset handles), memory during transitions (the double-resident peak, mip convergence), PSO/shader-stutter warmup, the app suspend/resume model (Xbox PLM, Quick Resume, mobile process death), platform cert (TRC/TCR/XR, public only), patching & delta updates |
| [flow-design.md](./flow-design.md) | FTUE & onboarding (time-to-fun, cold-open, the veteran-game problem), the title/attract/reactive-menu flow, live-service session flow ("popups before play", FOMO, hubs), the UX of loading & waiting (progress-bar psychology, hidden loads, playable loading screens), suspend-resume & save-state UX, error/disconnect/queue UX |
| [pitfalls.md](./pitfalls.md) | 16 failure modes (symptom → cause → prevention) with debugging order and ship checklist |

## Build order (4 shippable tiers)

```
Tier 1 — The skeleton
- [ ] Context FSM + transition legality table + single RequestTransition API
- [ ] Bootstrap: Boot scene -> persistent managers -> additive content
- [ ] Atomic transition sequence with fade + input lock + GC step
- [ ] Editor bootstrap shim (play-from-any-scene loads managers first)
Tier 2 — Production transitions
- [ ] Declarative scene sets + diff-based composition (handles tracked)
- [ ] Loading screen layer in the persistent scene, shown BEFORE teardown
- [ ] Honest progress: weighted phases, monotonic, activation+warmup in the
      last segment (never stuck at 90%, never backwards)
- [ ] Completion gates incl. shader/PSO warmup; failure -> safe context
Tier 3 — The full flow
- [ ] Boot init as a dependency graph (config -> save -> audio -> input ->
      localization -> online), gated "all ready" before Title
- [ ] Returning flows: logout = audited ResetSession() on every persistent
      manager; soft reset = InWorld -> InWorld(params); NG+ via params
- [ ] Cinematic context: state snapshot on enter, guaranteed restore on
      exit (skip = jump to final state, never an interruption)
- [ ] Auto-save on transitions; CanSave=false during transitions
Tier 4 — Online flow
- [ ] States: Auth -> ServerSelect -> VersionCheck/ResourceGate -> Connect
      -> EnterWorld handshake -> InWorld (the Genshin model: the client
      never reveals before the server ack)
- [ ] Queue, Maintenance, ForcedLogout, Reconnect (backoff + jitter) as FSM
      states — never as error popups bolted on
- [ ] Session revalidation at the END of long transitions (token can expire
      mid-load); travel failures -> safe context
- [ ] Per-step user-facing error codes (the Genshin 4206 model)
```

## Numbers (starting points — the citable cert ceilings are Microsoft's)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Non-interactive screen | ≤ 20 s hard (Xbox XR-001, public) | platform |
| Loading without / with progress | ≤ 2 min / ≤ 3 min (XR-001) | platform |
| Loading screen anti-flash | hold ≥ 0.5–1 s once shown | convention |
| Progress indicator choice | <1 s none · 1–3 s spinner · 3–10 s bar · 10 s+ bar+text | NN/g |
| Fade-to-black | 0.2–0.3 s light · 0.3–0.5 s standard · 0.5–1 s heavy | NN/g/Material-derived |
| Audio fade | longer than visual (~1–2 s music), starts with or before it | middleware practice |
| Splash logos | 2–4 s each, skippable when not contractual | convention |
| Login timeout | 10–30 s before "connection failed" | convention |
| Reconnect | 3–7 attempts, exponential backoff + jitter (1/2/4/8 s, cap ~32 s) | AWS guidance |
| Transition GC | full collect ~100–500 ms, behind the loading screen only | engine docs |
| PSO warmup | gate on remaining==0; empty-cache compile "under a minute" | UE docs |
| Saving icon | visible ≥ ~1 s even if the write is faster | community/cert-adjacent |

NDA'd values (PlayStation TRC, Lot Check timings, Genshin's AFK kick) are
flagged in [loading-lifecycle.md](./loading-lifecycle.md) — never state
them as fact.

## Engine mapping

| Generic block | Unity 6 | UE5 |
| --- | --- | --- |
| FSM owner | Plain C# FSM + one MonoBehaviour driver in the managers scene (or `RuntimeInitializeOnLoadMethod`) | A dedicated `UGameInstanceSubsystem` (GameInstance survives all travels) |
| Scene composer | Addressables `LoadSceneAsync(Additive)` — keep the handles; `SetActiveScene` for lighting; additive flow must call `UnloadUnusedAssets` explicitly | Persistent level + `LoadStreamLevel`/Level Instances; or map travel + Data Layers; World Partition owns spatial streaming *within* the world |
| Transition sequencer | `async Awaitable` chain (Unity 6 native, pooled, CancellationToken) | Subsystem-driven sequence; `OpenLevel` = hard travel (destroys all); **seamless travel** for multiplayer (persists PlayerController via `GetSeamlessTravelActorList`; WP combo needs 5.5+) |
| Gated activation | `allowSceneActivation=false` (progress caps at 0.9; **stalls the whole async queue** — one gated op at a time) | `OnLevelShown` delegates; MoviePlayer covers hard travel |
| Loading screen | Persistent-layer UI shown before teardown | **CommonLoadingScreen** (Lyra): `ILoadingProcessInterface` = the completion-gates concept productized |
| Shader warmup gate | `GraphicsStateCollection.WarmUp()` JobHandle (Unity 6; fallback `ShaderVariantCollection`) | PSO precaching (5.3+) + bundled cache; gate on `NumPrecompilesRemaining()==0` |
| GC | unload → `UnloadUnusedAssets` → `GC.Collect` behind the screen | `ForceGarbageCollection(true)` behind the screen; disable `s.ForceGCAfterLevelStreamedOut` for seamless streaming |
| Travel failure | try/catch → safe context | `OnTravelFailure`/`OnNetworkFailure` → `ReturnToMainMenuHost` |

## Failure modes

The 16 classic flow bugs (second-login state leaks, init races, scattered
LoadScene calls, interrupted transitions, memory never released, loading
screen too late, lying progress bars, unlocked input, audio bleed, double
bootstrap, token expiry mid-load, save corruption on quit-during-transition,
cutscenes not restoring state, editor-vs-build divergence, **shader/PSO
stutter on first traversal**, and **suspend/resume mishandled**) are
cataloged in [pitfalls.md](./pitfalls.md) with symptom → root cause →
prevention.
