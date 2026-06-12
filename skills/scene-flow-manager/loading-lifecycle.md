# Loading & lifecycle — async loading, PSO warmup, suspend/resume, cert, patching

The technical layer under the transition: how loads stay hitch-free, how
shaders avoid stutter, how the app survives being suspended at any moment,
and what cert/patching demand. The flow FSM and transition sequence are in
[fsm-composition.md](./fsm-composition.md); the player-facing waiting UX in
[flow-design.md](./flow-design.md). `[ESS]` = essential everywhere,
`[engine]`/`[platform]` = specific, `[NDA]` = don't cite specifics.

## Async loading & hitch-free loading

- **Synchronous loading stalls the main thread** `[ESS]`: a blocking load
  runs disk read → deserialize → GPU upload → object init in one frame; the
  render loop freezes (a hard lock). Never sync-load content during
  gameplay.
- **The background-load / main-thread-activate split** `[ESS]` — the hard
  rule: asset *data* can load on a worker thread, but **instantiation/
  activation (Awake/OnEnable, physics bodies, light registration, GPU
  resource creation) must be on the main thread** (engine internals aren't
  thread-safe). Unity's `LoadSceneAsync.allowSceneActivation = false`
  splits the two: progress climbs to **0.9 = loaded-not-activated**,
  flipping to `true` runs the main-thread activation. Caveat: while it's
  `false`, *all* in-flight async ops stall at 90% — gate one at a time.
- **The activation-hitch fix** `[engine]`: build the scene with roots
  **disabled**, then **progressively activate N objects per frame**,
  yielding when a ~10 ms budget is exceeded.
- **Async patterns** `[engine]`: Unity Awaitable (`MainThreadAsync`/
  `BackgroundThreadAsync` — switching back to main resumes only next
  Update, so thread ping-pong costs a frame each); UniTask (struct-based,
  allocation-free, runs on a custom PlayerLoop); UE `FStreamableManager.
  RequestAsyncLoad` returning an `FStreamableHandle`.
- **Asset handles & lifetime** `[engine]`: an active `FStreamableHandle`
  keeps its assets (and the whole transitive dependency closure) resident;
  release it when the owner dies. Prefer **soft references**
  (`TSoftObjectPtr`) — hard refs defeat streaming and balloon the resident
  set.
- **Hitch sources** `[ESS]`: shader/PSO compile (below), **GC spikes**
  (schedule manual GC after transitions, never mid-action), asset
  instantiate/activation, GPU buffer allocation, physics bake.

## Memory during transitions

- **The double-resident problem** `[ESS]`: **crossfade (load-then-unload)**
  keeps the old level resident until the new one is ready — smooth but
  **both levels in memory → a peak** that risks OOM on fixed-budget
  consoles. **Unload-then-load** fits the budget but shows a gap. The
  choice is driven by the memory budget; a lightweight **transition map**
  that holds neither full footprint is the common console mitigation.
- **Mip-streaming convergence before reveal** `[ESS]`: on an instant camera
  cut the mip system needs time to stream textures (time-sliced), so
  there's a delay before they converge — reveal too early and you get the
  low-res first frame. Preload via a Streaming Controller on the disabled
  target camera (`SetPreloading`), poll the pending-load count to zero,
  wait a few frames, *then* reveal. Texture streaming has its **own**
  memory budget (Unity default 512 MB) separate from asset residency; if
  exhausted, textures stay permanently blurry.

## Shader / PSO compilation & warmup

- **The PSO-stutter plague** `[ESS]`: a **Pipeline State Object** packages
  shaders + vertex layout + blend/raster/depth state as one immutable unit
  (DX12/Vulkan/Metal). Unlike DX11's driver pre-compile, modern APIs make
  the *app* declare full state and compile **just-in-time** — generating a
  PSO at draw time can take **100+ ms**, the "shader-comp / traversal
  stutter" (random freezes in new areas, gone on the 2nd playthrough as
  caches build). DX12/Vulkan made it worse than DX11 by shifting this
  responsibility to the app.
- **Warmup strategies** `[engine]`: a **bundled PSO cache** (record PSOs in
  dev playthroughs → compile the exact minimal set at startup) plus UE
  **PSO precaching** (5.1/5.2+, auto — at load time it inspects materials +
  mesh + quality settings and compiles a subset asynchronously while the
  loading screen shows; stream-in objects wait a few frames or render with
  a default material). The two together: precaching compiles ~4–5× more
  permutations than used; a bundled cache narrows it to ~2–4×.
- **The warmup-during-loading gate** `[ESS]`: hold the loading screen until
  precompiles drain (UE: until `NumPrecompilesRemaining() == 0`). This is
  the completion-gate from [fsm-composition.md](./fsm-composition.md)
  applied to shaders.
- **Steam shader pre-caching** `[platform]`: Steam downloads pre-compiled
  hardware-specific shaders (Valve's Fossilize serializes Vulkan pipeline
  state into crowd-sourced `.foz` files) — the "Processing Vulkan shaders"
  pre-launch step.
- **Gathering PSOs in QA** `[ESS]`: QA/dev playthroughs record the PSO list
  that ships in the build — coverage = how much QA actually traversed;
  missed permutations = shippable stutter.

## App lifecycle — suspend/resume

The app can be **backgrounded or suspended at any moment** — design for it
`[ESS]`:

- **Xbox (GDK)** `[platform]`: Suspend / Constrain / Resume callbacks.
  **Constrained** = throttled/non-visible (a dialog on top) but running;
  **Suspended** = frozen, state held in memory. Triggers: Connected
  Standby, or out of focus for 10 minutes.
- **The suspend budget** `[platform]`: the suspend handler must finish fast
  — ~5 s on legacy UWP (request a deferral, call `Trim()` to release GPU
  buffers), ~1 s on GDK Xbox (`SuspendX()`). **Auto-save on suspend**
  `[ESS]` because suspend can precede termination without a guaranteed
  resume.
- **Quick Resume (Xbox Series)** `[platform]`: multiple games suspended to
  SSD for near-instant resume; up to 2 pinned (a mandatory update drops it
  from Quick Resume). The hard case: **resume into a weeks-old session** —
  token/network/state can be stale, so detect and recover gracefully (this
  is why session revalidation at the *end* of a transition matters —
  [fsm-composition.md](./fsm-composition.md)).
- **Mobile** `[platform]`: Android `onPause` is brief and **not** a safe
  save point; **process death** is not guaranteed to call `onDestroy` —
  restore via `onSaveInstanceState` / `SavedStateHandle`. iOS suspends then
  may **terminate without notice** (jetsam) — save on backgrounding.

## Platform cert (public only)

- **The checklist families** `[platform]`: Sony **TRC**, Xbox **TCR/XR**,
  Nintendo **Lotcheck** — ~100+ requirements; **every patch/DLC re-certs**.
  `[NDA]` the full texts are partner-portal only — do not cite numbered
  items beyond what holders publish openly.
- **Public boot/flow-relevant categories**: title stability across
  suspend/resume (Xbox **XR-001** is public — resume without crash, input
  recognized, **no lost save**; returning to a menu requiring manual
  reconnect after an online suspend is acceptable), controller-disconnect
  handling, storage hot-swap, profile/account switching, save-data rules,
  loading behavior, error-message standards, localization (declared
  languages match content, no overflow). Age rating is a **separate**
  per-territory track (legal/health/age-gate screens belong here).
- **What fails cert in boot/flow**: crashes during suspend/resume, improper
  save handling, debug strings left in, deprecated APIs, controller/network
  interruption mishandling. Platform emphases: Sony — profile switching
  during suspend; Xbox — mid-save Quick Resume + storage hot-swap; Nintendo
  — Joy-Con detach + handheld↔docked.

## Patching & updates

- **The download-before-play gate** `[ESS]`: forced-update gates block
  online entry until the client is at/above the required version; a
  **version mismatch on connect** routes to an update prompt, never a
  silent fail. The launcher often owns the update (you can't enter old).
- **Delta / differential patching** `[platform]`: Steam SteamPipe splits
  files at ~1 MB chunk boundaries and downloads only changed chunks
  (manifest diff: unchanged SHA → skip, changed → fetch differing chunks).
  Chunks are LZMA-compressed + AES-encrypted per depot (so CDN/LAN caches
  serve all users).
- **Resume + double-disk cost** `[ESS]`: patches copy old→new (unchanged
  chunks copied locally, new chunks downloaded), then delete the original —
  so interrupted downloads are **safe to resume** (original intact), but
  you need **disk for both copies**, and **even a one-chunk change rewrites
  the whole file**. Split content into depots (by language/platform) and
  keep pack-file sizes sane to minimize patch + install cost.
- **Background download/preload** `[platform]`: Steam preloads land
  encrypted, decrypted at release. Day-one patches and A/B partition
  updates (download to an inactive partition, switch on reboot) are the
  console/mobile patterns `[NDA]` for specifics.

## Sources

Unity (Await support, Texture/mesh loading, Mipmap Streaming API,
`asyncUploadTimeSlice`) · Cysharp UniTask · Epic (Async Asset Loading,
FStreamableManager, "Optimizing Rendering with PSO Caches", "Game engines
and shader stuttering") · smoothfps shader-stutter guide · ValveSoftware/
Fossilize · MS Learn (GDK, XR-001 Title Stability, How to suspend an app) ·
Xbox Support (Quick Resume) · Android Developers (activity-lifecycle,
process-lifecycle, saving-states) · NCL TRC Workshop / ixiegaming (cert
overview) · steamdb (SteamPipe, depots, chunked delta). Flags: `[NDA]`
numbered TRC/Lotcheck items and exact per-gen suspend budgets are partly
NDA — figures above (5 s UWP, 1 s GDK, 10-min suspend, 2-pin) are public;
UE PSO-precaching version (5.1 vs 5.2) and the permutation multipliers are
illustrative.
