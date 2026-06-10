# Pitfalls — the 14 classic save failure modes

Each: symptom → root cause → prevention. Read before designing; re-read
when saves corrupt, bloat, or break on update.

## 1. Serializing runtime objects directly

- **Symptom** — a class/field rename or scene restructure kills every
  existing save.
- **Root cause** — the save format is coupled to code/scene layout.
- **Prevention** — a dedicated, versioned DTO layer decoupled from
  MonoBehaviours/Actors; the save schema is a **public contract**, not
  an implementation detail.

## 2. Unstable IDs

- **Symptom** — a moved or renamed object loses its state, or state
  applies to the wrong object.
- **Root cause** — hierarchy paths, instance IDs, or object names as
  keys.
- **Prevention** — explicit authored GUIDs (GuidComponent / per-actor
  FGuid), assigned at authoring time, never derived from structure.

## 3. Non-atomic writes

- **Symptom** — crash or power loss during save = corrupted file, no
  recovery.
- **Root cause** — in-place overwrite of the only file.
- **Prevention** — temp → fsync → rename; keep `.bak`; checksum in the
  envelope; the loader falls back to previous-good silently.

## 4. The single-slot death loop

- **Symptom** — the autosave overwrites the only slot in an unwinnable
  state (saved one second before an unavoidable death).
- **Root cause** — one physical slot, overwritten without rotation.
- **Prevention** — an autosave ring (3+), separate manual slots, never
  autosave over the only copy. Single-slot is a deliberate design
  contract (souls), not a default.

## 5. Save scumming vs design (unhandled)

- **Symptom** — reload-spam breaks the game's risk economy.
- **Root cause** — free saving in a design that assumes consequences.
- **Prevention** — pick the policy deliberately (free / checkpoint /
  continuous) and make it technically binding if it matters. The souls
  answer: continuous single-slot — death is saved too; "not no saves,
  no going back". The Genshin answer: server-side, structurally
  impossible.

## 6. Unversioned saves

- **Symptom** — the first migration is forensics on anonymous blobs.
- **Root cause** — no schema version field from day 1.
- **Prevention** — version + magic header in the very first file ever
  written; one-way migration chains; golden-save fixtures per shipped
  version tested in CI.

## 7. Floating save triggers during transitions

- **Symptom** — a save fired mid-teardown or mid-combat captures broken
  half-state.
- **Root cause** — no central "can we save now?" gate.
- **Prevention** — the scene-flow `CanSave` predicate: refused during
  loads/teardowns/combat/cutscenes; requests queued until the next
  stable state.

## 8. Save bloat (the Skyrim case)

- **Symptom** — files grow unboundedly; loads slow down over hundreds
  of hours.
- **Root cause** — accumulated persistent refs, orphaned entries never
  pruned, unbounded fog/breadcrumb-style data.
- **Prevention** — prune on every save; TTL/caps on unbounded data;
  size budget monitored per play-hour in CI/playtests.

## 9. Settings in the save file

- **Symptom** — another PC's resolution/keybinds arrive via cloud sync.
- **Root cause** — machine settings and progression in one synced file.
- **Prevention** — two stores: machine config local (excluded from
  cloud), progression in the synced slots (the menu-ui split).

## 10. Cloud conflicts mishandled

- **Symptom** — hours of play silently overwritten.
- **Root cause** — automatic last-write-wins; timestamps skewed by
  clocks/timezones.
- **Prevention** — use the platform conflict dialog; show playtime +
  device + date on both options; merge only monotonic flag stores;
  compare by progression, never by wall clock; keep the discarded
  branch.

## 11. Cross-platform divergence

- **Symptom** — a shared save references content absent on the other
  platform (DLC, exclusives) → crash or lost state.
- **Root cause** — non-universal content in a "shared" format.
- **Prevention** — platform-agnostic core payload; optional, degradable
  platform/DLC sections; quarantine on missing content.

## 12. Blocking the main thread during save

- **Symptom** — a visible hitch on every autosave.
- **Root cause** — synchronous serialize + file IO on the game thread.
- **Prevention** — immutable snapshot on the main thread (double-buffer
  the data), serialize + write on a background thread, notify on
  completion. Gather actor state on the game thread only (UE).

## 13. Loading without validation

- **Symptom** — a corrupted or edited save crashes the game at boot.
- **Root cause** — blind deserialization; trusting file contents.
- **Prevention** — checksum + version check + bounds-checking before
  applying; fallback to `.bak`; a user-facing message. Treat the file
  as hostile input — a crash on a bad file is itself a bug.

## 14. Second-load divergence

- **Symptom** — loading from the in-game menu behaves differently from
  loading at boot (ghost state from the previous session).
- **Root cause** — load doesn't fully reset session state (singletons,
  events, caches).
- **Prevention** — explicit `ResetSession` before applying any save
  (the scene-flow contract); the load path is identical mid-session and
  from boot — and tested both ways.

## Debugging order

When saves misbehave: (1) hexdump the envelope — version and checksum
present and valid? (#6/#13), (2) kill the process mid-write and reboot
(#3), (3) diff two saves of the same state — nondeterminism reveals
runtime coupling (#1), (4) rename a scene object and reload (#2), (5)
load the same save from boot and mid-session and diff behavior (#14),
(6) chart save size over a long session (#8).

## Ship checklist

```
- [ ] Power-loss test: kill mid-write on every platform -> previous
      save loads, gentle message
- [ ] Golden-save corpus: every shipped schema version migrates in CI
- [ ] Refactor test: rename classes/fields/scene objects -> old saves
      still load (DTO + GUID decoupling holds)
- [ ] Death-loop test: autosave near an unwinnable state -> rotation
      offers an escape
- [ ] Cloud conflict: play offline on two devices -> dialog with
      meaningful metadata, no silent loss
- [ ] Settings split: cloud save on a second machine changes no
      machine config
- [ ] Save size after a 10-hour session within budget; pruning verified
- [ ] No hitch on autosave (profiled); icon held >=1 s, until fsync
- [ ] Suspend/resume (console): zero progress loss (XR-001)
- [ ] Tampered-file test: corrupted/edited saves fail gracefully
```
