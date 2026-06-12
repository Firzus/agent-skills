# Elements — events, view-models, bars, numbers, notifications, prompts

The engineering of a production HUD: the event-driven core and each
screen-space element. All numbers are **starting points — tune by UX
test**. Design philosophy and genre conventions are in
[design-genres.md](./design-genres.md); accessibility in
[accessibility.md](./accessibility.md); world-anchored bars/nameplates/
reticles in [world-space.md](./world-space.md). References: Genshin/Relink
(party action-RPG), GoW 2018/Horizon (dynamic HUD), Destiny/The Division
(GDC UI architecture talks).

## The event-driven core

```
gameplay systems ──events──> HUD event router ──> view-models ──> widgets
   (combat, quests,            (aggregation,        (display      (layout,
    inventory, input)           filtering, DND)      data)         animation)
```

- **Gameplay emits, HUD consumes.** No HUD reference ever appears in
  gameplay code; no gameplay query ever appears in widget code.
- **View-models format**: HP → fraction + ghost value; cooldown → 0–1 +
  seconds text; quest → localized step + distance. One view-model can feed
  several widgets (party HP feeds the HUD frame and the pause screen).
- **Events fire AFTER state mutation, with final values in the payload**
  (prevents one-frame-stale flicker); widgets do one synchronous read on
  bind (prevents empty-first-frame).
- **Update cadence**: event-driven for everything possible; throttle the
  few genuinely continuous elements (distance readouts, compass) to
  ~10 Hz; per-frame updates reserved for active gauge sweeps.
- **Redundancy as a contract**: a critical event fans out to ≥2 channels
  (bar + vignette + audio) — the accessibility requirement
  ([accessibility.md](./accessibility.md)) the event bus makes free.

## Layout & information hierarchy

- **The Fagerholt/Lorentzon taxonomy** (diegetic / spatial / meta /
  non-diegetic): use spatial elements (world markers, off-screen arrows)
  and meta effects (damage vignette) to offload the 2D overlay. GoW is
  non-diegetic but splits a near-empty cinematic HUD from a fuller combat
  HUD. (Full treatment in [design-genres.md](./design-genres.md).)
- **Three tiers**: combat-critical (HP, cooldowns, boss bar, threat
  indicators — persistent placement, highest contrast) > contextual
  (prompts, tracker, ammo) > ambient (XP, currency — appear on change
  only).
- **Standard zones** (9-zone grid): party/player status BL/TL, skills BR,
  boss bar top-center, tracker right, feed bottom-left, toasts top-center.
  Keep the middle ~25–33% of screen width free of persistent UI; nothing
  persistent within ~100–150 px of the reticle.
- Margins: safe-area inset (5%/edge console) + 16–32 px inner gutter;
  anchor every element to its nearest safe-rect corner/edge — never
  absolute pixels from (0,0).

## Dynamic visibility (the rules engine)

Per-element policy, never ad-hoc widget logic:

```
VisibilityRule {
  showOn:   flags (InCombat, ValueChanged, WeaponDrawn, PulseRequested...)
  hideAfter: idle seconds (5 s combat elements, 8-10 s compass/tracker)
  fade:     in 200-300 ms / out ~200 ms (alpha, never a pop)
  userOverride: AlwaysOn | AlwaysOff | Dynamic   // exposed in settings
}
```

- A central **HUD context service** publishes flags; one resolver
  evaluates rule + user override → target alpha. This is the shape behind
  Horizon Forbidden West's per-element Custom HUD menu and GoW's
  Immersive mode (the combat-vs-exploration HUD split —
  [design-genres.md](./design-genres.md)).
- **HUD pulse**: one button reveals everything for ~5 s then fades
  (Horizon's touchpad swipe). Photo mode force-hides the whole HUD layer.
- Show triggers that ship: value change (damage, resource spent), state
  enter (combat, weapon drawn, aggro), player request.

## Bars & gauges

- **Ghost drain** (the fighting-game two-fill pattern): front bar snaps
  to the new value instantly (truth); back bar holds 0.5–1 s then drains.
  Accelerate drain proportionally to distance so the animation has
  roughly constant duration. **Snap on loss, smooth on regen.**
- **Boss bars**: phase pips/ticks on the bar; crossing one triggers a
  flash + phase transition. Relink adds the Overdrive/Break state display
  plus a separate stun gauge feeding Link Attacks (see `combat-system`).
- **Cooldown radials**: 360° sweep mask + numeric countdown under 10 s +
  ready ping. Update per-frame only during the active sweep; 10 Hz is
  enough above ~2 s remaining.
- **Charge gauges live next to the button they enable** (Genshin's burst
  ring, Relink's SBA gauge under HP).
- **Juice** (widget layer only): white flash on damage, pulse on big
  hits, low-HP heartbeat ~1–2 Hz hard-capped below 3 flashes/s (WCAG
  photosensitivity — [accessibility.md](./accessibility.md)), scale-pop
  on gauge full. Calibrate by hierarchy; the full juice kit is in
  [design-genres.md](./design-genres.md).

## Damage numbers / floating combat text

- **Pooling is mandatory**: pre-warm the pool, never allocate in combat;
  on overflow recycle the oldest non-crit. (Measured UE case: 4 ms →
  0.5 ms just by pooling — [world-space.md](./world-space.md).)
- **Projection**: spawn at `WorldToScreenPoint(hit location)`, then drift
  in screen space. Project in LateUpdate/after-camera; cull when
  `dot(camForward, toTarget) <= 0` (behind-camera mirror bug).
- **Merge window 100–300 ms** per target: rapid hits aggregate into one
  accumulating number ("12.4k ×3"). Cap ~10–20 visible; priority culling
  drops oldest/smallest non-crit first — never crits.
- **Grammar**: element colors (Genshin), crit = bigger + distinct color +
  punch pop, heal green, resist grey/small; abbreviate ≥6 digits (1.2M).
  Avoid the "12 +4 reads as 124" stacking bug; double-code for colorblind
  players ([accessibility.md](./accessibility.md)).
- **Animation**: scale-overshoot pop (0.2–0.4 s) → drift 50–150 px with
  ±20–40 px X-jitter → hold ~60–70% of lifetime → fade. Lifetime
  0.5–1.5 s.
- Always ship the off/self-only/all filter.

## Notifications & toasts

- **Channels with separate real estate and lifetimes**: pickup feed
  (stacking log, 3–5 s lines), quest updates (near tracker), tutorials
  (persist until acknowledged), achievements/system (toast, 5–10 s).
  Never one widget for everything.
- **Manager**: FIFO per channel + priority preemption; max visible
  (commonly 1 toast + N feed lines); deduplication (same message
  refreshes instead of queueing).
- **Do-not-disturb**: hold low-priority during `InCombat`/`InCutscene`/
  `InBossFight`, flush after; drop stale entries. Pause timers while the
  game is paused.
- **Aggregation**: repeated gains within a window merge to "Iron Ore xN",
  refreshing the line's timer.

## Interaction prompts

- **Gameplay-side manager** (not UI): collect candidates → score
  (proximity + look-angle dot + line-of-sight + designer priority) →
  select exactly one → publish to the view-model. The executed action is
  always the displayed one (decision made before input).
- **Glyphs reference actions, never keys**: a glyph service resolves
  action → current binding → device sprite at display time; listens to
  device-change events and swaps all live prompts instantly; respects
  rebinding. Debounce noisy device switches.
- **Prompt fatigue**: range + view gating; "Important Only" setting;
  decaying tutorials (show a reminder N times or until performed, then
  retire).

## Quest tracker & off-screen indicators

- One pinned quest (ARPG norm): title + step + distance; step completion
  animates (check, slide to next) and echoes a toast.
- **Off-screen markers**: project; if behind camera (negative z), flip;
  clamp to screen edge minus margin and rotate an arrow toward the
  target. Same machinery serves GoW's threat arrows — the full edge-clamp
  math and behind-camera guard are in [world-space.md](./world-space.md).
- The tracker is a prime Dynamic-visibility candidate: hide in combat,
  show on update or pulse.

## Performance budget

- **HUD < 0.5–1 ms CPU/frame.** Profile with the engine UI profiler;
  pool everything transient; split static from dynamic
  (invalidation boxes / separate canvases / `DynamicTransform` hints —
  world-space detail in [world-space.md](./world-space.md)).
- Never touch layout properties at high frequency — move with
  `translate`, reserve fixed widths for changing text, quantize displayed
  values (update on integer change).
- Mobile: < 2048 atlas, minimize full-screen transparent layers
  (overdraw), HUD draw calls within a ~10–30 budget.

## Sources

Fagerholt & Lorentzon *Beyond the HUD* (Chalmers 2009) · GDC: *Tenacious
Design and the Interface of Destiny* (2016), *Lessons Learned Creating UI
for The Division* (2017), *Juice It or Lose It* · Nystrom *Game
Programming Patterns* (Event Queue) · Horizon/GoW HUD options coverage ·
gameuidatabase.com · Unity UITK perf guide · Epic UMG Viewmodel/Slate
invalidation docs. Accessibility standards in
[accessibility.md](./accessibility.md); design sources in
[design-genres.md](./design-genres.md).
