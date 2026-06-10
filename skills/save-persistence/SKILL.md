---
name: save-persistence
description: >-
  Architecture blueprint for game save systems: the versioned store decoupled
  from runtime objects (deltas keyed by stable IDs, the world-state store for
  chests/doors/kills), save data taxonomy and the machine-vs-profile settings
  split, schema versioning with migration chains, the four save models
  compared (checkpoint, save-anywhere, continuous souls-style, server-
  authoritative Genshin-style), atomic writes and corruption defense
  (temp-then-rename, A/B rotation, checksums), slots/autosave UX (rotation
  against death loops), cloud sync and conflict resolution, cross-platform
  saves, and the tamper-protection ladder. References: Skyrim changeforms,
  BotW revival flags, Dark Souls journaling, Genshin server-side state. Use
  when designing or building save/load, autosave, save slots, world
  persistence, cloud saves, or when saves corrupt, bloat, or break on game
  updates.
---

# Save & Persistence

Build the save system of a game. References: Skyrim's changeform deltas,
BotW's revival flags, Dark Souls' continuous journaling, Genshin's pure
server-authoritative state (the contrast), and platform cert/cloud
practices. This skill fills the world-state store referenced by
`open-world-streaming`, `enemy-ai-framework`, and `minimap-worldmap`, the
settings split referenced by `menu-ui-manager`, and the `CanSave` gate of
`scene-flow-manager`. Excluded: netcode and server economy internals.

## The architecture rule

**The save is a versioned store decoupled from runtime objects.** Systems
write **deltas keyed by stable IDs**; the store is the single source of
truth; runtime state is a projection rebuilt from `base game data + save
deltas` on load. Never serialize live scene objects.

```
Envelope: { magic, schemaVersion, timestamp, checksum, metadata }
Buckets (one per persistent system, registered with the save manager):
  progression   — quests, unlocks, stats (append-mostly)
  worldState    — per-region flag sets (chest/door/kill), respawn
                  timers keyed by STABLE IDs (the BotW revival-flag
                  model: the flag carries its reset policy)
  inventory     — catalog IDs + counts + instance data
  profile prefs — accessibility, difficulty (cloud-synced)
Machine settings (resolution, keybinds) live OUTSIDE the save store —
  never cloud-synced (the menu-ui split).
```

Save only **authoritative state that cannot be deterministically
reconstructed**; recompute everything else. Why the naive approach breaks:
serializing scenes couples saves to object layout — any refactor, rename,
or prefab restructure kills every existing save; removed objects orphan
blobs.

## Pick your save model (a design contract, not a tech detail)

| Model | Mechanics | Fits |
| --- | --- | --- |
| Checkpoint | designer-chosen points, small known state set | linear action (GoW, Uncharted) |
| Save-anywhere | arbitrary mid-state snapshots, many slots | PC RPGs/sims (Skyrim) |
| **Continuous (souls)** | write on every significant event, single slot — "not no saves: no going back"; quit-anywhere works because the journal is always current | consequence-driven design |
| **Server-authoritative (Genshin)** | no local file at all; every action persisted server-side; the client is a view | live-service/gacha — scumming structurally impossible, cross-device free, but no offline and infra forever |

**Hybrids are the norm and the good default**: continuous flag-store
writes + periodic snapshot saves (souls bonfires + permanent NPC state;
BotW autosaves + always-current flags). Continuous saving *requires* the
corruption machinery below — you're writing constantly.

## Build order (4 shippable tiers)

```
Tier 1 — A save that survives
- [ ] Envelope with magic + schemaVersion + checksum FROM THE FIRST FILE
      EVER WRITTEN (unversioned saves = forensics later)
- [ ] DTO layer decoupled from runtime types; buckets per system
- [ ] Atomic write: temp -> fsync -> rename; .bak kept; loader falls
      back to previous-good SILENTLY (gentle message, never "start over")
- [ ] CanSave gate wired to scene-flow (no saves during transitions)
Tier 2 — World persistence & slots
- [ ] World-state store: stable-ID flags per region (reset policies per
      flag — the BotW model), scoped so unvisited regions cost 0 bytes
- [ ] Stable IDs: authored GUIDs (never hierarchy paths/instance IDs)
- [ ] Slots: manual + autosave ring (3-5, the anti-death-loop) +
      metadata sidecar (timestamp, playtime, location, thumbnail —
      readable even when the payload version isn't)
- [ ] Autosave triggers: transitions (scene-flow events), checkpoints,
      timer floor (3-5 min), on quit; suppressed while CanSave=false
Tier 3 — Updates & async
- [ ] Migration chains: pure one-way steps v3->v4->v5, additive-only
      fields, never reuse field IDs; golden-save corpus in CI
- [ ] Quarantine orphaned references (cut content, missing DLC) —
      degrade, never crash or silently delete
- [ ] Async writes: snapshot on main thread -> serialize + IO on a
      background thread; saving icon only if >~400 ms, held >=1 s,
      until fsync returns (not serialization end)
- [ ] Size discipline: prune on every save, TTL/caps on unbounded data
      (the Skyrim bloat lesson), growth measured per play-hour
Tier 4 — Cloud & platform
- [ ] Settings split enforced (machine config excluded from cloud)
- [ ] Cloud conflicts: platform dialog with playtime + device + date on
      both options; merge only for monotonic flag stores; last-write-
      wins for settings only
- [ ] Console suspend = a mandatory fast save trigger (delta save well
      under a second — Xbox XR-001 tests data loss on suspend)
- [ ] Tamper ladder as needed: checksum (always) -> HMAC (leaderboards)
      -> encrypt sensitive fields (paid unlocks) -> server validation
```

## Numbers (starting points — platform values cited where public)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Cloud budget | ≤256 MB/user (Xbox, the strictest public console quota); ≤3 MB/snapshot if mobile cross-save (Play Games) | platform docs |
| Save sizes shipped | flag-model 1–5 MB (TotK ~2.8 MB/slot, Elden Ring 2.6 MB fixed); world-delta model 5–30 MB and **grows without pruning** (Skyrim, BG3) | measured |
| Autosave | ring of 3–5 (Skyrim 3, BotW/TotK 5); timer 3–5 min + events; quicksave 1–3 deep | shipped conventions |
| Manual slots | 8+ or unlimited (Witcher 3: 8 + 3 checkpoints + 2 auto) | shipped |
| Checksum | CRC32 floor (BotW), MD5 (Elden Ring); HMAC-SHA256 when tamper matters | measured |
| Backups | A/B + 1 `.bak` minimum (the souls floor: ~5 trailing on console) | measured |
| Saving icon | show only if >~400 ms, hold ≥1 s, until fsync (convention — no public cert number) | UX research |
| Suspend save | well under 1 s (delta/dirty-flag path); exact budget NDA'd | XR-001 + flagged |
| Famous failures | Cyberpunk's 8 MB cap corruption; Skyrim PS3; Pokémon Gen 1 single checksum → Gen 3 added A/B | press/measured |

NDA'd (never state): Sony/Nintendo per-title quotas and cert texts, Xbox
suspend seconds, corruption telemetry, Genshin server internals. Full
tables in [architecture.md](./architecture.md).

## Engine mapping

| Generic block | Unity 6 | UE5 (5.4+) |
| --- | --- | --- |
| Serialization | DTOs + Newtonsoft JSON default; MemoryPack if measured need; **never BinaryFormatter**; JsonUtility too limited for rich saves | `USaveGame` + `UPROPERTY(SaveGame)`; custom: `FObjectAndNameAsStringProxyArchive` with `ArIsSaveGame=true` |
| Versioning | `schemaVersion` field + migration chain | `FCustomVersion` (GUID + enum) or a version field + chain |
| Stable IDs | ScriptableObject GUIDs / addressable keys for assets; a `GuidComponent` for scene objects (instanceID/paths break; GlobalObjectId is editor-only) | per-actor `FGuid` (regenerate in `PostEditImport`); class + GUID for runtime-spawned respawn |
| Atomic writer | temp + `File.Replace`/`File.Move` (atomic on Win/POSIX; not on FAT32/SMB) + `.bak` | custom temp+rename over `ISaveGameSystem`, or platform-delegated (XGameSaveFiles) |
| Paths | `persistentDataPath` (desktop/mobile); **consoles need platform SDKs** — abstract all path access | `ISaveGameSystem` per platform; Xbox via GDK eXtension (64 MB/file, 256 MB/user) |
| Async | snapshot main thread → `Awaitable.BackgroundThreadAsync()` → IO → main-thread notify | `AsyncSaveGameToSlot`; actor-state gather on game thread only |
| World streaming | capture/restore per scene via the GUID registry | **WP doesn't persist cell state** — subsystem snapshots by GUID on unload (SPUD is the community reference) |
| Machine settings | PlayerPrefs (its actual legitimate use) | `GameUserSettings.ini` |
| Cloud | Steam Auto-Cloud on the save folder (`*.sav` pattern) | OnlineSubsystem / platform extensions |

## Failure modes

The 14 classic save bugs (direct runtime serialization, unstable IDs,
non-atomic writes, the single-slot death loop, unhandled save scumming,
unversioned saves, saves during transitions, Skyrim-style bloat,
settings traveling in cloud saves, silent cloud conflicts,
cross-platform divergence, main-thread save hitches, loading without
validation, second-load divergence) are
cataloged in [pitfalls.md](./pitfalls.md) with symptom → root cause →
prevention.

## Related skills

- `scene-flow-manager` — owns `CanSave` and the transition save
  triggers; load runs through `ResetSession`.
- `quest-system` — quest state and the shared world-state store (flags,
  facts) this store serializes.
- `progression-economy` — atomic save writes as the solo transaction
  boundary; minimal persisted derivable state.
- `open-world-streaming` / `enemy-ai-framework` / `minimap-worldmap` —
  consumers of the world-state store (cell deltas, revival flags, fog).
- `menu-ui-manager` — the settings split and slot/load UI.
- `game-architecture-patterns` — Memento-adjacent store thinking, Type
  Object (catalog IDs), Event Queue (dirty-flag save requests).
