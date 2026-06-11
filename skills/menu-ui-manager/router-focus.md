# Router & focus — stacks, navigation, focus, pause

The navigation core. All numbers are **starting points**. References: Lyra/CommonUI
(layer stacks), Genshin (hub + wheel), Persona 5 (motion identity).

## The router

- **API**: `Push / Pop / Replace / PopTo / Clear` — screens request navigation, never
  perform it. All entry paths (hub tile, shortcut wheel, hotkey) call the same API.
- **Layers** (the Lyra model): prioritized stacks — `Game (HUD) < GameMenu (inventory,
  map) < Menu (pause/main) < Modal`. The highest layer with an active screen captures
  input; otherwise input flows to gameplay. This single rule replaces every "is a menu
  open?" flag.
- **Back**: one consumer — the top of the highest active stack. During transitions the
  router is in a `Transitioning` state that locks navigation (queue the last input,
  don't drop it) — this kills double-pop and double-activation at the source
  (pitfalls #2, #4).
- **Lifecycle**: Create → Activate → Deactivate → Destroy. Covered screens deactivate
  (input released, state retained); pop reactivates the screen beneath. Cache policy
  per screen: `KeepAlive` (pause menu — the most-opened screen) vs `DestroyOnPop`
  (heavy, rare). The router applies the **contract diff** on push (pause handle, HUD
  visibility, input config, backdrop) and reverts on pop. Screens never touch global
  state.

## Focus (the multi-input problem)

**The invariant: under pad/keyboard input, something focusable is always focused.**
Most focus bugs are "focus fell to nothing — navigation died" (pitfalls #1).

- **Initial focus**: every screen declares a default target, re-resolved on activation
  AND on input-method change (the CommonUI `GetDesiredFocusTarget` pattern).
- **Focus memory**: cache the focused element on deactivate; restore it (or the
  nearest valid list index) on reactivation. Any list rebuild under focus must
  re-request focus (CommonUI `RequestRefreshFocus`).
- **Directional nav**: automatic geometry-based for uniform grids/lists; explicit
  overrides at edges (wrap policy, column jumps, skip-disabled).
- **Modals trap focus** — navigation never escapes to covered screens.
- **Mouse + pad hybrid**: mouse movement must not destroy pad focus; pad input
  recaptures (re-resolve desired focus); disable click-on-background deselect; hover
  may highlight visually without stealing logical focus.
- **Touch**: no focus concept — same contracts, bigger targets, no focus visuals.
  Genshin ships three input layouts over the same screens.
- UI actions (Confirm/Back/Navigate) live in a **separate input mapping** from
  gameplay actions, always.

## Pause & time

- **Refcounted pause service**: `PushPause(reason)` / `PopPause(reason)`, paused while
  count > 0. Never a boolean — two systems unpausing each other is the classic bug
  (pitfalls #5). Sources: menus, OS focus loss, overlays, cutscene prompts, controller
  disconnect.
- **Pause is a list of systems you remembered to pause** (Genshin's SP menu leaks NPC
  idle timers — a visible burst on close). Maintain the list explicitly.
- **Co-op never pauses**: every "pausing" screen must stay correct when the world keeps
  running (live updates or snapshot-on-open).
- **Audio**: never hard-stop — lowpass (~300 Hz–2 kHz) + duck (−3 to −6 dB) on the
  gameplay bus, 0.2–0.5 s fade; UI sounds and the transition on **unscaled time** (Unity:
  mixer `updateMode = UnscaledTime` or the snapshot never finishes at timeScale 0).
- **UI animations in unscaled time** (Animator `UnscaledTime`; USS transitions are
  inherently unscaled — pause-proof).
- **Backdrop policy** per contract: none / dim (50–70% scrim) / blur / 3D showcase
  (a separate render target — Genshin's character screen, GoW's gear screen).

## Transitions & motion identity

- Enter 200–300 ms, exit ~25% faster; element-level 100–150 ms; >400 ms reads sluggish
  in screens visited hundreds of times. PC/monitor toward 150–200 ms. Always respect a
  reduce-motion setting.
- **Input lockout at the router** for the transition duration; buffer the last
  back/confirm instead of dropping it.
- **The Persona 5 lesson**: give each screen typed enter/exit animation hooks as part
  of its art identity; animate the selection itself, not just a color swap; under all
  the motion, the information hierarchy stays strict — style without structural
  hierarchy fails. The deeper juice/identity treatment is in
  [juice-diegetic.md](./juice-diegetic.md).
- **Async data**: show the screen shell immediately; skeleton placeholders if data is
  >300–500 ms pending (then hold ≥300 ms — anti-flash); cache last-known data and
  refresh in place.

## Hub-and-spoke + shortcuts

One hub radiating to feature screens (Paimon menu) — pad/touch friendly, predictable
back. Layer a **shortcut wheel** (hold trigger → radial, ≤8 segments, direction =
selection, center dead zone) and PC hotkeys on top; all paths call the same router
API. Decide once whether back from a shortcut-opened screen returns to the hub or to
game, and keep it consistent.

## Flagged gaps — do NOT invent

Exact input-lockout durations, scroll-into-view margins, radial dead-zone
percentages, attract-mode idle timeouts (ship a range + a measurement method).

## Sources

Lyra UI Policy + CommonUI notes (x157) · CommonUI Demystified (miltoncandelero) ·
Genshin wiki (Paimon Menu, Shortcut Wheel) · Persona 5 UI talks (CEDEC 2017) · NN/g +
Material motion · Unity 6 docs (UITK navigation events, USS transitions vs timeScale).
