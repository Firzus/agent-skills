# Pitfalls — the 14 classic HUD failure modes

Each: symptom → root cause → prevention. Read before designing; re-read
when the HUD eats frame time or breaks on someone's TV. Element
engineering is in [elements.md](./elements.md), design/genre craft in
[design-genres.md](./design-genres.md), accessibility in
[accessibility.md](./accessibility.md), world-anchored elements in
[world-space.md](./world-space.md).

## 1. Per-frame polling HUD

- **Symptom** — the HUD costs milliseconds even when nothing on screen
  changes.
- **Root cause** — `Update()`/Tick reading gameplay state every frame; UMG
  property bindings (per-frame function evaluation); UITK bindings left on
  their default per-frame poll.
- **Prevention** — event-driven push or change-notified bindings
  (`INotifyBindablePropertyChanged` / FieldNotify MVVM); UE: Project
  Settings → Property Binding Rule = **Prevent**; profile with the Widget
  Reflector / UITK profiler as a routine check.

## 2. Layout thrash

- **Symptom** — frame spikes whenever values change; layout markers hot in
  the profiler.
- **Root cause** — frequent text/size changes dirtying layout (UITK
  invalidation cascades, UMG ChildOrder storms, UGUI whole-canvas
  rebuilds).
- **Prevention** — fixed-size containers for changing text (reserve
  width); move with `translate`, never `top/left`; UE: Volatile flags on
  fast widgets + invalidation boxes around static sections; Unity: split
  canvases/documents by update frequency; quantize text updates (integer
  changes only).

## 3. Damage-number floods

- **Symptom** — frame rate tanks during combat bursts.
- **Root cause** — instantiate/destroy per hit (widget creation is the
  dominant cost — a measured UE case went 4 ms → 0.5 ms just by pooling);
  one draw call per element; canvas dirtying.
- **Prevention** — mandatory pooling with a hard cap + merge window +
  priority culling; UE high volume: Niagara atlas digits; Unity: pooled
  labels on one panel with `DynamicTransform`.

## 4. World-to-screen projection bugs

- **Symptom** — nameplates drift at screen edges; markers mirror when the
  target is behind the camera; one-frame jitter.
- **Root cause** — projecting behind-camera points (negative W mirrors);
  wrong space (UE raw `ProjectWorldToScreen` pixels vs DPI-scaled widget
  space); UI projecting before the camera finalizes.
- **Prevention** — cull on `dot(camForward, toTarget) <= 0` with an
  edge-indicator policy; UE: `ProjectWorldLocationToWidgetPosition`
  (DPI-aware); project in LateUpdate/after-camera; one projection manager,
  not per-widget logic.

## 5. Binding leaks

- **Symptom** — null-ref spam after respawn; HUD shows a dead entity's
  stats; memory growth across scene reloads.
- **Root cause** — HUD subscribed to events of destroyed/respawned
  entities; static handlers surviving scene loads.
- **Prevention** — subscribe to stable identities (player slot,
  view-model), not raw entity references; unbind in teardown; rebind on
  possession/respawn events.

## 6. Glyph desync

- **Symptom** — keyboard prompts shown while playing on gamepad; prompts
  flicker mid-interaction.
- **Root cause** — glyphs resolved once at HUD init; no device-change
  listener; rebinding not reflected.
- **Prevention** — centralize glyph resolution behind a provider keyed by
  action (never key); subscribe to device-change events and re-resolve
  all live prompts; debounce noisy switches (gyro/touchpad).

## 7. Safe-area violations

- **Symptom** — ammo counter clipped on TVs; HUD under the notch; elements
  on Steam Deck rounded corners.
- **Root cause** — anchoring to absolute screen edges; never testing
  insets.
- **Prevention** — one safe-area root container (UE `USafeZone`; Unity
  custom `Screen.safeArea` element — mind the Y-flip); test with
  `r.DebugSafeZone` / Device Simulator; only full-bleed decoration lives
  outside; ship a calibration screen.

## 8. Z-order wars

- **Symptom** — tooltip under the inventory; modal behind the HUD; order
  changes between sessions.
- **Root cause** — scattered `AddToViewport(ZOrder)` magic numbers;
  multiple panels with ad-hoc sort orders.
- **Prevention** — a single layering enum (HUD < world markers < toasts <
  modal < system) owned by the HUD root; UE: one root widget + activatable
  stacks; Unity: one documented `PanelSettings.sortingOrder` table; modals
  always through a stack.

## 9. Resolution/aspect bugs

- **Symptom** — elements off-screen at 21:9; overlaps at 16:10 (Steam
  Deck 1280×800); oversized at 4K.
- **Root cause** — absolute pixel positions; center-anchored clusters
  sized for 16:9; wrong scaling rule.
- **Prevention** — anchor each cluster to its nearest corner/edge;
  relative units + max-width on center clusters; UE shortest-side DPI
  rule, Unity scale-with-screen-size; test matrix: 16:9, 16:10, 21:9,
  32:9, Deck.

## 10. Localization overflow

- **Symptom** — German/French strings (+30–40%) truncated or breaking the
  layout.
- **Root cause** — fixed-width labels sized to English.
- **Prevention** — flexible containers with an explicit ellipsis/
  auto-shrink policy per element; pseudo-localization pass (built into UE
  cultures and the Unity Localization package); prefer icon+number over
  words in tight slots.

## 11. Readable in the studio, unreadable in combat

- **Symptom** — players miss low-HP over bright VFX; white text vanishes
  on the snow level.
- **Root cause** — contrast validated against static dark editor
  backgrounds only.
- **Prevention** — backplates/scrims behind critical readouts; outline +
  shadow on floating text; test over the brightest and noisiest gameplay
  capture; redundant channels for critical state (vignette + bar + audio);
  colorblind-safe palette from day one.

## 12. Update-order flicker

- **Symptom** — HUD shows one-frame-stale values; a brief "0 HP" flash on
  respawn; the bar lags the hit by a frame.
- **Root cause** — UI consuming state before gameplay finishes the frame
  (event fired pre-mutation; widget constructed before first data push).
- **Prevention** — fire events after state mutation with final values in
  the payload; widgets do one synchronous read on bind; HUD updates after
  gameplay (LateUpdate / tick groups); gate visibility until first valid
  data.

## 13. Color-only encoding & single-channel critical info

- **Symptom** — colorblind players can't tell danger from safe; a player
  with audio off misses the "you're being hit" cue; red low-HP reads as
  full to ~8% of male players.
- **Root cause** — status encoded by hue alone (red/green the worst
  pairing); critical state delivered on one channel only (just a color,
  just a sound); juice colors not double-coded.
- **Prevention** — **never color alone**: pair hue with shape/icon/text/
  position (verify the HUD in grayscale); use the Okabe-Ito/CUD palette;
  the **redundancy contract** — every critical event fans out to ≥2
  channels (bar + vignette + audio). Full rules in
  [accessibility.md](./accessibility.md). This is the design-time sibling
  of pitfall #11.

## 14. World-space HUD that doesn't scale

- **Symptom** — frame rate collapses with 100+ enemy nameplates/health
  bars; the editor is fine but a horde fight tanks; a `WidgetComponent`
  on every actor costs Tick even when hidden.
- **Root cause** — one canvas/widget per unit (per-unit Tick + canvas
  rebuild/Slate paint); instantiate/destroy per spawn; per-plate
  occlusion raycasts every frame; a `WidgetComponent` left on thousands
  of idle actors.
- **Prevention** — **pool** plates (reuse, never create/destroy);
  frustum + distance + **priority cull** (only bosses/targeted/damaged
  units get a plate); single canvas with repositioned children (split
  static/dynamic); GPU-instanced quads at extreme counts; add the
  component only when needed; throttle occlusion tests. Cost model and
  billboarding in [world-space.md](./world-space.md).

## Debugging order

When the HUD misbehaves: (1) profile one idle frame — anything above ~0 ms
with nothing changing is #1/#2, (2) spawn 50 damage numbers and watch the
pool (#3), (3) walk to a screen corner and spin the camera (#4), (4)
respawn/reload and grep for null-refs (#5), (5) switch input device with
prompts on screen (#6), (6) run the resolution + safe-area matrix (#7/#9),
(7) grayscale the HUD and mute audio to find color/single-channel gaps
(#13), (8) spawn a 100-enemy horde and profile nameplates (#14).

## Ship checklist

```
- [ ] Idle HUD frame cost ~0 ms (event-driven verified in profiler)
- [ ] Combat burst (50+ hits): no allocation, caps and merging hold
- [ ] HUD options menu: scale, per-element visibility, opacity, text size,
      colorblind presets, damage numbers off
- [ ] Safe-area calibration + full resolution/aspect matrix passes
- [ ] Pseudo-loc pass: nothing truncates or overlaps
- [ ] Device-switch mid-prompt: all glyphs swap instantly
- [ ] Respawn/scene-reload: no stale bindings, no death flicker
- [ ] Readability validated over the brightest/noisiest real capture
- [ ] Low-HP pulse < 3 flashes/s (photosensitivity cap)
- [ ] HUD legible in grayscale; critical info on >=2 channels (no color-only)
- [ ] 100-enemy nameplate horde holds frame rate (pool + cull + priority)
```
