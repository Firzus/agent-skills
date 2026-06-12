# Store model — the decoupled store, taxonomy, models

The data architecture. Platform numbers cited where public. References: Skyrim
changeforms, BotW GameData flags, souls journaling, Genshin server-side state.

## The decoupled store

- **Deltas keyed by stable IDs** — the two shipped shapes:
  - **Skyrim changeforms**: the save is a list of `{formID, changeFlags, version,
    data}` records storing *only what diverged* from base game data; load = layer
    overrides onto base records. FormIDs are authored-stable, so saves survive
    content patches. Transform-level persistence is **opt-in per reference**
    (`CHANGE_REFR_MOVE`), never universal.
  - **BotW GameData flags**: world persistence as a flat flag store — chest opened,
    enemy killed — where **each revival flag carries its reset policy**
    (`RevivalBloodyMoon`, `RevivalRandom`, `RevivalNone`). Saving the flag, not the
    actor, makes respawning data-driven.
- **Production shape**: persistent systems register with a save manager, each
  owning a named **bucket**; systems mark themselves dirty; a storage layer
  underneath handles throttling and platform IO.
- **Runtime state is a projection**: on load, rebuild from base + deltas. The store
  never holds engine handles/pointers — pure-data DTOs. Why the naive approach
  breaks: serializing scenes couples saves to object layout — any refactor or prefab
  restructure kills every existing save; removed objects orphan blobs.

## Data taxonomy

- **Buckets**: progression (append-mostly — the data players riot over),
  world-state deltas (per-region flags + respawn timers, scoped so unvisited regions
  cost zero), inventory (catalog IDs + instance data), profile preferences.
- **The settings split** (the menu-ui contract): machine-local (graphics, audio
  device, per-device keybinds) lives *outside* the save and is **excluded from
  cloud sync**; profile preferences (accessibility, difficulty) live in the synced
  save. Genshin illustrates it exactly: progression server-side, device settings
  local.
- **Lifetime categories**: persistent (the store) / session (survives scene loads,
  not quit) / ephemeral (never written).
- **What NOT to save**: derived caches (pathfinding, AI blackboards, computed
  stats), transient VFX, universal transforms, anything recomputable from seed +
  flags.

## Size discipline

Flags and bitfields, not per-entity blobs (the fog-of-war lesson); prune on every
save; measure growth per play-hour. Shipped anchors: flag-model saves run 1–5 MB
(TotK ~2.8 MB/slot, Elden Ring a *fixed* 2.6 MB); world-delta models start ~5 MB
and grow unboundedly without GC (Skyrim 5–20 MB+, BG3 19–30 MB; Cyberpunk corrupted
above 8 MB until patched — see [serialization.md](./serialization.md)).

## The four save models (details)

- **Checkpoints** trade granularity for reliability: known location, known-good
  state, "not in combat" enforced — fewer variables to QA. TLOU's hybrid (hand-placed
  checkpoints + scripted micro-saves capturing AI state) was described as one of the
  project's hardest systems — mid-state capture is expensive even for experts.
- **Save-anywhere**: arbitrary mid-state snapshots, many slots — convenience and
  accessibility, but undermines tension (failure is cheaply reversible).
- **Continuous (souls)**: saves on every interaction; single slot immediately
  overwritten; the save-and-quit resume point is consumed on load. Crash-survivable
  *because* console versions keep ~5 trailing saves and roll back to the nearest
  valid. "Not no saves — no going back."
- **Server-authoritative (Genshin/MMO)**: no local file, no slots; every action
  committed server-side as it happens. Costs: no offline, infra forever, account
  loss = total loss. The only complete anti-tamper answer. Full networked treatment
  in [networked.md](./networked.md).

**Hybrids are the good default**: continuous flag-store writes + periodic snapshot
saves (souls bonfires + permanent NPC state; BotW autosaves + always-current flags).

## Versioning & migration (overview)

- **Envelope from day 1**: magic, `schemaVersion` (≠ build version — bump only on
  shape changes), timestamp, checksum, metadata.
- **Migration chains**: pure, deterministic, one-way steps (`v3→v4→v5`), each one
  hop; per-version DTOs; write back only with the latest serializer. Test against a
  golden corpus of real saves from every shipped version, in CI. Live games
  accumulate 6–8 schema versions in a year.
- **Additive-only**: new fields get defaults; never reuse/repurpose field IDs;
  deprecate before removing. Full format-by-format detail in
  [serialization.md](./serialization.md).
- **Quarantine, don't delete**: orphaned references (cut content, uninstalled DLC)
  go to a quarantine list — restorable if the content returns, gracefully resolved
  otherwise.
- Saves carry a **content manifest** (the Skyrim plugin list) so the loader can warn
  or remap on missing DLC.

## Flagged gaps — do NOT invent

Genshin server internals (tick, batching, rollback) · industry corruption rates (no
published telemetry) · shipped save-write benchmarks.

## Sources

UESP Skyrim Save File Format/ChangeFlags · zeldamods GameDataMgr/Object respawning ·
taricorp TotK save teardown · Game Developer (*Save System Design*) · Polygon (TLOU
checkpoints) · GMTK (souls anti-scum).
