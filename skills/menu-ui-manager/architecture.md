# Architecture — router, focus, pause, settings, screens

The components of a production menu framework. All numbers are **starting
points — tune by UX test on the target device at 10-foot distance**.
References: Lyra/CommonUI (layer stacks), Genshin (hub + wheel), GoW
Ragnarök (settings/accessibility), Persona 5 (motion identity).

## The router

- **API**: `Push / Pop / Replace / PopTo / Clear` — screens request
  navigation, never perform it. All entry paths (hub tile, shortcut wheel,
  hotkey) call the same API.
- **Layers** (the Lyra model, generalized): prioritized stacks —
  `Game (HUD) < GameMenu (inventory, map) < Menu (pause/main) < Modal`.
  The highest layer with an active screen captures input; otherwise input
  flows to gameplay. This single rule replaces every "is a menu open?"
  flag.
- **Back**: one consumer — the top of the highest active stack. Default
  behavior = deactivate self (pop). During transitions the router is in a
  `Transitioning` state that locks navigation (queue the last input,
  don't drop it) — this kills double-pop and double-activation at the
  source.
- **Lifecycle**: Create → Activate → Deactivate → Destroy. Covered
  screens deactivate (input released, state retained — scroll position,
  focused index); pop reactivates the screen beneath. Cache policy per
  screen: `KeepAlive` (pause menu — the most-opened screen in the game)
  vs `DestroyOnPop` (heavy, rare screens).
- The router applies the **contract diff** on push (pause handle, HUD
  visibility, input config, backdrop) and reverts on pop. Screens never
  touch global state.

## Focus (the multi-input problem)

**The invariant: under pad/keyboard input, something focusable is always
focused.** Most focus bugs are "focus fell to nothing — navigation died".

- **Initial focus**: every screen declares a default target, re-resolved
  on activation AND on input-method change (the CommonUI
  `GetDesiredFocusTarget` pattern).
- **Focus memory**: cache the focused element on deactivate; restore it
  (or the nearest valid list index) on reactivation.
- **Dynamic content**: any list rebuild under focus must re-request focus
  (CommonUI `RequestRefreshFocus` equivalent).
- **Directional nav**: automatic geometry-based for uniform grids/lists;
  explicit overrides at edges (wrap policy, column jumps, skip-disabled).
- **Modals trap focus** — navigation never escapes to covered screens.
- **Mouse + pad hybrid**: mouse movement must not destroy pad focus; pad
  input recaptures (re-resolve desired focus); disable
  click-on-background deselect; hover may highlight visually without
  stealing logical focus.
- **Touch**: no focus concept — same contracts, bigger targets, no focus
  visuals. Genshin ships three input layouts over the same screens.
- UI actions (Confirm/Back/Navigate) live in a separate input mapping
  from gameplay actions, always.

## Pause & time

- **Refcounted pause service**: `PushPause(reason)` / `PopPause(reason)`,
  paused while count > 0. Never a boolean — two systems unpausing each
  other is the classic bug. Sources: menus, OS focus loss, overlays,
  cutscene prompts, controller disconnect.
- **Pause is a list of systems you remembered to pause** (Genshin's SP
  menu leaks NPC idle timers — visible burst on close). Maintain the
  list explicitly.
- **Co-op never pauses**: every "pausing" screen must stay correct when
  the world keeps running (live updates or snapshot-on-open).
- **Audio**: never hard-stop — lowpass (~300 Hz–2 kHz) + duck (−3 to
  −6 dB) on the gameplay bus, 0.2–0.5 s fade; UI sounds and the
  transition itself on unscaled time (Unity: mixer
  `updateMode = UnscaledTime` or the snapshot transition never finishes
  at timeScale 0).
- **UI animations in unscaled time** (Unity Animator `UnscaledTime`,
  `unscaledDeltaTime`; USS transitions are inherently unscaled —
  pause-proof by nature).
- **Backdrop policy** per contract: none / dim (50–70% scrim) / blur /
  3D showcase (separate render target or menu scene — Genshin's
  character screen, GoW's gear screen).

## Transitions & motion identity

- Enter 200–300 ms, exit ~25% faster; element-level 100–150 ms; >400 ms
  reads sluggish in screens visited hundreds of times. PC/monitor:
  toward 150–200 ms. Always respect a reduce-motion setting.
- **Input lockout at the router** for the transition duration; buffer the
  last back/confirm instead of dropping it.
- **The Persona 5 lesson (transferable)**: give each screen typed
  enter/exit animation hooks as part of its art identity (P5's per-spoke
  themed entrances); animate the selection itself, not just a color
  swap; under all the motion, the information hierarchy stays strict —
  style without structural hierarchy fails.
- **Async data**: show the screen shell immediately; skeleton placeholders
  if data is >300–500 ms pending (then hold ≥300 ms — anti-flash); cache
  last-known data and refresh in place.

## Settings architecture

- **Settings as data**: `{id, localized name, type (toggle/enum/slider/
  bind), range, default, category, apply policy, platform visibility,
  save target}`. UI generates rows from definitions (one row widget per
  type). Search, presets, reset-all, changed-indicators (GoW tints
  modified settings) all come free from data. Lyra's GameSettings
  registry (edit conditions, change tracker) is the reference.
- **Pending vs live**: edits mutate a pending set; Apply copies
  pending→live + persists; Back-with-changes prompts discard-confirm.
- **Apply policies**: immediate (volume — feedback is the point),
  on-apply (quality), needs-confirm (display: apply + **15 s countdown +
  auto-revert** — protects against unusable display states),
  needs-restart (labeled, never silent).
- **Rebind flow**: row → listening overlay (modal, ~5 s timeout, Esc/B
  cancels) → conflict check (swap/replace prompt) → reserved-key
  validation (**UI navigation keys are not rebindable**) → pending until
  Apply. Per-device binding sets.
- **Persistence split**: machine settings (resolution, quality) → engine
  config, not cloud-synced; player preferences (subtitles,
  accessibility, language) → per-user profile save (see the save skill).
- **Accessibility category aggregates** (mirrors) settings living
  elsewhere — the GoW Ragnarök pattern; presets (vision/hearing/motor)
  bulk-set values that stay individually editable.

## The screens & the modal API

- **Pause**: vertical list, Resume = pop = Back's path, KeepAlive,
  instant.
- **Settings**: same screen pushed from pause and main menu — context
  passed as a parameter (some settings hidden in-run).
- **Inventory grid (navigation case only)**: auto nav inside the grid +
  explicit edges; focus memory on index; detail panel follows focus
  (pad) or hover (mouse); compare popup anchored to the focused slot;
  hold-to-act for destructive actions on pad.
- **Quest journal**: master-detail; detail updates on focus, not
  confirm.
- **Modal API** — promise-style, never caller-built widgets:

```
ShowDialog({title, body, buttons:[{label, style, result}]}) → result
```

  Pushed on the Modal layer; traps focus; default focus on the
  **non-destructive** button; Back maps to Cancel; **resolves exactly
  once** (default Cancelled on any teardown — scene change clears the
  stack and resolves pending modals); supports confirm-with-timeout.
- **Loading screens**: a layer above everything; swallows all input;
  minimum display time against one-frame flashes.
- **Attract/title**: "press any button" identifies and binds the active
  controller/user (Xbox XR-112 — failure is Critical severity); handle
  controller disconnect anywhere in menus: pause + system prompt on the
  Modal layer, focus restored on reconnect.

## Localization & cert basics

- **+30% text expansion** budget (German/Russian/French); CJK shrinks but
  reverses the problem if source is JP/CN. No fixed-width text
  containers; auto-size + min-font floor + ellipsis policy per element;
  pseudo-loc pass.
- **CJK font fallback chain** (missing glyph = tofu = LQA/cert flag);
  locale-aware line breaking (CJK breaks between most characters).
- **Glyph correctness per platform** is cert-relevant (never Xbox glyphs
  on PS; "options button" not "Start"). Bake the glyph service in from
  day one.
- **Safe area**: menu root is the single place applying platform insets.
- Declared languages must render fully — untranslated string IDs and
  truncation are a standard cert-failure class.
- NDA wall: TRC/XR full texts aren't public — any "cert requires N
  seconds" claim must be flagged as unverified.

## Undocumented — don't invent

Exact input-lockout durations, scroll-into-view margins, items-per-page
caps, radial dead-zone percentages, attract-mode idle timeouts, console
boot-time cert limits. Ship a range + a measurement method; tune on
device.

## Sources

Lyra UI Policy + CommonUI notes (x157.github.io) · CommonUI Demystified
(miltoncandelero) · Epic forums (back handling, menu stacks, input
configs) · Genshin wiki (Paimon Menu, Shortcut Wheel) · Persona 5 UI
talks (CEDEC+Kyushu 2017 via Famitsu/Persona Central) · GoW Ragnarök
accessibility/UI deep dives (PlayStation, CanIPlayThat, 80.lv) · XAG 101
· Microsoft GDK XR-112 + 10-foot design · NN/g + Material motion ·
Unity 6 docs (UITK navigation events, USS transitions vs timeScale,
Localization+UITK, UI system comparison) · radial menu research (Morris).
