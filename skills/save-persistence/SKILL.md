---
name: save-persistence
description: >-
  Architecture blueprint for game save systems across single-player and online
  games: the versioned store decoupled from runtime objects (deltas keyed by
  stable IDs, the world-state store), the save models compared (checkpoint,
  save-anywhere, continuous souls-style, server-authoritative), the serialization
  and storage engineering (format comparison — JSON/MessagePack/MemoryPack/
  Protobuf/FlatBuffers, schema evolution and the never-reuse-a-field-ID rule,
  compression, atomic writes and the fsync/rename correctness, stable references,
  async save performance), networked/MMO persistence at scale (the RAM-of-truth
  write-back pattern, SQL vs NoSQL backends, sharding, idempotency and ledgers,
  the rollback playbook, live-service player-data platforms), save UX and
  cross-progression (slots/autosave, cross-save vs cross-progression, New Game
  Plus, save-scumming counters, platform certification, cloud quotas), and the
  tamper-protection ladder. References: Skyrim changeforms, BotW revival flags,
  souls journaling, Genshin/EVE/WoW server state, with Unity 6 / UE5 mappings.
  Use when designing or building save/load, autosave, save slots, world
  persistence, cloud/cross saves, MMO player data, or when saves corrupt, bloat,
  break on game updates, or duplicate on retry.
---

# Save & Persistence

Build the save system of a game. References: Skyrim's changeform deltas, BotW's
revival flags, Dark Souls' continuous journaling, Genshin's server-authoritative
state, and the MMO backends (EVE, WoW, Albion). This skill fills the world-state
store referenced by `open-world-streaming`/`enemy-ai-framework`/`minimap-worldmap`,
the settings split referenced by `menu-ui-manager`, and the `CanSave` gate of
`scene-flow-manager`.

## The architecture rule

**The save is a versioned store decoupled from runtime objects.** Systems write
**deltas keyed by stable IDs**; the store is the single source of truth; runtime
state is a projection rebuilt from `base game data + save deltas` on load. Never
serialize live scene objects.

```
Envelope: { magic, schemaVersion, timestamp, checksum, metadata }
Buckets (one per persistent system):
  progression   — quests, unlocks, stats (append-mostly)
  worldState    — per-region flag sets keyed by STABLE IDs (the BotW
                  revival-flag model: the flag carries its reset policy)
  inventory     — catalog IDs + counts + instance data
  profile prefs — accessibility, difficulty (cloud-synced)
Machine settings (resolution, keybinds) live OUTSIDE the save store —
  never cloud-synced (the menu-ui split).
```

Save only **authoritative state that cannot be deterministically reconstructed**;
recompute everything else.

## Reference map

| File | Covers |
| --- | --- |
| [store-model.md](./store-model.md) | The decoupled store (Skyrim changeforms, BotW flags), data taxonomy and the settings split, the four save models compared (checkpoint/save-anywhere/continuous/server-authoritative), size discipline |
| [serialization.md](./serialization.md) | Format comparison (JSON/MessagePack/MemoryPack/Protobuf/FlatBuffers, why-not-BinaryFormatter), schema evolution and the never-reuse-a-field-ID rule, compression (Zstd/LZ4 + the Cyberpunk cap tale), atomic writes (the fsync/rename correctness), stable references, async save performance |
| [networked.md](./networked.md) | The RAM-of-truth write-back pattern, SQL vs NoSQL backends (EVE/WoW/Albion/PoE), sharding and consistency, idempotency and ledgers, the rollback playbook (targeted audit vs global), live-service player-data platforms (PlayFab/Nakama/Roblox) |
| [ux-cloud.md](./ux-cloud.md) | Save/load UX (slots, metadata, autosave indicators), cross-save vs cross-progression, New Game Plus and save inheritance, save-scumming and its counters, platform certification (Xbox XR cert, cloud quotas), accessibility/QoL |
| [pitfalls.md](./pitfalls.md) | 16 failure modes (symptom → cause → prevention) with debugging order and ship checklist |

## Pick your save model (a design contract)

| Model | Mechanics | Fits |
| --- | --- | --- |
| Checkpoint | designer-chosen points, small known state | linear action (GoW, Uncharted) |
| Save-anywhere | arbitrary mid-state snapshots, many slots | PC RPGs/sims (Skyrim) |
| **Continuous (souls)** | write on every significant event, single slot — "not no saves: no going back" | consequence-driven design |
| **Server-authoritative** | no local file; every action persisted server-side; the client is a view | live-service/MMO — scumming impossible, but no offline and infra forever |

**Hybrids are the norm** (continuous flag-store writes + periodic snapshots).
Continuous saving *requires* the corruption machinery in
[serialization.md](./serialization.md).

## Build order (4 shippable tiers)

```
Tier 1 — A save that survives
- [ ] Envelope with magic + schemaVersion + checksum FROM THE FIRST FILE WRITTEN
- [ ] DTO layer decoupled from runtime types; buckets per system
- [ ] Atomic write: temp → fsync → rename; .bak kept; silent fallback
- [ ] CanSave gate wired to scene-flow
Tier 2 — World persistence & slots
- [ ] World-state store: stable-ID flags per region (reset policies per flag)
- [ ] Stable IDs: authored GUIDs (never hierarchy paths/instance IDs)
- [ ] Slots: manual + autosave ring (3–5) + metadata sidecar (thumbnail)
- [ ] Autosave triggers (transitions, checkpoints, timer floor, on quit)
Tier 3 — Updates & async
- [ ] Migration chains: pure one-way steps, additive-only, golden-save corpus in CI
- [ ] Quarantine orphaned references (cut content, missing DLC)
- [ ] Async writes: snapshot on game thread → serialize + IO off-thread
- [ ] Size discipline: prune on every save, growth measured per play-hour
Tier 4 — Cloud, platform, online
- [ ] Settings split enforced; cloud conflict dialog with metadata
- [ ] Console suspend = mandatory fast save (XR-001); cross-progression if used
- [ ] Online: RAM-of-truth + write-back, idempotency keys, the rollback playbook
- [ ] Tamper ladder as needed (checksum → HMAC → encrypt → server validation)
```

## Key numbers (starting points — platform values cited where public)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Cloud quotas | Xbox 256 MB/user (64 MB/file); Play Games 3 MB + 800 KB cover; iCloud KVS 1 MB | platform docs |
| Save sizes shipped | flag-model 1–5 MB (TotK ~2.8 MB, Elden Ring 2.6 MB fixed); world-delta 5–30 MB | measured |
| Autosave | ring of 3–5 (Skyrim 3, BotW/TotK 5); timer 3–5 min + events | conventions |
| Checksum | CRC32 floor (BotW), MD5 (Elden Ring); HMAC-SHA256 when tamper matters | measured |
| BinaryFormatter | **removed in .NET 9** (throws); CWE-502 — never use | MS Learn |
| Compression | Zstd-3 modern default (~2.9× at 10× gzip speed); LZ4 for the hot path | benchmarks |
| PlayFab idempotency | `IdempotencyId`, 14-day TTL; ETags for OCC | MS Learn |
| Roblox DataStore | 4 MB/key; experience cap 100 MB + 1 MB/lifetime user | Roblox docs |
| Famous failures | Cyberpunk's 8 MB cap corruption; Pokémon Gen 1 single checksum → Gen 3 A/B | press |

NDA'd (never state): Sony/Nintendo per-title quotas and cert texts, Xbox suspend
seconds, corruption telemetry, Genshin server internals.

## Engine mapping (summary)

| Generic block | Unity 6 | UE5 (5.4+) |
| --- | --- | --- |
| Serialization | DTOs + System.Text.Json / MessagePack / MemoryPack; **never BinaryFormatter** | `USaveGame` + `UPROPERTY(SaveGame)`; `FObjectAndNameAsStringProxyArchive` with `ArIsSaveGame=true` |
| Versioning | `schemaVersion` field + migration chain | `FCustomVersion` or a version field + chain |
| Stable IDs | `GuidComponent` (runtime); `GlobalObjectId` editor-only | per-actor `FGuid` (regenerate in `PostEditImport`) |
| Atomic writer | temp + `File.Replace` + `.bak` (not atomic on FAT32/SMB) | custom temp+rename / platform-delegated |
| Async | snapshot main thread → background serialize + IO → notify | `AsyncSaveGameToSlot` (gather actor state on game thread) |
| World streaming | per-scene GUID registry | WP doesn't persist cell state — subsystem snapshots (SPUD) |

Full detail in [serialization.md](./serialization.md).

## Related skills

- `scene-flow-manager` — owns `CanSave` and the transition save triggers.
- `quest-system` — quest state and the shared world-state store this serializes.
- `progression-economy` — atomic save writes as the solo transaction boundary;
  shares the idempotency and ledger discipline.
- `open-world-streaming` / `enemy-ai-framework` / `minimap-worldmap` — consumers of
  the world-state store.
- `menu-ui-manager` — the settings split and slot/load UI.
- `coop-session` / `inventory-equipment` / `loot-drop-system` — the
  server-authoritative dupe-prevention discipline shared with networked saves.
- `game-architecture-patterns` — Memento-adjacent store thinking, Type Object,
  Event Queue (dirty-flag save requests).
