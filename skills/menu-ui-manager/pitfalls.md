# Pitfalls — the 16 classic menu failure modes

Each: symptom → root cause → prevention. Read before designing; re-read
when gamepad focus dies or Esc closes two screens. Deep dives:
[router-focus.md](./router-focus.md),
[settings-screens.md](./settings-screens.md),
[architecture-patterns.md](./architecture-patterns.md),
[accessibility.md](./accessibility.md), [juice-diegetic.md](./juice-diegetic.md).

## 1. Focus loss

- **Symptom** — pad navigation dies; nothing is highlighted.
- **Root cause** — mouse click stole focus, then back to pad with no
  target; the focused element was destroyed/disabled; focus requested on
  a non-focusable element (UITK: focus "disappears", next d-pad press
  lands on the first tabIndex — feels random).
- **Prevention** — a centralized focus service guaranteeing a valid
  target; per-screen default focus re-resolved on activation AND device
  switch; never destroy the focused element without refocusing first;
  re-request focus after any list rebuild.

## 2. Back-action chaos

- **Symptom** — Esc/B closes two screens, or the wrong one; back during a
  transition double-pops.
- **Root cause** — every screen listens to back globally instead of the
  router routing it; no transition lock.
- **Prevention** — one back consumer: the top of the highest active stack;
  router `Transitioning` state ignores (queues) back/confirm.

## 3. Input bleed-through

- **Symptom** — the character jumps when confirming in a menu; closing
  the menu fires an attack on the close frame.
- **Root cause** — gameplay action maps not disabled on open; press/
  release crossing the context switch frame.
- **Prevention** — input context switch is atomic with push/pop (router-
  owned, never screen-owned); one-frame grace after close; gameplay
  actions require a press *initiated* in the gameplay context.

## 4. Double-activation

- **Symptom** — two modals open; a purchase executes twice.
- **Root cause** — button still interactive during the transition;
  confirm spam faster than the modal opens.
- **Prevention** — input locked at navigation trigger; idempotent stack
  ops (refuse pushing a screen already in transit); debounce at the
  router, not per button.

## 5. Pause-stack bugs

- **Symptom** — the game unpauses while a second menu is still open; the
  pause menu's own animations are frozen.
- **Root cause** — pause as a boolean instead of refcounted handles;
  `timeScale = 0` with UI animations on scaled time.
- **Prevention** — refcounted pause service (every pausing screen
  acquires/releases a handle); all UI animation on unscaled time (USS
  transitions are inherently unscaled; Unity Animator `UnscaledTime`).

## 6. Modal leaks

- **Symptom** — a callback never fires and the caller waits forever;
  orphaned modals after a scene change.
- **Root cause** — modal closed by a path that doesn't resolve its
  promise; no stack teardown on scene change.
- **Prevention** — the modal API resolves **exactly once** (default
  Cancelled in teardown); the router clears stacks and resolves pending
  modals on scene transitions.

## 7. Stale screen data

- **Symptom** — the inventory screen shows items sold minutes ago.
- **Root cause** — screen built once at open; data pulled at build time,
  no subscription.
- **Prevention** — contract hook (`OnReactivated`/`OnDataChanged`):
  re-pull on every return to top of stack, or reactive bindings on model
  events.

## 8. Settings apply bugs

- **Symptom** — resolution applied without confirmation → black screen
  the player can't navigate out of; invalid settings saved; partial
  state after a crash.
- **Root cause** — immediate apply without confirm/revert; save before
  validation; non-atomic writes.
- **Prevention** — change-tracker registry (pending vs live, Lyra
  model); display changes = apply + 15 s countdown + auto-revert;
  validate before save; atomic write (temp-then-swap).

## 9. Rebind traps

- **Symptom** — the player binds B/Esc to Jump and can never exit a menu
  again; the rebind listener captures UI navigation itself.
- **Root cause** — UI-reserved keys not excluded from rebinding;
  listening mode without excludes.
- **Prevention** — UI navigation keys (back/confirm/directions) are
  non-rebindable (or a separate UI binding set); suspend UI navigation
  during listening and exclude UI controls; conflict detection +
  always-reachable reset-to-defaults.

## 10. Glyph mismatch after device switch

- **Symptom** — Xbox glyphs while playing on keyboard; PS glyphs on an
  Xbox pad.
- **Root cause** — glyphs resolved once at screen build; no
  device-change subscription; incomplete device→glyph mapping.
- **Prevention** — reactive glyph service (UE: `OnInputMethodChanged` +
  per-platform ControllerData — `CommonActionWidget` does it natively;
  Unity: listen to `InputUser.onChange` and invalidate displayed
  bindings). Platform glyph correctness is cert-relevant.

## 11. Cache extremes

- **Symptom** — memory climbs (every screen ever opened stays alive), or
  a hitch on every open (full rebuild each time).
- **Root cause** — implicit all-or-nothing cache policy.
- **Prevention** — explicit per-screen policy in the contract
  (`KeepAlive` for frequent screens like pause, `DestroyOnPop` for heavy
  rare ones); measure before optimizing.

## 12. Localization breaks layouts

- **Symptom** — German/Russian text truncated or overflowing fixed
  buttons/tabs.
- **Root cause** — fixed widths calibrated on English (+30–40%
  expansion).
- **Prevention** — auto-size layouts with min/max; per-element overflow
  policy (shrink/ellipsis/wrap); pseudo-localization pass; CJK font
  fallback chain (tofu = cert flag).

## 13. Safe-area violations

- **Symptom** — menu buttons clipped on TVs (overscan) or under the
  mobile notch.
- **Root cause** — UI anchored to physical screen edges.
- **Prevention** — all interactive menu content inside one safe-area
  root container reading platform metrics at runtime; the ~90% rule as
  fallback.

## 14. Controller disconnect mid-menu

- **Symptom** — cert failure: the game sits unresponsive after the pad
  disconnects.
- **Root cause** — no device-disconnect listener at the router level.
- **Prevention** — on disconnect: pause (refcount) + a reconnect modal
  pushed on the top Modal layer, focus restored on reconnect. This is
  the canonical use case proving the Modal layer + pause refcount +
  focus service triad. (PlayStation TRC / Xbox XR both demand graceful
  recovery.)

## 15. The UI perf sink

- **Symptom** — the menu or HUD tanks the frame rate; a hitch every time a
  number updates; the pause screen drops more frames than gameplay.
- **Root cause** — a single dirtied element rebuilding the whole UGUI
  canvas; per-frame property bindings ticking; `TMP_Text.Rebuild()` spikes
  on every-frame text; UI overdraw; no virtualization on a long list.
- **Prevention** — the [architecture-patterns.md](./architecture-patterns.md)
  rules: **split canvases** (static vs frequently-changing); prefer
  **event-driven bindings** over per-frame property bindings (UE
  Invalidation Box / Volatile; UITK retained tree); isolate dynamic SDF
  text on its own sub-canvas (avoid Best Fit); atlas sprites; **virtualize
  long lists** (ListView / UTileView recycling); profile `Canvas.BuildBatch`
  / `stat slate`.

## 16. Accessibility bolted on at the end

- **Symptom** — a screen reader hears silence or "Button 3"; color-coded UI
  is unusable for colorblind players; text doesn't scale; remapping is
  partial — and fixing it late costs a refactor.
- **Root cause** — no parallel accessibility node tree, unlabeled widgets,
  hardcoded input, color-only meaning, no settings-as-data registry —
  retrofitting requires auditing hundreds of widgets.
- **Prevention** — build it in from day one
  ([accessibility.md](./accessibility.md)): a **parallel accessibility node
  tree** (label/role/value/state per node) bridged to the OS screen reader;
  **label everything** at creation (icon-only/custom widgets explicitly);
  the **settings-as-data registry** feeding Vision/Motor/Hearing presets;
  "never color alone"; text scalable to 200%; full remapping and
  hold→toggle; a boot-time accessibility screen; a CI check that every
  focusable element has a label.

## Debugging order

When menus misbehave: (1) dump the stack state (CommonUI:
`CommonUI.DumpActivatableTree`; Unity: log the router) — most bugs are a
stack/contract mismatch, (2) trace who holds focus and who last moved it
(#1), (3) log back-action consumers (#2), (4) check the pause refcount
(#5), (5) unplug the controller (#14), (6) switch devices mid-screen
(#10).

## Ship checklist

```
- [ ] Full menu walk with pad only, KBM only, touch only (if applicable):
      no focus loss, no dead ends
- [ ] Mash confirm/back through every transition: no double-activation,
      no double-pop
- [ ] Two pause sources at once (menu + OS focus loss): unpause only when
      both release
- [ ] Scene change with a modal open: promise resolves Cancelled, no leak
- [ ] Display-change confirm: let the timeout expire -> clean revert
- [ ] Rebind everything bindable: UI navigation always survives
- [ ] Device switch on every screen: all glyphs swap instantly
- [ ] Controller disconnect on every screen: pause + prompt + recovery
- [ ] Pseudo-loc pass: nothing truncates; CJK renders (no tofu)
- [ ] Safe-area + text-size matrix on TV distance
- [ ] UI perf profiled: canvases split / bindings event-driven; no rebuild hitch
- [ ] Accessibility: node tree + labels + presets + screen-reader tested
```
