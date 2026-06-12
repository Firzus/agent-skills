# Pitfalls — the 16 classic fast-travel failure modes

Each: symptom → root cause → prevention. Read before designing;
re-read when players fall through the world on arrival or a quest
leaves teleport locked forever. Deep dives:
[unlock-reveal.md](./unlock-reveal.md),
[waypoint-registry.md](./waypoint-registry.md),
[teleport-sequence.md](./teleport-sequence.md),
[design-policy.md](./design-policy.md).

## 1. Teleport before residency

- **Symptom** — the player arrives and falls through the ground, or
  floats in the void for seconds (New World's documented
  "falling through the map for 5 minutes" post-fast-travel; Minecraft
  MC-228420).
- **Root cause** — the character is placed before target cells/
  collision finish streaming.
- **Prevention** — a mandatory residency gate: UE5's documented flow
  (streaming source at destination → `Is Streaming Completed` →
  teleport → disable source, `bBlockOnSlowLoading`); Unity: await the
  load handles + a ground raycast before releasing the fade. The
  gates are `open-world-streaming`'s — a teleport is a streaming jump.

## 2. Camera whiplash

- **Symptom** — the camera lerps across the entire map after the warp;
  the spring arm violently retracts.
- **Root cause** — camera damping/lag interprets the teleport as
  movement to smooth.
- **Prevention** — Cinemachine 3: `CinemachineCore.OnTargetObjectWarped`
  (static; pass the *exactly tracked* transform — a parent/child does
  nothing) or `PreviousStateIsValid = false` for a full snap. UE5:
  toggle `bEnableCameraLag` around the teleport. The fade masks the
  residue.

## 3. Physics state leaking through

- **Symptom** — the character flies off on arrival, or visually
  streaks across the map for one frame (Warframe's /unstuck is
  documented broken precisely because it "doesn't reset your velocity
  completely").
- **Root cause** — velocity carried over; interpolation smoothing
  between old and new positions. UE5 `ETeleportType::None`
  *recomputes* velocity from the position delta — the fly-away bug.
- **Prevention** — explicit velocity zeroing; Unity: toggle
  `interpolation = None`/restore around the position set +
  `Physics.SyncTransforms()`; UE5: `TeleportPhysics` + zero
  `CharacterMovement->Velocity`, detach from any movable base first.

## 4. Unsafe spawn points

- **Symptom** — spawning into enemies, into quest-moved geometry, onto
  another player in co-op, or on the wrong floor. Real case: BotW's
  patched Fast Travel Softlock — warping to a shrine with a horse
  parked on the arrival point seated Link at an invalid angle.
- **Root cause** — the spawn point is static data never revalidated at
  runtime.
- **Prevention** — spawn point ≠ marker (designated offset + facing);
  capsule overlap validation at arrival with fallback offsets; local
  enemy depop or a short pacification; co-op spawn slot resolution.

## 5. Float precision far from origin

- **Symptom** — visual and physics jitter at map edges.
- **Root cause** — 32-bit floats: Unity physics issues reported from
  ~2–10 km out (HDRP's camera-relative rendering saves visuals only).
- **Prevention** — UE5 ≥ 5.1: LWC doubles solve it natively. Unity:
  floating origin — **the teleport fade is the ideal re-centering
  moment** (the shift is invisible behind the screen).

## 6. Stale state after teleport

- **Symptom** — enemies "chase" across the map; buffs/timers
  misbehave; the previous region's weather/audio still plays.
- **Root cause** — aggro, half-executed quest triggers, and regional
  subscriptions aren't reconciled in the sequence.
- **Prevention** — an explicit restore step: clear aggro/combat,
  resubscribe region systems (weather, audio, spawn director), buffs
  preserved *by design* (Genshin's food buffs tick through —
  documented, not accidental). Genshin's boss-reset-on-leaving is a
  deliberate policy, not a leak.

## 7. Save during teleport

- **Symptom** — a save written mid-sequence corrupts position state;
  reload spawns under the floor.
- **Root cause** — autosave captures a transient state (position set,
  streaming unfinished, flags half-written).
- **Prevention** — `CanSave = false` for the whole sequence
  (`save-persistence`); re-enable only after the reveal. Genshin's
  pattern inverts it usefully: the teleport itself forces a confirmed
  server sync *after* completion — arrival is a save point, transit
  never is.

## 8. Unlock flag desync

- **Symptom** — map revealed but waypoints locked (or the inverse); a
  tower activated but not persisted; co-op guests inherit or lose
  unlock state.
- **Root cause** — terrain reveal and waypoint registry hold separate
  sources of truth written at different times.
- **Prevention** — one unlock model (region flag + per-POI flags) from
  which both UIs derive; atomic save writes (the activation grants
  reveal + waypoint in one transaction); an explicit co-op rule
  (Genshin: exploration progresses only in your own world —
  guest-side unlocks, host-authoritative world).

## 9. Teleport exploits

- **Symptom** — combat/boss escapes, quest-sequence skips,
  fall-damage cancels, wrong-warps into closed zones (BotW's Moon
  Jump Wrong Warping glitch rode a corrupted physics state through a
  Travel Medallion warp).
- **Root cause** — the policy matrix doesn't cover every player state.
- **Prevention** — write the matrix (combat / falling / scripted
  quest / instance / co-op) and decide each cell **as design**:
  Genshin *chose* to allow mid-fall teleport as the fall-damage
  escape and documents it; BotW *chose* free mid-combat warps. A
  chosen exploit is a feature; an unchosen one is a bug. Test each
  cell as content.

## 10. The multi-layer map mismatch

- **Symptom** — the player taps a waypoint at position X and arrives
  "elsewhere" — typically the wrong vertical level (Sumeru's
  underground waypoints displayed as surface ones sent players into
  caves; the Chasm needed a separate underground map, which still
  flattens ~9 stacked levels).
- **Root cause** — a 2D map projecting overlapping 3D waypoints.
- **Prevention** — the layer is **waypoint data**: distinct icon
  (sub-icon), layer-switch UI, dashed off-layer indicators, and the
  spawn carries its layer — never inferred from 2D position.

## 11. Input/UI races during the sequence

- **Symptom** — a menu opened mid-fade; double teleport requests; a
  cancel during streaming leaves crossed states.
- **Root cause** — the sequence isn't an exclusive state machine;
  input isn't locked from confirmation.
- **Prevention** — input lock at confirm; the sequence is
  uninterruptible (or has defined cancel points strictly before the
  streaming-source move); idempotent requests (ignore any request
  while one runs).

## 12. The lying loading screen

- **Symptom** — infinite load; frozen progress bar.
- **Root cause** — a residency gate with no timeout: a corrupted
  target cell or a streaming stall waits forever.
- **Prevention** — timeout on the gate + fallback (retry, degraded
  spawn at a known-safe position, error message); telemetry on
  residency times; UE5: never "fix" it with `FlushAsyncLoading` (a
  documented game-thread hitch).

## 13. Density and pacing mistakes

- **Symptom** — traversal trivialized (the world becomes "a series of
  loading screens") or players rage at back-tracking.
- **Root cause** — the cannibalization tension unmanaged: fast travel
  competes with the content between POIs.
- **Prevention** — earned-only unlocks; density calibrated by playtest
  against the two shipped poles (BotW ~800 m vs Genshin ~200 m
  spacing); waypoints adjacent to real activity hubs (the
  last-100-meters principle — a waypoint leaving a 3-minute walk
  reads as punitive).

## 14. Cross-instance teleport leaks

- **Symptom** — leaving a domain/instance keeps it alive (timers,
  boss, audio); re-entering the world at a stale position.
- **Root cause** — the teleport bypassed the scene state machine's
  exit handshake. UE5: instance streaming destroys nothing
  automatically; seamless travel persists only what's explicitly
  listed.
- **Prevention** — cross-instance teleports go through
  `scene-flow-manager` (instance teardown, return-position snapshot
  taken at **entry**, not exit) — never a raw streaming-source move.

## 15. Tower fatigue & icon soup

- **Symptom** — the reveal loop degenerates into "climb tower → check
  off icons"; the map drowns in `?` markers; the world becomes "a
  spreadsheet with pretty scenery" and players stop exploring unaided.
- **Root cause** — per-region tower reveal auto-populating every POI
  icon (the Ubisoft-tower pattern), often used to paper over low world
  density (the Ghost Recon Breakpoint confession: "checklists are
  reassuring for our brains").
- **Prevention** — choose the reveal method deliberately
  ([unlock-reveal.md](./unlock-reveal.md)): reveal *terrain* but let
  players spot POIs (BotW); proximity reveal that rewards real
  exploration; an Exploration Mode (geographic directions, no quest
  markers); category filters and decluttering. Fix world density rather
  than hiding it behind icons.

## 16. Seamless-travel streaming failure

- **Symptom** — a "no-loading-screen" fast travel stalls, pops in
  ungrounded geometry, or hands control back before the destination is
  resident; on slower storage the masked jump hitches hard.
- **Root cause** — the streaming budget exceeds the mask duration, or
  control is released before residency, or the design assumed SSD-class
  I/O that the target hardware doesn't have.
- **Prevention** — the rule ([teleport-sequence.md](./teleport-sequence.md)):
  seamless = (stream budget ≤ mask duration) OR (I/O fast enough to skip
  the mask). Size the masking animation/"valve" to the worst-case stream
  time on the slowest target storage; only hand control back **after**
  residency is confirmed (the GoW Ragnarök "dump behind, load ahead, but
  only after the squeeze finishes" rule); profile on HDD, not just NVMe.

## Debugging order

When fast travel misbehaves: (1) teleport to the farthest cold cell
and watch the residency gate (#1, #12), (2) teleport with damping
cameras active and no fade (#2), (3) teleport while sprinting and
falling (#3, #9), (4) park something on every spawn point (#4),
(5) teleport mid-combat and check aggro/weather/audio (#6),
(6) spam the confirm button and open menus mid-fade (#11),
(7) teleport between map layers in both directions (#10),
(8) save-reload around the sequence boundaries (#7).

## Ship checklist

```
- [ ] Residency gate with timeout + fallback on every teleport path
- [ ] Velocity zeroed, interpolation reset, camera warp-notified —
      no fly-away, no streak, no whiplash with fade disabled
- [ ] Every spawn point overlap-validated with fallback offsets
- [ ] Origin shift (Unity) or LWC (UE5) verified at map corners
- [ ] Restore step: aggro, region systems, buffs — all explicit
- [ ] CanSave=false through the sequence; save-reload at boundaries
      restores sanely
- [ ] One unlock model: map UI and travel UI derive from the same
      flags; activation writes are atomic
- [ ] The restriction matrix written, each cell decided and tested
- [ ] Multi-layer waypoints carry their layer; no 2D inference
- [ ] Requests idempotent; input locked from confirm
- [ ] Cross-instance teleports tear down through the scene-flow
      handshake; return position snapshotted at entry
- [ ] Density reviewed against POI walk-times (last 100 meters)
- [ ] Reveal method chosen; no tower→icon-soup; world density real
- [ ] Seamless travel sized to worst-case stream time on slowest
      storage; control released only after residency
```
