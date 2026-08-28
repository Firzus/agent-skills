# FSM & composition — contexts, scenes, transitions, boot, online

The flow engineering: the context FSM, scene composition, the atomic
transition, boot, the online flow, returning flows, and cinematic
contexts. All numbers are **starting points**; the only public citable
cert ceilings are Microsoft's (XR-001). The loading *tech* (async,
PSO warmup, suspend/resume, cert, patching) is in
[loading-lifecycle.md](./loading-lifecycle.md); the player-facing flow
*design* (FTUE, title, loading/error UX) in
[flow-design.md](./flow-design.md).

## The context FSM

- **Context vs screen**: a context defines which world is loaded (scene
  set, active systems, input mode); screens are UI within it
  (`menu-ui-manager`). `Title → Settings` = screen navigation;
  `Title → InWorld` = context transition. Test: needs scene load/unload?
  → context.
- **Flat FSM for top-level contexts** (you never stack Title on InWorld);
  push/pop semantics only for overlay states (Cinematic over InWorld).
- **Ownership**: a root persistent owner above everything — never an
  in-scene object (it would be destroyed by the transition it drives).
- **One API**: `RequestTransition(target, params)` with a legality table;
  illegal requests rejected and logged. The `params` payload carries
  NG+/chapter/spawn-point context — re-entry with parameters is how soft
  reset (`InWorld → InWorld(params)`) and chapter select work.

## Scene composition

```
Boot (index 0, minimal)            — starts the flow, nothing else
PersistentManagers (never unloaded) — audio, save, input, localization,
                                      UI root, loading screen, FlowManager
Per-context content sets (additive) — declared as data per context:
  Title   = {Managers*, TitleScreen}
  InWorld = {Managers*, GameplayUI, World_Region}
```

- Engine docs themselves recommend the managers scene over scattered
  DontDestroyOnLoad (no singleton duplication, explicit dependencies,
  full lifecycle control).
- **Diff-based transitions**: unload what's not in the target set, load
  what's missing, keep the intersection untouched — transitions are pure
  data, shared scenes survive (faster transitions for free).
- Track every loaded scene/handle explicitly in the composer — it owns
  them and releases them at teardown (the handle-lifetime rules are in
  [loading-lifecycle.md](./loading-lifecycle.md)).

## The atomic transition

The 7-step sequence (see [overview.md](./overview.md)). Key refinements:

- **The loading screen lives in the persistent layer** and is verified
  visible *before* the first destructive step.
- **Save before the transition, never during** — the FSM exposes
  `CanSave`, false during transitions; atomic writes (temp-then-rename);
  quit-during-transition waits for any pending write.
- **The GC step**: unload → release handles → `UnloadUnusedAssets`
  (Unity; additive flows never trigger it automatically) → full collect.
  ~100–500 ms, content-dependent — the loading screen is the only place
  this is acceptable.
- **Completion gates are barriers, never timers**: systems-ready, PSO
  warmup remaining == 0 ([loading-lifecycle.md](./loading-lifecycle.md)),
  texture streaming converged, server ack (online). UE's
  `ILoadingProcessInterface` (CommonLoadingScreen) is this concept
  productized: any system registers as a reason to hold the screen.
- **Failure mid-transition**: abort to a safe context (Title) with an
  error dialog; teardown must be re-executable; log the exact failing
  step.

## Loading screens & progress

- **Types**: fade-only (<1–2 s), full screen with progress + tips (the
  live-service standard), interactive (the Namco patent expired in 2015 —
  [flow-design.md](./flow-design.md)), diegetic/masked (corridors, GoW's
  cutscene-as-loading-mask).
- **Honest progress**: real progress is erratic — the standard is
  **weighted phases, smoothed, monotonic by construction** (clamp to max
  reached), with a reserved tail (~90–100%) for activation + warmup. A
  determinate bar that accelerates near the end is perceived as faster
  (the progress-bar psychology is in [flow-design.md](./flow-design.md)).
  If you can't be honest, show an indeterminate indicator instead of a
  lie.
- **Indicator by wait length** (NN/g): <1 s nothing · 1–3 s spinner ·
  3–10 s determinate bar · 10 s+ bar + status text. Tips rotate ~5–10 s.
- **Anti-flash**: once shown, hold ≥0.5–1 s (Halo Infinite added a fake
  minimum-duration screen because real loads were sub-second).
- **Cert ceilings (public, Xbox XR-001)**: any non-interactive screen
  >20 s = fail; loading >2 min without progress indicator = fail; >3 min
  with = fail. PlayStation TRC and Nintendo figures are **NDA'd** — never
  state circulated numbers as fact ([loading-lifecycle.md](./loading-lifecycle.md)).
- **What runs during loading**: PSO/shader warmup (gate on it), asset/pool
  prewarm, save migration, audio bank loads, server handshakes.

## Boot sequence

- **Order as a dependency graph**: platform services → config → save
  (settings) → audio → input → localization (needs saved language) →
  online/auth. Async init in topological order, independent branches in
  parallel; `Splash → Title` gated on all-critical-ready. Never auto-init
  in Awake/BeginPlay — the bootstrap drives, explicitly.
- **Splash**: platform/legal logos (2–4 s each, skippable when not
  contractual) mask early init. Unity 6: the splash is now removable on
  all tiers including Personal — if removed, Boot owns the first visible
  frame. UE: no branding requirement (logo use needs a separate
  trademark license).
- **First boot vs warm boot**: first adds EULA/consents, save container
  creation, language select, calibration, bundled PSO compile (gate on
  it). The flow parameterizes the branch (FTUE design:
  [flow-design.md](./flow-design.md)).
- **Crash recovery**: corrupted-save detection (checksum/version) → user
  dialog (restore backup / reset), never silent; N consecutive failed
  boots (~2–3) → safe mode / graphics reset offer. Data loss is a cert
  failure class.

## The online flow (the Genshin model)

States, not error popups:

```
Title → Auth (account/token; silent refresh at ~75-80% of token lifetime)
      → ServerSelect (dispatch returns region list + gateserver)
      → VersionCheck / ResourceGate (hot-update download BEFORE entry;
        mismatch → Title with update prompt)
      → Connect (key exchange, session)
      → EnterWorld handshake — the documented Genshin sequence:
        server EnterSceneNotify → client ready → client loads →
        SceneInitFinish → EnterSceneDone → server spawns entities
        ★ the client NEVER reveals before the server ack — online
          transitions are co-piloted by the server
      → InWorld
```

- **Queue**: a waiting context with position (estimated time only when
  confident — the queue UX is in [flow-design.md](./flow-design.md)).
  **Maintenance**: signaled by dispatch pre-auth → message → Title.
  **ForcedLogout** (session invalidated, concurrent login, kick): full
  clean teardown → Title + dialog — never a partial return.
- **Reconnection**: N attempts (3–7) with exponential backoff + jitter
  (1/2/4/8 s, cap ~32 s — the AWS guidance; jitter prevents reconnection
  storms); servers typically keep a grace window with the avatar
  in-world; failure → Title.
- **Session revalidation at the END of long transitions** — tokens expire
  mid-load; re-validate before activating gameplay. This is also the
  Quick-Resume stale-session recovery
  ([loading-lifecycle.md](./loading-lifecycle.md)).
- **Per-step user-facing error codes** (the Genshin model: "Error 4206" +
  plain sentence + suggested action): auth failed / version mismatch /
  server full / maintenance / network lost are *distinct* messages (the
  error-UX craft is in [flow-design.md](./flow-design.md)).
- AFK timeouts: the 10–30 min band is community convention (Genshin's
  "15 min" is lore, not documented) — pick yours, route through the
  ForcedLogout path.

## Returning flows

- **Logout = the full-teardown test.** The "second login differs from
  first" bug class comes from partial teardown: static events still
  subscribed, pools not cleared, persistent managers never reset.
  Mitigation: an `IResettable`/`ISessionScoped` interface on every
  persistent manager, `ResetSession()` called by the FSM on logout; ban
  unregistered mutable statics; **smoke-test two login/logout cycles in
  CI**.
- **Character/server switch**: logout variant returning to Lobby; tear
  per-character state, keep account-level (token, settings).
- **Soft reset** (bonfire/checkpoint): declared *partial* teardown —
  `InWorld → InWorld(params)`, re-init dynamic state without unloading
  scenes. Same FSM, not a separate code path.
- **Re-entry safety**: re-show regional health warnings on the boot path;
  re-validate session/version instead of assuming first-login state.

## Cinematic contexts

- In-engine cutscene = a **pushed overlay state** (InWorld stays loaded;
  pop to resume); pre-rendered video or other-world cutscenes = full
  contexts.
- **Enter takes a state snapshot** (input mode, HUD, time scale, audio
  snapshot, camera); **exit restores it — guaranteed**, including on skip
  and on error (try/finally semantics). Never mutate globals outside
  enter/exit (the cutscene side is `cinematic-system`).
- **Skip = jump to the final state, not an interruption**: every step
  knows how to complete instantly (positions, camera, inventory, flags).
- A cutscene ending elsewhere = its exit is a `RequestTransition` to the
  new context, with the target world loading *during* the cutscene (the
  cutscene is the loading mask — GoW/FFXIV pattern).

## NDA'd / undocumented — flag, never state

PlayStation TRC timings, Nintendo Lot Check, Genshin's AFK kick value and
handshake internals, tip-rotation standards, exact anti-flash minimums.
The only public citable cert numbers are Microsoft's 20 s / 2 min / 3 min
(full cert detail in [loading-lifecycle.md](./loading-lifecycle.md)).

## Sources

Game Programming Patterns (State, Singleton) · Unity 6 docs (SceneManager,
Addressables, Awaitable, domain reload, splash) · Epic docs (travel,
GameInstance subsystems, Level Streaming Hitching Guide) · Lyra
CommonLoadingScreen · Grasscutter/hk4e ecosystem (the documented Genshin
dispatch→gate→EnterScene flow) · Microsoft GDK XR-001 (public) · NN/g
(response times, progress indicators) · AWS Builders' Library (backoff +
jitter) · CodeSmile bootstrap · Mortoray editor bootstrap shim. Loading-
tech and cert sources in [loading-lifecycle.md](./loading-lifecycle.md);
flow-design sources in [flow-design.md](./flow-design.md).
