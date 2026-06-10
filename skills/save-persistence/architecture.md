# Architecture — store, taxonomy, versioning, atomicity, cloud

The components of a production save system. Platform numbers cited where
public; NDA'd values flagged. References: Skyrim changeforms, BotW
GameData flags, souls journaling, Genshin server-side state.

## The decoupled store

- **Deltas keyed by stable IDs** — the two shipped shapes:
  - **Skyrim changeforms**: the save is a list of
    `{formID, changeFlags, version, data}` records storing *only what
    diverged* from base game data; load = layer overrides onto base
    records. FormIDs are authored-stable, so saves survive content
    patches. Transform-level persistence is **opt-in per reference**
    (`CHANGE_REFR_MOVE`), never universal.
  - **BotW GameData flags**: world persistence as a flat flag store —
    chest opened, enemy killed — where **each revival flag carries its
    reset policy** (`RevivalBloodyMoon` = reset on blood moon,
    `RevivalRandom` = material respawn rolls, `RevivalNone` =
    permanent). Saving the flag, not the actor, makes respawning
    data-driven.
- **Production shape**: persistent systems register with a save manager,
  each owning a named **bucket**; systems mark themselves dirty; a
  storage layer underneath handles throttling and platform IO.
- **Runtime state is a projection**: on load, rebuild from base + deltas.
  The store never holds engine handles/pointers — pure-data DTOs.

## Data taxonomy

- **Buckets**: progression (append-mostly — the data players riot over),
  world-state deltas (per-region flags + respawn timers, scoped so
  unvisited regions cost zero), inventory (catalog IDs + instance data),
  profile preferences.
- **The settings split** (the menu-ui contract): machine-local
  (graphics, audio device, per-device keybinds) lives *outside* the save
  and is **excluded from cloud sync**; profile preferences
  (accessibility, difficulty) live in the synced save. Genshin
  illustrates it exactly: progression server-side, device settings
  local.
- **Lifetime categories**: persistent (the store) / session (survives
  scene loads, not quit) / ephemeral (never written).
- **What NOT to save**: derived caches (pathfinding, AI blackboards,
  computed stats), transient VFX, universal transforms, anything
  recomputable from seed + flags.
- **Size discipline**: flags and bitfields, not per-entity blobs (the
  fog-of-war lesson); prune on every save; measure growth per
  play-hour. Shipped anchors: flag-model saves run 1–5 MB (TotK
  ~2.8 MB/slot, Elden Ring a *fixed* 2.6 MB); world-delta models start
  ~5 MB and grow unboundedly without GC (Skyrim 5–20 MB+, BG3
  19–30 MB; Cyberpunk corrupted above 8 MB until patched).

## Versioning & migration

- **Envelope from day 1**: magic, `schemaVersion` (≠ build version —
  bump only on shape changes), timestamp, checksum, metadata.
- **Migration chains**: pure, deterministic, one-way steps
  (`v3→v4→v5`), each one hop; per-version DTOs; write back only with
  the latest serializer. **Test the chains** against a golden corpus of
  real saves from every shipped version, in CI. Live games accumulate
  6–8 schema versions in a year.
- **Additive-only**: new fields get defaults; never reuse/repurpose
  field IDs; deprecate before removing; re-baseline ancient chains.
- **Quarantine, don't delete**: orphaned references (cut content,
  uninstalled DLC) go to a quarantine list — restorable if the content
  returns, gracefully resolved otherwise (refund, mark abandoned). The
  map-pin lesson generalized.
- **Forward compatibility**: an older build loading a newer save
  **rejects with a clear message** (it happens constantly via cloud
  sync between an updated and a non-updated device).
- Saves carry a **content manifest** (the Skyrim plugin list) so the
  loader can warn or remap on missing DLC.

## The save models (details beyond the SKILL.md table)

- **Checkpoints** trade granularity for reliability: known location,
  known-good state, "not in combat" enforced — fewer variables to QA.
  TLOU's hybrid (hand-placed checkpoints + scripted micro-saves
  capturing AI state) was described as one of the project's hardest
  systems — mid-state capture is expensive even for experts.
- **Continuous (souls)**: saves on every interaction; single slot
  immediately overwritten; the save-and-quit resume point is consumed
  on load. Crash-survivable *because* console versions keep ~5 trailing
  saves and roll back to the nearest valid. "Not no saves — no going
  back."
- **Server-authoritative (Genshin)**: no local file, no slots; every
  pull/quest/pickup committed server-side as it happens. Disconnect
  behavior (community-reported, indicative only): reconnect grace, a
  rollback window of the last seconds of actions; teleporting to a
  waypoint reportedly forces a flush. Costs: no offline, infra forever,
  account loss = total loss. The only complete anti-tamper answer.

## Atomic writes & corruption defense

```
serialize → save.tmp (same volume) → fsync → atomic rename over target
keep: .bak (previous good) + checksum in the envelope
load: verify checksum → on failure fall back to previous-good SILENTLY
      ("restored from backup" — never "corrupt, start over")
```

- **fsync before rename** — without it, the rename can hit disk before
  the data (the ext4 zero-length-file lesson).
- **A/B alternation** (or last-N rotation) on top: Pokémon added it in
  Gen 3 after Gen 1's single 8-bit checksum made power-off-during-save
  fatal; Elden Ring keeps `.sl2` + `.bak` with embedded MD5.
- **Quit-during-save**: gate quit through the save system (the
  scene-flow `CanSave`/in-flight state); consoles buffer part of this
  OS-side (Xbox Connected Storage uploads even after the app closes).
- **Power-loss testing is mandatory**: kill the process mid-write, cut
  power, fill the disk, on every platform. Untested = corruption bugs.
- **Write async**; show the saving icon only when the write exceeds
  ~400 ms, hold it ≥1 s, and keep it until **fsync returns**, not
  serialization end.

## Slots, profiles & autosave UX

- **Taxonomy**: manual slots (8+ or unlimited), autosave ring (3–5 —
  Skyrim 3, BotW/TotK 5), quicksave (1–3 deep), one load menu,
  newest-first.
- **Triggers**: scene-flow transitions (a load screen is a free safe
  save point), checkpoints/objectives, rest interactions, a 3–5 min
  timer floor, and on quit. Suppressed while `CanSave` is false.
- **Anti-patterns**: saving during combat/mid-air/cutscenes (restores
  into chaos); **the death loop** — a single rolling autosave fired
  right before an unavoidable death (the Halo: Reach Warthog anecdote).
  **Rotation is the fix**: 3+ slots = step back 5 minutes instead of
  restarting. Single-slot is a deliberate design contract
  (souls/roguelike) paired with corruption fallbacks. Never overwrite
  the player's only manual slot from autosave logic.
- **Profiles**: separate namespaces per local user (consoles give it
  via the signed-in user; PC builds it). Single-progress-slot wipes are
  widely resented — don't, unless it's the contract.
- **Metadata sidecar** (outside the payload): timestamp, playtime,
  location, character, schema version, thumbnail — readable even when
  the payload is unloadable, so the UI can say "save from a newer
  version".

## Cloud sync & cross-platform

- **Public quotas**: Steam — developer-configurable (quota + file
  count; panel max ~93 GiB; ~30-day rolling backups); Xbox — **256 MB
  /user/title** (64 MB/file via XGameSaveFiles), OS-handled sync +
  conflict dialog; PSN user-facing — 100 GB PS5 + 100 GB PS4 per Plus
  account (per-title dev quotas NDA'd); Switch — no published limits
  (NDA'd), and titles **can opt out of cloud restore** (Pokémon/Animal
  Crossing do, precisely to block save-restore scumming); Play Games —
  **3 MB/snapshot**; iCloud KVS — 1 MB.
- **Conflict UX**: the dialog appears when both sides changed since
  last sync. Show **playtime + device + date on both options** or the
  choice is a coin flip. Caveat (GDK/PlayFab): conflicts are detected
  per container but resolved whole-save — "keep local" can silently
  discard unrelated cloud progress; keep the discarded branch for
  rollback.
- **Resolution strategies**: last-write-wins for settings only (clock
  skew loses progress); manual choice as the progression default;
  **merge is only possible because of the decoupled store** — monotonic
  flag stores and append-only journals merge by set-union/max; snapshot
  blobs cannot merge.
- **Cross-platform**: the account-linking model (Genshin: same account
  = same server-side data everywhere — nothing transfers because
  nothing leaves the server). Design the linking flow before shipping:
  Genshin's PSN linking is permanent, and first-login-on-PS silently
  binds data — a cautionary tale. Platform-specific/DLC content goes in
  optional, degradable sections of the shared payload.
- **Console suspend**: Xbox XR-001 tests that suspend/resume loses no
  progress — treat suspend as a mandatory fast save trigger (a
  delta/dirty-flag path completing well under a second; the exact
  budget is NDA-adjacent).

## Security (the pragmatic ladder)

Single-player local = the player's right to edit; spend effort on
corruption, not tampering. Then, as stakes rise:

```
checksum (always — corruption)
→ HMAC-SHA256, embedded key (leaderboards/achievements — raises the
  bar; any client key is extractable)
→ encrypt sensitive fields (paid unlocks; keep a dev plaintext flag)
→ server validation of submitted results (competitive)
→ full server authority (live-service — the Genshin answer: nothing
  local to tamper)
```

Handle tampered/corrupt files gracefully — a crash on a hostile file is
itself a bug. Never roll custom crypto.

## NDA'd / undocumented — never state as fact

Sony per-title quotas and TRC save texts · Nintendo per-title sizes,
cloud limits, lotcheck requirements · the Xbox suspend-handler seconds
budget · industry corruption rates (no published telemetry) · Genshin
server internals (tick, batching, rollback policy) · shipped save-write
benchmarks.

## Sources

UESP Skyrim Save File Format/ChangeFlags · zeldamods GameDataMgr/Object
respawning · taricorp TotK save teardown · Game Developer (*Save System
Design*, *Fixing the Impossible Auto Save Scenario*) · Polygon (TLOU
checkpoints) · GMTK (souls anti-scum) · Meta Horizon save best practices
(migration chains) · Microsoft GDK Game Saves + XR-001/XR-052 · PlayFab
conflict docs · Steamworks Cloud docs · Bulbapedia Gen 1–3 save
structures · Elden Ring save-manager format docs · OWASP Game Security
Framework · SPUD (UE World Partition persistence) ·
Unity-Technologies/guid-based-reference.
