# UX & cloud — slots, cross-save, NG+, cert

The player-facing and platform layer. Hard cert vs best practice flagged. NDA'd
items are described qualitatively only.

## Save/load UX

- **Menu structure**: slot grid (tile + thumbnail) when screenshots are the
  differentiator; list (text rows) for high slot counts and metadata density;
  group by type (Auto/Quick/Manual). **Metadata per slot** (near-universal):
  playtime, location/area, level, chapter/quest, real-world date-time, and a
  **screenshot thumbnail** (a framebuffer capture at save time — formalized as a
  platform "cover image", Play Games ≤800 KB).
- **Three parallel save streams** where appropriate: Autosave (rotating ring),
  Quicksave (single dedicated slot), Manual (named slots).
- **Autosave indicators**: a spinning icon = "write in progress", paired with the
  "do not turn off your console while saving" warning (effectively cert-expected on
  autosave titles). A robust atomic-write + backup-rotation system makes the warning
  *technically* moot (Jonathan Blow's argument) — but cert still expects it.
- **Friction**: an "are you sure you want to overwrite?" confirm on manual slots;
  an "unsaved progress" warning on quit. **Continue** (one-tap resume of the most
  recent save) is distinct from **Load** (the slot picker).
- **Diegetic save points** (RE typewriters + ink ribbons, Souls bonfires, beds)
  double as pacing beats and safe-room signals. The **save-anywhere vs save-points
  tradeoff**: anywhere = convenience but undermines tension (Alien: Isolation moved
  to manual save stations *specifically* because auto-saving "reduced fear").

## Cross-save vs cross-progression

- **The distinction**: *cross-save* = move a save *file* between platforms (manual
  export/import); *cross-progression* = one linked account, the latest save syncs
  automatically everywhere (marketing uses them interchangeably).
- **The implementation = a central publisher account bridging the platform walled
  gardens**: Larian (BG3 — a free Larian account; works in *any* combination incl.
  Xbox↔PS5, with a per-save cross-play toggle), CD Projekt Red (Cyberpunk — a CDPR/
  GOG account; auto-uploads the latest of each save type), Ubisoft Connect, EA,
  Bethesda.net, Epic — all the same account → cloud-container pattern.
- **Restrictions**: Cyberpunk blocks **PC→console** transfer (to prevent bypassing
  console regional restrictions); PC mod content doesn't carry to console (BG3 caps
  cross-play modded saves at ≤100 mods); Sony has been historically resistant to
  cross-platform features (the 85% revenue-share threshold is court-disclosed
  evidence, not published Sony policy — flag accordingly).

## New Game Plus & save inheritance

- **The split**: carries = character level/stats, gear, currency, cosmetic unlocks,
  checkpoint upgrade state; resets = story flags, world/boss state, key/quest items,
  shortcuts. Dark Souls keeps level/equipment/souls/Estus upgrades, strips most key
  items, re-locks shortcuts.
- **Schema modeling**: a **`playthroughCount` / NG-cycle integer** + a **carry-over
  manifest** (a whitelist of persisting fields/inventory) vs a reset list;
  difficulty scalers read the cycle count. Souls NG→NG+ is a large jump (enemy HP
  ~1.5–2.7×, souls ~2–5×) then small static steps (NG+2 +7% … NG+6 +25% and
  plateaus).

## Save-scumming & its counters

The design intent: make failure *stick* so success feels earned. The counters:

- **Single auto-overwriting slot** (Souls; XCOM **Ironman** replaces Save/Load with
  "Save and Quit").
- **A fixed PRNG seed stored in the save** (XCOM, Civ since Civ III) — reload + same
  actions = same result, killing reload-reroll.
- **Roguelike permadeath + meta-progression** (Hades autosaves on room entry *and
  before generating next-chamber rewards* to block reward-scumming; failed runs still
  progress; God Mode as opt-in accessibility).
- **Cloud-restore opt-out** (Nintendo disables cloud backup for Pokémon/Splatoon/
  Animal Crossing precisely so restoring an old save can't undo trades or revert
  rank).

**The player-vs-designer tension**: prevent in systems/tactics games where the
stakes *are* the content; allow in narrative/checkpointed experiences. Either way,
**communicate the rules clearly** so players know what saving means.

## Platform certification & cloud quotas

Public, cite-able hard cert (Xbox GDK):

- **XR-001 (Title Stability After Suspend)**: after suspend/resume, users **must not
  lose save progress** — the canonical "save-on-suspend" requirement.
- **XR-052 (Roaming)** / **XR-130 (Console Generations)**: saves tied to a profile,
  roaming between like devices, round-tripping Xbox One ↔ Series with no progress
  loss.
- **XR-003 (Save-Game Compatibility)**: a content-updated build must load saves from
  the non-updated build; no permanent data loss; notify on missing content.
- **Cloud quotas (public)**: Xbox **256 MB/user** (64 MB/file via `XGameSaveFiles`,
  16 MB legacy); Play Games **3 MB data + 800 KB cover**; iCloud **KVS 1 MB**
  (use CloudKit/documents for real save blobs). Save to `FOLDERID_SavedGames` (not
  OneDrive-synced) to avoid sync conflicts.
- **Corruption / storage-edge handling** is a standard cert test class (full disk,
  removed storage, corrupt save) — the title must not crash, must surface a clear
  error, must not silently destroy good data. Public-side mitigation = atomic write +
  checksum + backup rotation.

## Accessibility & QoL

- "Unsaved progress" warnings on quit; multiple save profiles per user (Hades gives
  4 slots); screenshot thumbnails; save naming/grouping by type; **importing saves
  from a prequel** (Mass Effect imports class/level + choices, with a Genesis comic
  fallback; Witcher 3 imports only *decisions* from W2, with a simulate-choices
  Q&A).

## Implementation checklist (the UX layer)

```
- [ ] Three save streams (autosave ring, quicksave, manual named slots)
- [ ] Rich slot metadata + screenshot thumbnail; overwrite-confirm; unsaved warning
- [ ] Autosave icon + boot "don't power off" notice (cert-expected)
- [ ] Save-on-suspend, zero data loss (XR-001); profile-roaming saves (XR-052/130)
- [ ] Save forward-compat across content updates (XR-003); notify on missing content
- [ ] Cloud quotas respected (Xbox 256 MB, Play Games 3 MB, iCloud 1 MB)
- [ ] Cross-progression: account link, auto-upload latest of each type, conflict dialog
- [ ] NG+: playthroughCount + carry-over manifest; cycle-indexed difficulty
- [ ] Anti-save-scum (if intended): single slot / persisted seed / autosave-before-reward
- [ ] Graceful full-disk / removed-storage / corrupt-save handling
- [ ] "Continue" distinct from "Load"; prequel-import with simulate fallback
```

## Flagged gaps — do NOT invent

Per-platform private cert thresholds and submission test IDs (NDA) · exact required
"don't power off" wording (platform-confidential) · the Sony 85% figure is
litigation-disclosed, not public policy.

## Sources

MS Learn / Xbox GDK (XR-001/052/130/003, XGameSaveFiles quotas) · Android Developers
(Cloud save snapshots) · Apple iCloud Design Guide · GameSpot/Larian (BG3 cross-save)
· CDPR support (Cyberpunk cross-progression) · Dark Souls Wiki (NG+ tables) ·
PlayStation.Blog / Game Developer (XCOM Ironman, save-scum) · Hades Fandom (autosave-
before-reward) · Nintendo Support (cloud-restore opt-out) · Witcher/Mass Effect wikis
(prequel import).
