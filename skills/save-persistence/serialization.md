# Serialization — formats, schema, atomicity, references

The serialization and storage engineering for working programmers. Speed/size
numbers are workload-specific — **benchmark your real payloads**.

## Serialization formats

- **JSON family (.NET)**: **System.Text.Json** (built-in, Utf8-first, source-gen
  for AOT/IL2CPP, faster + lower-alloc than Newtonsoft) is the modern default;
  **Newtonsoft.Json** is most flexible/permissive but slowest (and
  `TypeNameHandling` is an **RCE vector** on untrusted input — never on saves);
  **Unity `JsonUtility`** is fast but very limited (no `Dictionary`/polymorphism/
  top-level arrays). JSON = human-readable, diffable, version-tolerant, at 2–5×
  size and ~10–40× slower than binary.
- **Binary family**: **MessagePack-C#** (compact varint, cross-language, built-in
  LZ4 — a well-rounded default); **MemoryPack** (C#-specific zero-encoding,
  source-generated, ~2–5× faster, **50–200× for struct arrays** via memcpy — but
  fixed-width, so int-heavy data is larger, and defaults to limited
  version-tolerance); **Protobuf** (smallest, best schema-evolution ergonomics, IDL);
  **FlatBuffers**/**Cap'n Proto** (zero-copy random-access reads — authors name
  *games* as the use case; larger wire size; verifier opt-in).
- **Why NOT `BinaryFormatter`**: insecure by design (CWE-502 — untrusted input
  chooses types → RCE, not mitigable via `SerializationBinder`). **.NET 9 removed
  it** (throws `PlatformNotSupportedException`). Migrate to STJ / MessagePack /
  Protobuf.
- **Engine-native**: Unity `[Serializable]`/`[SerializeField]` (no Dictionary/
  polymorphism by default — use `[SerializeReference]`; `ISerializationCallbackReceiver`
  runs **off the main thread**, so keep its work field-local). UE5 `UPROPERTY(SaveGame)`
  + `Ar.ArIsSaveGame = true` (forget it → it serializes the *entire* object graph),
  wrapped in `FObjectAndNameAsStringProxyArchive` (the default `FArchive operator<<(FName)`
  is a no-op, so `FName`/`UObject*` must serialize as strings).

| Format | Size | Speed | Readable | Schema-evo | Notes |
| --- | --- | --- | --- | --- | --- |
| System.Text.Json | large | med | yes | tolerant | AOT via source-gen |
| Newtonsoft JSON | large | slow | yes | tolerant | `TypeNameHandling` = RCE risk |
| MessagePack-C# | small | fast | no | good | built-in LZ4 |
| MemoryPack | small* | fastest | no | limited† | 50–200× on struct arrays |
| Protobuf | smallest | med | no | excellent | field numbers + reserved |
| FlatBuffers | larger | fast read | no | good | zero-copy; verifier opt-in |
| BinaryFormatter | — | — | no | — | **removed .NET 9; never use** |

\*int-heavy → larger (fixed-width). †full version-tolerance optional, slight cost.

## Schema evolution

- **The universal rule: embed an explicit integer `saveVersion`** and run ordered
  per-version migration functions on load, in every format.
- **Protobuf**: the wire carries **field numbers, not names** → renaming is free,
  renumbering breaks. **Never reuse a field ID** — reusing a deleted number silently
  corrupts data; `reserved 2,3; reserved "phone";` makes `protoc` error on reuse.
  proto3 readers ignore unknown fields (forward-compatible). Enforce with `buf
  breaking` in CI.
- **FlatBuffers**: add fields **only at the end** of a table; **never remove — mark
  `deprecated`**. **MemoryPack/MessagePack-IntKey**: member order *is* the contract
  — append only. **JSON**: most tolerant but drift is silent — you own validation.

## Compression & encoding

| Algo | Ratio | Compress | Decompress | Use for saves |
| --- | --- | --- | --- | --- |
| LZ4 | ~1.1–1.8× | ~700 MB/s+ | ~4 GB/s | frequent autosaves, hot path |
| Zstd | ~2.9× | ~350 MB/s | ~1.2 GB/s | best general default (level ~3) |
| zlib/gzip | ~2.7× | ~100 MB/s | ~400 MB/s | compatibility only; slow |

Zstd-3 is the modern default (near-gzip ratio at ~10× the speed); LZ4 when save
frequency/latency dominates. JSON compresses *better* than already-compact binary
(more redundancy) but you still pay parse cost. Skip compression for tiny saves.

**The Cyberpunk 2077 cautionary tale**: launch builds **corrupted any save
exceeding 8 MB** (easy to hit via inventory hoarding); the hotfix removed the cap
but **could not recover corrupted saves**. The lesson: **never impose a hard size
cap that silently corrupts past the threshold** — budget + test growth, and fail
safe (refuse/rotate), never write a truncated file.

## Atomic writes & filesystem correctness

```
open → write → fsync(fd) → close → rename(tmp, target) → fsync(dir)
keep: .bak (previous good) + checksum in the envelope
load: verify checksum → on failure fall back to previous-good SILENTLY
```

- **Temp-then-rename** on the *same filesystem* — `rename` is the only widely-atomic
  primitive (a reader sees old or new, never half-written). Cross-filesystem rename
  is **not** atomic.
- **fsync before rename (critical)**: ext4 **delayed allocation** means the journal
  can commit the rename metadata *before* the data blocks land → crash → a
  zero-length file (the classic 2009 ext4 bug). fsync the **directory** too so the
  rename is durable.
- **.NET/Windows**: `File.Replace` (NTFS, swaps contents + preserves ACLs + makes a
  backup in one call) is preferable to `File.Move` for in-place overwrite;
  `FileStream.Flush(true)` / `FileOptions.WriteThrough` forces to disk. **FAT32/SMB
  give weaker/no atomicity** — "atomic on local disk but not a network share" is a
  real caveat.
- **Console SDKs (use them, don't hand-roll)**: Xbox `XGameSaveFiles`, PS5 SaveData
  — system-managed atomic commit + cloud sync + quota. (Exact API signatures are
  NDA-gated.) Console TRCs mandate no corruption on power-loss, a saving indicator,
  and blocking quit during save.

## Stable references & object graphs

- **Never serialize live pointers / instance IDs** — they're session-local and
  meaningless after reload. Persist a stable identity, re-resolve on load.
- **Unity `GuidComponent`** (a `System.Guid` via `ISerializationCallbackReceiver`)
  for runtime cross-scene refs; **`GlobalObjectId`** is editor-only (good for *baking*
  author-time IDs, not runtime). **UE** `FGuid` + override `PostEditImport` to
  regenerate on copy.
- **Polymorphic types**: persist a type discriminator (Protobuf `oneof`, MessagePack/
  MemoryPack Union, STJ `[JsonDerivedType]`, UE class-path string) — **never**
  Newtonsoft `TypeNameHandling` on saves.
- **Circular references**: STJ `ReferenceHandler.Preserve` / Newtonsoft
  `PreserveReferencesHandling`, or flatten to an ID-keyed table + reference-by-ID
  (the most robust, format-agnostic answer).

## Async save performance

The snapshot/serialize/write split:

1. **Gather state on the game thread** (engine objects are **not thread-safe** —
   copy needed fields into a POD buffer here).
2. **Serialize off-thread** (5–15 ms for big saves — borderline on the game thread).
3. **Write to disk off-thread.**
4. **Notify the game thread** on completion (clear the indicator, re-enable quit).

UE5: `UGameplayStatics::AsyncSaveGameToSlot` (serialization + IO on a worker,
delegate on completion); "snapshot on game thread, only gather actor state on game
thread". Unity: no built-in async helper — serialize a snapshot, then write on a
`Task`; **never call Unity API off the main thread**. For large worlds, do
**delta/incremental saves** (persist only dirty chunks, one per frame) and chunk the
world (per-cell files) rather than one monolithic blob. Reuse pooled buffers to
avoid the 2× memory spike (object graph + output).

## Unity ↔ UE5 mapping

| Concern | Unity | UE5 |
| --- | --- | --- |
| Opt-in field | `[SerializeField]` / `[Serializable]` | `UPROPERTY(SaveGame)` + `Ar.ArIsSaveGame=true` |
| Engine serializer | `JsonUtility` / custom | `UObject::Serialize(FArchive&)` |
| Ref/name proxy | `ISerializationCallbackReceiver` | `FObjectAndNameAsStringProxyArchive` |
| Stable IDs | `GuidComponent` (runtime); `GlobalObjectId` (editor-only) | `FGuid` + `PostEditImport` |
| Managed polymorphism | `[SerializeReference]` | class-path string in proxy archive |
| High-perf binary | MemoryPack / MessagePack | native `FArchive` (binary) |
| Async save | manual (Task, gather first) | `AsyncSaveGameToSlot` |

## Flagged gaps — do NOT invent

All serializer speed/size numbers are workload- and machine-specific · console SDK
API names are directional (exact signatures NDA) · compression throughput varies by
data and hardware.

## Sources

MS Learn (BinaryFormatter removal, .NET 9) · Cysharp MemoryPack / MessagePack-CSharp
benchmarks · protobuf.dev (proto3, reserved) · capnproto.org (FlatBuffers/Cap'n
Proto) · tytso (ext4 delayed allocation / zero-length file) · Unity (GlobalObjectId,
ISerializationCallbackReceiver, guid-based-reference) · Epic (`FObjectAndNameAsStringProxyArchive`,
`AsyncSaveGameToSlot`) · CDPR support / KitGuru (Cyberpunk 8 MB cap).
